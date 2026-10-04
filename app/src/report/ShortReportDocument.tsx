import type { Report } from '../domain/types';
import { precisionFor } from '../regulatory/testPlan';
import { signed } from '../domain/units';
import { classLabel, EVAL_LABEL, fmtDateTime } from '../lib/format';
import { shortFingerprint } from '../integrity/hash';
import { StatusPill } from '../components/ui/StatusPill';

/**
 * SHORT / SUMMARY REPORT (CHANGE #3.1)
 * Concise 1-2 page official verification certificate and test summary.
 */
export function ShortReportDocument({ report, qr }: { report: Report; qr?: string }) {
  const { session, instrument, standard, standardEdition, jurisdiction } = report.snapshot;
  const precision = precisionFor(instrument.e);
  const results = Object.values(session.results);

  return (
    <div className="mx-auto max-w-[800px] border border-line bg-white p-8 text-ink shadow-card print:border-none print:shadow-none sm:p-10">
      {/* Top Header */}
      <div className="flex items-start justify-between border-b-2 border-navy-900 pb-5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-accent-700">
            GOVERNMENT OF INDIA · LEGAL METROLOGY DIVISION
          </div>
          <h1 className="mt-1 text-2xl font-black text-navy-950">
            VERIFICATION CERTIFICATE (SUMMARY REPORT)
          </h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            In accordance with OIML R-76 & Standards of Weights and Measures (General) Rules, 2011
          </p>
          <div className="mt-2 font-mono text-sm font-bold text-accent-800">
            Certificate No: {report.code}
          </div>
        </div>

        <div className="text-right">
          {qr && <img src={qr} alt="Verification QR" className="ml-auto h-20 w-20" />}
          <div className="mt-1 text-[9px] uppercase font-bold text-ink-faint">Scan to Verify Authenticity</div>
          <div className="font-mono text-[10px] text-ink-soft">ID: {report.verificationId}</div>
        </div>
      </div>

      {/* Overall Verdict Banner */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-paper px-4 py-3 border border-line/60">
        <div>
          <div className="text-xs uppercase font-bold text-ink-faint">Overall Metrological Verdict</div>
          <div className="text-sm font-semibold text-ink">
            Evaluation Type: {EVAL_LABEL[session.evaluationType] || session.evaluationType}
          </div>
        </div>
        <StatusPill status={report.overallVerdict} />
      </div>

      {/* Core Metrological & Instrument Identification */}
      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 rounded-xl bg-paper/50 p-4 text-xs border border-line/40">
        <div className="flex justify-between border-b border-line/40 py-1">
          <span className="text-ink-faint">Manufacturer:</span>
          <span className="font-bold text-ink">{instrument.manufacturer}</span>
        </div>
        <div className="flex justify-between border-b border-line/40 py-1">
          <span className="text-ink-faint">Model:</span>
          <span className="font-bold text-ink">{instrument.model}</span>
        </div>
        <div className="flex justify-between border-b border-line/40 py-1">
          <span className="text-ink-faint">Machine Serial No:</span>
          <span className="font-mono font-bold text-ink">{instrument.serial}</span>
        </div>
        <div className="flex justify-between border-b border-line/40 py-1">
          <span className="text-ink-faint">Accuracy Class:</span>
          <span className="font-bold text-navy-800">{classLabel(instrument.accuracyClass)}</span>
        </div>
        <div className="flex justify-between border-b border-line/40 py-1">
          <span className="text-ink-faint">Max Capacity (Max):</span>
          <span className="font-semibold text-ink">{instrument.max} {instrument.unit}</span>
        </div>
        <div className="flex justify-between border-b border-line/40 py-1">
          <span className="text-ink-faint">Min Capacity (Min):</span>
          <span className="font-semibold text-ink">{instrument.min} {instrument.unit}</span>
        </div>
        <div className="flex justify-between border-b border-line/40 py-1">
          <span className="text-ink-faint">Verification Interval (e):</span>
          <span className="font-semibold text-ink">{instrument.e} {instrument.unit}</span>
        </div>
        <div className="flex justify-between border-b border-line/40 py-1">
          <span className="text-ink-faint">Actual Scale Interval (d):</span>
          <span className="font-semibold text-ink">{instrument.d} {instrument.unit}</span>
        </div>
        <div className="flex justify-between border-b border-line/40 py-1">
          <span className="text-ink-faint">Testing Laboratory:</span>
          <span className="text-ink truncate max-w-[170px]" title={session.laboratory || session.testLocation}>
            {session.laboratory || session.testLocation || '—'}
          </span>
        </div>
        <div className="flex justify-between border-b border-line/40 py-1">
          <span className="text-ink-faint">Applicant / Owner:</span>
          <span className="text-ink truncate max-w-[170px]" title={session.applicant}>
            {session.applicant || '—'}
          </span>
        </div>
      </div>

      {/* Compact Test-Wise Results Table (CHANGE #3.1 & #3.4) */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950">
            Metrological Test-Wise Verification Matrix
          </h3>
          <span className="text-[11px] font-semibold text-ink-faint">
            Total Tests: <b>{results.length}</b> ({results.filter(r => r.status === 'PASS').length} Passed, {results.filter(r => r.status === 'FAIL').length} Failed)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-line">
            <thead className="bg-paper/80 border-b border-line text-[10px] uppercase text-ink-faint">
              <tr>
                <th className="p-2">Test Name</th>
                <th className="p-2">Clause</th>
                <th className="p-2">Tested Range / Load</th>
                <th className="p-2">Max Observed Error</th>
                <th className="p-2">±MPE Limit</th>
                <th className="p-2">Margin / Excess</th>
                <th className="p-2 text-right">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {results.map((r: any) => {
                const isFail = r.status === 'FAIL';
                const maxPt = r.points && r.points.length > 0
                  ? r.points.reduce((prev: any, curr: any) => Math.abs(curr.Ec) > Math.abs(prev.Ec) ? curr : prev, r.points[0])
                  : null;

                let maxErrStr = '—';
                let mpeStr = '—';
                let marginStr = '—';
                let diffVal = 0;

                if (r.maxObservedError !== undefined && r.mpeLimit !== undefined) {
                  maxErrStr = `${r.maxObservedError.toFixed(precision)} ${instrument.unit}`;
                  mpeStr = `±${r.mpeLimit.toFixed(precision)} ${instrument.unit}`;
                  diffVal = r.mpeLimit - r.maxObservedError;
                  marginStr = diffVal >= 0
                    ? `+${diffVal.toFixed(precision)} ${instrument.unit}`
                    : `-${Math.abs(diffVal).toFixed(precision)} ${instrument.unit} (Exceeded)`;
                } else if (maxPt) {
                  maxErrStr = `${signed(maxPt.Ec, precision)} ${instrument.unit}`;
                  const lim = maxPt.mpe?.mpe ?? 0;
                  mpeStr = lim > 0 ? `±${lim.toFixed(precision)} ${instrument.unit}` : '—';
                  diffVal = lim - Math.abs(maxPt.Ec);
                  marginStr = diffVal >= 0
                    ? `+${diffVal.toFixed(precision)} ${instrument.unit}`
                    : `-${Math.abs(diffVal).toFixed(precision)} ${instrument.unit} (Exceeded)`;
                } else if (r.repeatability) {
                  maxErrStr = `${r.repeatability.range.toFixed(precision)} ${instrument.unit}`;
                  mpeStr = `≤ ${r.repeatability.limit.toFixed(precision)} ${instrument.unit}`;
                  diffVal = r.repeatability.limit - r.repeatability.range;
                  marginStr = diffVal >= 0
                    ? `+${diffVal.toFixed(precision)} ${instrument.unit}`
                    : `-${Math.abs(diffVal).toFixed(precision)} ${instrument.unit} (Exceeded)`;
                }

                const rangeStr = r.points && r.points.length > 0
                  ? (r.points.length === 1 ? `${r.points[0].load} ${instrument.unit}` : `${r.points[0].load} to ${r.points[r.points.length - 1].load} ${instrument.unit}`)
                  : r.repeatability ? `${r.repeatability.load} ${instrument.unit}` : 'Operational band';

                return (
                  <tr key={r.testType} className={`hover:bg-paper/30 ${isFail ? 'bg-fail-bg/30 font-semibold' : ''}`}>
                    <td className="p-2 font-semibold text-ink">{r.name}</td>
                    <td className="p-2 text-ink-faint font-mono text-[11px]">{r.clause ?? 'A.4'}</td>
                    <td className="p-2 text-ink-soft tabular">{rangeStr}</td>
                    <td className={`p-2 font-bold tabular ${isFail ? 'text-fail-fg' : 'text-ink'}`}>{maxErrStr}</td>
                    <td className="p-2 text-ink-faint tabular">{mpeStr}</td>
                    <td className={`p-2 tabular text-xs font-semibold ${isFail ? 'text-fail-fg' : 'text-pass-fg'}`}>
                      {marginStr}
                    </td>
                    <td className="p-2 text-right">
                      <StatusPill status={r.status} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Failed Tests / Non-Conformities Summary Box */}
        {results.some(r => r.status === 'FAIL') && (
          <div className="mt-4 rounded-xl border border-fail-line bg-fail-bg/60 p-3.5 text-xs text-fail-fg space-y-1.5">
            <div className="font-bold text-sm flex items-center gap-1.5 text-rose-900">
              ⚠️ Non-Conformities & Regulatory MPE Exceedances Identified:
            </div>
            {results.filter(r => r.status === 'FAIL').map(r => (
              <div key={r.testType} className="pl-4 text-xs font-medium">
                • <b>{r.name} ({r.clause}):</b> Observed error exceeds statutory allowance. {(r as any).reasoning || r.applicabilityReason || 'Failed verification criterion.'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviewer / Tester Signatures */}
      <div className="mt-8 grid grid-cols-2 gap-8 border-t border-line pt-6 text-xs">
        <div>
          <div className="text-ink-faint">Testing Officer / Tester:</div>
          <div className="mt-1 font-bold text-ink">{session.technicianName}</div>
          <div className="mt-4 h-9 border-b border-dashed border-ink/40 w-44" />
          <div className="mt-1 text-[10px] text-ink-faint">Date & Official Signature</div>
        </div>

        <div>
          <div className="text-ink-faint">Reviewed & Approved by:</div>
          <div className="mt-1 font-bold text-ink">{session.reviewerName ?? 'Superintendent of Legal Metrology'}</div>
          <div className="mt-4 h-9 border-b border-dashed border-ink/40 w-44" />
          <div className="mt-1 text-[10px] text-ink-faint">Date & Review Seal</div>
        </div>
      </div>

      {/* Integrity Footer */}
      <div className="mt-6 rounded-lg bg-paper p-3 text-[10px] text-ink-faint border border-line/60 flex items-center justify-between">
        <div>
          <span>SHA-256 Fingerprint: </span>
          <span className="font-mono text-ink font-semibold">{shortFingerprint(report.integrityHash)}</span>
          <span className="ml-2">· Ruleset: {report.rulesetVersion}</span>
        </div>
        <div className="tabular">{fmtDateTime(report.createdAt)}</div>
      </div>
    </div>
  );
}
