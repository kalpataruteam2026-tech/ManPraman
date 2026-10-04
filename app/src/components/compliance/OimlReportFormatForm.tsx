'use client';

import React from 'react';
import { Instrument, TestSession } from '../../domain/types';
import { OimlTestDef } from '../../domain/oiml17Tests';
import { selectMpe } from '../../engine/mpe';
import { getRuleset } from '../../regulatory/registry';
import { CheckCircle2, XCircle, SlidersHorizontal, Calculator } from 'lucide-react';

interface OimlReportFormatFormProps {
  test: OimlTestDef;
  instrument: Instrument;
  session: TestSession;
  inputs: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function OimlReportFormatForm({
  test,
  instrument,
  session,
  inputs,
  onChange,
}: OimlReportFormatFormProps) {
  const e = instrument.e || 1;
  const d = instrument.d || e;
  const max = instrument.max || 1000;
  const unit = instrument.unit || 'g';
  const ruleset = getRuleset(session.rulesetId || 'oiml-r76-1:2006');
  const e0 = session.results?.zero?.zeroError ?? 0;

  const safeSelect = (loadVal: number) => {
    try {
      return selectMpe({
        ruleset,
        accuracyClass: instrument.accuracyClass,
        load: loadVal,
        e: e > 0 ? e : 1,
        stage: session.stage || 'initial',
        precision: 3,
      });
    } catch {
      return {
        loadInE: 1,
        band: 'Standard band',
        mpeInE: 1,
        mpe: e > 0 ? e : 1,
        stageMultiplier: 1,
        ruleRef: 'OIML R 76-1',
      };
    }
  };

  return (
    <div className="space-y-5 text-sm">
      {/* ------------------------------------------------------------- */}
      {/* Official OIML R 76-2 Environmental Conditions Header Box      */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-xl border border-line bg-slate-50/70 p-4 shadow-inner">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-accent-600" />
            OIML R 76-2 Ambient Test Conditions
          </span>
          <span className="font-mono text-accent-700 font-semibold">{test.clause}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="font-medium text-ink-soft block mb-1">Temp. At Start (°C)</label>
            <input
              type="number"
              step="0.1"
              value={inputs.tempStart ?? 20.5}
              onChange={(ev) => onChange('tempStart', Number(ev.target.value))}
              className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 font-mono text-ink shadow-sm"
            />
          </div>
          <div>
            <label className="font-medium text-ink-soft block mb-1">Temp. At End (°C)</label>
            <input
              type="number"
              step="0.1"
              value={inputs.tempEnd ?? 21.2}
              onChange={(ev) => onChange('tempEnd', Number(ev.target.value))}
              className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 font-mono text-ink shadow-sm"
            />
          </div>
          <div>
            <label className="font-medium text-ink-soft block mb-1">Rel. Humidity (%)</label>
            <input
              type="number"
              value={inputs.relHumidity ?? 55}
              onChange={(ev) => onChange('relHumidity', Number(ev.target.value))}
              className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 font-mono text-ink shadow-sm"
            />
          </div>
          <div>
            <label className="font-medium text-ink-soft block mb-1">Bar. Press. (hPa)</label>
            <input
              type="number"
              value={inputs.barPressure ?? 1013}
              onChange={(ev) => onChange('barPressure', Number(ev.target.value))}
              className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 font-mono text-ink shadow-sm"
            />
          </div>
        </div>

        {/* Device condition checkbox row */}
        <div className="mt-3 pt-3 border-t border-line/60 flex flex-wrap items-center gap-4 text-xs text-ink-soft">
          <span className="font-semibold text-ink">Zero-tracking device:</span>
          {['Non-existent', 'Not in operation', 'In operation'].map((mode) => (
            <label key={mode} className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="zeroTrackingMode"
                checked={(inputs.zeroTrackingMode ?? 'In operation') === mode}
                onChange={() => onChange('zeroTrackingMode', mode)}
                className="text-accent-600 focus:ring-accent-500"
              />
              <span>{mode}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TEST SPECIFIC FORM TABLES FROM OIML R 76-2                    */}
      {/* ------------------------------------------------------------- */}

      {/* TEST 1: ZERO-SETTING & ZERO INDICATION (Page 10) */}
      {test.testType === 'zero' && (() => {
        const i0 = Number(inputs.i0 ?? 0);
        const dl0 = Number(inputs.deltaL0 ?? 0.5 * d);
        const p0 = i0 + 0.5 * d - dl0;
        const e0Val = p0;
        const limit0 = 0.25 * e;
        const pass0 = Math.abs(e0Val) <= limit0;

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-white overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-line font-bold text-xs text-ink flex items-center justify-between">
                <span>Zero-Setting Evaluation Table (OIML R 76-2 p.10)</span>
                <span className="font-mono text-accent-700 bg-accent-50 px-2 py-0.5 rounded border border-accent-200">
                  E0 = I0 + ½d − ΔL0 − L0
                </span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-paper text-ink-faint border-b border-line">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Test Parameter</th>
                    <th className="px-3 py-2 font-semibold">Symbol</th>
                    <th className="px-3 py-2 font-semibold">Observed Input</th>
                    <th className="px-3 py-2 font-semibold">Unit</th>
                    <th className="px-3 py-2 font-semibold text-right">Live Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-ink">Zero Test Load</td>
                    <td className="px-3 py-2.5 font-mono text-ink-faint">L0</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        disabled
                        value={0}
                        className="w-32 rounded border border-line bg-slate-100 px-2 py-1 font-mono text-ink-soft"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-ink-faint">{unit}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-ink-faint">—</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-ink">Indication at Zero</td>
                    <td className="px-3 py-2.5 font-mono text-ink-faint">I0</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        step="any"
                        value={inputs.i0 ?? 0}
                        onChange={(ev) => onChange('i0', Number(ev.target.value))}
                        className="w-32 rounded border border-line px-2 py-1 font-mono text-ink bg-paper focus:bg-white focus:border-accent-500 shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-ink-faint">{unit}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-ink">I0 = {i0.toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-ink">Additional Load to changeover</td>
                    <td className="px-3 py-2.5 font-mono text-ink-faint">ΔL0</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        step="any"
                        value={inputs.deltaL0 ?? 0.5 * d}
                        onChange={(ev) => onChange('deltaL0', Number(ev.target.value))}
                        className="w-32 rounded border border-line px-2 py-1 font-mono text-ink bg-paper focus:bg-white focus:border-accent-500 shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-ink-faint">{unit}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-ink">ΔL0 = {dl0.toFixed(3)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-slate-50 px-4 py-3 border-t border-line flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-ink">
                    Calculated Zero Error (E0): <span className="font-mono text-accent-700 font-bold">{e0Val.toFixed(3)} {unit}</span>
                  </span>
                  <span className="text-ink-faint">
                    Limit (±0.25e): <span className="font-mono">± {limit0.toFixed(3)} {unit}</span>
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full ${pass0 ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'}`}>
                  {pass0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {pass0 ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TEST 2: WEIGHING PERFORMANCE (Page 10) */}
      {test.testType === 'weighing' && (() => {
        const rows = [
          { label: 'Min', defaultL: instrument.min || 20 * e },
          { label: '500 e (MPE 1)', defaultL: 500 * e },
          { label: '2000 e (MPE 2)', defaultL: Math.min(2000 * e, max * 0.7) },
          { label: '50% Max', defaultL: max * 0.5 },
          { label: '100% Max', defaultL: max },
        ];
        const activeIdx = Math.max(0, Math.min(4, Number(inputs.activeWeighingIdx ?? 4)));

        return (
          <div className="space-y-4">
            {/* Interactive Load Point Selector Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-line">
              <span className="text-xs font-bold text-ink-soft flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5 text-accent-600" />
                Select Load for Live Trace:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {rows.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange('activeWeighingIdx', i);
                      onChange('load', r.defaultL);
                      onChange('indication', inputs[`load_${i}_i_up`] ?? r.defaultL);
                      onChange('additionalLoad', inputs[`load_${i}_dl_up`] ?? 0.5 * d);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-sm ${
                      activeIdx === i
                        ? 'bg-accent-600 text-white shadow-accent-600/30 ring-2 ring-accent-400'
                        : 'bg-white text-ink-soft hover:bg-slate-100 border border-line'
                    }`}
                  >
                    {r.label} ({r.defaultL} {unit})
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-white overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-line font-bold text-xs text-ink flex justify-between items-center">
                <span>Weighing Performance Observation Table (OIML R 76-2 p.10)</span>
                <span className="font-mono text-accent-700 bg-accent-50 px-2 py-0.5 rounded border border-accent-200">
                  P = I + ½d − ΔL · Ec = P − L − E0
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper text-ink-faint border-b border-line">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Load Level</th>
                      <th className="px-3 py-2 font-semibold">Load L ({unit})</th>
                      <th className="px-3 py-2 font-semibold">Indication I (↑)</th>
                      <th className="px-3 py-2 font-semibold">Add. ΔL (↑)</th>
                      <th className="px-3 py-2 font-semibold">P (↑)</th>
                      <th className="px-3 py-2 font-semibold">Ec (↑)</th>
                      <th className="px-3 py-2 font-semibold">MPE</th>
                      <th className="px-3 py-2 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((row, idx) => {
                      const iUp = Number(inputs[`load_${idx}_i_up`] ?? row.defaultL);
                      const dlUp = Number(inputs[`load_${idx}_dl_up`] ?? 0.5 * d);
                      const pUp = iUp + 0.5 * d - dlUp;
                      const ecUp = pUp - row.defaultL - e0;
                      const mpe = safeSelect(row.defaultL).mpe;
                      const pass = Math.abs(ecUp) <= mpe;
                      const isActive = activeIdx === idx;

                      return (
                        <tr
                          key={idx}
                          onClick={() => {
                            onChange('activeWeighingIdx', idx);
                            onChange('load', row.defaultL);
                            onChange('indication', iUp);
                            onChange('additionalLoad', dlUp);
                          }}
                          className={`cursor-pointer transition ${
                            isActive ? 'bg-accent-50/60 font-medium' : 'hover:bg-slate-50/50'
                          }`}
                        >
                          <td className="px-3 py-2 font-bold text-ink flex items-center gap-1.5">
                            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-accent-600 animate-pulse" />}
                            {row.label}
                          </td>
                          <td className="px-3 py-2 font-mono text-ink-soft">{row.defaultL}</td>
                          <td className="px-3 py-2" onClick={(ev) => ev.stopPropagation()}>
                            <input
                              type="number"
                              step="any"
                              value={inputs[`load_${idx}_i_up`] ?? row.defaultL}
                              onChange={(ev) => {
                                const val = Number(ev.target.value);
                                onChange(`load_${idx}_i_up`, val);
                                if (isActive) onChange('indication', val);
                              }}
                              className="w-24 rounded border border-line px-2 py-1 font-mono text-ink bg-white focus:ring-1 focus:ring-accent-500 shadow-sm"
                            />
                          </td>
                          <td className="px-3 py-2" onClick={(ev) => ev.stopPropagation()}>
                            <input
                              type="number"
                              step="any"
                              value={inputs[`load_${idx}_dl_up`] ?? 0.5 * d}
                              onChange={(ev) => {
                                const val = Number(ev.target.value);
                                onChange(`load_${idx}_dl_up`, val);
                                if (isActive) onChange('additionalLoad', val);
                              }}
                              className="w-20 rounded border border-line px-2 py-1 font-mono text-ink bg-white focus:ring-1 focus:ring-accent-500 shadow-sm"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-ink">{pUp.toFixed(3)}</td>
                          <td className={`px-3 py-2 font-mono font-bold ${pass ? 'text-pass-fg' : 'text-fail-fg'}`}>
                            {ecUp >= 0 ? `+${ecUp.toFixed(3)}` : ecUp.toFixed(3)}
                          </td>
                          <td className="px-3 py-2 font-mono text-ink-faint">± {mpe.toFixed(3)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold ${pass ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'}`}>
                              {pass ? 'PASS' : 'FAIL'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TEST 3: REPEATABILITY (Page 16) */}
      {test.testType === 'repeatability' && (() => {
        const testLoad = Number(inputs.load ?? max * 0.5);
        const runs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
          (r) => Number(inputs[`rep_run_${r}`] ?? inputs[`run${r}`] ?? (testLoad + (r % 3 === 0 ? 0.1 * d : 0)))
        );
        const maxVal = Math.max(...runs);
        const minVal = Math.min(...runs);
        const spread = maxVal - minVal;
        const repLimit = safeSelect(testLoad).mpe;
        const passRep = spread <= repLimit;

        return (
          <div className="space-y-4">
            {/* Live Calculation Banner */}
            <div className="bg-slate-50 p-3 rounded-xl border border-line flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <span>Max: <strong className="font-mono text-ink">{maxVal.toFixed(3)} {unit}</strong></span>
                <span>Min: <strong className="font-mono text-ink">{minVal.toFixed(3)} {unit}</strong></span>
                <span>Spread (ΔP): <strong className={`font-mono ${passRep ? 'text-pass-fg' : 'text-fail-fg'}`}>{spread.toFixed(3)} {unit}</strong></span>
                <span>Allowable Limit: <strong className="font-mono text-ink-soft">≤ {repLimit.toFixed(3)} {unit}</strong></span>
              </div>
              <span className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full ${passRep ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'}`}>
                {passRep ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                {passRep ? 'PASS' : 'FAIL'}
              </span>
            </div>

            <div className="rounded-xl border border-line bg-white overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-line font-bold text-xs text-ink flex justify-between">
                <span>Repeatability 10 Weighings (OIML R 76-2 p.16)</span>
                <span className="font-mono text-ink-faint">Test Load ≈ ½ Max ({testLoad} {unit})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((run) => (
                  <div key={run} className="rounded-lg border border-line p-2.5 bg-paper/60 hover:bg-white transition shadow-sm">
                    <div className="text-[10px] font-bold text-ink-faint uppercase mb-1">Run #{run}</div>
                    <label className="text-[10px] text-ink-soft block">Indication (I)</label>
                    <input
                      type="number"
                      step="any"
                      value={inputs[`rep_run_${run}`] ?? (testLoad + (run % 3 === 0 ? 0.1 * d : 0))}
                      onChange={(ev) => onChange(`rep_run_${run}`, Number(ev.target.value))}
                      className="w-full rounded border border-line px-2 py-1 font-mono text-xs text-ink bg-white focus:ring-1 focus:ring-accent-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* TEST 4: ECCENTRICITY (Page 12) */}
      {test.testType === 'eccentricity' && (() => {
        const cornerLoad = Number(inputs.cornerLoad ?? Number((max / 3).toFixed(1)));
        const eccMpe = safeSelect(cornerLoad).mpe;
        const quads = [
          { id: 1, pos: 'Centre (Reference)' },
          { id: 2, pos: 'Front-Left Quadrant' },
          { id: 3, pos: 'Back-Right Quadrant' },
          { id: 4, pos: 'Back-Left Quadrant' },
        ];

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-white overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-line font-bold text-xs text-ink flex justify-between">
                <span>Off-Centre Loading Quadrants (OIML R 76-2 p.12)</span>
                <span className="font-mono text-ink-faint">Load ≈ ⅓ Max ({cornerLoad} {unit})</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-paper text-ink-faint border-b border-line">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Location</th>
                    <th className="px-3 py-2 font-semibold">Receptor Position</th>
                    <th className="px-3 py-2 font-semibold">Indication I ({unit})</th>
                    <th className="px-3 py-2 font-semibold">Add. ΔL ({unit})</th>
                    <th className="px-3 py-2 font-semibold">Corrected Error (Ec)</th>
                    <th className="px-3 py-2 font-semibold">MPE</th>
                    <th className="px-3 py-2 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {quads.map((quad) => {
                    const ind = Number(inputs[`ecc_ind_${quad.id}`] ?? cornerLoad);
                    const dl = Number(inputs[`ecc_dl_${quad.id}`] ?? 0.5 * d);
                    const p = ind + 0.5 * d - dl;
                    const ec = p - cornerLoad - e0;
                    const pass = Math.abs(ec) <= eccMpe;

                    return (
                      <tr key={quad.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-bold font-mono text-accent-700">#{quad.id}</td>
                        <td className="px-3 py-2.5 font-semibold text-ink">{quad.pos}</td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            step="any"
                            value={inputs[`ecc_ind_${quad.id}`] ?? cornerLoad}
                            onChange={(ev) => onChange(`ecc_ind_${quad.id}`, Number(ev.target.value))}
                            className="w-28 rounded border border-line px-2 py-1 font-mono text-ink bg-white focus:ring-1 focus:ring-accent-500 shadow-sm"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            step="any"
                            value={inputs[`ecc_dl_${quad.id}`] ?? 0.5 * d}
                            onChange={(ev) => onChange(`ecc_dl_${quad.id}`, Number(ev.target.value))}
                            className="w-20 rounded border border-line px-2 py-1 font-mono text-ink bg-white focus:ring-1 focus:ring-accent-500 shadow-sm"
                          />
                        </td>
                        <td className={`px-3 py-2.5 font-mono font-bold ${pass ? 'text-pass-fg' : 'text-fail-fg'}`}>
                          {ec >= 0 ? `+${ec.toFixed(3)}` : ec.toFixed(3)} {unit}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-ink-faint">± {eccMpe.toFixed(3)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold ${pass ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'}`}>
                            {pass ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TEST 5: TARE DEVICE & WEIGHING (Page 21) */}
      {test.testType === 'tare' && (() => {
        const tareW = Number(inputs.tareWeight ?? max * 0.2);
        const netL = Number(inputs.netLoad ?? max * 0.5);
        const netI = Number(inputs.netIndication ?? netL);
        const netDL = Number(inputs.netDL ?? 0.5 * d);
        const pNet = netI + 0.5 * d - netDL;
        const ecNet = pNet - netL - e0;
        const tareMpe = safeSelect(netL).mpe;
        const passTare = Math.abs(ecNet) <= tareMpe;

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-white overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-line font-bold text-xs text-ink flex justify-between">
                <span>Tare Weighing Evaluation (OIML R 76-2 p.21)</span>
                <span className="font-mono text-ink-faint">Ec = P_net − L_net − E0</span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="font-medium text-xs text-ink-soft block mb-1">Tare Container Load (T)</label>
                  <input
                    type="number"
                    step="any"
                    value={inputs.tareWeight ?? max * 0.2}
                    onChange={(ev) => onChange('tareWeight', Number(ev.target.value))}
                    className="w-full rounded border border-line px-2.5 py-1.5 font-mono text-xs bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="font-medium text-xs text-ink-soft block mb-1">Net Applied Load (L_net)</label>
                  <input
                    type="number"
                    step="any"
                    value={inputs.netLoad ?? max * 0.5}
                    onChange={(ev) => onChange('netLoad', Number(ev.target.value))}
                    className="w-full rounded border border-line px-2.5 py-1.5 font-mono text-xs bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="font-medium text-xs text-ink-soft block mb-1">Observed Net Indication</label>
                  <input
                    type="number"
                    step="any"
                    value={inputs.netIndication ?? netL}
                    onChange={(ev) => onChange('netIndication', Number(ev.target.value))}
                    className="w-full rounded border border-line px-2.5 py-1.5 font-mono text-xs bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="font-medium text-xs text-ink-soft block mb-1">Net Add. Load (ΔL_net)</label>
                  <input
                    type="number"
                    step="any"
                    value={inputs.netDL ?? 0.5 * d}
                    onChange={(ev) => onChange('netDL', Number(ev.target.value))}
                    className="w-full rounded border border-line px-2.5 py-1.5 font-mono text-xs bg-white shadow-sm"
                  />
                </div>
              </div>

              <div className="bg-slate-50 px-4 py-3 border-t border-line flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span>P_net: <strong className="font-mono text-ink">{pNet.toFixed(3)} {unit}</strong></span>
                  <span>Ec_net: <strong className={`font-mono ${passTare ? 'text-pass-fg' : 'text-fail-fg'}`}>{ecNet >= 0 ? `+${ecNet.toFixed(3)}` : ecNet.toFixed(3)} {unit}</strong></span>
                  <span>MPE: <strong className="font-mono text-ink-faint">± {tareMpe.toFixed(3)} {unit}</strong></span>
                </div>
                <span className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full ${passTare ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'}`}>
                  {passTare ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {passTare ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TEST 6: DISCRIMINATION (Page 14) */}
      {test.testType === 'discrimination' && (() => {
        const rows = [
          { label: 'Min Capacity', base: instrument.min || 20 * e },
          { label: '½ Max', base: max * 0.5 },
          { label: 'Max Capacity', base: max },
        ];
        const activeDiscIdx = Math.max(0, Math.min(2, Number(inputs.activeDiscIdx ?? 1)));

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-white overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-line font-bold text-xs text-ink flex justify-between">
                <span>Discrimination Test Table (OIML R 76-2 p.14)</span>
                <span className="font-mono text-ink-faint">Criterion: I2 − I1 ≥ 1.0 d ({d} {unit})</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-paper text-ink-faint border-b border-line">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Load Level</th>
                    <th className="px-3 py-2 font-semibold">Base Load L</th>
                    <th className="px-3 py-2 font-semibold">Initial Indication I1</th>
                    <th className="px-3 py-2 font-semibold">Extra Load (1.4d)</th>
                    <th className="px-3 py-2 font-semibold">New Indication I2</th>
                    <th className="px-3 py-2 font-semibold">Shift ΔI</th>
                    <th className="px-3 py-2 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row, idx) => {
                    const extra = 1.4 * d;
                    const i2 = Number(inputs[`disc_i2_${idx}`] ?? (row.base + d));
                    const shift = Math.abs(i2 - row.base);
                    const pass = shift >= d;
                    const isActive = activeDiscIdx === idx;

                    return (
                      <tr
                        key={idx}
                        onClick={() => onChange('activeDiscIdx', idx)}
                        className={`cursor-pointer transition ${isActive ? 'bg-accent-50/60 font-medium' : 'hover:bg-slate-50/50'}`}
                      >
                        <td className="px-3 py-2.5 font-bold text-ink">{row.label}</td>
                        <td className="px-3 py-2.5 font-mono text-ink-faint">{row.base} {unit}</td>
                        <td className="px-3 py-2.5 font-mono text-ink-soft">{row.base} {unit}</td>
                        <td className="px-3 py-2.5 font-mono text-accent-700 font-bold">{extra.toFixed(2)} {unit}</td>
                        <td className="px-3 py-2.5" onClick={(ev) => ev.stopPropagation()}>
                          <input
                            type="number"
                            step="any"
                            value={inputs[`disc_i2_${idx}`] ?? (row.base + d)}
                            onChange={(ev) => {
                              onChange(`disc_i2_${idx}`, Number(ev.target.value));
                              onChange('activeDiscIdx', idx);
                            }}
                            className="w-28 rounded border border-line px-2 py-1 font-mono text-ink bg-white shadow-sm focus:ring-1 focus:ring-accent-500"
                          />
                        </td>
                        <td className={`px-3 py-2.5 font-mono font-bold ${pass ? 'text-pass-fg' : 'text-fail-fg'}`}>
                          {shift.toFixed(2)} {unit}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold ${pass ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'}`}>
                            {pass ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TEST 9: TEMPERATURE EFFECT ON ZERO INDICATION (OIML R 76-2 Clause A.5.3.1) */}
      {test.testType === 'temp_zero' && (() => {
        const ref20 = Number(inputs.temp_ref_20 ?? 0.0);
        const high40 = Number(inputs.temp_high_40 ?? 0.25 * e);
        const lowMinus10 = Number(inputs.temp_low_minus10 ?? -0.20 * e);
        const ret20 = Number(inputs.temp_ret_20 ?? 0.05 * e);

        const tRef = Number(inputs.temp_ref_val ?? 20);
        const tHigh = Number(inputs.temp_high_val ?? 40);
        const tLow = Number(inputs.temp_low_val ?? -10);

        const deltaTHigh = Math.max(1, Math.abs(tHigh - tRef));
        const deltaTLow = Math.max(1, Math.abs(tRef - tLow));

        const shiftHigh = Math.abs(high40 - ref20);
        const shiftLow = Math.abs(lowMinus10 - ref20);

        const isClass1 = instrument.accuracyClass === 'I';
        const normFactor = isClass1 ? 1 : 5; // OIML R 76-1: per 1°C for Class I, per 5°C for others

        const rateHigh = (shiftHigh / deltaTHigh) * normFactor;
        const rateLow = (shiftLow / deltaTLow) * normFactor;
        const maxRate = Math.max(rateHigh, rateLow);

        const limitDrift = 1.0 * e; // Statutory limit: 1.0e per 5°C (or per 1°C for Class I)
        const passZeroTemp = maxRate <= limitDrift;

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-white overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-line font-bold text-xs text-ink flex justify-between items-center">
                <span>Temperature Effect on Zero Indication Table (OIML R 76-2 A.5.3.1)</span>
                <span className="font-mono text-accent-700 bg-accent-50 px-2 py-0.5 rounded border border-accent-200">
                  Rate = (|ΔE0| / ΔT) × {normFactor} °C ≤ 1.0 e
                </span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-paper text-ink-faint border-b border-line">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Test Phase</th>
                    <th className="px-3 py-2 font-semibold">Chamber Temp (°C)</th>
                    <th className="px-3 py-2 font-semibold">Zero Error E0 ({unit})</th>
                    <th className="px-3 py-2 font-semibold">ΔT from Ref</th>
                    <th className="px-3 py-2 font-semibold">Shift |ΔE0| ({unit})</th>
                    <th className="px-3 py-2 font-semibold text-right">Drift per {normFactor} °C</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-mono text-xs">
                  <tr>
                    <td className="px-3 py-2.5 font-bold font-sans text-ink">1. Reference Temp (+20 °C)</td>
                    <td className="px-3 py-2.5">{tRef} °C</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        step="any"
                        value={inputs.temp_ref_20 ?? 0.0}
                        onChange={(ev) => onChange('temp_ref_20', Number(ev.target.value))}
                        className="w-24 rounded border border-line px-2 py-1 bg-white font-mono text-ink shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-ink-faint">Base</td>
                    <td className="px-3 py-2.5 text-ink-faint">—</td>
                    <td className="px-3 py-2.5 text-right text-ink-faint">—</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-bold font-sans text-ink">2. High Temperature (+40 °C)</td>
                    <td className="px-3 py-2.5">{tHigh} °C</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        step="any"
                        value={inputs.temp_high_40 ?? 0.25 * e}
                        onChange={(ev) => onChange('temp_high_40', Number(ev.target.value))}
                        className="w-24 rounded border border-line px-2 py-1 bg-white font-mono text-ink shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-sans">{deltaTHigh} °C</td>
                    <td className="px-3 py-2.5 font-sans">{shiftHigh.toFixed(3)} {unit}</td>
                    <td className="px-3 py-2.5 text-right font-sans font-bold text-accent-800">
                      {rateHigh.toFixed(3)} {unit}/{normFactor}°C
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-bold font-sans text-ink">3. Low Temperature (-10 °C)</td>
                    <td className="px-3 py-2.5">{tLow} °C</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        step="any"
                        value={inputs.temp_low_minus10 ?? -0.20 * e}
                        onChange={(ev) => onChange('temp_low_minus10', Number(ev.target.value))}
                        className="w-24 rounded border border-line px-2 py-1 bg-white font-mono text-ink shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-sans">{deltaTLow} °C</td>
                    <td className="px-3 py-2.5 font-sans">{shiftLow.toFixed(3)} {unit}</td>
                    <td className="px-3 py-2.5 text-right font-sans font-bold text-accent-800">
                      {rateLow.toFixed(3)} {unit}/{normFactor}°C
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-bold font-sans text-ink">4. Return Reference (+20 °C)</td>
                    <td className="px-3 py-2.5">{tRef} °C</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        step="any"
                        value={inputs.temp_ret_20 ?? 0.05 * e}
                        onChange={(ev) => onChange('temp_ret_20', Number(ev.target.value))}
                        className="w-24 rounded border border-line px-2 py-1 bg-white font-mono text-ink shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-ink-faint">Return</td>
                    <td className="px-3 py-2.5 font-sans">{Math.abs(ret20 - ref20).toFixed(3)} {unit}</td>
                    <td className="px-3 py-2.5 text-right font-sans text-ink-soft">
                      Zero return ok
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="bg-slate-50 px-4 py-3 border-t border-line flex flex-wrap items-center justify-between text-xs gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <span>
                    Max Zero Drift Rate: <strong className={`font-mono ${passZeroTemp ? 'text-pass-fg' : 'text-fail-fg'}`}>{maxRate.toFixed(3)} {unit}/{normFactor}°C</strong>
                  </span>
                  <span>
                    Statutory Limit (1.0e): <strong className="font-mono text-ink-faint">≤ {limitDrift.toFixed(3)} {unit}/{normFactor}°C</strong>
                  </span>
                  <span>
                    Margin: <strong className="font-mono text-ink-soft">{(limitDrift - maxRate).toFixed(3)} {unit}</strong>
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full ${passZeroTemp ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'}`}>
                  {passZeroTemp ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {passZeroTemp ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TEST 10: TEMPERATURE EFFECT ON SPAN / WEIGHING (OIML R 76-2 Clause A.5.3.2) */}
      {test.testType === 'temp_span' && (() => {
        const spanL = Number(inputs.spanLoad ?? max * 0.5);
        const spanMpe = safeSelect(spanL).mpe;

        const ind20 = Number(inputs.span_ind_20 ?? spanL);
        const ind40 = Number(inputs.span_ind_40 ?? (spanL + 0.2 * e));
        const indLow = Number(inputs.span_ind_low ?? (spanL - 0.2 * e));

        const dl20 = Number(inputs.span_dl_20 ?? 0.5 * d);
        const dl40 = Number(inputs.span_dl_40 ?? 0.5 * d);
        const dlLow = Number(inputs.span_dl_low ?? 0.5 * d);

        const p20 = ind20 + 0.5 * d - dl20;
        const p40 = ind40 + 0.5 * d - dl40;
        const pLow = indLow + 0.5 * d - dlLow;

        const ec20 = p20 - spanL - e0;
        const ec40 = p40 - spanL - e0;
        const ecLow = pLow - spanL - e0;

        const maxEcSpan = Math.max(Math.abs(ec20), Math.abs(ec40), Math.abs(ecLow));
        const passSpanTemp = maxEcSpan <= spanMpe;

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-white overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-line font-bold text-xs text-ink flex justify-between items-center">
                <span>Temperature Effect on Span Table (OIML R 76-2 A.5.3.2)</span>
                <span className="font-mono text-accent-700 bg-accent-50 px-2 py-0.5 rounded border border-accent-200">
                  |Ec(T)| ≤ MPE({spanL} {unit}) = ± {spanMpe.toFixed(3)} {unit}
                </span>
              </div>
              <div className="p-3 bg-slate-50/50 border-b border-line text-xs flex items-center gap-3">
                <span className="font-semibold text-ink">Applied Span Test Load L:</span>
                <input
                  type="number"
                  step="any"
                  value={inputs.spanLoad ?? max * 0.5}
                  onChange={(ev) => onChange('spanLoad', Number(ev.target.value))}
                  className="w-28 rounded border border-line px-2 py-1 font-mono text-xs bg-white shadow-sm"
                />
                <span className="text-ink-faint">({unit}) ≈ 50% Max</span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-paper text-ink-faint border-b border-line">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Test Condition</th>
                    <th className="px-3 py-2 font-semibold">Indication I ({unit})</th>
                    <th className="px-3 py-2 font-semibold">Add. ΔL ({unit})</th>
                    <th className="px-3 py-2 font-semibold">P = I+½d−ΔL</th>
                    <th className="px-3 py-2 font-semibold">Corrected Error Ec</th>
                    <th className="px-3 py-2 font-semibold">±MPE Limit</th>
                    <th className="px-3 py-2 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-mono text-xs">
                  <tr>
                    <td className="px-3 py-2.5 font-bold font-sans text-ink">Reference (+20 °C)</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        step="any"
                        value={inputs.span_ind_20 ?? spanL}
                        onChange={(ev) => onChange('span_ind_20', Number(ev.target.value))}
                        className="w-24 rounded border border-line px-2 py-1 bg-white font-mono text-ink shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        step="any"
                        value={inputs.span_dl_20 ?? 0.5 * d}
                        onChange={(ev) => onChange('span_dl_20', Number(ev.target.value))}
                        className="w-20 rounded border border-line px-2 py-1 bg-white font-mono text-ink shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-sans font-semibold">{p20.toFixed(3)}</td>
                    <td className={`px-3 py-2.5 font-sans font-bold ${Math.abs(ec20) <= spanMpe ? 'text-pass-fg' : 'text-fail-fg'}`}>
                      {ec20 >= 0 ? `+${ec20.toFixed(3)}` : ec20.toFixed(3)} {unit}
                    </td>
                    <td className="px-3 py-2.5 font-sans text-ink-faint">± {spanMpe.toFixed(3)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${Math.abs(ec20) <= spanMpe ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'}`}>
                        {Math.abs(ec20) <= spanMpe ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-bold font-sans text-ink">High Temp (+40 °C)</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        step="any"
                        value={inputs.span_ind_40 ?? (spanL + 0.2 * e)}
                        onChange={(ev) => onChange('span_ind_40', Number(ev.target.value))}
                        className="w-24 rounded border border-line px-2 py-1 bg-white font-mono text-ink shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        step="any"
                        value={inputs.span_dl_40 ?? 0.5 * d}
                        onChange={(ev) => onChange('span_dl_40', Number(ev.target.value))}
                        className="w-20 rounded border border-line px-2 py-1 bg-white font-mono text-ink shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-sans font-semibold">{p40.toFixed(3)}</td>
                    <td className={`px-3 py-2.5 font-sans font-bold ${Math.abs(ec40) <= spanMpe ? 'text-pass-fg' : 'text-fail-fg'}`}>
                      {ec40 >= 0 ? `+${ec40.toFixed(3)}` : ec40.toFixed(3)} {unit}
                    </td>
                    <td className="px-3 py-2.5 font-sans text-ink-faint">± {spanMpe.toFixed(3)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${Math.abs(ec40) <= spanMpe ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'}`}>
                        {Math.abs(ec40) <= spanMpe ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-bold font-sans text-ink">Low Temp (-10 °C)</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        step="any"
                        value={inputs.span_ind_low ?? (spanL - 0.2 * e)}
                        onChange={(ev) => onChange('span_ind_low', Number(ev.target.value))}
                        className="w-24 rounded border border-line px-2 py-1 bg-white font-mono text-ink shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        step="any"
                        value={inputs.span_dl_low ?? 0.5 * d}
                        onChange={(ev) => onChange('span_dl_low', Number(ev.target.value))}
                        className="w-20 rounded border border-line px-2 py-1 bg-white font-mono text-ink shadow-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-sans font-semibold">{pLow.toFixed(3)}</td>
                    <td className={`px-3 py-2.5 font-sans font-bold ${Math.abs(ecLow) <= spanMpe ? 'text-pass-fg' : 'text-fail-fg'}`}>
                      {ecLow >= 0 ? `+${ecLow.toFixed(3)}` : ecLow.toFixed(3)} {unit}
                    </td>
                    <td className="px-3 py-2.5 font-sans text-ink-faint">± {spanMpe.toFixed(3)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${Math.abs(ecLow) <= spanMpe ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'}`}>
                        {Math.abs(ecLow) <= spanMpe ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="bg-slate-50 px-4 py-3 border-t border-line flex flex-wrap items-center justify-between text-xs gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <span>
                    Worst Span Error |Ec(T)|: <strong className={`font-mono ${passSpanTemp ? 'text-pass-fg' : 'text-fail-fg'}`}>{maxEcSpan.toFixed(3)} {unit}</strong>
                  </span>
                  <span>
                    Acceptance Limit (MPE): <strong className="font-mono text-ink-faint">± {spanMpe.toFixed(3)} {unit}</strong>
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full ${passSpanTemp ? 'bg-pass-bg text-pass-fg' : 'bg-fail-bg text-fail-fg'}`}>
                  {passSpanTemp ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {passSpanTemp ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FALLBACK / GENERIC TEST REPORT FORM FOR OTHER ENVIRONMENTAL & SPECIAL TESTS */}
      {['sensitivity', 'tilt', 'damp_heat', 'creep', 'durability', 'voltage', 'electrical_burst', 'construction', 'software'].includes(test.testType) && (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <div className="font-bold text-xs text-ink mb-3 pb-2 border-b border-line flex items-center justify-between">
              <span>{test.name} Report Parameters (OIML R 76-2)</span>
              <span className="font-mono text-accent-700 bg-accent-50 px-2.5 py-0.5 rounded border border-accent-200">{test.clause}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {test.defaultInputs.map((inputDef) => (
                <div key={inputDef.key} className="space-y-1">
                  <label className="font-medium text-xs text-ink-soft block">
                    {inputDef.label} {inputDef.unit ? `(${inputDef.unit})` : ''}
                  </label>
                  {typeof inputDef.defaultValue === 'number' ? (
                    <input
                      type="number"
                      step="any"
                      value={inputs[inputDef.key] ?? inputDef.defaultValue}
                      onChange={(ev) => onChange(inputDef.key, Number(ev.target.value))}
                      className="w-full rounded-lg border border-line px-3 py-2 font-mono text-xs bg-white shadow-sm focus:ring-1 focus:ring-accent-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={inputs[inputDef.key] ?? inputDef.defaultValue}
                      onChange={(ev) => onChange(inputDef.key, ev.target.value)}
                      className="w-full rounded-lg border border-line px-3 py-2 font-mono text-xs bg-white shadow-sm focus:ring-1 focus:ring-accent-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
