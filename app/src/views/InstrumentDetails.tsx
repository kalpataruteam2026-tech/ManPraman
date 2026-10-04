'use client';

import { useParams, useNavigate, Link } from '@/lib/navigation';
import { Gauge, Plus, ArrowLeft, Play, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader, InfoRow, DemoBadge } from '../components/ui/misc';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { classLabel, fmtDate } from '../lib/format';
import { verificationIntervals } from '../domain/types';

export default function InstrumentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const instrument = useAppStore((s) => s.instruments.find((i) => i.id === id));
  const sessions = useAppStore((s) => s.sessions.filter((x) => x.instrumentId === id));
  const createSession = useAppStore((s) => s.createSession);
  const activeSession = sessions.find((s) => s.status === 'in_progress' || s.status === 'draft');

  if (!instrument) return <p className="text-sm text-ink-faint">Instrument not found.</p>;

  return (
    <div>
      <Link to="/app/instruments" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-faint hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Instruments
      </Link>
      <PageHeader
        icon={<Gauge className="h-5 w-5" />}
        title={<span className="flex items-center gap-2">{instrument.manufacturer} {instrument.model} {instrument.isDemo && <DemoBadge />}</span>}
        subtitle={`${instrument.instrumentType} · SN ${instrument.serial}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              className="btn bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-10 px-5 text-sm shadow-md shadow-emerald-950/20 rounded-xl inline-flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                if (activeSession) {
                  navigate(`/app/sessions/${activeSession.id}`);
                } else {
                  const s = createSession({ instrumentId: instrument.id });
                  navigate(`/app/sessions/${s.id}`);
                }
              }}
              title={activeSession ? 'Continue active verification testing session' : 'Proceed to verification testing session for this instrument'}
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{activeSession ? 'Continue Testing' : 'Proceed to Testing'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            {activeSession && (
              <button
                className="btn-ghost text-xs text-ink-soft hover:text-ink flex items-center gap-1 border border-line bg-surface px-3 py-2 rounded-xl"
                onClick={() => {
                  const s = createSession({ instrumentId: instrument.id });
                  navigate(`/app/sessions/${s.id}`);
                }}
                title="Start a new additional test session"
              >
                <Plus className="h-3.5 w-3.5" /> Start New Test
              </button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Metrological characteristics" />
          <CardBody>
            <InfoRow label="Accuracy class" value={classLabel(instrument.accuracyClass)} />
            <InfoRow label="Max" value={`${instrument.max} ${instrument.unit}`} />
            <InfoRow label="Min" value={`${instrument.min} ${instrument.unit}`} />
            <InfoRow label="e — verification interval" value={`${instrument.e} ${instrument.unit}`} />
            <InfoRow label="d — actual interval" value={`${instrument.d} ${instrument.unit}`} />
            <InfoRow label="n = Max / e" value={verificationIntervals(instrument).toLocaleString()} />
            <InfoRow label="Interval config" value={<span className="capitalize">{instrument.intervalConfig.replace('_', ' ')}</span>} />
            <InfoRow label="Tare" value={<span className="capitalize">{instrument.tareType}</span>} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Construction & software" />
          <CardBody>
            <InfoRow label="Display" value={instrument.displayType ?? '—'} />
            <InfoRow label="Software version" value={instrument.softwareVersion ?? '—'} />
            <InfoRow label="Software hash" value={instrument.softwareHash ?? '—'} />
            <InfoRow label="Load cell" value={instrument.loadCellInfo ?? '—'} />
            <InfoRow label="Indicator" value={instrument.indicatorInfo ?? '—'} />
            <InfoRow label="Power" value={instrument.power ?? '—'} />
            <InfoRow label="Model approval" value={instrument.modelApprovalNo ?? '—'} />
            <InfoRow label="Registered" value={fmtDate(instrument.createdAt)} />
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Test history" subtitle={`${sessions.length} session(s)`} />
        <div className="divide-y divide-line">
          {sessions.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-ink-soft mb-3">No test sessions recorded for this instrument yet.</p>
              <button
                className="btn bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl inline-flex items-center gap-2 transition shadow-sm"
                onClick={() => {
                  const s = createSession({ instrumentId: instrument.id });
                  navigate(`/app/sessions/${s.id}`);
                }}
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Proceed to Testing
              </button>
            </div>
          )}
          {sessions.map((s) => (
            <Link key={s.id} to={`/app/sessions/${s.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-paper">
              <div>
                <div className="text-sm font-semibold text-accent-700">{s.code}</div>
                <div className="text-xs text-ink-faint">{fmtDate(s.createdAt)} · {s.mode} · {s.status.replace(/_/g, ' ')}</div>
              </div>
              <StatusPill status={s.overallVerdict} size="sm" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
