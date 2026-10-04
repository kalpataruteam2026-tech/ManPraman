/**
 * Verified repository rulebook manifest.
 * Derived directly from the genuine PDFs in /Instruments_tests_details and /OIML.
 * (Rule 4 & 5: No invented documents, no fabricated revisions).
 */
import type { RulebookDocument } from '../domain/types';
import rawDocs from './rulebookManifest.json';

export const RULEBOOK_DOCUMENTS: RulebookDocument[] = rawDocs as RulebookDocument[];

export interface AppliedRuleDetail {
  id: string;
  ruleTitle: string;
  sourceDocId: string;
  sourceDocTitle: string;
  clause: string;
  appliedBy: string;
  engineFormula: string;
  verified: boolean;
  status: 'Active' | 'Superseded' | 'Reference' | 'Draft';
  notes: string;
}

/**
 * Exactly WHICH rules are powering THIS APPLICATION's metrology & compliance engine.
 * (CHANGE #2 - B. APPLIED RULES)
 */
export const APPLIED_RULES_REGISTRY: AppliedRuleDetail[] = [
  {
    id: 'applied-r76-mpe',
    ruleTitle: 'MPE Tolerance Corridors (Class I, II, III, IIII)',
    sourceDocId: 'doc_oiml_r76_1_2006',
    sourceDocTitle: 'OIML R 76-1:2006 / LM General Rules 2011 7th Schedule',
    clause: 'OIML R 76-1 Clause 3.5 & Table 6; 7th Schedule Heading A Part I Table 1',
    appliedBy: 'Engine: mpe.ts -> evaluateMpeForLoad()',
    engineFormula: '±0.5e (0 to 500e), ±1.0e (500e to 2000e), ±1.5e (>2000e). In-service = 2×.',
    verified: true,
    status: 'Active',
    notes: 'Deterministic boundary evaluation based on applied standard load in verification scale intervals (m = L/e).',
  },
  {
    id: 'applied-r76-true-indication',
    ruleTitle: 'Calculation of True Indication prior to Rounding (P)',
    sourceDocId: 'doc_oiml_r76_1_2006',
    sourceDocTitle: 'OIML R 76-1:2006 Annex A.4.4.3 / OIML R 76-2 p. 10',
    clause: 'OIML R 76-1 Clause A.4.4.3',
    appliedBy: 'Engine: metrology.ts -> computeP()',
    engineFormula: 'P = I + 0.5d - ΔL',
    verified: true,
    status: 'Active',
    notes: 'Digital resolution quantization elimination using fractional test weights ΔL to find display switching threshold.',
  },
  {
    id: 'applied-r76-corrected-error',
    ruleTitle: 'Error of Indication (E) and Corrected Error (Ec)',
    sourceDocId: 'doc_oiml_r76_1_2006',
    sourceDocTitle: 'OIML R 76-1:2006 Annex A.4.4.3 / OIML R 76-2 p. 10',
    clause: 'OIML R 76-1 Clause A.4.4.3 & A.4.4.4',
    appliedBy: 'Engine: metrology.ts -> computeE() & computeEc()',
    engineFormula: 'E = P - L ; Ec = E - E0 (where E0 is calculated zero error)',
    verified: true,
    status: 'Active',
    notes: 'Ensures net measurement errors are isolated from baseline no-load zero shift.',
  },
  {
    id: 'applied-r76-eccentricity',
    ruleTitle: 'Eccentricity (Corner Load) Tolerance',
    sourceDocId: 'doc_oiml_r76_1_2006',
    sourceDocTitle: 'OIML R 76-1:2006 Clause 3.6.2 & A.4.7; R 76-2 p. 12',
    clause: 'OIML R 76-1 Clause 3.6.2',
    appliedBy: 'Engine: testRunners.ts -> runEccentricity()',
    engineFormula: '|Ec_pos| <= MPE for corner test load (typically 1/3 Max)',
    verified: true,
    status: 'Active',
    notes: 'Evaluates 4 corners and center against maximum permissible error envelope.',
  },
  {
    id: 'applied-r76-repeatability',
    ruleTitle: 'Repeatability Difference Limit (Emax - Emin)',
    sourceDocId: 'doc_oiml_r76_1_2006',
    sourceDocTitle: 'OIML R 76-1:2006 Clause 3.6.1 & A.4.10; R 76-2 p. 16',
    clause: 'OIML R 76-1 Clause 3.6.1',
    appliedBy: 'Engine: testRunners.ts -> runRepeatability()',
    engineFormula: 'Emax - Emin <= |MPE| for applied repeatability load (at ~0.5 Max and Max)',
    verified: true,
    status: 'Active',
    notes: 'Ensures consistency over consecutive load applications under identical conditions.',
  },
  {
    id: 'applied-india-2026-gsr568',
    ruleTitle: '2026 Standard Weight Substitution Tiers (0.2e and 0.3e)',
    sourceDocId: 'doc_gen_rules_4th_amendment_nawi_fees',
    sourceDocTitle: 'Legal Metrology (General) Fourth Amendment Rules, 2026 (G.S.R. 568(E))',
    clause: 'Seventh Schedule Heading-A Part II Para 9(2)(ii)',
    appliedBy: 'Engine: testRunners.ts -> Repeatability Advisory',
    engineFormula: 'If r <= 0.2e: Req Std Weights = 20% Max; If 0.2e < r <= 0.3e: 33.3% Max; Else 50% Max',
    verified: true,
    status: 'Active',
    notes: 'Official July 2026 gazette amendment reducing required transport tonnage of standard weights for high-capacity instruments.',
  },
];

export const ACTIVE_COMPLIANCE_BASIS = {
  oiml: {
    standard: 'OIML R 76-1 / R 76-2',
    edition: '2006 (Requirements) & 2007 (Report Format)',
    status: 'Active',
    verified: true,
    sourceFilename: 'Instrument_test_details.pdf & test_detailed_report_format.pdf',
  },
  indianStatute: {
    act: 'The Legal Metrology Act, 2009 (Act No. 1 of 2010)',
    rules: 'Legal Metrology (General) Rules, 2011 — Seventh Schedule (Heading A)',
    latestAmendmentApplied: 'Fourth Amendment Rules, 2026 (G.S.R. 568(E))',
    status: 'Active',
    verified: true,
    sourceFilename: 'Gen_Rules_4th_Amendment_NAWI_Fees_1783336378.pdf',
  },
  activeRulesetId: 'R76-IN-2026.1',
  engineVersion: '2.4.0',
};
