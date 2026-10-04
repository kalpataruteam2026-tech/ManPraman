"""
WeighReport API - Report Generation Pipeline Router
Handles on-demand generation of Detailed and Summary PDF and Word (.docx) reports.
"""
import os
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Application, Report, TestInstance, ChecklistResult, Equipment, LabProfile, GeneratedReport
from ..schemas import ReportGenerateRequest, GeneratedReportResponse
from packages.reportkit import build_report_view, generate_pdf_report, generate_docx_report

router = APIRouter(tags=["Report Generation"])

ARTIFACTS_DIR = os.path.abspath("artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

@router.post("/reports/{id}/generate")
def generate_report_document(
    id: str,
    req: ReportGenerateRequest,
    db: Session = Depends(get_db)
):
    rep = db.query(Report).filter((Report.id == id) | (Report.application_id == id)).first()
    if not rep:
        # Check if dynamic session/instrument data was passed from frontend
        if req.session_data or req.instrument_data:
            s_data = req.session_data or {}
            i_data = req.instrument_data or {}
            app_no = s_data.get("code") or f"APP-{str(id)[:8]}"
            
            app = db.query(Application).filter(Application.application_no == app_no).first()
            if not app:
                app = Application(
                    application_no=app_no,
                    applicant=s_data.get("applicant", "National Metrology Client"),
                    manufacturer=i_data.get("manufacturer", "Precision Weighing Ltd"),
                    type_designation=i_data.get("model", "Electronic Platform Scale"),
                    instrument_category=i_data.get("instrumentType", "Complete instrument")
                )
                db.add(app)
                db.commit()
                db.refresh(app)
            
            rep = Report(
                id=id,
                application_id=app.id,
                version=1,
                status="approved",
                verdict=(s_data.get("overallVerdict") or "PASSED").upper(),
                engine_version="1.0.0",
                rulepack_id=s_data.get("rulesetId", "oiml-r76-2007"),
                instrument={
                    "accuracy_class": i_data.get("accuracyClass", "III"),
                    "Max": str(i_data.get("max", 1000)),
                    "Min": str(i_data.get("min", 20)),
                    "e": str(i_data.get("e", 1)),
                    "d": str(i_data.get("d", 1)),
                    "unit": i_data.get("unit", "g"),
                    "serial": i_data.get("serial", "SN-2026-0881"),
                    "manufacturer": i_data.get("manufacturer", "Precision Weighing Ltd"),
                    "type_designation": i_data.get("model", "Electronic Platform Scale"),
                }
            )
            db.add(rep)
            db.commit()
            db.refresh(rep)
        else:
            # Fallback to the latest existing report in DB if any
            rep = db.query(Report).order_by(Report.created_at.desc()).first()
            if not rep:
                raise HTTPException(status_code=404, detail="No report found in system")

    tests = db.query(TestInstance).filter(TestInstance.report_id == rep.id).all()
    checklist = db.query(ChecklistResult).filter(ChecklistResult.report_id == rep.id).all()
    equipment = db.query(Equipment).filter(Equipment.active == True).all()
    lab = db.query(LabProfile).first()

    # Prepare dictionaries for ReportView
    if req.session_data and req.session_data.get("results"):
        tests_list = []
        raw_res = req.session_data.get("results")
        items = raw_res.values() if isinstance(raw_res, dict) else raw_res
        for item in items:
            v_stat = (item.get("status") or "incomplete").upper()
            v_norm = "PASSED" if v_stat == "PASS" else ("FAILED" if v_stat == "FAIL" else v_stat)
            tests_list.append({
                "test_code": item.get("testType") or item.get("test_code", ""),
                "name": item.get("name", ""),
                "clause": item.get("clause", ""),
                "verdict": v_norm,
                "status": "completed" if v_norm in ("PASSED", "FAILED") else "not_started",
                "applicability": "required",
                "maxObservedError": item.get("maxObservedError"),
                "mpeLimit": item.get("mpeLimit"),
                "stepCalculations": item.get("stepCalculations", []),
                "points": item.get("points", []),
                "results": {
                    "metrics": {
                        "max_abs_Ec": item.get("maxObservedError"),
                        "mpe_limit": item.get("mpeLimit"),
                    }
                },
                "remarks": item.get("reasoning", "")
            })
    else:
        tests_list = [
            {
                "test_code": t.test_code,
                "verdict": t.verdict,
                "status": t.status,
                "applicability": t.applicability,
                "header": t.header or {},
                "data": t.data or {},
                "results": t.results or {},
                "remarks": t.remarks
            } for t in tests
        ]
    checklist_list = [
        {
            "item_key": c.item_key,
            "clause": c.clause,
            "text_en": c.text_en,
            "result": c.result,
            "remarks": c.remarks
        } for c in checklist
    ]
    equipment_list = [
        {
            "name": eq.name,
            "category": eq.category,
            "cert_no": eq.cert_no,
            "traceability": eq.traceability
        } for eq in equipment
    ]
    lab_dict = {
        "name": lab.name if lab else "National Metrology Laboratory",
        "accreditation_no": lab.accreditation_no if lab else "ISO/IEC 17025"
    }

    report_dict = {
        "id": rep.id,
        "application_id": rep.application.application_no if rep.application else rep.application_id,
        "version": rep.version,
        "status": rep.status,
        "verdict": rep.verdict,
        "engine_version": rep.engine_version,
        "rulepack_id": rep.rulepack_id,
        "application": {
            "application_no": rep.application.application_no if rep.application else "",
            "type_designation": rep.application.type_designation if rep.application else "",
            "manufacturer": rep.application.manufacturer if rep.application else "",
            "applicant": rep.application.applicant if rep.application else "",
            "instrument_category": rep.application.instrument_category if rep.application else "Complete instrument"
        },
        "instrument": rep.instrument or {}
    }

    # Extract evidence
    evidence_list = []
    if req.evidence and isinstance(req.evidence, list) and len(req.evidence) > 0:
        evidence_list = req.evidence
    elif req.session_data and isinstance(req.session_data.get("evidence"), list) and len(req.session_data.get("evidence")) > 0:
        evidence_list = req.session_data.get("evidence")
    elif isinstance(rep.instrument, dict) and isinstance(rep.instrument.get("evidence"), list) and len(rep.instrument.get("evidence")) > 0:
        evidence_list = rep.instrument.get("evidence")

    # Build canonical ReportView
    view = build_report_view(report_dict, tests_list, checklist_list, equipment_list, lab_dict, evidence_list=evidence_list)
    data_hash = view["meta"]["data_hash"]


    kind = req.kind.lower() # 'detailed' | 'summary'
    fmt = req.format.lower() # 'pdf' | 'docx'
    gen_count = db.query(GeneratedReport).filter(
        GeneratedReport.report_id == rep.id,
        GeneratedReport.kind == kind,
        GeneratedReport.format == fmt
    ).count() + 1

    app_no_str = (rep.application.application_no if rep.application else rep.application_id) or rep.id
    file_name = f"{app_no_str}_{kind}_{gen_count}.{fmt}".replace(" ", "_").replace("/", "-")
    file_path = os.path.join(ARTIFACTS_DIR, file_name)

    if fmt == "pdf":
        generate_pdf_report(view, file_path, kind=kind)
    elif fmt == "docx":
        generate_docx_report(view, file_path, kind=kind)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {fmt}")

    # Compute sha256 of file
    with open(file_path, "rb") as f:
        file_sha = hashlib.sha256(f.read()).hexdigest()

    gen_record = GeneratedReport(
        report_id=rep.id,
        kind=kind,
        format=fmt,
        gen_no=gen_count,
        file_path=file_path,
        sha256=file_sha,
        data_hash=data_hash,
        stale=False,
        watermark=req.watermark
    )
    db.add(gen_record)
    db.commit()
    db.refresh(gen_record)

    return {
        "id": gen_record.id,
        "report_id": rep.id,
        "kind": kind,
        "format": fmt,
        "file_name": file_name,
        "download_url": f"/api/v1/artifacts/{gen_record.id}/download",
        "sha256": file_sha,
        "data_hash": data_hash,
        "overall_verdict": rep.verdict
    }

@router.get("/reports/{id}/artifacts")
def list_report_artifacts(id: str, db: Session = Depends(get_db)):
    records = db.query(GeneratedReport).filter(GeneratedReport.report_id == id).order_by(GeneratedReport.generated_at.desc()).all()
    return [
        {
            "id": r.id,
            "kind": r.kind,
            "format": r.format,
            "gen_no": r.gen_no,
            "file_name": os.path.basename(r.file_path),
            "download_url": f"/api/v1/artifacts/{r.id}/download",
            "sha256": r.sha256,
            "stale": r.stale,
            "generated_at": r.generated_at
        } for r in records
    ]

@router.get("/artifacts/{id}/download")
def download_artifact(id: str, db: Session = Depends(get_db)):
    record = db.query(GeneratedReport).filter(GeneratedReport.id == id).first()
    if not record or not os.path.exists(record.file_path):
        raise HTTPException(status_code=404, detail="Artifact file not found")

    media_type = "application/pdf" if record.format == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(
        record.file_path,
        media_type=media_type,
        filename=os.path.basename(record.file_path),
        content_disposition_type="inline" if record.format == "pdf" else "attachment"
    )

@router.get("/verify/{id}")
def verify_report(id: str, db: Session = Depends(get_db)):
    """Verifies report authenticity and returns verification status metadata."""
    rep = db.query(Report).filter((Report.id == id) | (Report.application_id == id)).first()
    if not rep:
        return {
            "verified": False,
            "status": "not_found",
            "message": "Report could not be verified."
        }
    if rep.status == "revoked":
        return {
            "verified": False,
            "status": "revoked",
            "report_id": rep.id,
            "message": "Report status: Revoked."
        }
    return {
        "verified": True,
        "status": rep.status,
        "report_id": rep.id,
        "verdict": rep.verdict,
        "application_no": rep.application.application_no if rep.application else "",
        "model": (rep.instrument or {}).get("model") or (rep.application.type_designation if rep.application else ""),
        "accuracy_class": (rep.instrument or {}).get("accuracy_class"),
        "report_date": rep.report_date.isoformat() if rep.report_date else None,
        "engine_version": rep.engine_version,
        "rulepack_id": rep.rulepack_id
    }

@router.get("/reports/{id}/pdf")
def get_report_pdf(id: str, db: Session = Depends(get_db)):
    """Downloads or generates on-demand official PDF report."""
    rep = db.query(Report).filter(Report.id == id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    gen = db.query(GeneratedReport).filter(
        GeneratedReport.report_id == rep.id,
        GeneratedReport.format == "pdf"
    ).order_by(GeneratedReport.generated_at.desc()).first()
    if gen and os.path.exists(gen.file_path):
        return FileResponse(gen.file_path, media_type="application/pdf", filename=os.path.basename(gen.file_path))
    
    req = ReportGenerateRequest(kind="detailed", format="pdf")
    res = generate_report_document(id, req, db)
    gen_new = db.query(GeneratedReport).filter(GeneratedReport.id == res["id"]).first()
    return FileResponse(gen_new.file_path, media_type="application/pdf", filename=os.path.basename(gen_new.file_path))
