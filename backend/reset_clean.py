"""
Clean Reset Script
Resets the MetroCert database to a pristine, fresh installation state:
Zero users, zero applications, zero reports, zero test sessions.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.apps.api.database import SessionLocal, engine, Base
from backend.apps.api.seed import init_db

def reset_clean():
    print("Resetting MetroCert database to pristine fresh installation state...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        init_db(db)
    print("Database is now clean and empty. Ready for initial First-Run Administrator Bootstrap.")

if __name__ == "__main__":
    reset_clean()
