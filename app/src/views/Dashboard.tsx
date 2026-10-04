'use client';

import { Link, useNavigate } from '@/lib/navigation';
import { motion } from 'framer-motion';
import {
  Plus, ClipboardList, ClipboardCheck, FileCheck2, TriangleAlert, ArrowRight, Play, ShieldCheck, FileText,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { DemoBadge } from '../components/ui/misc';
import { Card, CardHeader } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { AnimatedNumber, Stagger, StaggerItem } from '../components/ui/motion';
import { classLabel, relativeTime, sessionStatusLabel } from '../lib/format';
import type { ComponentType } from 'react';
import type { TestSession } from '../domain/types';

export default function Dashboard() {
  const sessions = useAppStore((s) => s.sessions);
  const reports = useAppStore((s) => s.reports);
  const instruments = useAppStore((s) => s.instruments);
  const user = useAppStore((s) => s.currentUser);
  const navigate = useNavigate();

  const instOf = (id: string) => instruments.find((i) => i.id === id);
  const active = sessions.filter((s) => s.status === 'in_progress' || s.status === 'draft').length;
  const awaiting = sessions.filter((s) => s.status === 'awaiting_review').length;
  const failing = sessions.filter((s) => s.overallVerdict === 'FAIL').length;
  const recent = [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const demoFail = sessions.find((s) => s.id === 'sess_demo_fail');

  return (
    <div>
      {/* Solid Champagne & Espresso Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative mb-6 overflow-hidden rounded-xl bg-espresso-950 border border-espresso-800 p-6 text-champagne-100 sm:p-8 shadow-panel"
      >
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-400">Metrological Workplace</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-champagne-100 sm:text-4xl">{user?.name ?? 'Officer'}</h1>
            <p className="mt-2 max-w-md text-sm text-champagne-200/80">
              Overview of your active weighing instrument test sessions, compliance reviews, and certified reports.
            </p>
          </div>
          <button
            className="btn bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold h-11 px-6 text-sm shadow-lg shadow-emerald-500/25 rounded-xl inline-flex items-center gap-2.5 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] border border-emerald-300/40 ring-2 ring-emerald-400/20"
            onClick={() => navigate('/app/instruments/new')}
            title="Open Register Instrument form to configure a new instrument model"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20 text-white">
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
            </span>
            <span className="tracking-wide">Register Instrument</span>
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active sessions" value={active} icon={ClipboardList} tone="accent" />
        <StatCard label="Under review" value={awaiting} icon={ClipboardCheck} tone="warn" />
        <StatCard label="Reports generated" value={reports.length} icon={FileCheck2} tone="rose" />
        <StatCard label="Failures flagged" value={failing} icon={TriangleAlert} tone={failing ? 'fail' : 'accent'} />
      </Stagger>

      {demoFail && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 flex flex-col gap-4 rounded-xl border border-champagne-300 bg-champagne-100/80 p-5 sm:flex-row sm:items-center shadow-card"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-espresso-800 text-champagne-300 shadow-card">
            <Play className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-espresso-900">Try the live verification demo</span>
              <DemoBadge />
            </div>
            <p className="mt-0.5 text-xs text-ink-soft">
              Session <b>{demoFail.code}</b> has one deliberate out-of-tolerance point — open it to observe the transparent formula breakdown and tolerance limit envelope.
            </p>
          </div>
          <button
            className="btn-primary shrink-0 text-xs"
            onClick={() => navigate(`/app/sessions/${demoFail.id}`)}
          >
            Open Demo Session <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      {/* Recent sessions table & Reports list */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden border border-line shadow-card">
          <CardHeader
            className="bg-gradient-to-r from-indigo-50/40 via-slate-50/20 to-white"
            icon={<ClipboardList className="h-5 w-5 text-indigo-600" />}
            title={<span className="font-display text-base font-bold text-slate-900 tracking-tight">Recent Test Sessions</span>}
            subtitle="Latest instruments undergoing field verification or laboratory test"
            actions={<Link to="/app/sessions" className="text-xs font-semibold text-accent-700 hover:text-accent-800 transition">View all</Link>}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-champagne-50/70 text-ink-faint">
                <tr>
                  <th className="th">Session</th>
                  <th className="th">Instrument</th>
                  <th className="th">Mode</th>
                  <th className="th">Verdict</th>
                  <th className="th">Status</th>
                  <th className="th">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recent.map((s) => (
                  <SessionRow
                    key={s.id}
                    s={s}
                    instName={instOf(s.instrumentId)?.model ?? '—'}
                    cls={instOf(s.instrumentId)?.accuracyClass}
                    onClick={() => navigate(`/app/sessions/${s.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden border border-line shadow-card">
          <CardHeader
            className="bg-gradient-to-r from-emerald-50/40 via-slate-50/20 to-white"
            icon={<FileCheck2 className="h-5 w-5 text-emerald-600" />}
            title={<span className="font-display text-base font-bold text-slate-900 tracking-tight">Certified Reports</span>}
            subtitle="Tamper-evident verification certificates"
            actions={<Link to="/app/reports" className="text-xs font-semibold text-accent-700 hover:text-accent-800 transition">All ({reports.length})</Link>}
          />
          <div className="divide-y divide-line">
            {reports.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3.5 transition hover:bg-slate-50"
              >
                <Link to={`/app/reports/${r.id}`} className="min-w-0 flex-1 pr-2">
                  <div className="font-bold text-xs text-ink truncate hover:text-accent-700 transition">{r.code}</div>
                  <div className="text-[11px] text-ink-faint truncate mt-0.5">
                    {r.snapshot?.instrument?.manufacturer} · {r.snapshot?.instrument?.model}
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusPill status={r.overallVerdict} size="sm" />
                  <Link
                    to={`/verify/${r.code || r.verificationId}`}
                    title="Verify Certificate"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition shadow-xs"
                  >
                    <ShieldCheck className="h-3 w-3" /> Verify
                  </Link>
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <div className="p-8 text-center text-xs text-ink-faint">
                <FileText className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-ink">No certified reports issued yet</p>
                <p className="mt-1 text-ink-faint">Reports generated upon test completion appear here with verified certificates.</p>
                <button
                  onClick={() => navigate('/app/sessions')}
                  className="btn-accent inline-flex items-center gap-1.5 mt-3 text-xs px-3 py-1.5 rounded-lg"
                >
                  Go to Sessions
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

const SOLID_TONES = {
  accent: 'bg-accent-500 text-espresso-950',
  rose: 'bg-rose-500 text-white',
  warn: 'bg-warn-line text-white',
  fail: 'bg-fail-fg text-white',
} as const;

function StatCard({
  label, value, icon: Icon, tone,
}: {
  label: string; value: number; icon: ComponentType<{ className?: string }>; tone: keyof typeof SOLID_TONES;
}) {
  return (
    <StaggerItem>
      <div className="card card-hover p-4">
        <div className="flex items-center justify-between">
          <span className="section-title">{label}</span>
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-card font-bold ${SOLID_TONES[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2 font-display text-3xl font-bold tabular text-espresso-900">
          <AnimatedNumber value={value} />
        </div>
      </div>
    </StaggerItem>
  );
}

function SessionRow({ s, instName, cls, onClick }: { s: TestSession; instName: string; cls?: any; onClick: () => void }) {
  return (
    <tr className="cursor-pointer transition hover:bg-champagne-50/60" onClick={onClick}>
      <td className="td"><span className="font-semibold text-accent-700">{s.code}</span></td>
      <td className="td">{instName} {cls && <span className="text-ink-faint">· {classLabel(cls)}</span>}</td>
      <td className="td capitalize">{s.mode}</td>
      <td className="td"><StatusPill status={s.overallVerdict} size="sm" /></td>
      <td className="td capitalize">{sessionStatusLabel(s.status)}</td>
      <td className="td text-ink-faint">{relativeTime(s.updatedAt)}</td>
    </tr>
  );
}
