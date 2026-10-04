import { describe, it, expect } from 'vitest';
import {
  computeIndicationPriorToRounding,
  computeError,
  computeCorrectedError,
  computePoint,
  computeRepeatabilityRange,
} from './metrology';

describe('metrology engine — indication prior to rounding', () => {
  it('P = I + i/2 − ΔL', () => {
    const { value } = computeIndicationPriorToRounding(50.0, 0.1, 0.03, 3);
    expect(value).toBe(50.02); // 50 + 0.05 − 0.03
  });

  it('handles ΔL larger than half interval (P below I)', () => {
    const { value } = computeIndicationPriorToRounding(100.0, 0.1, 0.09, 3);
    expect(value).toBe(99.96); // 100 + 0.05 − 0.09 = 99.96
  });

  it('reduces to I + e/2 when ΔL is zero', () => {
    const { value } = computeIndicationPriorToRounding(10, 0.1, 0, 3);
    expect(value).toBe(10.05);
  });
});

describe('metrology engine — error & corrected error', () => {
  it('E = P − L', () => {
    expect(computeError(50.02, 50, 3).value).toBe(0.02);
  });

  it('Ec = E − E0 subtracts the zero error', () => {
    expect(computeCorrectedError(0.05, 0.02, 3).value).toBe(0.03);
  });

  it('full point computation chains P → E → Ec with traces', () => {
    const r = computePoint({
      load: 100,
      indication: 100.2,
      additionalLoad: 0.07,
      roundingInterval: 0.1,
      zeroError: 0,
      precision: 3,
    });
    expect(r.P).toBe(100.18);
    expect(r.E).toBe(0.18);
    expect(r.Ec).toBe(0.18);
    expect(r.traces).toHaveLength(3);
    expect(r.traces[0].formulaId).toContain('indication-prior-to-rounding');
    expect(r.traces[0].engineVersion).toBeTruthy();
  });

  it('does not accumulate floating-point noise', () => {
    const r = computePoint({
      load: 0.3,
      indication: 0.3,
      additionalLoad: 0.1,
      roundingInterval: 0.2,
      precision: 3,
    });
    // 0.3 + 0.1 − 0.1 = 0.3 ; E = 0
    expect(r.P).toBe(0.3);
    expect(r.E).toBe(0);
  });
});

describe('metrology engine — repeatability range', () => {
  it('range = max − min, plus mean', () => {
    const { mean, range } = computeRepeatabilityRange([100.02, 100.05, 100.01], 3);
    expect(range).toBe(0.04);
    expect(mean).toBe(100.027); // mean 100.026667 rounded to 3 dp
  });
});
