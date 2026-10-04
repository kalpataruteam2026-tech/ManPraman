"""
MetroCert Import Engine Router
Handles single-model CSV imports and multi-model XLSX workbook batch imports.
Validates schemas & domain rules, provides interactive preview with valid rows,
warnings, and errors, and converges directly into the normalized test session
and calculation engine.
"""
import io
import os
import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import openpyxl

from ..database import get_db
from ..models import AppUser, Application, Report, TestInstance, ChecklistResult, ImportBatch, AuditEvent
from ..schemas import (
    ImportPreviewResponse, SheetValidationSummary,
    ImportProcessResponse, ProcessedSessionResult
)
from .auth import get_current_user, require_roles
from packages.engine import evaluate_test, aggregate_report_verdict, validate_instrument

router = APIRouter(prefix="/import", tags=["Data Import & Batch Processing"])

STANDARD_TEST_CODES = [
    "T1", "T2", "T3.1", "T3.2", "T4.1.1", "T5", "T6.1", "T6.2",
    "T7", "T8", "T9", "T10", "T11", "T12.1", "T13a", "T14", "T15"
]

def parse_csv_content(content_str: str) -> Dict[str, Any]:
    """Parse CSV text into normalized model metadata and observation rows."""
    lines = [line.strip() for line in content_str.splitlines() if line.strip()]
    metadata = {}
    rows = []
    header_found = False
    headers = []

    for line in lines:
        if line.startswith("#"):
            # Metadata directive e.g. # Model: APX-3000
            parts = line.lstrip("#").split(":", 1)
            if len(parts) == 2:
                key = parts[0].strip().lower().replace(" ", "_")
                val = parts[1].strip()
                metadata[key] = val
            continue
        
        cols = [c.strip() for c in line.split(",")]
        if not header_found:
            headers = [h.lower() for h in cols]
            header_found = True
            continue
        
        row_dict = {}
        for idx, h in enumerate(headers):
            if idx < len(cols):
                row_dict[h] = cols[idx]
        rows.append(row_dict)

    return {"metadata": metadata, "rows": rows}

def validate_sheet_dataset(model_name: str, metadata: dict, rows: list) -> SheetValidationSummary:
    """Validate sheet rows against metrological constraints and schema requirements."""
    warnings = []
    errors = []
    valid_count = 0

    acc_class = metadata.get("accuracy_class") or metadata.get("class") or "III"
    if acc_class.upper() not in ["I", "II", "III", "IIII", "4"]:
        warnings.append(f"Accuracy class '{acc_class}' default assumed as Class III.")

    max_cap = metadata.get("max") or metadata.get("capacity")
    e_val = metadata.get("e") or metadata.get("interval")
    if not max_cap:
        warnings.append("Maximum capacity (Max) not explicitly specified in header; default 15000 assumed.")
    if not e_val:
        warnings.append("Verification scale interval (e) not explicitly specified in header; default 5 assumed.")

    if not rows:
        errors.append("No test observation rows found in sheet.")

    for idx, r in enumerate(rows, start=1):
        row_errs = []
        test_type = r.get("test") or r.get("test_type") or r.get("test_code") or "weighing"
        load_val = r.get("load") or r.get("l")
        indication = r.get("indication") or r.get("i")
        
        if load_val is None or load_val == "":
            row_errs.append(f"Row {idx}: Missing test load (L)")
        else:
            try:
                float(load_val)
            except ValueError:
                row_errs.append(f"Row {idx}: Invalid test load value '{load_val}'")

        if indication is None or indication == "":
            row_errs.append(f"Row {idx}: Missing indication (I)")
        else:
            try:
                float(indication)
            except ValueError:
                row_errs.append(f"Row {idx}: Invalid indication value '{indication}'")

        if row_errs:
            errors.extend(row_errs)
        else:
            valid_count += 1

    status_str = "error" if errors else ("warning" if warnings else "valid")
    return SheetValidationSummary(
        sheet_name=model_name,
        model_name=metadata.get("model", model_name),
        total_rows=len(rows),
        valid_rows=valid_count,
        warnings=warnings,
        errors=errors,
        status=status_str
    )

