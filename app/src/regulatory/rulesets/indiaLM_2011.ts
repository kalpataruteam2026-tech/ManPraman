/**
 * India — Legal Metrology (General) Rules, 2011, Seventh Schedule (Heading A).
 *
 * India transposes OIML R 76 into statute; technical specs are "based on OIML
 * recommendations" (DoCA). This overlay therefore reuses the OIML R 76 MPE
 * structure but carries Indian statutory metadata and citations.
 *
 * verified=false: exact clause references (Seventh Schedule paragraphs) and any
 * amendment-specific thresholds (e.g. weight-substitution tiers) must be checked
 * against the official gazette notifications before production use.
 */
import type { Ruleset } from '../types';
import { oimlR76_2006 } from './oimlR76_2006';

export const indiaLM_2011: Ruleset = {
  ...oimlR76_2006,
  id: 'india-lm-genrules:2011',
  standard: 'LM (General) Rules — 7th Schedule (Heading A)',
  edition: '2011 (+ amendments)',
  jurisdiction: 'India',
  effectiveFrom: '2011-04-01',
  rulesetVersion: '1.0.0',
  source:
    'Legal Metrology Act 2009; Legal Metrology (General) Rules 2011, Seventh Schedule — transposing OIML R 76',
  verified: false,
  verifyNote:
    'MPE structure mirrors OIML R 76 (India transposes OIML). Seventh Schedule clause references and amendment thresholds (e.g. 2026 weight-substitution 0.2e/0.3e advisory) are [VERIFY] pending confirmation against the official gazette notifications supplied in /OIML.',
};
