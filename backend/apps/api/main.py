"""
WeighReport API Server - OIML R 76 NAWI Type Evaluation Report Application
Conforming strictly to PRD and TRD specifications.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine, SessionLocal
from .seed import init_db
from .routers import auth, applications, reports, tests, checklist, equipment, generation, dashboard, ml_pipeline, csv_pipeline, import_data, supabase_router
from .supabase_client import supabase_client

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()

    # Test & Log Supabase Database Connection
    try:
        sb_status = supabase_client.test_connection()
        if sb_status.get("connected"):
            print(f"[Supabase] Connected successfully to {sb_status.get('supabase_url')} | Tables: {list(sb_status.get('tables', {}).keys())}")
        else:
            print(f"[Supabase] Warning: Could not connect to Supabase: {sb_status}")
    except Exception as e:
        print(f"[Supabase] Connection check notice: {e}")

    yield

app = FastAPI(
    title="MetroCert — Digital OIML R-76 Testing & Compliance Engine",
    description="Automated metrological compliance calculation, review verification, and report generation.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable GZip compression for payload latency reduction
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Enable CORS for local and web SPA usage
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Routers
api_v1_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_v1_prefix)
app.include_router(auth.user_router, prefix=api_v1_prefix)
app.include_router(applications.router, prefix=api_v1_prefix)
app.include_router(reports.router, prefix=api_v1_prefix)
app.include_router(tests.router, prefix=api_v1_prefix)
app.include_router(checklist.router, prefix=api_v1_prefix)
app.include_router(equipment.router, prefix=api_v1_prefix)
app.include_router(generation.router, prefix=api_v1_prefix)
app.include_router(dashboard.router, prefix=api_v1_prefix)
app.include_router(ml_pipeline.router, prefix=api_v1_prefix)
app.include_router(csv_pipeline.router, prefix=api_v1_prefix)
app.include_router(csv_pipeline.router)
app.include_router(import_data.router, prefix=api_v1_prefix)
app.include_router(supabase_router.router, prefix=api_v1_prefix)

@app.get("/healthz")
@app.get("/health")
@app.get(f"{api_v1_prefix}/healthz")
@app.get(f"{api_v1_prefix}/health")
def healthcheck():
    return {
        "status": "ok",
        "app": "MetroCert / WeighReport",
        "standard": "OIML R 76-2:2007",
        "version": "1.0.0",
        "database": {
            "type": "supabase_hybrid",
            "supabase_connected": True,
            "supabase_url": supabase_client.base_url
        }
    }

# Mount frontend web app static assets
WEB_DIR = os.path.abspath("apps/web")
if os.path.exists(WEB_DIR):
    app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
