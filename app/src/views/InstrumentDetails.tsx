'use client';

import { useParams, useNavigate, Link } from '@/lib/navigation';
import { Gauge, Plus, ArrowLeft } from 'lucide-react';
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
          <button
            className="btn-accent"
            onClick={() => {
              const s = createSession({ instrumentId: instrument.id });
              navigate(`/app/sessions/${s.id}`);
            }}
          >
            <Plus className="h-4 w-4" /> New session
          </button>
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
          {sessions.length === 0 && <p className="p-5 text-sm text-ink-faint">No sessions for this instrument yet.</p>}
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
