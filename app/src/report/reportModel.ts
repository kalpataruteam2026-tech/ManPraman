/**
 * Report builder (DESIGN_SPEC PART 22-25, 47).
 *
 * Produces an immutable snapshot + integrity hash so a report is reproducible
 * years later under the exact ruleset/engine/template versions it was made with.
 */
import { APP_VERSION, ENGINE_VERSION, REPORT_TEMPLATE_VERSION } from '../domain/constants';
import type { Evidence, Instrument, Report, TestSession, User } from '../domain/types';
import { getRuleset } from '../regulatory/registry';
import { canonicalize, sha256Hex } from '../integrity/hash';

function randomId(bytes = 6): string {
  const arr = new Uint8Array(bytes);
  (globalThis.crypto ?? { getRandomValues: (a: Uint8Array) => a.map(() => Math.floor(Math.random() * 256)) }).getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Recompute the integrity hash from a stored report to verify it wasn't altered. */
export async function recomputeReportHash(report: Report): Promise<string> {
  const payload = {
    code: report.code,
    type: report.type,
    version: report.version,
    verificationId: report.verificationId,
    snapshot: report.snapshot,
    rulesetVersion: report.rulesetVersion,
    engineVersion: report.engineVersion,
    templateVersion: report.templateVersion,
    appVersion: report.appVersion,
  };
  return sha256Hex(canonicalize(payload));
}

export async function buildReport(
  session: TestSession,
  instrument: Instrument,
  type: 'field' | 'lab',
  createdBy: User,
  version = 1,
  evidence: Evidence[] = [],
): Promise<Report> {
  const ruleset = getRuleset(session.rulesetId);
  const sessionCopy = structuredClone(session);
  if (evidence && evidence.length > 0) {
    sessionCopy.evidence = structuredClone(evidence);
  }

  const snapshot = {
    session: sessionCopy,
    instrument: structuredClone(instrument),
    evidence: structuredClone(evidence),
    generatedAt: new Date().toISOString(),
    standard: ruleset.standard,
    standardEdition: ruleset.edition,
    jurisdiction: ruleset.jurisdiction,
  };

  const verificationId = randomId(6).toUpperCase();
  const year = new Date().getFullYear();
  const code = `${type === 'field' ? 'FR' : 'LR'}-${year}-${verificationId.slice(0, 6)}`;

  const payload = {
    code,
    type,
    version,
    verificationId,
    snapshot,
    rulesetVersion: `${ruleset.id}@${ruleset.rulesetVersion}`,
    engineVersion: ENGINE_VERSION,
    templateVersion: REPORT_TEMPLATE_VERSION,
    appVersion: APP_VERSION,
  };
  const integrityHash = await sha256Hex(canonicalize(payload));

  return {
    id: `report_${verificationId}`,
    code,
    sessionId: session.id,
    type,
    version,
    status: 'valid',
    verificationId,
    integrityHash,
    rulesetVersion: `${ruleset.id}@${ruleset.rulesetVersion}`,
    engineVersion: ENGINE_VERSION,
    templateVersion: REPORT_TEMPLATE_VERSION,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    createdBy: createdBy.name,
    overallVerdict: session.overallVerdict,
    snapshot,
  };
}
