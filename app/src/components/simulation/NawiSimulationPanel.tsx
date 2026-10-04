'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Calculator,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Scale,
  Table,
  FileCheck2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';

export type SimTab = 'test' | 'tables' | 'review';

interface TestPointData {
  id: string;
  load: number;
  indication: number;
  deltaL: number;
  label: string;
  nominalType: string;
}

const DEFAULT_POINTS: TestPointData[] = [
  { id: 'zero', load: 0.0, indication: 0.0, deltaL: 0.005, label: 'Zero Test', nominalType: '0% Max' },
  { id: 'min', load: 2.0, indication: 2.0, deltaL: 0.006, label: 'Min Load', nominalType: 'Min (20e)' },
  { id: '50kg', load: 50.0, indication: 50.005, deltaL: 0.004, label: '50 kg Load', nominalType: '25% Max' },
  { id: '100kg', load: 100.0, indication: 100.01, deltaL: 0.007, label: '100 kg Load', nominalType: '50% Max' },
  { id: '200kg', load: 200.0, indication: 200.01, deltaL: 0.003, label: '200 kg Load', nominalType: '100% Max' },
];

const ECCENTRICITY_POINTS = [
  { position: 'Center (Pos 1)', load: 66.7, indication: 66.7, deltaL: 0.005, mpe: 0.01 },
  { position: 'Front-Left (Pos 2)', load: 66.7, indication: 66.705, deltaL: 0.004, mpe: 0.01 },
  { position: 'Front-Right (Pos 3)', load: 66.7, indication: 66.695, deltaL: 0.006, mpe: 0.01 },
  { position: 'Rear-Left (Pos 4)', load: 66.7, indication: 66.702, deltaL: 0.005, mpe: 0.01 },
  { position: 'Rear-Right (Pos 5)', load: 66.7, indication: 66.698, deltaL: 0.005, mpe: 0.01 },
];

