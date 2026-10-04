/**
 * DEMONSTRATION DATA (DESIGN_SPEC PART 42, 43). Clearly labelled as demo.
 * All results are produced by the real engine — including one deliberate FAIL
 * on the DWT-300 so the compliance engine visibly does its job.
 */
import type {
  Evidence,
  Instrument,
  ReferenceStandard,
  Report,
  TestSession,
  User,
} from '../domain/types';

import { DEFAULT_RULESET_ID } from '../regulatory/registry';
import {
  computeOverallVerdict,
  runEccentricity,
  runRepeatability,
  runWeighing,
  runZero,
} from '../engine/testRunners';
import { buildReport } from '../report/reportModel';

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

export const DEMO_USERS: User[] = [
  { id: 'u_admin', name: 'R. Nair', role: 'admin', designation: 'System Administrator', jurisdiction: 'Central' },
  { id: 'u_tech', name: 'S. Kulkarni', role: 'technician', designation: 'Metrology Tester', jurisdiction: 'RRSL Mumbai' },
  { id: 'u_rev', name: 'Dr. A. Menon', role: 'reviewer', designation: 'Senior Metrology Reviewer', jurisdiction: 'RRSL Mumbai' },
];

export const DWT300: Instrument = {
  id: 'inst_dwt300',
  manufacturer: 'Demo Weighing Technologies',
  model: 'DWT-300',
  serial: 'DWT300-24-00817',
  instrumentType: 'Electronic platform NAWI',
  accuracyClass: 'III',
  unit: 'kg',
  max: 300,
  min: 20,
  e: 0.1,
  d: 0.1,
  intervalConfig: 'single',
  tareType: 'additive',
  tareMax: 300,
  zeroSetting: true,
  zeroTracking: true,
  displayType: 'Backlit LCD, 6 digits',
  printingDevice: true,
  softwareId: 'DWT-FW',
  softwareVersion: '2.4.1',
  softwareHash: 'a91f…demo',
  firmware: 'v2.4.1',
  loadCellInfo: 'Demo LC 500 kg, R60 Class C3',
  loadCellCertNo: 'R60/DEMO/2023/114',
  indicatorInfo: 'DWT-IND-300',
  power: 'Mains 230 V / rechargeable battery',
  modelApprovalNo: 'MODEL/DEMO/III/2024/DWT300',
  notes: 'DEMONSTRATION DATA — not a real approved model.',
  isDemo: true,
  createdAt: iso(40),
};

export const LBX220: Instrument = {
  id: 'inst_lbx220',
  manufacturer: 'Demo Precision Instruments',
  model: 'LBX-60',
  serial: 'LBX60-24-00042',
  instrumentType: 'Electronic laboratory balance NAWI',
  accuracyClass: 'II',
  unit: 'g',
  max: 60,
  min: 0.02,
  e: 0.001,
  d: 0.001,
  intervalConfig: 'single',
  tareType: 'subtractive',
  tareMax: 60,
  zeroSetting: true,
  zeroTracking: true,
  displayType: 'VFD, 7 digits',
  printingDevice: false,
  softwareVersion: '1.2.0',
  power: 'Mains 230 V',
  notes: 'DEMONSTRATION DATA',
  isDemo: true,
  createdAt: iso(20),
};

const WEIGHT_BOX_M1: ReferenceStandard = {
  id: 'ref_m1_box',
  weightId: 'WB-M1-2024-07',
  certNo: 'NPL/CAL/2024/9921',
  weightClass: 'M1',
  nominal: 300,
  unit: 'kg',
  calibrationStatus: 'valid',
  calibrationExpiry: iso(-320),
  uncertainty: 0.005,
  traceability: 'Traceable to NPL India national standard (DEMO).',
};

const WEIGHT_BOX_F1: ReferenceStandard = {
  id: 'ref_f1_box',
  weightId: 'WB-F1-2024-03',
  certNo: 'NPL/CAL/2024/8850',
  weightClass: 'F1',
  nominal: 60,
  unit: 'g',
  calibrationStatus: 'valid',
  calibrationExpiry: iso(-280),
  uncertainty: 0.00002,
  traceability: 'Traceable to NPL India national standard (DEMO).',
};

