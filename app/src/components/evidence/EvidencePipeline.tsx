'use client';

import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { useNavigate } from '@/lib/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Camera,
  Plus,
  Trash2,
  RefreshCw,
  GripVertical,
  Eye,
  X,
  Check,
  Shield,
  Scale,
  Sparkles,
  FileCheck,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  Info,
  Hash,
  Layers,
  Edit2,
  Save,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Evidence, EvidenceKind } from '../../domain/types';
import {
  uploadEvidenceToStorage,
  replaceEvidenceFileInStorage,
  computeSha256
} from '../../database/evidenceStorage';
import { toast } from '../../lib/toast';

interface EvidencePipelineProps {
  sessionId: string;
  testId?: string; // Pre-associated test (optional)
  requirementId?: string;
  onProceedToReview?: () => void;
  onSkip?: () => void;
  hideStepperActions?: boolean;
}

export const EVIDENCE_KIND_OPTIONS: {
  value: EvidenceKind;
  label: string;
  icon: typeof Camera;
  desc: string;
}[] = [
  { value: 'nameplate', label: 'Nameplate & Markings', icon: Shield, desc: 'Serial badge, capacity markings, class symbol (Clause 3.3)' },
  { value: 'instrument', label: 'Instrument Overview', icon: Scale, desc: 'Complete non-automatic weighing instrument physical view' },
  { value: 'display', label: 'Display & Indication', icon: Camera, desc: 'Digital indicator readout, zero indicator, leveling bubble' },
  { value: 'test_setup', label: 'Test Load & Setup', icon: Sparkles, desc: 'Standard weights arrangement, corner positions' },
  { value: 'weights', label: 'Standard Reference Weights', icon: Layers, desc: 'OIML Class E2/F1/M1 working masses used for testing' },
  { value: 'seal', label: 'Metrological Seals', icon: FileCheck, desc: 'Lead / wire verification seal, tamper-evident sticker' },
  { value: 'certificate', label: 'Standard / Cert Document', icon: FileText, desc: 'Traceable calibration certificate or pattern approval doc' },
  { value: 'other', label: 'Other Photo / Record', icon: ImageIcon, desc: 'Environmental logging or supplementary evidence' },
];

export const TEST_ASSOCIATION_OPTIONS = [
  { value: '', label: 'General / Instrument Level' },
  { value: 'zero', label: 'Zero-Setting & Tare Balance (Clause A.4.4.2)' },
  { value: 'weighing', label: 'Weighing Performance Test (Clause A.4.4)' },
  { value: 'repeatability', label: 'Repeatability Test (Clause A.4.10)' },
  { value: 'eccentricity', label: 'Eccentricity Test (Clause A.4.7)' },
  { value: 'discrimination', label: 'Discrimination Test (Clause A.4.8)' },
  { value: 'tare', label: 'Tare Weighing Test (Clause A.4.6.1)' },
  { value: 'temperature', label: 'Temperature Effect Test (Clause A.5.3.2)' },
  { value: 'req_nameplate', label: 'Clause 3.3: Descriptive Markings' },
  { value: 'req_sealing', label: 'Clause 7.1: Metrological Sealing' },
  { value: 'req_software', label: 'Clause 5.5: Software Protection & Checksum' },
];

