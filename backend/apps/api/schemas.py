"""
MetroCert Pydantic Request & Response Schemas
Enforces strictly 3 roles: 'admin', 'technician', 'reviewer'
"""
from typing import List, Dict, Any, Optional, Literal
from datetime import date, datetime
from pydantic import BaseModel, Field

RoleType = Literal["admin", "tester", "reviewer", "technician"]

class BootstrapRequest(BaseModel):
    full_name: str
    email: str
    password: str

class BootstrapResponse(BaseModel):
    message: str
    user: Dict[str, Any]
    access_token: str
    token_type: str = "bearer"

class AuthStatusResponse(BaseModel):
    initialized: bool
    admin_exists: bool
    total_users: int

class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str

class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    code: Optional[str] = None
    access_token: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyResetCodeRequest(BaseModel):
    email: str
    code: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: RoleType = "tester"

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[RoleType] = None
    password: Optional[str] = None
    status: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

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

class ReviewReturnRequest(BaseModel):
    reason: str

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
    session_data: Optional[Dict[str, Any]] = None
    instrument_data: Optional[Dict[str, Any]] = None
    evidence: Optional[List[Dict[str, Any]]] = None

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
    # Role-specific counts
    total_users: Optional[int] = 0
    technicians_count: Optional[int] = 0
    testers_count: Optional[int] = 0
    reviewers_count: Optional[int] = 0
    returned_count: Optional[int] = 0

class PassFailMatrixRow(BaseModel):
    report_id: str
    application_no: str
    type_designation: str
    accuracy_class: str
    status: str
    overall_verdict: str
    cells: Dict[str, str] # test_code -> verdict ('passed', 'failed', 'incomplete', 'na')

# Single and Batch Import Schemas
class SheetValidationSummary(BaseModel):
    sheet_name: str
    model_name: str
    total_rows: int
    valid_rows: int
    warnings: List[str]
    errors: List[str]
    status: Literal["valid", "warning", "error"]

class ImportPreviewResponse(BaseModel):
    filename: str
    file_type: str
    total_sheets: int
    sheets: List[SheetValidationSummary]

class ProcessedSessionResult(BaseModel):
    sheet_name: str
    model_name: str
    status: Literal["success", "failed"]
    session_id: Optional[str] = None
    report_id: Optional[str] = None
    error: Optional[str] = None

class ImportProcessResponse(BaseModel):
    batch_id: str
    filename: str
    total_processed: int
    success_count: int
    failure_count: int
    results: List[ProcessedSessionResult]
