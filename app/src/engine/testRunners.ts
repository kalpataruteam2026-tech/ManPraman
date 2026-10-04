/**
 * Test runners — orchestrate the pure engine (metrology + MPE + compliance) to
 * turn raw observations into fully-evaluated TestResults. This keeps all domain
 * logic out of the UI (DESIGN_SPEC PART 49).
 */
import type {
  ComplianceStatus,
  Instrument,
  TestPointResult,
  TestResult,
  TestSession,
  VerificationStage,
} from '../domain/types';
import { round } from '../domain/units';
import { getRuleset } from '../regulatory/registry';
import { precisionFor } from '../regulatory/testPlan';
import { computePoint, computeRepeatabilityRange } from './metrology';
import { selectMpe } from './mpe';
import {
  evaluateAgainstMpe,
  evaluateRepeatability,
  substitutionAdvisory,
} from './compliance';

let counter = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

interface Ctx {
  instrument: Instrument;
  stage: VerificationStage;
  rulesetId: string;
  zeroError: number;
}

function ctxFrom(session: TestSession, instrument: Instrument, zeroError = 0): Ctx {
  return { instrument, stage: session.stage, rulesetId: session.rulesetId, zeroError };
}

function worst(statuses: ComplianceStatus[]): ComplianceStatus {
  if (statuses.includes('FAIL')) return 'FAIL';
  if (statuses.length === 0 || statuses.includes('PENDING')) return 'PENDING';
  if (statuses.every((s) => s === 'NA')) return 'NA';
  return 'PASS';
}

// --------------------------- Zero test -----------------------------------
export interface ZeroInput {
  i0: number; // indication at zero
  deltaL0: number; // additional load to reach next interval
}

export function runZero(session: TestSession, instrument: Instrument, input: ZeroInput): TestResult {
  const precision = precisionFor(instrument.e);
  const comp = computePoint({
    load: 0,
    indication: input.i0,
    additionalLoad: input.deltaL0,
    roundingInterval: instrument.d,
    zeroError: 0,
    precision,
  });
  const E0 = comp.E; // error at zero
  const mpe = selectMpe({
    ruleset: getRuleset(session.rulesetId),
    accuracyClass: instrument.accuracyClass,
    load: 0,
    e: instrument.e,
    stage: session.stage,
    precision,
  });
  const compliance = evaluateAgainstMpe(E0, mpe, {
    testName: 'Zero',
    load: 0,
    unit: instrument.unit,
    precision,
    e: instrument.e,
    errorLabel: 'error at zero',
  });

  const point: TestPointResult = {
    id: uid('zp'),
    label: 'Zero',
    load: 0,
    indication: input.i0,
    additionalLoad: input.deltaL0,
    roundingInterval: instrument.d,
    P: comp.P,
    E: comp.E,
    Ec: comp.E,
    mpe,
    compliance,
    traces: comp.traces,
  };

  return {
    testType: 'zero',
    name: 'Zero-setting & zero indication',
    applicable: true,
    applicabilityReason: 'Establishes the zero error E0 used to correct subsequent readings.',
    status: compliance.status,
    points: [point],
    zeroError: E0,
    completedAt: new Date().toISOString(),
  };
}

// ----------------------- Weighing performance ----------------------------
export interface WeighingObs {
  load: number;
  indication: number;
  additionalLoad: number;
  direction: 'up' | 'down';
}

export function runWeighing(
  session: TestSession,
  instrument: Instrument,
  observations: WeighingObs[],
  zeroError = 0,
): TestResult {
  const precision = precisionFor(instrument.e);
  const ruleset = getRuleset(session.rulesetId);

  const points: TestPointResult[] = observations.map((o, idx) => {
    const comp = computePoint({
      load: o.load,
      indication: o.indication,
      additionalLoad: o.additionalLoad,
      roundingInterval: instrument.d,
      zeroError,
      precision,
    });
    const mpe = selectMpe({
      ruleset,
      accuracyClass: instrument.accuracyClass,
      load: o.load,
      e: instrument.e,
      stage: session.stage,
      precision,
    });
    const compliance = evaluateAgainstMpe(comp.Ec, mpe, {
      testName: 'Weighing performance',
      load: o.load,
      unit: instrument.unit,
      precision,
      e: instrument.e,
    });
    return {
      id: uid('wp'),
      label: `${o.direction === 'up' ? 'Increasing' : 'Decreasing'} · ${o.load} ${instrument.unit}`,
      load: o.load,
      indication: o.indication,
      additionalLoad: o.additionalLoad,
      roundingInterval: instrument.d,
      P: comp.P,
      E: comp.E,
      Ec: comp.Ec,
      direction: o.direction,
      mpe,
      compliance,
      traces: comp.traces,
    };
  });

  return {
    testType: 'weighing',
    name: 'Weighing performance (increasing & decreasing)',
    applicable: true,
    applicabilityReason: 'Error of indication across the range against load-dependent MPE.',
    status: worst(points.map((p) => p.compliance.status)),
    points,
    completedAt: new Date().toISOString(),
  };
}

