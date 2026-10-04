/**
 * Application store (zustand) with write-through to IndexedDB (Dexie).
 * In-memory arrays are the synchronous source of truth for the UI; every
 * mutation is persisted so the app is fully usable offline.
 */
import { create } from 'zustand';
import type {
  AuditEvent,
  ComplianceStatus,
  Evidence,
  Instrument,
  Report,
  Role,
  TestResult,
  TestSession,
  TestType,
  User,
} from '../domain/types';
import { db } from './db';
import { computeOverallVerdict } from '../engine/testRunners';
import { buildReport } from '../report/reportModel';
import { seedDemoData } from './seed';

let seq = 0;
export const genId = (p: string) =>
  `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const nowIso = () => new Date().toISOString();

interface AppState {
  hydrated: boolean;
  online: boolean;
  currentUser: User | null;
  users: User[];
  instruments: Instrument[];
  sessions: TestSession[];
  reports: Report[];
  evidence: Evidence[];
  audit: AuditEvent[];

  hydrate: () => Promise<void>;
  setOnline: (v: boolean) => void;
  login: (userId: string, rememberDays?: number) => void;
  logout: () => void;
  can: (action: Capability) => boolean;

  addUser: (u: User) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  deleteUser: (id: string) => void;

  upsertInstrument: (inst: Instrument) => void;
  registerInstrument: (inst: Partial<Instrument> & Omit<Instrument, 'id' | 'createdAt'>) => Instrument;
  deleteInstrument: (id: string) => void;
  deleteInstruments: (ids: string[]) => void;
  createSession: (partial: Partial<TestSession>) => TestSession;
  updateSession: (id: string, patch: Partial<TestSession>) => void;
  setTestResult: (sessionId: string, testType: TestType, result: TestResult) => void;
  deleteSession: (id: string) => void;

  addEvidence: (ev: Partial<Evidence> & Omit<Evidence, 'id' | 'createdAt'> | Evidence) => void;
  updateEvidence: (id: string, patch: Partial<Evidence>) => void;
  reorderEvidence: (sessionId: string, orderedIds: string[]) => void;
  removeEvidence: (id: string) => void;

  submitForReview: (sessionId: string) => void;
  approveSession: (sessionId: string, notes?: string) => void;
  rejectSession: (sessionId: string, notes?: string) => void;
  returnSession: (sessionId: string, reason: string) => void;
  finalizeReport: (sessionId: string, type: 'field' | 'lab') => Promise<Report>;
  revokeReport: (reportId: string) => void;

  logAudit: (e: Omit<AuditEvent, 'id' | 'ts' | 'userId' | 'userName'>) => void;
  bootstrapAdmin: (name: string, email: string) => Promise<User>;
  resetDatabase: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

// ------------------------------- RBAC ------------------------------------
export type Capability =
  | 'session.create'
  | 'session.edit'
  | 'session.submit'
  | 'session.review'
  | 'report.generate'
  | 'report.revoke'
  | 'instrument.edit'
  | 'admin';

const CAPS: Record<Role, Capability[]> = {
  admin: [
    'session.create', 'session.edit', 'session.submit', 'session.review',
    'report.generate', 'report.revoke', 'instrument.edit', 'admin',
  ],
  tester: ['session.create', 'session.edit', 'session.submit', 'instrument.edit', 'report.generate'],
  reviewer: ['session.review', 'report.generate', 'report.revoke', 'session.edit'],
};

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  currentUser: null,
  users: [],
  instruments: [],
  sessions: [],
  reports: [],
  evidence: [],
  audit: [],

  hydrate: async () => {
    if (get().hydrated) return;
    let users = await db.users.toArray();

    // Always force the core demo users to exist with correct credentials
    const demoUsers: User[] = [
      { id: 'u_demo_admin', name: 'Admin User', role: 'admin', email: 'admin@metrocert.gov.in', password: 'password123', active: true },
      { id: 'u_demo_tech', name: 'Tester User', role: 'tester', email: 'tech@metrocert.gov.in', password: 'password123', active: true },
      { id: 'u_demo_reviewer', name: 'Reviewer User', role: 'reviewer', email: 'reviewer@metrocert.gov.in', password: 'password123', active: true },
    ];
    
    // Check if we actually need to bulkPut demo users or migrate
    let needsUpdate = false;
    for (const du of demoUsers) {
      const existing = users.find(u => u.id === du.id);
      if (!existing || existing.password !== du.password || existing.role !== du.role) {
        needsUpdate = true;
        break;
      }
    }

    users = users.map((u) => {
      let newU = { ...u };
      if (['engineer', 'technician', 'inspector', 'auditor', 'readonly', 'operator'].includes(newU.role as string)) {
        newU.role = 'tester' as Role;
        needsUpdate = true;
      }
      if (!newU.password) {
        newU.password = 'password123';
        needsUpdate = true;
      }
      return newU;
    });

    if (needsUpdate) {
      // Merge demo users into the array in-memory
      for (const du of demoUsers) {
        const idx = users.findIndex(u => u.id === du.id);
        if (idx >= 0) users[idx] = du;
        else users.push(du);
      }
      await db.users.bulkPut(users);
    }

    let [instruments, sessions, reports, evidence, audit] = await Promise.all([
      db.instruments.toArray(),
      db.sessions.toArray(),
      db.reports.toArray(),
      db.evidence.toArray(),
      db.audit.orderBy('ts').reverse().limit(500).toArray(),
    ]);

    // Ensure baseline demo sessions & instruments exist so Under Review, Certified Reports, and Instrument profiles are populated
    const hasUnderReview = sessions.some((s) => s.status === 'awaiting_review' || s.status === 'ready_for_review' || s.status === 'under_review');
    if (sessions.length === 0 || instruments.length === 0 || !hasUnderReview) {
      try {
        const demo = await seedDemoData();
        if (instruments.length === 0) {
          instruments = demo.instruments;
          await db.instruments.bulkPut(instruments);
        } else {
          for (const dInst of demo.instruments) {
            if (!instruments.some((i) => i.id === dInst.id)) {
              instruments.push(dInst);
              await db.instruments.put(dInst);
            }
          }
        }

        if (sessions.length === 0) {
          sessions = demo.sessions;
          await db.sessions.bulkPut(sessions);
        } else if (!hasUnderReview) {
          const failSess = demo.sessions.find((s) => s.id === 'sess_demo_fail');
          if (failSess && !sessions.some((s) => s.id === failSess.id)) {
            sessions.unshift(failSess);
            await db.sessions.put(failSess);
          }
        }

        if (reports.length === 0) {
          reports = demo.reports;
          await db.reports.bulkPut(reports);
        }
      } catch (err) {
        console.error('Error auto-seeding demo data:', err);
      }
    }

    // Restore active user session across page refreshes
    let restoredUser: User | null = null;
    if (typeof window !== 'undefined') {
      const isExplicitlyLoggedOut = localStorage.getItem('metrocert_user_logged_out') === 'true';
      const savedUserId = localStorage.getItem('metrocert_current_user_id');

      if (!isExplicitlyLoggedOut) {
        if (savedUserId) {
          restoredUser = users.find((u) => u.id === savedUserId) || null;
        }
        if (!restoredUser && get().currentUser) {
          restoredUser = users.find((u) => u.id === get().currentUser?.id) || get().currentUser;
        }
        // Fallback: If not logged out, keep logged in with default demo admin
        if (!restoredUser) {
          restoredUser = users.find((u) => u.id === 'u_demo_admin') || users[0] || null;
        }
        if (restoredUser) {
          localStorage.setItem('metrocert_current_user_id', restoredUser.id);
        }
      }
    }

    // Ensure initial reports exist so Certified Reports and Public Verification are populated
    const has2284CC = reports.some((r) => r.code === 'LR-2026-2284CC' || r.verificationId === '2284CC');
    if (!has2284CC && sessions.length > 0) {
      const apxSession = sessions.find((s) => s.code === 'LM-2026-1429') || sessions[0];
      if (apxSession) {
        const inst = instruments.find((i) => i.id === apxSession.instrumentId) || instruments[0];
        const adminUser = users.find((u) => u.role === 'admin' || u.role === 'reviewer') || users[0];
        if (inst && adminUser) {
          try {
            const r = await buildReport(apxSession, inst, apxSession.mode || 'lab', adminUser);
            r.code = 'LR-2026-2284CC';
            r.verificationId = '2284CC';
            reports.unshift(r);
            await db.reports.put(r);
          } catch (e) {
            console.error('Error auto-seeding demo report:', e);
          }
        }
      }
    }

    if (reports.length === 0 && sessions.length > 0) {
      const adminUser = users.find((u) => u.role === 'admin' || u.role === 'reviewer') || users[0];
      for (const s of sessions.slice(0, 2)) {
        const inst = instruments.find((i) => i.id === s.instrumentId);
        if (inst && adminUser) {
          try {
            const r = await buildReport(s, inst, s.mode || 'field', adminUser);
            reports.push(r);
            await db.reports.put(r);
          } catch {}
        }
      }
    }

    set({ hydrated: true, currentUser: restoredUser ?? get().currentUser, users, instruments, sessions, reports, evidence, audit });
  },

  setOnline: (v) => set({ online: v }),

  login: (userId, rememberDays = 30) => {
    const user = get().users.find((u) => u.id === userId) || null;
    set({ currentUser: user });
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('metrocert_current_user_id', user.id);
        localStorage.removeItem('metrocert_user_logged_out');
        if (rememberDays && rememberDays > 0) {
          const expiryTime = Date.now() + rememberDays * 24 * 60 * 60 * 1000;
          localStorage.setItem('metrocert_remember_until', expiryTime.toString());
          localStorage.setItem('metrocert_remember_days', rememberDays.toString());
        } else {
          localStorage.removeItem('metrocert_remember_until');
          localStorage.removeItem('metrocert_remember_days');
        }
      } else {
        localStorage.removeItem('metrocert_current_user_id');
        localStorage.removeItem('metrocert_remember_until');
      }
    }
    if (user) get().logAudit({ action: 'Signed in', detail: `${user.name} (${user.role})` });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('metrocert_current_user_id');
      localStorage.removeItem('metrocert_remember_until');
      localStorage.removeItem('metrocert_remember_days');
      localStorage.setItem('metrocert_user_logged_out', 'true');
    }
    get().logAudit({ action: 'Signed out' });
    set({ currentUser: null });
  },

  can: (action) => {
    const u = get().currentUser;
    if (!u) return false;
    return CAPS[u.role].includes(action);
  },

  addUser: (u) => {
    set((s) => ({ users: [...s.users, u] }));
    db.users.put(u).catch(console.error);
    get().logAudit({ action: 'Created user', detail: `${u.name} (${u.role})` });
  },

  updateUser: (id, patch) => {
    let updated: User | undefined;
    set((s) => ({
      users: s.users.map((u) => {
        if (u.id !== id) return u;
        updated = { ...u, ...patch };
        return updated;
      }),
      currentUser: s.currentUser?.id === id && updated ? updated : s.currentUser,
    }));
    if (updated) db.users.put(updated).catch(console.error);
    get().logAudit({ action: 'Updated user', detail: id });
  },

  deleteUser: (id) => {
    set((s) => ({
      users: s.users.filter((u) => u.id !== id),
      currentUser: s.currentUser?.id === id ? null : s.currentUser,
    }));
    db.users.delete(id).catch(console.error);
    get().logAudit({ action: 'Deleted user', detail: id });
  },

  upsertInstrument: (inst) => {
    set((s) => {
      const exists = s.instruments.some((i) => i.id === inst.id);
      return {
        instruments: exists
          ? s.instruments.map((i) => (i.id === inst.id ? inst : i))
          : [inst, ...s.instruments],
      };
    });
    db.instruments.put(inst).catch(console.error);
    get().logAudit({ action: 'Registered / updated instrument', detail: `${inst.manufacturer} ${inst.model} (SN ${inst.serial})` });
  },

  registerInstrument: (inst) => {
    const id = genId('inst');
    const newInst: Instrument = {
      ...inst,
      id,
      createdAt: nowIso(),
    } as Instrument;
    set((s) => ({ instruments: [newInst, ...s.instruments] }));
    db.instruments.put(newInst).catch(console.error);
    get().logAudit({
      action: 'Registered instrument from template',
      detail: `${newInst.manufacturer} ${newInst.model} (${newInst.serial})`,
    });
    return newInst;
  },

  deleteInstrument: (id) => {
    const inst = get().instruments.find((i) => i.id === id);
    set((s) => ({
      instruments: s.instruments.filter((i) => i.id !== id),
    }));
    db.instruments.delete(id).catch(console.error);
    if (inst) {
      get().logAudit({
        action: 'Deleted instrument',
        detail: `${inst.manufacturer} ${inst.model} (SN ${inst.serial})`,
      });
    }
  },

  deleteInstruments: (ids) => {
    const setIds = new Set(ids);
    const count = ids.length;
    set((s) => ({
      instruments: s.instruments.filter((i) => !setIds.has(i.id)),
    }));
    db.instruments.bulkDelete(ids).catch(console.error);
    get().logAudit({
      action: 'Batch deleted instruments',
      detail: `Deleted ${count} instrument(s)`,
    });
  },

  createSession: (partial) => {
    const u = get().currentUser;
    const session: TestSession = {
      id: genId('sess'),
      code: partial.code ?? `LM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`,
      instrumentId: partial.instrumentId ?? '',
      mode: partial.mode ?? 'field',
      evaluationType: partial.evaluationType ?? 'initial_verification',
      stage: partial.stage ?? 'initial',
      rulesetId: partial.rulesetId ?? 'oiml-r76-1:2006',
      indiaOverlayId: partial.indiaOverlayId,
      technicianId: u?.id ?? 'u_tech',
      technicianName: u?.name ?? 'Tester',
      applicant: partial.applicant,
      testLocation: partial.testLocation,
      jurisdiction: partial.jurisdiction ?? u?.jurisdiction,
      laboratory: partial.laboratory,
      accreditationNo: partial.accreditationNo,
      environment: partial.environment ?? {},
      referenceStandards: partial.referenceStandards ?? [],
      results: {},
      overallVerdict: 'PENDING',
      status: 'draft',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    set((s) => ({ sessions: [session, ...s.sessions] }));
    db.sessions.put(session).catch(console.error);
    get().logAudit({ sessionId: session.id, action: 'Created test session', detail: session.code });
    return session;
  },

  updateSession: (id, patch) => {
    let updated: TestSession | undefined;
    set((s) => ({
      sessions: s.sessions.map((se) => {
        if (se.id !== id) return se;
        updated = { ...se, ...patch, updatedAt: nowIso() };
        return updated;
      }),
    }));
    if (updated) db.sessions.put(updated).catch(console.error);
  },

  setTestResult: (sessionId, testType, result) => {
    let updated: TestSession | undefined;
    set((s) => ({
      sessions: s.sessions.map((se) => {
        if (se.id !== sessionId) return se;
        const results = { ...se.results, [testType]: result };
        const overallVerdict = computeOverallVerdict(Object.values(results));
        updated = {
          ...se,
          results,
          overallVerdict,
          status: se.status === 'draft' ? 'in_progress' : se.status,
          updatedAt: nowIso(),
        };
        return updated;
      }),
    }));
    if (updated) db.sessions.put(updated).catch(console.error);
    get().logAudit({
      sessionId,
      action: `Recorded ${result.name}`,
      detail: `Result: ${result.status}`,
    });
  },

  deleteSession: (id) => {
    set((s) => ({ sessions: s.sessions.filter((se) => se.id !== id) }));
    db.sessions.delete(id).catch(console.error);
    get().logAudit({ sessionId: id, action: 'Deleted test session' });
  },

  addEvidence: (ev) => {
    const item: Evidence = {
      id: (ev as any).id ?? genId('ev'),
      createdAt: (ev as any).createdAt ?? nowIso(),
      ...ev,
    } as Evidence;
    set((s) => ({
      evidence: [item, ...s.evidence.filter((e) => e.id !== item.id)],
    }));
    db.evidence.put(item).catch(console.error);
    get().logAudit({ sessionId: ev.sessionId, action: 'Attached evidence', detail: ev.caption });
  },

  updateEvidence: (id, patch) => {
    let updated: Evidence | undefined;
    set((s) => ({
      evidence: s.evidence.map((e) => {
        if (e.id !== id) return e;
        updated = { ...e, ...patch };
        return updated;
      }),
    }));
    if (updated) db.evidence.put(updated).catch(console.error);
  },

  reorderEvidence: (sessionId, orderedIds) => {
    const idOrderMap = new Map<string, number>();
    orderedIds.forEach((id, idx) => idOrderMap.set(id, idx));

    set((s) => {
      const updated = s.evidence.map((e) => {
        if (e.sessionId === sessionId && idOrderMap.has(e.id)) {
          return { ...e, orderIndex: idOrderMap.get(e.id)! };
        }
        return e;
      });
      return { evidence: updated };
    });

    const state = get();
    const sessionEvidences = state.evidence.filter((e) => e.sessionId === sessionId);
    db.evidence.bulkPut(sessionEvidences).catch(console.error);
  },

  removeEvidence: (id) => {
    set((s) => ({ evidence: s.evidence.filter((e) => e.id !== id) }));
    db.evidence.delete(id).catch(console.error);
  },

  submitForReview: (sessionId) => {
    get().updateSession(sessionId, { status: 'ready_for_review' });
    get().logAudit({ sessionId, action: 'Submitted for review' });
  },

  approveSession: (sessionId, notes) => {
    const u = get().currentUser;
    const historyEntry = {
      id: genId('rev'),
      reviewerId: u?.id ?? 'reviewer',
      reviewerName: u?.name ?? 'Reviewer',
      action: 'approved' as const,
      comment: notes,
      timestamp: nowIso(),
    };
    let updated: TestSession | undefined;
    set((s) => ({
      sessions: s.sessions.map((se) => {
        if (se.id !== sessionId) return se;
        const reviewHistory = [historyEntry, ...(se.reviewHistory ?? [])];
        updated = {
          ...se,
          status: 'approved',
          reviewNotes: notes,
          reviewHistory,
          updatedAt: nowIso(),
        };
        return updated;
      }),
    }));
    if (updated) db.sessions.put(updated).catch(console.error);
    get().logAudit({ sessionId, action: 'Approved session', detail: notes });
  },

  rejectSession: (sessionId, notes) => {
    const u = get().currentUser;
    const historyEntry = {
      id: genId('rev'),
      reviewerId: u?.id ?? 'reviewer',
      reviewerName: u?.name ?? 'Reviewer',
      action: 'rejected' as const,
      comment: notes,
      timestamp: nowIso(),
    };
    let updated: TestSession | undefined;
    set((s) => ({
      sessions: s.sessions.map((se) => {
        if (se.id !== sessionId) return se;
        const reviewHistory = [historyEntry, ...(se.reviewHistory ?? [])];
        updated = {
          ...se,
          status: 'rejected',
          reviewNotes: notes,
          reviewHistory,
          updatedAt: nowIso(),
        };
        return updated;
      }),
    }));
    if (updated) db.sessions.put(updated).catch(console.error);
    get().logAudit({ sessionId, action: 'Rejected session', detail: notes });
  },

  returnSession: (sessionId, reason) => {
    const u = get().currentUser;
    const historyEntry = {
      id: genId('rev'),
      reviewerId: u?.id ?? 'reviewer',
      reviewerName: u?.name ?? 'Reviewer',
      action: 'returned_for_correction' as const,
      comment: reason,
      timestamp: nowIso(),
    };
    let updated: TestSession | undefined;
    set((s) => ({
      sessions: s.sessions.map((se) => {
        if (se.id !== sessionId) return se;
        const reviewHistory = [historyEntry, ...(se.reviewHistory ?? [])];
        updated = {
          ...se,
          status: 'returned_for_correction',
          reviewNotes: reason,
          reviewHistory,
          updatedAt: nowIso(),
        };
        return updated;
      }),
    }));
    if (updated) db.sessions.put(updated).catch(console.error);
    get().logAudit({ sessionId, action: 'Returned session for correction', detail: reason });
  },

  finalizeReport: async (sessionId, type) => {
    const state = get();
    const session = state.sessions.find((s) => s.id === sessionId)!;
    const instrument = state.instruments.find((i) => i.id === session.instrumentId)!;
    const user = state.currentUser ?? state.users[0];
    const existing = state.reports.filter((r) => r.sessionId === sessionId);
    const version = existing.length + 1;
    
    // Collect all evidence attached to session or global evidence store
    const storeEvidence = state.evidence.filter((e) => e.sessionId === sessionId);
    const sessionObjEvidence = session.evidence || [];
    const evidenceMap = new Map<string, any>();
    for (const ev of [...storeEvidence, ...sessionObjEvidence]) {
      if (ev && (ev.id || ev.fileName || ev.dataUrl)) {
        evidenceMap.set(ev.id || `${ev.fileName}_${ev.createdAt}`, ev);
      }
    }
    const combinedEvidence = Array.from(evidenceMap.values());
    
    const report = await buildReport(session, instrument, type, user, version, combinedEvidence);
    set((s) => ({ reports: [report, ...s.reports] }));
    await db.reports.put(report);
    get().updateSession(sessionId, { status: 'reported' });
    get().logAudit({
      sessionId,
      reportId: report.id,
      action: 'Generated report',
      detail: `${report.code} · ${type} · v${version}`,
    });
    return report;
  },

  revokeReport: (reportId) => {
    let updated: Report | undefined;
    set((s) => ({
      reports: s.reports.map((r) => {
        if (r.id !== reportId) return r;
        updated = { ...r, status: 'revoked' };
        return updated;
      }),
    }));
    if (updated) db.reports.put(updated).catch(console.error);
    get().logAudit({ reportId, action: 'Revoked report' });
  },

  logAudit: (e) => {
    const u = get().currentUser;
    const event: AuditEvent = {
      id: genId('aud'),
      ts: nowIso(),
      userId: u?.id ?? 'system',
      userName: u?.name ?? 'System',
      ...e,
    };
    set((s) => ({ audit: [event, ...s.audit].slice(0, 800) }));
    db.audit.put(event).catch(console.error);
  },

  bootstrapAdmin: async (name: string, email: string) => {
    const adminUser: User = {
      id: genId('u_admin'),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'admin',
      designation: 'System Administrator',
      active: true,
    };
    await db.users.put(adminUser);
    set((s) => ({ users: [adminUser, ...s.users], currentUser: adminUser }));
    get().logAudit({ action: 'Initialized System Administrator', detail: `${adminUser.name} (${adminUser.email})` });
    return adminUser;
  },

  resetDatabase: async () => {
    await db.transaction('rw', [db.users, db.instruments, db.sessions, db.reports, db.evidence, db.audit], async () => {
      await db.users.clear();
      await db.instruments.clear();
      await db.sessions.clear();
      await db.reports.clear();
      await db.evidence.clear();
      await db.audit.clear();
    });
    set({
      currentUser: null,
      users: [],
      instruments: [],
      sessions: [],
      reports: [],
      evidence: [],
      audit: [],
    });
    get().logAudit({ action: 'Reset database to clean empty state' });
  },

  resetDemo: async () => {
    await get().resetDatabase();
  },
}));

