import { describe, it, expect } from 'vitest';
import { seedDemoData } from './seed';
import { recomputeReportHash } from '../report/reportModel';

describe('demo flow — end-to-end (no browser)', () => {
  it('seeds the DWT-300 failing session with a deliberate FAIL at 100 kg', async () => {
    const { sessions } = await seedDemoData();
    const failing = sessions.find((s) => s.id === 'sess_demo_fail')!;
    expect(failing.overallVerdict).toBe('FAIL');

    const w = failing.results.weighing!;
    const p100 = w.points!.find((p) => p.load === 100 && p.direction === 'up')!;
    expect(p100.Ec).toBe(0.18);
    expect(p100.mpe!.mpe).toBe(0.1); // Class III, m=1000 => 1.0e = 0.1 kg
    expect(p100.compliance.status).toBe('FAIL');
    expect(p100.compliance.excess).toBeCloseTo(0.08, 3);

    // Every other weighing point should pass
    const others = w.points!.filter((p) => !(p.load === 100 && p.direction === 'up'));
    expect(others.every((p) => p.compliance.status === 'PASS')).toBe(true);
  });

  it('seeds a fully-passing session that becomes a report', async () => {
    const { sessions, reports } = await seedDemoData();
    const passing = sessions.find((s) => s.id === 'sess_demo_pass')!;
    expect(passing.overallVerdict).toBe('PASS');
    expect(reports).toHaveLength(1);
    expect(reports[0].overallVerdict).toBe('PASS');
  });

  it('report integrity hash recomputes (tamper-evident check passes)', async () => {
    const { reports } = await seedDemoData();
    const report = reports[0];
    const recomputed = await recomputeReportHash(report);
    expect(recomputed).toBe(report.integrityHash);
  });

  it('tampering with the snapshot breaks the integrity check', async () => {
    const { reports } = await seedDemoData();
    const report = structuredClone(reports[0]);
    report.snapshot.instrument.serial = 'TAMPERED-SERIAL';
    const recomputed = await recomputeReportHash(report);
    expect(recomputed).not.toBe(report.integrityHash);
  });

  it('repeatability & eccentricity pass on the demo instrument', async () => {
    const { sessions } = await seedDemoData();
    const failing = sessions.find((s) => s.id === 'sess_demo_fail')!;
    expect(failing.results.repeatability!.status).toBe('PASS');
    expect(failing.results.eccentricity!.status).toBe('PASS');
    expect(failing.results.zero!.zeroError).toBe(0);
  });
});
