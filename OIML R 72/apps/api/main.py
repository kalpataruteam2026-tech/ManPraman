"""
WeighReport API Server - OIML R 76 NAWI Type Evaluation Report Application
Conforming strictly to PRD and TRD specifications.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine, SessionLocal
from .seed import init_db
from .routers import auth, applications, reports, tests, checklist, equipment, generation, dashboard

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="WeighReport — OIML R 76 Type Evaluation Report Generator",
    description="Automated metrological compliance calculation, validation, and dual-format report generation (PDF & DOCX).",
    version="1.0.0",
    lifespan=lifespan
)

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

@app.get("/healthz")
def healthcheck():
    return {"status": "ok", "app": "WeighReport", "standard": "OIML R 76-2:2007", "version": "1.0.0"}

# Mount frontend web app static assets
WEB_DIR = os.path.abspath("apps/web")
if os.path.exists(WEB_DIR):
    app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
