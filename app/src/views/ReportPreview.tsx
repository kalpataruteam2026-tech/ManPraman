'use client';

import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from '@/lib/navigation';
import { ArrowLeft, FileText, CheckCircle2, Circle, Loader2, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader, Segmented, InfoRow } from '../components/ui/misc';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { generateTestPlan } from '../regulatory/testPlan';
import { getRuleset, rulesetLabel } from '../regulatory/registry';
import { toast } from '../lib/toast';

export default function ReportPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useAppStore((s) => s.sessions.find((x) => x.id === id));
  const instrument = useAppStore((s) => s.instruments.find((i) => i.id === session?.instrumentId));
  const evidence = useAppStore((s) => s.evidence.filter((e) => e.sessionId === id));
  const finalizeReport = useAppStore((s) => s.finalizeReport);
  const can = useAppStore((s) => s.can);
  const [type, setType] = useState<'field' | 'lab'>(session?.mode === 'lab' ? 'lab' : 'field');
  const [busy, setBusy] = useState(false);

  const plan = useMemo(
    () => (instrument && session ? generateTestPlan(instrument, session.mode, getRuleset(session.rulesetId)) : []),
    [instrument, session],
  );
  if (!session || !instrument) return <p className="text-sm text-ink-faint">Session not found.</p>;

  const mandatory = plan.filter((p) => p.applicable && p.mandatory);
  const testsDone = mandatory.every((p) => session.results[p.testType]);

  const sections = [
    { label: 'Administrative information', done: true },
    { label: 'Instrument identification', done: true },
    { label: 'Reference standards', done: session.referenceStandards.length > 0 },
    { label: 'Test observations', done: testsDone },
    { label: 'Metrological calculations', done: testsDone },
    { label: 'Compliance evaluation', done: session.overallVerdict !== 'PENDING' },
    { label: 'Photographic evidence', done: evidence.length > 0, optional: true },
    { label: 'Review & approval', done: session.status === 'approved' || session.status === 'reported', optional: true },
  ];

  async function generate() {
    setBusy(true);
    const report = await finalizeReport(session!.id, type);
    setBusy(false);
    toast.success('Report sealed', `${report.code} generated`);
    navigate(`/app/reports/${report.id}`);
  }

  return (
    <div>
      <Link to={`/app/sessions/${session.id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-faint hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {session.code}
      </Link>
      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        title="Report preview"
        subtitle="Confirm the dossier is complete, then seal an immutable report version."
        actions={<StatusPill status={session.overallVerdict} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Completeness checklist" subtitle="Content-driven — report length follows the data" />
          <CardBody className="space-y-2.5">
            {sections.map((s) => (
              <div key={s.label} className="flex items-center gap-2.5">
                {s.done ? <CheckCircle2 className="h-4 w-4 text-pass-fg" /> : <Circle className="h-4 w-4 text-ink-faint" />}
                <span className="text-sm text-ink">{s.label}</span>
                {s.optional && !s.done && <span className="chip bg-paper text-ink-faint">optional</span>}
              </div>
            ))}
            {!testsDone && (
              <p className="mt-2 rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn-fg">
                Cannot finalize — {mandatory.filter((p) => !session.results[p.testType]).length} required test(s) remain incomplete.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Report options" />
          <CardBody className="space-y-4">
            <div>
              <span className="label">Report type</span>
              <Segmented
                value={type}
                onChange={setType}
                options={[
                  { value: 'field', label: 'Field report' },
                  { value: 'lab', label: 'Laboratory dossier' },
                ]}
              />
              <p className="mt-2 text-xs text-ink-faint">
                {type === 'field'
                  ? 'Compact verification report (~4–8 pages, content-driven) for field / periodic use.'
                  : 'Comprehensive pattern-evaluation dossier with full test matrix and annexures.'}
              </p>
            </div>
            <InfoRow label="Standard" value={rulesetLabel(getRuleset(session.rulesetId))} />
            <InfoRow label="Engine" value="metrology-engine/1.0.0" />
            <div className="flex items-start gap-2 rounded-lg bg-paper px-3 py-2 text-xs text-ink-faint">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
              On finalize, a canonical SHA-256 integrity hash and a verification ID are generated. Editing later creates a new report version — the sealed version is never silently changed.
            </div>
            {can('report.generate') ? (
              <button className="btn-accent w-full py-2.5" disabled={!testsDone || busy} onClick={generate}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {busy ? 'Sealing report…' : 'Generate & seal report'}
              </button>
            ) : (
              <p className="rounded-lg bg-paper px-3 py-2 text-xs text-ink-faint">Your role cannot generate reports.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
