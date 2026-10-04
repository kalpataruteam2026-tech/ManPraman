/**
 * Units — explicit mass units with a canonical internal representation (grams).
 *
 * Metrology requires explicit units and no silent mixing (DESIGN_SPEC PART 52).
 * Raw observation precision is preserved; display rounding is a separate concern
 * (DESIGN_SPEC PART 51).
 */

export type MassUnit = 'mg' | 'g' | 'kg' | 't';

/** Grams per one unit. Canonical internal unit is the gram. */
const GRAMS_PER: Record<MassUnit, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  t: 1_000_000,
};

export const MASS_UNITS: MassUnit[] = ['mg', 'g', 'kg', 't'];

export function toCanonical(value: number, unit: MassUnit): number {
  return value * GRAMS_PER[unit];
}

export function fromCanonical(grams: number, unit: MassUnit): number {
  return grams / GRAMS_PER[unit];
}

/** Convert a value from one mass unit to another, explicitly. */
export function convertMass(value: number, from: MassUnit, to: MassUnit): number {
  return fromCanonical(toCanonical(value, from), to);
}

/**
 * Count the number of decimal places implied by a step/interval value.
 * e = 0.1  -> 1 ;  e = 0.001 -> 3 ; e = 5 -> 0
 */
export function decimalsOfStep(step: number): number {
  if (!isFinite(step) || step <= 0) return 0;
  const s = step.toExponential();
  const [mantissa, expPart] = s.split('e');
  const exp = parseInt(expPart, 10);
  const mantissaDecimals = (mantissa.split('.')[1] || '').replace(/0+$/, '').length;
  return Math.max(0, mantissaDecimals - exp);
}

export function formatMass(value: number, unit: MassUnit, decimals?: number): string {
  const d = decimals ?? 3;
  return `${round(value, d)} ${unit}`;
}

/**
 * Precision-safe rounding. Counteracts binary floating-point artefacts
 * (e.g. 0.1 + 0.2) using a tiny relative epsilon before rounding.
 */
export function round(value: number, decimals: number): number {
  if (!isFinite(value)) return value;
  const factor = Math.pow(10, decimals);
  // Nudge by a sign-aware epsilon proportional to magnitude to avoid 1.005 -> 1.00
  const eps = Math.sign(value) * Number.EPSILON * Math.abs(value) * 100;
  return Math.round((value + eps) * factor) / factor;
}

/** Format a signed number with an explicit + / − sign (professional tables). */
export function signed(value: number, decimals: number): string {
  const r = round(value, decimals);
  if (r === 0) return (0).toFixed(decimals);
  const sign = r > 0 ? '+' : '−';
  return `${sign}${Math.abs(r).toFixed(decimals)}`;
}
