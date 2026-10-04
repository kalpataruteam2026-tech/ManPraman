import { describe, it, expect } from 'vitest';
import { selectMpe } from './mpe';
import { oimlR76_2006 } from '../regulatory/rulesets/oimlR76_2006';

const rs = oimlR76_2006;
const base = { ruleset: rs, e: 0.1, precision: 3 } as const;

describe('MPE engine — class III load bands (initial verification)', () => {
  it('m ≤ 500 → ±0.5e', () => {
    const r = selectMpe({ ...base, accuracyClass: 'III', load: 50, stage: 'initial' });
    expect(r.loadInE).toBe(500);
    expect(r.mpeInE).toBe(0.5);
    expect(r.mpe).toBe(0.05);
    expect(r.band).toBe('0 ≤ m ≤ 500');
  });

  it('boundary m = 500 stays in the first tier (inclusive)', () => {
    const r = selectMpe({ ...base, accuracyClass: 'III', load: 50.0, stage: 'initial' });
    expect(r.mpeInE).toBe(0.5);
  });

  it('500 < m ≤ 2000 → ±1.0e', () => {
    const r = selectMpe({ ...base, accuracyClass: 'III', load: 100, stage: 'initial' });
    expect(r.loadInE).toBe(1000);
    expect(r.mpeInE).toBe(1.0);
    expect(r.mpe).toBe(0.1);
    expect(r.band).toBe('500 < m ≤ 2,000');
  });

  it('2000 < m → ±1.5e', () => {
    const r = selectMpe({ ...base, accuracyClass: 'III', load: 250, stage: 'initial' });
    expect(r.loadInE).toBe(2500);
    expect(r.mpeInE).toBe(1.5);
    expect(r.mpe).toBe(0.15);
    expect(r.band).toBe('m > 2,000');
  });
});

describe('MPE engine — stage multiplier (in-service = 2× initial)', () => {
  it('doubles the MPE for in-service verification', () => {
    const init = selectMpe({ ...base, accuracyClass: 'III', load: 50, stage: 'initial' });
    const insv = selectMpe({ ...base, accuracyClass: 'III', load: 50, stage: 'inservice' });
    expect(insv.mpe).toBeCloseTo(init.mpe * 2, 6);
    expect(insv.mpeInE).toBe(1.0);
    expect(insv.stageMultiplier).toBe(2);
  });
});

describe('MPE engine — class transitions', () => {
  it('class I first tier extends to 50 000 e', () => {
    const r = selectMpe({ ruleset: rs, accuracyClass: 'I', load: 50, e: 0.001, stage: 'initial', precision: 6 });
    // 50 / 0.001 = 50000 → still 0.5e
    expect(r.mpeInE).toBe(0.5);
  });

  it('class IIII transitions at 50 e', () => {
    const r = selectMpe({ ruleset: rs, accuracyClass: 'IIII', load: 6, e: 0.1, stage: 'initial', precision: 3 });
    // 6 / 0.1 = 60 → 50 < m ≤ 200 → 1.0e
    expect(r.mpeInE).toBe(1.0);
  });

  it('throws when e is not positive', () => {
    expect(() => selectMpe({ ...base, accuracyClass: 'III', load: 10, e: 0, stage: 'initial' })).toThrow();
  });
});
