"""
WeighReport Pydantic Request & Response Schemas
"""
from typing import List, Dict, Any, Optional
from datetime import date, datetime
from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    email: str
    password: str = "password"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    status: str

class ApplicationCreate(BaseModel):
    application_no: str
    type_designation: str
    applicant: Optional[str] = None
    manufacturer: Optional[str] = None
    instrument_category: Optional[str] = "Complete instrument"

class ApplicationResponse(BaseModel):
    id: str
    application_no: str
    type_designation: str
    applicant: Optional[str]
    manufacturer: Optional[str]
    instrument_category: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class ReportCreate(BaseModel):
    application_id: str
    instrument: Dict[str, Any] = Field(default_factory=dict)
    remarks: Dict[str, Any] = Field(default_factory=dict)

class ReportResponse(BaseModel):
    id: str
    application_id: str
    version: int
    status: str
    verdict: str
    progress_pct: float
    instrument: Dict[str, Any]
    evaluation_start: Optional[date]
    evaluation_end: Optional[date]
    report_date: Optional[date]
    row_version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TestInstanceUpdate(BaseModel):
    header: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None
    data: Optional[Dict[str, Any]] = None
    remarks: Optional[str] = None
    applicability: Optional[str] = None
    na_reason: Optional[str] = None

class TestInstanceResponse(BaseModel):
    id: str
    report_id: str
    test_code: str
    instance_no: int
    applicability: str
    na_reason: Optional[str]
    header: Dict[str, Any]
    data: Dict[str, Any]
    results: Dict[str, Any]
    status: str
    verdict: str
    remarks: Optional[str]
    row_version: int

    class Config:
        from_attributes = True

class CalcPreviewRequest(BaseModel):
    test_code: str
    instrument: Dict[str, Any]
    test_payload: Dict[str, Any]

class CalcPreviewResponse(BaseModel):
    test_code: str
    status: str
    verdict: str
    results: Dict[str, Any]
    explanations: List[Dict[str, Any]]
    issues: List[Dict[str, Any]]

class ChecklistUpdate(BaseModel):
    item_key: str
    result: str # 'passed', 'failed', 'na'
    remarks: Optional[str] = None

class EquipmentCreate(BaseModel):
    name: str
    category: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_no: Optional[str] = None
    range_text: Optional[str] = None
    accuracy_text: Optional[str] = None
    resolution_text: Optional[str] = None
    cert_no: Optional[str] = None
    cal_date: Optional[date] = None
    cal_valid_until: Optional[date] = None
    traceability: Optional[str] = None

class EquipmentResponse(EquipmentCreate):
    id: str
    active: bool

    class Config:
        from_attributes = True

class ReportGenerateRequest(BaseModel):
    kind: str = "detailed" # 'detailed', 'summary'
    format: str = "pdf" # 'pdf', 'docx'
    watermark: Optional[str] = None

class GeneratedReportResponse(BaseModel):
    id: str
    report_id: str
    kind: str
    format: str
    gen_no: int
    file_path: str
    sha256: str
    data_hash: str
    stale: bool
    generated_at: datetime

    class Config:
        from_attributes = True

class DashboardKPIs(BaseModel):
    total_reports: int
    draft_count: int
    in_progress_count: int
    under_review_count: int
    finalised_count: int
    passed_count: int
    failed_count: int
    tests_pending_count: int

class PassFailMatrixRow(BaseModel):
    report_id: str
    application_no: str
    type_designation: str
    accuracy_class: str
    status: str
    overall_verdict: str
    cells: Dict[str, str] # test_code -> verdict ('passed', 'failed', 'incomplete', 'na')
