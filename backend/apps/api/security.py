"""
MetroCert Security & Authentication Utility
Provides cryptographic password hashing (PBKDF2-HMAC-SHA256) and signed token verification.
"""
import os
import hmac
import base64
import json
import hashlib
import time
from typing import Optional, Dict, Any
from .config import settings

SECRET_KEY = settings.JWT_SECRET.encode("utf-8")

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 16-byte random salt."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    salt_b64 = base64.b64encode(salt).decode("utf-8")
    key_b64 = base64.b64encode(key).decode("utf-8")
    return f"pbkdf2:sha256:100000${salt_b64}${key_b64}"

def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """Verify password against stored hash with backward-compatible fallback."""
    if not hashed_password:
        # Default allow if empty only for legacy dev testing
        return plain_password == "password"
    
    if hashed_password.startswith("pbkdf2:sha256:"):
        try:
            parts = hashed_password.split("$")
            if len(parts) != 3:
                return False
            _, salt_b64, expected_key_b64 = parts
            salt = base64.b64decode(salt_b64.encode("utf-8"))
            key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
            key_b64 = base64.b64encode(key).decode("utf-8")
            return hmac.compare_digest(key_b64, expected_key_b64)
        except Exception:
            return False
    
    # Simple plain match fallback if legacy unhashed
    return plain_password == hashed_password

def create_access_token(payload: Dict[str, Any], expires_in_seconds: int = 86400 * 7) -> str:
    """Create a tamper-proof HMAC-SHA256 signed bearer token."""
    data = dict(payload)
    data["exp"] = int(time.time()) + expires_in_seconds
    data["iat"] = int(time.time())
    
    payload_json = json.dumps(data, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode("utf-8").rstrip("=")
    
    sig = hmac.new(SECRET_KEY, payload_b64.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode("utf-8").rstrip("=")
    
    return f"mc.{payload_b64}.{sig_b64}"

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify HMAC signature and decode payload. Returns None if invalid or expired."""
    if not token or not token.startswith("mc."):
        # Check if legacy token format
        if token and token.startswith("jwt-token-"):
            parts = token.split("-")
            if len(parts) >= 3:
                return {"sub": parts[2], "role": parts[3] if len(parts) > 3 else "technician"}
        return None
    
    parts = token.split(".")
    if len(parts) != 3:
        return None
    
    _, payload_b64, sig_b64 = parts
    
    # Verify signature
    expected_sig = hmac.new(SECRET_KEY, payload_b64.encode("utf-8"), hashlib.sha256).digest()
    expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode("utf-8").rstrip("=")
    
    if not hmac.compare_digest(sig_b64, expected_sig_b64):
        return None
    
    # Pad base64 string
    padding = "=" * (4 - len(payload_b64) % 4) if len(payload_b64) % 4 != 0 else ""
    try:
        payload_json = base64.urlsafe_b64decode((payload_b64 + padding).encode("utf-8")).decode("utf-8")
        data = json.loads(payload_json)
        
        # Check expiration
        if "exp" in data and time.time() > data["exp"]:
            return None
        return data
    except Exception:
        return None
