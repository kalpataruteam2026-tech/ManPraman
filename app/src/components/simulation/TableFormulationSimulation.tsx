'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Calculator,
  RefreshCw,
  Sliders,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import JellyRadio from '../ui/JellyRadio';

interface TestPreset {
  name: string;
  load: number;
  indication: number;
  deltaL: number;
  d: number;
  e: number;
  e0: number;
  mpe: number;
}

const PRESETS: Record<string, TestPreset> = {
  'Zero Check': {
    name: 'Zero Verification',
    load: 0.0,
    indication: 0.0,
    deltaL: 0.006,
    d: 0.01,
    e: 0.01,
    e0: 0.0,
    mpe: 0.005,
  },
  '50 kg (Low)': {
    name: '50 kg Lower Range',
    load: 50.0,
    indication: 50.0,
    deltaL: 0.004,
    d: 0.01,
    e: 0.01,
    e0: -0.001,
    mpe: 0.01,
  },
  '100 kg (Mid)': {
    name: '100 kg Mid Range',
    load: 100.0,
    indication: 100.01,
    deltaL: 0.007,
    d: 0.01,
    e: 0.01,
    e0: -0.001,
    mpe: 0.01,
  },
  '200 kg (Max)': {
    name: '200 kg Full Capacity',
    load: 200.0,
    indication: 200.01,
    deltaL: 0.003,
    d: 0.01,
    e: 0.01,
    e0: -0.001,
    mpe: 0.015,
  },
};

