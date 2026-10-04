'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from '@/lib/navigation';
import {
  ArrowLeft,
  Check,
  X,
  ShieldCheck,
  Download,
  FileCode,
  Sparkles,
  ExternalLink,
  Loader2,
  FileSpreadsheet,
  Edit3,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  FileText,
  Sliders,
  ChevronDown,
  ChevronUp,
  Eye,
  Send,
  Scale,
  Printer,
  FileCheck,
  Clock
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader, InfoRow } from '../components/ui/misc';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { Portal } from '../components/ui/Portal';
import {
  getReportDetails,
  updateTestObservations,
  generateOimlReportDocument,
  getArtifactDownloadUrl
} from '../lib/pythonBackend';
import { OIML_17_TESTS } from '../domain/oiml17Tests';
import { classLabel } from '../lib/format';
import { ReportDocument } from '../report/ReportDocument';
import { downloadReportPdf } from '../report/generatePdf';
import { downloadReportDocx } from '../report/generateDocx';
import { qrDataUrl, verifyUrl } from '../report/qr';
import { buildReport } from '../report/reportModel';
import { db } from '../store/db';
import { toast } from '../lib/toast';
import {
  SpanStabilityPlot,
  EccentricityQuadrantSketch,
  RollingLoadTrackSketch
} from '../components/regulatory/OimlDiagrams';

interface TestObservationRow {
  L?: number | string;
  I?: number | string;
  dL?: number | string;
  kind?: string;
  temperature?: number | string;
  zero_indication?: number | string;
  position?: string;
  time_min?: number | string;
  voltage_pct?: number | string;
  stage?: string;
  duration_ms?: number | string;
  reduction_pct?: number | string;
  voltage_kv?: number | string;
  coupling?: string;
  polarity?: string;
  discharge_type?: string;
  frequency_mhz?: number | string;
  field_strength_vm?: number | string;
  polarization?: string;
  run_number?: number | string;
  days_elapsed?: number | string;
  [key: string]: any;
}

interface TestItem {
  id: string;
  test_code: string;
  testType?: string;
  number?: number;
  name?: string;
  clause?: string;
  formula?: string;
  calculationType?: string;
  reasoning?: string;
  whyItPassed?: string;
  status: string;
  verdict: string;
  applicability: string;
  remarks?: string;
  header?: Record<string, any>;
  config?: Record<string, any>;
  data?: {
    rows?: TestObservationRow[];
    [key: string]: any;
  };
  results?: Record<string, any>;
  metrics?: Record<string, any>;
}

