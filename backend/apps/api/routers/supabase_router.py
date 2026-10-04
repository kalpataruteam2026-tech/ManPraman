"""
MetroCert - Supabase Cloud Database Integration Router
Exposes database status, direct queries, and bi-directional synchronization.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from ..database import get_db
from ..supabase_client import supabase_client
from ..models import Application, Report, TestInstance, AppUser

router = APIRouter(prefix="/supabase", tags=["Supabase Cloud Database"])

@router.get("/status")
def get_supabase_status():
    """Returns real-time connection status to the Supabase database."""
    try:
        status = supabase_client.test_connection()
        return status
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }

@router.get("/instruments")
def get_cloud_instruments():
    """Fetches instruments stored in the remote Supabase database."""
    try:
        return supabase_client.get_instruments()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Supabase error: {str(e)}")

@router.post("/instruments")
def create_cloud_instrument(payload: Dict[str, Any]):
    """Registers or updates an instrument in the remote Supabase database."""
    try:
        res = supabase_client.upsert_instrument(payload)
        return {"status": "success", "data": res}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Supabase error: {str(e)}")

@router.get("/sessions")
def get_cloud_sessions():
    """Fetches test sessions stored in the remote Supabase database."""
    try:
        return supabase_client.get_test_sessions()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Supabase error: {str(e)}")

@router.post("/sessions")
def create_cloud_session(payload: Dict[str, Any]):
    """Creates or updates a test session in the remote Supabase database."""
    try:
        res = supabase_client.upsert_test_session(payload)
        return {"status": "success", "data": res}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Supabase error: {str(e)}")

@router.post("/sync")
def sync_local_to_supabase(db: Session = Depends(get_db)):
    """
    Synchronizes local SQLite records (Applications, Reports, Tests)
    into the Supabase Cloud database tables.
    """
    synced_instruments = 0
    synced_sessions = 0

    try:
        # Sync Applications -> instruments
        apps = db.query(Application).all()
        for app in apps:
            inst_data = {
                "id": app.id,
                "model_name": app.type_designation,
                "manufacturer": app.manufacturer or "Unknown",
                "serial_number": app.application_no or f"SN-{app.id[:8]}",
                "accuracy_class": "III",
                "max_capacity": 15000.0,
                "e_value": 5.0,
                "d_value": 1.0,
                "min_capacity": 100.0,
                "n_max": 3000,
                "tare_max": 5000.0
            }
            supabase_client.upsert_instrument(inst_data)
            synced_instruments += 1

        # Sync Reports -> test_sessions
        reports = db.query(Report).all()
        for rep in reports:
            sess_data = {
                "id": rep.id,
                "instrument_id": rep.application_id,
                "mode": "standard",
                "stage": rep.status,
                "status": rep.status,
                "overall_verdict": rep.verdict or "pass",
                "location": "Metrology Lab Complex",
                "temperature": 20.0,
                "humidity": 50.0
            }
            supabase_client.upsert_test_session(sess_data)
            synced_sessions += 1

        return {
            "status": "success",
            "message": "Local records synced to Supabase successfully.",
            "synced": {
                "instruments": synced_instruments,
                "sessions": synced_sessions
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")
