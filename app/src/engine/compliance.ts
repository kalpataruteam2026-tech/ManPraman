/**
 * Compliance evaluator (DESIGN_SPEC PART 8, 18).
 *
 * Turns a computed error + selected MPE into an explainable PASS/FAIL. Every
 * verdict carries the math, the margin/excess and the cited rule — never a bare
 * "PASS". Boundary equality counts as PASS (compared with a tiny relative eps).
 */
import type {
  ComplianceResult,
  ComplianceStatus,
  MpeSelection,
} from '../domain/types';
import type { MassUnit } from '../domain/units';
import { round, signed } from '../domain/units';

export interface EvalContext {
  testName: string;
  load: number;
  unit: MassUnit;
  precision: number;
  e: number;
  errorLabel?: string; // "corrected error" | "error"
}

export function evaluateAgainstMpe(
  error: number,
  mpe: MpeSelection,
  ctx: EvalContext,
): ComplianceResult {
  const { unit, precision, e } = ctx;
  const errLabel = ctx.errorLabel ?? 'corrected error';
  const abs = Math.abs(error);
  const eps = e * 1e-9; // relative tolerance to absorb FP artefacts
  const pass = abs <= mpe.mpe + eps;

  const margin = round(mpe.mpe - abs, precision);
  const excess = round(abs - mpe.mpe, precision);

  const explanation = [
    `Observed ${errLabel}: ${signed(error, precision)} ${unit}`,
    `Permissible error (MPE): ±${round(mpe.mpe, precision)} ${unit}  (${mpe.mpeInE} e)`,
    pass
      ? `Remaining margin: ${round(Math.max(margin, 0), precision)} ${unit}`
      : `Exceeds MPE by: ${round(Math.max(excess, 0), precision)} ${unit}`,
    `Load band: ${mpe.band}  (m = L/e = ${mpe.loadInE})`,
    `Applicable rule: ${mpe.ruleRef} (ruleset v${mpe.ruleVersion})`,
  ];

  return {
    status: pass ? 'PASS' : 'FAIL',
    observedError: error,
    allowedMpe: mpe.mpe,
    margin,
    excess,
    reason: pass
      ? `${errLabel[0].toUpperCase()}${errLabel.slice(1)} is within the applicable MPE.`
      : `${errLabel[0].toUpperCase()}${errLabel.slice(1)} exceeds the applicable MPE by ${round(Math.max(excess, 0), precision)} ${unit}.`,
    explanation,
  };
}

/**
 * Repeatability: the range of results shall not exceed the acceptance limit
 * (limit = factor × |MPE(load)|). [VERIFY exact R 76 wording per class.]
 */
export function evaluateRepeatability(
  range: number,
  limit: number,
  unit: MassUnit,
  precision: number,
): { status: ComplianceStatus; explanation: string[] } {
  const eps = Math.max(limit, 1) * 1e-9;
  const pass = range <= limit + eps;
  return {
    status: pass ? 'PASS' : 'FAIL',
    explanation: [
      `Range of runs (max − min): ${round(range, precision)} ${unit}`,
      `Acceptance limit: ${round(limit, precision)} ${unit}`,
      pass
        ? `Margin: ${round(limit - range, precision)} ${unit}`
        : `Exceeds limit by: ${round(range - limit, precision)} ${unit}`,
    ],
  };
}

/**
 * India LM (General) 4th Amendment 2026 weight-substitution advisory. [VERIFY]
 * Advisory only — informs the officer of the reduced standard-weight fraction
 * permitted based on repeatability; it does NOT decide metrological pass/fail.
 */
export function substitutionAdvisory(
  range: number,
  e: number,
): { tier: string; fractionOfMax: number; note: string } | null {
  if (e <= 0) return null;
  const rInE = range / e;
  if (rInE <= 0.2) {
    return {
      tier: 'r ≤ 0.2e',
      fractionOfMax: 0.2,
      note: `Repeatability ${rInE.toFixed(2)}e ≤ 0.2e — standard weights may be reduced to one-fifth (20% of Max). [VERIFY: GSR 568(E) 2026]`,
    };
  }
  if (rInE <= 0.3) {
    return {
      tier: '0.2e < r ≤ 0.3e',
      fractionOfMax: 1 / 3,
      note: `Repeatability ${rInE.toFixed(2)}e ≤ 0.3e — standard weights may be reduced to one-third (33.3% of Max). [VERIFY: GSR 568(E) 2026]`,
    };
  }
  return {
    tier: 'r > 0.3e',
    fractionOfMax: 0.5,
    note: `Repeatability ${rInE.toFixed(2)}e > 0.3e — at least 50% standard weights required. [VERIFY: GSR 568(E) 2026]`,
  };
}