function baseSession(over: Partial<TestSession>): TestSession {
  return {
    id: 'sess_' + Math.random().toString(36).slice(2, 9),
    code: 'LM-2026-00000',
    instrumentId: DWT300.id,
    mode: 'field',
    evaluationType: 'initial_verification',
    stage: 'initial',
    rulesetId: DEFAULT_RULESET_ID,
    indiaOverlayId: 'india-lm-genrules:2011',
    technicianId: 'u_tech',
    technicianName: 'S. Kulkarni',
    applicant: 'Demo Traders Pvt. Ltd.',
    testLocation: 'RRSL Mumbai — Bay 3',
    jurisdiction: 'RRSL Mumbai',
    laboratory: 'Regional Reference Standard Laboratory, Mumbai',
    accreditationNo: 'GATC/DEMO/2024/017',
    environment: { temperature: 24.6, humidity: 52, pressure: 101.1, voltage: 230, frequency: 50 },
    referenceStandards: [WEIGHT_BOX_M1],
    results: {},
    overallVerdict: 'PENDING',
    status: 'draft',
    createdAt: iso(2),
    updatedAt: iso(1),
    isDemo: true,
    ...over,
  };
}

/** DWT-300 session containing the deliberate FAIL at 100 kg (Ec = +0.18 kg). */
function buildFailingSession(): TestSession {
  const s = baseSession({
    id: 'sess_demo_fail',
    code: 'LM-2026-00142',
    reviewerId: 'u_rev',
    reviewerName: 'Dr. A. Menon',
    status: 'awaiting_review',
  });

  const zero = runZero(s, DWT300, { i0: 0.0, deltaL0: 0.05 }); // E0 = 0
  const e0 = zero.zeroError ?? 0;

  const weighing = runWeighing(
    s,
    DWT300,
    [
      { load: 20, indication: 20.0, additionalLoad: 0.04, direction: 'up' }, // E +0.01
      { load: 50, indication: 50.0, additionalLoad: 0.03, direction: 'up' }, // E +0.02
      { load: 100, indication: 100.2, additionalLoad: 0.07, direction: 'up' }, // E +0.18 => FAIL (MPE 0.10)
      { load: 150, indication: 150.0, additionalLoad: 0.06, direction: 'up' }, // E -0.01
      { load: 250, indication: 250.1, additionalLoad: 0.08, direction: 'up' }, // E +0.07
      { load: 300, indication: 300.1, additionalLoad: 0.06, direction: 'up' }, // E +0.09
      { load: 150, indication: 150.0, additionalLoad: 0.05, direction: 'down' }, // E 0.00
      { load: 50, indication: 50.0, additionalLoad: 0.04, direction: 'down' }, // E +0.01
    ],
    e0,
  );

  const repeat = runRepeatability(
    s,
    DWT300,
    {
      load: 150,
      runs: [
        { indication: 150.0, additionalLoad: 0.03 }, // P 150.02
        { indication: 150.0, additionalLoad: 0.04 }, // P 150.01
        { indication: 150.0, additionalLoad: 0.02 }, // P 150.03
      ],
    },
    e0,
  );

  const ecc = runEccentricity(
    s,
    DWT300,
    {
      load: 100,
      positions: [
        { label: 'Centre', indication: 100.0, additionalLoad: 0.04 },
        { label: 'Corner 1', indication: 100.0, additionalLoad: 0.02 },
        { label: 'Corner 2', indication: 100.0, additionalLoad: 0.06 },
        { label: 'Corner 3', indication: 100.1, additionalLoad: 0.09 },
        { label: 'Corner 4', indication: 100.0, additionalLoad: 0.01 },
      ],
    },
    e0,
  );

  s.results = { zero, weighing, repeatability: repeat, eccentricity: ecc };
  s.overallVerdict = computeOverallVerdict(Object.values(s.results));
  return s;
}

