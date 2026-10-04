"""
WeighReport API - Checklist Router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ..database import get_db
from ..models import ChecklistResult, Report, TestInstance
from ..schemas import ChecklistUpdate
from packages.engine import aggregate_report_verdict

router = APIRouter(prefix="/reports/{report_id}/checklist", tags=["Checklist"])

@router.get("")
def get_report_checklist(report_id: str, db: Session = Depends(get_db)):
    items = db.query(ChecklistResult).filter(ChecklistResult.report_id == report_id).all()
    return [
        {
            "id": c.id,
            "item_key": c.item_key,
            "clause": c.clause,
            "text_en": c.text_en,
            "section": c.section,
            "result": c.result,
            "remarks": c.remarks
        } for c in items
    ]

@router.patch("/{item_key:path}")
def update_checklist_item(
    report_id: str,
    item_key: str,
    req: ChecklistUpdate,
    db: Session = Depends(get_db)
):
    item = db.query(ChecklistResult).filter(
        ChecklistResult.report_id == report_id,
        ChecklistResult.item_key == item_key
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    item.result = req.result.lower()
    if req.remarks is not None:
        item.remarks = req.remarks

    # Re-aggregate overall report verdict
    rep = db.query(Report).filter(Report.id == report_id).first()
    if rep:
        all_tests = db.query(TestInstance).filter(TestInstance.report_id == rep.id).all()
        test_verdicts = [t.verdict for t in all_tests]
        all_checklist = db.query(ChecklistResult).filter(ChecklistResult.report_id == rep.id).all()
        chk_verdicts = [c.result for c in all_checklist if c.result]

        new_v, progress = aggregate_report_verdict(test_verdicts, chk_verdicts)
        rep.verdict = new_v
        rep.progress_pct = progress

    db.commit()
    return {"status": "ok", "item_key": item.item_key, "result": item.result, "report_verdict": rep.verdict if rep else ""}
