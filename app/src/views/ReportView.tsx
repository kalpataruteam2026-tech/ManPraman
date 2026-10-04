'use client';

import { useEffect, useState } from 'react';
import { useParams, Link } from '@/lib/navigation';
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
  const [viewMode, setViewMode] = useState<'document' | 'pdf'>('pdf');
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
            <div className="flex flex-wrap items-center gap-2">
              {/* Report Format Switcher */}
              <div className="flex items-center rounded-lg border border-line bg-white p-0.5 text-xs mr-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => handleFormatSwitch('short')}
                  className={`px-3 py-1.5 rounded-md font-bold transition ${
                    format === 'short'
                      ? 'bg-accent-600 text-white shadow'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  Short Report
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatSwitch('detailed')}
                  className={`px-3 py-1.5 rounded-md font-bold transition ${
                    format === 'detailed'
                      ? 'bg-accent-600 text-white shadow'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  Complete 64-Page Report
                </button>
              </div>

              {report.status === 'revoked' && <span className="chip bg-fail-bg text-fail-fg">REVOKED</span>}
              <StatusPill status={report.overallVerdict} />

              <button
                type="button"
                disabled={exporting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-ink hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
                onClick={() => handleExport('docx')}
                title="Export complete 64-page OIML R 76-2 Word document (.docx)"
              >
                <FileCode className="h-4 w-4 text-blue-600" />
                {exporting ? 'Generating...' : 'Export Complete Word (.docx)'}
              </button>

              <button
                type="button"
                disabled={exporting}
                className="btn-primary text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
                onClick={() => handleExport('pdf')}
                title="Export complete 64-page OIML R 76-2 PDF"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Generating...' : (format === 'detailed' ? 'Export Complete 64-Page PDF' : 'Export Summary PDF')}
              </button>
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white px-4 py-2.5 text-sm mt-3">
          <QrCode className="h-4 w-4 text-accent-600" />
          <Link to={`/verify/${report.verificationId}`} className="font-semibold text-accent-700 hover:text-accent-600" target="_blank">
            Open public verification page <ExternalLink className="ml-0.5 inline h-3.5 w-3.5" />
          </Link>
          <span className="text-ink-faint">Verification ID {report.verificationId}</span>
          {can('report.revoke') && report.status === 'valid' && (
            <button className="btn-ghost ml-auto h-8 text-xs text-fail-fg" onClick={() => revoke(report.id)}>
              <Ban className="h-3.5 w-3.5" /> Revoke report
            </button>
          )}
        </div>
      </div>

      {/* Main Preview Area */}
      {format === 'detailed' && viewMode === 'pdf' ? (
        <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden flex flex-col min-h-[820px]">
          {/* Top toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-5 py-3 border-b border-line text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" /> 64 Pages Compiled by Backend Python Engine
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
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-line text-ink hover:bg-slate-100 transition text-xs font-medium"
                title="Recompile backend 64-page PDF"
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
