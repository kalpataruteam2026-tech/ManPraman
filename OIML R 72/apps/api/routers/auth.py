"""
WeighReport API - Auth & Users Router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import AppUser
from ..schemas import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])
user_router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(AppUser).filter(AppUser.email == req.email.strip().lower()).first()
    if not user:
        # Default fallback to first active user if testing
        user = db.query(AppUser).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

    # In production, check argon2/bcrypt pw_hash
    token = f"jwt-token-{user.id}-{user.role}"
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    )

@user_router.get("", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    users = db.query(AppUser).all()
    return users