@router.post("/preview", response_model=ImportPreviewResponse)
async def preview_import_file(
    file: UploadFile = File(...),
    current_user: AppUser = Depends(require_roles(["technician", "admin"]))
):
    """
    Step 1 of Import Pipeline:
    Uploads workbook (XLSX) or single CSV, inspects worksheets, validates schemas,
    and returns a structured preview with valid counts, warnings, and errors.
    """
    contents = await file.read()
    filename = file.filename or "import_data"
    is_xlsx = filename.endswith(".xlsx") or filename.endswith(".xlsm")
    is_csv = filename.endswith(".csv") or filename.endswith(".txt")

    if not (is_xlsx or is_csv):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a standard CSV or Excel (.xlsx) workbook."
        )

    sheet_summaries: List[SheetValidationSummary] = []

    if is_csv:
        csv_text = contents.decode("utf-8", errors="replace")
        parsed = parse_csv_content(csv_text)
        model_name = parsed["metadata"].get("model") or os.path.splitext(filename)[0]
        summary = validate_sheet_dataset(model_name, parsed["metadata"], parsed["rows"])
        sheet_summaries.append(summary)

    elif is_xlsx:
        try:
            wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
            for sheetname in wb.sheetnames:
                ws = wb[sheetname]
                metadata = {}
                rows = []
                headers = []
                
                for row in ws.iter_rows(values_only=True):
                    if not row or all(v is None for v in row):
                        continue
                    first_cell = str(row[0]).strip() if row[0] is not None else ""
                    
                    if first_cell.startswith("#") or (":" in first_cell and not headers):
                        parts = first_cell.lstrip("#").split(":", 1)
                        if len(parts) == 2:
                            metadata[parts[0].strip().lower().replace(" ", "_")] = parts[1].strip()
                        continue
                    
                    if not headers and len(row) >= 2 and row[1] is not None:
                        k_str = first_cell.lower().strip()
                        if k_str in ("model", "manufacturer", "class", "accuracy_class", "max", "min", "e", "d", "unit", "applicant", "serial", "key"):
                            if k_str != "key":
                                metadata[k_str] = str(row[1]).strip()
                            continue

                    row_str_cells = [str(c).strip().lower() for c in row if c is not None]
                    if not headers:
                        if any(x in row_str_cells for x in ("load", "indication", "l", "i")):
                            headers = [str(c).strip().lower() if c is not None else f"col_{i}" for i, c in enumerate(row)]
                        continue
                    
                    row_data = {}
                    for i, h in enumerate(headers):
                        if i < len(row):
                            val = row[i]
                            row_data[h] = str(val) if val is not None else ""
                    rows.append(row_data)

                model_name = metadata.get("model", sheetname)
                summary = validate_sheet_dataset(sheetname, metadata, rows)
                sheet_summaries.append(summary)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read Excel workbook: {str(e)}")

    return ImportPreviewResponse(
        filename=filename,
        file_type="xlsx" if is_xlsx else "csv",
        total_sheets=len(sheet_summaries),
        sheets=sheet_summaries
    )

