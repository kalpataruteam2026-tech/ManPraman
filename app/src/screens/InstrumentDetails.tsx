import { useParams, useNavigate, Link } from 'react-router-dom';
import { Gauge, Plus, ArrowLeft, RefreshCw, FileText, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader, InfoRow, DemoBadge } from '../components/ui/misc';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { classLabel, fmtDate, fmtDateTime, EVAL_LABEL } from '../lib/format';
import { verificationIntervals } from '../domain/types';

export default function InstrumentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const instrument = useAppStore((s) => s.instruments.find((i) => i.id === id));
  const sessions = useAppStore((s) => s.sessions.filter((x) => x.instrumentId === id));
  const user = useAppStore((s) => s.currentUser);
  const createSession = useAppStore((s) => s.createSession);

  if (!instrument) return <p className="text-sm text-ink-faint">Instrument not found.</p>;

  function startNewSession() {
    if (!instrument) return;
    const s = createSession({
      instrumentId: instrument.id,
      applicant: sessions[0]?.applicant || '',
      testLocation: sessions[0]?.testLocation || '',
    });
    navigate(`/app/sessions/${s.id}`);
  }

  return (
    <div className="space-y-6">
      <Link
        to="/app/instruments"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-faint hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Instruments
      </Link>
      <PageHeader
        icon={<Gauge className="h-5 w-5" />}
        title={
          <span className="flex items-center gap-2">
            {instrument.manufacturer} {instrument.model}
          </span>
        }
        subtitle={`${instrument.instrumentType} · Serial No: ${instrument.serial}`}
        actions={
          user?.role !== 'reviewer' ? (
            <div className="flex items-center gap-2">
              <button
                className="btn-accent flex items-center gap-2"
                onClick={startNewSession}
              >
                <RefreshCw className="h-4 w-4" /> Test Again / New Session
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Metrological Characteristics" />
          <CardBody>
            <InfoRow label="Accuracy class" value={classLabel(instrument.accuracyClass)} />
            <InfoRow label="Max" value={`${instrument.max} ${instrument.unit}`} />
            <InfoRow label="Min" value={`${instrument.min} ${instrument.unit}`} />
            <InfoRow label="e — verification interval" value={`${instrument.e} ${instrument.unit}`} />
            <InfoRow label="d — actual interval" value={`${instrument.d} ${instrument.unit}`} />
            <InfoRow
              label="n = Max / e"
              value={verificationIntervals(instrument).toLocaleString()}
            />
            <InfoRow
              label="Interval config"
              value={<span className="capitalize">{instrument.intervalConfig.replace('_', ' ')}</span>}
            />
            <InfoRow
              label="Tare"
              value={<span className="capitalize">{instrument.tareType}</span>}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Construction & Hardware Specs" />
          <CardBody>
            <InfoRow label="Display" value={instrument.displayType ?? '—'} />
            <InfoRow label="Software version" value={instrument.softwareVersion ?? '—'} />
            <InfoRow label="Software hash" value={instrument.softwareHash ?? '—'} />
            <InfoRow label="Load cell" value={instrument.loadCellInfo ?? '—'} />
            <InfoRow label="Indicator" value={instrument.indicatorInfo ?? '—'} />
            <InfoRow label="Power" value={instrument.power ?? '—'} />
            <InfoRow label="Model approval" value={instrument.modelApprovalNo ?? '—'} />
            <InfoRow label="Registered date" value={fmtDate(instrument.createdAt)} />
          </CardBody>
        </Card>
      </div>

      {/* Test History Section (CHANGE #6) */}
      <Card>
        <CardHeader
          title="Instrument Test & Verification History"
          subtitle={`Complete lifecycle record of all ${sessions.length} evaluation session(s) conducted on this machine.`}
        />
        {sessions.length === 0 ? (
          <p className="p-6 text-sm text-ink-faint">
            No test sessions recorded for this instrument yet. Click &ldquo;Test Again / New Session&rdquo; above to start.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper/60 text-[11px] uppercase tracking-wider text-ink-faint">
                <tr>
                  <th className="th">Session Code</th>
                  <th className="th">Evaluation Type</th>
                  <th className="th">Tester</th>
                  <th className="th">Date</th>
                  <th className="th">Session Status</th>
                  <th className="th">Overall Result</th>
                  <th className="th text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-paper/60 cursor-pointer"
                    onClick={() => navigate(`/app/sessions/${s.id}`)}
                  >
                    <td className="td font-bold text-accent-700">{s.code}</td>
                    <td className="td text-xs">{EVAL_LABEL[s.evaluationType] || s.mode}</td>
                    <td className="td text-xs text-ink-soft">{s.technicianName}</td>
                    <td className="td text-xs text-ink-faint">{fmtDate(s.createdAt)}</td>
                    <td className="td capitalize text-xs">
                      <span className="chip bg-paper text-ink">{s.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="td">
                      <StatusPill status={s.overallVerdict} size="sm" />
                    </td>
                    <td className="td text-right">
                      <span className="text-xs font-semibold text-accent-700 hover:underline inline-flex items-center gap-0.5">
                        View <ChevronRight className="h-3 w-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
