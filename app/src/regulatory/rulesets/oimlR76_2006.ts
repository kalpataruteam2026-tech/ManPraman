/**
 * OIML R 76-1 (Edition 2006) ruleset — International.
 *
 * MPE tiers (initial verification / type evaluation) VERIFIED against the
 * well-established OIML R 76-1 structure; in-service = 2× via stageMultiplier.
 * Source: https://www.oiml.org/en/files/pdf_r/r076-1-e92.pdf (R 76-1).
 *
 * Class parameter bands and discrimination/repeatability specifics are tagged
 * verified=false until re-checked line-by-line against R 76-1:2006 Table 1 &
 * Annex A (DESIGN_SPEC PART 2).
 */
import type { Ruleset } from '../types';

export const oimlR76_2006: Ruleset = {
  id: 'oiml-r76-1:2006',
  standard: 'OIML R 76-1',
  edition: '2006',
  jurisdiction: 'International',
  effectiveFrom: '2006-01-01',
  rulesetVersion: '1.0.0',
  source: 'OIML R 76-1 (Non-automatic weighing instruments) — oiml.org',
  verified: true,
  verifyNote:
    'MPE tiers and in-service ×2 rule verified against OIML R 76-1 structure. Class-parameter bands and discrimination load flagged for line-by-line re-check against R 76-1:2006 Table 1 / Annex A.',

  stageMultiplier: { initial: 1, inservice: 2 },

  // MPE at initial verification, by load m = L/e. Upper bounds inclusive.
  mpeByClass: {
    I: [
      { maxInE: 50000, mpeInE: 0.5 },
      { maxInE: 200000, mpeInE: 1.0 },
      { maxInE: null, mpeInE: 1.5 },
    ],
    II: [
      { maxInE: 5000, mpeInE: 0.5 },
      { maxInE: 20000, mpeInE: 1.0 },
      { maxInE: null, mpeInE: 1.5 },
    ],
    III: [
      { maxInE: 500, mpeInE: 0.5 },
      { maxInE: 2000, mpeInE: 1.0 },
      { maxInE: null, mpeInE: 1.5 },
    ],
    IIII: [
      { maxInE: 50, mpeInE: 0.5 },
      { maxInE: 200, mpeInE: 1.0 },
      { maxInE: null, mpeInE: 1.5 },
    ],
  },

  // Classification bands (OIML R 76-1 Table 1) — [VERIFY]
  classParams: {
    I: [{ eMinG: 0.001, eMaxG: null, minInE: 100, nMin: 50000, nMax: null }],
    II: [
      { eMinG: 0.001, eMaxG: 0.05, minInE: 20, nMin: 5000, nMax: 100000 },
      { eMinG: 0.1, eMaxG: null, minInE: 50, nMin: 5000, nMax: 100000 },
    ],
    III: [
      { eMinG: 0.1, eMaxG: 2, minInE: 20, nMin: 500, nMax: 10000 },
      { eMinG: 5, eMaxG: null, minInE: 20, nMin: 500, nMax: 10000 },
    ],
    IIII: [{ eMinG: 5, eMaxG: null, minInE: 10, nMin: 100, nMax: 1000 }],
  },

  repeatabilityLimitFactor: 1.0, // range ≤ |MPE(load)| [VERIFY exact wording]
  discriminationLoadInD: 1.4,

  tests: [
    {
      testType: 'zero',
      name: 'Zero-setting & zero indication',
      appliesToModes: ['field', 'lab'],
      note: 'Establishes the zero error E0 used to correct all subsequent readings.',
      mandatory: true,
    },
    {
      testType: 'weighing',
      name: 'Weighing performance (increasing & decreasing)',
      appliesToModes: ['field', 'lab'],
      note: 'Error of indication across the range against load-dependent MPE.',
      mandatory: true,
    },
    {
      testType: 'repeatability',
      name: 'Repeatability',
      appliesToModes: ['field', 'lab'],
      note: 'Consistency of repeated weighings of the same load.',
      mandatory: true,
    },
    {
      testType: 'eccentricity',
      name: 'Eccentricity (off-centre loading)',
      appliesToModes: ['field', 'lab'],
      note: 'Error when load is applied away from the centre of the receptor.',
      mandatory: true,
    },
    {
      testType: 'tare',
      name: 'Tare device',
      appliesToModes: ['field', 'lab'],
      note: 'Applicable only when the instrument has a tare device.',
      mandatory: false,
    },
    {
      testType: 'discrimination',
      name: 'Discrimination',
      appliesToModes: ['lab'],
      note: 'Sensitivity to a small additional load — primarily a type-evaluation test.',
      mandatory: false,
    },
    {
      testType: 'temperature',
      name: 'Temperature influence',
      appliesToModes: ['lab'],
      note: 'Influence-factor test performed only during laboratory pattern evaluation.',
      mandatory: false,
    },
  ],

  reportTemplateVersion: 'report-template/1.0.0',
};
