/**
 * Deterministic metrology engine (DESIGN_SPEC PART 8, 15, 16).
 *
 * Computes the indication prior to rounding (P), error (E) and corrected
 * error (Ec) for a weighing test point, with a full, replayable calculation
 * trace. NO probabilistic / AI logic — pure functions only.
 *
 * Indication prior to rounding:
 *      P = I + roundingInterval/2 − ΔL
 * where `roundingInterval` is the scale interval of the indication being read
 * (the display resolution d; d = e in normal verification). This resolves the
 * dossier's e-vs-d conflict by naming the basis explicitly (DESIGN_SPEC 2.4).
 *
 *      E  = P − L
 *      Ec = E − E0
 */
import { ENGINE_VERSION } from '../domain/constants';
import type { CalcTrace } from '../domain/types';
import { round, signed } from '../domain/units';

export const FORMULA_P = 'OIML-R76/indication-prior-to-rounding';
export const FORMULA_E = 'OIML-R76/error-of-indication';
export const FORMULA_EC = 'OIML-R76/corrected-error';
export const FORMULA_VERSION = '2006.1';

export interface PointInput {
  /** Applied reference/standard load L. */
  load: number;
  /** Displayed indication I. */
  indication: number;
  /** Additional load ΔL added until the reading increments by one interval. */
  additionalLoad: number;
  /** Scale interval used for the rounding correction (d; equals e in verification). */
  roundingInterval: number;
  /** Zero (or near-zero) error E0 used to correct the reading. Default 0. */
  zeroError?: number;
  /** Decimal places for storing/comparing results (derived from e by caller). */
  precision: number;
}

export interface PointComputation {
  P: number;
  E: number;
  Ec: number;
  traces: CalcTrace[];
}

function now(): string {
  return new Date().toISOString();
}

/** P = I + roundingInterval/2 − ΔL */
export function computeIndicationPriorToRounding(
  indication: number,
  roundingInterval: number,
  additionalLoad: number,
  precision: number,
): { value: number; trace: CalcTrace } {
  const half = roundingInterval / 2;
  const raw = indication + half - additionalLoad;
  const value = round(raw, precision);
  const trace: CalcTrace = {
    formulaId: FORMULA_P,
    formulaVersion: FORMULA_VERSION,
    inputs: { I: indication, roundingInterval, deltaL: additionalLoad },
    intermediates: { halfInterval: round(half, precision + 2) },
    result: value,
    expression: `P = I + i/2 − ΔL = ${indication} + ${roundingInterval}/2 − ${additionalLoad} = ${value}`,
    timestamp: now(),
    engineVersion: ENGINE_VERSION,
  };
  return { value, trace };
}

/** E = P − L */
export function computeError(
  P: number,
  load: number,
  precision: number,
): { value: number; trace: CalcTrace } {
  const value = round(P - load, precision);
  const trace: CalcTrace = {
    formulaId: FORMULA_E,
    formulaVersion: FORMULA_VERSION,
    inputs: { P, L: load },
    intermediates: {},
    result: value,
    expression: `E = P − L = ${P} − ${load} = ${signed(value, precision)}`,
    timestamp: now(),
    engineVersion: ENGINE_VERSION,
  };
  return { value, trace };
}

/** Ec = E − E0 */
export function computeCorrectedError(
  E: number,
  zeroError: number,
  precision: number,
): { value: number; trace: CalcTrace } {
  const value = round(E - zeroError, precision);
  const trace: CalcTrace = {
    formulaId: FORMULA_EC,
    formulaVersion: FORMULA_VERSION,
    inputs: { E, E0: zeroError },
    intermediates: {},
    result: value,
    expression: `Ec = E − E0 = ${signed(E, precision)} − ${signed(zeroError, precision)} = ${signed(value, precision)}`,
    timestamp: now(),
    engineVersion: ENGINE_VERSION,
  };
  return { value, trace };
}

/** Compute a full test point: P, E, Ec with traces. */
export function computePoint(input: PointInput): PointComputation {
  const { load, indication, additionalLoad, roundingInterval, precision } = input;
  const zeroError = input.zeroError ?? 0;

  const p = computeIndicationPriorToRounding(indication, roundingInterval, additionalLoad, precision);
  const e = computeError(p.value, load, precision);
  const ec = computeCorrectedError(e.value, zeroError, precision);

  return {
    P: p.value,
    E: e.value,
    Ec: ec.value,
    traces: [p.trace, e.trace, ec.trace],
  };
}

/** Repeatability range r = max(P) − min(P) over the runs. */
export function computeRepeatabilityRange(
  runsP: number[],
  precision: number,
): { mean: number; range: number } {
  if (runsP.length === 0) return { mean: 0, range: 0 };
  const max = Math.max(...runsP);
  const min = Math.min(...runsP);
  const mean = runsP.reduce((a, b) => a + b, 0) / runsP.length;
  return { mean: round(mean, precision), range: round(max - min, precision) };
}
