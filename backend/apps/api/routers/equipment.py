"""
WeighReport API - Equipment Register Router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta

from ..database import get_db
from ..models import Equipment
from ..schemas import EquipmentCreate, EquipmentResponse

router = APIRouter(prefix="/equipment", tags=["Equipment Register"])

@router.get("", response_model=List[EquipmentResponse])
def list_equipment(db: Session = Depends(get_db)):
    return db.query(Equipment).filter(Equipment.active == True).all()

@router.post("", response_model=EquipmentResponse)
def add_equipment(req: EquipmentCreate, db: Session = Depends(get_db)):
    eq = Equipment(**req.dict(), active=True)
    db.add(eq)
    db.commit()
    db.refresh(eq)
    return eq

@router.get("/expiring", response_model=List[EquipmentResponse])
def get_expiring_equipment(
    days: int = Query(30, description="Days until expiration"),
    db: Session = Depends(get_db)
):
    threshold_date = date.today() + timedelta(days=days)
    return db.query(Equipment).filter(
        Equipment.active == True,
        Equipment.cal_valid_until != None,
        Equipment.cal_valid_until <= threshold_date
    ).all()
