/**
 * Core domain model for MetroCert.
 * Structured/relational shapes (DESIGN_SPEC PART 12) — never one giant JSON blob.
 */
import type { MassUnit } from './units';

// ----------------------------- Users & RBAC -----------------------------
export type Role = 'admin' | 'technician' | 'tester' | 'reviewer';

export interface User {
  id: string;
  name: string;
  role: Role;
  jurisdiction?: string;
  designation?: string;
  email?: string;
  password?: string;
  active?: boolean;
  avatarUrl?: string;
  uid?: string;
}

// ------------------------ Regulatory / evaluation ------------------------
/** OIML accuracy classes. IIII == class 4 (displayed "IIII (IV)"). */
export type AccuracyClass = 'I' | 'II' | 'III' | 'IIII';

/** Verification stage drives the MPE multiplier (in-service = 2× initial). */
export type VerificationStage = 'initial' | 'inservice';

/** Mode A (field) vs Mode B (laboratory / pattern evaluation). */
export type EvaluationMode = 'field' | 'lab';

export type EvaluationType =
  | 'model_approval'
  | 'initial_verification'
  | 'inservice_verification';

export type IntervalConfig = 'single' | 'multi_interval' | 'multiple_range';

export interface RangeSpec {
  max: number;
  e: number;
  min?: number;
}

// ------------------------------ Instrument ------------------------------
export type TareType = 'none' | 'additive' | 'subtractive';

export interface Instrument {
  id: string;
  manufacturer: string;
  model: string;
  serial: string;
  instrumentType: string; // e.g. "Electronic platform NAWI"
  accuracyClass: AccuracyClass;
  unit: MassUnit;
  max: number;
  min: number;
  e: number; // verification scale interval
  d: number; // actual scale interval (display resolution)
  intervalConfig: IntervalConfig;
  ranges?: RangeSpec[]; // for multi-interval / multiple-range
  tareType: TareType;
  tareMax?: number;
  zeroSetting: boolean;
  zeroTracking: boolean;
  displayType?: string;
  printingDevice?: boolean;
  softwareId?: string;
  softwareVersion?: string;
  softwareHash?: string;
  firmware?: string;
  loadCellInfo?: string;
  loadCellCertNo?: string;
  indicatorInfo?: string;
  moduleInfo?: string;
  certRefs?: string;
  power?: string;
  modelApprovalNo?: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
}

/** n = Max / e (number of verification scale intervals). */
export function verificationIntervals(inst: Pick<Instrument, 'max' | 'e'>): number {
  return inst.e > 0 ? Math.round(inst.max / inst.e) : 0;
}

// ------------------------- Reference standards --------------------------
export type WeightClass = 'E1' | 'E2' | 'F1' | 'F2' | 'M1' | 'M2' | 'M3';

export interface ReferenceStandard {
  id: string;
  weightId: string;
  certNo: string;
  weightClass: WeightClass;
  nominal: number;
  unit: MassUnit;
  calibrationStatus: 'valid' | 'expired' | 'unknown';
  calibrationExpiry?: string;
  uncertainty?: number;
  traceability?: string;
}

// ------------------------------ Environment -----------------------------
export interface Environment {
  temperature?: number; // °C
  humidity?: number; // %RH
  pressure?: number; // kPa
  voltage?: number; // V
  frequency?: number; // Hz
}

// ------------------------------- Tests ----------------------------------
export type TestType =
  | 'zero'
  | 'weighing'
  | 'repeatability'
  | 'eccentricity'
  | 'discrimination'
  | 'tare'
  | 'temperature';

export type ComplianceStatus = 'PASS' | 'FAIL' | 'NA' | 'PENDING';

/** Full, replayable calculation trace stored with every computed value. */
export interface CalcTrace {
  formulaId: string;
  formulaVersion: string;
  inputs: Record<string, number | string>;
  intermediates: Record<string, number>;
  result: number;
  expression: string; // human-readable
  timestamp: string;
  engineVersion: string;
}

export interface MpeSelection {
  loadInE: number; // m = L / e
  band: string; // e.g. "500 < m ≤ 2000"
  mpeInE: number; // 0.5 | 1.0 | 1.5 (× stage multiplier)
  mpe: number; // absolute, in instrument unit
  stageMultiplier: number;
  ruleRef: string;
  ruleVersion: string;
}

export interface ComplianceResult {
  status: ComplianceStatus;
  observedError: number; // Ec (or E for zero)
  allowedMpe: number; // absolute ±
  margin: number; // mpe - |error| (>=0 => pass margin)
  excess: number; // |error| - mpe (>0 => fail excess)
  reason: string;
  explanation: string[];
}

/** A single weighing/eccentricity/etc. test point with its full evaluation. */
export interface TestPointResult {
  id: string;
  label: string; // e.g. "Increasing · 150 kg" / "Corner 2"
  load: number; // applied standard load L
  indication: number; // I
  additionalLoad: number; // ΔL
  roundingInterval: number; // basis used (d in verification; d=e normally)
  P: number; // indication prior to rounding
  E: number; // error
  Ec: number; // corrected error
  direction?: 'up' | 'down';
  mpe?: MpeSelection;
  compliance: ComplianceResult;
  traces: CalcTrace[];
}