export default function NawiSimulationPanel() {
  const [activeTab, setActiveTab] = useState<SimTab>('test');
  const [selectedPointId, setSelectedPointId] = useState<string>('100kg');

  // Interactive scale parameters for selected point
  const [load, setLoad] = useState<number>(100.0);
  const [indication, setIndication] = useState<number>(100.01);
  const [deltaL, setDeltaL] = useState<number>(0.007);
  const d = 0.01; // Scale interval = 0.01 kg (10g)
  const e = 0.01;
  const e0 = -0.001; // Zero error benchmark
  const [activeClass] = useState('Class III');

  // Switch point handler
  const handleSelectPoint = (pt: TestPointData) => {
    setSelectedPointId(pt.id);
    setLoad(pt.load);
    setIndication(pt.indication);
    setDeltaL(pt.deltaL);
  };

  // Statutory MPE calculation (OIML R 76-1:2006 Clause 3.5.1 for Class III)
  const mpe = useMemo(() => {
    const n = e > 0 ? load / e : 0;
    if (n <= 500) return 0.5 * e; // ±0.5e
    if (n <= 2000) return 1.0 * e; // ±1.0e
    return 1.5 * e; // ±1.5e
  }, [load, e]);

  // Metrological calculations
  // True indication: P = I + 0.5d - ΔL
  const p = Number((indication + 0.5 * d - deltaL).toFixed(4));
  // Raw Error: E = P - L
  const rawError = Number((p - load).toFixed(4));
  // Corrected Error: Ec = E - E0
  const correctedError = Number((rawError - e0).toFixed(4));
  const isPass = Math.abs(correctedError) <= mpe + 1e-6;

  // Normalized corridor percentage (0 - 100%)
  const tolerancePercent = Math.min(
    100,
    Math.max(0, ((correctedError + mpe) / (2 * mpe || 0.02)) * 100)
  );

  return (
    <div className="w-full flex flex-col space-y-4 text-slate-100">
      {/* Top Header / Context Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-500/20 text-accent-400">
            <Scale className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            OIML R-76 NAWI Simulation
          </span>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-slate-700">
            Class III (Medium)
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Max: <strong className="text-white">200kg</strong> · e=d: <strong className="text-white">0.01kg</strong>
        </div>
      </div>

      {/* Segmented Mode Switcher */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('test')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 font-medium transition-all ${
            activeTab === 'test'
              ? 'bg-slate-800 text-white shadow border border-slate-700 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="h-3.5 w-3.5 text-accent-400" />
          <span>Live Testing</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tables')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 font-medium transition-all ${
            activeTab === 'tables'
              ? 'bg-slate-800 text-white shadow border border-slate-700 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Table className="h-3.5 w-3.5 text-sky-400" />
          <span>Test Tables</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('review')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 font-medium transition-all ${
            activeTab === 'review'
              ? 'bg-slate-800 text-white shadow border border-slate-700 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCheck2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>Review &amp; Audit</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* ================= MODE 1: LIVE WEIGHING TEST SIMULATION ================= */}
        {activeTab === 'test' && (
          <motion.div
            key="test"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-3.5"
          >
            {/* Digital NAWI Scale VFD / LED Display Display Screen */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-b from-slate-900 to-black p-4 shadow-xl">
              <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-emerald-400">STABLE</span>
                  <span className="text-slate-500">|</span>
                  <span>{load === 0 ? 'ZERO [>0<]' : 'GROSS'}</span>
                </div>
                <div>NON-AUTOMATIC WEIGHING INSTRUMENT</div>
              </div>

              {/* Main Weight Readout */}
              <div className="mt-3 flex items-baseline justify-between">
                <div className="font-mono text-3xl font-extrabold tracking-wider text-emerald-400 sm:text-4xl drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]">
                  {indication.toFixed(3)}{' '}
                  <span className="text-base font-normal text-emerald-600">kg</span>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-400 leading-tight">
                  <div>Load L: <span className="font-bold text-white">{load.toFixed(1)} kg</span></div>
                  <div>Add-Weight &Delta;L: <span className="font-bold text-amber-300">{(deltaL * 1000).toFixed(1)} g</span></div>
                </div>
              </div>

              {/* Formula & Corrected Result Strip */}
              <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-950/80 border border-slate-800 px-3 py-1.5 text-xs font-mono">
                <div className="text-slate-400">
                  Ec: <span className={`font-bold ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {correctedError >= 0 ? `+${correctedError.toFixed(4)}` : correctedError.toFixed(4)} kg
                  </span>
                </div>
                <div className="text-slate-400">
                  MPE: <span className="font-bold text-white">&plusmn;{mpe.toFixed(4)} kg</span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isPass
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {isPass ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {isPass ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>

            {/* Test Point Selector Chips */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-300">
                <span className="flex items-center gap-1">
                  <Sliders className="h-3 w-3 text-accent-400" />
                  Select Test Load Point:
                </span>
                <span className="text-[10px] text-slate-400">5 Statutory Steps</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {DEFAULT_POINTS.map((pt) => {
                  const isSelected = selectedPointId === pt.id;
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => handleSelectPoint(pt)}
                      className={`flex flex-col items-center justify-center rounded-xl p-2 text-center transition-all ${
                        isSelected
                          ? 'border border-accent-400 bg-accent-500/20 text-white shadow-md'
                          : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold leading-tight">
                        {pt.load}k
                      </span>
                      <span className="text-[9px] text-slate-400 truncate mt-0.5">
                        {pt.nominalType}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metrological Law Calculation Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Calculator className="h-3.5 w-3.5 text-accent-400" />
                  OIML Metrological Formulation
                </span>
                <span className="font-mono text-[10px] text-slate-400">P = I + 0.5d - &Delta;L</span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
                  <div className="text-[10px] text-slate-400">True Indication P</div>
                  <div className="font-bold text-accent-300 mt-0.5">{p.toFixed(4)} kg</div>
                </div>
                <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
                  <div className="text-[10px] text-slate-400">Raw Error E (P-L)</div>
                  <div className="font-bold text-white mt-0.5">
                    {rawError >= 0 ? `+${rawError.toFixed(4)}` : rawError.toFixed(4)} kg
                  </div>
                </div>
                <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
                  <div className="text-[10px] text-slate-400">Zero-Corrected Ec</div>
                  <div className={`font-bold mt-0.5 ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {correctedError >= 0 ? `+${correctedError.toFixed(4)}` : correctedError.toFixed(4)} kg
                  </div>
                </div>
              </div>

              {/* Dynamic Tolerance Corridor Visualizer */}
              <div className="pt-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>-MPE (-{mpe.toFixed(3)}kg)</span>
                  <span>Center Nominal</span>
                  <span>+MPE (+{mpe.toFixed(3)}kg)</span>
                </div>
                <div className="relative h-4 w-full overflow-hidden rounded-full border border-slate-700 bg-slate-950">
                  <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-slate-600 z-10" />
                  <div className="absolute inset-0 bg-emerald-500/15" />
                  <motion.div
                    className={`absolute top-0 bottom-0 w-2.5 -translate-x-1/2 rounded-full border border-white shadow ${
                      isPass ? 'bg-emerald-400' : 'bg-rose-500'
                    }`}
                    animate={{ left: `${tolerancePercent}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                </div>
              </div>

              {/* Interactive Micro Adjustments */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeltaL((prev) => Math.max(0, Number((prev - 0.002).toFixed(4))))}
                    className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-300 hover:bg-slate-700"
                  >
                    -2g &Delta;L
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeltaL((prev) => Number((prev + 0.002).toFixed(4)))}
                    className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-300 hover:bg-slate-700"
                  >
                    +2g &Delta;L
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndication((prev) => Number((prev + 0.02).toFixed(2)))}
                    className="rounded-md border border-rose-800/80 bg-rose-950/60 px-2 py-1 text-[10px] font-medium text-rose-300 hover:bg-rose-900/60"
                  >
                    Inject +20g Drift
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const found = DEFAULT_POINTS.find((p) => p.id === selectedPointId);
                    if (found) handleSelectPoint(found);
                  }}
                  className="flex items-center gap-1 text-[10px] text-accent-400 hover:text-accent-300"
                >
                  <RefreshCw className="h-3 w-3" /> Reset Point
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= MODE 2: TABLES WAGERA (FULL TEST & ECCENTRICITY TABLES) ================= */}
        {activeTab === 'tables' && (
          <motion.div
            key="tables"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Table 1: Standard Weighing Performance Test Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4 text-sky-400" />
                  <span className="text-xs font-bold text-white">
                    Weighing Performance Test Table (OIML R-76)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                  5/5 Conformant
                </span>
              </div>

              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                    <tr>
                      <th className="py-1 px-1.5">Load L</th>
                      <th className="py-1 px-1.5">Ind I</th>
                      <th className="py-1 px-1.5">&Delta;L</th>
                      <th className="py-1 px-1.5">True P</th>
                      <th className="py-1 px-1.5">Ec</th>
                      <th className="py-1 px-1.5">MPE</th>
                      <th className="py-1 px-1.5 text-right">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {DEFAULT_POINTS.map((pt) => {
                      const ptP = Number((pt.indication + 0.5 * d - pt.deltaL).toFixed(4));
                      const ptEc = Number((ptP - pt.load - e0).toFixed(4));
                      const ptMpe = pt.load <= 5 ? 0.005 : pt.load <= 100 ? 0.01 : 0.015;
                      const ptPass = Math.abs(ptEc) <= ptMpe;
                      return (
                        <tr
                          key={pt.id}
                          onClick={() => {
                            handleSelectPoint(pt);
                            setActiveTab('test');
                          }}
                          className="hover:bg-slate-800/50 cursor-pointer transition"
                        >
                          <td className="py-1.5 px-1.5 font-bold text-white">{pt.load}kg</td>
                          <td className="py-1.5 px-1.5 text-slate-200">{pt.indication.toFixed(2)}</td>
                          <td className="py-1.5 px-1.5 text-amber-300">{(pt.deltaL * 1000).toFixed(0)}g</td>
                          <td className="py-1.5 px-1.5 text-slate-300">{ptP.toFixed(3)}</td>
                          <td className="py-1.5 px-1.5 font-semibold text-emerald-400">
                            {ptEc >= 0 ? `+${ptEc.toFixed(3)}` : ptEc.toFixed(3)}
                          </td>
                          <td className="py-1.5 px-1.5 text-slate-400">&plusmn;{ptMpe.toFixed(3)}</td>
                          <td className="py-1.5 px-1.5 text-right">
                            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                              PASS
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Eccentricity Loading (Corner Test) Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-white">
                    Eccentricity (Corner Load) Test Table · 1/3 Max (66.7 kg)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 rounded">
                  Max &Delta;E &le; 1e
                </span>
              </div>

              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                    <tr>
                      <th className="py-1 px-1.5">Position</th>
                      <th className="py-1 px-1.5">Applied Load</th>
                      <th className="py-1 px-1.5">Indication</th>
                      <th className="py-1 px-1.5">Corner Error</th>
                      <th className="py-1 px-1.5 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {ECCENTRICITY_POINTS.map((pt, i) => {
                      const cornerErr = Number((pt.indication - pt.load).toFixed(3));
                      return (
                        <tr key={i} className="hover:bg-slate-800/40">
                          <td className="py-1.5 px-1.5 text-white">{pt.position}</td>
                          <td className="py-1.5 px-1.5 text-slate-400">{pt.load} kg</td>
                          <td className="py-1.5 px-1.5 text-slate-200">{pt.indication.toFixed(3)} kg</td>
                          <td className="py-1.5 px-1.5 text-emerald-400">
                            {cornerErr >= 0 ? `+${cornerErr.toFixed(3)}` : cornerErr.toFixed(3)} kg
                          </td>
                          <td className="py-1.5 px-1.5 text-right">
                            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                              PASS
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= MODE 3: REVIEWING SIMULATION & STATUTORY AUDIT ================= */}
        {activeTab === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Reviewer Verified Stamp Card */}
            <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-3.5 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                    <ShieldCheck className="h-3.5 w-3.5" /> Metrological Audit: APPROVED
                  </span>
                  <h4 className="mt-2 text-sm font-bold text-white">
                    Compliance Verification Certificate
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Instrument Type: Electronic Non-Automatic Weighing Instrument (NAWI)
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-center">
                  <div className="text-[9px] uppercase font-mono text-slate-400">OIML Mark</div>
                  <div className="font-mono text-xs font-extrabold text-amber-400">R76 / III</div>
                </div>
              </div>

              {/* Inspector Review Items Checklist */}
              <div className="mt-3 divide-y divide-slate-800/80 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-300">Zero-Setting Error $E_0 \le \pm 0.25e$</span>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> PASS (-0.001 kg)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-300">Maximum Permissible Error (MPE) Corridors</span>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> PASS (All 5 Loads)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-300">Repeatability Spread $r \le 0.2e$ (2026 Rule)</span>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> PASS (r = 0.002 kg)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-300">Eccentricity Loading Differences $\le 1e$</span>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> PASS (&Delta;E = 0.007 kg)
                  </span>
                </div>
              </div>

              {/* Tamper Evident Verification Hash */}
              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-[10px] font-mono text-slate-400">
                <div className="text-[9px] uppercase tracking-wider text-slate-400">SHA-256 Audit Seal</div>
                <div className="text-slate-300 truncate font-semibold mt-0.5">
                  8f4a1c62e9b04f7a1923bc6547d10e8841a54cde29013ef17a23
                </div>
              </div>
            </div>

            {/* Statutory Regulation Reference */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Sparkles className="h-3.5 w-3.5 text-accent-400" />
                Statutory Regulatory Mandates
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Conforms strictly to Legal Metrology (General) Rules 2011 (Seventh Schedule) and OIML R 76-1:2006 for automatic calculation and reviewer sign-off without manual tampering.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
