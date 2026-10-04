/**
 * Dynamic MPE engine (DESIGN_SPEC PART 17).
 *
 * MPE is NEVER a single value for the whole instrument — it is re-selected per
 * load point because the tier changes with load (m = L/e) and accuracy class.
 * The verification stage applies a multiplier (in-service = 2× initial).
 */
import type { AccuracyClass, MpeSelection, VerificationStage } from '../domain/types';
import { round } from '../domain/units';
import type { Ruleset } from '../regulatory/types';

export interface MpeQuery {
  ruleset: Ruleset;
  accuracyClass: AccuracyClass;
  load: number; // applied load L (instrument unit)
  e: number; // verification scale interval (instrument unit)
  stage: VerificationStage;
  precision: number;
}

function bandLabel(index: number, lower: number | null, upper: number | null): string {
  if (index === 0) return upper === null ? 'all loads' : `0 ≤ m ≤ ${format(upper)}`;
  if (upper === null) return `m > ${format(lower!)}`;
  return `${format(lower!)} < m ≤ ${format(upper)}`;
}

function format(n: number): string {
  return n.toLocaleString('en-US');
}

export function selectMpe(q: MpeQuery): MpeSelection {
  const { ruleset, accuracyClass, load, e, stage, precision } = q;
  if (e <= 0) throw new Error('e must be > 0 to select an MPE');

  const loadInE = Math.abs(load) / e;
  const tiers = ruleset.mpeByClass[accuracyClass];

  let chosenIndex = tiers.length - 1;
  let lower: number | null = null;
  for (let i = 0; i < tiers.length; i++) {
    const upper = tiers[i].maxInE;
    if (upper === null || loadInE <= upper) {
      chosenIndex = i;
      lower = i === 0 ? null : tiers[i - 1].maxInE;
      break;
    }
  }

  const tier = tiers[chosenIndex];
  const stageMultiplier = ruleset.stageMultiplier[stage];
  const effectiveMpeInE = tier.mpeInE * stageMultiplier;
  const mpe = round(effectiveMpeInE * e, precision);

  return {
    loadInE: round(loadInE, 2),
    band: bandLabel(chosenIndex, lower, tier.maxInE),
    mpeInE: effectiveMpeInE,
    mpe,
    stageMultiplier,
    ruleRef: `${ruleset.standard} ${ruleset.edition} — MPE, accuracy class ${accuracyClass}`,
    ruleVersion: ruleset.rulesetVersion,
  };
}
