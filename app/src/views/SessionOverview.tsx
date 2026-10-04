'use client';

import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from '@/lib/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle, FileText, Upload,
  Cpu, SlidersHorizontal, Scale, Check, Clock, Send, CheckSquare, ShieldCheck, AlertCircle, Sparkles, Info, Camera
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { classLabel } from '../lib/format';
import { OIML_17_TESTS } from '../domain/oiml17Tests';
import { evaluateTestApplicability } from '../lib/testApplicability';
import { CsvSessionImporter } from '../components/CsvSessionImporter';
import { EvidenceUploader } from '../components/evidence/EvidenceUploader';
import { toast } from '../lib/toast';

export default function SessionOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useAppStore((s) => s.sessions.find((x) => x.id === id));
  const instrument = useAppStore((s) => s.instruments.find((i) => i.id === session?.instrumentId));
  const submitForReview = useAppStore((s) => s.submitForReview);
  const currentUser = useAppStore((s) => s.currentUser);
  
  // Tab toggle: [Manual] | [CSV] | [Evidence]
  const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'evidence'>('manual');

  const testPlan = useMemo(() => evaluateTestApplicability(instrument), [instrument]);

  if (!session || !instrument) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-ink-faint">Session not found.</p>
        <Link className="mt-2 inline-block font-semibold text-accent-700" to="/app/sessions">
          Back to sessions
        </Link>
      </div>
    );
  }

  // Count how many of the applicable tests are completed
  const resultsMap = (session.results || {}) as Record<string, any>;
  const applicableCompletedCount = testPlan.suggestedTests.filter(t => resultsMap[t.testType]).length;
  const progressPercent = testPlan.applicableCount > 0 
    ? Math.round((applicableCompletedCount / testPlan.applicableCount) * 100) 
    : 0;

  const isAwaitingApproval = session.status === 'awaiting_review' || session.status === 'ready_for_review' || session.status === 'under_review';
  const isApproved = session.status === 'approved' || session.status === 'reported';

  return (
    <div className="space-y-6 pb-20">
      {/* Top back navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/sessions"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-faint hover:text-ink transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Test Sessions
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          {!isApproved && (
            <button
              onClick={() => {
                submitForReview(session.id);
                toast.success('Sent for Approval', 'Report submitted to Reviewer (reviewer@metrocert.gov.in)');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-accent-300 bg-accent-50 px-3.5 py-2 text-xs font-bold text-accent-800 hover:bg-accent-100 transition shadow-sm"
            >
              <Send className="h-4 w-4 text-accent-700" /> Send Report for Approval
            </button>
          )}

          <Link
            to={`/app/sessions/${session.id}/review`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50/80 px-3.5 py-2 text-xs font-bold text-cyan-900 hover:bg-cyan-100 transition shadow-sm"
          >
            <CheckSquare className="h-4 w-4 text-cyan-700" /> Reviewer Approval Window
          </Link>

          <Link
            to={`/app/sessions/${session.id}/report`}
            className="btn-accent inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm"
          >
            <FileText className="h-4 w-4" /> Report & Exports
          </Link>
        </div>
      </div>

      {/* Approval Status Banner */}
      {isAwaitingApproval && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-amber-700 shrink-0" />
            <div>
              <span className="font-bold">Under Review:</span> This report has been submitted to{' '}
              <span className="font-semibold underline">reviewer@metrocert.gov.in</span> for verification.
            </div>
          </div>
          <Link
            to={`/app/sessions/${session.id}/review`}
            className="inline-flex items-center gap-1 font-bold bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700 transition"
          >
            Open Review Window <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {isApproved && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-sm">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold">Report Verified & Approved:</span> Metrological evaluation approved by reviewer. Official PDF and Word exports are unlocked.
            </div>
          </div>
          <Link
            to={`/app/sessions/${session.id}/review`}
            className="inline-flex items-center gap-1 font-bold bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 transition"
          >
            View Verified Report & Exports <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Instrument Overview Banner */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-accent-50 border border-accent-200 flex items-center justify-center text-accent-700 shrink-0">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded">
                {session.code}
              </span>
              <span className="text-xs text-ink-faint">·</span>
              <span className="text-xs font-bold text-ink-soft uppercase">
                {classLabel(instrument.accuracyClass)}
              </span>
            </div>
            <h1 className="text-xl font-bold text-ink mt-0.5">
              {instrument.manufacturer} {instrument.model}
            </h1>
            <p className="text-xs text-ink-faint mt-0.5">
              Serial: <span className="font-mono">{instrument.serial}</span> · Max: {instrument.max} {instrument.unit} · Min: {instrument.min} {instrument.unit} · e: {instrument.e} {instrument.unit}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-line pt-3 md:pt-0 md:pl-6">
          <div className="text-right">
            <div className="text-xs text-ink-faint font-medium">Progress</div>
            <div className="text-sm font-bold text-ink">
              {applicableCompletedCount} / {testPlan.applicableCount} Applicable Tests Done
            </div>
          </div>
          <div className="w-20 bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-accent-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PAGE 1: [Manual] | [CSV] | [Evidence] Tab Toggle         */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <button
          onClick={() => setActiveTab('manual')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
            activeTab === 'manual'
              ? 'bg-accent-600 text-white shadow-accent-200'
              : 'bg-white text-ink-soft border border-line hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Manual
        </button>
        <button
          onClick={() => setActiveTab('csv')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
            activeTab === 'csv'
              ? 'bg-accent-600 text-white shadow-accent-200'
              : 'bg-white text-ink-soft border border-line hover:bg-slate-50'
          }`}
        >
          <Upload className="h-4 w-4" />
          CSV
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
            activeTab === 'evidence'
              ? 'bg-accent-600 text-white shadow-accent-200'
              : 'bg-white text-ink-soft border border-line hover:bg-slate-50'
          }`}
        >
          <Camera className="h-4 w-4" />
          Evidence / Documents (Optional)
        </button>
      </div>

      {/* TAB CONTENT: Evidence Mode */}
      {activeTab === 'evidence' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card className="border-line shadow-sm">
            <CardBody>
              <EvidenceUploader
                sessionId={session.id}
                title="Session Evidence & Photographic Dossier (Optional)"
                subtitle="Attached photographs will be included in the Detailed OIML Report Annex."
              />
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* TAB CONTENT: CSV Mode */}
      {activeTab === 'csv' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card className="border-accent-200">
            <CardHeader
              title="CSV Data Pipeline"
              subtitle="Upload dataset CSV to auto-fill all 17 tests with verified calculations"
              icon={<Upload className="h-5 w-5 text-accent-600" />}
            />
            <CardBody>
              <CsvSessionImporter />
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* TAB CONTENT: Manual Mode (17 Tests Table matching Diagram) */}
      {activeTab === 'manual' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden"
        >
          <div className="bg-slate-50 border-b border-line px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-ink">
                  Applicable Test Procedures ({testPlan.applicableCount} of {testPlan.totalTests})
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold px-2.5 py-0.5 border border-emerald-200">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  Applied by Instrument Parameters
                </span>
              </div>
              <p className="text-xs text-ink-faint mt-1">
                Only tests applicable to {instrument.manufacturer} {instrument.model} are shown here according to statutory parameters. Other test options are available below at last.
              </p>
            </div>
            <span className="text-xs font-bold text-accent-700 bg-accent-50 px-3 py-1 rounded-full border border-accent-200 self-start sm:self-auto">
              Manual Entry Mode
            </span>
          </div>

          {/* Applicable Tests Table with Number, Test Name, and 'details ->' link */}
          <div className="divide-y divide-line">
            {testPlan.suggestedTests.map((test) => {
              const res = resultsMap[test.testType];
              const isCompleted = !!res;

              return (
                <div
                  key={test.number}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/70 transition group"
                >
                  {/* Left: Row Number & Test Name */}
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-paper font-mono text-xs font-bold text-ink-soft border border-line">
                      {test.number}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-ink group-hover:text-accent-700 transition">
                          {test.name}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint px-1.5 py-0.5 rounded bg-slate-100">
                          {test.clause}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Applicable
                        </span>
                      </div>
                      <p className="text-xs text-ink-faint truncate max-w-xl mt-0.5">
                        {test.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Status badge & 'details ->' Button */}
                  <div className="flex items-center gap-4 shrink-0 pl-4">
                    {isCompleted ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        res.status === 'PASS' ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'
                      }`}>
                        <Check className="h-3 w-3" /> {res.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-faint">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                    )}

                    {/* details -> Link matching the hand-drawn arrow */}
                    <Link
                      to={`/app/sessions/${session.id}/test/${test.testType}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-accent-200 bg-accent-50/50 px-3.5 py-1.5 text-xs font-bold text-accent-700 hover:bg-accent-600 hover:text-white transition shadow-sm"
                    >
                      details <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* AT LAST: Other Test Options (Non-Applicable by Parameters)                 */}
          {/* ========================================================================= */}
          {testPlan.excludedTests.length > 0 && (
            <div className="border-t border-line bg-slate-50/80 p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-ink-soft shrink-0">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-ink">
                      Other Test Options ({testPlan.excludedTests.length} Non-Applicable by Parameters)
                    </h3>
                    <span className="rounded-full bg-slate-200/80 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Present at Last
                    </span>
                  </div>
                  <p className="text-xs text-ink-faint mt-0.5">
                    These {testPlan.excludedTests.length} tests are excluded based on the instrument's statutory parameters (Class {instrument.accuracyClass}, Max {instrument.max} {instrument.unit}). You can still inspect or execute them below if required by special procedure.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-white divide-y divide-line overflow-hidden shadow-sm">
                {testPlan.excludedTests.map(({ test, reason, clause }) => {
                  const res = resultsMap[test.testType];
                  const isCompleted = !!res;

                  return (
                    <div
                      key={test.number}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-xs font-bold text-ink-soft border border-line">
                          {test.number}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-ink">
                              {test.name}
                            </span>
                            <span className="text-[10px] font-semibold text-ink-faint uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                              {clause}
                            </span>
                            <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Exempt by Parameters
                            </span>
                          </div>
                          <p className="text-xs text-ink-faint mt-0.5">
                            {test.description}
                          </p>
                          <div className="text-[11px] text-amber-900 bg-amber-50/80 rounded-md px-2.5 py-1 mt-1.5 border border-amber-200/60 flex items-start gap-1.5">
                            <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center pl-2">
                        {isCompleted ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            res.status === 'PASS' ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'
                          }`}>
                            <Check className="h-3 w-3" /> {res.status}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-ink-faint italic">
                            Optional
                          </span>
                        )}

                        <Link
                          to={`/app/sessions/${session.id}/test/${test.testType}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-accent-600 hover:text-white hover:border-accent-600 transition shadow-xs"
                        >
                          details <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