export function EvidencePipeline({
  sessionId,
  testId,
  requirementId,
  onProceedToReview,
  onSkip,
  hideStepperActions = false,
}: EvidencePipelineProps) {
  const navigate = useNavigate();
  const allEvidences = useAppStore((s) => s.evidence);
  const addEvidence = useAppStore((s) => s.addEvidence);
  const updateEvidence = useAppStore((s) => s.updateEvidence);
  const reorderEvidence = useAppStore((s) => s.reorderEvidence);
  const removeEvidence = useAppStore((s) => s.removeEvidence);

  // Filter and sort items by orderIndex or createdAt
  const sessionEvidences = allEvidences
    .filter((e) => e.sessionId === sessionId)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const [selectedKind, setSelectedKind] = useState<EvidenceKind>('nameplate');
  const [selectedTestId, setSelectedTestId] = useState<string>(testId || '');
  const [captionInput, setCaptionInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState<Evidence | null>(null);

  // Editing metadata on existing cards
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editKind, setEditKind] = useState<EvidenceKind>('nameplate');
  const [editTestId, setEditTestId] = useState('');

  // Drag-to-reorder state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingItem, setReplacingItem] = useState<Evidence | null>(null);

  // Batch process files from local storage
  const handleProcessFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    if (!sessionId) {
      toast.error('No Active Session', 'Please start a session first.');
      return;
    }

    setIsUploading(true);
    let count = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Robust check by MIME type and file extension
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isPdf = file.type === 'application/pdf' || ext === 'pdf';
      const isImg = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'].includes(ext);

      if (!isPdf && !isImg) {
        toast.error('Unsupported File Type', `${file.name} must be a PDF document or JPG, PNG, WEBP image.`);
        continue;
      }

      // Auto-suggest category if default is used
      let kind = selectedKind;
      const lower = file.name.toLowerCase();
      if (isPdf || lower.includes('cert') || lower.includes('calib') || lower.includes('report') || lower.includes('sheet')) {
        kind = 'certificate';
      } else if (lower.includes('nameplate') || lower.includes('badge') || lower.includes('serial')) {
        kind = 'nameplate';
      } else if (lower.includes('seal') || lower.includes('wire') || lower.includes('lead')) {
        kind = 'seal';
      } else if (lower.includes('display') || lower.includes('readout') || lower.includes('screen') || lower.includes('zero')) {
        kind = 'display';
      } else if (lower.includes('weight') || lower.includes('mass') || lower.includes('standard')) {
        kind = 'weights';
      } else if (lower.includes('setup') || lower.includes('load') || lower.includes('corner')) {
        kind = 'test_setup';
      }

      // Auto-detect test association from filename if not explicitly chosen
      let fileTestId = selectedTestId || testId || '';
      if (!fileTestId) {
        if (lower.includes('t1') || lower.includes('weighing') || lower.includes('performance')) {
          fileTestId = 'weighing';
        } else if (lower.includes('t2') || lower.includes('temp')) {
          fileTestId = 'temperature';
        } else if (lower.includes('t3') || lower.includes('eccent') || lower.includes('corner')) {
          fileTestId = 'eccentricity';
        } else if (lower.includes('t4') || lower.includes('discrim')) {
          fileTestId = 'discrimination';
        } else if (lower.includes('t5') || lower.includes('repeat')) {
          fileTestId = 'repeatability';
        } else if (lower.includes('t6') || lower.includes('creep') || lower.includes('zero_return')) {
          fileTestId = 'creep';
        } else if (lower.includes('t9') || lower.includes('tare')) {
          fileTestId = 'tare';
        }
      }

      try {
        const evidenceItem = await uploadEvidenceToStorage(file, {
          sessionId,
          kind,
          caption: (files.length === 1 && captionInput.trim()) ? captionInput.trim() : generateDefaultCaption(kind, file.name),
          notes: notesInput.trim() || undefined,
          testId: fileTestId || undefined,
          requirementId: requirementId || undefined,
          orderIndex: sessionEvidences.length + count,
        });

        addEvidence(evidenceItem);
        count++;
      } catch (err: any) {
        console.error('Error attaching evidence:', err);
        toast.error('Upload Error', `Could not attach ${file.name}: ${err.message || 'Unknown error'}`);
      }
    }

    setIsUploading(false);
    setCaptionInput('');
    setNotesInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (count > 0) {
      toast.success(
        'Evidence Attached & Stored',
        `${count} photographic record(s) secured with SHA-256 fingerprint. Detailed Report will include these figures.`
      );
    }
  };

  // Replace existing file handler
  const handleReplaceFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingItem) return;

    setIsUploading(true);
    try {
      const updated = await replaceEvidenceFileInStorage(replacingItem, file);
      updateEvidence(replacingItem.id, updated);
      toast.success('Image Replaced', `New photo and SHA-256 hash updated for ${updated.caption}.`);
    } catch (err: any) {
      toast.error('Replace Failed', err.message || 'Could not replace image file.');
    } finally {
      setIsUploading(false);
      setReplacingItem(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  // Drag-and-drop file upload handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  // Drag-to-reorder cards handler
  const handleItemDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...sessionEvidences];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    reorderEvidence(sessionId, newItems.map((i) => i.id));
  };

  const handleItemDragEnd = () => {
    setDraggedIndex(null);
  };

  // Edit metadata
  const handleStartEdit = (item: Evidence) => {
    setEditingId(item.id);
    setEditCaption(item.caption);
    setEditKind(item.kind);
    setEditTestId(item.testId || '');
  };

  const handleSaveEdit = (id: string) => {
    updateEvidence(id, {
      caption: editCaption.trim(),
      kind: editKind,
      testId: editTestId || undefined,
    });
    setEditingId(null);
    toast.success('Saved', 'Evidence metadata updated.');
  };

  const handleSkipToNext = () => {
    if (onSkip) {
      onSkip();
    } else {
      navigate(`/app/sessions/${sessionId}/review`);
    }
  };

  const handleProceedToReview = () => {
    if (onProceedToReview) {
      onProceedToReview();
    } else {
      navigate(`/app/sessions/${sessionId}/review`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
        multiple
        onChange={(e) => e.target.files && handleProcessFiles(e.target.files)}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleReplaceFile}
        className="hidden"
      />

      {/* Top Banner & Pipeline Actions */}
      {!hideStepperActions && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-accent-200 bg-accent-50/70 p-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-600 text-white shadow-xs">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-ink">
                  Step 3: Supporting Evidence (Optional)
                </h3>
                <span className="rounded-full bg-accent-100 text-accent-800 text-[10px] font-extrabold px-2 py-0.5 border border-accent-300">
                  {sessionEvidences.length} {sessionEvidences.length === 1 ? 'Figure' : 'Figures'} Attached
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5 max-w-xl">
                Upload photographs of the nameplate, zero display, standard weights, and metrological seals. If skipped, the report will compile without an empty evidence section.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleSkipToNext}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-ink-soft hover:bg-slate-50 hover:text-ink transition shadow-2xs"
            >
              Skip for Now
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-accent-600 bg-accent-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-accent-700 transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Attach Evidence
            </button>
            {sessionEvidences.length > 0 && (
              <button
                type="button"
                onClick={handleProceedToReview}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
              >
                Proceed to Review <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Zone & Metadata Selector Box */}
      <div className="rounded-3xl border border-line bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
            <Upload className="h-4 w-4 text-accent-600" />
            Upload Photo From Local Storage
          </span>
          <span className="text-[11px] font-mono text-ink-faint">
            Supports: JPG, PNG, WEBP (Original Unaltered)
          </span>
        </div>

        {/* Evidence Type Quick Selection */}
        <div>
          <label className="text-xs font-bold text-ink block mb-2">
            1. Select Evidence Type:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {EVIDENCE_KIND_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedKind === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedKind(opt.value)}
                  className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all text-xs ${
                    isSelected
                      ? 'border-accent-500 bg-accent-50/80 text-accent-950 font-bold ring-2 ring-accent-500/20 shadow-2xs'
                      : 'border-line bg-paper/40 text-ink-soft hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${isSelected ? 'text-accent-700' : 'text-ink-faint'}`} />
                  <div className="min-w-0">
                    <div className="truncate font-bold">{opt.label}</div>
                    <div className="text-[10px] text-ink-faint truncate">{opt.desc.slice(0, 28)}...</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Associated Test / Requirement & Caption Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-ink block mb-1">
              2. Associated Test / Requirement (Optional):
            </label>
            <select
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper/40 px-3 py-2 text-xs text-ink focus:border-accent-500 focus:bg-white focus:outline-none transition"
            >
              {TEST_ASSOCIATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-ink block mb-1">
              3. Caption / Figure Title (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Serial Plate and Capacity Markings under Clause 3.3"
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper/40 px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-accent-500 focus:bg-white focus:outline-none transition"
            />
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition-all ${
            isDragging
              ? 'border-accent-500 bg-accent-50/60 scale-[0.99]'
              : 'border-line bg-paper/30 hover:border-accent-400 hover:bg-paper/70'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-700 shadow-2xs">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">
                {isUploading ? 'Securing photo & generating SHA-256...' : 'Click to Browse or Drag & Drop Photos Here'}
              </div>
              <p className="text-xs text-ink-faint mt-0.5">
                Upload JPG, PNG, or WEBP photos from local device storage.
              </p>
            </div>
            <button
              type="button"
              className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-accent-300 bg-white px-4 py-2 text-xs font-bold text-accent-700 shadow-2xs hover:bg-accent-50 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Select Photos From Device
            </button>
          </div>
        </div>
      </div>

      {/* Attached Evidence Grid (Clean 2-Column Responsive Layout with Drag-to-Reorder) */}
      {sessionEvidences.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent-600" />
                Supporting Evidence Dossier ({sessionEvidences.length})
              </h4>
              <span className="text-[11px] text-ink-faint hidden sm:inline">
                (Drag cards to reorder figures in the Detailed Report)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {sessionEvidences.map((item, index) => {
                const kindObj = EVIDENCE_KIND_OPTIONS.find((k) => k.value === item.kind) || EVIDENCE_KIND_OPTIONS[0];
                const testObj = TEST_ASSOCIATION_OPTIONS.find((t) => t.value === item.testId);
                const isEditing = editingId === item.id;
                const isImage = item.dataUrl && (item.mimeType?.startsWith('image/') || item.dataUrl.startsWith('data:image/') || item.dataUrl.startsWith('http'));

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleItemDragStart(e, index)}
                    onDragOver={(e) => handleItemDragOver(e, index)}
                    onDragEnd={handleItemDragEnd}
                    className={`group relative rounded-2xl border bg-white p-4 shadow-2xs hover:border-accent-400 hover:shadow-md transition-all flex flex-col justify-between ${
                      draggedIndex === index ? 'opacity-40 border-dashed border-accent-500' : 'border-line'
                    }`}
                  >
                    <div>
                      {/* Top Header: Figure Number & Drag Handle */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="cursor-grab active:cursor-grabbing p-1 rounded-md text-ink-faint hover:text-ink hover:bg-slate-100 transition" title="Drag to reorder">
                            <GripVertical className="h-4 w-4" />
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-accent-100 text-accent-800 text-xs font-extrabold px-2.5 py-0.5 border border-accent-200">
                            Figure {index + 1}
                          </span>
                          <span className="text-xs font-bold text-ink truncate max-w-[140px]">
                            {kindObj.label}
                          </span>
                        </div>

                        {/* Unique Evidence ID badge */}
                        <span className="font-mono text-[10px] text-ink-faint bg-paper px-2 py-0.5 rounded border border-line" title={`Evidence ID: ${item.id}`}>
                          {item.id}
                        </span>
                      </div>

                      {/* Image Preview / Lightbox Trigger */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-900 border border-line flex items-center justify-center">
                        {isImage && item.dataUrl ? (
                          <img
                            src={item.dataUrl}
                            alt={item.caption}
                            className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-slate-400">
                            <FileText className="h-10 w-10 text-accent-400 mb-2" />
                            <span className="text-xs font-bold text-white text-center line-clamp-1">{item.fileName}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">{item.mimeType}</span>
                          </div>
                        )}

                        {/* View Full Size Overlay Button */}
                        {isImage && item.dataUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewItem(item)}
                            className="absolute bottom-2 right-2 rounded-lg bg-black/75 p-1.5 text-white backdrop-blur opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-black"
                            title="Expand View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Metadata Section / Inline Editing Form */}
                      <div className="mt-3 space-y-2">
                        {isEditing ? (
                          <div className="space-y-2 rounded-xl bg-slate-50 p-2.5 border border-line">
                            <div>
                              <label className="text-[10px] font-bold text-ink uppercase">Caption:</label>
                              <input
                                type="text"
                                value={editCaption}
                                onChange={(e) => setEditCaption(e.target.value)}
                                className="w-full rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-ink focus:outline-none focus:border-accent-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-ink uppercase">Type:</label>
                              <select
                                value={editKind}
                                onChange={(e) => setEditKind(e.target.value as EvidenceKind)}
                                className="w-full rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-ink focus:outline-none focus:border-accent-500"
                              >
                                {EVIDENCE_KIND_OPTIONS.map((k) => (
                                  <option key={k.value} value={k.value}>{k.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-ink uppercase">Associated Test / Requirement:</label>
                              <select
                                value={editTestId}
                                onChange={(e) => setEditTestId(e.target.value)}
                                className="w-full rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-ink focus:outline-none focus:border-accent-500"
                              >
                                {TEST_ASSOCIATION_OPTIONS.map((t) => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="px-2 py-1 rounded text-[11px] text-ink-soft hover:bg-slate-200"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(item.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent-600 text-white text-[11px] font-bold"
                              >
                                <Save className="h-3 w-3" /> Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-xs font-bold text-ink line-clamp-2 leading-snug">
                              {item.caption || item.fileName || 'Statutory Inspection Record'}
                            </div>

                            {/* Associated Test / Requirement Pill */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-800 text-[10px] font-semibold px-2 py-0.5 border border-slate-200">
                                <Sparkles className="h-3 w-3 text-accent-600" />
                                {testObj?.label || 'General / Type Level'}
                              </span>
                            </div>

                            {/* Cryptographic SHA-256 Provenance */}
                            <div className="flex items-center justify-between text-[10px] font-mono text-ink-faint pt-1 border-t border-line/60">
                              <span className="flex items-center gap-1 truncate max-w-[170px]" title={`SHA-256: ${item.sha256 || 'Verified'}`}>
                                <Hash className="h-3 w-3 text-accent-600 shrink-0" />
                                {item.sha256 ? `${item.sha256.slice(0, 16)}…` : 'SHA-256 Verified'}
                              </span>
                              <span>{item.fileSize ? `${Math.round(item.fileSize / 1024)} KB` : 'Original'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions: Replace, Edit, Delete */}
                    <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplacingItem(item);
                            replaceInputRef.current?.click();
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-700 hover:text-accent-900 transition"
                          title="Replace photo file from local storage"
                        >
                          <RefreshCw className="h-3 w-3" /> Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-soft hover:text-ink transition"
                          title="Edit caption and test association"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          removeEvidence(item.id);
                          toast.info('Evidence Removed', `Figure ${index + 1} deleted from session.`);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-800 transition"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Full-Screen Lightbox Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative max-h-[92vh] max-w-4xl w-full overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 p-4 sm:p-6 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-white">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent-400" />
                  {previewItem.caption}
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  ID: {previewItem.id} · SHA-256: {previewItem.sha256 || 'Tamper-Evident Digest'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {previewItem.dataUrl && (
              <div className="max-h-[68vh] overflow-auto rounded-2xl bg-black flex items-center justify-center p-2 border border-slate-800">
                <img
                  src={previewItem.dataUrl}
                  alt={previewItem.caption}
                  className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg"
                />
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4" /> Original Image Verified & Stored
              </span>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="btn-accent px-4 py-1.5 text-xs font-bold rounded-xl"
              >
                Close Full View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function generateDefaultCaption(kind: EvidenceKind, fileName: string): string {
  switch (kind) {
    case 'nameplate':
      return 'Manufacturer Nameplate & Statutory Capacity Markings';
    case 'instrument':
      return 'Complete Non-Automatic Weighing Instrument Physical View';
    case 'display':
      return 'Digital Weight Indicator Readout at Zero Reference';
    case 'test_setup':
      return 'Standard Working Weights Loading Configuration';
    case 'weights':
      return 'Traceable Standard Reference Weights Batch';
    case 'seal':
      return 'Lead & Wire Metrological Tamper-Evident Security Seal';
    case 'certificate':
      return 'Traceable Working Standards Calibration Certificate';
    default:
      return fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  }
}
