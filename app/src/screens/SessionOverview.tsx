'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, FileText, Upload, SlidersHorizontal, Scale, Check, Clock, Send, ShieldCheck, Sparkles, Info, Camera
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { classLabel } from '../lib/format';
import { OIML_17_TESTS } from '../domain/oiml17Tests';
import { evaluateTestApplicability } from '../lib/testApplicability';
import { CsvSessionImporter } from '../components/CsvSessionImporter';
import { EvidenceUploader } from '../components/evidence/EvidenceUploader';
import { WorkflowStepper, type WorkflowStepId } from '../components/workflow/WorkflowStepper';
import { toast } from '../lib/toast';

export default function SessionOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = useAppStore((s) => s.sessions.find((x) => x.id === id));
  const instrument = useAppStore((s) => s.instruments.find((i) => i.id === session?.instrumentId));
  const evidenceList = useAppStore((s) => s.evidence.filter((e) => e.sessionId === id));
  const submitForReview = useAppStore((s) => s.submitForReview);
  
  // Tab toggle: [Manual] | [CSV] | [Evidence]
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'evidence'>(
    tabParam === 'evidence' ? 'evidence' : tabParam === 'csv' ? 'csv' : 'manual'
  );

  useEffect(() => {
    if (tabParam === 'evidence' && activeTab !== 'evidence') {
      setActiveTab('evidence');
    } else if (tabParam === 'csv' && activeTab !== 'csv') {
      setActiveTab('csv');
    } else if (tabParam === 'manual' && activeTab !== 'manual') {
      setActiveTab('manual');
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'manual' | 'csv' | 'evidence') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

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
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-md shadow-amber-950/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="h-4 w-4 text-amber-100" /> Send Report for Approval
            </button>
          )}

          <Link
            to={`/app/sessions/${session.id}/report`}
            className="inline-flex items-center gap-2 h-10 px-5 text-xs sm:text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-950/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileText className="h-4 w-4 text-blue-100" /> Report & Exports
          </Link>
        </div>
      </div>

      {/* 5-Step Workflow Stepper Pipeline */}
      <WorkflowStepper
        currentStep={
          activeTab === 'evidence'
            ? 'evidence'
            : isApproved
            ? 'report'
            : isAwaitingApproval
            ? 'review'
            : applicableCompletedCount > 0
            ? 'validation'
            : 'observations'
        }
        sessionId={session.id}
        evidenceCount={evidenceList.length}
        onStepClick={(step) => {
          if (step === 'observations') handleTabChange('manual');
          else if (step === 'validation') handleTabChange('manual');
          else if (step === 'evidence') handleTabChange('evidence');
          else if (step === 'review') navigate(`/app/sessions/${session.id}/review`);
          else if (step === 'report') navigate(`/app/sessions/${session.id}/report`);
        }}
      />

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
        <div className="rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4.5 flex flex-col sm:flex-row items-center justify-between gap-4 text-white shadow-lg shadow-emerald-950/25">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs border border-white/30 text-white shadow-inner">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-2">
                <span>Report Verified & Approved</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/25 text-white border border-white/30">
                  Unlocked
                </span>
              </div>
              <p className="mt-0.5 text-xs text-emerald-50/95 font-medium leading-relaxed">
                Metrological evaluation approved by reviewer. Official PDF and Word exports are unlocked.
              </p>
            </div>
          </div>
          <Link
            to={`/app/sessions/${session.id}/review`}
            className="inline-flex items-center gap-2 font-bold bg-white text-emerald-900 hover:bg-emerald-50 px-4.5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shrink-0 self-stretch sm:self-auto justify-center"
          >
            <span>View Verified Report & Exports</span>
            <ArrowRight className="h-4 w-4 text-emerald-700" />
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

        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-line pt-3 md:pt-0 md:pl-6 shrink-0">
          <div className="relative flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 44 44">
              <circle
                cx="22"
                cy="22"
                r="18"
                className="text-stone-100 stroke-current"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                className={`${progressPercent === 100 ? 'text-emerald-600' : progressPercent > 0 ? 'text-teal-600' : 'text-stone-300'} stroke-current transition-all duration-700 ease-out`}
                strokeWidth="4"
                strokeDasharray={113.1}
                strokeDashoffset={113.1 - (113.1 * progressPercent) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-extrabold text-ink font-mono">
                {progressPercent}%
              </span>
            </div>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${progressPercent === 100 ? 'bg-emerald-500' : progressPercent > 0 ? 'bg-teal-500 animate-pulse' : 'bg-stone-300'}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                Test Plan Progress
              </span>
            </div>
            <div className="text-sm font-bold text-ink mt-0.5">
              <span className="font-mono text-base font-extrabold">{applicableCompletedCount}</span>
              <span className="text-ink-faint font-normal"> / {testPlan.applicableCount} Completed</span>
            </div>
            {progressPercent > 0 && (
              <div className="mt-1">
                {progressPercent === 100 ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ Statutory Plan Complete
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    {testPlan.applicableCount - applicableCompletedCount} tests remaining
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PAGE 1: [Manual] | [CSV] | [Evidence] Tab Toggle         */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line pb-3.5">
        <button
          onClick={() => handleTabChange('manual')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
            activeTab === 'manual'
              ? 'bg-stone-900 text-white shadow-md shadow-stone-900/25 border border-stone-800 scale-[1.01]'
              : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 hover:bg-stone-50 shadow-2xs'
          }`}
        >
          <SlidersHorizontal className={`h-4 w-4 ${activeTab === 'manual' ? 'text-amber-400' : 'text-stone-400'}`} />
          Manual
        </button>
        <button
          onClick={() => handleTabChange('csv')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
            activeTab === 'csv'
              ? 'bg-stone-900 text-white shadow-md shadow-stone-900/25 border border-stone-800 scale-[1.01]'
              : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 hover:bg-stone-50 shadow-2xs'
          }`}
        >
          <Upload className={`h-4 w-4 ${activeTab === 'csv' ? 'text-amber-400' : 'text-stone-400'}`} />
          CSV
        </button>
        <button
          onClick={() => handleTabChange('evidence')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
            activeTab === 'evidence'
              ? 'bg-stone-900 text-white shadow-md shadow-stone-900/25 border border-stone-800 scale-[1.01]'
              : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 hover:bg-stone-50 shadow-2xs'
          }`}
        >
          <Camera className={`h-4 w-4 ${activeTab === 'evidence' ? 'text-amber-400' : 'text-stone-400'}`} />
          Supporting Evidence (Optional)
          {evidenceList.length > 0 && (
            <span className={`ml-1 rounded-full text-[10px] font-extrabold px-2 py-0.5 ${
              activeTab === 'evidence' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-800 border border-stone-200'
            }`}>
              {evidenceList.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT: Evidence Mode */}
      {activeTab === 'evidence' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <EvidenceUploader
            sessionId={session.id}
            onSkip={() => navigate(`/app/sessions/${session.id}/review`)}
            onProceedToReview={() => navigate(`/app/sessions/${session.id}/review`)}
          />
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
              <CsvSessionImporter
                targetInstrumentId={instrument.id}
                onImportSuccess={(newSessId) => {
                  handleTabChange('evidence');
                  toast.success(
                    'CSV Data Validated',
                    'You can now attach supporting photos or proceed directly to review.'
                  );
                }}
              />
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
                <h2 className="text-base font-bold text-ink flex items-center gap-2.5">
                  <span>Applicable Test Procedures</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                    {testPlan.applicableCount} of {testPlan.totalTests}
                  </span>
                </h2>
              </div>
              <p className="text-xs text-ink-faint mt-1">
                Only tests applicable to {instrument.manufacturer} {instrument.model} are shown here according to statutory parameters. Other test options are available below at last.
              </p>
            </div>
            <span className="text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1 rounded-full border border-stone-200 self-start sm:self-auto shadow-2xs">
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
                  className="relative flex items-center justify-between px-6 py-4 transition-all duration-200 hover:bg-emerald-50/70 hover:shadow-sm cursor-pointer group"
                >
                  {/* Left hover indicator bar without divide-line interference */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-emerald-600 transition-colors duration-200" />

                  {/* Left: Row Number & Test Name */}
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-paper font-mono text-xs font-bold text-ink-soft border border-line group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors duration-200">
                      {test.number}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-ink group-hover:text-emerald-950 transition-colors duration-200">
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
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold px-3 py-1 border border-amber-200/90 shadow-2xs">
                        <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending
                      </span>
                    )}

                    {/* details -> Link matching the hand-drawn arrow */}
                    <Link
                      to={`/app/sessions/${session.id}/test/${test.testType}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-accent-300 bg-accent-50/70 px-3.5 py-1.5 text-xs font-bold text-accent-800 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all duration-200 shadow-sm"
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

          {/* Workflow Bottom Bar: Observations -> Supporting Evidence / Review */}
          <div className="border-t border-line bg-gradient-to-r from-slate-50 to-accent-50/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-accent-100 flex items-center justify-center text-accent-700 shrink-0">
                <Camera className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-ink">
                  Next Step in Pipeline: Supporting Evidence (Optional)
                </span>
                <p className="text-[11px] text-ink-faint">
                  Attach physical inspection photos (nameplate, seals, readout) or proceed straight to review.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Link
                to={`/app/sessions/${session.id}/review`}
                className="btn-ghost text-xs font-bold px-3 py-1.5"
              >
                Skip for Now
              </Link>
              <button
                type="button"
                onClick={() => handleTabChange('evidence')}
                className="btn-accent text-xs font-bold inline-flex items-center gap-1.5 px-4 py-2 rounded-xl shadow-sm"
              >
                <Camera className="h-3.5 w-3.5" /> Attach Evidence ({evidenceList.length}) <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
