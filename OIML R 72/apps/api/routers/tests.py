"""
WeighReport API - Tests & Calculation Router
Handles live observations autosave, calculation execution, and live preview.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from ..database import get_db
from ..models import TestInstance, Report, ChecklistResult, AuditEvent
from ..schemas import TestInstanceResponse, TestInstanceUpdate, CalcPreviewRequest, CalcPreviewResponse
from packages.engine import evaluate_test, aggregate_report_verdict

router = APIRouter(prefix="/tests", tags=["Tests & Calculations"])

@router.get("/{id}")
def get_test_instance(id: str, db: Session = Depends(get_db)):
    t = db.query(TestInstance).filter(TestInstance.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Test instance not found")

    rep = db.query(Report).filter(Report.id == t.report_id).first()
    return {
        "id": t.id,
        "report_id": t.report_id,
        "test_code": t.test_code,
        "instance_no": t.instance_no,
        "applicability": t.applicability,
        "na_reason": t.na_reason,
        "header": t.header or {},
        "config": t.config or {},
        "data": t.data or {},
        "results": t.results or {},
        "status": t.status,
        "verdict": t.verdict,
        "remarks": t.remarks,
        "row_version": t.row_version,
        "instrument": rep.instrument if rep else {}
    }

@router.patch("/{id}")
def update_test_instance(
    id: str,
    req: TestInstanceUpdate,
    db: Session = Depends(get_db)
):
    t = db.query(TestInstance).filter(TestInstance.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Test instance not found")

    rep = db.query(Report).filter(Report.id == t.report_id).first()
    if rep and rep.status == "finalised":
        raise HTTPException(status_code=403, detail="Report is finalised and locked")

    # Merge incoming updates
    current_data = dict(t.data or {})
    current_header = dict(t.header or {})
    current_config = dict(t.config or {})

    if req.data is not None:
        current_data.update(req.data)
    if req.header is not None:
        current_header.update(req.header)
    if req.config is not None:
        current_config.update(req.config)
    if req.remarks is not None:
        t.remarks = req.remarks
    if req.applicability is not None:
        t.applicability = req.applicability
    if req.na_reason is not None:
        t.na_reason = req.na_reason

    t.data = current_data
    t.header = current_header
    t.config = current_config

    # Evaluate test using server-authoritative weighreport_engine
    instrument = rep.instrument if rep else {}
    eval_result = evaluate_test(
        test_code=t.test_code,
        instrument=instrument,
        test_payload={
            "header": t.header,
            "config": t.config,
            "data": t.data,
            "applicability": t.applicability
        }
    )

    t.results = eval_result.results
    t.verdict = eval_result.verdict
    t.status = eval_result.status
    t.row_version += 1

    # Re-aggregate overall report verdict and progress
    all_tests = db.query(TestInstance).filter(TestInstance.report_id == rep.id).all()
    test_verdicts = [item.verdict if item.id != t.id else eval_result.verdict for item in all_tests]

    all_checklist = db.query(ChecklistResult).filter(ChecklistResult.report_id == rep.id).all()
    chk_verdicts = [c.result for c in all_checklist if c.result]

    new_report_verdict, progress = aggregate_report_verdict(test_verdicts, chk_verdicts)
    rep.verdict = new_report_verdict
    rep.progress_pct = progress

    # Write audit log
    audit = AuditEvent(
        entity="test_instance",
        entity_id=t.id,
        action="UPDATE_TEST_OBSERVATIONS",
        old_data={"verdict": t.verdict},
        new_data={"verdict": eval_result.verdict, "status": eval_result.status},
        reason="Observation update and automatic recompute",
        hash=f"hash-{t.id}-{t.row_version}"
    )
    db.add(audit)
    db.commit()

    return {
        "id": t.id,
        "test_code": t.test_code,
        "status": t.status,
        "verdict": t.verdict,
        "results": t.results,
        "explanations": [e.dict() for e in eval_result.explanations],
        "issues": [i.dict() for i in eval_result.issues],
        "row_version": t.row_version,
        "report": {
            "verdict": rep.verdict,
            "progress_pct": float(rep.progress_pct)
        }
    }

@router.post("/calc/preview", response_model=CalcPreviewResponse)
def calc_preview(req: CalcPreviewRequest):
    """Stateless live preview calculation for UI live-typing."""
    eval_result = evaluate_test(
        test_code=req.test_code,
        instrument=req.instrument,
        test_payload=req.test_payload
    )
    return CalcPreviewResponse(
        test_code=eval_result.test_code,
        status=eval_result.status,
        verdict=eval_result.verdict,
        results=eval_result.results,
        explanations=[e.dict() for e in eval_result.explanations],
        issues=[i.dict() for i in eval_result.issues]
    )