export interface RepeatabilityResult {
  load: number;
  runs: number[]; // each P (prior to rounding)
  mean: number;
  range: number; // max - min
  limit: number; // acceptance limit
  substitutionTier?: string; // advisory (India 2026 amendment) [VERIFY]
  compliance: ComplianceStatus;
  explanation: string[];
}

export interface DiscriminationResult {
  load: number;
  additionalLoad: number; // ~1.4 d
  advancedByOne: boolean;
  compliance: ComplianceStatus;
  explanation: string[];
}

export interface TestResult {
  testType: TestType;
  name: string;
  applicable: boolean;
  applicabilityReason: string;
  clause?: string;
  status: ComplianceStatus;
  points?: TestPointResult[];
  repeatability?: RepeatabilityResult;
  discrimination?: DiscriminationResult;
  zeroError?: number; // E0 captured from zero test (for correction)
  notes?: string;
  completedAt?: string;
}

// --------------------------- Test session -------------------------------
export type SessionStatus =
  | 'draft'
  | 'in_progress'
  | 'awaiting_review'
  | 'ready_for_review'
  | 'under_review'
  | 'returned_for_correction'
  | 'approved'
  | 'rejected'
  | 'reported';

export interface ReviewHistoryEntry {
  id: string;
  reviewerId: string;
  reviewerName: string;
  action: 'approved' | 'rejected' | 'returned_for_correction';
  comment?: string;
  timestamp: string;
}

export interface TestSession {
  id: string;
  code: string; // e.g. LM-2026-00142
  instrumentId: string;
  mode: EvaluationMode;
  evaluationType: EvaluationType;
  stage: VerificationStage;
  rulesetId: string; // pinned regulatory version
  indiaOverlayId?: string;
  technicianId: string;
  technicianName: string;
  reviewerId?: string;
  reviewerName?: string;
  applicant?: string;
  testLocation?: string;
  jurisdiction?: string;
  laboratory?: string;
  accreditationNo?: string;
  environment: Environment;
  referenceStandards: ReferenceStandard[];
  results: Partial<Record<TestType, TestResult>>;
  evidence?: Evidence[];
  overallVerdict: ComplianceStatus;
  status: SessionStatus;
  reviewNotes?: string;
  reviewHistory?: ReviewHistoryEntry[];
  geo?: { lat: number; lng: number };
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

// ------------------------------ Evidence --------------------------------
export type EvidenceKind =
  | 'instrument'
  | 'nameplate'
  | 'seal'
  | 'display'
  | 'test_setup'
  | 'weights'
  | 'certificate'
  | 'other';

export interface Evidence {
  id: string; // unique evidence_id
  sessionId: string; // evaluation_id
  testId?: string; // test_id e.g. 'weighing', 'eccentricity', 'zero'
  requirementId?: string; // requirement_id e.g. 'Clause 3.3', 'Clause 7.1'
  kind: EvidenceKind; // evidence_type
  caption: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  dataUrl?: string; // base64 data URL for images/documents
  storagePath?: string; // Supabase Storage path
  storageUrl?: string; // Supabase Storage public/signed URL
  sha256?: string; // SHA-256 hash of the original image
  orderIndex?: number; // Order index for drag-to-reorder
  createdAt: string;
  notes?: string;
  ocrExtracted?: Record<string, string>;
}

// ------------------------------- Audit ----------------------------------
export interface AuditEvent {
  id: string;
  ts: string;
  sessionId?: string;
  reportId?: string;
  userId: string;
  userName: string;
  action: string;
  detail?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

// ------------------------------- Reports --------------------------------
export interface Report {
  id: string;
  code: string;
  sessionId: string;
  type: 'field' | 'lab';
  version: number;
  status: 'valid' | 'revoked';
  verificationId: string;
  integrityHash: string;
  rulesetVersion: string;
  engineVersion: string;
  templateVersion: string;
  appVersion: string;
  createdAt: string;
  createdBy: string;
  overallVerdict: ComplianceStatus;
  snapshot: ReportSnapshot; // immutable copy
}

/** Immutable snapshot ensures historical reproducibility (DESIGN_SPEC PART 47). */
export interface ReportSnapshot {
  session: TestSession;
  instrument: Instrument;
  evidence?: Evidence[];
  generatedAt: string;
  standard: string;
  standardEdition: string;
  jurisdiction: string;
}

// --------------------------- Model Templates ----------------------------
export interface InstrumentTemplate {
  id: string;
  manufacturer: string;
  model: string;
  serial?: string;
  instrumentType: string;
  accuracyClass: AccuracyClass;
  unit: MassUnit;
  max: number;
  min: number;
  e: number;
  d: number;
  n?: number;
  intervalConfig: IntervalConfig;
  ranges?: RangeSpec[];
  tareType: TareType;
  tareMax?: number;
  zeroSetting: boolean;
  zeroTracking: boolean;
  displayType?: string;
  printingDevice?: boolean;
  softwareVersion?: string;
  firmware?: string;
  loadCellInfo?: string;
  loadCellCertNo?: string;
  indicatorInfo?: string;
  power?: string;
  modelApprovalNo?: string;
  description?: string;
  sourceDoc?: string;
  createdAt?: string;
}

// --------------------------- Rulebook Documents -------------------------
export interface RulebookDocument {
  id: string;
  title: string;
  category: string;
  issuingOrg: string;
  year: string;
  filename: string;
  path: string;
  description: string;
  status: string;
  fileSizeBytes: number;
}