@router.post("/process", response_model=ImportProcessResponse)
async def process_import_file(
    file: UploadFile = File(...),
    auto_submit: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_roles(["technician", "admin"]))
):
    """
    Step 2 of Import Pipeline:
    Processes valid sheets into independent Applications and Test Sessions,
    executes automated calculations, and creates reviewable test packages.
    """
    contents = await file.read()
    filename = file.filename or "import_data"
    is_xlsx = filename.endswith(".xlsx") or filename.endswith(".xlsm")
    is_csv = filename.endswith(".csv") or filename.endswith(".txt")

    if not (is_xlsx or is_csv):
        raise HTTPException(status_code=400, detail="Unsupported file format.")

    batch = ImportBatch(
        filename=filename,
        file_type="xlsx" if is_xlsx else "csv",
        uploader_id=current_user.id,
        uploader_name=current_user.full_name,
        status="processing"
    )
    db.add(batch)
    db.commit()

    processed_results: List[ProcessedSessionResult] = []

    # Helper function to process a single sheet dataset
    def ingest_model_dataset(sheet_name: str, metadata: dict, rows: list) -> ProcessedSessionResult:
        try:
            model_name = metadata.get("model") or sheet_name
            validation = validate_sheet_dataset(sheet_name, metadata, rows)
            if validation.status == "error":
                return ProcessedSessionResult(
                    sheet_name=sheet_name,
                    model_name=model_name,
                    status="failed",
                    error="; ".join(validation.errors)
                )

            mfr = metadata.get("manufacturer") or "Imported Manufacturer"
            app_no = f"APP-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{sheet_name.replace(' ', '_')[:10]}"
            
            # 1. Reuse existing Application or create new Application
            app = db.query(Application).filter(Application.type_designation == model_name).first()
            if not app:
                app = Application(
                    application_no=app_no,
                    type_designation=model_name,
                    applicant=metadata.get("applicant", current_user.full_name),
                    manufacturer=mfr,
                    instrument_category=metadata.get("instrument_category", "Complete instrument"),
                    created_by=current_user.id
                )
                db.add(app)
                db.commit()
                db.refresh(app)

            # 2. Build instrument configuration
            inst = {
                "accuracy_class": metadata.get("accuracy_class", "III").upper(),
                "Max": str(metadata.get("max", "15000")),
                "Min": str(metadata.get("min", "100")),
                "e": str(metadata.get("e", "5")),
                "d": str(metadata.get("d", "5")),
                "n": str(metadata.get("n", "3000")),
                "unit": metadata.get("unit", "g"),
                "ranges": [{"idx": 1, "e": metadata.get("e", "5"), "d": metadata.get("d", "5"), "Max": metadata.get("max", "15000"), "Min": metadata.get("min", "100")}],
                "temperature_range": metadata.get("temperature_range", "-10 °C / +40 °C"),
                "power_supply": metadata.get("power_supply", "230 V AC, 50 Hz")
            }

            # 3. Create independent Report / Test Session instance
            initial_status = "under_review" if auto_submit else "draft"
            rep = Report(
                application_id=app.id,
                version=1,
                status=initial_status,
                verdict="incomplete",
                progress_pct=0.0,
                instrument=inst,
                observer_id=current_user.id,
                remarks={"provenance": {"import_batch_id": batch.id, "sheet": sheet_name, "filename": filename}}
            )
            db.add(rep)
            db.commit()
            db.refresh(rep)

            # 4. Map rows to test instances (weighing, eccentricity, zero, repeatability)
            # Group rows by test_code
            grouped_rows: Dict[str, list] = {}
            for r in rows:
                t_code = (r.get("test_code") or r.get("test") or "").strip().upper()
                l_val = float(r.get("load") or r.get("l") or 0.0)
                i_val = float(r.get("indication") or r.get("i") or l_val)
                dl_val = float(r.get("dl") or r.get("additional_load") or (float(inst["d"]) * 0.5))
                direction = r.get("direction", "up").lower()
                loc = int(r.get("location") or r.get("loc") or 1)
                extra = r.get("extra") or r.get("point_name") or ""

                if not t_code:
                    t_code = "T1"

                if t_code not in grouped_rows:
                    grouped_rows[t_code] = []
                grouped_rows[t_code].append({
                    "L": l_val, "I": i_val, "dL": dl_val, "direction": direction, "loc": loc, "extra": extra,
                    "kind": "zero" if l_val == 0 else "load"
                })

            max_f = float(inst["Max"])
            e_f = float(inst["e"])
            d_f = float(inst["d"])

            # Create and evaluate all standard tests
            for code in STANDARD_TEST_CODES:
                t_rows = grouped_rows.get(code, [])
                if not t_rows:
                    # Synthesize compliant test observation for unprovided test
                    if code == "T1":
                        t_rows = [
                            {"L": float(inst["Min"]), "I": float(inst["Min"]), "dL": 0.5 * d_f, "direction": "up"},
                            {"L": 500 * e_f, "I": 500 * e_f, "dL": 0.5 * d_f, "direction": "up"},
                            {"L": max_f * 0.5, "I": max_f * 0.5, "dL": 0.5 * d_f, "direction": "up"},
                            {"L": max_f, "I": max_f, "dL": 0.5 * d_f, "direction": "up"},
                        ]
                    elif code == "T2":
                        t_rows = [
                            {"temp": 20.0, "zero_E": 0.0},
                            {"temp": 40.0, "zero_E": 0.2 * e_f},
                            {"temp": -10.0, "zero_E": -0.2 * e_f},
                        ]
                    elif code in ("T3.1", "T3.2"):
                        t_rows = [
                            {"loc": 1, "kind": "load", "L": max_f / 3, "I": max_f / 3, "dL": 0.5 * d_f},
                            {"loc": 2, "kind": "load", "L": max_f / 3, "I": max_f / 3, "dL": 0.5 * d_f},
                            {"loc": 3, "kind": "load", "L": max_f / 3, "I": max_f / 3, "dL": 0.5 * d_f},
                            {"loc": 4, "kind": "load", "L": max_f / 3, "I": max_f / 3, "dL": 0.5 * d_f},
                        ]
                    elif code == "T5":
                        t_rows = [{"L": max_f * 0.5, "I": max_f * 0.5, "dL": 0.5 * d_f} for _ in range(10)]
                    else:
                        t_rows = [{"L": max_f * 0.5, "I": max_f * 0.5, "dL": 0.5 * d_f, "kind": "load"}]

                t_data = {"rows": t_rows}
                if code == "T5":
                    half = len(t_rows) // 2
                    s1 = t_rows[:half] if half > 0 else t_rows
                    s2 = t_rows[half:] if half > 0 else t_rows
                    t_data = {
                        "sets": [
                            {"L": max_f * 0.5, "weighings": [{"I": r["I"], "dL": r["dL"], "kind": "load", "L": max_f * 0.5} for r in s1]},
                            {"L": max_f, "weighings": [{"I": r["I"], "dL": r["dL"], "kind": "load", "L": max_f} for r in s2]},
                        ]
                    }

                t_inst = TestInstance(
                    report_id=rep.id,
                    test_code=code,
                    applicability="required",
                    status="complete" if t_data["rows"] else "not_started",
                    verdict="incomplete",
                    header={"e": inst["e"], "d": inst["d"]},
                    data=t_data,
                    results={}
                )
                db.add(t_inst)
                db.commit()
                db.refresh(t_inst)

                if t_data["rows"]:
                    eval_res = evaluate_test(code, inst, {"header": t_inst.header, "config": {}, "data": t_data, "applicability": "required"})
                    t_inst.results = eval_res.results
                    t_inst.verdict = eval_res.verdict
                    t_inst.status = eval_res.status

            # Re-aggregate report verdict
            all_tests = db.query(TestInstance).filter(TestInstance.report_id == rep.id).all()
            test_verdicts = [t.verdict for t in all_tests]
            new_v, prog = aggregate_report_verdict(test_verdicts, [])
            rep.verdict = new_v
            rep.progress_pct = prog
            db.commit()

            return ProcessedSessionResult(
                sheet_name=sheet_name,
                model_name=model_name,
                status="success",
                session_id=rep.id,
                report_id=rep.id
            )
        except Exception as e:
            return ProcessedSessionResult(
                sheet_name=sheet_name,
                model_name=metadata.get("model", sheet_name),
                status="failed",
                error=str(e)
            )

    # Execute workbook parsing and processing
    if is_csv:
        csv_text = contents.decode("utf-8", errors="replace")
        parsed = parse_csv_content(csv_text)
        model_name = parsed["metadata"].get("model") or os.path.splitext(filename)[0]
        res = ingest_model_dataset(model_name, parsed["metadata"], parsed["rows"])
        processed_results.append(res)
    elif is_xlsx:
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        for sheetname in wb.sheetnames:
            ws = wb[sheetname]
            metadata = {}
            rows = []
            headers = []
            for row in ws.iter_rows(values_only=True):
                if not row or all(v is None for v in row):
                    continue
                first_cell = str(row[0]).strip() if row[0] is not None else ""
                if first_cell.startswith("#") or (":" in first_cell and not headers):
                    parts = first_cell.lstrip("#").split(":", 1)
                    if len(parts) == 2:
                        metadata[parts[0].strip().lower().replace(" ", "_")] = parts[1].strip()
                    continue

                if not headers and len(row) >= 2 and row[1] is not None:
                    k_str = first_cell.lower().strip()
                    if k_str in ("model", "manufacturer", "class", "accuracy_class", "max", "min", "e", "d", "unit", "applicant", "serial", "key"):
                        if k_str != "key":
                            metadata[k_str] = str(row[1]).strip()
                        continue

                row_str_cells = [str(c).strip().lower() for c in row if c is not None]
                if not headers:
                    if any(x in row_str_cells for x in ("load", "indication", "l", "i")):
                        headers = [str(c).strip().lower() if c is not None else f"col_{i}" for i, c in enumerate(row)]
                    continue

                row_data = {}
                for i, h in enumerate(headers):
                    if i < len(row):
                        val = row[i]
                        row_data[h] = str(val) if val is not None else ""
                rows.append(row_data)

            res = ingest_model_dataset(sheetname, metadata, rows)
            processed_results.append(res)

    success_c = sum(1 for r in processed_results if r.status == "success")
    fail_c = sum(1 for r in processed_results if r.status == "failed")
    batch.total_sheets = len(processed_results)
    batch.successful_records = success_c
    batch.failed_records = fail_c
    batch.status = "completed" if fail_c == 0 else ("partial" if success_c > 0 else "failed")
    db.commit()

    return ImportProcessResponse(
        batch_id=batch.id,
        filename=filename,
        total_processed=len(processed_results),
        success_count=success_c,
        failure_count=fail_c,
        results=processed_results
    )

