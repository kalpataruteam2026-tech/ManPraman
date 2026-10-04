import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, SlidersHorizontal, Upload, ArrowRight, Clock, Check,
  Plus, Sparkles, X, RotateCcw, ShieldCheck, Info,
  ChevronDown, ChevronUp, Camera
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { classLabel } from '../lib/format';
import { OIML_17_TESTS, OimlTestDef } from '../domain/oiml17Tests';
import { evaluateTestApplicability, InstrumentTestPlan } from '../lib/testApplicability';
import { CsvSessionImporter } from '../components/CsvSessionImporter';
import { EvidenceUploader } from '../components/evidence/EvidenceUploader';
import { toast } from '../lib/toast';

export default function NewSession() {
  const instruments = useAppStore((s) => s.instruments);
  const sessions = useAppStore((s) => s.sessions);
  const createSession = useAppStore((s) => s.createSession);
  const navigate = useNavigate();

  // 1. Selected object / instrument
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>(
    instruments[0]?.id ?? ''
  );

  // 2. Mode options: [Manual] | [CSV] | [Evidence]
  const [testingMode, setTestingMode] = useState<'manual' | 'csv' | 'evidence'>('manual');

  // Minimized "Add Tests" expandable section state
  const [isAddTestsExpanded, setIsAddTestsExpanded] = useState<boolean>(false);

  // Find active instrument
  const selectedInstrument = useMemo(
    () => instruments.find((i) => i.id === selectedInstrumentId),
    [instruments, selectedInstrumentId]
  );

  // Retrieve an existing in-progress session for this instrument
  const activeSession = useMemo(() => {
    if (!selectedInstrumentId) return null;
    return (
      sessions.find(
        (s) => s.instrumentId === selectedInstrumentId && s.status !== 'reported'
      ) || null
    );
  }, [sessions, selectedInstrumentId]);

  // Compute OIML R 76 test applicability based on statutory rules & trained model
  const testPlan = useMemo<InstrumentTestPlan>(() => {
    return evaluateTestApplicability(selectedInstrument);
  }, [selectedInstrument]);

  // Active tests to display in the main procedure list (initialized to only applicable tests)
  const [activeTestKeys, setActiveTestKeys] = useState<string[]>([]);

  // Synchronize active tests when selected instrument or active session changes
  useEffect(() => {
    if (testPlan) {
      // Strictly show ONLY the tests applied for this object according to parameters
      setActiveTestKeys(testPlan.suggestedTestTypes);
    }
  }, [selectedInstrumentId, testPlan.suggestedTestTypes.join(',')]);

  // Ensure a session exists when entering manual test details
  function getOrCreateSessionId(): string {
    if (activeSession) return activeSession.id;
    if (!selectedInstrument) return '';

    const newSession = createSession({
      instrumentId: selectedInstrument.id,
      mode: 'field',
      evaluationType: 'initial_verification',
      stage: 'initial',
      rulesetId: 'oiml-r76-1:2006',
      indiaOverlayId: 'india-lm-genrules:2011',
      applicant: 'Legal Metrology Inspection Directorate',
      testLocation: 'Standards Testing Facility',
      laboratory: 'Regional Metrology Lab',
    });
    return newSession.id;
  }

  function handleGoToTest(testType: string) {
    const sId = getOrCreateSessionId();
    if (sId) {
      navigate(`/app/sessions/${sId}/test/${testType}`);
    } else {
      toast.error('Please select an instrument first');
    }
  }

  // Add a test from the minimized non-applicable section into the active procedure
  function handleAddTest(testType: string) {
    if (!activeTestKeys.includes(testType)) {
      setActiveTestKeys((prev) => [...prev, testType]);
      const added = OIML_17_TESTS.find((t) => t.testType === testType);
      toast.success(`Added "${added?.name || testType}" to test procedure`);
    }
  }

  // Remove a manually added test and send it back to the minimized non-applicable section
  function handleRemoveTest(testType: string) {
    const resultsMap = (activeSession?.results || {}) as Record<string, any>;
    if (resultsMap[testType]) {
      toast.error('Cannot remove test with existing measurement results');
      return;
    }
    setActiveTestKeys((prev) => prev.filter((k) => k !== testType));
    const removed = OIML_17_TESTS.find((t) => t.testType === testType);
    toast.info(`Moved "${removed?.name || testType}" back to non-applicable list`);
  }

  function handleResetToSuggested() {
    const existingResultsKeys = activeSession?.results ? Object.keys(activeSession.results) : [];
    const combined = Array.from(new Set([...testPlan.suggestedTestTypes, ...existingResultsKeys]));
    setActiveTestKeys(combined);
    toast.info('Reset procedure to statutory applicable tests only');
  }

  const resultsMap = (activeSession?.results || {}) as Record<string, any>;
  const completedCount = OIML_17_TESTS.filter((t) => resultsMap[t.testType]).length;

  // 1. Only show tests currently active/applicable for this instrument
  const activeTests = useMemo(() => {
    return OIML_17_TESTS.filter((t) => activeTestKeys.includes(t.testType));
  }, [activeTestKeys]);

  // 2. Remaining non-applicable tests for this instrument (shown in minimized section at bottom)
  const remainingNonApplicableTests = useMemo(() => {
    return OIML_17_TESTS.filter((t) => !activeTestKeys.includes(t.testType));
  }, [activeTestKeys]);

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">New Test Session</h1>
        <p className="text-sm text-ink-faint mt-1">
          Automatically suggests only the applicable OIML R 76 tests for your selected instrument, with remaining tests available in a minimized format below.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 1st Step: Select Instrument / Object under test                            */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-600 text-xs font-bold text-white">
              1
            </span>
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
              Select Instrument / Object under test
            </h2>
          </div>
          <Link
            to="/app/instruments/new"
            className="inline-flex items-center gap-1 text-xs font-bold text-accent-700 hover:text-accent-800"
          >
            <Plus className="h-3.5 w-3.5" /> Register New Instrument
          </Link>
        </div>

        {instruments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-paper p-8 text-center">
            <p className="text-sm text-ink-faint">No instruments available.</p>
            <Link
              to="/app/instruments/new"
              className="btn-accent mt-3 inline-flex items-center gap-1.5 text-xs font-bold"
            >
              <Plus className="h-4 w-4" /> Register Instrument
            </Link>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {instruments.map((inst) => {
              const isSelected = inst.id === selectedInstrumentId;
              const hasSession = sessions.some(
                (s) => s.instrumentId === inst.id && s.status !== 'reported'
              );

              return (
                <div
                  key={inst.id}
                  onClick={() => setSelectedInstrumentId(inst.id)}
                  className={`group relative cursor-pointer rounded-xl border p-4.5 transition-all ${
                    isSelected
                      ? 'border-accent-500 bg-white ring-2 ring-accent-500/20 shadow-md'
                      : 'border-line bg-white/70 hover:border-slate-300 hover:bg-white shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${
                          isSelected
                            ? 'bg-accent-600 text-white'
                            : 'bg-slate-100 text-ink-soft group-hover:bg-accent-50 group-hover:text-accent-700'
                        }`}
                      >
                        <Scale className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-ink group-hover:text-accent-700 transition">
                          {inst.manufacturer} {inst.model}
                        </div>
                        <div className="font-mono text-xs text-ink-faint">
                          SN: {inst.serial}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isSelected
                            ? 'bg-accent-100 text-accent-800'
                            : 'bg-slate-100 text-ink-soft'
                        }`}
                      >
                        {classLabel(inst.accuracyClass)}
                      </span>
                      {hasSession && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent-50 border border-accent-200 px-2 py-0.5 text-[9px] font-bold text-accent-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent-600 animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-line/60 pt-2.5 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-ink-faint uppercase font-medium">Max</span>
                      <div className="font-bold text-ink">{inst.max} {inst.unit}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-faint uppercase font-medium">Min</span>
                      <div className="font-bold text-ink">{inst.min} {inst.unit}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-faint uppercase font-medium">e</span>
                      <div className="font-bold text-ink">{inst.e} {inst.unit}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 2nd Step: Select Test Method (Manual / CSV)                                */}
      {/* ========================================================================= */}
      {selectedInstrument && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 pt-2"
        >
          {/* Step 2 Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-600 text-xs font-bold text-white">
                2
              </span>
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                Select Test Procedure & Mode (Manual / CSV)
              </h2>
            </div>
          </div>

          {/* Selected Instrument Indicator Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-line bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-100 text-accent-700 shrink-0">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] text-ink-faint font-semibold uppercase tracking-wider">
                  Selected Instrument Profile
                </div>
                <div className="text-base font-bold text-ink">
                  {selectedInstrument.manufacturer} {selectedInstrument.model} (SN: {selectedInstrument.serial})
                </div>
                <div className="text-xs text-ink-faint mt-0.5 flex flex-wrap items-center gap-2">
                  <span>Class: <strong className="text-ink">{classLabel(selectedInstrument.accuracyClass)}</strong></span>
                  <span>•</span>
                  <span>Max: <strong className="text-ink">{selectedInstrument.max} {selectedInstrument.unit}</strong></span>
                  <span>•</span>
                  <span>Tare: <strong className="text-ink">{selectedInstrument.tareType}</strong></span>
                </div>
              </div>
            </div>

            {activeSession && (
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-xs text-ink-faint text-right">
                  <span className="font-bold text-ink">{completedCount} / {activeTests.length}</span> active completed
                </div>
                <Link
                  to={`/app/sessions/${activeSession.id}/report`}
                  className="btn-accent inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg"
                >
                  Generate Report <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>          {/* [Manual] | [CSV] | [Evidence] Mode Toggles */}
          <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
            <button
              onClick={() => setTestingMode('manual')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${
                testingMode === 'manual'
                  ? 'bg-accent-600 text-white shadow-accent-200'
                  : 'bg-white text-ink-soft border border-line hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Manual Procedure
            </button>
            <button
              onClick={() => setTestingMode('csv')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${
                testingMode === 'csv'
                  ? 'bg-accent-600 text-white shadow-accent-200'
                  : 'bg-white text-ink-soft border border-line hover:bg-slate-50'
              }`}
            >
              <Upload className="h-4 w-4" />
              CSV Batch Pipeline
            </button>
            <button
              onClick={() => setTestingMode('evidence')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${
                testingMode === 'evidence'
                  ? 'bg-accent-600 text-white shadow-accent-200'
                  : 'bg-white text-ink-soft border border-line hover:bg-slate-50'
              }`}
            >
              <Camera className="h-4 w-4" />
              Add Evidence / Documents (Optional)
            </button>
          </div>

          {/* ========================================================================= */}
          {/* OPTION 1: [Manual] -> Shows ONLY Applicable Tests + Minimized Add at Bottom */}
          {/* ========================================================================= */}
          {testingMode === 'manual' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-line bg-white shadow-sm overflow-hidden"
            >
              {/* Header with Applicable Count vs Total 17 */}
              <div className="border-b border-line bg-slate-50/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-sm font-bold text-ink">
                      Applicable OIML R 76 Tests
                    </h3>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold px-2.5 py-0.5 border border-emerald-200">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      {activeTests.length} of 17 Applicable for this Instrument
                    </span>
                  </div>
                  <p className="text-xs text-ink-faint mt-1">
                    Only tests statutorily applied to <strong>{selectedInstrument.manufacturer} {selectedInstrument.model}</strong> according to its metrological parameters are listed here. Other test options are present at last.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <span className="text-xs font-bold text-accent-700 bg-accent-50 px-2.5 py-1.5 rounded-lg border border-accent-200">
                    Manual Entry
                  </span>
                </div>
              </div>

              {/* Rows of Applicable Tests */}
              <div className="divide-y divide-line">
                {activeTests.length === 0 ? (
                  <div className="p-8 text-center text-ink-faint text-sm">
                    No tests currently applicable based on instrument parameters.
                  </div>
                ) : (
                  activeTests.map((test) => {
                    const res = resultsMap[test.testType];
                    const isDone = !!res;

                    return (
                       <div
                        key={test.number}
                        className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/70 transition group"
                      >
                        {/* 1 | test name and details */}
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-paper font-mono text-xs font-bold text-ink-soft border border-line">
                            {test.number}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-ink group-hover:text-accent-700 transition">
                                {test.name}
                              </span>
                              <span className="text-[10px] font-semibold text-ink-faint uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                {test.clause}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <Sparkles className="h-2.5 w-2.5" /> Applicable
                              </span>
                            </div>
                            <p className="text-xs text-ink-faint truncate max-w-xl mt-0.5">
                              {test.description}
                            </p>
                          </div>
                        </div>

                        {/* Actions: status and details -> button */}
                        <div className="flex items-center gap-3 shrink-0 pl-4">
                          {isDone ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold ${
                                res.status === 'PASS'
                                  ? 'bg-pass-bg text-pass-fg'
                                  : 'bg-fail-bg text-fail-fg'
                              }`}
                            >
                              <Check className="h-3 w-3" /> {res.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-faint">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}

                          <button
                            onClick={() => handleGoToTest(test.testType)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-accent-200 bg-accent-50/60 px-3.5 py-1.5 text-xs font-bold text-accent-700 hover:bg-accent-600 hover:text-white transition shadow-sm"
                          >
                            details <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ========================================================================= */}
              {/* AT LAST: Other Test Options (Non-Applicable for this Instrument)          */}
              {/* ========================================================================= */}
              {remainingNonApplicableTests.length > 0 && (
                <div className="border-t border-line bg-slate-50/80 p-5 sm:p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-ink-soft shrink-0">
                      <SlidersHorizontal className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-ink">
                          Other Test Options ({remainingNonApplicableTests.length} Non-Applicable by Parameters)
                        </h4>
                        <span className="rounded-full bg-slate-200/80 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Present at Last
                        </span>
                      </div>
                      <p className="text-xs text-ink-faint mt-0.5">
                        These {remainingNonApplicableTests.length} tests are normally exempt or non-applicable for <strong>{selectedInstrument.manufacturer} {selectedInstrument.model}</strong> based on OIML R 76-1 statutory criteria & parameters. You can still inspect or execute them below if required.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-white divide-y divide-line overflow-hidden shadow-sm">
                    {remainingNonApplicableTests.map((test) => {
                      const res = resultsMap[test.testType];
                      const isDone = !!res;
                      const statusInfo = testPlan.allTestsWithStatus.find(
                        (s) => s.test.testType === test.testType
                      );
                      const reasonText = statusInfo?.reason || 'Excluded based on statutory instrument criteria';

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
                                  {test.clause}
                                </span>
                                <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  Exempt by Parameters
                                </span>
                              </div>
                              <p className="text-xs text-ink-faint mt-0.5">
                                {test.description}
                              </p>
                              <div className="text-[11px] text-amber-900 bg-amber-50/80 rounded-md px-2.5 py-1 mt-1.5 border border-amber-200/60 flex items-start gap-1.5">
                                <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <span>{reasonText}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center pl-2">
                            {isDone ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold ${
                                  res.status === 'PASS'
                                    ? 'bg-pass-bg text-pass-fg'
                                    : 'bg-fail-bg text-fail-fg'
                                }`}
                              >
                                <Check className="h-3 w-3" /> {res.status}
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-ink-faint italic">
                                Optional
                              </span>
                            )}
                            <button
                              onClick={() => handleGoToTest(test.testType)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-ink hover:border-accent-400 hover:text-accent-700 transition shadow-sm"
                            >
                              details <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Next Action Step: Prompt to Attach Evidence or Proceed */}
              <div className="p-4 bg-gradient-to-r from-accent-50/80 to-slate-50 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Step 2 (Optional): Attach Evidence & Verification Photos</h4>
                    <p className="text-[11px] text-ink-faint">
                      Upload photos (nameplate, seals, test setup) to be displayed directly after the Introduction page in the 64-page detailed OIML report.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTestingMode('evidence')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-600 text-white text-xs font-bold hover:bg-accent-700 transition shadow-sm shrink-0"
                >
                  <Camera className="h-3.5 w-3.5" /> Attach Evidence
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* OPTION 2: [CSV] -> Single Object / Multiple Object CSV Pipeline           */}
          {/* ========================================================================= */}
          {testingMode === 'csv' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 space-y-4"
            >
              <CsvSessionImporter
                targetInstrumentId={selectedInstrument.id}
                onImportSuccess={() => setTestingMode('evidence')}
              />

              {/* Next Action Step after CSV Import */}
              <div className="p-4 rounded-2xl bg-white border border-line shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Optional Next Step: Attach Photographic Evidence</h4>
                    <p className="text-[11px] text-ink-faint">
                      After importing test inputs via CSV, you can attach local storage photos or certificates for inclusion in the detailed report dossier.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTestingMode('evidence')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-600 text-white text-xs font-bold hover:bg-accent-700 transition shadow-sm shrink-0"
                >
                  <Camera className="h-3.5 w-3.5" /> Attach Evidence
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* OPTION 3: [Evidence] -> Optional Evidence & Document Upload from Storage  */}
          {/* ========================================================================= */}
          {testingMode === 'evidence' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-line bg-white p-6 shadow-sm mt-2 space-y-6"
            >
              <EvidenceUploader
                sessionId={getOrCreateSessionId()}
                title="Instrument Evidence & Verification Documents (Optional)"
                subtitle="Upload local storage photos (nameplate, markings, seals, display readout) or documents for this test session. Displayed immediately after Introduction in 64-page detailed report."
              />

              {activeSession && (
                <div className="pt-4 border-t border-line flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs text-ink-faint">
                    Evidence automatically synced to test session snapshot.
                  </span>
                  <Link
                    to={`/app/sessions/${activeSession.id}/report`}
                    className="btn-accent inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl shadow-sm"
                  >
                    Proceed to Report <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
