import { describe, it, expect } from 'vitest';
import { validateInstrument, hasBlockingErrors } from './validation';
import { generateTestPlan } from './testPlan';
import { oimlR76_2006 } from './rulesets/oimlR76_2006';

const rs = oimlR76_2006;

const demo = {
  accuracyClass: 'III' as const,
  unit: 'kg' as const,
  max: 300,
  min: 20,
  e: 0.1,
  d: 0.1,
  intervalConfig: 'single' as const,
  ranges: undefined,
};

describe('validation — instrument configuration', () => {
  it('accepts a well-formed Class III instrument', () => {
    const issues = validateInstrument(demo, rs);
    expect(hasBlockingErrors(issues)).toBe(false);
  });

  it('flags e = 0 as a blocking error with an educational message', () => {
    const issues = validateInstrument({ ...demo, e: 0 }, rs);
    expect(hasBlockingErrors(issues)).toBe(true);
    expect(issues.find((i) => i.field === 'e')?.message).toMatch(/greater than zero/i);
  });

  it('flags d > e as a blocking error', () => {
    const issues = validateInstrument({ ...demo, d: 0.2 }, rs);
    expect(hasBlockingErrors(issues)).toBe(true);
  });

  it('warns when n = Max/e is below the class minimum', () => {
    // e = 5 kg → n = 60, below class III min 500
    const issues = validateInstrument({ ...demo, e: 5, d: 5 }, rs);
    expect(issues.some((i) => i.field === 'max' && i.severity === 'warning')).toBe(true);
  });

  it('rejects Min ≥ Max', () => {
    const issues = validateInstrument({ ...demo, min: 300 }, rs);
    expect(hasBlockingErrors(issues)).toBe(true);
  });
});

describe('test-plan generator — applicability with reasons', () => {
  it('field mode excludes temperature and discrimination', () => {
    const plan = generateTestPlan({ tareType: 'additive', accuracyClass: 'III' }, 'field', rs);
    const temp = plan.find((p) => p.testType === 'temperature')!;
    const disc = plan.find((p) => p.testType === 'discrimination')!;
    expect(temp.applicable).toBe(false);
    expect(disc.applicable).toBe(false);
    expect(temp.reason).toMatch(/laboratory/i);
  });

  it('lab mode includes temperature', () => {
    const plan = generateTestPlan({ tareType: 'additive', accuracyClass: 'III' }, 'lab', rs);
    expect(plan.find((p) => p.testType === 'temperature')!.applicable).toBe(true);
  });

  it('tare is not applicable when there is no tare device', () => {
    const plan = generateTestPlan({ tareType: 'none', accuracyClass: 'III' }, 'field', rs);
    const tare = plan.find((p) => p.testType === 'tare')!;
    expect(tare.applicable).toBe(false);
    expect(tare.reason).toMatch(/no tare device/i);
  });

  it('weighing is always mandatory and applicable', () => {
    const plan = generateTestPlan({ tareType: 'none', accuracyClass: 'III' }, 'field', rs);
    const w = plan.find((p) => p.testType === 'weighing')!;
    expect(w.applicable).toBe(true);
    expect(w.mandatory).toBe(true);
  });
});