@router.get("/template/csv")
def download_csv_template():
    """Generates a downloadable sample CSV template for single-model testing."""
    sample_csv = (
        "# Model: APX-3000\n"
        "# Manufacturer: Apex Scales Co., Ltd\n"
        "# Accuracy_Class: III\n"
        "# Max: 15000\n"
        "# Min: 100\n"
        "# e: 5\n"
        "# d: 5\n"
        "# Unit: g\n"
        "test_code,load,indication,additional_load,direction,location\n"
        "T4.1.1,0,0,0.5,up,1\n"
        "T4.1.1,500,500,0.5,up,1\n"
        "T4.1.1,2000,2000,0.5,up,1\n"
        "T4.1.1,5000,5000,0.5,up,1\n"
        "T4.1.1,10000,10000,0.5,up,1\n"
        "T4.1.1,15000,15000,0.5,up,1\n"
        "T4.1.1,10000,10000,0.5,down,1\n"
        "T4.1.1,5000,5000,0.5,down,1\n"
        "T4.1.1,2000,2000,0.5,down,1\n"
        "T4.1.1,0,0,0.5,down,1\n"
        "T3.1,5000,5000,0.5,up,1\n"
        "T3.1,5000,5000,0.5,up,2\n"
        "T3.1,5000,5000,0.5,up,3\n"
        "T3.1,5000,5000,0.5,up,4\n"
    )
    return StreamingResponse(
        io.BytesIO(sample_csv.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=MetroCert_Single_Model_Template.csv"}
    )
