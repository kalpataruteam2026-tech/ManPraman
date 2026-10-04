'use client';

import { useState } from 'react';
import { Link, useNavigate } from '@/lib/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Gauge, Plus, Trash2, CheckSquare, Square, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader, EmptyState, DemoBadge } from '../components/ui/misc';
import { classLabel } from '../lib/format';
import { verificationIntervals, type Instrument } from '../domain/types';
import { toast } from '../lib/toast';

export default function Instruments() {
  const instruments = useAppStore((s) => s.instruments);
  const deleteInstrument = useAppStore((s) => s.deleteInstrument);
  const deleteInstruments = useAppStore((s) => s.deleteInstruments);
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allSelected = instruments.length > 0 && selectedIds.length === instruments.length;
  const isIndeterminate = selectedIds.length > 0 && !allSelected;

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(instruments.map((i) => i.id));
    }
  }

  function handleDeleteSingle(e: React.MouseEvent, inst: Instrument) {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to delete instrument "${inst.manufacturer} ${inst.model}" (SN: ${inst.serial})?`
    );
    if (!confirmed) return;

    deleteInstrument(inst.id);
    setSelectedIds((prev) => prev.filter((x) => x !== inst.id));
    toast.success('Instrument Deleted', `${inst.model} has been removed.`);
  }

  function handleDeleteSelected() {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the ${selectedIds.length} selected instrument(s)?`
    );
    if (!confirmed) return;

    const count = selectedIds.length;
    deleteInstruments(selectedIds);
    setSelectedIds([]);
    toast.success('Instruments Deleted', `${count} instrument(s) successfully removed.`);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Gauge className="h-5 w-5" />}
        title="Instruments"
        subtitle="Registered Non-Automatic Weighing Instruments."
        actions={
          <button
            className="btn-accent inline-flex items-center gap-2"
            onClick={() => navigate('/app/instruments/new')}
          >
            <Plus className="h-4 w-4" /> Register Instrument
          </button>
        }
      />

      {instruments.length === 0 ? (
        <EmptyState
          title="No instruments registered"
          hint="Register an instrument to start testing."
          icon={<Gauge className="h-8 w-8" />}
          action={
            <button
              className="btn-primary mt-4 inline-flex items-center gap-2"
              onClick={() => navigate('/app/instruments/new')}
            >
              <Plus className="h-4 w-4" /> Register Instrument
            </button>
          }
        />
      ) : (
        <>
          {/* Album-style pop up selection bar: only pops up when any instrument is selected */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs shadow-md backdrop-blur animate-fade-up"
              >
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-ink hover:text-rose-800 transition">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span>Select All ({instruments.length})</span>
                  </label>

                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-rose-800 border border-rose-200 shadow-2xs">
                    {selectedIds.length} of {instruments.length} selected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-ink-faint hover:text-ink hover:bg-white/80 transition"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Selected ({selectedIds.length})
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instrument Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {instruments.map((i) => {
              const isSelected = selectedIds.includes(i.id);
              return (
                <div
                  key={i.id}
                  className={`card relative p-5 transition group ${
                    isSelected
                      ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-400/50 shadow-md'
                      : 'hover:border-accent-500 hover:shadow-panel'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Checkbox for selection */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSelect(i.id);
                        }}
                        className="mt-0.5 shrink-0 text-ink-faint hover:text-accent-700 transition"
                        title={isSelected ? 'Deselect instrument' : 'Select instrument for delete'}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-rose-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                        )}
                      </button>

                      <Link to={`/app/instruments/${i.id}`} className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-bold text-ink hover:text-accent-700 transition truncate">
                          {i.model} {i.isDemo && <DemoBadge />}
                        </div>
                        <div className="text-xs text-ink-faint truncate">{i.manufacturer}</div>
                      </Link>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="chip bg-navy-50 text-navy-700">{classLabel(i.accuracyClass)}</span>
                      {/* Individual Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSingle(e, i)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
                        title="Delete instrument"
                        aria-label={`Delete ${i.model}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <Link to={`/app/instruments/${i.id}`} className="block">
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <Mini label="Max" value={`${i.max} ${i.unit}`} />
                      <Mini label="e" value={`${i.e} ${i.unit}`} />
                      <Mini label="n" value={verificationIntervals(i).toLocaleString()} />
                    </div>
                    <div className="mt-3 border-t border-line pt-2 text-xs text-ink-faint flex items-center justify-between">
                      <span className="truncate">SN {i.serial} · {i.instrumentType}</span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-paper py-2">
      <div className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="tabular text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

