"""
MetroCert & WeighReport - Supabase Backend Database Client
Provides direct REST and Service Role data operations against Supabase.
Compatible with standard library (urllib.request / json) for zero-dependency reliability.
"""
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from datetime import datetime

from .config import settings

logger = logging.getLogger("weighreport.supabase")

def _normalize_supabase_url(url: str) -> str:
    """Strips any trailing slashes or /rest/v1 paths."""
    clean = url.strip().rstrip("/")
    if clean.endswith("/rest/v1"):
        clean = clean[:-8].rstrip("/")
    return clean

class SupabaseClient:
    def __init__(self):
        self.base_url = _normalize_supabase_url(settings.SUPABASE_URL)
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
        self.anon_key = settings.SUPABASE_ANON_KEY or settings.SUPABASE_KEY

    def is_configured(self) -> bool:
        return bool(self.base_url and (self.service_key or self.anon_key))

    def _make_request(
        self,
        endpoint: str,
        method: str = "GET",
        data: Optional[Any] = None,
        use_service_key: bool = True,
        extra_headers: Optional[Dict[str, str]] = None
    ) -> Any:
        """Executes an authenticated HTTP request to Supabase PostgREST API."""
        if not self.is_configured():
            raise RuntimeError("Supabase credentials are not configured in backend settings.")

        key = self.service_key if (use_service_key and self.service_key) else self.anon_key
        url = f"{self.base_url}/rest/v1/{endpoint.lstrip('/')}"

        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if extra_headers:
            headers.update(extra_headers)

        body = None
        if data is not None:
            body = json.dumps(data).encode("utf-8")

        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp_data = resp.read()
                if not resp_data:
                    return None
                return json.loads(resp_data.decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8", errors="replace")
            logger.error("Supabase API HTTP %s error on %s %s: %s", e.code, method, endpoint, err_msg)
            raise RuntimeError(f"Supabase HTTP {e.code}: {err_msg}")
        except Exception as e:
            logger.error("Supabase connection error on %s %s: %s", method, endpoint, e)
            raise

    def test_connection(self) -> Dict[str, Any]:
        """Pings Supabase tables to verify full database connectivity."""
        tables_status = {}
        for tbl in ["users", "instruments", "test_sessions", "test_results"]:
            try:
                self._make_request(f"{tbl}?select=id&limit=1", method="GET")
                tables_status[tbl] = "accessible"
            except Exception as e:
                tables_status[tbl] = f"error: {str(e)}"

        connected = any(v == "accessible" for v in tables_status.values())
        return {
            "connected": connected,
            "supabase_url": self.base_url,
            "tables": tables_status,
            "timestamp": datetime.utcnow().isoformat()
        }

    # ==================== Instruments ====================
    def get_instruments(self, limit: int = 100) -> List[Dict[str, Any]]:
        return self._make_request(f"instruments?select=*&order=created_at.desc&limit={limit}") or []

    def upsert_instrument(self, item: Dict[str, Any]) -> Any:
        return self._make_request(
            "instruments",
            method="POST",
            data=item,
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}
        )

    # ==================== Test Sessions ====================
    def get_test_sessions(self, limit: int = 100) -> List[Dict[str, Any]]:
        return self._make_request(f"test_sessions?select=*&order=created_at.desc&limit={limit}") or []

    def upsert_test_session(self, item: Dict[str, Any]) -> Any:
        return self._make_request(
            "test_sessions",
            method="POST",
            data=item,
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}
        )

    # ==================== Test Results ====================
    def get_test_results(self, session_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "test_results?select=*"
        if session_id:
            query += f"&session_id=eq.{session_id}"
        return self._make_request(query) or []

    def upsert_test_result(self, item: Dict[str, Any]) -> Any:
        return self._make_request(
            "test_results",
            method="POST",
            data=item,
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}
        )

    # ==================== Users ====================
    def get_users(self) -> List[Dict[str, Any]]:
        return self._make_request("users?select=*") or []

    def upsert_user(self, item: Dict[str, Any]) -> Any:
        return self._make_request(
            "users",
            method="POST",
            data=item,
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"}
        )

supabase_client = SupabaseClient()
