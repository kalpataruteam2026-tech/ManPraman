/**
 * Python FastAPI Backend Integration Client
 * Provides typed methods to interact with the OIML R 76-2 Python calculation engine,
 * live MPE verification, and ReportLab / DOCX report generators.
 */

const API_BASE = '/api/backend';

export interface BackendHealth {
  status: string;
  app: string;
  standard: string;
  version: string;
}

export interface OimlApplication {
  id: string;
  application_no: string;
  type_designation: string;
  manufacturer: string;
  applicant: string;
  instrument_category: string;
  status: string;
  created_at: string;
}

export interface OimlReport {
  id: string;
  application_id: string;
  version: number;
  status: string;
  verdict: 'PASSED' | 'FAILED' | 'INCOMPLETE';
  engine_version: string;
  rulepack_id: string;
  application?: OimlApplication;
  instrument?: {
    accuracy_class: string;
    Max: number;
    Min: number;
    e: number;
    d: number;
    unit: string;
    n: number;
    manufacturer?: string;
    type_designation?: string;
  };
}

export interface EvaluationRow {
  test_no: string;
  test_name: string;
  result: 'PASSED' | 'FAILED' | 'INCOMPLETE' | 'NOT_APPLICABLE';
  key_result?: string;
  remarks?: string;
  page_ref?: string;
}

export async function checkBackendHealth(): Promise<BackendHealth | null> {
  try {
    const res = await fetch(`${API_BASE}/healthz`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/kpis`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load dashboard statistics from Python backend');
  return await res.json();
}

export async function getApplications(): Promise<OimlApplication[]> {
  const res = await fetch(`${API_BASE}/applications/`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load applications from Python backend');
  return await res.json();
}

export async function getReports(): Promise<OimlReport[]> {
  const res = await fetch(`${API_BASE}/reports/`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load reports from Python backend');
  return await res.json();
}

export async function getReportDetails(id: string) {
  const res = await fetch(`${API_BASE}/reports/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load report details from Python backend');
  return await res.json();
}

export async function generateOimlReportDocument(
  reportId: string,
  kind: 'detailed' | 'summary' = 'detailed',
  format: 'pdf' | 'docx' = 'pdf',
  payloadExtra?: { session_data?: any; instrument_data?: any; evidence?: any[] }
) {
  // Resolve evidence: strictly use what is passed, or match session ID from store.
  // Never attach unrelated or global evidence if none was attached to this session.
  let evidenceList: any[] = [];
  if (Array.isArray(payloadExtra?.evidence)) {
    evidenceList = payloadExtra.evidence;
  } else {
    try {
      const { useAppStore } = await import('../store/useAppStore');
      const allEv = useAppStore.getState().evidence || [];
      const sessId = payloadExtra?.session_data?.id || reportId;
      evidenceList = allEv.filter((e) => e.sessionId === sessId || e.sessionId === reportId);
    } catch {
      evidenceList = [];
    }
  }

  // Deduplicate and ensure clean evidence array
  const cleanEvidence: any[] = [];
  if (Array.isArray(evidenceList)) {
    const seen = new Set<string>();
    for (const item of evidenceList) {
      if (item && (item.id || item.fileName || item.dataUrl)) {
        const k = item.id || `${item.fileName}_${item.createdAt}`;
        if (!seen.has(k)) {
          seen.add(k);
          cleanEvidence.push(item);
        }
      }
    }
  }

  const finalPayload = {
    kind,
    format,
    ...payloadExtra,
    evidence: cleanEvidence,
  };

  const res = await fetch(`${API_BASE}/reports/${reportId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(finalPayload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate OIML R 76-2 document');
  }
  return await res.json();
}

export function getArtifactDownloadUrl(artifactId: string): string {
  return `${API_BASE}/artifacts/${artifactId}/download`;
}

export interface ModelInfoResponse {
  version: string;
  status: string;
  total_documents_ingested: number;
  indexed_text_segments: number;
  trained_algorithms: string[];
  normative_standards: string[];
}

export interface BoundaryPrediction {
  accuracy_class: string;
  load: number;
  e: number;
  load_in_e: number;
  stage: string;
  statutory_mpe: number;
  predicted_mpe: number;
  band: string;
  is_compliant: boolean;
  compliance_probability: number;
  margin: number;
  is_anomaly: boolean;
  statutory_reference: string;
}

export interface RuleSearchResult {
  score: number;
  source: string;
  filename: string;
  category: string;
  page: number;
  text_snippet: string;
}

export async function getModelInfo(): Promise<ModelInfoResponse> {
  const res = await fetch(`${API_BASE}/ml/model-info`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load model information');
  return await res.json();
}

export async function predictBoundary(params: {
  accuracy_class: string;
  load: number;
  e: number;
  stage?: string;
  observed_Ec?: number;
}): Promise<BoundaryPrediction> {
  const res = await fetch(`${API_BASE}/ml/predict-boundary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Boundary prediction failed');
  return await res.json();
}

export async function searchOimlRules(query: string): Promise<{ query: string; total_matches: number; results: RuleSearchResult[] }> {
  const res = await fetch(`${API_BASE}/ml/rules-search?query=${encodeURIComponent(query)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Rules search failed');
  return await res.json();
}

export interface CsvImportResponse {
  status: string;
  message: string;
  application_no: string;
  product_name: string;
  report_id: string;
  overall_verdict: 'PASSED' | 'FAILED';
  tests_evaluated: number;
  review_url: string;
  type_evaluation_url: string;
}

export function getCsvTemplateUrl(): string {
  return `${API_BASE}/csv/template`;
}

export async function importCsvSessionRaw(csvText: string): Promise<CsvImportResponse> {
  const res = await fetch(`${API_BASE}/csv/import-raw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv: csvText }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'CSV import failed' }));
    throw new Error(err.detail || 'CSV import failed');
  }
  return await res.json();
}