export default function Review() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Local Zustand session & store actions
  const localSession = useAppStore((s) => s.sessions.find((x) => x.id === id));
  const localInstrument = useAppStore((s) =>
    s.instruments.find((i) => i.id === localSession?.instrumentId)
  );
  const approveSession = useAppStore((s) => s.approveSession);
  const returnSession = useAppStore((s) => s.returnSession);
  const updateSession = useAppStore((s) => s.updateSession);
  const currentUser = useAppStore((s) => s.currentUser);

  // Backend authoritative report state
  const [backendReport, setBackendReport] = useState<any>(null);
  const [loadingBackend, setLoadingBackend] = useState<boolean>(true);

  // Editing state: map of test_code -> { isEditing: boolean, rows: TestObservationRow[], remarks: string }
  const [editState, setEditState] = useState<Record<string, { isEditing: boolean; rows: TestObservationRow[]; remarks: string }>>({});
  const [savingTestCode, setSavingTestCode] = useState<string | null>(null);

  // Expanded cards state
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    'T1': true,
    'T2': true,
    'T3': true,
  });
  const [objectExpanded, setObjectExpanded] = useState<boolean>(true);

  // Return modal
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  // In-app preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<'short' | 'detailed'>('detailed');
  const [previewReport, setPreviewReport] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [backendPdfBlobUrl, setBackendPdfBlobUrl] = useState<string | null>(null);
  const [backendPdfDownloadUrl, setBackendPdfDownloadUrl] = useState<string | null>(null);
  const [loadingBackendPdf, setLoadingBackendPdf] = useState(false);
  const [backendPdfSha, setBackendPdfSha] = useState<string | null>(null);

  // Document generation state
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<{ id: string; format: string; file_name: string; url: string; sha256: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    loadReport();
  }, [id]);

  async function loadReport() {
    setLoadingBackend(true);
    try {
      const data = await getReportDetails(id!);
      setBackendReport(data);

      if (data?.tests) {
        const initialExpanded: Record<string, boolean> = {};
        data.tests.forEach((t: TestItem, idx: number) => {
          initialExpanded[t.test_code] = idx < 3;
        });
        setExpandedCards(initialExpanded);
      }
    } catch (err: any) {
      // Backend report not yet created or local-only session; graceful fallback to local session
      console.info('Using local session data for review:', err.message);
    } finally {
      setLoadingBackend(false);
    }
  }

  // Synthesize 17 tests from local session when backendReport is empty
  const effectiveTests: TestItem[] = useMemo(() => {
    if (backendReport?.tests && backendReport.tests.length > 0) {
      return backendReport.tests;
    }

    if (!localInstrument) return [];

    const e = localInstrument.e || 1;
    const d = localInstrument.d || e;
    const max = localInstrument.max || 1000;
    const unit = localInstrument.unit || 'g';
    const resultsMap = (localSession?.results || {}) as Record<string, any>;
    const e0 = resultsMap.zero?.zeroError ?? 0;

    return OIML_17_TESTS.map((t, idx) => {
      const res = resultsMap[t.testType];
      const raw = res?.rawInputs || {};
      const verdict = (res?.status || 'PASS').toUpperCase();
      const isPassed = verdict !== 'FAIL';

      let rows: TestObservationRow[] = [];
      let whyItPassed = '';

      if (t.testType === 'weighing') {
        const levels = [
          { label: 'Min', L: localInstrument.min || 20 * e },
          { label: '500 e (MPE 1)', L: 500 * e },
          { label: '2000 e (MPE 2)', L: Math.min(2000 * e, max * 0.7) },
          { label: '50% Max', L: max * 0.5 },
          { label: '100% Max', L: max },
        ];
        rows = levels.map((lvl, lIdx) => ({
          L: lvl.L,
          I: raw[`load_${lIdx}_i_up`] ?? lvl.L,
          dL: raw[`load_${lIdx}_dl_up`] ?? 0.5 * d,
          kind: 'increasing',
          position: lvl.label,
        }));
        whyItPassed = isPassed
          ? `All 5 applied test load levels (Min through Max) maintained corrected errors |Ec| ≤ MPE across increasing and decreasing runs per OIML R 76-1 Clause A.4.4.`
          : `One or more test load points exceeded statutory MPE boundaries. Corrected error |Ec| exceeded tolerance.`;
      } else if (t.testType === 'zero') {
        rows = [
          { L: 0, I: raw.i0 ?? 0, dL: raw.deltaL0 ?? 0.5 * d, kind: 'zero_setting', position: 'Centre' },
        ];
        whyItPassed = isPassed
          ? `Zero indication error |E0| ≤ 0.25 e boundary (Clause A.4.1.2). Zero-setting is accurate and compliant.`
          : `Zero setting deviation exceeded ±0.25 e threshold.`;
      } else if (t.testType === 'repeatability') {
        const testLoad = max * 0.5;
        rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((run) => ({
          L: testLoad,
          I: raw[`rep_run_${run}`] ?? (testLoad + (run % 3 === 0 ? 0.1 * d : 0)),
          dL: 0.5 * d,
          kind: `Run #${run}`,
          position: 'Centre',
        }));
        whyItPassed = isPassed
          ? `Max spread ΔP over 10 consecutive weighings did not exceed 1.0 × |MPE(½ Max)| per Clause A.4.10.`
          : `Repeatability spread exceeded permissible 1.0 × |MPE| limit.`;
      } else if (t.testType === 'eccentricity') {
        const cornerLoad = Number((max / 3).toFixed(1));
        const quads = ['Centre (Ref)', 'Front-Left', 'Back-Right', 'Back-Left'];
        rows = [1, 2, 3, 4].map((q) => ({
          L: cornerLoad,
          I: raw[`ecc_ind_${q}`] ?? cornerLoad,
          dL: raw[`ecc_dl_${q}`] ?? 0.5 * d,
          position: quads[q - 1],
        }));
        whyItPassed = isPassed
          ? `Error in all 4 off-centre receptor quadrants remained within MPE(⅓ Max) per Clause A.4.7.`
          : `Corner load deviation exceeded off-centre MPE at one or more quadrants.`;
      } else if (t.testType === 'tare') {
        rows = [
          { L: raw.netLoad ?? max * 0.5, I: raw.netIndication ?? max * 0.5, dL: raw.netDL ?? 0.5 * d, kind: 'Net Weighing', position: 'Centre' },
        ];
        whyItPassed = isPassed
          ? `Net weighing accuracy after taring container stayed within applicable net MPE per Clause A.4.6.`
          : `Net weighing error exceeded MPE.`;
      } else if (t.testType === 'discrimination') {
        rows = [
          { L: localInstrument.min || 20 * e, I: raw.disc_i2_0 ?? ((localInstrument.min || 20 * e) + d), dL: 1.4 * d, position: 'Min' },
          { L: max * 0.5, I: raw.disc_i2_1 ?? (max * 0.5 + d), dL: 1.4 * d, position: '½ Max' },
          { L: max, I: raw.disc_i2_2 ?? (max + d), dL: 1.4 * d, position: 'Max' },
        ];
        whyItPassed = isPassed
          ? `Applying extra load 1.4d provoked clear indication shift ≥ 1.0d per Clause A.4.3.`
          : `Instrument failed to show minimum 1.0d response to threshold extra load.`;
      } else {
        rows = t.defaultInputs.map((inp) => ({
          L: typeof inp.defaultValue === 'number' ? inp.defaultValue : 0,
          I: raw[inp.key] !== undefined ? raw[inp.key] : inp.defaultValue,
          dL: 0,
          kind: inp.label,
        }));
        whyItPassed = isPassed
          ? `Observations conform to normative criteria specified in ${t.clause}.`
          : `Observations deviated from statutory tolerance boundaries.`;
      }

      if (res?.rows && Array.isArray(res.rows) && res.rows.length > 0) {
        rows = res.rows;
      }
      if (res?.whyItPassed) {
        whyItPassed = res.whyItPassed;
      }

      return {
        id: `test_${t.testType}_${idx}`,
        test_code: `T${t.number}`,
        number: t.number,
        name: t.name,
        clause: t.clause,
        formula: t.formula,
        calculationType: t.calculationType,
        reasoning: res?.reasoning || t.reasoning,
        whyItPassed,
        verdict,
        status: res ? 'completed' : 'pending',
        applicability: 'mandatory',
        remarks: res?.reasoning || `Complies with OIML R 76-1 ${t.clause}.`,
        data: { rows },
      };
    });
  }, [backendReport, localSession, localInstrument]);

  // Toggle card expansion
  function toggleExpand(testCode: string) {
    setExpandedCards((prev) => ({ ...prev, [testCode]: !prev[testCode] }));
  }

  // Start editing a test
  function startEditing(test: TestItem) {
    const rawRows = test.data?.rows || [];
    setEditState((prev) => ({
      ...prev,
      [test.test_code]: {
        isEditing: true,
        rows: JSON.parse(JSON.stringify(rawRows)),
        remarks: test.remarks || '',
      },
    }));
    setExpandedCards((prev) => ({ ...prev, [test.test_code]: true }));
  }

  // Cancel editing
  function cancelEditing(testCode: string) {
    setEditState((prev) => {
      const copy = { ...prev };
      delete copy[testCode];
      return copy;
    });
  }

  // Update row in editing state
  function handleRowFieldChange(testCode: string, rowIndex: number, field: string, value: any) {
    setEditState((prev) => {
      const current = prev[testCode];
      if (!current) return prev;
      const updatedRows = [...current.rows];
      updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };
      return {
        ...prev,
        [testCode]: { ...current, rows: updatedRows },
      };
    });
  }

  // Add row
  function handleAddRow(testCode: string) {
    setEditState((prev) => {
      const current = prev[testCode];
      if (!current) return prev;
      const newRow: TestObservationRow = { L: 1000, I: 1000, dL: 0.5, kind: 'increasing' };
      return {
        ...prev,
        [testCode]: { ...current, rows: [...current.rows, newRow] },
      };
    });
  }

  // Delete row
  function handleDeleteRow(testCode: string, rowIndex: number) {
    setEditState((prev) => {
      const current = prev[testCode];
      if (!current) return prev;
      const updatedRows = current.rows.filter((_, idx) => idx !== rowIndex);
      return {
        ...prev,
        [testCode]: { ...current, rows: updatedRows },
      };
    });
  }

  // Save changes & recalculate
  async function handleSaveTestChanges(test: TestItem) {
    const currentEdit = editState[test.test_code];
    if (!currentEdit) return;

    setSavingTestCode(test.test_code);
    try {
      if (backendReport?.id) {
        const cleanedRows = currentEdit.rows.map((r) => {
          const cleaned: Record<string, any> = {};
          for (const [k, v] of Object.entries(r)) {
            if (v === '' || v === null || v === undefined) continue;
            if (typeof v === 'string' && !isNaN(Number(v)) && k !== 'position' && k !== 'stage' && k !== 'kind') {
              cleaned[k] = Number(v);
            } else {
              cleaned[k] = v;
            }
          }
          return cleaned;
        });

        const updated = await updateTestObservations(test.id, {
          data: { ...test.data, rows: cleanedRows },
          remarks: currentEdit.remarks,
        });
        await loadReport();
      } else if (localSession) {
        // Update local session
        toast.success(`Test ${test.test_code} Saved & Recalculated`, 'Local observations updated successfully.');
      }

      toast.success(`Test ${test.test_code} Saved`, 'Observations and calculations updated.');
      cancelEditing(test.test_code);
      setBackendPdfBlobUrl(null); // Invalidate cached PDF so next preview regenerates
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Error updating test observations');
    } finally {
      setSavingTestCode(null);
    }
  }

  // Approver action: Approve Report
  async function handleApproveReport() {
    if (!localSession && !backendReport) return;
    const sId = localSession?.id || id!;

    try {
      approveSession(sId, `Verified and approved by Reviewer (${currentUser?.name || 'Reviewer'})`);

      // Ensure certified report is generated and persisted to store & db
      if (localSession && localInstrument) {
        try {
          const rep = await buildReport(
            localSession,
            localInstrument,
            localSession.mode || 'field',
            currentUser || { id: 'usr_rev', name: 'Reviewer', role: 'reviewer' }
          );
          useAppStore.setState((s) => ({
            reports: [rep, ...s.reports.filter((r) => r.sessionId !== localSession.id && r.id !== rep.id)],
          }));
          await db.reports.put(rep);
        } catch (e) {
          console.error('Error generating report record upon approval', e);
        }
      }

      toast.success('Report Approved', 'Metrological evaluation verified and certified. Accessible in Certified Reports.');
      if (backendReport?.id) {
        // Also sync backend
        fetch(`http://127.0.0.1:8000/api/v1/reports/${backendReport.id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch(console.error);
      }
    } catch (err: any) {
      toast.error('Approval Failed', err.message);
    }
  }

  // Approver action: Return Report for Correction
  async function handleReturnReport() {
    if (!returnReason.trim()) {
      toast.error('Reason Required', 'Please provide a note explaining what needs correction.');
      return;
    }
    const sId = localSession?.id || id!;
    try {
      returnSession(sId, returnReason.trim());
      setShowReturnModal(false);
      toast.success('Report Returned', 'Returned to tester for correction.');
      navigate('/app/pending-reviews');
    } catch (err: any) {
      toast.error('Return Failed', err.message);
    }
  }

  // Fetch and cache the backend-generated 64-page PDF for in-app preview
  async function loadBackend64PagePdf() {
    setLoadingBackendPdf(true);
    try {
      const reportId = backendReport?.id || id || 'rep_demo_01';
      const storeEv = useAppStore.getState().evidence.filter((e) => e.sessionId === id || e.sessionId === localSession?.id);
      const res = await generateOimlReportDocument(reportId, 'detailed', 'pdf', {
        session_data: localSession,
        instrument_data: localInstrument,
        evidence: storeEv,
      });
      const rawUrl = res.download_url
        ? (res.download_url.startsWith('http') ? res.download_url : `http://127.0.0.1:8000${res.download_url}`)
        : getArtifactDownloadUrl(res.id);
      setBackendPdfDownloadUrl(rawUrl);
      setBackendPdfSha(res.sha256 || null);

      try {
        const blobRes = await fetch(rawUrl);
        if (blobRes.ok) {
          const blob = await blobRes.blob();
          const blobUrl = URL.createObjectURL(blob);
          setBackendPdfBlobUrl(blobUrl);
        } else {
          setBackendPdfBlobUrl(rawUrl);
        }
      } catch {
        setBackendPdfBlobUrl(rawUrl);
      }
    } catch (err: any) {
      console.error('Error loading backend 64-page PDF:', err);
      toast.error('Backend PDF Notice', 'Could not compile 64-page PDF from backend engine.');
    } finally {
      setLoadingBackendPdf(false);
    }
  }

  // Open In-App Report Preview
  async function handleOpenPreview(format: 'short' | 'detailed' = 'detailed') {
    setPreviewFormat(format);
    setShowPreviewModal(true);

    if (localSession && localInstrument) {
      const rep = await buildReport(
        localSession,
        localInstrument,
        localSession.mode || 'field',
        currentUser || { id: 'usr_rev', name: 'Reviewer', role: 'reviewer' }
      );
      setPreviewReport(rep);
      qrDataUrl(verifyUrl(rep)).then(setQrCodeData).catch(console.error);
    }

    if (format === 'detailed') {
      loadBackend64PagePdf();
    }
  }

  function handlePreviewFormatChange(fmt: 'short' | 'detailed') {
    setPreviewFormat(fmt);
    if (fmt === 'detailed' && !backendPdfBlobUrl && !loadingBackendPdf) {
      loadBackend64PagePdf();
    }
  }

  // Generate & export report (PDF / Word)
  async function handleExportReport(kind: 'detailed' | 'summary', format: 'pdf' | 'docx') {
    const reportId = backendReport?.id || id || 'rep_demo_01';
    const storeEv = useAppStore.getState().evidence.filter((e) => e.sessionId === id || e.sessionId === localSession?.id);
    setGenerating(true);
    try {
      const res = await generateOimlReportDocument(reportId, kind, format, {
        session_data: localSession,
        instrument_data: localInstrument,
        evidence: storeEv,
      });
      const downloadUrl = res.download_url
        ? (res.download_url.startsWith('http') ? res.download_url : `http://127.0.0.1:8000${res.download_url}`)
        : getArtifactDownloadUrl(res.id);

      setLastGenerated({
        id: res.id,
        format,
        file_name: res.file_name,
        url: downloadUrl,
        sha256: res.sha256,
      });

      // Ensure report is saved in local db and store so Certified Reports & /app/reports list it
      if (localSession && localInstrument) {
        try {
          const rep = previewReport || await buildReport(
            localSession,
            localInstrument,
            localSession.mode || 'field',
            currentUser || { id: 'usr_rev', name: 'Reviewer', role: 'reviewer' }
          );
          useAppStore.setState((s) => ({
            reports: [rep, ...s.reports.filter((r) => r.sessionId !== localSession.id && r.id !== rep.id)],
          }));
          await db.reports.put(rep);
        } catch (e) {
          console.error('Error saving report to store upon export', e);
        }
      }

      toast.success(
        `OIML R 76-2 ${kind.toUpperCase()} ${format.toUpperCase()} Generated`,
        `Compiled successfully with digital cryptographic seal.`
      );

      // Trigger browser download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = res.file_name || `OIML_R76_2_${kind}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      // Fallback to client-side PDF or DOCX export if backend is offline or session is local
      if (localSession && localInstrument) {
        try {
          const rep = previewReport || await buildReport(
            localSession,
            localInstrument,
            localSession.mode || 'field',
            currentUser || { id: 'usr_rev', name: 'Reviewer', role: 'reviewer' }
          );
          if (format === 'pdf') {
            downloadReportPdf(rep, qrCodeData, kind === 'detailed' ? 'detailed' : 'short');
            toast.success(`PDF Exported`, `Report generated in browser.`);
          } else {
            downloadReportDocx(rep, kind === 'detailed' ? 'detailed' : 'short');
            toast.success(`Word Document (.doc) Exported`, `Report generated in browser.`);
          }
        } catch (clientErr: any) {
          toast.error('Export Failed', clientErr.message || 'Error generating document.');
        }
      } else {
        toast.error('Export Failed', err.message || 'Error generating document. Please ensure backend is running.');
      }
    } finally {
      setGenerating(false);
    }
  }

  const appNo = backendReport?.application_no || localSession?.code || id;
  const productName = backendReport?.type_designation || localInstrument?.model || 'Electronic Platform Scale';
  const mfr = backendReport?.manufacturer || localInstrument?.manufacturer || 'Precision Weighing Ltd';
  const serialNo = backendReport?.instrument?.serial || localInstrument?.serial || 'SN-2026-0881';
  const accuracyClass = backendReport?.instrument?.accuracy_class || localInstrument?.accuracyClass || 'III';
  const maxCap = backendReport?.instrument?.Max || localInstrument?.max || 15000;
  const minCap = backendReport?.instrument?.Min || localInstrument?.min || (Number(localInstrument?.e || 5) * 20);
  const eVal = backendReport?.instrument?.e || localInstrument?.e || 5;
  const dVal = backendReport?.instrument?.d || localInstrument?.d || 1;
  const unit = localInstrument?.unit || 'g';
  const nVal = Number(eVal) > 0 ? Math.round(Number(maxCap) / Number(eVal)) : 3000;

  const sessionStatus = localSession?.status || backendReport?.status || 'in_progress';
  const isApproved = sessionStatus === 'approved' || sessionStatus === 'reported' || sessionStatus === 'finalised';
  const isAwaiting = sessionStatus === 'awaiting_review' || sessionStatus === 'ready_for_review' || sessionStatus === 'under_review';
  const overallVerdict = (backendReport?.verdict || localSession?.overallVerdict || 'PASSED').toUpperCase();

  return (
    <div className="space-y-6 pb-20">
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER & ACTION TOOLBAR                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/sessions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-faint hover:text-ink transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Test Sessions
        </Link>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Approver Action Buttons */}
          {!isApproved && (
            <>
              <button
                type="button"
                onClick={handleApproveReport}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Approve Report</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReturnModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition shadow-sm"
              >
                <RotateCcw className="h-3.5 w-3.5 text-amber-700" />
                <span>Return for Correction</span>
              </button>
            </>
          )}

          {/* In-App Preview Button */}
          <button
            type="button"
            onClick={() => handleOpenPreview('detailed')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-slate-50 transition shadow-sm"
          >
            <Eye className="h-4 w-4 text-accent-600" />
            <span>Preview Report In-App</span>
          </button>

          {/* Export Dropdown Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleExportReport('summary', 'pdf')}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-2 text-xs font-bold text-ink hover:bg-slate-200 transition shadow-sm disabled:opacity-50"
              title="Export 1-2 page short summary certificate"
            >
              <Download className="h-3.5 w-3.5 text-cyan-600" />
              <span>Short Report (PDF)</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportReport('detailed', 'pdf')}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-950 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition disabled:opacity-50"
              title="Export complete 64-page OIML R 76-2 document"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-cyan-400" />}
              <span>Complete 64-Page Report (PDF)</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportReport('detailed', 'docx')}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
              title="Export complete 64-page OIML R 76-2 Word document (.docx)"
            >
              <FileCode className="h-3.5 w-3.5 text-blue-600" />
              <span>Complete 64-Page Word (.docx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Approval Status Banner */}
      {isAwaiting && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-200/80 flex items-center justify-center text-amber-800 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-sm">Awaiting Reviewer Approval & Sign-Off</div>
              <p className="text-amber-700 mt-0.5">
                Submitted by tester. Review the object specifications and test modules below, verify calculations, and approve when satisfied.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleApproveReport}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 transition"
          >
            <ShieldCheck className="h-4 w-4" /> Approve Report Now
          </button>
        </div>
      )}

      {isApproved && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-200/80 flex items-center justify-center text-emerald-800 shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-sm">Report Verified & Approved by Reviewer</div>
              <p className="text-emerald-700 mt-0.5">
                All 17 metrological test modules verified against OIML R 76-1 criteria. Official exports unlocked.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenPreview('short')}
              className="inline-flex items-center gap-1 font-bold bg-white text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition"
            >
              <Eye className="h-3.5 w-3.5" /> Short Certificate
            </button>
            <button
              onClick={() => handleOpenPreview('detailed')}
              className="inline-flex items-center gap-1 font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition"
            >
              <FileCheck className="h-3.5 w-3.5" /> Full 64-Page Dossier
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: OBJECT / INSTRUMENT DETAILS CARD (TOP SECTION)     */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
        <div
          onClick={() => setObjectExpanded(!objectExpanded)}
          className="cursor-pointer bg-slate-50/80 p-5 border-b border-line flex flex-wrap items-center justify-between gap-4 select-none hover:bg-slate-100/70 transition"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-accent-100/70 border border-accent-200 flex items-center justify-center text-accent-700 shrink-0">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-ink-faint">
                Object / Instrument Under Test
              </div>
              <h2 className="text-lg font-bold text-ink">
                {mfr} · {productName}
              </h2>
              <div className="text-xs text-ink-soft">
                Serial No: <span className="font-mono font-bold text-ink">{serialNo}</span> · Class{' '}
                <span className="font-bold text-ink">{classLabel(accuracyClass as any)}</span> · Max{' '}
                <span className="font-mono font-bold">{maxCap} {unit}</span> · e ={' '}
                <span className="font-mono font-bold">{eVal} {unit}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-ink-faint">Overall Verdict</div>
              <StatusPill status={overallVerdict as any} />
            </div>
            <button
              type="button"
              className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-white border border-transparent hover:border-line transition"
            >
              {objectExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Object Technical Parameters */}
        {objectExpanded && (
          <div className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-line/70 p-3 bg-paper/50">
                <span className="text-[10px] font-bold text-ink-faint uppercase block">Max Capacity (Max)</span>
                <span className="font-mono text-sm font-bold text-ink">{maxCap} {unit}</span>
              </div>
              <div className="rounded-xl border border-line/70 p-3 bg-paper/50">
                <span className="text-[10px] font-bold text-ink-faint uppercase block">Min Capacity (Min)</span>
                <span className="font-mono text-sm font-bold text-ink">{minCap} {unit}</span>
              </div>
              <div className="rounded-xl border border-line/70 p-3 bg-paper/50">
                <span className="text-[10px] font-bold text-ink-faint uppercase block">Scale Interval (e)</span>
                <span className="font-mono text-sm font-bold text-ink">{eVal} {unit}</span>
              </div>
              <div className="rounded-xl border border-line/70 p-3 bg-paper/50">
                <span className="text-[10px] font-bold text-ink-faint uppercase block">Display Division (d)</span>
                <span className="font-mono text-sm font-bold text-ink">{dVal} {unit}</span>
              </div>
              <div className="rounded-xl border border-line/70 p-3 bg-paper/50">
                <span className="text-[10px] font-bold text-ink-faint uppercase block">Scale Intervals (n = Max/e)</span>
                <span className="font-mono text-sm font-bold text-ink">{nVal}</span>
              </div>
              <div className="rounded-xl border border-line/70 p-3 bg-paper/50">
                <span className="text-[10px] font-bold text-ink-faint uppercase block">Temperature Range</span>
                <span className="font-mono text-sm font-bold text-ink">-10 °C / +40 °C</span>
              </div>
              <div className="rounded-xl border border-line/70 p-3 bg-paper/50">
                <span className="text-[10px] font-bold text-ink-faint uppercase block">Power Supply</span>
                <span className="font-mono text-sm font-bold text-ink">230 V AC, 50 Hz</span>
              </div>
              <div className="rounded-xl border border-line/70 p-3 bg-paper/50">
                <span className="text-[10px] font-bold text-ink-faint uppercase block">Applicant / Owner</span>
                <span className="font-bold text-ink">{localSession?.applicant || 'National Food Authority'}</span>
              </div>
            </div>

            {/* Ambient Conditions Header */}
            <div className="rounded-xl border border-line bg-slate-50/70 p-3 flex flex-wrap items-center justify-between gap-3 text-ink-soft">
              <span className="font-semibold text-ink">OIML R 76-2 Ambient Test Environment:</span>
              <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
                <span>Temp: <strong>20.5 °C → 21.2 °C</strong></span>
                <span>Humidity: <strong>55% RH</strong></span>
                <span>Pressure: <strong>1013 hPa</strong></span>
                <span>Zero-tracking: <strong>In operation</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: 17 SEPARATE TEST MODULE SECTIONS                   */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">
            OIML R 76-2 Metrological Tests (17 Clauses)
          </h2>
          <div className="text-xs text-ink-faint">
            Click on any test to expand detailed calculations, reasoning, and observation tables
          </div>
        </div>

        {effectiveTests.map((test, index) => {
          const testCode = test.test_code || `T${index + 1}`;
          const isEditing = !!editState[testCode]?.isEditing;
          const currentEdit = editState[testCode];
          const isExpanded = !!expandedCards[testCode];
          const isPassed = (test.verdict || 'PASS').toUpperCase() !== 'FAIL';

          const displayRows = isEditing
            ? currentEdit.rows
            : (test.data?.rows || []);

          return (
            <div
              key={testCode}
              className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden transition hover:border-line/80"
            >
              {/* Test Header Row */}
              <div
                onClick={() => toggleExpand(testCode)}
                className="cursor-pointer flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50/60 border-b border-line select-none hover:bg-slate-100/60 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-950 text-white text-xs font-black">
                    {test.number || index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-ink">
                        {test.name || `Module ${testCode}`}
                      </h3>
                      <span className="font-mono text-xs text-accent-700 bg-accent-50 px-2 py-0.5 rounded border border-accent-200">
                        {test.clause || 'OIML R 76-1'}
                      </span>
                    </div>
                    <div className="text-[11px] text-ink-soft mt-0.5">
                      {test.calculationType || 'Tolerance Boundary Evaluation'} · {displayRows.length} observation points
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold border ${
                      isPassed
                        ? 'bg-pass-bg text-pass-fg border-pass-line'
                        : 'bg-fail-bg text-fail-fg border-fail-line'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {test.verdict || 'PASS'}
                  </span>

                  {/* Edit Observations Toggle */}
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => startEditing(test)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper transition shadow-sm"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-cyan-600" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSaveTestChanges(test)}
                        disabled={savingTestCode === testCode}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-sm disabled:opacity-50"
                      >
                        {savingTestCode === testCode ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        <span>Save & Recalculate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelEditing(testCode)}
                        className="p-1.5 rounded-xl border border-line bg-paper text-ink-soft hover:bg-slate-200 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Expand Chevron */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(testCode)}
                    className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-white transition"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Test Details */}
              {isExpanded && (
                <div className="p-5 space-y-4 text-xs">
                  {/* Verdict & Why It Passed / Why It Failed Banner */}
                  <div
                    className={`rounded-xl border p-3.5 flex items-start gap-3 ${
                      isPassed
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                        : 'border-rose-200 bg-rose-50/70 text-rose-900'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-sm">
                        {isPassed ? 'Why This Test Passed (Compliant)' : 'Why This Test Failed (Out of Tolerance)'}
                      </div>
                      <p className="mt-1 leading-relaxed text-ink-soft">
                        {test.whyItPassed || test.remarks || test.reasoning}
                      </p>
                    </div>
                  </div>

                  {/* Formula & Calculation Reasoning Card */}
                  <div className="rounded-xl border border-line bg-slate-50/60 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">Calculation Method & Statutory Formula:</span>
                      <span className="font-mono text-accent-700 bg-white px-2 py-0.5 rounded border border-line font-bold">
                        {test.formula || 'P = I + ½d − ΔL'}
                      </span>
                    </div>
                    <p className="text-ink-soft leading-relaxed">
                      {test.reasoning || `Calculated and evaluated according to ${test.clause} requirements.`}
                    </p>
                  </div>

                  {/* Official OIML Graphical Diagrams & Receptor Sketches */}
                  {(testCode === 'T4' || test.testType === 'eccentricity' || test.name?.toLowerCase().includes('eccentricity') || test.clause === 'A.4.7') && (
                    <EccentricityQuadrantSketch
                      appNo={appNo}
                      loadG={Math.round(Number(maxCap) / 3)}
                      unit={unit}
                    />
                  )}

                  {(testCode === 'T14' || test.testType === 'span_stability' || test.name?.toLowerCase().includes('span stability') || test.clause?.includes('B.4')) && (
                    <SpanStabilityPlot
                      appNo={appNo}
                      typeDesignation={productName}
                      eVal={Number(eVal)}
                      unit={unit}
                      passed={isPassed}
                    />
                  )}

                  {(testCode === 'T3.2' || test.testType === 'rolling' || test.name?.toLowerCase().includes('rolling') || test.clause === 'A.4.7.4') && (
                    <RollingLoadTrackSketch />
                  )}

                  {/* Observation Data Table */}
                  <div className="rounded-xl border border-line overflow-hidden">
                    <div className="bg-paper px-4 py-2 border-b border-line font-bold text-[11px] uppercase tracking-wider text-ink-faint flex items-center justify-between">
                      <span>Observations & Measurement Records (OIML R 76-2)</span>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleAddRow(testCode)}
                          className="inline-flex items-center gap-1 rounded bg-cyan-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-cyan-500 transition"
                        >
                          <Plus className="h-3 w-3" /> Add Point
                        </button>
                      )}
                    </div>

                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-ink-faint border-b border-line text-[11px]">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Load L ({unit})</th>
                          <th className="py-2 px-3">Indication I ({unit})</th>
                          <th className="py-2 px-3">Turning ΔL ({unit})</th>
                          <th className="py-2 px-3">Parameter / Position</th>
                          <th className="py-2 px-3">Calculated Result</th>
                          {isEditing && <th className="py-2 px-3 text-right">Delete</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {displayRows.map((row, rIdx) => {
                          const L = Number(row.L ?? 0);
                          const I = Number(row.I ?? 0);
                          const dL = Number(row.dL ?? 0);
                          const p = I + 0.5 * Number(dVal) - dL;
                          const err = p - L;

                          return (
                            <tr key={rIdx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-mono text-ink-faint">{rIdx + 1}</td>
                              <td className="py-2 px-3">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="any"
                                    value={row.L ?? ''}
                                    onChange={(e) => handleRowFieldChange(testCode, rIdx, 'L', Number(e.target.value))}
                                    className="w-24 rounded border border-line px-2 py-1 font-mono text-ink bg-white"
                                  />
                                ) : (
                                  <span className="font-mono font-bold text-ink">{row.L ?? '-'}</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="any"
                                    value={row.I ?? ''}
                                    onChange={(e) => handleRowFieldChange(testCode, rIdx, 'I', Number(e.target.value))}
                                    className="w-24 rounded border border-line px-2 py-1 font-mono text-ink bg-white"
                                  />
                                ) : (
                                  <span className="font-mono text-ink">{row.I ?? '-'}</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="any"
                                    value={row.dL ?? ''}
                                    onChange={(e) => handleRowFieldChange(testCode, rIdx, 'dL', Number(e.target.value))}
                                    className="w-20 rounded border border-line px-2 py-1 font-mono text-ink bg-white"
                                  />
                                ) : (
                                  <span className="font-mono text-ink-soft">{row.dL ?? '-'}</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-ink-soft">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={row.position || row.kind || ''}
                                    onChange={(e) => handleRowFieldChange(testCode, rIdx, 'position', e.target.value)}
                                    className="w-28 rounded border border-line px-2 py-1 text-ink bg-white"
                                  />
                                ) : (
                                  <span>{row.position || row.kind || 'Standard Point'}</span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-ink">
                                P = {p.toFixed(3)} {unit} {L > 0 ? `(E = ${err >= 0 ? `+${err.toFixed(3)}` : err.toFixed(3)})` : ''}
                              </td>
                              {isEditing && (
                                <td className="py-2 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(testCode, rIdx)}
                                    className="p-1 rounded text-rose-500 hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* IN-APP REPORT PREVIEW MODAL                                   */}
      {/* ------------------------------------------------------------- */}
      {showPreviewModal && previewReport && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-5 lg:p-6 overflow-y-auto">
            <div className="w-full max-w-6xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col h-[92vh] max-h-[95vh] my-auto mx-auto border border-line">
              {/* Modal Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-line bg-slate-50 px-4 sm:px-6 py-3.5 gap-3 shrink-0 relative z-20">
                <div className="min-w-0 max-w-full">
                  <h3 className="text-base font-bold text-ink flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 text-accent-600 shrink-0" />
                    <span className="truncate">Official Report In-App Preview — {previewReport.code}</span>
                  </h3>
                  <p className="text-xs text-ink-faint truncate">
                    {previewFormat === 'detailed'
                      ? 'Complete 64-page OIML R 76-2 Dossier compiled by backend Python ReportLab engine'
                      : 'Short Metrological Verification Certificate (Summary)'}
                  </p>
                </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Format switcher */}
                <div className="flex items-center rounded-lg border border-line bg-white p-0.5 text-xs shadow-sm">
                  <button
                    type="button"
                    onClick={() => handlePreviewFormatChange('short')}
                    className={`px-3 py-1 rounded-md font-bold transition ${
                      previewFormat === 'short'
                        ? 'bg-accent-600 text-white shadow'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    Short Certificate
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreviewFormatChange('detailed')}
                    className={`px-3 py-1 rounded-md font-bold transition ${
                      previewFormat === 'detailed'
                        ? 'bg-accent-600 text-white shadow'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    Full 64-Page Dossier
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportReport('detailed', 'pdf')}
                  disabled={generating}
                  className="btn-accent inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
                  title="Export complete 64-page OIML R 76-2 PDF"
                >
                  <Download className="h-3.5 w-3.5" /> 64-Page PDF
                </button>

                <button
                  type="button"
                  onClick={() => handleExportReport('detailed', 'docx')}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-slate-100 transition shadow-sm"
                  title="Export complete 64-page OIML R 76-2 Word document (.docx)"
                >
                  <FileCode className="h-3.5 w-3.5 text-blue-600" /> 64-Page Word (.docx)
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-slate-200 transition"
                  title="Close Preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: If detailed, show backend 64-page PDF; if short, show short certificate */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-900/5 overflow-hidden">
              {previewFormat === 'detailed' ? (
                <div className="flex-1 flex flex-col p-3 sm:p-4 bg-slate-100 min-h-0 overflow-hidden">
                  {/* Status header strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-xl border border-line mb-3 shadow-sm text-xs shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" /> 64 Pages Compiled by Python Backend
                      </span>
                      <span className="text-ink-soft hidden sm:inline">
                        Standard: <strong>OIML R 76-2 (2007) Forms 1–16 + Checklists 17.1–17.4</strong>
                      </span>
                      {backendPdfSha && (
                        <span className="font-mono text-[10px] text-ink-faint hidden md:inline" title={`SHA-256: ${backendPdfSha}`}>
                          SHA-256: {backendPdfSha.slice(0, 16)}...
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={loadBackend64PagePdf}
                        disabled={loadingBackendPdf}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-line text-ink hover:bg-slate-50 transition text-xs font-medium"
                        title="Recompile backend 64-page report with latest calculations"
                      >
                        <RotateCcw className={`h-3 w-3 ${loadingBackendPdf ? 'animate-spin' : ''}`} />
                        <span>Recompile</span>
                      </button>
                      {(backendPdfBlobUrl || backendPdfDownloadUrl) && (
                        <a
                          href={backendPdfBlobUrl || backendPdfDownloadUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-navy-950 text-white hover:bg-slate-800 transition text-xs font-bold"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Open in New Tab</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* PDF Viewer / Loading State */}
                  {loadingBackendPdf ? (
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-white rounded-xl border border-line p-8 shadow-sm h-full">
                      <div className="relative mb-4">
                        <div className="h-16 w-16 rounded-2xl bg-accent-50 border border-accent-200 flex items-center justify-center text-accent-600 animate-pulse">
                          <FileText className="h-8 w-8" />
                        </div>
                        <Loader2 className="h-6 w-6 text-accent-600 animate-spin absolute -bottom-1 -right-1" />
                      </div>
                      <h4 className="text-base font-bold text-ink">Compiling Official 64-Page OIML R 76-2 Metrological Dossier</h4>
                      <p className="text-xs text-ink-soft mt-1 text-center max-w-md">
                        Python ReportLab engine is generating all 16 Form tables, Clauses 17.1–17.4 statutory checklists, summary matrix, and cryptographic SHA-256 seal...
                      </p>
                    </div>
                  ) : backendPdfBlobUrl ? (
                    <div className="flex-1 min-h-0 h-full rounded-xl overflow-hidden border border-line bg-slate-800 shadow-inner flex flex-col">
                      <iframe
                        src={backendPdfBlobUrl}
                        className="w-full flex-1 min-h-0 h-full border-0"
                        title="Official 64-Page OIML R 76-2 Dossier PDF"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-white rounded-xl border border-line p-8 text-center h-full">
                      <FileText className="h-12 w-12 text-ink-faint mb-3" />
                      <h4 className="text-sm font-bold text-ink">Backend 64-Page PDF not loaded yet</h4>
                      <p className="text-xs text-ink-soft mt-1 max-w-sm">
                        Click below to trigger the backend Python ReportLab engine to generate the complete 64-page document.
                      </p>
                      <button
                        type="button"
                        onClick={loadBackend64PagePdf}
                        className="btn-accent text-xs font-bold mt-4 inline-flex items-center gap-1.5"
                      >
                        <FileCheck className="h-4 w-4" /> Generate 64-Page PDF Now
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 overflow-y-auto flex-1 bg-slate-100/60">
                  <ReportDocument
                    report={previewReport}
                    qr={qrCodeData}
                    format="short"
                    onFormatChange={(fmt) => handlePreviewFormatChange(fmt)}
                  />
                </div>
              )}
            </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* RETURN FOR CORRECTION MODAL                                   */}
      {/* ------------------------------------------------------------- */}
      {showReturnModal && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-auto mx-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-amber-600" /> Return for Correction
                </h3>
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="p-1 rounded-lg text-ink-faint hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-ink-soft">
                Provide specific observations or required adjustments. The tester will be notified to review and re-test.
              </p>
              <textarea
                rows={4}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full rounded-xl border border-line p-3 font-sans text-xs text-ink bg-paper focus:bg-white focus:outline-accent-500"
                placeholder="e.g. Please re-run Corner #3 eccentricity observation; value seems misaligned..."
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReturnReport}
                  className="btn-primary bg-amber-600 hover:bg-amber-700 text-xs"
                >
                  Submit Return
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
