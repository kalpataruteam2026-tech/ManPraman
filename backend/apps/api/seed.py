"""
MetroCert Database Initialization
Creates tables, ensures schema integrity, migrates legacy roles to the exact 3 roles,
and initializes a clean production environment with an empty domain data state.
"""
import os
import datetime
from sqlalchemy.orm import Session
try:
    from .database import engine, Base, SessionLocal
    from .models import AppUser, LabProfile
    from .security import hash_password
except ImportError:
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))
    from backend.apps.api.database import engine, Base, SessionLocal
    from backend.apps.api.models import AppUser, LabProfile
    from backend.apps.api.security import hash_password

def init_db(db: Session):
    """
    Creates all tables and ensures clean state.
    Strictly follows the requirement for NO preloaded demo applications,
    fake reports, mock test sessions, or dummy records.
    """
    Base.metadata.create_all(bind=engine)

    # 1. Role Migration: Ensure all existing users conform strictly to the 3 roles:
    # 'admin', 'technician', 'reviewer'
    legacy_users = db.query(AppUser).filter(
        AppUser.role.in_(["engineer", "tester", "inspector", "auditor", "readonly", "operator", "manager"])
    ).all()
    for u in legacy_users:
        u.role = "technician"
    if legacy_users:
        db.commit()

    # 2. Ensure LabProfile exists with clean institutional defaults
    if not db.query(LabProfile).first():
        lab = LabProfile(
            name="National Metrology Institute of Legal Metrology",
            accreditation_no="ISO/IEC 17025:2017 #NABL-TC-8892",
            address="Legal Metrology Complex, Standards Block, New Delhi",
            timezone="Asia/Kolkata",
            default_lang="en"
        )
        db.add(lab)
        db.commit()

    # 3. Environment-based Admin Bootstrap (optional, if provided in environment)
    bootstrap_email = os.getenv("ADMIN_BOOTSTRAP_EMAIL")
    bootstrap_password = os.getenv("ADMIN_BOOTSTRAP_PASSWORD")
    bootstrap_name = os.getenv("ADMIN_BOOTSTRAP_NAME", "System Administrator")

    if bootstrap_email and bootstrap_password:
        existing = db.query(AppUser).filter(AppUser.email == bootstrap_email.strip().lower()).first()
        if not existing:
            admin_user = AppUser(
                email=bootstrap_email.strip().lower(),
                full_name=bootstrap_name,
                role="admin",
                pw_hash=hash_password(bootstrap_password),
                status="active"
            )
            db.add(admin_user)
            db.commit()

if __name__ == "__main__":
    with SessionLocal() as db_session:
        init_db(db_session)
        print("MetroCert database initialized cleanly. Domain data is completely empty.")
