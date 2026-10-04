"""
MetroCert Explicit Development Demo Seeder
Run manually ONLY when development demo data is explicitly needed:
    python backend/seed_demo.py
This script NEVER runs automatically on clean installation or system startup.
"""
import os
import sys
import datetime

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from apps.api.database import SessionLocal, engine, Base
from apps.api.models import (
    AppUser, LabProfile, Application, Report, TestInstance, ChecklistResult, Equipment, AuditEvent
)
from apps.api.security import hash_password

def seed_demo_data():
    print("Seeding explicit development demo data into MetroCert database...")
    db = SessionLocal()
    try:
        Base.metadata.create_all(bind=engine)

        # 1. Demo Users (Admin, Technician, Reviewer)
        admin = db.query(AppUser).filter(AppUser.email == "admin@metrocert.lab").first()
        if not admin:
            admin = AppUser(
                email="admin@metrocert.lab",
                full_name="Dr. H. Sharma (Lab Director)",
                role="admin",
                pw_hash=hash_password("admin123"),
                status="active"
            )
            db.add(admin)

        tech = db.query(AppUser).filter(AppUser.email == "technician@metrocert.lab").first()
        if not tech:
            tech = AppUser(
                email="technician@metrocert.lab",
                full_name="Rajesh Patel (Lead Test Technician)",
                role="technician",
                pw_hash=hash_password("tech123"),
                status="active"
            )
            db.add(tech)

        rev = db.query(AppUser).filter(AppUser.email == "reviewer@metrocert.lab").first()
        if not rev:
            rev = AppUser(
                email="reviewer@metrocert.lab",
                full_name="Ananya Sen (Technical Reviewer)",
                role="reviewer",
                pw_hash=hash_password("rev123"),
                status="active"
            )
            db.add(rev)

        db.commit()

        # 2. Demo Equipment
        if not db.query(Equipment).first():
            eq1 = Equipment(
                name="OIML Class E2 Weights Set (1 mg - 20 kg)",
                category="standard_weights",
                manufacturer="Häfner Gewichte GmbH",
                model="E2-SST-Set",
                serial_no="HAF-2024-9981",
                range_text="1 mg to 20 kg",
                accuracy_text="OIML R 111 Class E2",
                resolution_text="0.1 mg",
                cert_no="CAL-NPL-2026-4421",
                cal_date=datetime.date(2026, 1, 15),
                cal_valid_until=datetime.date(2027, 1, 15),
                traceability="National Physical Laboratory (NPL)",
                active=True
            )
            db.add(eq1)
            db.commit()

        print("[OK] Demo seed completed successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
