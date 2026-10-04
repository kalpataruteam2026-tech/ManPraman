'use client';

import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@/lib/navigation';
import { Plus, ClipboardList, Search, ArrowLeft, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader, EmptyState, Segmented, DemoBadge } from '../components/ui/misc';
import { Card } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { classLabel, fmtDate, relativeTime, sessionStatusLabel } from '../lib/format';
import { CsvSessionImporter } from '../components/CsvSessionImporter';
import type { SessionStatus } from '../domain/types';

type Filter = 'all' | 'active' | 'awaiting_review' | 'completed';

export default function SessionsList() {
  const sessions = useAppStore((s) => s.sessions);
  const instruments = useAppStore((s) => s.instruments);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const instOf = (id: string) => instruments.find((i) => i.id === id);

  const filtered = useMemo(() => {
    const activeSet: SessionStatus[] = ['draft', 'in_progress'];
    const reviewSet: SessionStatus[] = ['awaiting_review', 'ready_for_review', 'under_review'];
    const completedSet: SessionStatus[] = ['approved', 'reported', 'rejected'];
    return sessions
      .filter((s) => {
        if (filter === 'active') return activeSet.includes(s.status);
        if (filter === 'awaiting_review') return reviewSet.includes(s.status);
        if (filter === 'completed') return completedSet.includes(s.status);
        return true;
      })
      .filter((s) => {
        if (!q) return true;
        const inst = instOf(s.instrumentId);
        return `${s.code} ${inst?.model || ''} ${inst?.serial || ''} ${s.applicant || ''}`.toLowerCase().includes(q.toLowerCase());
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [sessions, filter, q]);

  return (
    <div>
      {/* Back button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-xs transition hover:bg-slate-50 hover:text-ink active:scale-98"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-ink-faint" /> Back to Dashboard
        </button>
      </div>

      <PageHeader
        icon={<ClipboardList className="h-5 w-5" />}
        title="Test Sessions"
        subtitle="All testing activity across instruments and modes."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CsvSessionImporter compact />
            <button className="btn-accent" onClick={() => navigate('/app/sessions/new')}>
              <Plus className="h-4 w-4" /> New Test
            </button>
          </div>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'In progress' },
            { value: 'awaiting_review', label: 'Under review' },
            { value: 'completed', label: 'Completed' },
          ]}
        />

        {/* Google-style Search Box */}
        <div className="relative w-full sm:w-80 md:w-96 group">
          <div className="relative flex items-center w-full rounded-full border border-slate-200 bg-white px-3.5 py-2 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 focus-within:shadow-md focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100">
            <Search className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 mr-2.5" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search code, model, applicant…"
              className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="ml-1 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition shrink-0"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No sessions found" hint="Create a new test session to begin." icon={<ClipboardList className="h-8 w-8" />} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line bg-paper/60">
                <tr>
                  <th className="th">Session</th><th className="th">Instrument</th><th className="th">Mode</th>
                  <th className="th">Verdict</th><th className="th">Status</th><th className="th">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((s) => {
                  const inst = instOf(s.instrumentId);
                  const isUnderReview = s.status === 'awaiting_review' || s.status === 'ready_for_review' || s.status === 'under_review';
                  return (
                    <tr key={s.id} className="cursor-pointer hover:bg-paper" onClick={() => navigate(`/app/sessions/${s.id}`)}>
                      <td className="td">
                        <span className="flex items-center gap-2 font-semibold text-accent-700">{s.code}{s.isDemo && <DemoBadge />}</span>
                        <span className="text-xs text-ink-faint">{fmtDate(s.createdAt)}</span>
                      </td>
                      <td className="td">{inst?.model ?? '—'} <span className="text-ink-faint">· {inst && classLabel(inst.accuracyClass)}</span></td>
                      <td className="td capitalize">{s.mode}</td>
                      <td className="td"><StatusPill status={s.overallVerdict} size="sm" /></td>
                      <td className="td">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isUnderReview
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : s.status === 'in_progress'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : s.status === 'reported' || s.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-paper text-ink border border-line'
                        }`}>
                          {sessionStatusLabel(s.status)}
                        </span>
                      </td>
                      <td className="td text-ink-faint">{relativeTime(s.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
