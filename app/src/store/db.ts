/**
 * Offline persistence (DESIGN_SPEC PART 15, 28).
 * IndexedDB via Dexie — mirrors the relational entities so the app works fully
 * offline. Production would sync these to a PostgreSQL-backed API.
 */
import Dexie, { type Table } from 'dexie';
import type {
  AuditEvent,
  Evidence,
  Instrument,
  Report,
  TestSession,
  User,
} from '../domain/types';

export class MetroDB extends Dexie {
  users!: Table<User, string>;
  instruments!: Table<Instrument, string>;
  sessions!: Table<TestSession, string>;
  reports!: Table<Report, string>;
  evidence!: Table<Evidence, string>;
  audit!: Table<AuditEvent, string>;
  meta!: Table<{ key: string; value: string }, string>;

  constructor() {
    super('metrocert');
    this.version(1).stores({
      users: 'id, role',
      instruments: 'id, serial',
      sessions: 'id, instrumentId, status, updatedAt',
      reports: 'id, sessionId, verificationId, code',
      evidence: 'id, sessionId',
      audit: 'id, sessionId, ts',
      meta: 'key',
    });
  }
}

export const db = new MetroDB();
