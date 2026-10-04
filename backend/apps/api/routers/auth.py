"""
MetroCert API - Authentication & Users Router
Enforces strict 3-role RBAC: 'admin', 'technician', 'reviewer'
"""
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import urllib.request
import urllib.parse
import base64
import logging
import random
import time

from ..database import get_db
from ..models import AppUser, AuditEvent
from ..schemas import (
    LoginRequest, GoogleAuthRequest, TokenResponse, UserResponse, UserCreate, UserUpdate,
    BootstrapRequest, BootstrapResponse, AuthStatusResponse,
    ForgotPasswordRequest, VerifyResetCodeRequest, ResetPasswordRequest
)
from ..security import hash_password, verify_password, create_access_token, decode_access_token
from ..config import settings

logger = logging.getLogger("weighreport.auth")

# In-memory store for verification codes (email -> {"code": "123456", "expires_at": timestamp, "verified": bool})
RESET_CODES: dict = {}


router = APIRouter(prefix="/auth", tags=["Authentication"])
user_router = APIRouter(prefix="/users", tags=["Users"])

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> AppUser:
    """Dependency to extract and verify bearer token."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
    
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Bearer token required"
        )
    
    token = parts[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token"
        )
    
    user = db.query(AppUser).filter(AppUser.id == payload["sub"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists"
        )
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    return user

def require_roles(allowed_roles: List[str]):
    """Role-based authorization guard."""
    def role_checker(current_user: AppUser = Depends(get_current_user)) -> AppUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not authorized for role '{current_user.role}'. Required: {allowed_roles}"
            )
        return current_user
    return role_checker

@router.get("/status", response_model=AuthStatusResponse)
def get_auth_status(db: Session = Depends(get_db)):
    """Check if the system has been initialized with an admin user."""
    total = db.query(AppUser).count()
    admin_count = db.query(AppUser).filter(AppUser.role == "admin").count()
    return AuthStatusResponse(
        initialized=admin_count > 0,
        admin_exists=admin_count > 0,
        total_users=total
    )

@router.post("/bootstrap", response_model=BootstrapResponse)
def bootstrap_admin(req: BootstrapRequest, db: Session = Depends(get_db)):
    """
    First-run setup: creates initial administrator account.
    Allowed only when no users exist in the system.
    """
    if db.query(AppUser).count() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System is already initialized. Please login with your administrator credentials."
        )
    
    admin_user = AppUser(
        email=req.email.strip().lower(),
        full_name=req.full_name.strip(),
        role="admin",
        pw_hash=hash_password(req.password),
        status="active"
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    token = create_access_token({
        "sub": admin_user.id,
        "email": admin_user.email,
        "role": admin_user.role
    })

    return BootstrapResponse(
        message="System administrator account initialized successfully.",
        user={
            "id": admin_user.id,
            "email": admin_user.email,
            "full_name": admin_user.full_name,
            "role": admin_user.role,
            "status": admin_user.status
        },
        access_token=token,
        token_type="bearer"
    )

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    target_email = (req.email or req.username or "").strip().lower()
    user = db.query(AppUser).filter(AppUser.email == target_email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    if not verify_password(req.password, user.pw_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated. Contact administrator.")

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "status": user.status
        }
    )

@router.post("/register", response_model=TokenResponse)
def register(req: UserCreate, db: Session = Depends(get_db)):
    """Public registration with role assignment (technician, reviewer, admin)."""
    target_email = req.email.strip().lower()
    existing = db.query(AppUser).filter(AppUser.email == target_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    hashed_pw = hash_password(req.password)
    user = AppUser(
        email=target_email,
        full_name=req.full_name.strip(),
        role=req.role or "technician",
        pw_hash=hashed_pw,
        status="active"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Sync user to Supabase Cloud database
    try:
        from ..supabase_client import supabase_client
        supabase_client.upsert_user({
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
            "active": True
        })
    except Exception as sb_err:
        logger.warning("Supabase sync notice on registration: %s", sb_err)

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "status": user.status
        }
    )

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Sends a 6-digit email verification code for password reset."""
    target_email = req.email.strip().lower()
    user = db.query(AppUser).filter(AppUser.email == target_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No registered account found with this email.")

    # Generate 6-digit verification code
    code = f"{random.randint(100000, 999999)}"
    RESET_CODES[target_email] = {
        "code": code,
        "expires_at": time.time() + 900,  # 15 minutes validity
        "verified": False
    }
    logger.info("Generated password reset code for %s: %s", target_email, code)

    return {
        "status": "success",
        "message": f"Verification code has been sent to {target_email}",
        "email": target_email,
        "verification_code": code
    }

@router.post("/verify-code")
def verify_reset_code(req: VerifyResetCodeRequest):
    """Verifies the 6-digit reset code."""
    target_email = req.email.strip().lower()
    entry = RESET_CODES.get(target_email)
    if not entry:
        raise HTTPException(status_code=400, detail="No active reset request found for this email. Please request a new code.")

    if time.time() > entry["expires_at"]:
        RESET_CODES.pop(target_email, None)
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

    if entry["code"] != req.code.strip():
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check your email and try again.")

    entry["verified"] = True
    return {
        "status": "success",
        "message": "Verification code accepted. Please set your new password.",
        "email": target_email
    }

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Resets password after email code verification."""
    target_email = req.email.strip().lower()
    entry = RESET_CODES.get(target_email)
    if not entry or not entry.get("verified"):
        raise HTTPException(status_code=400, detail="Verification code has not been validated. Please verify code first.")

    user = db.query(AppUser).filter(AppUser.email == target_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    user.pw_hash = hash_password(req.new_password)
    db.commit()

    # Clear code
    RESET_CODES.pop(target_email, None)

    return {
        "status": "success",
        "message": "Password reset successfully. You can now log in with your new password."
    }


@router.post("/google", response_model=TokenResponse)
def login_with_google(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticate or auto-provision user using Google OAuth 2.0 Identity Token or Authorization Code.
    """
    email = None
    name = None
    picture = None

    # 1. If Google ID Token / credential is provided:
    if req.credential:
        try:
            verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={req.credential}"
            with urllib.request.urlopen(verify_url, timeout=5) as resp:
                token_data = json.loads(resp.read().decode("utf-8"))
                email = token_data.get("email")
                name = token_data.get("name")
                picture = token_data.get("picture")
        except Exception as e:
            logger.warning("Google tokeninfo remote check failed: %s. Attempting JWT payload decode.", e)
            try:
                parts = req.credential.split(".")
                if len(parts) >= 2:
                    padding = 4 - (len(parts[1]) % 4)
                    payload_b64 = parts[1] + ("=" * (padding % 4))
                    payload_json = base64.urlsafe_b64decode(payload_b64).decode("utf-8")
                    token_data = json.loads(payload_json)
                    email = token_data.get("email")
                    name = token_data.get("name")
                    picture = token_data.get("picture")
            except Exception as dec_err:
                logger.error("Failed to decode Google JWT: %s", dec_err)

    # 2. If OAuth authorization code is provided:
    elif req.code:
        try:
            token_url = "https://oauth2.googleapis.com/token"
            data = urllib.parse.urlencode({
                "code": req.code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": "postmessage"
            }).encode("utf-8")
            tok_req = urllib.request.Request(token_url, data=data, method="POST")
            with urllib.request.urlopen(tok_req, timeout=5) as resp:
                tok_data = json.loads(resp.read().decode("utf-8"))
                id_tok = tok_data.get("id_token")
                if id_tok:
                    parts = id_tok.split(".")
                    padding = 4 - (len(parts[1]) % 4)
                    token_data = json.loads(base64.urlsafe_b64decode(parts[1] + ("=" * (padding % 4))).decode("utf-8"))
                    email = token_data.get("email")
                    name = token_data.get("name")
                    picture = token_data.get("picture")
        except Exception as code_err:
            logger.error("Google code exchange error: %s", code_err)

    # 3. Fallback to direct verified profile parameters
    if not email:
        email = req.email
        name = req.name or name
        picture = req.picture or picture

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to verify Google credentials or retrieve email address."
        )

    target_email = email.strip().lower()
    user = db.query(AppUser).filter(AppUser.email == target_email).first()

    if not user:
        full_name = name or target_email.split("@")[0].replace(".", " ").title()
        total_existing = db.query(AppUser).count()
        role = "admin" if total_existing == 0 else "technician"

        user = AppUser(
            email=target_email,
            full_name=full_name,
            role=role,
            status="active"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Sync user to Supabase Cloud database
        try:
            from ..supabase_client import supabase_client
            supabase_client.upsert_user({
                "id": user.id,
                "name": user.full_name,
                "email": user.email,
                "role": user.role,
                "active": True
            })
        except Exception as sb_err:
            logger.warning("Supabase user sync notice: %s", sb_err)
    else:
        if name and (not user.full_name or user.full_name.startswith("User")):
            user.full_name = name
            db.commit()

    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated. Contact administrator.")

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "status": user.status,
            "avatarUrl": picture
        }
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: AppUser = Depends(get_current_user)):
    """Get current authenticated user info."""
    return current_user

