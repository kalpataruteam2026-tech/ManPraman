/**
 * Instrument configuration validation against the selected ruleset.
 * Messages are educational and specific (DESIGN_SPEC PART 39) — never
 * a bare "Invalid input".
 */
import type { AccuracyClass, Instrument } from '../domain/types';
import { verificationIntervals } from '../domain/types';
import { toCanonical } from '../domain/units';
import type { ClassParamBand, Ruleset } from './types';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  field: string;
  severity: IssueSeverity;
  message: string;
}

const RATIOS = [1, 2, 5, 10];

function classBandFor(
  ruleset: Ruleset,
  cls: AccuracyClass,
  eGrams: number,
): ClassParamBand | undefined {
  return ruleset.classParams[cls].find(
    (b) => eGrams >= b.eMinG - 1e-9 && (b.eMaxG === null || eGrams <= b.eMaxG + 1e-9),
  );
}

export function validateInstrument(
  inst: Pick<
    Instrument,
    'accuracyClass' | 'unit' | 'max' | 'min' | 'e' | 'd' | 'intervalConfig' | 'ranges'
  >,
  ruleset: Ruleset,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { e, d, max, min, accuracyClass, unit } = inst;

  if (!(e > 0)) {
    issues.push({
      field: 'e',
      severity: 'error',
      message:
        'The verification scale interval e must be greater than zero. It defines the legal resolution used for every tolerance calculation.',
    });
  }
  if (!(d > 0)) {
    issues.push({
      field: 'd',
      severity: 'error',
      message: 'The actual scale interval d (display resolution) must be greater than zero.',
    });
  }
  if (e > 0 && d > 0) {
    if (d > e + 1e-12) {
      issues.push({
        field: 'd',
        severity: 'error',
        message: `The actual scale interval d (${d} ${unit}) cannot be larger than the verification scale interval e (${e} ${unit}).`,
      });
    } else {
      const ratio = e / d;
      const nearest = RATIOS.find((r) => Math.abs(ratio - r) < 1e-6);
      if (!nearest) {
        issues.push({
          field: 'd',
          severity: 'warning',
          message: `e/d = ${ratio.toFixed(3)} is unusual. Typically e/d is 1, 2, 5 or 10. [VERIFY against R 76-1]`,
        });
      }
    }
  }

  if (!(max > 0)) {
    issues.push({ field: 'max', severity: 'error', message: 'Max (weighing capacity) must be greater than zero.' });
  }
  if (min < 0) {
    issues.push({ field: 'min', severity: 'error', message: 'Min cannot be negative.' });
  }
  if (max > 0 && min >= max) {
    issues.push({
      field: 'min',
      severity: 'error',
      message: `Min (${min} ${unit}) must be less than Max (${max} ${unit}).`,
    });
  }

  if (e > 0 && max > 0) {
    const n = verificationIntervals({ max, e });
    const eGrams = toCanonical(e, unit);
    const band = classBandFor(ruleset, accuracyClass, eGrams);

    if (!band) {
      issues.push({
        field: 'e',
        severity: 'warning',
        message: `e = ${e} ${unit} is outside the typical range for accuracy class ${accuracyClass}. Verify the class/e combination. [VERIFY]`,
      });
    } else {
      if (n < band.nMin) {
        issues.push({
          field: 'max',
          severity: 'warning',
          message: `n = Max/e = ${n.toLocaleString()} is below the minimum ${band.nMin.toLocaleString()} for class ${accuracyClass}. The instrument may not qualify for this class.`,
        });
      }
      if (band.nMax !== null && n > band.nMax) {
        issues.push({
          field: 'max',
          severity: 'warning',
          message: `n = Max/e = ${n.toLocaleString()} exceeds the maximum ${band.nMax.toLocaleString()} for class ${accuracyClass}.`,
        });
      }
      const minInE = min / e;
      if (minInE + 1e-9 < band.minInE) {
        issues.push({
          field: 'min',
          severity: 'warning',
          message: `Min = ${minInE.toFixed(0)} e is below the class ${accuracyClass} minimum of ${band.minInE} e (i.e. ${band.minInE * e} ${unit}).`,
        });
      }
    }
  }

  if (inst.intervalConfig !== 'single' && (!inst.ranges || inst.ranges.length < 2)) {
    issues.push({
      field: 'ranges',
      severity: 'warning',
      message: 'Multi-interval / multiple-range configuration should define at least two partial ranges.',
    });
  }

  return issues;
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}
