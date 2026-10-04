/**
 * Dynamic test-plan engine (DESIGN_SPEC PART 7, 19).
 *
 * Given the instrument configuration + evaluation mode + ruleset, decides which
 * tests apply and WHY (or why not). No test is assumed to apply to every
 * instrument.
 */
import type { EvaluationMode, Instrument, TestType } from '../domain/types';
import type { Ruleset } from './types';

export interface PlannedTest {
  testType: TestType;
  name: string;
  applicable: boolean;
  mandatory: boolean;
  reason: string;
}

export function generateTestPlan(
  instrument: Pick<Instrument, 'tareType' | 'accuracyClass'>,
  mode: EvaluationMode,
  ruleset: Ruleset,
): PlannedTest[] {
  return ruleset.tests.map((spec) => {
    let applicable = spec.appliesToModes.includes(mode);
    let reason = '';

    switch (spec.testType) {
      case 'tare':
        if (instrument.tareType === 'none') {
          applicable = false;
          reason = 'Not applicable — the instrument has no tare device.';
        } else {
          reason = applicable
            ? `Applicable — the instrument has a ${instrument.tareType} tare device.`
            : `Not evaluated in ${mode} mode.`;
        }
        break;
      case 'temperature':
        reason = applicable
          ? 'Applicable — temperature influence is evaluated during laboratory pattern evaluation.'
          : 'Not applicable in field verification — influence-factor tests are performed only in the laboratory (Mode B).';
        break;
      case 'discrimination':
        reason = applicable
          ? 'Applicable — discrimination is primarily a type-evaluation test.'
          : 'Not applicable in field verification — discrimination is a laboratory / type-evaluation test.';
        break;
      default:
        reason = applicable
          ? `Applicable — ${spec.note}`
          : `Not evaluated in ${mode} mode.`;
    }

    return {
      testType: spec.testType,
      name: spec.name,
      applicable,
      mandatory: spec.mandatory && applicable,
      reason,
    };
  });
}

/** Precision (decimal places) derived from e for storing/comparing results. */
export function precisionFor(e: number): number {
  // errors are fractions of e; keep 2 extra decimals beyond e's own resolution
  const s = e.toExponential();
  const [mantissa, expPart] = s.split('e');
  const exp = parseInt(expPart, 10);
  const md = (mantissa.split('.')[1] || '').replace(/0+$/, '').length;
  const eDecimals = Math.max(0, md - exp);
  return Math.min(6, eDecimals + 2);
}