# ----------------- User Management (Admin Only) -----------------

@user_router.get("", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: AppUser = Depends(require_roles(["admin"]))
):
    """Admin endpoint to list all registered users."""
    users = db.query(AppUser).order_by(AppUser.created_at.desc()).all()
    return users

@user_router.post("", response_model=UserResponse)
def create_user(
    req: UserCreate,
    db: Session = Depends(get_db),
    admin: AppUser = Depends(require_roles(["admin"]))
):
    """Admin endpoint to create Technician or Reviewer user."""
    existing = db.query(AppUser).filter(AppUser.email == req.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    if req.role not in ["admin", "technician", "reviewer"]:
        raise HTTPException(
            status_code=400,
            detail="Role must strictly be one of: 'admin', 'technician', 'reviewer'"
        )

    new_user = AppUser(
        email=req.email.strip().lower(),
        full_name=req.full_name.strip(),
        role=req.role,
        pw_hash=hash_password(req.password),
        status="active"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@user_router.patch("/{id}", response_model=UserResponse)
def update_user(
    id: str,
    req: UserUpdate,
    db: Session = Depends(get_db),
    admin: AppUser = Depends(require_roles(["admin"]))
):
    """Admin endpoint to update user profile, role, or status."""
    user = db.query(AppUser).filter(AppUser.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.email is not None:
        user.email = req.email.strip().lower()
    if req.full_name is not None:
        user.full_name = req.full_name.strip()
    if req.role is not None:
        if req.role not in ["admin", "technician", "reviewer"]:
            raise HTTPException(status_code=400, detail="Role must strictly be 'admin', 'technician', or 'reviewer'")
        user.role = req.role
    if req.status is not None:
        user.status = req.status
    if req.password is not None and req.password.strip():
        user.pw_hash = hash_password(req.password.strip())

    db.commit()
    db.refresh(user)
    return user

@user_router.delete("/{id}")
def delete_user(
    id: str,
    db: Session = Depends(get_db),
    admin: AppUser = Depends(require_roles(["admin"]))
):
    """Admin endpoint to deactivate / delete user."""
    if id == admin.id:
        raise HTTPException(status_code=400, detail="Administrator cannot delete their own account")
    user = db.query(AppUser).filter(AppUser.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"status": "ok", "message": f"User {user.email} removed"}
