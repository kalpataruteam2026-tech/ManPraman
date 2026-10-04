/** Regulatory registry — the single source for available rulesets. */
import type { Ruleset } from './types';
import { oimlR76_2006 } from './rulesets/oimlR76_2006';
import { indiaLM_2011 } from './rulesets/indiaLM_2011';

export const RULESETS: Ruleset[] = [oimlR76_2006, indiaLM_2011];

export const DEFAULT_RULESET_ID = oimlR76_2006.id;

export function getRuleset(id?: string): Ruleset {
  if (!id) return RULESETS[0];
  const exact = RULESETS.find((r) => r.id === id);
  if (exact) return exact;

  // Normalized search (handling 'oiml-r76-2006', 'oiml-r76', etc.)
  const cleanId = id.toLowerCase().replace(/[^a-z0-9]/g, '');
  const fuzzy = RULESETS.find((r) => {
    const cleanR = r.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanR.includes(cleanId) || cleanId.includes(cleanR) || cleanR.startsWith('oimlr76');
  });
  if (fuzzy) return fuzzy;

  console.warn(`[getRuleset] Unknown ruleset id "${id}", falling back to default ruleset "${RULESETS[0].id}"`);
  return RULESETS[0];
}

export function rulesetLabel(rs: Ruleset): string {
  return `${rs.standard} · ${rs.edition}`;
}