export async function importCsvFile(file: File): Promise<CsvImportResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/csv/import`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'CSV file import failed' }));
    throw new Error(err.detail || 'CSV file import failed');
  }
  return await res.json();
}

export async function clearAllSystemData(): Promise<any> {
  const res = await fetch(`${API_BASE}/csv/clear-all-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to clear system data');
  return await res.json();
}

export async function updateTestObservations(
  testId: string,
  payload: {
    data?: any;
    header?: any;
    config?: any;
    remarks?: string;
    applicability?: string;
  }
): Promise<any> {
  const res = await fetch(`${API_BASE}/tests/${testId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail?.message || err.detail || 'Failed to update test observations');
  }
  return await res.json();
}

export async function updateInstrumentData(
  reportId: string,
  instrumentData: Record<string, any>
): Promise<any> {
  const res = await fetch(`${API_BASE}/reports/${reportId}/instrument`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(instrumentData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail?.message || err.detail || 'Failed to update instrument parameters');
  }
  return await res.json();
}

// ----------------------------- Auth & Bootstrap API -----------------------------

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('metrocert_token') || sessionStorage.getItem('metrocert_token');
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('metrocert_token', token);
  } else {
    localStorage.removeItem('metrocert_token');
    sessionStorage.removeItem('metrocert_token');
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface AuthStatus {
  initialized: boolean;
  admin_exists: boolean;
  total_users: number;
}

export async function getAuthStatus(): Promise<AuthStatus> {
  try {
    const res = await fetch(`${API_BASE}/auth/status`, { cache: 'no-store' });
    if (!res.ok) return { initialized: false, admin_exists: false, total_users: 0 };
    return await res.json();
  } catch {
    return { initialized: false, admin_exists: false, total_users: 0 };
  }
}

export async function bootstrapAdminBackend(data: { name: string; email: string; password?: string }) {
  const res = await fetch(`${API_BASE}/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to initialize administrator');
  }
  const result = await res.json();
  if (result.access_token) {
    setAuthToken(result.access_token);
  }
  return result;
}

export async function loginBackend(email: string, password?: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Invalid email or password');
  }
  const result = await res.json();
  if (result.access_token) {
    setAuthToken(result.access_token);
  }
  return result;
}

export async function loginWithGoogleBackend(payload: {
  credential?: string;
  code?: string;
  access_token?: string;
  email?: string;
  name?: string;
  picture?: string;
}) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Google authentication failed');
  }
  const result = await res.json();
  if (result.access_token) {
    setAuthToken(result.access_token);
  }
  return result;
}

export async function registerBackend(payload: {
  email: string;
  password: string;
  full_name: string;
  role?: string;
}) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed');
  }
  const result = await res.json();
  if (result.access_token) {
    setAuthToken(result.access_token);
  }
  return result;
}

export async function requestPasswordReset(email: string) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to request password reset');
  }
  return await res.json();
}

export async function verifyResetCode(email: string, code: string) {
  const res = await fetch(`${API_BASE}/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Invalid or expired verification code');
  }
  return await res.json();
}

export async function confirmPasswordReset(email: string, code: string, newPassword: string) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, new_password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to reset password');
  }
  return await res.json();
}

// ----------------------------- Import Pipeline API -----------------------------


export interface SheetValidationSummary {
  sheet_name: string;
  model: string;
  total_rows: number;
  valid_rows: number;
  warning_count: number;
  error_count: number;
  warnings: string[];
  errors: string[];
  is_valid: boolean;
}

export interface ImportPreviewResponse {
  filename: string;
  format: string;
  total_sheets: number;
  sheets: SheetValidationSummary[];
  overall_valid: boolean;
}

export async function previewImport(file: File): Promise<ImportPreviewResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/import/preview`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to parse import preview');
  }
  return await res.json();
}

export interface ProcessedSheetResult {
  sheet_name: string;
  model: string;
  status: 'SUCCESS' | 'FAILED_VALIDATION' | 'ERROR';
  session_id?: string;
  application_no?: string;
  verdict?: string;
  error_message?: string;
}

export interface ImportProcessResponse {
  batch_id: string;
  filename: string;
  total_sheets: number;
  successful_sessions: number;
  failed_sheets: number;
  results: ProcessedSheetResult[];
}

export async function processImport(file: File, selectedSheets?: string[]): Promise<ImportProcessResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (selectedSheets && selectedSheets.length > 0) {
    formData.append('selected_sheets', JSON.stringify(selectedSheets));
  }

  const res = await fetch(`${API_BASE}/import/process`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Batch import processing failed');
  }
  return await res.json();
}

// ----------------------------- Review Workflow API -----------------------------

export async function submitReportBackend(reportId: string) {
  const res = await fetch(`${API_BASE}/reports/${reportId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit report for review');
  }
  return await res.json();
}

export async function approveReportBackend(reportId: string, notes?: string) {
  const res = await fetch(`${API_BASE}/reports/${reportId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ reviewer_notes: notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to approve report');
  }
  return await res.json();
}

export async function returnReportBackend(reportId: string, reason: string) {
  const res = await fetch(`${API_BASE}/reports/${reportId}/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to return report for correction');
  }
  return await res.json();
}

