"""
WeighReport API - Reports Router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import datetime

from ..database import get_db
from ..models import Report, Application, TestInstance, ChecklistResult, AuditEvent, AppUser
from ..schemas import ReportCreate, ReportResponse, ReviewReturnRequest
from .auth import get_current_user, require_roles
from packages.engine import evaluate_test, aggregate_report_verdict, validate_instrument

router = APIRouter(prefix="/reports", tags=["Reports"])

STANDARD_TEST_CODES = [
    "T1", "T2", "T3.1", "T3.2", "T4.1.1", "T5", "T6.1", "T6.2",
    "T7", "T8", "T9", "T10", "T11", "T12.1", "T13a", "T14", "T15"
]

@router.get("", response_model=List[ReportResponse])
def list_reports(
    status: Optional[str] = None,
    verdict: Optional[str] = None,
    accuracy_class: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Report)
    if status:
        query = query.filter(Report.status == status.lower())
    if verdict:
        query = query.filter(Report.verdict == verdict.lower())
    if accuracy_class:
        query = query.filter(Report.instrument["accuracy_class"].astext == accuracy_class.upper())
    return query.order_by(Report.updated_at.desc()).all()

@router.post("", response_model=ReportResponse)
def create_report(
    req: ReportCreate,
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == req.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Default instrument parameters
    inst = {
        "accuracy_class": "III",
        "Max": "15000",
        "Min": "100",
        "e": "5",
        "d": "5",
        "n": "3000",
        "unit": "g",
        "temperature_range": "-10 °C / +40 °C",
        "power_supply": "230 V AC, 50 Hz",
        "ranges": [{"idx": 1, "e": "5", "d": "5", "Max": "15000", "Min": "100"}]
    }
    if req.instrument:
        inst.update(req.instrument)

    rep = Report(
        application_id=app.id,
        version=1,
        status="draft",
        verdict="incomplete",
        progress_pct=0.0,
        instrument=inst,
        remarks=req.remarks or {}
    )
    db.add(rep)
    db.commit()
    db.refresh(rep)

    # Initialize all standard R 76-2 tests for this report
    for code in STANDARD_TEST_CODES:
        t_inst = TestInstance(
            report_id=rep.id,
            test_code=code,
            applicability="required",
            status="not_started",
            verdict="incomplete",
            header={"e": inst.get("e", "5"), "d": inst.get("d", "5")},
            data={"rows": []},
            results={}
        )
        db.add(t_inst)

    # Initialize standard checklist items
    std_checklist = [
        {"item_key": "17.1/7.1.1/manufacturer_mark", "clause": "7.1.1", "text_en": "Manufacturer's mark or name clearly inscribed"},
        {"item_key": "17.1/7.1.2/accuracy_class", "clause": "7.1.2", "text_en": "Accuracy class symbol (Class I, II, III, IIII) in oval"},
        {"item_key": "17.1/7.1.3/max_capacity", "clause": "7.1.3", "text_en": "Maximum capacity Max clearly marked"},
        {"item_key": "17.1/7.1.4/min_capacity", "clause": "7.1.4", "text_en": "Minimum capacity Min clearly marked"},
        {"item_key": "17.1/7.1.5/scale_interval", "clause": "7.1.5", "text_en": "Verification scale interval e marked"},
        {"item_key": "17.2/4.14/direct_sales", "clause": "4.14", "text_en": "Primary indications visible to vendor and customer"},
        {"item_key": "17.3/5.1/electronic_fault", "clause": "5.1", "text_en": "Significant faults detected and acted upon or warned"},
        {"item_key": "17.4/5.5/software_protection", "clause": "5.5", "text_en": "Legally relevant software protected and secured"}
    ]
    for chk in std_checklist:
        db.add(ChecklistResult(
            report_id=rep.id,
            item_key=chk["item_key"],
            clause=chk["clause"],
            text_en=chk["text_en"],
            result="na"
        ))

    db.commit()
    db.refresh(rep)
    return rep

@router.get("/{id}")
def get_report_detail(id: str, db: Session = Depends(get_db)):
    rep = db.query(Report).filter(Report.id == id).first()
    if not rep:
        # Fallback to search by application_no or application_id
        rep = db.query(Report).join(Application).filter((Application.id == id) | (Application.application_no == id)).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")

    tests = db.query(TestInstance).filter(TestInstance.report_id == rep.id).all()
    checklist = db.query(ChecklistResult).filter(ChecklistResult.report_id == rep.id).all()

    return {
        "id": rep.id,
        "application_id": rep.application_id,
        "application_no": rep.application.application_no if rep.application else "",
        "type_designation": rep.application.type_designation if rep.application else "",
        "manufacturer": rep.application.manufacturer if rep.application else "",
        "applicant": rep.application.applicant if rep.application else "",
        "version": rep.version,
        "status": rep.status,
        "verdict": rep.verdict,
        "progress_pct": float(rep.progress_pct),
        "instrument": rep.instrument,
        "remarks": rep.remarks,
        "evaluation_start": rep.evaluation_start,
        "evaluation_end": rep.evaluation_end,
        "report_date": rep.report_date,
        "tests": [
            {
                "id": t.id,
                "test_code": t.test_code,
                "status": t.status,
                "verdict": t.verdict,
                "applicability": t.applicability,
                "remarks": t.remarks,
                "header": t.header or {},
                "config": t.config or {},
                "data": t.data or {},
                "results": t.results or {},
                "metrics": t.results.get("metrics", {}) if t.results else {}
            } for t in tests
        ],
        "checklist": [
            {
                "id": c.id,
                "item_key": c.item_key,
                "clause": c.clause,
                "text_en": c.text_en,
                "result": c.result,
                "remarks": c.remarks
            } for c in checklist
        ],
        "checklist_counts": {
            "passed": sum(1 for c in checklist if c.result == "passed"),
            "failed": sum(1 for c in checklist if c.result == "failed"),
            "na": sum(1 for c in checklist if c.result == "na"),
            "total": len(checklist)
        },
        "updated_at": rep.updated_at
    }

@router.patch("/{id}/instrument")
def update_instrument(
    id: str,
    instrument_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    rep = db.query(Report).filter(Report.id == id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    if rep.status == "finalised":
        raise HTTPException(status_code=403, detail="Finalised reports are locked and cannot be edited")

    # Validate instrument parameters
    issues = validate_instrument(instrument_data)
    error_issues = [i for i in issues if i.severity == "error"]
    if error_issues:
        raise HTTPException(status_code=422, detail={
            "message": "Instrument parameters validation failed",
            "errors": [i.dict() for i in error_issues]
        })

    # Update instrument
    current_inst = dict(rep.instrument or {})
    current_inst.update(instrument_data)
    rep.instrument = current_inst
    rep.row_version += 1

    # Re-evaluate all tests with new instrument parameters
    tests = db.query(TestInstance).filter(TestInstance.report_id == rep.id).all()
    test_verdicts = []
    for t in tests:
        if t.data and t.data.get("rows"):
            eval_res = evaluate_test(t.test_code, rep.instrument, {
                "header": t.header or {},
                "config": t.config or {},
                "data": t.data or {},
                "applicability": t.applicability
            })
            t.results = eval_res.results
            t.verdict = eval_res.verdict
            t.status = eval_res.status
        test_verdicts.append(t.verdict)

    checklist = db.query(ChecklistResult).filter(ChecklistResult.report_id == rep.id).all()
    chk_verdicts = [c.result for c in checklist if c.result]

    new_verdict, progress = aggregate_report_verdict(test_verdicts, chk_verdicts)
    rep.verdict = new_verdict
    rep.progress_pct = progress

    db.commit()
    return {"status": "ok", "verdict": rep.verdict, "progress_pct": rep.progress_pct}

@router.post("/{id}/submit")
def submit_report(
    id: str,
    db: Session = Depends(get_db),
    user: AppUser = Depends(require_roles(["technician", "admin"]))
):
    rep = db.query(Report).filter(Report.id == id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Store submission state
    rep.status = "under_review"
    rep.observer_id = user.id
    
    # Log audit event
    audit = AuditEvent(
        user_id=user.id,
        entity="report",
        entity_id=rep.id,
        action="SUBMIT_FOR_REVIEW",
        new_data={"status": "under_review", "submitted_by": user.email},
        reason="Technician submitted test package for review",
        hash=f"hash-{rep.id}-submit-{datetime.datetime.utcnow().timestamp()}"
    )
    db.add(audit)
    db.commit()
    return {"status": "ok", "report_status": rep.status}

@router.post("/{id}/approve")
def approve_report(
    id: str,
    db: Session = Depends(get_db),
    reviewer: AppUser = Depends(require_roles(["reviewer", "admin"]))
):
    rep = db.query(Report).filter(Report.id == id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Critical requirement: A technician cannot approve their own submission
    if rep.observer_id and rep.observer_id == reviewer.id and reviewer.role != "admin":
        raise HTTPException(status_code=403, detail="Technician cannot approve their own test package")

    rep.status = "finalised"
    rep.reviewer_id = reviewer.id
    rep.report_date = datetime.date.today()

    # Append review history record
    remarks = dict(rep.remarks or {})
    review_history = list(remarks.get("review_history", []))
    review_history.insert(0, {
        "action": "approved",
        "reviewer_id": reviewer.id,
        "reviewer_name": reviewer.full_name,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "comment": "Verified and approved metrological test results."
    })
    remarks["review_history"] = review_history
    rep.remarks = remarks

    audit = AuditEvent(
        user_id=reviewer.id,
        entity="report",
        entity_id=rep.id,
        action="APPROVE_REPORT",
        new_data={"status": "finalised", "reviewer_id": reviewer.id},
        reason="Reviewer approved metrological test package",
        hash=f"hash-{rep.id}-approve-{datetime.datetime.utcnow().timestamp()}"
    )
    db.add(audit)
    db.commit()
    return {"status": "ok", "report_status": rep.status}

@router.post("/{id}/return")
def return_report(
    id: str,
    req: ReviewReturnRequest,
    db: Session = Depends(get_db),
    reviewer: AppUser = Depends(require_roles(["reviewer", "admin"]))
):
    rep = db.query(Report).filter(Report.id == id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if not req.reason or not req.reason.strip():
        raise HTTPException(status_code=400, detail="A meaningful reason is required before returning a submission")

    rep.status = "returned"
    rep.reviewer_id = reviewer.id

    # Append review history record
    remarks = dict(rep.remarks or {})
    review_history = list(remarks.get("review_history", []))
    review_history.insert(0, {
        "action": "returned_for_correction",
        "reviewer_id": reviewer.id,
        "reviewer_name": reviewer.full_name,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "comment": req.reason.strip()
    })
    remarks["review_history"] = review_history
    rep.remarks = remarks

    audit = AuditEvent(
        user_id=reviewer.id,
        entity="report",
        entity_id=rep.id,
        action="RETURN_FOR_CORRECTION",
        new_data={"status": "returned", "reviewer_id": reviewer.id, "reason": req.reason.strip()},
        reason=req.reason.strip(),
        hash=f"hash-{rep.id}-return-{datetime.datetime.utcnow().timestamp()}"
    )
    db.add(audit)
    db.commit()
    return {"status": "ok", "report_status": rep.status, "reason": req.reason.strip()}

