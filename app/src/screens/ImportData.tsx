import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Download,
  RefreshCw,
  Layers,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { PageHeader } from '../components/ui/misc';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { useAppStore } from '../store/useAppStore';
import {
  previewImport,
  processImport,
  type ImportPreviewResponse,
  type ImportProcessResponse,
  type SheetValidationSummary,
} from '../lib/pythonBackend';

export default function ImportData({ hideHeader }: { hideHeader?: boolean }) {
  const navigate = useNavigate();
  const hydrate = useAppStore((s) => s.hydrate);
  const logAudit = useAppStore((s) => s.logAudit);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [processResult, setProcessResult] = useState<ImportProcessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(selectedFile: File) {
    setFile(selectedFile);
    setError(null);
    setPreview(null);
    setProcessResult(null);
    setLoading(true);

    try {
      const data = await previewImport(selectedFile);
      setPreview(data);
      // Pre-select all valid sheets
      setSelectedSheets(data.sheets.filter((s) => s.is_valid).map((s) => s.sheet_name));
    } catch (err: any) {
      setError(err.message || 'Failed to preview the uploaded file.');
    } finally {
      setLoading(false);
    }
  }

  function toggleSheet(sheetName: string) {
    setSelectedSheets((prev) =>
      prev.includes(sheetName) ? prev.filter((s) => s !== sheetName) : [...prev, sheetName]
    );
  }

  async function handleConfirmProcess() {
    if (!file) return;
    if (selectedSheets.length === 0) {
      setError('Please select at least one valid sheet to import.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await processImport(file, selectedSheets);
      setProcessResult(result);
      logAudit({
        action: 'Batch import processed',
        detail: `Imported ${result.successful_sessions} sessions from ${result.filename}`,
      });
      // Refresh local store to pick up new sessions from backend if synced
      await hydrate();
    } catch (err: any) {
      setError(err.message || 'Batch import failed during processing.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setSelectedSheets([]);
    setProcessResult(null);
    setError(null);
  }

  return (
    <div className={hideHeader ? "space-y-4" : "space-y-6"}>
      {!hideHeader && (
        <PageHeader
          icon={<Upload className="h-5 w-5" />}
          title="Batch & File Import"
          subtitle="Upload single CSV or multi-model XLSX workbooks. Each sheet is validated independently and processed into an isolated test session."
          actions={
            <a
              href="/api/backend/import/template/csv"
              download="oiml_test_template.csv"
              className="btn-ghost flex items-center gap-1.5 text-xs"
            >
              <Download className="h-4 w-4" /> Download Sample CSV
            </a>
          }
        />
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 shadow-sm">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* 1. Upload Box */}
      {!preview && !processResult && (
        <Card>
          <CardHeader
            title="Select File for Import"
            subtitle="Supported formats: .xlsx (multi-model worksheets), .csv (single instrument model)"
          />
          <CardBody>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
              }}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-paper/50 p-10 text-center transition hover:border-accent-500 hover:bg-white"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 shadow-sm">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-ink">
                Upload Instrument Test Spreadsheet
              </h3>
              <p className="mt-1 max-w-md text-xs text-ink-soft leading-relaxed">
                Drag & drop your multi-sheet workbook (.xlsx) or CSV file here, or browse from your computer.
                Every worksheet will be inspected and validated before any session is created.
              </p>

              <label className="btn-primary mt-6 cursor-pointer inline-flex items-center gap-2 text-xs">
                <Upload className="h-4 w-4" />
                {loading ? 'Inspecting File…' : 'Choose File to Upload'}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                  }}
                />
              </label>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-ink-faint">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Multi-model XLSX supported
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Single CSV supported
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Sheet-level validation isolation
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 2. Validation & Preview Step */}
      {preview && !processResult && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-bold text-ink">{preview.filename}</span>
                  <span className="chip uppercase text-[10px] bg-navy-100 text-navy-800 font-bold">
                    {preview.format}
                  </span>
                  <span className="chip text-[10px] bg-accent-50 text-accent-700 font-semibold">
                    {preview.total_sheets} Worksheet{preview.total_sheets > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  Review validation status for each worksheet before confirming import.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-ghost text-xs"
                >
                  Cancel / Re-upload
                </button>
                <button
                  type="button"
                  disabled={loading || selectedSheets.length === 0}
                  onClick={handleConfirmProcess}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {loading
                    ? 'Processing…'
                    : `Confirm & Process ${selectedSheets.length} Sheet${selectedSheets.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-paper/60 font-semibold text-ink-faint">
                  <tr>
                    <th className="th w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedSheets.length === preview.sheets.filter((s) => s.is_valid).length &&
                          selectedSheets.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSheets(preview.sheets.filter((s) => s.is_valid).map((s) => s.sheet_name));
                          } else {
                            setSelectedSheets([]);
                          }
                        }}
                        className="rounded border-line text-accent-600 focus:ring-accent-500"
                      />
                    </th>
                    <th className="th">Worksheet / Model</th>
                    <th className="th">Valid Rows</th>
                    <th className="th">Validation Status</th>
                    <th className="th">Issues & Warnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.sheets.map((sheet) => {
                    const isSelected = selectedSheets.includes(sheet.sheet_name);
                    return (
                      <tr
                        key={sheet.sheet_name}
                        className={`transition ${isSelected ? 'bg-accent-50/20' : 'hover:bg-paper/40'}`}
                      >
                        <td className="td">
                          <input
                            type="checkbox"
                            disabled={!sheet.is_valid}
                            checked={isSelected}
                            onChange={() => toggleSheet(sheet.sheet_name)}
                            className="rounded border-line text-accent-600 focus:ring-accent-500"
                          />
                        </td>
                        <td className="td">
                          <span className="font-bold text-ink">{sheet.sheet_name}</span>
                          <span className="block text-[11px] text-ink-soft">
                            Model: {sheet.model || 'Inferred from sheet'}
                          </span>
                        </td>
                        <td className="td font-mono">
                          {sheet.valid_rows} / {sheet.total_rows}
                        </td>
                        <td className="td">
                          {sheet.is_valid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                              <XCircle className="h-3.5 w-3.5" /> Errors Found
                            </span>
                          )}
                        </td>
                        <td className="td max-w-xs">
                          {sheet.errors.length > 0 ? (
                            <div className="space-y-0.5 text-rose-700">
                              {sheet.errors.slice(0, 3).map((err, i) => (
                                <div key={i} className="truncate text-[11px]">
                                  • {err}
                                </div>
                              ))}
                              {sheet.errors.length > 3 && (
                                <div className="text-[10px] text-rose-500">
                                  +{sheet.errors.length - 3} more errors
                                </div>
                              )}
                            </div>
                          ) : sheet.warnings.length > 0 ? (
                            <div className="space-y-0.5 text-amber-700">
                              {sheet.warnings.slice(0, 2).map((warn, i) => (
                                <div key={i} className="truncate text-[11px]">
                                  ⚠ {warn}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-medium">Ready for calculation engine</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Processing Results Step */}
      {processResult && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="rounded-3xl border border-emerald-300 bg-emerald-50/80 p-6 text-emerald-950 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Batch Processing Complete
                </div>
                <h3 className="mt-1 font-display text-xl font-bold">
                  Successfully Generated {processResult.successful_sessions} Test Session
                  {processResult.successful_sessions > 1 ? 's' : ''}
                </h3>
                <p className="mt-1 text-xs text-emerald-800">
                  Batch ID: <span className="font-mono font-bold">{processResult.batch_id}</span> · Source File:{' '}
                  <span className="font-semibold">{processResult.filename}</span>
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Link
                    to="/app/sessions"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-emerald-800"
                  >
                    View All Test Sessions <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100"
                  >
                    <RefreshCw className="h-4 w-4" /> Import Another File
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader
              title="Individual Worksheet Processing Results"
              subtitle="Each sheet created an independent OIML R-76 test evaluation record."
            />
            <div className="divide-y divide-line text-xs">
              {processResult.results.map((item, i) => (
                <div key={i} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink">{item.sheet_name}</span>
                      <span className="chip bg-navy-50 text-navy-800 text-[10px] font-semibold">
                        Model: {item.model}
                      </span>
                      {item.status === 'SUCCESS' ? (
                        <span className="chip bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          ✓ SUCCESS
                        </span>
                      ) : (
                        <span className="chip bg-rose-100 text-rose-800 text-[10px] font-bold">
                          ✕ {item.status}
                        </span>
                      )}
                    </div>
                    {item.application_no && (
                      <div className="mt-1 text-[11px] text-ink-faint">
                        App No: <span className="font-mono text-ink">{item.application_no}</span> · Verdict:{' '}
                        <span className="font-semibold text-accent-700">{item.verdict || 'EVALUATED'}</span>
                      </div>
                    )}
                    {item.error_message && (
                      <p className="mt-1 text-xs text-rose-600 font-medium">• {item.error_message}</p>
                    )}
                  </div>

                  {item.session_id && (
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/app/sessions/${item.session_id}?tab=evidence`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent-200 bg-accent-50 text-accent-800 text-xs font-bold hover:bg-accent-100 transition shadow-2xs"
                      >
                        <Upload className="h-3.5 w-3.5 text-accent-600" /> Attach Evidence
                      </Link>
                      <Link
                        to={`/app/sessions/${item.session_id}`}
                        className="btn-ghost text-xs flex items-center gap-1 text-ink-soft hover:text-ink"
                      >
                        <Eye className="h-4 w-4" /> Open Session
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
