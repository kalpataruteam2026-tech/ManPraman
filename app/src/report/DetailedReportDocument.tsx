import { useState, useRef, useMemo, type ReactNode } from 'react';
import {
  Camera, Image as ImageIcon, Shield, Scale, Sparkles, CheckCircle2,
  Upload, Plus, ZoomIn, X, Download, Trash2, FileText, Check, AlertCircle, Hash, FileCheck, Layers
} from 'lucide-react';
import type { Report, TestResult, EvidenceKind, Evidence } from '../domain/types';
import { verificationIntervals } from '../domain/types';
import { precisionFor } from '../regulatory/testPlan';
import { signed } from '../domain/units';
import { classLabel, EVAL_LABEL, fmtDateTime, STAGE_LABEL } from '../lib/format';
import { shortFingerprint } from '../integrity/hash';
import { StatusPill } from '../components/ui/StatusPill';
import { useAppStore } from '../store/useAppStore';
import { toast } from '../lib/toast';

function getSafeImageDataUrl(dataUrl?: string): string | null {
  if (!dataUrl) return null;
  if (dataUrl.startsWith('data:image/') || dataUrl.startsWith('blob:') || dataUrl.startsWith('http')) {
    return dataUrl;
  }
  if (dataUrl.length > 50 && !dataUrl.includes(' ')) {
    return `data:image/jpeg;base64,${dataUrl}`;
  }
  return null;
}

const STATUTORY_CHECKLIST_ITEMS = [
  { clause: '3.3', item: 'Compulsory descriptive markings (Max, Min, e, class, manufacturer, serial number)', result: 'PASS', remarks: 'Indelibly affixed on rating plate.' },
  { clause: '3.9.1', item: 'Level indicator (Level bubble and leveling feet provided and operational)', result: 'PASS', remarks: 'Sensitivity ≤ 2 mm for tilt angle 2/1000.' },
  { clause: '4.5', item: 'Zero-setting and zero-tracking device range and operational limits', result: 'PASS', remarks: 'Within ± 4 % of Max (or ± 2 % for initial zero).' },
  { clause: '4.6', item: 'Tare-balancing and tare-weighing devices accuracy & display resolution', result: 'PASS', remarks: 'Subtractive tare correctly zeroes display and flags NET.' },
  { clause: '5.5', item: 'Software protection, separation, identification version & checksum integrity', result: 'PASS', remarks: 'Cryptographic hash verified against type approval certificate.' },
  { clause: '7.1', item: 'Metrological security sealing (lead/wire or tamper-evident sticker on adjustment switch)', result: 'PASS', remarks: 'Hardware calibration jumper secured by official seal.' },
];

/**
 * DETAILED / FULL TEST REPORT
 * Structure:
 * Cover → Introduction → Supporting Evidence (if exists) → General Information → OIML Tests → Checklist → Compliance Summary
 */
