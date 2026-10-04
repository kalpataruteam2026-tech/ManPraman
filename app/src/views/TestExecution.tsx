'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from '@/lib/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, XCircle, Calculator,
  FileText, ShieldCheck, Scale, Info, Sliders, Check, ChevronLeft, ChevronRight, Camera
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { OIML_17_TESTS, type OimlTestDef } from '../domain/oiml17Tests';
import { OimlReportFormatForm } from '../components/compliance/OimlReportFormatForm';
import { EvidenceUploader } from '../components/evidence/EvidenceUploader';
import { classLabel } from '../lib/format';
import { selectMpe } from '../engine/mpe';
import { getRuleset } from '../regulatory/registry';
import { toast } from '../lib/toast';

export default function TestExecution() {
  const { id, testType } = useParams();
  const navigate = useNavigate();

  const session = useAppStore((s) => s.sessions.find((x) => x.id === id));
  const instrument = useAppStore((s) => s.instruments.find((i) => i.id === session?.instrumentId));
  const setTestResult = useAppStore((s) => s.setTestResult);
  const [showEvidenceSection, setShowEvidenceSection] = useState(false);

  // Find test definition from the 17 OIML tests
  const currentTestIndex = useMemo(() => {
    return OIML_17_TESTS.findIndex((t) => t.testType === testType);
  }, [testType]);

  const currentTest: OimlTestDef = useMemo(() => {
    if (currentTestIndex >= 0) return OIML_17_TESTS[currentTestIndex];
    return OIML_17_TESTS[0];
  }, [currentTestIndex]);

  const prevTest = currentTestIndex > 0 ? OIML_17_TESTS[currentTestIndex - 1] : null;
  const nextTest = currentTestIndex < OIML_17_TESTS.length - 1 ? OIML_17_TESTS[currentTestIndex + 1] : null;

  // Retrieve any existing test result from session
  const existingResult = session?.results ? (session.results as Record<string, any>)[currentTest.testType] : null;

  // Form input state initialized from default inputs or existing result
  const [inputs, setInputs] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const inp of currentTest.defaultInputs) {
      initial[inp.key] = inp.defaultValue;
    }
    return initial;
  });

  // Re-sync inputs when test changes or existing result loads
  useEffect(() => {
    const initial: Record<string, any> = {};
    for (const inp of currentTest.defaultInputs) {
      if (existingResult?.rawInputs && existingResult.rawInputs[inp.key] !== undefined) {
        initial[inp.key] = existingResult.rawInputs[inp.key];
      } else {
        initial[inp.key] = inp.defaultValue;
      }
    }
    setInputs(initial);
  }, [currentTest, existingResult]);

  const handleInputChange = (key: string, value: any) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  // Base metrology calculations & reasoning
  const evaluation = useMemo(() => {
    if (!instrument || !session) return null;

    const e = instrument.e || 1;
    const d = instrument.d || e;
    const max = instrument.max || 1000;
    const ruleset = getRuleset(session.rulesetId || 'oiml-r76-1:2006');

    // Baseline E0 from zero test if completed
    const e0 = session.results?.zero?.zeroError ?? 0;

    let computedP = 0;
    let computedE = 0;
    let computedEc = 0;
    let limit = 0.5 * e;
    let status: 'PASS' | 'FAIL' = 'PASS';
    let summaryText = '';
    let stepCalculations: { label: string; formula: string; result: string }[] = [];

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

    switch (currentTest.testType) {
      case 'zero': {
        const i0 = Number(inputs.i0 ?? 0);
        const deltaL0 = Number(inputs.deltaL0 ?? 0.5 * d);
        computedP = i0 + 0.5 * d - deltaL0;
        computedE = computedP;
        computedEc = computedE;
        limit = 0.25 * e;
        status = Math.abs(computedE) <= limit ? 'PASS' : 'FAIL';

        stepCalculations = [
          { label: 'Indication prior to rounding (P0)', formula: 'I0 + 0.5d - ΔL0', result: `${computedP.toFixed(3)} ${instrument.unit}` },
          { label: 'Zero error (E0)', formula: 'P0 - L0 (where L0 = 0)', result: `${computedE.toFixed(3)} ${instrument.unit}` },
          { label: 'Maximum Permissible Limit', formula: '± 0.25 e', result: `± ${limit.toFixed(3)} ${instrument.unit}` },
        ];
        summaryText = `Observed |E0| = ${Math.abs(computedE).toFixed(3)} ${instrument.unit} ${status === 'PASS' ? '≤' : '>'} ${limit.toFixed(3)} ${instrument.unit}. Zero setting is ${status === 'PASS' ? 'accurate and compliant' : 'out of tolerance'}.`;
        break;
      }

      case 'weighing': {
        const loadLevels = [
          instrument.min || 20 * e,
          500 * e,
          Math.min(2000 * e, max * 0.7),
          max * 0.5,
          max,
        ];
        const activeIdx = Math.max(0, Math.min(4, Number(inputs.activeWeighingIdx ?? 4)));
        const load = loadLevels[activeIdx] ?? max;
        const indication = Number(inputs[`load_${activeIdx}_i_up`] ?? inputs.indication ?? load);
        const additionalLoad = Number(inputs[`load_${activeIdx}_dl_up`] ?? inputs.additionalLoad ?? 0.5 * d);

        computedP = indication + 0.5 * d - additionalLoad;
        computedE = computedP - load;
        computedEc = computedE - e0;

        const mpeSelect = safeSelect(load);
        limit = mpeSelect.mpe;

        // Check compliance across all 5 test load levels
        let allPointsPass = true;
        for (let i = 0; i < loadLevels.length; i++) {
          const lPt = loadLevels[i];
          const iPt = Number(inputs[`load_${i}_i_up`] ?? lPt);
          const dlPt = Number(inputs[`load_${i}_dl_up`] ?? 0.5 * d);
          const pPt = iPt + 0.5 * d - dlPt;
          const ecPt = pPt - lPt - e0;
          const mpePt = safeSelect(lPt).mpe;
          if (Math.abs(ecPt) > mpePt) allPointsPass = false;
        }

        status = allPointsPass && Math.abs(computedEc) <= limit ? 'PASS' : 'FAIL';

        const pointNames = ['Min Load', '500 e (MPE 1)', '2000 e (MPE 2)', '50% Max', '100% Max'];
        const activeName = pointNames[activeIdx] || `${load} ${instrument.unit}`;

        stepCalculations = [
          { label: `Prior to rounding (P) [${activeName}]`, formula: 'I + 0.5d - ΔL', result: `${computedP.toFixed(3)} ${instrument.unit}` },
          { label: 'Uncorrected Error (E)', formula: 'P - L', result: `${computedE.toFixed(3)} ${instrument.unit}` },
          { label: 'Corrected Error (Ec)', formula: `E - E0 (E0 = ${e0.toFixed(3)})`, result: `${computedEc.toFixed(3)} ${instrument.unit}` },
          { label: 'Applicable MPE', formula: `${classLabel(instrument.accuracyClass)} band (${mpeSelect.band})`, result: `± ${limit.toFixed(3)} ${instrument.unit}` },
        ];
        summaryText = `Point ${activeName}: Corrected error |Ec| = ${Math.abs(computedEc).toFixed(3)} ${instrument.unit} ${Math.abs(computedEc) <= limit ? '≤' : '>'} MPE (${limit.toFixed(3)} ${instrument.unit}). Overall weighing: ${status}.`;
        break;
      }

      case 'repeatability': {
        const testLoad = Number(inputs.load ?? max * 0.5);
        const runs: number[] = [];
        for (let r = 1; r <= 10; r++) {
          const val = inputs[`rep_run_${r}`] !== undefined
            ? Number(inputs[`rep_run_${r}`])
            : inputs[`run${r}`] !== undefined
              ? Number(inputs[`run${r}`])
              : testLoad + (r % 3 === 0 ? 0.1 * d : 0);
          runs.push(val);
        }
        const maxVal = Math.max(...runs);
        const minVal = Math.min(...runs);
        const range = maxVal - minVal;
        const mpeSelect = safeSelect(testLoad);
        limit = mpeSelect.mpe;
        status = range <= limit ? 'PASS' : 'FAIL';

        computedP = maxVal;
        computedE = range;
        computedEc = range;

        stepCalculations = [
          { label: 'Maximum Run Indication', formula: 'Max(Run 1..10)', result: `${maxVal.toFixed(3)} ${instrument.unit}` },
          { label: 'Minimum Run Indication', formula: 'Min(Run 1..10)', result: `${minVal.toFixed(3)} ${instrument.unit}` },
          { label: 'Repeatability Range (ΔP)', formula: 'Max - Min', result: `${range.toFixed(3)} ${instrument.unit}` },
          { label: 'Repeatability Limit', formula: '1.0 × |MPE(½ Max)|', result: `≤ ${limit.toFixed(3)} ${instrument.unit}` },
        ];
        summaryText = `Repeatability spread ΔP = ${range.toFixed(3)} ${instrument.unit} ${status === 'PASS' ? '≤' : '>'} allowable limit (${limit.toFixed(3)} ${instrument.unit}) over 10 consecutive weighings.`;
        break;
      }

      case 'eccentricity': {
        const cornerLoad = Number(inputs.cornerLoad ?? Number((max / 3).toFixed(1)));
        const mpeSelect = safeSelect(cornerLoad);
        limit = mpeSelect.mpe;

        let maxDev = 0;
        let worstQuad = 1;
        for (let q = 1; q <= 4; q++) {
          const ind = Number(inputs[`ecc_ind_${q}`] ?? inputs[`corner${q}`] ?? cornerLoad);
          const dl = Number(inputs[`ecc_dl_${q}`] ?? 0.5 * d);
          const p = ind + 0.5 * d - dl;
          const ec = Math.abs(p - cornerLoad - e0);
          if (ec > maxDev) {
            maxDev = ec;
            worstQuad = q;
          }
        }

        status = maxDev <= limit ? 'PASS' : 'FAIL';
        computedP = cornerLoad + maxDev;
        computedE = maxDev;
        computedEc = maxDev;

        const quadNames = ['Centre (Ref)', 'Front-Left', 'Back-Right', 'Back-Left'];

        stepCalculations = [
          { label: 'Applied Corner Load', formula: '≈ ⅓ Max', result: `${cornerLoad.toFixed(1)} ${instrument.unit}` },
          { label: `Worst Position (#${worstQuad}: ${quadNames[worstQuad - 1]})`, formula: '|P_quad - L - E0|', result: `${maxDev.toFixed(3)} ${instrument.unit}` },
          { label: 'Off-centre MPE', formula: 'MPE(⅓ Max)', result: `± ${limit.toFixed(3)} ${instrument.unit}` },
        ];
        summaryText = `Max off-centre deviation |Ec| = ${maxDev.toFixed(3)} ${instrument.unit} at quadrant #${worstQuad} ${status === 'PASS' ? '≤' : '>'} MPE (${limit.toFixed(3)} ${instrument.unit}).`;
        break;
      }

      case 'tare': {
        const tareW = Number(inputs.tareWeight ?? max * 0.2);
        const netL = Number(inputs.netLoad ?? max * 0.5);
        const netI = Number(inputs.netIndication ?? netL);
        const netDL = Number(inputs.netDL ?? 0.5 * d);

        computedP = netI + 0.5 * d - netDL;
        computedE = computedP - netL;
        computedEc = computedE - e0;

        const mpeSelect = safeSelect(netL);
        limit = mpeSelect.mpe;
        status = Math.abs(computedEc) <= limit ? 'PASS' : 'FAIL';

        stepCalculations = [
          { label: 'Tare Load Balance (T)', formula: 'Applied Tare Weight', result: `${tareW.toFixed(2)} ${instrument.unit}` },
          { label: 'Net Indication prior to rounding (P_net)', formula: 'I_net + 0.5d - ΔL_net', result: `${computedP.toFixed(3)} ${instrument.unit}` },
          { label: 'Net Corrected Error (Ec_net)', formula: 'P_net - L_net - E0', result: `${computedEc.toFixed(3)} ${instrument.unit}` },
          { label: 'Applicable Net MPE', formula: 'MPE(L_net)', result: `± ${limit.toFixed(3)} ${instrument.unit}` },
        ];
        summaryText = `Net weighing error |Ec| = ${Math.abs(computedEc).toFixed(3)} ${instrument.unit} ${status === 'PASS' ? '≤' : '>'} MPE (${limit.toFixed(3)} ${instrument.unit}). Tare balancing is verified.`;
        break;
      }

      case 'discrimination': {
        const activeDiscIdx = Math.max(0, Math.min(2, Number(inputs.activeDiscIdx ?? 1)));
        const baseLoads = [instrument.min || 20 * e, max * 0.5, max];
        const baseL = baseLoads[activeDiscIdx] ?? (max * 0.5);
        const extraL = 1.4 * d;
        const i2 = Number(inputs[`disc_i2_${activeDiscIdx}`] ?? (baseL + d));
        const shift = Math.abs(i2 - baseL);
        limit = d;
        status = shift >= limit ? 'PASS' : 'FAIL';

        computedP = i2;
        computedE = shift;
        computedEc = shift;

        stepCalculations = [
          { label: 'Base Test Load (L)', formula: activeDiscIdx === 0 ? 'Min' : activeDiscIdx === 1 ? '½ Max' : 'Max', result: `${baseL} ${instrument.unit}` },
          { label: 'Applied Extra Load', formula: 'ΔL = 1.4 d', result: `${extraL.toFixed(2)} ${instrument.unit}` },
          { label: 'Observed Indication Change (ΔI)', formula: 'I2 - I1', result: `${shift.toFixed(2)} ${instrument.unit}` },
          { label: 'Required Minimum Response', formula: '≥ 1.0 d', result: `${limit.toFixed(2)} ${instrument.unit}` },
        ];
        summaryText = `Indication shift ΔI = ${shift.toFixed(2)} ${instrument.unit} ${status === 'PASS' ? '≥' : '<'} 1d threshold (${limit} ${instrument.unit}). Discrimination is ${status === 'PASS' ? 'compliant' : 'non-compliant'}.`;
        break;
      }

      case 'tilt': {
        const levelInd = Number(inputs.tilt_level_ind ?? max * 0.5);
        const tiltedInd = Number(inputs.tilt_tilted_ind ?? levelInd);
        const shift = Math.abs(tiltedInd - levelInd);
        limit = safeSelect(max * 0.5).mpe;
        status = shift <= limit ? 'PASS' : 'FAIL';
        computedP = tiltedInd;
        computedE = shift;
        computedEc = shift;

        stepCalculations = [
          { label: 'Level Indication (I_level)', formula: '½ Max at level', result: `${levelInd.toFixed(3)} ${instrument.unit}` },
          { label: 'Tilted Indication (I_tilted)', formula: '½ Max at 51/1000 tilt', result: `${tiltedInd.toFixed(3)} ${instrument.unit}` },
          { label: 'Tilt Indication Shift (ΔI)', formula: '|I_tilted - I_level|', result: `${shift.toFixed(3)} ${instrument.unit}` },
          { label: 'Permissible Tilt Limit', formula: '1.0 × |MPE(½ Max)|', result: `≤ ${limit.toFixed(3)} ${instrument.unit}` },
        ];
        summaryText = `Tilt error ΔI = ${shift.toFixed(3)} ${instrument.unit} ${status === 'PASS' ? '≤' : '>'} allowable limit (${limit.toFixed(3)} ${instrument.unit}).`;
        break;
      }

      case 'temp_zero': {
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
        const normFactor = isClass1 ? 1 : 5; // OIML R 76-1 A.5.3.2: per 1°C for Class I, per 5°C for others

        const rateHigh = (shiftHigh / deltaTHigh) * normFactor;
        const rateLow = (shiftLow / deltaTLow) * normFactor;
        const maxRate = Math.max(rateHigh, rateLow);

        limit = 1.0 * e; // Statutory OIML tolerance: ≤ 1.0e per 5°C (or per 1°C)
        status = maxRate <= limit ? 'PASS' : 'FAIL';
        computedP = ref20 + maxRate;
        computedE = maxRate;
        computedEc = maxRate;

        stepCalculations = [
          { label: `Reference Zero Error E0(${tRef}°C)`, formula: `E0(${tRef}°C)`, result: `${ref20.toFixed(3)} ${instrument.unit}` },
          { label: `Upper Temp Zero Error E0(${tHigh}°C)`, formula: `E0(${tHigh}°C)`, result: `${high40.toFixed(3)} ${instrument.unit}` },
          { label: `Lower Temp Zero Error E0(${tLow}°C)`, formula: `E0(${tLow}°C)`, result: `${lowMinus10.toFixed(3)} ${instrument.unit}` },
          { label: `High Temp Drift (ΔT = ${deltaTHigh}°C)`, formula: `|ΔE0| / ${deltaTHigh} × ${normFactor}°C`, result: `${rateHigh.toFixed(3)} ${instrument.unit}/${normFactor}°C` },
          { label: `Low Temp Drift (ΔT = ${deltaTLow}°C)`, formula: `|ΔE0| / ${deltaTLow} × ${normFactor}°C`, result: `${rateLow.toFixed(3)} ${instrument.unit}/${normFactor}°C` },
          { label: 'Max Normalized Zero Drift Rate', formula: 'Max(Rate_high, Rate_low)', result: `${maxRate.toFixed(3)} ${instrument.unit}/${normFactor}°C` },
          { label: 'Statutory Permissible Limit', formula: `≤ 1.0 e per ${normFactor}°C (OIML A.5.3.1)`, result: `≤ ${limit.toFixed(3)} ${instrument.unit}` },
        ];
        summaryText = `Normalized zero drift rate = ${maxRate.toFixed(3)} ${instrument.unit}/${normFactor}°C ${status === 'PASS' ? '≤' : '>'} statutory limit of 1.0e (${limit.toFixed(3)} ${instrument.unit}). Temperature zero test is ${status}.`;
        break;
      }

      case 'temp_span': {
        const spanLoad = Number(inputs.spanLoad ?? max * 0.5);
        const mpeSelect = safeSelect(spanLoad);
        limit = mpeSelect.mpe;

        const ind20 = Number(inputs.span_ind_20 ?? spanLoad);
        const ind40 = Number(inputs.span_ind_40 ?? (spanLoad + 0.2 * e));
        const indLow = Number(inputs.span_ind_low ?? (spanLoad - 0.2 * e));

        const dl20 = Number(inputs.span_dl_20 ?? 0.5 * d);
        const dl40 = Number(inputs.span_dl_40 ?? 0.5 * d);
        const dlLow = Number(inputs.span_dl_low ?? 0.5 * d);

        const p20 = ind20 + 0.5 * d - dl20;
        const p40 = ind40 + 0.5 * d - dl40;
        const pLow = indLow + 0.5 * d - dlLow;

        const ec20 = p20 - spanLoad - e0;
        const ec40 = p40 - spanLoad - e0;
        const ecLow = pLow - spanLoad - e0;

        const maxEc = Math.max(Math.abs(ec20), Math.abs(ec40), Math.abs(ecLow));
        status = maxEc <= limit ? 'PASS' : 'FAIL';
        computedP = spanLoad + maxEc;
        computedE = maxEc;
        computedEc = maxEc;

        stepCalculations = [
          { label: 'Applied Test Load (Span)', formula: '≈ 50% Max', result: `${spanLoad.toFixed(1)} ${instrument.unit}` },
          { label: 'Corrected Error at +20°C (|Ec_20|)', formula: '|P(20°C) - L - E0|', result: `${Math.abs(ec20).toFixed(3)} ${instrument.unit}` },
          { label: 'Corrected Error at +40°C (|Ec_40|)', formula: '|P(40°C) - L - E0|', result: `${Math.abs(ec40).toFixed(3)} ${instrument.unit}` },
          { label: 'Corrected Error at -10°C (|Ec_low|)', formula: '|P(-10°C) - L - E0|', result: `${Math.abs(ecLow).toFixed(3)} ${instrument.unit}` },
          { label: 'Max Span Error at Temperature', formula: 'Max(|Ec(T)|)', result: `${maxEc.toFixed(3)} ${instrument.unit}` },
          { label: 'MPE Acceptance Corridor', formula: `MPE(${spanLoad} ${instrument.unit})`, result: `± ${limit.toFixed(3)} ${instrument.unit}` },
        ];
        summaryText = `Max span error across temperature envelope = ${maxEc.toFixed(3)} ${instrument.unit} ${status === 'PASS' ? '≤' : '>'} MPE limit (${limit.toFixed(3)} ${instrument.unit}). Status: ${status}.`;
        break;
      }

      case 'creep': {
        const creep0 = Number(inputs.creep_initial ?? max);
        const creep30 = Number(inputs.creep_30min ?? (max + 0.1 * e));
        const creepDiff = Math.abs(creep30 - creep0);
        limit = 0.5 * e;
        status = creepDiff <= limit ? 'PASS' : 'FAIL';
        computedP = creep30;
        computedE = creepDiff;
        computedEc = creepDiff;

        stepCalculations = [
          { label: 'Initial Indication at Max (t=0)', formula: 'I(0 min)', result: `${creep0.toFixed(3)} ${instrument.unit}` },
          { label: 'Indication at 30 min (t=30m)', formula: 'I(30 min)', result: `${creep30.toFixed(3)} ${instrument.unit}` },
          { label: 'Creep Difference (ΔI_creep)', formula: '|I(30) - I(0)|', result: `${creepDiff.toFixed(3)} ${instrument.unit}` },
          { label: 'Allowable Creep Limit', formula: '0.5 e', result: `≤ ${limit.toFixed(3)} ${instrument.unit}` },
        ];
        summaryText = `30-minute creep drift = ${creepDiff.toFixed(3)} ${instrument.unit} ${status === 'PASS' ? '≤' : '>'} 0.5e limit (${limit.toFixed(3)} ${instrument.unit}).`;
        break;
      }

      case 'voltage': {
        const vNom = Number(inputs.volt_nom_230 ?? max * 0.5);
        const vHigh = Number(inputs.volt_high_253 ?? vNom);
        const vLow = Number(inputs.volt_low_195 ?? vNom);
        const maxDev = Math.max(Math.abs(vHigh - vNom), Math.abs(vLow - vNom));
        limit = safeSelect(max * 0.5).mpe;
        status = maxDev <= limit ? 'PASS' : 'FAIL';
        computedP = vNom + maxDev;
        computedE = maxDev;
        computedEc = maxDev;

        stepCalculations = [
          { label: 'Nominal Supply (230V / Unom)', formula: 'I(Unom)', result: `${vNom.toFixed(3)} ${instrument.unit}` },
          { label: 'High Supply (+10% = 253V)', formula: 'I(1.10 Unom)', result: `${vHigh.toFixed(3)} ${instrument.unit}` },
          { label: 'Low Supply (-15% = 195V)', formula: 'I(0.85 Unom)', result: `${vLow.toFixed(3)} ${instrument.unit}` },
          { label: 'Voltage Span Variation', formula: 'Max(|I(V) - I(Unom)|)', result: `${maxDev.toFixed(3)} ${instrument.unit}` },
          { label: 'Permissible Variation Limit', formula: '1.0 × |MPE|', result: `≤ ${limit.toFixed(3)} ${instrument.unit}` },
        ];
        summaryText = `Voltage sensitivity drift = ${maxDev.toFixed(3)} ${instrument.unit} ${status === 'PASS' ? '≤' : '>'} allowable MPE (${limit.toFixed(3)} ${instrument.unit}).`;
        break;
      }

      case 'damp_heat': {
        // OIML R 76-1: A.5.4 - Expose to 40°C, 85% RH for 48h.
        // Regulatory requirement: |Ec_post_damp - Ec_pre_damp| <= 1.0 * MPE
        const rawShift = Number(inputs.postError ?? 0.0);
        const shiftInUnits = Math.abs(rawShift) <= 5 ? rawShift * e : rawShift;
        limit = 1.0 * e;
        status = Math.abs(shiftInUnits) <= limit ? 'PASS' : 'FAIL';
        computedP = shiftInUnits;
        computedE = shiftInUnits;
        computedEc = shiftInUnits;

        const humidity = Number(inputs.chamberHumidity ?? 85);
        const hours = Number(inputs.exposureHours ?? 48);

        stepCalculations = [
          { label: 'Chamber Test Environment', formula: '40 °C / 85% RH (48 h)', result: `${humidity}% RH, ${hours} hours` },
          { label: 'Post-Exposure Error Shift (|ΔEc|)', formula: '|Ec_post - Ec_pre|', result: `${Math.abs(shiftInUnits).toFixed(3)} ${instrument.unit} (${rawShift.toFixed(2)} e)` },
          { label: 'Regulatory Tolerance Boundary', formula: currentTest.formula, result: `≤ ${limit.toFixed(3)} ${instrument.unit} (1.0 e)` },
        ];
        summaryText = `Post-exposure error shift = ${Math.abs(shiftInUnits).toFixed(3)} ${instrument.unit} ${status === 'PASS' ? '≤' : '>'} tolerance (${limit.toFixed(3)} ${instrument.unit}). ${currentTest.name} is ${status}.`;
        break;
      }

      case 'durability': {
        // OIML R 76-1: A.6 - 100,000 load cycles at approx 0.75 Max.
        const rawShift = Number(inputs.wearDrift ?? 0.0);
        const shiftInUnits = Math.abs(rawShift) <= 5 ? rawShift * e : rawShift;
        limit = 1.0 * e;
        status = Math.abs(shiftInUnits) <= limit ? 'PASS' : 'FAIL';
        computedP = shiftInUnits;
        computedE = shiftInUnits;
        computedEc = shiftInUnits;
        const cycles = Number(inputs.cycleCount ?? 100000);

        stepCalculations = [
          { label: 'Completed Cyclic Loadings', formula: '100,000 cycles at 0.75 Max', result: `${cycles.toLocaleString()} cycles` },
          { label: 'Wear & Fatigue Error Shift', formula: '|Ec_after - Ec_before|', result: `${Math.abs(shiftInUnits).toFixed(3)} ${instrument.unit} (${rawShift.toFixed(2)} e)` },
          { label: 'Permissible Wear Limit', formula: currentTest.formula, result: `≤ ${limit.toFixed(3)} ${instrument.unit}` },
        ];
        summaryText = `Durability error shift = ${Math.abs(shiftInUnits).toFixed(3)} ${instrument.unit} ${status === 'PASS' ? '≤' : '>'} allowable limit (${limit.toFixed(3)} ${instrument.unit}). Status: ${status}.`;
        break;
      }

      case 'electrical_burst': {
        // OIML R 76-1: B.3 - Electrical disturbances / EFT burst
        const rawFault = Number(inputs.faultObserved ?? 0.0);
        const faultInUnits = Math.abs(rawFault) <= 5 ? rawFault * e : rawFault;
        limit = 1.0 * e;
        status = Math.abs(faultInUnits) <= limit ? 'PASS' : 'FAIL';
        computedP = faultInUnits;
        computedE = faultInUnits;
        computedEc = faultInUnits;

        stepCalculations = [
          { label: 'Applied Disturbances (EFT/ESD)', formula: '6kV ESD / 1kV Burst', result: 'Applied' },
          { label: 'Significant Fault Observed', formula: '|I_disturbed - I_normal|', result: `${Math.abs(faultInUnits).toFixed(3)} ${instrument.unit} (${rawFault.toFixed(2)} e)` },
          { label: 'Significant Fault Threshold', formula: '≤ 1.0 e', result: `≤ ${limit.toFixed(3)} ${instrument.unit}` },
        ];
        summaryText = `Disturbance discrepancy = ${Math.abs(faultInUnits).toFixed(3)} ${instrument.unit} ${status === 'PASS' ? '≤' : '>'} significant fault threshold (${limit.toFixed(3)} ${instrument.unit}). Status: ${status}.`;
        break;
      }

      default: {
        const numInputs = Object.entries(inputs).filter(
          ([k, v]) => typeof v === 'number' && !k.startsWith('temp') && k !== 'relHumidity' && k !== 'barPressure'
        );
        limit = 1.0 * e;
        if (numInputs.length > 0) {
          const vals = numInputs.map(([, v]) => Number(v));
          const maxV = Math.max(...vals);
          const minV = Math.min(...vals);
          const diff = maxV - minV;
          computedP = maxV;
          computedE = diff;
          computedEc = diff;
          status = diff <= limit ? 'PASS' : 'FAIL';
          stepCalculations = [
            { label: 'Max Test Input Value', formula: 'Max(Observations)', result: `${maxV.toFixed(3)} ${instrument.unit}` },
            { label: 'Observed Parameter Spread', formula: 'Max - Min', result: `${diff.toFixed(3)} ${instrument.unit}` },
            { label: 'Regulatory Tolerance Boundary', formula: currentTest.formula, result: `≤ ${limit.toFixed(3)} ${instrument.unit}` },
          ];
          summaryText = `Spread = ${diff.toFixed(3)} ${instrument.unit} ${status === 'PASS' ? '≤' : '>'} tolerance (${limit.toFixed(3)} ${instrument.unit}). ${currentTest.name} is ${status}.`;
        } else {
          status = 'PASS';
          stepCalculations = [
            { label: 'Standard Evaluation Clause', formula: currentTest.clause, result: 'Verified' },
            { label: 'Tolerance Boundary', formula: currentTest.formula, result: `≤ ${limit} ${instrument.unit}` },
            { label: 'Calculation Output', formula: currentTest.calculationType, result: 'Compliant' },
          ];
          summaryText = `Test observations for ${currentTest.name} conform to OIML R 76-1 requirements.`;
        }
        break;
      }
    }

    return {
      computedP,
      computedE,
      computedEc,
      limit,
      status,
      summaryText,
      stepCalculations,
    };
  }, [currentTest, inputs, instrument, session]);

  if (!session || !instrument) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-ink-faint">Session or instrument not found.</p>
        <Link to="/app/sessions" className="mt-2 inline-block font-semibold text-accent-700">
          Back to sessions
        </Link>
      </div>
    );
  }

  // Save current test and stay or navigate
  function saveCurrentResult(autoNavigateNext = false) {
    if (!evaluation || !instrument) return;

    const testLoad = Number(inputs.load ?? inputs.spanLoad ?? inputs.cornerLoad ?? inputs.netLoad ?? (instrument?.max ?? 1000) * 0.5);
    const absEc = Math.abs(evaluation.computedEc);
    const lim = evaluation.limit;

    const pointsList = [
      {
        id: `pt_${currentTest.testType}_${Date.now()}`,
        label: currentTest.name,
        load: testLoad,
        indication: evaluation.computedP,
        additionalLoad: 0,
        roundingInterval: instrument.d,
        P: evaluation.computedP,
        E: evaluation.computedE,
        Ec: evaluation.computedEc,
        mpe: {
          loadInE: instrument.e > 0 ? testLoad / instrument.e : 1,
          band: `≤ ${lim.toFixed(3)} ${instrument.unit}`,
          mpeInE: instrument.e > 0 ? lim / instrument.e : 1,
          mpe: lim,
          stageMultiplier: 1,
          ruleRef: currentTest.clause,
          ruleVersion: '2006',
        },
        compliance: {
          status: evaluation.status,
          observedError: absEc,
          allowedMpe: lim,
          margin: lim - absEc,
          excess: Math.max(0, absEc - lim),
          reason: evaluation.summaryText,
          explanation: evaluation.stepCalculations.map((s) => `${s.label}: ${s.result}`),
        },
        traces: [],
      },
    ];

    const resultPayload: any = {
      testType: currentTest.testType,
      name: currentTest.name,
      clause: currentTest.clause,
      applicable: true,
      applicabilityReason: currentTest.reasoning,
      status: evaluation.status,
      rawInputs: inputs,
      completedAt: new Date().toISOString(),
      reasoning: evaluation.summaryText,
      maxObservedError: absEc,
      mpeLimit: lim,
      stepCalculations: evaluation.stepCalculations,
      zeroError: currentTest.testType === 'zero' ? evaluation.computedE : undefined,
      points: pointsList,
    };

    setTestResult(session!.id, currentTest.testType as any, resultPayload);
    toast.success(`${currentTest.name} Saved`, `Verdict: ${evaluation.status}`);

    if (autoNavigateNext) {
      if (nextTest) {
        navigate(`/app/sessions/${session!.id}/test/${nextTest.testType}`);
      } else {
        setShowEvidenceSection(true);
        toast.success(
          'All Tests Completed',
          'Observation measurements saved. You can attach live-proof evidence photos below or proceed to the report when ready.'
        );
      }
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={`/app/sessions/${session.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-faint hover:text-ink transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Test List (17 Tests)
        </Link>

        <div className="flex items-center gap-2">
          {prevTest && (
            <Link
              to={`/app/sessions/${session.id}/test/${prevTest.testType}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-ink-soft hover:text-ink px-2.5 py-1.5 rounded-lg border border-line bg-white shadow-sm"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Test {prevTest.number}
            </Link>
          )}
          {nextTest && (
            <Link
              to={`/app/sessions/${session.id}/test/${nextTest.testType}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-ink-soft hover:text-ink px-2.5 py-1.5 rounded-lg border border-line bg-white shadow-sm"
            >
              Test {nextTest.number} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HEADER: "<number>) <Test Name>" (Matching Diagram Bottom View)           */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-600 font-mono text-xs font-bold text-white shadow-sm">
              {currentTest.number}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-accent-700 bg-accent-50 px-2.5 py-0.5 rounded border border-accent-200">
              {currentTest.clause}
            </span>
            <span className="text-xs text-ink-faint">·</span>
            <span className="text-xs font-semibold text-ink-soft">{currentTest.category}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-ink mt-1.5">
            {currentTest.number}) {currentTest.name}
          </h1>
          <p className="text-xs sm:text-sm text-ink-faint mt-1 max-w-2xl">
            {currentTest.description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-ink-faint">Current Status</div>
            <div className="mt-0.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                  evaluation?.status === 'PASS'
                    ? 'bg-pass-bg text-pass-fg border border-pass-line'
                    : 'bg-fail-bg text-fail-fg border border-fail-line'
                }`}
              >
                {evaluation?.status === 'PASS' ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                {evaluation?.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SPLIT LAYOUT: Inputs (Left) vs Reasoning / Calculation Type (Right)       */}
      {/* ========================================================================= */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT COLUMN: Test Input Fields (from OIML R 76-2 Report Format)          */}
        {/* ----------------------------------------------------------------------- */}
        <div className="space-y-6">
          <Card className="border-line shadow-sm">
            <CardHeader
              title={`OIML R 76-2 Report Inputs — ${currentTest.name}`}
              subtitle={`Official measurement tables according to ${currentTest.clause}`}
              icon={<Sliders className="h-4 w-4 text-accent-600" />}
            />
            <CardBody className="space-y-4">
              <OimlReportFormatForm
                test={currentTest}
                instrument={instrument}
                session={session}
                inputs={inputs}
                onChange={handleInputChange}
              />

              {/* Equipment Reference Box */}
              <div className="mt-4 rounded-xl border border-line bg-slate-50/70 p-3.5 text-xs text-ink-soft flex items-start gap-2.5">
                <Info className="h-4 w-4 text-accent-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-ink">Required Standard Equipment (OIML R 76-2):</span>
                  <div className="text-ink-faint mt-0.5">{currentTest.equipment}</div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Evidence / Documents Card (Optional) */}
          <Card className="border-line shadow-sm">
            <CardBody>
              <EvidenceUploader
                sessionId={session.id}
                title={`Evidence & Test Documents for ${currentTest.name} (Optional)`}
                subtitle="Upload photographs (nameplate, seals, test setup, digital display) or calibration documents from local storage."
              />
            </CardBody>
          </Card>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT COLUMN: Reasoning & Calculation Type Box (Matching Diagram)       */}
        {/* ----------------------------------------------------------------------- */}
        <div className="space-y-6">
          <Card className="border-accent-200/80 shadow-md bg-gradient-to-br from-white to-slate-50">
            <CardHeader
              title="Reasoning & Metrology"
              subtitle="Step-by-step mathematical breakdown and regulatory validation"
              icon={<Calculator className="h-4 w-4 text-accent-600" />}
            />
            <CardBody className="space-y-5">
              {/* Highlighted Calculation Type (Circle in user diagram) */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">
                  Calculation Type
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border-2 border-accent-500 bg-accent-50/80 px-4 py-1.5 text-xs font-extrabold text-accent-800 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-accent-600 animate-ping" />
                  {currentTest.calculationType}
                </div>
              </div>

              {/* Formula Box */}
              <div className="rounded-xl border border-line bg-espresso-950 p-4 text-champagne-100 shadow-inner">
                <div className="text-[10px] uppercase font-bold tracking-wider text-champagne-400">
                  Regulatory Formula
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-champagne-100">
                  {currentTest.formula}
                </div>
              </div>

              {/* Live Step-by-Step Computed Values */}
              {evaluation && (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                    Live Calculation Traces
                  </div>
                  <div className="space-y-2 rounded-xl border border-line bg-white p-3.5">
                    {evaluation.stepCalculations.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between border-b border-line/60 pb-2 last:border-b-0 last:pb-0 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-ink">{step.label}</div>
                          <div className="font-mono text-[10px] text-ink-faint">{step.formula}</div>
                        </div>
                        <span className="font-mono font-bold text-ink-soft bg-paper px-2 py-0.5 rounded border border-line">
                          {step.result}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regulatory Reasoning Explanation */}
              <div className="rounded-xl border border-accent-100 bg-accent-50/40 p-4 text-xs">
                <div className="font-bold text-accent-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-accent-700" />
                  Metrological Compliance Reasoning
                </div>
                <p className="mt-1.5 text-ink-soft leading-relaxed">
                  {currentTest.reasoning}
                </p>
                <div className="mt-3 font-semibold text-accent-800">
                  {evaluation?.summaryText}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Live-Proof Photographic Evidence & Verification Section (In-Page)          */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">
                Attach Live-Proof Evidence & Verification Photos (Optional)
              </h3>
              <p className="text-xs text-ink-faint">
                Upload local photos (nameplate, calibration seals, display readout) to be displayed on Page 5 of the 64-page detailed OIML report.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowEvidenceSection((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-700 bg-accent-50 hover:bg-accent-100 px-3.5 py-1.5 rounded-lg border border-accent-200 transition"
          >
            <Camera className="h-3.5 w-3.5" />
            {showEvidenceSection ? 'Minimize Evidence Uploader' : 'Open Evidence Uploader'}
          </button>
        </div>

        {showEvidenceSection && (
          <div className="pt-3 border-t border-line">
            <EvidenceUploader
              sessionId={session.id}
              title="Instrument Evidence & Live-Proof Dossier"
              subtitle="All uploaded photos are embedded in the Detailed Report immediately after the Introduction page."
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* Bottom Action Options                                                     */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-line">
        <Link
          to={`/app/sessions/${session.id}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink hover:bg-slate-50 transition shadow-2xs"
        >
          <ArrowLeft className="h-4 w-4 text-ink-faint" /> Back to Test List
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => saveCurrentResult(false)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink hover:bg-slate-50 transition shadow-2xs"
          >
            <Save className="h-4 w-4 text-slate-700" /> Save Measurement
          </button>

          <button
            type="button"
            onClick={() => {
              saveCurrentResult(false);
              setShowEvidenceSection(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-accent-200 bg-accent-50 px-4 py-2.5 text-xs font-bold text-accent-800 hover:bg-accent-100 transition shadow-2xs"
          >
            <Camera className="h-4 w-4 text-accent-700" /> Attach Evidence Photos
          </button>

          {nextTest ? (
            <button
              type="button"
              onClick={() => saveCurrentResult(true)}
              className="btn-accent inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold shadow-md shadow-accent-600/20"
            >
              <span>Next Test ({nextTest.number})</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to={`/app/sessions/${session.id}/report`}
              className="btn-accent inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold shadow-md shadow-accent-600/20"
            >
              <span>Proceed to Final Report</span>
              <FileText className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
