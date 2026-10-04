import type { Report } from '../domain/types';
import { verificationIntervals } from '../domain/types';
import { precisionFor } from '../regulatory/testPlan';
import { signed } from '../domain/units';
import { classLabel, EVAL_LABEL, fmtDateTime, STAGE_LABEL, VERDICT_LABEL } from '../lib/format';
import { shortFingerprint } from '../integrity/hash';

export function downloadReportDocx(
  report: Report,
  format: 'short' | 'detailed' = 'detailed'
) {
  const { session, instrument, standard, standardEdition, jurisdiction } = report.snapshot;
  const precision = precisionFor(instrument.e);

  const titleText = format === 'short'
    ? 'VERIFICATION CERTIFICATE (SUMMARY REPORT)'
    : (report.type === 'lab' ? 'PATTERN EVALUATION REPORT (OIML R 76-2 FORMAT)' : 'VERIFICATION TEST REPORT');

  const testList = Object.values(session.results);

  // Summary Table: Metrological Test-Wise Verification Matrix
  let summaryMatrixHtml = `
    <h3 style="color:#0f3b5c; margin-top:18px;">Metrological Test-Wise Verification Matrix (${testList.filter((r: any) => r.status === 'PASS').length} Pass / ${testList.filter((r: any) => r.status === 'FAIL').length} Fail)</h3>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse; width:100%; font-size:11px; margin-bottom:16px;">
      <tr style="background-color:#0b1f3a; color:#ffffff;">
        <th>Test Case / Name</th>
        <th>Clause</th>
        <th>Max Observed Error</th>
        <th>±MPE Limit</th>
        <th>Margin / Excess</th>
        <th>Verdict</th>
      </tr>
  `;

  for (const r of testList as any[]) {
    const isFail = r.status === 'FAIL';
    const maxPt = r.points && r.points.length > 0
      ? r.points.reduce((prev: any, curr: any) => Math.abs(curr.Ec) > Math.abs(prev.Ec) ? curr : prev, r.points[0])
      : null;

    let maxErr = '—';
    let mpeLim = '—';
    let margin = '—';

    if (r.maxObservedError !== undefined && r.mpeLimit !== undefined) {
      maxErr = `${r.maxObservedError.toFixed(precision)} ${instrument.unit}`;
      mpeLim = `±${r.mpeLimit.toFixed(precision)} ${instrument.unit}`;
      const diff = r.mpeLimit - r.maxObservedError;
      margin = diff >= 0 ? `+${diff.toFixed(precision)}` : `-${Math.abs(diff).toFixed(precision)} (Fail)`;
    } else if (maxPt) {
      const err = Math.abs(maxPt.Ec);
      const lim = maxPt.mpe?.mpe ?? 0;
      maxErr = `${err.toFixed(precision)} ${instrument.unit}`;
      mpeLim = `±${lim.toFixed(precision)} ${instrument.unit}`;
      const diff = lim - err;
      margin = diff >= 0 ? `+${diff.toFixed(precision)}` : `-${Math.abs(diff).toFixed(precision)} (Fail)`;
    } else if (r.repeatability) {
      maxErr = `Range: ${r.repeatability.range} ${instrument.unit}`;
      mpeLim = `≤ ${r.repeatability.limit} ${instrument.unit}`;
      const diff = r.repeatability.limit - r.repeatability.range;
      margin = diff >= 0 ? `+${diff.toFixed(precision)}` : `-${Math.abs(diff).toFixed(precision)} (Fail)`;
    }

    summaryMatrixHtml += `
      <tr style="${isFail ? 'background-color:#fef2f2;' : ''}">
        <td style="font-weight:bold;">${r.name}</td>
        <td>${r.clause || 'A.4'}</td>
        <td style="font-family:monospace;">${maxErr}</td>
        <td style="font-family:monospace;">${mpeLim}</td>
        <td style="font-family:monospace; color:${isFail ? '#dc2626' : '#059669'}; font-weight:bold;">${margin}</td>
        <td style="font-weight:bold; color:${isFail ? '#dc2626' : '#059669'};">${r.status}</td>
      </tr>
    `;
  }
  summaryMatrixHtml += '</table>';

  let resultsHtml = summaryMatrixHtml;
  for (const r of Object.values(session.results)) {
    if (r.points && r.points.length) {
      resultsHtml += `
        <h3 style="color:#0f3b5c; margin-top:18px;">${r.name} (Clause ${r.clause || 'A.4'}) — Status: <span style="color:${r.status === 'PASS' ? '#059669' : '#dc2626'};">${r.status}</span></h3>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse; width:100%; font-size:11px; margin-bottom:12px;">
          <tr style="background-color:#1e3a5f; color:#ffffff;">
            <th>Point</th><th>L (${instrument.unit})</th><th>I (${instrument.unit})</th><th>ΔL</th><th>P</th><th>Ec</th><th>±MPE</th><th>Result</th>
          </tr>
          ${r.points.map(p => `
            <tr style="${p.compliance.status === 'FAIL' ? 'background-color:#fef2f2; font-weight:bold;' : ''}">
              <td>${p.label}</td>
              <td>${p.load}</td>
              <td>${p.indication}</td>
              <td>${p.additionalLoad}</td>
              <td>${p.P}</td>
              <td>${signed(p.Ec, precision)}</td>
              <td>±${p.mpe?.mpe ?? '—'}</td>
              <td style="font-weight:bold; color:${p.compliance.status === 'PASS' ? '#059669' : '#dc2626'};">${p.compliance.status}</td>
            </tr>
          `).join('')}
        </table>
      `;
    } else if (r.repeatability) {
      resultsHtml += `
        <h3 style="color:#0f3b5c; margin-top:18px;">${r.name} (Clause ${r.clause || 'A.4.11'}) — Status: <span style="color:${r.status === 'PASS' ? '#059669' : '#dc2626'};">${r.status}</span></h3>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse; width:100%; font-size:11px; margin-bottom:12px;">
          <tr><td style="font-weight:bold; width:30%;">Runs (P)</td><td>${r.repeatability.runs.map(x => x.toFixed(precision)).join(', ')}</td></tr>
          <tr><td style="font-weight:bold;">Observed Range (ΔP)</td><td>${r.repeatability.range} ${instrument.unit}</td></tr>
          <tr><td style="font-weight:bold;">Permissible Limit (MPE)</td><td>${r.repeatability.limit} ${instrument.unit}</td></tr>
        </table>
      `;
    } else if ((r as any).stepCalculations && (r as any).stepCalculations.length) {
      resultsHtml += `
        <h3 style="color:#0f3b5c; margin-top:18px;">${r.name} (Clause ${r.clause || 'A.5'}) — Status: <span style="color:${r.status === 'PASS' ? '#059669' : '#dc2626'};">${r.status}</span></h3>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse; width:100%; font-size:11px; margin-bottom:12px;">
          <tr style="background-color:#1e3a5f; color:#ffffff;">
            <th style="width:60%;">Verification Step / Parameter</th>
            <th style="width:40%;">Observed / Calculated Value</th>
          </tr>
          ${(r as any).stepCalculations.map((s: any) => `
            <tr>
              <td><b>${s.label}</b> ${s.formula ? `<div style="font-size:9px; color:#64748b;">${s.formula}</div>` : ''}</td>
              <td style="font-family:monospace; font-weight:bold;">${s.result}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }
  }

  const content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${report.code} - ${titleText}</title>
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.4; }
        h1 { color: #0b1f3a; font-size: 18pt; margin-bottom: 4px; }
        h2 { color: #0e7f92; font-size: 13pt; margin-top: 14px; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 14px; }
        th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: left; }
        th { background-color: #0b1f3a; color: white; font-weight: bold; }
        .badge { padding: 3px 8px; border-radius: 4px; font-weight: bold; display: inline-block; }
        .pass { background-color: #d1fae5; color: #065f46; }
        .fail { background-color: #fee2e2; color: #991b1b; }
      </style>
    </head>
    <body>
      <div style="background-color: #0b1f3a; color: white; padding: 18px 24px; border-radius: 6px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 10pt; letter-spacing: 1px; text-transform: uppercase; color: #93c5fd;">${titleText}</p>
        <h1 style="margin: 6px 0; color: white;">Report Ref: ${report.code}</h1>
        <p style="margin: 0; font-size: 9pt; color: #cbd5e1;">Normative Reference: ${standard} · Edition ${standardEdition} · ${jurisdiction}</p>
      </div>

      <p><strong>Overall Evaluation Result:</strong> <span class="badge ${report.overallVerdict === 'PASS' ? 'pass' : 'fail'}">${VERDICT_LABEL[report.overallVerdict].toUpperCase()}</span></p>

      <h2>1. Administrative & Evaluation Parameters</h2>
      <table>
        <tr><td style="font-weight:bold; width:30%;">Session Code</td><td>${session.code}</td></tr>
        <tr><td style="font-weight:bold;">Evaluation Type</td><td>${EVAL_LABEL[session.evaluationType]}</td></tr>
        <tr><td style="font-weight:bold;">Testing Mode</td><td>${session.mode === 'lab' ? 'Laboratory (Pattern Evaluation Mode B)' : 'Field (Verification Mode A)'}</td></tr>
        <tr><td style="font-weight:bold;">Applicant / Owner</td><td>${session.applicant || '—'}</td></tr>
        <tr><td style="font-weight:bold;">Testing Laboratory</td><td>${session.laboratory || '—'}</td></tr>
        <tr><td style="font-weight:bold;">Location</td><td>${session.testLocation || '—'}</td></tr>
        <tr><td style="font-weight:bold;">Testing Officer</td><td>${session.technicianName}</td></tr>
        <tr><td style="font-weight:bold;">Approving Officer</td><td>${session.reviewerName || '—'}</td></tr>
        <tr><td style="font-weight:bold;">Issued Timestamp</td><td>${fmtDateTime(report.createdAt)}</td></tr>
        <tr><td style="font-weight:bold;">MPE Governing Stage</td><td>${STAGE_LABEL[session.stage]}</td></tr>
      </table>

      <h2>2. Object / Instrument Specifications</h2>
      <table>
        <tr><td style="font-weight:bold; width:30%;">Manufacturer</td><td>${instrument.manufacturer}</td></tr>
        <tr><td style="font-weight:bold;">Model / Type Designation</td><td>${instrument.model}</td></tr>
        <tr><td style="font-weight:bold;">Serial Number</td><td>${instrument.serial}</td></tr>
        <tr><td style="font-weight:bold;">Instrument Category</td><td>${instrument.instrumentType}</td></tr>
        <tr><td style="font-weight:bold;">Accuracy Class</td><td>${classLabel(instrument.accuracyClass)}</td></tr>
        <tr><td style="font-weight:bold;">Capacity (Max / Min)</td><td>${instrument.max} ${instrument.unit} / ${instrument.min} ${instrument.unit}</td></tr>
        <tr><td style="font-weight:bold;">Intervals (e / d)</td><td>${instrument.e} ${instrument.unit} / ${instrument.d} ${instrument.unit}</td></tr>
        <tr><td style="font-weight:bold;">Resolution Scale (n = Max/e)</td><td>${verificationIntervals(instrument).toLocaleString()}</td></tr>
        <tr><td style="font-weight:bold;">Tare Mechanism</td><td>${instrument.tareType}</td></tr>
      </table>

      ${format === 'detailed' && (report.snapshot.evidence || session.evidence || []).length > 0 ? `
        <h2>2.1. Photographic Evidence & Physical Verification Dossier (OIML R 76-2 Annex)</h2>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%; font-size:11px; margin-bottom:14px;">
          ${(report.snapshot.evidence || session.evidence || []).map((ev: any, idx: number) => `
            <tr style="background-color:#f1f5f9;">
              <th colspan="2" style="background-color:#0b1f3a; color:white; text-align:left;">
                Figure ${idx + 1}: ${ev.kind.replace('_', ' ').toUpperCase()} — ${ev.caption || ev.fileName || 'Attached Photo'}
              </th>
            </tr>
            <tr>
              <td style="width:50%; text-align:center; padding:10px;">
                ${ev.dataUrl && (ev.mimeType?.startsWith('image/') || ev.dataUrl.startsWith('data:image/'))
                  ? `<img src="${ev.dataUrl}" alt="${ev.caption}" style="max-width:300px; max-height:200px; border:1px solid #cbd5e1; border-radius:4px;" />`
                  : `<div style="padding:20px; font-weight:bold; color:#475569;">[Attached Document: ${ev.fileName || 'Document'}]</div>`
                }
              </td>
              <td style="width:50%; vertical-align:top;">
                <p><strong>Category:</strong> ${ev.kind.replace('_', ' ')}</p>
                <p><strong>Description:</strong> ${ev.caption || '—'}</p>
                <p><strong>Source File:</strong> ${ev.fileName || 'Uploaded Photo'}</p>
                <p><strong>Recorded:</strong> ${new Date(ev.createdAt).toLocaleString()}</p>
              </td>
            </tr>
          `).join('')}
        </table>
      ` : ''}

      <h2>3. Metrological Test Evaluation Results</h2>
      ${resultsHtml}

      <h2>4. Digital Cryptographic Verification & Integrity</h2>
      <table>
        <tr><td style="font-weight:bold; width:30%;">SHA-256 Fingerprint</td><td><code>${shortFingerprint(report.integrityHash)}</code></td></tr>
        <tr><td style="font-weight:bold;">Verification UID</td><td>${report.verificationId}</td></tr>
        <tr><td style="font-weight:bold;">Governing Ruleset</td><td>${report.rulesetVersion}</td></tr>
        <tr><td style="font-weight:bold;">Computational Engine</td><td>${report.engineVersion} · ${report.templateVersion}</td></tr>
      </table>

      <p style="margin-top: 24px; font-size: 8pt; color: #64748b;">
        Official National Metrology Laboratory Document. Generated under OIML R 76-1 / R 76-2 statutory testing protocols.
      </p>
    </body>
    </html>
  `;

  const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.code}_${format === 'detailed' ? 'detailed_64page' : 'summary'}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}