/** DWT-300 fully-passing session (older, approved & reported). */
function buildPassingSession(): TestSession {
  const s = baseSession({
    id: 'sess_demo_pass',
    code: 'LM-2026-00120',
    reviewerId: 'u_rev',
    reviewerName: 'Dr. A. Menon',
    status: 'approved',
    createdAt: iso(9),
    updatedAt: iso(8),
  });

  const zero = runZero(s, DWT300, { i0: 0.0, deltaL0: 0.05 });
  const e0 = zero.zeroError ?? 0;
  const weighing = runWeighing(
    s,
    DWT300,
    [
      { load: 20, indication: 20.0, additionalLoad: 0.04, direction: 'up' },
      { load: 50, indication: 50.0, additionalLoad: 0.04, direction: 'up' },
      { load: 100, indication: 100.0, additionalLoad: 0.05, direction: 'up' },
      { load: 150, indication: 150.0, additionalLoad: 0.06, direction: 'up' },
      { load: 250, indication: 250.0, additionalLoad: 0.05, direction: 'up' },
      { load: 300, indication: 300.0, additionalLoad: 0.05, direction: 'up' },
      { load: 150, indication: 150.0, additionalLoad: 0.05, direction: 'down' },
      { load: 50, indication: 50.0, additionalLoad: 0.05, direction: 'down' },
    ],
    e0,
  );
  const repeat = runRepeatability(
    s,
    DWT300,
    {
      load: 150,
      runs: [
        { indication: 150.0, additionalLoad: 0.05 },
        { indication: 150.0, additionalLoad: 0.04 },
        { indication: 150.0, additionalLoad: 0.05 },
      ],
    },
    e0,
  );
  const ecc = runEccentricity(
    s,
    DWT300,
    {
      load: 100,
      positions: [
        { label: 'Centre', indication: 100.0, additionalLoad: 0.05 },
        { label: 'Corner 1', indication: 100.0, additionalLoad: 0.04 },
        { label: 'Corner 2', indication: 100.0, additionalLoad: 0.05 },
        { label: 'Corner 3', indication: 100.0, additionalLoad: 0.06 },
        { label: 'Corner 4', indication: 100.0, additionalLoad: 0.04 },
      ],
    },
    e0,
  );
  s.results = { zero, weighing, repeatability: repeat, eccentricity: ecc };
  s.overallVerdict = computeOverallVerdict(Object.values(s.results));
  return s;
}

/** A laboratory (Mode B) session in progress on the LBX-60 balance. */
function buildLabDraft(): TestSession {
  const s = baseSession({
    id: 'sess_demo_lab',
    code: 'LAB-2026-00031',
    instrumentId: LBX220.id,
    mode: 'lab',
    evaluationType: 'model_approval',
    stage: 'initial',
    referenceStandards: [WEIGHT_BOX_F1],
    status: 'in_progress',
    createdAt: iso(3),
    updatedAt: iso(0),
    testLocation: 'NPL — Mass Metrology Lab',
    laboratory: 'National Physical Laboratory',
  });
  const zero = runZero(s, LBX220, { i0: 0.0, deltaL0: 0.0005 });
  s.results = { zero };
  s.overallVerdict = 'PENDING';
  return s;
}

import { DEFAULT_SAMPLE_EVIDENCES } from './sampleEvidenceImages';

export interface SeedData {
  users: User[];
  instruments: Instrument[];
  sessions: TestSession[];
  reports: Report[];
  evidence?: any[];
}

export async function seedDemoData(): Promise<SeedData> {
  const failing = buildFailingSession();
  const passing = buildPassingSession();
  const lab = buildLabDraft();

  const reviewer = DEMO_USERS.find((u) => u.id === 'u_rev')!;
  
  // Attach default photographic evidence to demo passing session
  const demoEvidences: Evidence[] = DEFAULT_SAMPLE_EVIDENCES.map(ev => ({
    ...ev,
    sessionId: passing.id,
  }));
  passing.evidence = demoEvidences;

  const report = await buildReport(passing, DWT300, 'field', reviewer, 1, demoEvidences);
  passing.status = 'reported';


  return {
    users: DEMO_USERS,
    instruments: [DWT300, LBX220],
    sessions: [failing, passing, lab],
    reports: [report],
    evidence: demoEvidences,
  };
}

