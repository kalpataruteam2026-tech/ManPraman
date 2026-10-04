import { describe, it, expect } from 'vitest';
import { evaluateAgainstMpe, evaluateRepeatability, substitutionAdvisory } from './compliance';
import { selectMpe } from './mpe';
import { oimlR76_2006 } from '../regulatory/rulesets/oimlR76_2006';

const rs = oimlR76_2006;

function mpeAt(load: number, stage: 'initial' | 'inservice' = 'initial') {
  return selectMpe({ ruleset: rs, accuracyClass: 'III', load, e: 0.1, stage, precision: 3 });
}

describe('compliance — PASS/FAIL against MPE', () => {
  const ctx = { testName: 'Weighing', load: 100, unit: 'kg' as const, precision: 3, e: 0.1 };

  it('PASS when |Ec| < MPE', () => {
    const r = evaluateAgainstMpe(0.03, mpeAt(100), ctx); // MPE 0.1
    expect(r.status).toBe('PASS');
    expect(r.margin).toBeCloseTo(0.07, 3);
  });

  it('PASS exactly at the boundary (|Ec| = MPE)', () => {
    const r = evaluateAgainstMpe(0.1, mpeAt(100), ctx);
    expect(r.status).toBe('PASS');
    expect(r.margin).toBe(0);
  });

  it('FAIL when |Ec| exceeds MPE, with correct excess', () => {
    const r = evaluateAgainstMpe(0.18, mpeAt(100), ctx); // the deliberate demo failure
    expect(r.status).toBe('FAIL');
    expect(r.excess).toBeCloseTo(0.08, 3);
    expect(r.reason.toLowerCase()).toContain('exceeds');
    expect(r.explanation.join(' ')).toContain('±0.1 kg');
  });

  it('FAIL on the negative side too', () => {
    const r = evaluateAgainstMpe(-0.15, mpeAt(100), ctx);
    expect(r.status).toBe('FAIL');
  });
});

describe('compliance — repeatability', () => {
  it('PASS when range ≤ limit', () => {
    const r = evaluateRepeatability(0.04, 0.1, 'kg', 3);
    expect(r.status).toBe('PASS');
  });
  it('FAIL when range > limit', () => {
    const r = evaluateRepeatability(0.14, 0.1, 'kg', 3);
    expect(r.status).toBe('FAIL');
  });
});

describe('compliance — India 2026 substitution advisory [VERIFY]', () => {
  it('r ≤ 0.2e → one-fifth', () => {
    const a = substitutionAdvisory(0.018, 0.1); // 0.18e
    expect(a?.fractionOfMax).toBeCloseTo(0.2, 6);
  });
  it('0.2e < r ≤ 0.3e → one-third', () => {
    const a = substitutionAdvisory(0.025, 0.1); // 0.25e
    expect(a?.fractionOfMax).toBeCloseTo(1 / 3, 6);
  });
  it('r > 0.3e → one-half', () => {
    const a = substitutionAdvisory(0.05, 0.1); // 0.5e
    expect(a?.fractionOfMax).toBeCloseTo(0.5, 6);
  });
});
