'use client';

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Download,
  FileCode,
  QrCode,
  Ban,
  ExternalLink,
  ArrowLeft,
  FileText,
  CheckCircle2,
  RotateCcw,
  Loader2,
  FileCheck
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader } from '../components/ui/misc';
import { ReportDocument } from '../report/ReportDocument';
import { downloadReportPdf } from '../report/generatePdf';
import { downloadReportDocx } from '../report/generateDocx';
import { qrDataUrl, verifyUrl } from '../report/qr';
import { StatusPill } from '../components/ui/StatusPill';
import { generateOimlReportDocument, getArtifactDownloadUrl } from '../lib/pythonBackend';
import { toast } from '../lib/toast';

export default function ReportView() {
  const { id } = useParams();
  const report = useAppStore((s) => s.reports.find((r) => r.id === id));
  const revoke = useAppStore((s) => s.revokeReport);
  const can = useAppStore((s) => s.can);
  const [qr, setQr] = useState<string>();
  const [format, setFormat] = useState<'short' | 'detailed'>('detailed');
  const [viewMode, setViewMode] = useState<'document' | 'pdf'>('document');
  const [exporting, setExporting] = useState(false);

  // Backend 64-page PDF state
  const [backendPdfBlobUrl, setBackendPdfBlobUrl] = useState<string | null>(null);
  const [backendPdfDownloadUrl, setBackendPdfDownloadUrl] = useState<string | null>(null);
  const [loadingBackendPdf, setLoadingBackendPdf] = useState(false);
  const [backendPdfSha, setBackendPdfSha] = useState<string | null>(null);

  useEffect(() => {
    if (report) {
      qrDataUrl(verifyUrl(report)).then(setQr);
      if (format === 'detailed' && !backendPdfBlobUrl && !loadingBackendPdf) {
        loadBackend64PagePdf();
      }
    }
  }, [report?.id]);

  async function loadBackend64PagePdf() {
    if (!report) return;
    setLoadingBackendPdf(true);
    try {
      const storeEv = useAppStore.getState().evidence.filter((e) => e.sessionId === report.snapshot?.session?.id || e.sessionId === report.sessionId);
      const evList = [
        ...(report.snapshot?.evidence || []),
        ...(report.snapshot?.session?.evidence || []),
        ...storeEv,
      ];
      const evMap = new Map<string, any>();
      for (const item of evList) {
        if (item && (item.id || item.fileName || item.dataUrl)) {
          const key = item.id || `${item.fileName}_${item.createdAt}`;
          if (!evMap.has(key)) evMap.set(key, item);
        }
      }
      const dedupedEv = Array.from(evMap.values());
      const sessionPayload = {
        ...(report.snapshot?.session || {}),
        evidence: dedupedEv,
      };
      const res = await generateOimlReportDocument(
        report.id,
        'detailed',
        'pdf',
        {
          session_data: sessionPayload,
          instrument_data: report.snapshot?.instrument,
          evidence: dedupedEv,
        }
      );
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
    } finally {
      setLoadingBackendPdf(false);
    }
  }

  function handleFormatSwitch(nextFormat: 'short' | 'detailed') {
    setFormat(nextFormat);
    if (nextFormat === 'detailed' && !backendPdfBlobUrl && !loadingBackendPdf) {
      loadBackend64PagePdf();
    }
  }

  async function handleExport(exportFormat: 'pdf' | 'docx') {
    if (!report) return;
    setExporting(true);
    try {
      const storeEv = useAppStore.getState().evidence.filter((e) => e.sessionId === report.snapshot?.session?.id || e.sessionId === report.sessionId);
      const evList = [
        ...(report.snapshot?.evidence || []),
        ...(report.snapshot?.session?.evidence || []),
        ...storeEv,
      ];
      const evMap = new Map<string, any>();
      for (const item of evList) {
        if (item && (item.id || item.fileName || item.dataUrl)) {
          const key = item.id || `${item.fileName}_${item.createdAt}`;
          if (!evMap.has(key)) evMap.set(key, item);
        }
      }
      const dedupedEv = Array.from(evMap.values());
      const sessionPayload = {
        ...(report.snapshot?.session || {}),
        evidence: dedupedEv,
      };
      const res = await generateOimlReportDocument(
        report.id,
        format === 'detailed' ? 'detailed' : 'summary',
        exportFormat,
        {
          session_data: sessionPayload,
          instrument_data: report.snapshot?.instrument,
          evidence: dedupedEv,
        }
      );
      const downloadUrl = res.download_url
        ? (res.download_url.startsWith('http') ? res.download_url : `http://127.0.0.1:8000${res.download_url}`)
        : getArtifactDownloadUrl(res.id);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = res.file_name || `OIML_R76_2_${format}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(
        `OIML R 76-2 ${exportFormat.toUpperCase()} Exported`,
        `Generated 64-page dossier with cryptographic seal.`
      );
    } catch {
      if (exportFormat === 'pdf') {
        downloadReportPdf(report, qr, format);
      } else {
        downloadReportDocx(report, format);
      }
    } finally {
      setExporting(false);
    }
  }

  if (!report) return <p className="text-sm text-ink-faint">Report not found.</p>;

  return (
    <div className="space-y-4">
      <Link to="/app/reports" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-faint hover:text-ink no-print">
        <ArrowLeft className="h-4 w-4" /> Reports
      </Link>
      <div className="no-print">
        <PageHeader
          title={report.code}
          subtitle={`${format === 'short' ? 'Summary Certificate' : 'Full OIML R 76-2 Dossier (64 Pages)'} · version ${report.version}`}
          actions={
            <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
              {/* Report Format Switcher */}
              <div className="h-10 inline-flex items-center rounded-xl border border-stone-300/90 bg-stone-200/90 p-1 text-xs shadow-inner shrink-0">
                <button
                  type="button"
                  onClick={() => handleFormatSwitch('short')}
                  className={`h-8 px-4 rounded-lg font-bold transition-all duration-150 whitespace-nowrap ${
                    format === 'short'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  Short Report
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatSwitch('detailed')}
                  className={`h-8 px-4 rounded-lg font-bold transition-all duration-150 whitespace-nowrap ${
                    format === 'detailed'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  Complete 64-Page Report
                </button>
              </div>

              {/* View Mode Switcher for Detailed Report */}
              {format === 'detailed' && (
                <div className="h-10 inline-flex items-center rounded-xl border border-stone-300/90 bg-stone-200/90 p-1 text-xs shadow-inner shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('document')}
                    className={`h-8 px-3.5 rounded-lg font-bold transition-all duration-150 whitespace-nowrap ${
                      viewMode === 'document'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-700 hover:text-stone-950'
                    }`}
                  >
                    Live Dossier View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('pdf');
                      if (!backendPdfBlobUrl && !loadingBackendPdf) {
                        loadBackend64PagePdf();
                      }
                    }}
                    className={`h-8 px-3.5 rounded-lg font-bold transition-all duration-150 whitespace-nowrap ${
                      viewMode === 'pdf'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-700 hover:text-stone-950'
                    }`}
                  >
                    Compiled 64-Page PDF
                  </button>
                </div>
              )}

              {report.status === 'revoked' && <span className="chip bg-fail-bg text-fail-fg shrink-0">REVOKED</span>}

              <button
                type="button"
                disabled={exporting}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs sm:text-sm font-bold text-blue-700 bg-blue-50/90 hover:bg-blue-100 border border-blue-200/90 shadow-2xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0 whitespace-nowrap"
                onClick={() => handleExport('docx')}
                title="Export complete 64-page OIML R 76-2 Word document (.docx)"
              >
                <FileCode className="h-4 w-4 text-blue-600" />
                {exporting ? 'Generating...' : 'Export Complete Word (.docx)'}
              </button>

              <button
                type="button"
                disabled={exporting}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-md shadow-red-950/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0 whitespace-nowrap"
                onClick={() => handleExport('pdf')}
                title="Export complete 64-page OIML R 76-2 PDF"
              >
                <Download className="h-4 w-4 text-white" />
                {exporting ? 'Generating...' : (format === 'detailed' ? 'Export Complete 64-Page PDF' : 'Export Summary PDF')}
              </button>
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm mt-3 shadow-2xs">
          <QrCode className="h-4 w-4 text-amber-600" />
          <Link to={`/verify/${report.verificationId}`} className="font-bold text-indigo-700 hover:text-indigo-800 hover:underline" target="_blank">
            Open public verification page <ExternalLink className="ml-0.5 inline h-3.5 w-3.5" />
          </Link>
          <span className="text-ink-faint">Verification ID {report.verificationId}</span>
          {can('report.revoke') && report.status === 'valid' && (
            <button className="btn-ghost ml-auto h-8 text-xs text-fail-fg font-bold" onClick={() => revoke(report.id)}>
              <Ban className="h-3.5 w-3.5" /> Revoke report
            </button>
          )}
        </div>
      </div>

      {/* Main Preview Area */}
      {format === 'detailed' && viewMode === 'pdf' ? (
        <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden flex flex-col min-h-[820px]">
          {/* Top toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50/80 px-5 py-3 border-b border-line text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-ink-soft">
                Standard: <strong className="text-ink">OIML R 76-2 (2007) Forms 1–16 + Checklists 17.1–17.4</strong>
              </span>
              {backendPdfSha && (
                <span className="font-mono text-[10px] text-ink-faint hidden md:inline bg-stone-100 px-2 py-0.5 rounded border border-stone-200" title={`SHA-256: ${backendPdfSha}`}>
                  SHA-256: {backendPdfSha.slice(0, 16)}...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadBackend64PagePdf}
                disabled={loadingBackendPdf}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900 font-bold shadow-2xs transition-all duration-150 disabled:opacity-50"
                title="Recompile backend 64-page PDF"
              >
                <RotateCcw className={`h-3.5 w-3.5 text-stone-500 ${loadingBackendPdf ? 'animate-spin' : ''}`} />
                <span>Recompile</span>
              </button>
              {(backendPdfBlobUrl || backendPdfDownloadUrl) && (
                <a
                  href={backendPdfBlobUrl || backendPdfDownloadUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xs transition-all duration-150 hover:scale-[1.02]"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-300" />
                  <span>Open Fullscreen</span>
                </a>
              )}
            </div>
          </div>

          {/* PDF Viewer Body */}
          {loadingBackendPdf ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[700px] p-8">
              <div className="relative mb-4">
                <div className="h-16 w-16 rounded-2xl bg-accent-50 border border-accent-200 flex items-center justify-center text-accent-600 animate-pulse">
                  <FileText className="h-8 w-8" />
                </div>
                <Loader2 className="h-6 w-6 text-accent-600 animate-spin absolute -bottom-1 -right-1" />
              </div>
              <h4 className="text-base font-bold text-ink">Compiling Official 64-Page OIML R 76-2 Metrological Dossier</h4>
              <p className="text-xs text-ink-soft mt-1 text-center max-w-md">
                Python ReportLab engine is rendering all 16 Forms, statutory checklists, and photographic evidence...
              </p>
            </div>
          ) : backendPdfBlobUrl ? (
            <div className="flex-1 min-h-[780px] bg-slate-800 flex flex-col">
              <iframe
                src={backendPdfBlobUrl}
                className="w-full flex-1 min-h-[780px] border-0"
                title="Official 64-Page OIML R 76-2 Dossier PDF"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] p-8 text-center">
              <FileText className="h-12 w-12 text-ink-faint mb-3" />
              <h4 className="text-sm font-bold text-ink">Backend 64-Page Report Preview</h4>
              <p className="text-xs text-ink-soft mt-1 max-w-sm">
                Generate the official 64-page PDF directly using the backend metrology engine.
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
        <ReportDocument
          report={report}
          qr={qr}
          format={format}
          onFormatChange={handleFormatSwitch}
        />
      )}
    </div>
  );
}
