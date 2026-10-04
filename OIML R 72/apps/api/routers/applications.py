"""
WeighReport API - Applications Router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import Application, AppUser
from ..schemas import ApplicationCreate, ApplicationResponse

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.get("", response_model=List[ApplicationResponse])
def list_applications(
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Application)
    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            (Application.application_no.ilike(search_pattern)) |
            (Application.type_designation.ilike(search_pattern)) |
            (Application.applicant.ilike(search_pattern)) |
            (Application.manufacturer.ilike(search_pattern))
        )
    return query.order_by(Application.created_at.desc()).all()

@router.post("", response_model=ApplicationResponse)
def create_application(
    req: ApplicationCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(Application).filter(Application.application_no == req.application_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="Application number already exists")

    app = Application(
        application_no=req.application_no,
        type_designation=req.type_designation,
        applicant=req.applicant,
        manufacturer=req.manufacturer,
        instrument_category=req.instrument_category
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app

@router.get("/{id}", response_model=ApplicationResponse)
def get_application(id: str, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app
