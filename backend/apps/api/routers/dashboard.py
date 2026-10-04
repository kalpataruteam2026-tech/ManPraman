"""
WeighReport API - Testing Dashboard & Search Router
Implements PRD §4.13 & TRD §13 with KPI tiles, Status Board, and the dedicated Pass/Fail Matrix view.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from ..database import get_db
from ..models import Report, TestInstance, Application, AppUser
from ..schemas import DashboardKPIs, PassFailMatrixRow

router = APIRouter(tags=["Testing Dashboard & Search"])

@router.get("/dashboard/kpis", response_model=DashboardKPIs)
def get_dashboard_kpis(db: Session = Depends(get_db)):
    reports = db.query(Report).all()
    total = len(reports)
    draft_c = sum(1 for r in reports if r.status == "draft")
    in_prog_c = sum(1 for r in reports if r.status == "in_progress")
    review_c = sum(1 for r in reports if r.status == "under_review")
    final_c = sum(1 for r in reports if r.status == "finalised")
    returned_c = sum(1 for r in reports if r.status == "returned")
    passed_c = sum(1 for r in reports if r.verdict == "passed")
    failed_c = sum(1 for r in reports if r.verdict == "failed")

    pending_tests = db.query(TestInstance).filter(
        TestInstance.status != "complete",
        TestInstance.applicability == "required"
    ).count()

    total_users = db.query(AppUser).count()
    tech_count = db.query(AppUser).filter(AppUser.role == "technician").count()
    rev_count = db.query(AppUser).filter(AppUser.role == "reviewer").count()

    return DashboardKPIs(
        total_reports=total,
        draft_count=draft_c,
        in_progress_count=in_prog_c,
        under_review_count=review_c,
        finalised_count=final_c,
        passed_count=passed_c,
        failed_count=failed_c,
        tests_pending_count=pending_tests,
        total_users=total_users,
        technicians_count=tech_count,
        reviewers_count=rev_count,
        returned_count=returned_c
    )

@router.get("/dashboard/pass-fail-matrix", response_model=List[PassFailMatrixRow])
def get_pass_fail_matrix(
    verdict: Optional[str] = None,
    accuracy_class: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Dedicated Pass/Fail matrix view: pivot over reports × tests showing
    PASSED / FAILED / INCOMPLETE / N/A, with drill-down support (FR-DSH-3).
    """
    query = db.query(Report)
    if verdict:
        query = query.filter(Report.verdict == verdict.lower())

    reports = query.all()
    rows = []

    for r in reports:
        app = r.application
        inst = r.instrument or {}
        cls = inst.get("accuracy_class", "III")
        if accuracy_class and cls.upper() != accuracy_class.upper():
            continue

        tests = db.query(TestInstance).filter(TestInstance.report_id == r.id).all()
        cells = {}
        for t in tests:
            cells[t.test_code] = t.verdict

        rows.append(PassFailMatrixRow(
            report_id=r.id,
            application_no=app.application_no if app else "",
            type_designation=app.type_designation if app else "",
            accuracy_class=f"Class {cls}",
            status=r.status,
            overall_verdict=r.verdict,
            cells=cells
        ))

    return rows

@router.get("/search")
def search_reports(
    q: Optional[str] = Query(None, description="General search term"),
    verdict: Optional[str] = None,
    status: Optional[str] = None,
    accuracy_class: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Report).join(Application, Report.application_id == Application.id)

    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            (Application.application_no.ilike(pattern)) |
            (Application.type_designation.ilike(pattern)) |
            (Application.manufacturer.ilike(pattern)) |
            (Application.applicant.ilike(pattern))
        )
    if verdict:
        query = query.filter(Report.verdict == verdict.lower())
    if status:
        query = query.filter(Report.status == status.lower())

    reports = query.order_by(Report.updated_at.desc()).all()
    results = []
    for r in reports:
        app = r.application
        inst = r.instrument or {}
        if accuracy_class and inst.get("accuracy_class", "").upper() != accuracy_class.upper():
            continue
        results.append({
            "id": r.id,
            "application_no": app.application_no if app else "",
            "type_designation": app.type_designation if app else "",
            "manufacturer": app.manufacturer if app else "",
            "accuracy_class": inst.get("accuracy_class", "III"),
            "status": r.status,
            "verdict": r.verdict,
            "progress_pct": float(r.progress_pct),
            "updated_at": r.updated_at
        })

    return results
