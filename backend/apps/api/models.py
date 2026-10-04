"""
WeighReport Database Models
Conforming to TRD §5.2 Physical Design.
"""
import uuid
import datetime
from sqlalchemy import (
    Column, String, Integer, DateTime, Date, Boolean, Text, ForeignKey, Numeric, JSON
)
from sqlalchemy.orm import relationship
from .database import Base

def gen_uuid():
    return str(uuid.uuid4())

class AppUser(Base):
    __tablename__ = "app_user"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="technician") # Strictly: 'admin', 'technician', 'reviewer'
    pw_hash = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class LabProfile(Base):
    __tablename__ = "lab_profile"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, default="National Metrology Laboratory")
    accreditation_no = Column(String, default="ISO/IEC 17025 Accr #ML-2026-089")
    address = Column(String, default="Standards & Metrology Complex, Sector 4")
    logo_object_key = Column(String, nullable=True)
    timezone = Column(String, default="Asia/Kolkata")
    default_lang = Column(String, default="en")

class Application(Base):
    __tablename__ = "application"

    id = Column(String, primary_key=True, default=gen_uuid)
    application_no = Column(String, unique=True, nullable=False, index=True)
    applicant = Column(String, nullable=True)
    manufacturer = Column(String, nullable=True)
    type_designation = Column(String, nullable=False)
    instrument_category = Column(String, default="Complete instrument")
    created_by = Column(String, ForeignKey("app_user.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    reports = relationship("Report", back_populates="application", cascade="all, delete-orphan")

class Report(Base):
    __tablename__ = "report"

    id = Column(String, primary_key=True, default=gen_uuid)
    application_id = Column(String, ForeignKey("application.id"), nullable=False)
    version = Column(Integer, default=1)
    parent_report_id = Column(String, nullable=True)
    status = Column(String, default="draft") # 'draft','in_progress','under_review','returned','finalised','archived'
    verdict = Column(String, default="incomplete") # 'passed','failed','incomplete','not_applicable'
    progress_pct = Column(Numeric(5, 2), default=0.0)
    rulepack_id = Column(String, default="oiml-r76-2007")
    engine_version = Column(String, default="1.0.0")
    instrument = Column(JSON, default=dict) # General information page
    evaluation_start = Column(Date, nullable=True)
    evaluation_end = Column(Date, nullable=True)
    report_date = Column(Date, nullable=True)
    observer_id = Column(String, ForeignKey("app_user.id"), nullable=True)
    reviewer_id = Column(String, ForeignKey("app_user.id"), nullable=True)
    remarks = Column(JSON, default=dict)
    row_version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    application = relationship("Application", back_populates="reports")
    tests = relationship("TestInstance", back_populates="report", cascade="all, delete-orphan")
    checklist = relationship("ChecklistResult", back_populates="report", cascade="all, delete-orphan")
    generated_reports = relationship("GeneratedReport", back_populates="report", cascade="all, delete-orphan")

class TestInstance(Base):
    __tablename__ = "test_instance"

    id = Column(String, primary_key=True, default=gen_uuid)
    report_id = Column(String, ForeignKey("report.id"), nullable=False)
    test_code = Column(String, nullable=False, index=True) # e.g. 'T1', 'T3.1'
    instance_no = Column(Integer, default=1)
    range_idx = Column(Integer, default=1)
    config = Column(JSON, default=dict)
    applicability = Column(String, default="required") # 'required', 'na', 'optional'
    na_reason = Column(String, nullable=True)
    header = Column(JSON, default=dict)
    data = Column(JSON, default=dict) # raw observations
    results = Column(JSON, default=dict) # computed columns + explanations
    status = Column(String, default="not_started") # 'not_started','in_progress','complete'
    verdict = Column(String, default="incomplete") # 'passed','failed','incomplete','not_applicable'
    form_schema_version = Column(String, default="1.0.0")
    remarks = Column(Text, nullable=True)
    row_version = Column(Integer, default=1)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    report = relationship("Report", back_populates="tests")

class ChecklistResult(Base):
    __tablename__ = "checklist_result"

    id = Column(String, primary_key=True, default=gen_uuid)
    report_id = Column(String, ForeignKey("report.id"), nullable=False)
    item_key = Column(String, nullable=False)
    clause = Column(String, nullable=True)
    text_en = Column(String, nullable=True)
    section = Column(String, default="17.1")
    result = Column(String, default="na") # 'passed', 'failed', 'na'
    remarks = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    report = relationship("Report", back_populates="checklist")

class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False) # 'standard_weights', 'climatic_chamber', etc.
    manufacturer = Column(String, nullable=True)
    model = Column(String, nullable=True)
    serial_no = Column(String, nullable=True)
    range_text = Column(String, nullable=True)
    accuracy_text = Column(String, nullable=True)
    resolution_text = Column(String, nullable=True)
    cert_no = Column(String, nullable=True)
    cal_date = Column(Date, nullable=True)
    cal_valid_until = Column(Date, nullable=True)
    traceability = Column(String, nullable=True)
    active = Column(Boolean, default=True)

class GeneratedReport(Base):
    __tablename__ = "generated_report"

    id = Column(String, primary_key=True, default=gen_uuid)
    report_id = Column(String, ForeignKey("report.id"), nullable=False)
    kind = Column(String, nullable=False) # 'detailed', 'summary'
    format = Column(String, nullable=False) # 'pdf', 'docx'
    gen_no = Column(Integer, default=1)
    file_path = Column(String, nullable=False)
    sha256 = Column(String, nullable=False)
    data_hash = Column(String, nullable=False)
    stale = Column(Boolean, default=False)
    watermark = Column(String, nullable=True)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)

    report = relationship("Report", back_populates="generated_reports")

class AuditEvent(Base):
    __tablename__ = "audit_event"

    seq = Column(Integer, primary_key=True, autoincrement=True)
    ts = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(String, nullable=True)
    entity = Column(String, nullable=False)
    entity_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    old_data = Column(JSON, nullable=True)
    new_data = Column(JSON, nullable=True)
    reason = Column(Text, nullable=True)
    prev_hash = Column(String, nullable=True)
    hash = Column(String, nullable=False)

class ImportBatch(Base):
    __tablename__ = "import_batch"

    id = Column(String, primary_key=True, default=gen_uuid)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # 'csv', 'xlsx'
    uploader_id = Column(String, ForeignKey("app_user.id"), nullable=True)
    uploader_name = Column(String, nullable=True)
    total_sheets = Column(Integer, default=1)
    total_records = Column(Integer, default=0)
    successful_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    status = Column(String, default="completed") # 'processing', 'completed', 'failed'
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