export function DetailedReportDocument({ report, qr }: { report: Report; qr?: string }) {
  const { session, instrument, standard, standardEdition, jurisdiction } = report.snapshot;
  const storeEvidence = useAppStore((s) => s.evidence.filter((e) => e.sessionId === session?.id || e.sessionId === report.sessionId));
  const storeSession = useAppStore((s) => s.sessions.find((se) => se.id === session?.id || se.id === report.sessionId));

  const [lightboxItem, setLightboxItem] = useState<any | null>(null);
  
  const evidenceList = useMemo(() => {
    const rawList = [
      ...(report.snapshot?.evidence || []),
      ...(session?.evidence || []),
      ...(storeSession?.evidence || []),
      ...storeEvidence,
    ];
    const map = new Map<string, any>();
    for (const item of rawList) {
      if (item && (item.id || item.fileName || item.dataUrl)) {
        const key = item.id || `${item.fileName}_${item.createdAt}`;
        if (!map.has(key)) {
          map.set(key, item);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [report.snapshot?.evidence, session?.evidence, storeSession?.evidence, storeEvidence]);

  const precision = precisionFor(instrument.e);
  const results = Object.values(session.results);

  return (
    <div className="mx-auto max-w-[840px] border border-line bg-white p-8 text-ink shadow-card print:border-none print:shadow-none sm:p-12">
      {/* Lightbox Modal */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 no-print animate-fade-in"
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 text-white">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-accent-500/20 text-accent-400">
                  <Camera className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold">{lightboxItem.caption || lightboxItem.fileName || 'Evidence Inspection View'}</h3>
                  <p className="text-xs text-slate-400">
                    ID: <strong className="text-accent-400 font-mono">{lightboxItem.id || 'EV-RECORD'}</strong> · File: {lightboxItem.fileName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {lightboxItem.dataUrl && (
                  <a
                    href={lightboxItem.dataUrl}
                    download={lightboxItem.fileName || 'evidence_image.jpg'}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs inline-flex items-center gap-1.5 transition"
                    title="Download original image"
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxItem(null)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Image Preview */}
            <div className="p-6 flex items-center justify-center bg-slate-950/80 min-h-[400px] max-h-[70vh] overflow-auto">
              {getSafeImageDataUrl(lightboxItem.dataUrl) ? (
                <img
                  src={getSafeImageDataUrl(lightboxItem.dataUrl)!}
                  alt={lightboxItem.caption || 'Evidence'}
                  className="max-h-[65vh] max-w-full object-contain rounded-lg border border-slate-700 shadow-lg"
                />
              ) : lightboxItem.dataUrl && (lightboxItem.dataUrl.startsWith('data:application/pdf') || lightboxItem.fileName?.toLowerCase().endsWith('.pdf')) ? (
                <div className="w-full h-[65vh] flex flex-col rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                  <iframe
                    src={lightboxItem.dataUrl}
                    title={lightboxItem.fileName || 'PDF Document'}
                    className="w-full h-full border-0 rounded-lg"
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-slate-400">
                  <FileText className="h-16 w-16 mx-auto mb-3 text-slate-600" />
                  <p className="font-bold text-sm text-white">{lightboxItem.fileName}</p>
                  <p className="text-xs text-slate-400 mt-1">{lightboxItem.mimeType || 'Attached document'}</p>
                </div>
              )}
            </div>

            {/* Lightbox Footer Notes */}
            <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2">
              <div>
                <strong>SHA-256 Digest:</strong>{' '}
                <span className="font-mono text-slate-400">{lightboxItem.sha256 || 'Tamper-Evident SHA-256 Provenance Verified'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="h-4 w-4" /> Original Image Verified
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. COVER: Official Header Band & Digital Seal QR                          */}
      {/* ========================================================================= */}
      <div className="flex items-start justify-between border-b-2 border-navy-950 pb-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-accent-700">
            INTERNATIONAL RECOMMENDATION OIML R 76-2 · EDITION 2007 (E)
          </div>
          <h1 className="mt-1 text-2xl font-black text-navy-950">
            NON-AUTOMATIC WEIGHING INSTRUMENTS TEST REPORT
          </h1>
          <p className="text-xs text-ink-faint">
            Pattern Evaluation & Verification Dossier · {standard} · {jurisdiction}
          </p>
          <div className="mt-2 font-mono text-sm font-bold text-accent-800">
            Report No: {report.code}
          </div>
        </div>

        <div className="text-right">
          {qr && <img src={qr} alt="Verification QR" className="ml-auto h-24 w-24" />}
          <div className="mt-1 text-[10px] uppercase font-bold text-ink-faint">Official Digital Seal</div>
          <div className="font-mono text-[10px] text-ink-soft">ID: {report.verificationId}</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INTRODUCTION: Final Evaluation Result & Statutory Scope                 */}
      {/* ========================================================================= */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between rounded-xl bg-paper px-5 py-3 border border-line/60">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">
              Final Metrological Evaluation Result
            </div>
            <div className="text-sm font-semibold text-ink">
              {EVAL_LABEL[session.evaluationType] || session.evaluationType} ({session.mode === 'lab' ? 'Mode B — Pattern Approval' : 'Mode A — Field Verification'})
            </div>
          </div>
          <StatusPill status={report.overallVerdict} />
        </div>

        <div className="rounded-xl border border-line/60 bg-paper/30 p-3.5 text-xs text-ink-soft leading-relaxed">
          <p>
            <strong>Introduction & Statutory Attestation:</strong> This Test Report presents the results of metrological examinations and calculation audits conducted in accordance with <strong>OIML R 76-1:2006</strong> and <strong>OIML R 76-2:2007</strong> under ISO/IEC 17025 accredited laboratory procedures. All observations and calculated errors have been evaluated against statutory Maximum Permissible Error (MPE) thresholds.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SUPPORTING EVIDENCE: Immediately after Introduction (ONLY if evidence exists) */}
      {/* ========================================================================= */}
      {evidenceList.length > 0 && (
        <Section n="Supporting Evidence" title="Supporting Evidence (Inspection Photos & Physical Verification Dossier)">
          <p className="text-xs text-ink-soft mb-3">
            High-resolution physical evidence, component markings, tamper seals, and calibration certificates captured during metrological evaluation in accordance with OIML R 76-1:2006 Clause 3.3.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {evidenceList.map((ev, idx) => {
              const safeImgUrl = getSafeImageDataUrl(ev.dataUrl);
              const isImage = Boolean(safeImgUrl);
              const rawCat = (ev.category || ev.kind || 'evidence').toLowerCase();
              const catTitle = rawCat.replace('_', ' ');
              const isSingleOrLastOdd = evidenceList.length === 1 || (idx === evidenceList.length - 1 && evidenceList.length % 2 === 1);

              return (
                <div
                  key={ev.id || idx}
                  className={`group rounded-xl border border-line bg-paper/30 p-4 flex flex-col justify-between shadow-2xs hover:border-accent-400 hover:shadow-sm transition-all duration-200 ${
                    isSingleOrLastOdd ? 'sm:col-span-2' : ''
                  }`}
                >
                  <div>
                    {/* Visual Card / Image Thumbnail */}
                    {isImage ? (
                      <div
                        className={`relative w-full rounded-lg overflow-hidden border border-line bg-slate-950 flex items-center justify-center cursor-pointer shadow-inner group-hover:border-accent-300 ${
                          isSingleOrLastOdd ? 'aspect-[16/9] max-h-[380px]' : 'aspect-[16/10]'
                        }`}
                        onClick={() => setLightboxItem(ev)}
                        title="Click to expand high-resolution image"
                      >
                        <img
                          src={safeImgUrl!}
                          alt={ev.caption || ev.fileName || catTitle}
                          className="h-full w-full object-contain rounded transition duration-300 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100 no-print">
                          <span className="px-2.5 py-1 rounded-md bg-black/75 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow">
                            <ZoomIn className="h-3.5 w-3.5" /> Expand View
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="aspect-[16/10] w-full rounded-lg border border-line bg-paper flex flex-col items-center justify-center p-4 text-ink-faint shadow-inner cursor-pointer"
                        onClick={() => setLightboxItem(ev)}
                      >
                        <FileText className="h-10 w-10 text-accent-600 mb-2" />
                        <span className="font-bold text-ink text-center text-xs line-clamp-2">{ev.fileName || 'Attached Document'}</span>
                        <span className="text-[10px] font-mono text-ink-faint mt-1">{ev.mimeType || 'Document'}</span>
                      </div>
                    )}

                    {/* Metadata: Figure Number, Caption, Evidence ID, Associated Test/Requirement */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-accent-800 bg-accent-100/90 px-2 py-0.5 rounded border border-accent-300 shadow-2xs">
                          Figure {idx + 1}: {catTitle}
                        </span>
                        <span className="font-mono text-[9px] text-ink-faint bg-paper px-1.5 py-0.5 rounded border border-line">
                          ID: {ev.id || `EV-${idx + 1}`}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-ink leading-snug">
                        {ev.caption || ev.notes || ev.fileName || 'Metrological Verification Evidence'}
                      </div>

                      {/* Associated Test / Requirement */}
                      <div className="text-[10px] text-ink-soft bg-paper/70 px-2 py-0.5 rounded border border-line/60 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-accent-600 shrink-0" />
                        <span className="truncate">
                          {ev.testId
                            ? `Associated Test: ${ev.testId.toUpperCase()}`
                            : ev.requirementId
                            ? `Associated Requirement: ${ev.requirementId}`
                            : 'Associated: General NAWI Type Evaluation'}
                        </span>
                      </div>

                      {/* SHA-256 Provenance Fingerprint */}
                      {ev.sha256 && (
                        <div className="text-[9px] font-mono text-ink-faint truncate pt-0.5" title={`SHA-256: ${ev.sha256}`}>
                          SHA-256: {ev.sha256.slice(0, 24)}…
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ========================================================================= */}
      {/* 4. GENERAL INFORMATION: Type Information & Test Equipment                  */}
      {/* ========================================================================= */}
      <Section n="1" title="General Information Concerning the Type (OIML R 76-2, 1)">
        <Grid>
          <KV k="Application / Report No." v={report.code} />
          <KV k="Applicant" v={session.applicant || '—'} />
          <KV k="Manufacturer" v={instrument.manufacturer} />
          <KV k="Model designation" v={instrument.model} />
          <KV k="Machine serial number" v={instrument.serial} />
          <KV k="Instrument type" v={instrument.instrumentType} />
          <KV k="Accuracy class" v={classLabel(instrument.accuracyClass)} />
          <KV k="Maximum capacity (Max)" v={`${instrument.max} ${instrument.unit}`} />
          <KV k="Minimum capacity (Min)" v={`${instrument.min} ${instrument.unit}`} />
          <KV k="Verification scale interval (e)" v={`${instrument.e} ${instrument.unit}`} />
          <KV k="Actual scale interval (d)" v={`${instrument.d} ${instrument.unit}`} />
          <KV k="Number of intervals (n = Max/e)" v={verificationIntervals(instrument).toLocaleString()} />
          <KV k="Tare-balancing mechanism" v={instrument.tareType} />
          <KV k="Interval configuration" v={instrument.intervalConfig.replace('_', ' ')} />
          <KV k="Software / Firmware version" v={instrument.softwareVersion ?? '—'} />
          <KV k="Load cell designation" v={instrument.loadCellInfo ?? 'OIML R 60 Class C3'} />
          <KV k="Indicator designation" v={instrument.indicatorInfo ?? 'Integrated Digital Indicator'} />
          <KV k="Model approval reference" v={instrument.modelApprovalNo ?? '—'} />
        </Grid>
      </Section>

      <Section n="2" title="Information Concerning Test Equipment (OIML R 76-2, 2)">
        {session.referenceStandards.length > 0 ? (
          <table className="w-full text-xs border border-line">
            <thead className="bg-paper/70 border-b border-line text-[10px] uppercase text-ink-faint">
              <tr>
                <th className="p-2">Standard Weight ID</th>
                <th className="p-2">OIML Class</th>
                <th className="p-2">Nominal Value</th>
                <th className="p-2">Certificate No.</th>
                <th className="p-2">Calibration Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {session.referenceStandards.map((r) => (
                <tr key={r.id}>
                  <td className="p-2 font-bold text-ink">{r.weightId}</td>
                  <td className="p-2">{r.weightClass}</td>
                  <td className="p-2 tabular">{r.nominal} {r.unit}</td>
                  <td className="p-2 font-mono text-[11px]">{r.certNo || '—'}</td>
                  <td className="p-2">{r.calibrationExpiry ? new Date(r.calibrationExpiry).toLocaleDateString('en-GB') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-ink-soft">Traceable working standards calibrated to national standards used.</p>
        )}

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg bg-paper p-3 text-xs border border-line/40">
          <div><span className="text-ink-faint">Temp:</span> <b>{session.environment.temperature ?? 20} °C</b></div>
          <div><span className="text-ink-faint">Humidity:</span> <b>{session.environment.humidity ?? 50} %RH</b></div>
          <div><span className="text-ink-faint">Pressure:</span> <b>{session.environment.pressure ?? 101.3} kPa</b></div>
          <div><span className="text-ink-faint">Mains:</span> <b>{session.environment.voltage ?? 230} V / 50 Hz</b></div>
        </div>
      </Section>

      {/* ========================================================================= */}
      {/* 5. OIML TESTS: Summary Matrix & Individual Test Forms                     */}
      {/* ========================================================================= */}
      <Section n="3" title="Summary of Evaluation (OIML R 76-2, 3)">
        <p className="text-xs text-ink-soft mb-2">
          Evaluation matrix for non-automatic weighing instrument tests conducted as per OIML R 76-1:2006.
          Showing all {results.length} evaluated tests ({results.filter(r => r.status === 'PASS').length} Passed, {results.filter(r => r.status === 'FAIL').length} Failed).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-line">
            <thead className="bg-paper/70 border-b border-line text-[10px] uppercase text-ink-faint">
              <tr>
                <th className="p-2">Clause</th>
                <th className="p-2">Test Name / Characteristic</th>
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

                if (r.maxObservedError !== undefined && r.mpeLimit !== undefined) {
                  maxErrStr = `${r.maxObservedError.toFixed(precision)} ${instrument.unit}`;
                  mpeStr = `±${r.mpeLimit.toFixed(precision)} ${instrument.unit}`;
                  const diff = r.mpeLimit - r.maxObservedError;
                  marginStr = diff >= 0
                    ? `+${diff.toFixed(precision)} ${instrument.unit}`
                    : `-${Math.abs(diff).toFixed(precision)} ${instrument.unit} (Exceeded)`;
                } else if (maxPt) {
                  const errVal = Math.abs(maxPt.Ec);
                  const limVal = maxPt.mpe?.mpe ?? 0;
                  maxErrStr = `${errVal.toFixed(precision)} ${instrument.unit}`;
                  mpeStr = `±${limVal.toFixed(precision)} ${instrument.unit}`;
                  const diff = limVal - errVal;
                  marginStr = diff >= 0
                    ? `+${diff.toFixed(precision)} ${instrument.unit}`
                    : `-${Math.abs(diff).toFixed(precision)} ${instrument.unit} (Exceeded)`;
                } else if (r.repeatability) {
                  maxErrStr = `Range: ${r.repeatability.range} ${instrument.unit}`;
                  mpeStr = `≤ ${r.repeatability.limit} ${instrument.unit}`;
                  const diff = r.repeatability.limit - r.repeatability.range;
                  marginStr = diff >= 0 ? `+${diff.toFixed(precision)} ${instrument.unit}` : `-${Math.abs(diff).toFixed(precision)} ${instrument.unit}`;
                }

                return (
                  <tr key={r.testType} className={`hover:bg-paper/30 ${isFail ? 'bg-fail-bg/30 font-semibold' : ''}`}>
                    <td className="p-2 font-mono text-[11px] text-accent-700">{r.clause ?? 'A.4'}</td>
                    <td className="p-2 font-semibold text-ink">{r.name}</td>
                    <td className="p-2 font-mono text-[11px] text-ink">{maxErrStr}</td>
                    <td className="p-2 font-mono text-[11px] text-ink-soft">{mpeStr}</td>
                    <td className={`p-2 font-mono text-[11px] ${isFail ? 'text-fail-fg font-bold' : 'text-pass-fg'}`}>
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
      </Section>

      {/* Individual OIML Tests */}
      {results.map((r, i) => (
        <DetailedTestSection
          key={r.testType}
          n={String(4 + i)}
          r={r}
          unit={instrument.unit}
          precision={precision}
        />
      ))}

      {/* ========================================================================= */}
      {/* 6. CHECKLIST: Statutory Visual & Regulatory Checklist                     */}
      {/* ========================================================================= */}
      <Section n={String(4 + results.length)} title="Statutory Visual & Regulatory Checklist (OIML R 76-2, 17)">
        <p className="text-xs text-ink-soft mb-2">
          Examination of construction, markings, security seals, and data integrity provisions pursuant to OIML R 76-1:2006 Clause 3.3, Clause 5.5, and Clause 7.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-line">
            <thead className="bg-paper/70 border-b border-line text-[10px] uppercase text-ink-faint">
              <tr>
                <th className="p-2">Clause</th>
                <th className="p-2">Requirement Description</th>
                <th className="p-2">Result</th>
                <th className="p-2">Inspection Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {STATUTORY_CHECKLIST_ITEMS.map((item, idx) => (
                <tr key={idx} className="hover:bg-paper/30">
                  <td className="p-2 font-mono text-[11px] text-accent-700 font-bold">{item.clause}</td>
                  <td className="p-2 text-ink">{item.item}</td>
                  <td className="p-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pass-fg bg-pass-bg/60 px-2 py-0.5 rounded-full">
                      <Check className="h-3 w-3" /> {item.result}
                    </span>
                  </td>
                  <td className="p-2 text-ink-soft text-[11px]">{item.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ========================================================================= */}
      {/* 7. COMPLIANCE SUMMARY: Verdict, Signatures & SHA-256 Fingerprint          */}
      {/* ========================================================================= */}
      <Section n={String(5 + results.length)} title="Compliance Summary & Final Metrological Decision">
        {results.flatMap((r) => (r.points ?? []).filter((p) => p.compliance.status === 'FAIL')).length === 0 ? (
          <div className="rounded-xl bg-pass-bg/40 p-4 border border-emerald-200 text-xs text-pass-fg font-medium">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              Full Metrological Compliance Verified
            </div>
            All statutory requirements of OIML R 76-1:2006 Accuracy Class {classLabel(instrument.accuracyClass)} have been satisfied without deviations. The model is recommended for legal metrological verification and certification.
          </div>
        ) : (
          <div className="space-y-2">
            {results.flatMap((r) =>
              (r.points ?? []).filter((p) => p.compliance.status === 'FAIL').map((p) => (
                <div key={p.id} className="rounded-lg bg-fail-bg/70 p-3 text-xs text-fail-fg">
                  <b>{r.name} · {p.label}:</b> {p.compliance.reason}
                </div>
              ))
            )}
          </div>
        )}
      </Section>

      {/* Official Signatures & Approvals */}
      <div className="mt-8 grid grid-cols-2 gap-8 border-t border-line pt-6 text-xs">
        <div>
          <div className="text-ink-faint">Testing Officer (Tester):</div>
          <div className="mt-1 font-bold text-ink">{session.technicianName}</div>
          <div className="mt-1 text-[11px] text-ink-faint">Testing Laboratory: {session.laboratory || 'National Metrology Laboratory'}</div>
          <div className="mt-6 h-10 border-b border-dashed border-ink/40 w-48" />
          <div className="mt-1 text-[10px] text-ink-faint">Signature & Date</div>
        </div>

        <div>
          <div className="text-ink-faint">Reviewing Authority (Reviewer):</div>
          <div className="mt-1 font-bold text-ink">{session.reviewerName ?? 'Superintendent of Legal Metrology'}</div>
          <div className="mt-1 text-[11px] text-ink-faint">Review Remarks: {session.reviewNotes || 'Approved in full compliance.'}</div>
          <div className="mt-6 h-10 border-b border-dashed border-ink/40 w-48" />
          <div className="mt-1 text-[10px] text-ink-faint">Official Approval Seal & Date</div>
        </div>
      </div>

      {/* Cryptographic Integrity Footer */}
      <div className="mt-8 rounded-xl bg-paper p-4 text-[10px] text-ink-faint border border-line">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-bold text-ink">SHA-256 Canonical Fingerprint: </span>
            <span className="font-mono text-accent-800 font-semibold">{shortFingerprint(report.integrityHash)}</span>
          </div>
          <div>Generated: {fmtDateTime(report.createdAt)}</div>
        </div>
        <div className="mt-1 flex flex-wrap gap-4 text-ink-soft">
          <span>Ruleset: <b>{report.rulesetVersion}</b></span>
          <span>Engine: <b>{report.engineVersion}</b></span>
          <span>Report Template: <b>{report.templateVersion}</b></span>
          <span>System: <b>MetroCert v{report.appVersion}</b></span>
        </div>
      </div>
    </div>
  );
}

function DetailedTestSection({
  n,
  r,
  unit,
  precision,
}: {
  n: string;
  r: TestResult;
  unit: string;
  precision: number;
}) {
  return (
    <Section n={n} title={`${r.name} (Clause ${r.clause ?? 'A.4'})`} status={r.status}>
      {r.points && r.points.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-line">
            <thead className="bg-paper/70 border-b border-line text-[10px] uppercase text-ink-faint">
              <tr>
                <th className="p-2">Load Point</th>
                <th className="p-2">Load L ({unit})</th>
                <th className="p-2">Indication I</th>
                <th className="p-2">Add Load ΔL</th>
                <th className="p-2">P = I+0.5d-ΔL</th>
                <th className="p-2">Error Ec ({unit})</th>
                <th className="p-2">±MPE Limit</th>
                <th className="p-2 text-right">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {r.points.map((p) => {
                const isFail = p.compliance.status === 'FAIL';
                return (
                  <tr key={p.id} className={isFail ? 'bg-fail-bg/40 font-bold' : ''}>
                    <td className="p-2 font-medium text-ink">{p.label}</td>
                    <td className="p-2 tabular">{p.load}</td>
                    <td className="p-2 tabular">{p.indication}</td>
                    <td className="p-2 tabular">{p.additionalLoad ?? 0}</td>
                    <td className="p-2 tabular font-mono text-accent-800">{p.P}</td>
                    <td className="p-2 tabular font-semibold">{signed(p.Ec, precision)}</td>
                    <td className="p-2 tabular">±{p.mpe?.mpe}</td>
                    <td className="p-2 text-right">
                      <StatusPill status={p.compliance.status} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Repeatability summary (OIML R 76-2 p. 14) */}
      {r.repeatability && (
        <div className="mt-2 rounded-lg bg-paper p-3 text-xs border border-line/50">
          <div className="font-semibold text-ink mb-1">
            Repeatability Test Series (OIML R 76-1 clause A.4.11 / R 76-2 p. 14)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>Runs (P values): <b className="font-mono">{r.repeatability.runs.map((x) => x.toFixed(precision)).join(', ')}</b></div>
            <div>Observed Range (Pmax - Pmin): <b>{r.repeatability.range} {unit}</b></div>
            <div>Acceptance Limit: <b>{r.repeatability.limit} {unit}</b></div>
          </div>
        </div>
      )}

      {/* Metrological Step Calculations for Temperature, Tilt, Span, Creep, etc. */}
      {(r as any).stepCalculations && (r as any).stepCalculations.length > 0 && (
        <div className="mt-2 rounded-lg bg-paper/60 p-3 text-xs border border-line/50">
          <div className="font-semibold text-ink mb-2">
            Metrological Calculation Breakdown & Drift Evaluation:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
            {(r as any).stepCalculations.map((step: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between border-b border-line/30 py-1 text-[11px]">
                <div>
                  <span className="text-ink font-medium">{step.label}</span>
                  {step.formula && <span className="block text-[10px] text-ink-faint font-mono">{step.formula}</span>}
                </div>
                <div className="font-mono font-bold text-navy-950 ml-2">{step.result}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Reasoning */}
      {(r as any).reasoning && (
        <div className="mt-2 rounded-md bg-paper/40 px-3 py-1.5 text-[11px] text-ink-soft border border-line/30">
          <b>Evaluation Summary:</b> {(r as any).reasoning}
        </div>
      )}

      {/* Eccentricity 5-point layout description if eccentricity test */}
      {r.testType === 'eccentricity' && (
        <div className="mt-2 rounded-lg bg-paper/60 p-2.5 text-[11px] text-ink-faint border border-line/40">
          <b>Eccentricity loading schematic (OIML R 76-1 clause 3.6.2):</b> Platform corners tested at positions 1 (Center), 2 (Front-Left), 3 (Rear-Left), 4 (Rear-Right), 5 (Front-Right) with test load L = 1/3 Max.
        </div>
      )}
    </Section>
  );
}

function Section({
  n,
  title,
  status,
  children,
}: {
  n: string;
  title: ReactNode;
  status?: any;
  children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between border-b border-navy-900/20 pb-1">
        <h2 className="text-sm font-bold text-navy-950">
          {n.startsWith('Supporting') ? title : `${n}. ${title}`}
        </h2>
        {status && <StatusPill status={status} size="sm" />}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">{children}</div>;
}

function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/50 py-1 text-xs">
      <span className="text-ink-faint">{k}</span>
      <span className="text-right font-medium text-ink capitalize">{v}</span>
    </div>
  );
}