// --------------------------- Repeatability -------------------------------
export interface RepeatObs {
  load: number;
  runs: { indication: number; additionalLoad: number }[];
}

export function runRepeatability(
  session: TestSession,
  instrument: Instrument,
  obs: RepeatObs,
  zeroError = 0,
): TestResult {
  const precision = precisionFor(instrument.e);
  const ruleset = getRuleset(session.rulesetId);

  const runsP = obs.runs.map(
    (r) =>
      computePoint({
        load: obs.load,
        indication: r.indication,
        additionalLoad: r.additionalLoad,
        roundingInterval: instrument.d,
        zeroError,
        precision,
      }).P,
  );
  const { mean, range } = computeRepeatabilityRange(runsP, precision);
  const mpe = selectMpe({
    ruleset,
    accuracyClass: instrument.accuracyClass,
    load: obs.load,
    e: instrument.e,
    stage: session.stage,
    precision,
  });
  const limit = round(ruleset.repeatabilityLimitFactor * mpe.mpe, precision);
  const rep = evaluateRepeatability(range, limit, instrument.unit, precision);
  const advisory = substitutionAdvisory(range, instrument.e);

  return {
    testType: 'repeatability',
    name: 'Repeatability',
    applicable: true,
    applicabilityReason: 'Consistency of repeated weighings of the same load.',
    status: rep.status,
    repeatability: {
      load: obs.load,
      runs: runsP,
      mean,
      range,
      limit,
      substitutionTier: advisory?.tier,
      compliance: rep.status,
      explanation: [...rep.explanation, ...(advisory ? [advisory.note] : [])],
    },
    completedAt: new Date().toISOString(),
  };
}

// --------------------------- Eccentricity --------------------------------
export interface EccObs {
  load: number;
  positions: { label: string; indication: number; additionalLoad: number }[];
}

export function runEccentricity(
  session: TestSession,
  instrument: Instrument,
  obs: EccObs,
  zeroError = 0,
): TestResult {
  const precision = precisionFor(instrument.e);
  const ruleset = getRuleset(session.rulesetId);

  const points: TestPointResult[] = obs.positions.map((pos) => {
    const comp = computePoint({
      load: obs.load,
      indication: pos.indication,
      additionalLoad: pos.additionalLoad,
      roundingInterval: instrument.d,
      zeroError,
      precision,
    });
    const mpe = selectMpe({
      ruleset,
      accuracyClass: instrument.accuracyClass,
      load: obs.load,
      e: instrument.e,
      stage: session.stage,
      precision,
    });
    const compliance = evaluateAgainstMpe(comp.Ec, mpe, {
      testName: 'Eccentricity',
      load: obs.load,
      unit: instrument.unit,
      precision,
      e: instrument.e,
    });
    return {
      id: uid('ec'),
      label: pos.label,
      load: obs.load,
      indication: pos.indication,
      additionalLoad: pos.additionalLoad,
      roundingInterval: instrument.d,
      P: comp.P,
      E: comp.E,
      Ec: comp.Ec,
      mpe,
      compliance,
      traces: comp.traces,
    };
  });

  return {
    testType: 'eccentricity',
    name: 'Eccentricity (off-centre loading)',
    applicable: true,
    applicabilityReason: 'Error when load is applied away from the centre of the receptor.',
    status: worst(points.map((p) => p.compliance.status)),
    points,
    completedAt: new Date().toISOString(),
  };
}

// ------------------------------- Tare ------------------------------------
export function runTare(
  session: TestSession,
  instrument: Instrument,
  obs: WeighingObs[],
  zeroError = 0,
): TestResult {
  const base = runWeighing(session, instrument, obs, zeroError);
  return {
    ...base,
    testType: 'tare',
    name: 'Tare device',
    applicabilityReason: 'Net weighing performance after taring.',
  };
}

// --------------------------- Overall verdict -----------------------------
export function computeOverallVerdict(results: TestResult[]): ComplianceStatus {
  const applicable = results.filter((r) => r.applicable);
  return worst(applicable.map((r) => r.status));
}
