'use client';

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckSquare, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader, EmptyState, DemoBadge } from '../components/ui/misc';
import { Card } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { TextInput } from '../components/ui/form';
import { classLabel, fmtDate, relativeTime } from '../lib/format';

export default function PendingReviews() {
  const sessions = useAppStore((s) => s.sessions);
  const instruments = useAppStore((s) => s.instruments);
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const instOf = (id: string) => instruments.find((i) => i.id === id);

  const filtered = useMemo(() => {
    return sessions
      .filter((s) => s.status === 'awaiting_review')
      .filter((s) => {
        if (!q) return true;
        const inst = instOf(s.instrumentId);
        return `${s.code} ${inst?.model} ${inst?.serial} ${s.applicant}`.toLowerCase().includes(q.toLowerCase());
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [sessions, q]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CheckSquare className="h-5 w-5 text-accent-600" />}
        title="Pending Reviews & Approvals"
        subtitle="Test sessions submitted by testers awaiting official statutory verification and sign-off."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
          <Clock className="h-4 w-4 text-amber-500" />
          <span>{filtered.length} {filtered.length === 1 ? 'dossier' : 'dossiers'} awaiting verification</span>
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-faint" />
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code, model, applicant…"
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No pending reviews"
          hint="There are currently no sessions waiting for your review. When testers submit tests for approval, they will appear here."
          icon={<ShieldCheck className="h-8 w-8 text-emerald-500" />}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line bg-paper/60 text-xs font-semibold text-ink-faint">
                <tr>
                  <th className="th">Session Code</th>
                  <th className="th">Instrument Specifications</th>
                  <th className="th">Mode</th>
                  <th className="th">Interim Verdict</th>
                  <th className="th">Status</th>
                  <th className="th">Submitted</th>
                  <th className="th text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {filtered.map((s) => {
                  const inst = instOf(s.instrumentId);
                  return (
                    <tr
                      key={s.id}
                      className="cursor-pointer hover:bg-slate-50/80 transition"
                      onClick={() => navigate(`/app/sessions/${s.id}/review`)}
                    >
                      <td className="td">
                        <span className="flex items-center gap-2 font-bold text-accent-700">
                          {s.code}
                          {s.isDemo && <DemoBadge />}
                        </span>
                        <span className="text-[11px] text-ink-faint">{fmtDate(s.createdAt)}</span>
                      </td>
                      <td className="td">
                        <span className="font-semibold text-ink">{inst?.model ?? '—'}</span>
                        <span className="block text-[11px] text-ink-faint">
                          {inst?.manufacturer} · {inst && classLabel(inst.accuracyClass)} · Max {inst?.max}{inst?.unit}
                        </span>
                      </td>
                      <td className="td capitalize font-medium">{s.mode}</td>
                      <td className="td">
                        <StatusPill status={s.overallVerdict} size="sm" />
                      </td>
                      <td className="td">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Awaiting Approval
                        </span>
                      </td>
                      <td className="td text-ink-faint">{relativeTime(s.updatedAt)}</td>
                      <td className="td text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/app/sessions/${s.id}/review`);
                          }}
                          className="btn-accent inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
                        >
                          Review & Verify
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
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
