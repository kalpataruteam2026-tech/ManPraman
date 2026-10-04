import { OIML_17_TESTS, OimlTestDef } from '../domain/oiml17Tests';
import type { Instrument } from '../domain/types';

export interface TestApplicabilityResult {
  test: OimlTestDef;
  isApplicable: boolean;
  reason: string;
  clause: string;
}

export interface InstrumentTestPlan {
  instrumentId: string;
  totalTests: number;
  applicableCount: number;
  excludedCount: number;
  suggestedTests: OimlTestDef[];
  suggestedTestTypes: string[];
  excludedTests: TestApplicabilityResult[];
  allTestsWithStatus: TestApplicabilityResult[];
}

/**
 * Converts instrument capacity to kilograms for OIML R 76 statutory threshold checks.
 */
export function getCapacityInKg(max: number, unit: string): number {
  const u = (unit || 'g').toLowerCase().trim();
  if (u === 'kg' || u === 'kilogram' || u === 'kilograms') return max;
  if (u === 'g' || u === 'gram' || u === 'grams') return max / 1000;
  if (u === 'mg' || u === 'milligram' || u === 'milligrams') return max / 1000000;
  if (u === 't' || u === 'ton' || u === 'tonne' || u === 'tonnes') return max * 1000;
  if (u === 'lb' || u === 'lbs' || u === 'pound') return max * 0.45359237;
  if (u === 'oz' || u === 'ounce') return max * 0.0283495;
  return max;
}

/**
 * Normalizes accuracy class to standard Roman numeral I, II, III, IIII.
 */
export function normalizeAccuracyClass(rawClass: string): 'I' | 'II' | 'III' | 'IIII' {
  const c = (rawClass || 'III').toUpperCase().replace('CLASS_', '').trim();
  if (c === 'I') return 'I';
  if (c === 'II') return 'II';
  if (c === 'IIII' || c === 'IV') return 'IIII';
  return 'III';
}

/**
 * Evaluates whether each of the 17 OIML R 76 tests is applicable for a given instrument.
 * Grounded strictly in OIML R 76-1:2006 (Annex A & B) and statutory ML rules.
 */
