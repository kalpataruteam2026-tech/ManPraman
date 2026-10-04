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
from ..models import Report, TestInstance, ChecklistResult, Equipment, LabProfile, GeneratedReport
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
    rep = db.query(Report).filter(Report.id == id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")

    tests = db.query(TestInstance).filter(TestInstance.report_id == rep.id).all()
    checklist = db.query(ChecklistResult).filter(ChecklistResult.report_id == rep.id).all()
    equipment = db.query(Equipment).filter(Equipment.active == True).all()
    lab = db.query(LabProfile).first()

    # Prepare dictionaries for ReportView
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

    # Build canonical ReportView
    view = build_report_view(report_dict, tests_list, checklist_list, equipment_list, lab_dict)
    data_hash = view["meta"]["data_hash"]

    kind = req.kind.lower() # 'detailed' | 'summary'
    fmt = req.format.lower() # 'pdf' | 'docx'
    gen_count = db.query(GeneratedReport).filter(
        GeneratedReport.report_id == rep.id,
        GeneratedReport.kind == kind,
        GeneratedReport.format == fmt
    ).count() + 1

    file_name = f"{rep.application.application_no}_{kind}_{gen_count}.{fmt}".replace(" ", "_").replace("/", "-")
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
        filename=os.path.basename(record.file_path)
    )