export default function TableFormulationSimulation() {
  const [selectedClass, setSelectedClass] = useState('Class III');
  const [selectedPoint, setSelectedPoint] = useState('100 kg (Mid)');

  // Simulation parameters
  const [load, setLoad] = useState<number>(100.0);
  const [indication, setIndication] = useState<number>(100.01);
  const [deltaL, setDeltaL] = useState<number>(0.007);
  const [d, setD] = useState<number>(0.01);
  const [e0, setE0] = useState<number>(-0.001);

  // When preset changes
  const handlePresetChange = (pointName: string) => {
    setSelectedPoint(pointName);
    const p = PRESETS[pointName];
    if (p) {
      setLoad(p.load);
      setIndication(p.indication);
      setDeltaL(p.deltaL);
      setD(p.d);
      setE0(p.e0);
    }
  };

  // MPE determination by class and load in e
  const mpe = useMemo(() => {
    const eVal = d;
    const n = eVal > 0 ? load / eVal : 0;
    if (selectedClass === 'Class I') {
      if (n <= 50000) return 0.5 * eVal;
      if (n <= 200000) return 1.0 * eVal;
      return 1.5 * eVal;
    }
    if (selectedClass === 'Class II') {
      if (n <= 5000) return 0.5 * eVal;
      if (n <= 20000) return 1.0 * eVal;
      return 1.5 * eVal;
    }
    if (selectedClass === 'Class III') {
      if (n <= 500) return 0.5 * eVal;
      if (n <= 2000) return 1.0 * eVal;
      return 1.5 * eVal;
    }
    // Class IIII
    if (n <= 50) return 0.5 * eVal;
    if (n <= 200) return 1.0 * eVal;
    return 1.5 * eVal;
  }, [selectedClass, load, d]);

  // Metrological calculations
  // P = I + 0.5d - ΔL
  const p = Number((indication + 0.5 * d - deltaL).toFixed(5));
  // E = P - L
  const rawError = Number((p - load).toFixed(5));
  // Ec = E - E0
  const correctedError = Number((rawError - e0).toFixed(5));
  const isPass = Math.abs(correctedError) <= mpe + 1e-7;

  // Percentage inside corridor for visualization
  const tolerancePercent = Math.min(100, Math.max(0, ((correctedError + mpe) / (2 * mpe || 1)) * 100));

  return (
    <div className="w-full rounded-2xl border border-line bg-surface p-5 shadow-panel sm:p-7 text-left">
      {/* Simulation Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-espresso-800 text-champagne-500">
              <Calculator className="h-4 w-4" />
            </span>
            <h3 className="font-display text-lg font-bold text-espresso-800 sm:text-xl">
              Live Metrological Table Formulation
            </h3>
            <span className="rounded-full bg-champagne-200 px-2.5 py-0.5 text-[11px] font-bold text-espresso-700">
              OIML R-76
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            Interactive formulation engine simulating digital rounding, true indication $P$, and zero-corrected tolerance corridors.
          </p>
        </div>

        {/* Accuracy Class selector using JellyRadio from React Bits */}
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            Accuracy Class
          </span>
          <JellyRadio
            items={['Class I', 'Class II', 'Class III', 'Class IIII']}
            value={selectedClass}
            onChange={(val) => setSelectedClass(val)}
            chipColor="#F4ECE1"
            activeColor="#2D2421"
            textColor="#52433A"
            activeTextColor="#FAF6F0"
            size="sm"
            gap={6}
            radius={14}
            swell={0.15}
            bounce={0.2}
          />
        </div>
      </div>

      {/* Preset Loading Points using JellyRadio */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-champagne-100/70 p-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-accent-700" />
          <span className="text-xs font-semibold text-espresso-800">Test Points:</span>
        </div>
        <JellyRadio
          items={Object.keys(PRESETS)}
          value={selectedPoint}
          onChange={(val) => handlePresetChange(val)}
          chipColor="#EADBC8"
          activeColor="#2D2421"
          textColor="#52433A"
          activeTextColor="#FAF6F0"
          size="sm"
          gap={6}
          radius={14}
        />
      </div>

      {/* Interactive Controls & Parameters Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-line bg-champagne-50 p-2.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            Load $L$ (kg)
          </label>
          <input
            type="number"
            step="5"
            value={load}
            onChange={(e) => setLoad(parseFloat(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-1 text-sm font-bold text-ink outline-none tabular focus:border-accent-500"
          />
        </div>

        <div className="rounded-xl border border-line bg-champagne-50 p-2.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            Indication $I$ (kg)
          </label>
          <input
            type="number"
            step="0.01"
            value={indication}
            onChange={(e) => setIndication(parseFloat(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-1 text-sm font-bold text-ink outline-none tabular focus:border-accent-500"
          />
        </div>

        <div className="rounded-xl border border-line bg-champagne-50 p-2.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            Change $\Delta L$ (kg)
          </label>
          <input
            type="number"
            step="0.001"
            value={deltaL}
            onChange={(e) => setDeltaL(parseFloat(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-1 text-sm font-bold text-ink outline-none tabular focus:border-accent-500"
          />
        </div>

        <div className="rounded-xl border border-line bg-champagne-50 p-2.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            Interval $d$ (kg)
          </label>
          <input
            type="number"
            step="0.005"
            value={d}
            onChange={(e) => setD(parseFloat(e.target.value) || 0.01)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-1 text-sm font-bold text-ink outline-none tabular focus:border-accent-500"
          />
        </div>

        <div className="col-span-2 rounded-xl border border-line bg-champagne-50 p-2.5 sm:col-span-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            Zero Error $E_0$ (kg)
          </label>
          <input
            type="number"
            step="0.001"
            value={e0}
            onChange={(e) => setE0(parseFloat(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-1 text-sm font-bold text-ink outline-none tabular focus:border-accent-500"
          />
        </div>
      </div>

      {/* Real-time Formulation Table */}
      <div className="mt-5 overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-line bg-champagne-100 text-ink-faint">
            <tr>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Formula Variable</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Metrological Law</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Computed Value</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Status / Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white tabular">
            <tr className="hover:bg-champagne-50/50">
              <td className="py-2.5 px-3 font-bold text-espresso-800">True Indication ($P$)</td>
              <td className="py-2.5 px-3 font-mono text-[11px] text-ink-faint">
                P = I + 0.5d - &Delta;L
              </td>
              <td className="py-2.5 px-3 font-bold text-espresso-900">
                {indication.toFixed(3)} + {(0.5 * d).toFixed(4)} - {deltaL.toFixed(4)} = <span className="text-accent-700">{p.toFixed(4)}</span>
              </td>
              <td className="py-2.5 px-3 text-ink-faint">kg (exact)</td>
            </tr>

            <tr className="hover:bg-champagne-50/50">
              <td className="py-2.5 px-3 font-bold text-espresso-800">Raw Indication Error ($E$)</td>
              <td className="py-2.5 px-3 font-mono text-[11px] text-ink-faint">
                E = P - L
              </td>
              <td className="py-2.5 px-3 font-bold text-espresso-900">
                {p.toFixed(4)} - {load.toFixed(3)} = <span>{rawError >= 0 ? `+${rawError.toFixed(4)}` : rawError.toFixed(4)}</span>
              </td>
              <td className="py-2.5 px-3 text-ink-faint">kg uncorrected</td>
            </tr>

            <tr className="hover:bg-champagne-50/50">
              <td className="py-2.5 px-3 font-bold text-espresso-800">Corrected Error ($E_c$)</td>
              <td className="py-2.5 px-3 font-mono text-[11px] text-ink-faint">
                Ec = E - E0
              </td>
              <td className="py-2.5 px-3 font-bold text-espresso-900">
                {rawError.toFixed(4)} - ({e0.toFixed(4)}) = <span className={isPass ? 'text-pass-fg font-extrabold' : 'text-fail-fg font-extrabold'}>{correctedError >= 0 ? `+${correctedError.toFixed(4)}` : correctedError.toFixed(4)}</span>
              </td>
              <td className="py-2.5 px-3 text-ink-faint">kg zero-corrected</td>
            </tr>

            <tr className="hover:bg-champagne-50/50">
              <td className="py-2.5 px-3 font-bold text-espresso-800">Statutory MPE Corridor</td>
              <td className="py-2.5 px-3 font-mono text-[11px] text-ink-faint">
                |Ec| &le; MPE ({selectedClass})
              </td>
              <td className="py-2.5 px-3 font-bold text-espresso-900">
                [-{mpe.toFixed(4)} kg, +{mpe.toFixed(4)} kg]
              </td>
              <td className="py-2.5 px-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    isPass ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'
                  }`}
                >
                  {isPass ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {isPass ? 'CONFORMS (PASS)' : 'NON-CONFORMANT'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Visual Tolerance Corridor Bar */}
      <div className="mt-5 rounded-xl border border-line bg-champagne-50/80 p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-espresso-800">Metrological Error Envelope Position</span>
          <span className="font-mono text-ink-faint">
            Error: {correctedError >= 0 ? `+${correctedError.toFixed(4)}` : correctedError.toFixed(4)} kg / Limit &plusmn;{mpe.toFixed(4)} kg
          </span>
        </div>

        {/* Progress Corridor */}
        <div className="relative mt-2.5 h-6 w-full overflow-hidden rounded-full border border-line bg-white">
          {/* Centered target mark */}
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-ink-faint/30 z-10" />

          {/* Tolerance zone */}
          <div className="absolute inset-0 bg-pass-bg/60" />

          {/* Actual indicator point */}
          <motion.div
            className={`absolute top-0 bottom-0 w-3 -translate-x-1/2 rounded-full border border-white shadow-card ${
              isPass ? 'bg-pass-fg' : 'bg-fail-fg'
            }`}
            animate={{ left: `${tolerancePercent}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        </div>

        <div className="mt-1.5 flex justify-between text-[10px] font-bold text-ink-faint tabular">
          <span>-MPE (-{mpe.toFixed(3)}kg)</span>
          <span>Nominal 0.000kg</span>
          <span>+MPE (+{mpe.toFixed(3)}kg)</span>
        </div>
      </div>

      {/* Micro-actions / Quick adjust */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDeltaL((prev) => Math.max(0, Number((prev - 0.002).toFixed(4))))}
            className="btn-ghost !px-2.5 !py-1 text-xs"
          >
            -2g Change Load
          </button>
          <button
            type="button"
            onClick={() => setDeltaL((prev) => Number((prev + 0.002).toFixed(4)))}
            className="btn-ghost !px-2.5 !py-1 text-xs"
          >
            +2g Change Load
          </button>
          <button
            type="button"
            onClick={() => setIndication((prev) => Number((prev + 0.02).toFixed(2)))}
            className="btn-ghost !px-2.5 !py-1 text-xs text-fail-fg"
          >
            Inject Error (+20g)
          </button>
        </div>

        <button
          type="button"
          onClick={() => handlePresetChange(selectedPoint)}
          className="flex items-center gap-1.5 text-xs font-semibold text-accent-700 hover:text-accent-800"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reset test point
        </button>
      </div>
    </div>
  );
}