export function evaluateTestApplicability(instrument?: Instrument | null): InstrumentTestPlan {
  if (!instrument) {
    const defaultAll = OIML_17_TESTS.map((t) => ({
      test: t,
      isApplicable: true,
      reason: 'Standard metrological test',
      clause: t.clause,
    }));
    return {
      instrumentId: '',
      totalTests: 17,
      applicableCount: 17,
      excludedCount: 0,
      suggestedTests: [...OIML_17_TESTS],
      suggestedTestTypes: OIML_17_TESTS.map((t) => t.testType),
      excludedTests: [],
      allTestsWithStatus: defaultAll,
    };
  }

  const cls = normalizeAccuracyClass(instrument.accuracyClass);
  const maxKg = getCapacityInKg(instrument.max, instrument.unit);
  const typeLower = (instrument.instrumentType || '').toLowerCase();
  const isElectronic = !typeLower.includes('mechanical') && !typeLower.includes('beam scale');
  const hasTare = instrument.tareType !== 'none';
  const isMovable = !typeLower.includes('weighbridge') && !typeLower.includes('silo') && maxKg <= 1500;
  const isClass1 = cls === 'I';
  const hasSoftware = isElectronic && (!!instrument.softwareVersion || !!instrument.firmware || !!instrument.softwareId || true);
  const isLoadCell = !typeLower.includes('emfr') && !typeLower.includes('magnetic');

  const evaluated: TestApplicabilityResult[] = OIML_17_TESTS.map((t) => {
    let isApplicable = true;
    let reason = 'Mandatory baseline statutory verification test.';
    const clause = t.clause;

    switch (t.testType) {
      case 'zero':
        isApplicable = isElectronic || instrument.zeroSetting;
        reason = isApplicable
          ? 'Mandatory zero-setting & zero-tracking evaluation (Clause A.4.1, A.4.2).'
          : 'Zero tracking not applicable to pure mechanical non-zeroing instruments.';
        break;

      case 'weighing':
        isApplicable = true;
        reason = 'Mandatory span linearity & hysteresis test across full range (Clause A.4.4).';
        break;

      case 'repeatability':
        isApplicable = true;
        reason = 'Mandatory repeatability consistency test at 0.5 Max and 1.0 Max (Clause A.4.10).';
        break;

      case 'eccentricity':
        isApplicable = true;
        reason = 'Mandatory off-centre loading test at 1/3 Max across receptor positions (Clause A.4.7).';
        break;

      case 'tare':
        isApplicable = hasTare;
        reason = hasTare
          ? `Applicable: Instrument features ${instrument.tareType} tare facility (Clause A.4.6).`
          : 'Excluded: Instrument has no tare device specified (tareType = none).';
        break;

      case 'discrimination':
        isApplicable = true;
        reason = 'Mandatory sensitivity to extra load 1.4d in equilibrium (Clause A.4.3).';
        break;

      case 'sensitivity':
        // Clause 6.1: Sensitivity is evaluated for Class I micro-balances or non-self-indicating instruments
        isApplicable = isClass1 || !isElectronic || typeLower.includes('micro') || typeLower.includes('analytical');
        reason = isApplicable
          ? 'Applicable: Class I / analytical micro-balances require indication stability & sensitivity assessment (Clause 6.1).'
          : 'Excluded: Digital commercial self-indicating scales (Class II/III/IIII) without analog pointer are exempt from separate Clause 6.1 sensitivity drift test.';
        break;

      case 'tilt':
        // Clause A.5.1: Tilting applies only to instruments of classes II, III, and IIII that are movable/mobile. Strictly excluded for Class I.
        isApplicable = !isClass1 && isMovable;
        reason = isApplicable
          ? 'Applicable: Movable Class II/III/IIII instrument subject to 50:1000 limiting tilt (Clause A.5.1).'
          : isClass1
          ? 'Excluded: OIML R 76-1 Clause A.5.1 strictly exempts Class I analytical instruments (assumed permanently leveled).'
          : 'Excluded: Heavy permanently fixed instrument (weighbridge / platform > 1500 kg) exempt from tilting test.';
        break;

      case 'temp_zero':
        isApplicable = isElectronic;
        reason = isApplicable
          ? 'Applicable: Ambient thermal drift on zero indication evaluated (-10°C to +40°C) (Clause A.5.3.1).'
          : 'Excluded: Purely mechanical instruments without electronic zeroing.';
        break;

      case 'temp_span':
        isApplicable = isElectronic;
        reason = isApplicable
          ? 'Applicable: Ambient thermal drift on weighing span evaluated at 20°C, -10°C, and 40°C (Clause A.5.3.2).'
          : 'Excluded: Purely mechanical instruments without electronics.';
        break;

      case 'damp_heat':
        isApplicable = isElectronic;
        reason = isApplicable
          ? 'Applicable: Climatic damp heat steady state test (40°C, 85% RH for 48 hours) (Clause A.5.4).'
          : 'Excluded: Non-electronic mechanical systems.';
        break;

      case 'creep':
        // Clause A.4.11: Applies to strain gauge load cell instruments (Classes II, III, IIII)
        isApplicable = isElectronic && isLoadCell && !isClass1;
        reason = isApplicable
          ? 'Applicable: Viscoelastic deformation & creep test for strain-gauge load cells under 4-hour full load (Clause A.4.11).'
          : isClass1
          ? 'Excluded: Class I electro-magnetic force restoration (EMFR) systems do not exhibit strain-gauge creep.'
          : 'Excluded: Mechanical beam scales.';
        break;

      case 'durability':
        // Clause A.6 p. 97: "Applicable only to instruments of classes II, III and IIII with Max <= 100 kg"
        isApplicable = !isClass1 && maxKg <= 100;
        reason = isApplicable
          ? `Applicable: 100,000 cyclic endurance test applies to Class ${cls} with Max ≤ 100 kg (Clause A.6).`
          : isClass1
          ? 'Excluded: OIML R 76-1 Clause A.6 strictly exempts Class I precision balances from 100k endurance cycling.'
          : `Excluded: OIML R 76-1 Clause A.6 specifies endurance cycling is only applicable up to 100 kg (instrument Max is ${maxKg.toFixed(1)} kg).`;
        break;

      case 'voltage':
        isApplicable = isElectronic;
        reason = isApplicable
          ? 'Applicable: Power supply variations (+10% / -15% AC / low battery cutoff) (Clause B.3.1).'
          : 'Excluded: Non-powered mechanical instrument.';
        break;

      case 'electrical_burst':
        isApplicable = isElectronic;
        reason = isApplicable
          ? 'Applicable: EMC immunity against electrical bursts (EFT) and electrostatic discharge (ESD) (Clause B.3).'
          : 'Excluded: Non-electronic mechanical instrument.';
        break;

      case 'construction':
        isApplicable = true;
        reason = 'Mandatory gating inspection: Physical markings, verification seals, and level bubble (Clause 3, 4, 7).';
        break;

      case 'software':
        isApplicable = isElectronic && hasSoftware;
        reason = isApplicable
          ? 'Applicable: Firmware checksum, legally relevant software separation, and audit event counter (§17).'
          : 'Excluded: Instrument has no programmable firmware or digital interface.';
        break;

      default:
        isApplicable = true;
        reason = 'Standard statutory metrological test procedure.';
    }

    return {
      test: t,
      isApplicable,
      reason,
      clause,
    };
  });

  const suggested = evaluated.filter((e) => e.isApplicable).map((e) => e.test);
  const excluded = evaluated.filter((e) => !e.isApplicable);

  return {
    instrumentId: instrument.id,
    totalTests: OIML_17_TESTS.length,
    applicableCount: suggested.length,
    excludedCount: excluded.length,
    suggestedTests: suggested,
    suggestedTestTypes: suggested.map((t) => t.testType),
    excludedTests: excluded,
    allTestsWithStatus: evaluated,
  };
}

/**
 * Attempts to fetch AI/ML suggested tests from backend API with fallback to local rule engine.
 */
export async function fetchSuggestedOimlTests(
  instrument: Instrument
): Promise<InstrumentTestPlan> {
  const localPlan = evaluateTestApplicability(instrument);

  try {
    const res = await fetch('/api/v1/ml/suggest-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accuracy_class: instrument.accuracyClass,
        max: instrument.max,
        unit: instrument.unit,
        is_electronic: true,
        has_software: true,
        has_tare: instrument.tareType !== 'none',
        is_movable: true,
      }),
    });

    if (!res.ok) {
      return localPlan;
    }

    const data = await res.json();
    if (Array.isArray(data.applicable_tests)) {
      const backendApplicableKeys = new Set(
        data.applicable_tests.map((t: any) => t.test_type)
      );

      const suggested = OIML_17_TESTS.filter((t) =>
        backendApplicableKeys.has(t.testType)
      );
      const excluded = localPlan.allTestsWithStatus.filter(
        (st) => !backendApplicableKeys.has(st.test.testType)
      );

      return {
        ...localPlan,
        applicableCount: suggested.length,
        excludedCount: excluded.length,
        suggestedTests: suggested,
        suggestedTestTypes: suggested.map((t) => t.testType),
        excludedTests: excluded,
      };
    }
  } catch (err) {
    // Graceful fallback to localPlan
  }

  return localPlan;
}
