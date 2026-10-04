import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle2, Circle, Loader2, ShieldCheck, QrCode, PenTool, Check, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader, InfoRow } from '../components/ui/misc';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { generateTestPlan } from '../regulatory/testPlan';
import { getRuleset, rulesetLabel } from '../regulatory/registry';
import { toast } from '../lib/toast';
import { classLabel } from '../lib/format';

export default function ReportPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useAppStore((s) => s.sessions.find((x) => x.id === id));
  const instrument = useAppStore((s) => s.instruments.find((i) => i.id === session?.instrumentId));
  const submitForReview = useAppStore((s) => s.submitForReview);
  const can = useAppStore((s) => s.can);
  const [busy, setBusy] = useState(false);

  const plan = useMemo(
    () => (instrument && session ? generateTestPlan(instrument, session.mode, getRuleset(session.rulesetId)) : []),
    [instrument, session],
  );
  if (!session || !instrument) return <p className="text-sm text-ink-faint">Session not found.</p>;

  const mandatory = plan.filter((p) => p.applicable && p.mandatory);
  const testsDone = mandatory.every((p) => session.results[p.testType]);

  async function handleSendForApproval() {
    setBusy(true);
    // Simulate a brief backend processing delay for generating signatures/QR
    await new Promise(r => setTimeout(r, 1200));
    submitForReview(session!.id);
    setBusy(false);
    toast.success('Sent for approval', `Session ${session!.code} has been sent to the reviewer.`);
    navigate('/app/my-sessions');
  }

  return (
    <div className="pb-24">
      <Link to={`/app/sessions/${session.id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-faint hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to Test Session
      </Link>
      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        title="Generate Report & Approval"
        subtitle="Review the final compiled test results, digital signatures, and send to the reviewer for final approval."
        actions={<StatusPill status={session.overallVerdict} />}
      />

      <div className="space-y-6">
        {/* Top Section: Object Details, QR Code, Digital Sign */}
        <Card className="border-accent-200 shadow-sm bg-gradient-to-br from-white to-slate-50">
          <CardBody className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-ink">{instrument.manufacturer} {instrument.model}</h2>
                <div className="text-sm text-ink-faint">Application ID: {session.code} · Model Approval: {instrument.modelApprovalNo || 'N/A'}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <InfoRow label="Accuracy Class" value={`Class ${classLabel(instrument.accuracyClass)}`} />
                <InfoRow label="Max Capacity" value={`${instrument.max} ${instrument.unit}`} />
                <InfoRow label="Min Capacity" value={`${instrument.min} ${instrument.unit}`} />
                <InfoRow label="Verification Scale (e)" value={`${instrument.e} ${instrument.unit}`} />
              </div>
            </div>

            <div className="flex gap-6 border-t md:border-t-0 md:border-l border-line pt-4 md:pt-0 md:pl-6">
              {/* Digital Signature Block */}
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="h-20 w-32 border-2 border-dashed border-accent-300 rounded-lg flex items-center justify-center bg-accent-50 text-accent-700">
                  <PenTool className="h-6 w-6 opacity-50" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-ink">Tester Sign</div>
                  <div className="text-[10px] text-ink-faint">Pending Approval</div>
                </div>
              </div>

              {/* QR Code Block */}
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="h-20 w-20 border-2 border-slate-200 rounded-lg flex items-center justify-center bg-white">
                  <QrCode className="h-10 w-10 text-slate-800" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-ink">Verification QR</div>
                  <div className="text-[10px] text-ink-faint">Scan for authenticity</div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Middle Section: 17 Tests Pass/Fail Table */}
        <Card>
          <CardHeader title="Detailed Test Results (OIML R-76)" subtitle="Summary of all applicable metrological calculations" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-ink-faint border-y border-line">
                <tr>
                  <th className="px-4 py-3 font-semibold">Test Code & Name</th>
                  <th className="px-4 py-3 font-semibold w-32">Status</th>
                  <th className="px-4 py-3 font-semibold">Reasoning / Calculation Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {plan.map((t) => {
                  const res = session.results[t.testType as keyof typeof session.results];
                  const isDone = !!res;
                  return (
                    <tr key={t.testType} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">{t.name}</div>
                        <div className="text-xs text-ink-faint">{t.reason}</div>
                      </td>
                      <td className="px-4 py-3">
                        {isDone ? (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                            res.status === 'PASS' ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'
                          }`}>
                            {res.status === 'PASS' ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                            {res.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                            <Circle className="h-3.5 w-3.5" /> PENDING
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft max-w-xs truncate">
                        {isDone ? (
                          <span>
                            {res.status === 'PASS' ? 'Calculations within MPE boundaries. ' : 'Exceeded MPE limits. '}
                            <Link to={`/app/sessions/${session.id}/test/${t.testType}`} className="text-accent-600 hover:underline">View detailed calculation ↗</Link>
                          </span>
                        ) : (
                          'Not executed yet.'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom Section: Send for Approval Action */}
        <div className="flex flex-col items-center justify-center py-6">
          {!testsDone && (
            <p className="mb-4 rounded-lg bg-warn-bg px-4 py-2.5 text-sm font-medium text-warn-fg border border-warn-line">
              Cannot send for approval — {mandatory.filter((p) => !session.results[p.testType]).length} required test(s) remain incomplete.
            </p>
          )}
          
          <button 
            className="btn-accent w-full max-w-md py-3.5 text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            disabled={!testsDone || busy} 
            onClick={handleSendForApproval}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            {busy ? 'Processing & Securing Workflow...' : 'Send for Approval'}
          </button>
          <p className="mt-3 text-xs text-ink-faint max-w-md text-center">
            By clicking Send for Approval, this session will be locked and forwarded to the Reviewer. The reviewer will verify the 17 tests and calculations before final PDF generation.
          </p>
        </div>

      </div>
    </div>
  );
}
