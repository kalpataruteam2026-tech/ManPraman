'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Loader2, Database, Network, Download, FileUp, Sparkles } from 'lucide-react';
import { useNavigate } from '@/lib/navigation';
import { simulateCsvImportToFrontend } from '../lib/mockCsvParser';
import { toast } from '../lib/toast';

interface CsvSessionImporterProps {
  compact?: boolean;
  targetInstrumentId?: string;
  onImportSuccess?: (sessionId: string) => void;
}

export function CsvSessionImporter({ compact = false, targetInstrumentId, onImportSuccess }: CsvSessionImporterProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [dragOverMode, setDragOverMode] = useState<'single' | 'multiple' | null>(null);
  const [isCompactDragOver, setIsCompactDragOver] = useState(false);

  const processFile = useCallback(async (file: File, selectedMode: 'single' | 'multiple') => {
    // Validate file extension
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValid) {
      toast.error('Invalid File Type', 'Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    setLoading(true);
    setMode(selectedMode);

    try {
      const sessionId = await simulateCsvImportToFrontend(file, targetInstrumentId || '', selectedMode);
      
      if (selectedMode === 'single') {
        toast.success(
          'CSV Data Ingested',
          `17 tests auto-filled from CSV. You can attach live-proof evidence before generating report.`
        );
        if (onImportSuccess) {
          onImportSuccess(sessionId);
        } else {
          navigate(`/app/sessions/${sessionId}`);
        }
      } else {
        toast.success(
          'Bulk Data Imported',
          `Successfully imported multiple object sheets into test sessions.`
        );
        navigate(`/app/sessions`);
      }
    } catch (err: any) {
      toast.error('Import Failed', err.message || 'Error processing CSV file');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [targetInstrumentId, onImportSuccess, navigate]);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file, mode);
  }

  function triggerFilePicker(targetMode: 'single' | 'multiple') {
    setMode(targetMode);
    fileInputRef.current?.click();
  }

  // Drag handlers for individual cards
  const handleDragEnter = (targetMode: 'single' | 'multiple') => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverMode(targetMode);
  };

  const handleDragOver = (targetMode: 'single' | 'multiple') => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (dragOverMode !== targetMode) {
      setDragOverMode(targetMode);
    }
  };

  const handleDragLeave = (targetMode: 'single' | 'multiple') => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverMode(null);
  };

  const handleDrop = (targetMode: 'single' | 'multiple') => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverMode(null);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file, targetMode);
    }
  };

  if (compact) {
    return (
      <div 
        className="relative inline-flex items-center"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
          setIsCompactDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsCompactDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsCompactDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) processFile(file, 'single');
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileSelected}
        />
        <button
          type="button"
          onClick={() => triggerFilePicker('single')}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-sm ${
            isCompactDragOver
              ? 'border-accent-500 bg-accent-50 text-accent-700 ring-2 ring-accent-400 scale-105'
              : 'border-line bg-white text-ink hover:bg-slate-50 hover:text-ink-strong'
          }`}
          title="Click to select or drag & drop CSV/Excel file"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-accent-600" />
          ) : isCompactDragOver ? (
            <FileUp className="h-4 w-4 text-accent-600 animate-bounce" />
          ) : (
            <Upload className="h-4 w-4 text-accent-600" />
          )}
          <span>{loading ? 'Importing CSV...' : isCompactDragOver ? 'Drop to Import' : 'Import CSV'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6 text-ink shadow-sm transition-all">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-100 text-accent-700">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-ink">
                  Auto-fill from CSV / Excel Data
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="h-2.5 w-2.5" /> Drag & Drop Supported
                </span>
              </div>
              <p className="text-xs text-ink-faint mt-1 leading-relaxed">
                Upload observation data to automatically populate the 17 tests requirements boxes. 
                Review the data exactly like the manual form before generating the final report.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="/multi_object_instruments_multisheet.csv"
              download="multi_object_instruments_multisheet.csv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-accent-200 bg-accent-50/80 text-accent-800 hover:bg-accent-600 hover:text-white transition shadow-sm"
              title="Download 4-object multi-sheet CSV dataset"
            >
              <Download className="h-3 w-3" /> Multi-Sheet CSV (4 Objects)
            </a>
            <a
              href="/multi_object_instruments_multisheet.xlsx"
              download="multi_object_instruments_multisheet.xlsx"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-800 hover:text-white transition shadow-sm"
              title="Download 4-sheet Excel (.xlsx) workbook"
            >
              <Download className="h-3 w-3" /> Multi-Sheet Excel
            </a>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileSelected}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Single Object CSV Drop Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => triggerFilePicker('single')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                triggerFilePicker('single');
              }
            }}
            onDragEnter={handleDragEnter('single')}
            onDragOver={handleDragOver('single')}
            onDragLeave={handleDragLeave('single')}
            onDrop={handleDrop('single')}
            className={`relative flex flex-col justify-between h-full rounded-xl border transition-all duration-200 cursor-pointer p-5 select-none ${
              dragOverMode === 'single'
                ? 'border-2 border-dashed border-blue-500 bg-blue-50/90 shadow-lg ring-4 ring-blue-500/10 scale-[1.015]'
                : 'border-line bg-white/70 hover:border-accent-400 hover:bg-white hover:shadow-md'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-ink">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                    dragOverMode === 'single'
                      ? 'bg-blue-600 text-white scale-110'
                      : 'bg-accent-50 text-accent-700'
                  }`}>
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-sm text-ink group-hover:text-accent-700 transition">
                    Single Object CSV
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  1 Instrument
                </span>
              </div>
              <p className="text-xs text-ink-faint leading-relaxed mt-2.5">
                Import an observation dataset for one specific instrument. After uploading, you will be redirected directly to the filled 17 test forms.
              </p>
            </div>

            {/* Drop Zone Callout & Action */}
            <div className="mt-4 pt-3.5 border-t border-line/60 w-full">
              {loading && mode === 'single' ? (
                <div className="flex items-center justify-center py-2.5 rounded-lg bg-accent-50/80 border border-accent-200">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-accent-700">
                    <Loader2 className="h-4 w-4 animate-spin" /> Ingesting & Parsing Data...
                  </span>
                </div>
              ) : dragOverMode === 'single' ? (
                <div className="flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-blue-100/70 border border-dashed border-blue-400 text-center animate-pulse">
                  <FileUp className="h-5 w-5 text-blue-600 mb-1" />
                  <span className="text-xs font-bold text-blue-900">
                    Drop CSV / Excel file here
                  </span>
                  <span className="text-[11px] text-blue-700">
                    Release to auto-fill 17 test requirements
                  </span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-accent-700 bg-accent-50 px-4 py-2 rounded-lg border border-accent-200 hover:bg-accent-600 hover:text-white transition shadow-sm">
                    <Upload className="h-3.5 w-3.5" /> Select CSV File
                  </span>
                  <span className="text-[11px] text-ink-faint hidden sm:inline">
                    or drag & drop file here
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Multiple Objects CSV Drop Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => triggerFilePicker('multiple')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                triggerFilePicker('multiple');
              }
            }}
            onDragEnter={handleDragEnter('multiple')}
            onDragOver={handleDragOver('multiple')}
            onDragLeave={handleDragLeave('multiple')}
            onDrop={handleDrop('multiple')}
            className={`relative flex flex-col justify-between h-full rounded-xl border transition-all duration-200 cursor-pointer p-5 select-none ${
              dragOverMode === 'multiple'
                ? 'border-2 border-dashed border-indigo-600 bg-indigo-50/90 shadow-lg ring-4 ring-indigo-500/10 scale-[1.015]'
                : 'border-line bg-white/70 hover:border-accent-400 hover:bg-white hover:shadow-md'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-ink">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                    dragOverMode === 'multiple'
                      ? 'bg-indigo-600 text-white scale-110'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    <Network className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-sm text-ink group-hover:text-accent-700 transition">
                    Multiple Objects CSV (Bulk)
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Batch Mode
                </span>
              </div>
              <p className="text-xs text-ink-faint leading-relaxed mt-2.5">
                Import a dataset containing multiple instruments. After uploading, all mapped objects will be visible in your sessions list.
              </p>
            </div>

            {/* Drop Zone Callout & Action */}
            <div className="mt-4 pt-3.5 border-t border-line/60 w-full">
              {loading && mode === 'multiple' ? (
                <div className="flex items-center justify-center py-2.5 rounded-lg bg-slate-100 border border-slate-300">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Loader2 className="h-4 w-4 animate-spin" /> Mapping Batch Sheets...
                  </span>
                </div>
              ) : dragOverMode === 'multiple' ? (
                <div className="flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-indigo-100/70 border border-dashed border-indigo-400 text-center animate-pulse">
                  <FileUp className="h-5 w-5 text-indigo-600 mb-1" />
                  <span className="text-xs font-bold text-indigo-900">
                    Drop Batch File here
                  </span>
                  <span className="text-[11px] text-indigo-700">
                    Release to import all object sheets
                  </span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-800 hover:text-white transition shadow-sm">
                    <Upload className="h-3.5 w-3.5" /> Select Batch CSV
                  </span>
                  <span className="text-[11px] text-ink-faint hidden sm:inline">
                    or drag & drop file here
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

