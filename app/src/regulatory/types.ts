/**
 * Versioned regulatory layer (DESIGN_SPEC PART 20, 21, 49).
 *
 * Regulatory logic lives here as DATA + pure selectors, never scattered across
 * UI components. Each ruleset is immutable and dated; historical reports pin the
 * exact ruleset id they were generated under.
 */
import type { AccuracyClass, TestType, VerificationStage } from '../domain/types';

/** One MPE tier: applies while load-in-e ≤ maxInE (null = no upper bound). */
export interface MpeTier {
  maxInE: number | null;
  mpeInE: number; // 0.5 | 1.0 | 1.5
}

export interface ClassParamBand {
  eMinG: number; // grams
  eMaxG: number | null;
  minInE: number; // Min expressed in e
  nMin: number;
  nMax: number | null;
}

export interface TestSpec {
  testType: TestType;
  name: string;
  /** Modes/evaluation types this test is applicable to. */
  appliesToModes: ('field' | 'lab')[];
  /** Human-readable applicability note. */
  note: string;
  /** Whether the test is mandatory for a valid report in an applicable mode. */
  mandatory: boolean;
}

export interface Ruleset {
  id: string; // stable, e.g. "oiml-r76-1:2006"
  standard: string; // "OIML R 76-1"
  edition: string; // "2006"
  jurisdiction: string; // "International" | "India"
  effectiveFrom: string; // ISO date
  supersededFrom?: string;
  rulesetVersion: string; // internal semver of the data
  source: string; // citation / URL
  /** false => shown with a [VERIFY] badge in the UI. */
  verified: boolean;
  verifyNote?: string;

  stageMultiplier: Record<VerificationStage, number>;
  mpeByClass: Record<AccuracyClass, MpeTier[]>;
  classParams: Record<AccuracyClass, ClassParamBand[]>;

  /** Repeatability acceptance: limit = repeatabilityLimitFactor × |MPE(load)|. */
  repeatabilityLimitFactor: number;
  /** Discrimination added test load, in multiples of d. */
  discriminationLoadInD: number;

  tests: TestSpec[];
  reportTemplateVersion: string;
}
