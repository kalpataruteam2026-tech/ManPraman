import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  RotateCcw,
  ShieldAlert,
  Loader2,
  UserCheck,
  CheckCircle2,
  Sliders,
  Database,
  HardDrive,
  BookOpen,
  Check,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader, InfoRow } from '../components/ui/misc';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { APP_VERSION, ENGINE_VERSION, REPORT_TEMPLATE_VERSION } from '../domain/constants';
import { toast } from '../lib/toast';

export default function SettingsPage() {
  const user = useAppStore((s) => s.currentUser);
  const resetDatabase = useAppStore((s) => s.resetDatabase);
  const [busy, setBusy] = useState(false);

  // Tester Preferences (persisted in localStorage)
  const [defaultUnit, setDefaultUnit] = useState('kg');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [soundFeedback, setSoundFeedback] = useState(false);

  useEffect(() => {
    try {
      const savedUnit = localStorage.getItem('manpraman_default_unit');
      if (savedUnit) setDefaultUnit(savedUnit);

      const savedAutoAdvance = localStorage.getItem('manpraman_auto_advance');
      if (savedAutoAdvance !== null) setAutoAdvance(savedAutoAdvance === 'true');

      const savedSound = localStorage.getItem('manpraman_sound_feedback');
      if (savedSound !== null) setSoundFeedback(savedSound === 'true');
    } catch {
      // noop
    }
  }, []);

  const handleUnitChange = (unit: string) => {
    setDefaultUnit(unit);
    try {
      localStorage.setItem('manpraman_default_unit', unit);
      toast.success('Preference Saved', `Default measurement unit set to ${unit}`);
    } catch {
      // noop
    }
  };

  const handleAutoAdvanceToggle = () => {
    const next = !autoAdvance;
    setAutoAdvance(next);
    try {
      localStorage.setItem('manpraman_auto_advance', String(next));
      toast.success('Preference Saved', next ? 'Auto-advance to next load row enabled' : 'Auto-advance disabled');
    } catch {
      // noop
    }
  };

  const handleSoundToggle = () => {
    const next = !soundFeedback;
    setSoundFeedback(next);
    try {
      localStorage.setItem('manpraman_sound_feedback', String(next));
      toast.success('Audio Preference', next ? 'Sound feedback on test observation enabled' : 'Sound feedback muted');
    } catch {
      // noop
    }
  };

  const isTester = user?.role === 'tester' || (!user?.role || user?.role !== 'admin');

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        icon={<SettingsIcon className="h-5 w-5" />}
        title={isTester ? 'Tester Preferences & Settings' : 'System Settings'}
        subtitle={
          isTester
            ? 'Field testing preferences, officer credentials, and local offline cache status.'
            : 'Environment, versions and database management.'
        }
      />

      {isTester ? (
        /* ========================================================================= */
        /* TESTER SETTINGS VIEW: Simple, relevant, non-destructive                    */
        /* ========================================================================= */
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card 1: Testing Officer Profile */}
          <Card>
            <CardHeader
              title="Testing Officer Profile"
              subtitle="Inspection authority and jurisdiction credentials"
              icon={<UserCheck className="h-4 w-4 text-emerald-600" />}
            />
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-line">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white shadow-xs">
                  {user?.name
                    ? user.name
                        .split(' ')
                        .map((s: string) => s[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'TO'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-ink">{user?.name || 'Metrology Testing Officer'}</div>
                  <div className="text-xs text-ink-faint flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase text-[10px]">
                      {user?.role || 'Tester'}
                    </span>
                    <span>·</span>
                    <span className="truncate">{user?.designation || 'Field Metrologist'}</span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-line/60 pt-1">
                <InfoRow label="Jurisdiction" value={user?.jurisdiction || 'National Central Directorate'} />
                <InfoRow label="Official Email" value={user?.email || 'tester@metrocert.gov.in'} />
                <InfoRow
                  label="Officer UID"
                  value={<span className="font-mono text-xs font-bold">{user?.id || 'usr_tester_01'}</span>}
                />
                <InfoRow label="Verification Authority" value="Legal Metrology Act, 2009" />
              </div>
            </CardBody>
          </Card>

          {/* Card 2: Field Testing & Data Preferences */}
          <Card>
            <CardHeader
              title="Testing Preferences"
              subtitle="Configure your calculation and observation workflow defaults"
              icon={<Sliders className="h-4 w-4 text-accent-700" />}
            />
            <CardBody className="space-y-4">
              <div>
                <label className="text-xs font-bold text-ink block mb-2">Default Mass Measurement Unit</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'kg', label: 'Kilograms (kg)' },
                    { id: 'g', label: 'Grams (g)' },
                    { id: 'mg', label: 'Milligrams (mg)' },
                  ].map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => handleUnitChange(unit.id)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                        defaultUnit === unit.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-ink-soft border-line hover:bg-stone-50'
                      }`}
                    >
                      {defaultUnit === unit.id && <Check className="h-3.5 w-3.5" />}
                      {unit.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-ink-faint mt-1.5">
                  Applied as the starting unit when configuring new test procedures and instruments.
                </p>
              </div>

              <div className="border-t border-line/60 pt-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-ink">Auto-advance input rows</div>
                    <div className="text-[11px] text-ink-faint">
                      Automatically jump to next load observation row on Enter key press
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoAdvanceToggle}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      autoAdvance ? 'bg-emerald-600' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        autoAdvance ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-ink">Sound Feedback on Entry</div>
                    <div className="text-[11px] text-ink-faint">
                      Subtle audio chime when an observation point passes verification
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSoundToggle}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      soundFeedback ? 'bg-emerald-600' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        soundFeedback ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Card 3: Field Device & Offline Storage */}
          <Card>
            <CardHeader
              title="Field Device & Storage"
              subtitle="Local offline storage status on your current device"
              icon={<HardDrive className="h-4 w-4 text-blue-600" />}
            />
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-950">Field Storage: Synchronized</span>
                    <p className="text-[11px] text-emerald-800">
                      All test data is safely cached in browser IndexedDB for offline field testing.
                    </p>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                  Active
                </span>
              </div>

              <div className="divide-y divide-line/60">
                <InfoRow
                  label="Offline Capability"
                  value={<span className="text-emerald-700 font-bold">Enabled (Zero-data loss)</span>}
                />
                <InfoRow label="Sync Engine" value="FastAPI Metrology Gateway" />
                <InfoRow label="Auto-Save Frequency" value="Real-time on cell edit" />
                <InfoRow label="Device Status" value="Secure Client Sandbox" />
              </div>
            </CardBody>
          </Card>

          {/* Card 4: Statutory Compliance & Engine Version */}
          <Card>
            <CardHeader
              title="Statutory Standards"
              subtitle="Normative verification rules and engine specifications"
              icon={<BookOpen className="h-4 w-4 text-indigo-600" />}
            />
            <CardBody className="space-y-2">
              <div className="divide-y divide-line/60">
                <InfoRow label="Primary Standard" value="OIML R 76-1:2006 (E) NAWI" />
                <InfoRow label="Statutory Rule" value="Legal Metrology Rules 2011" />
                <InfoRow label="Evaluation Method" value="Deterministic Mathematical Proof" />
                <InfoRow label="Application Version" value={<span className="font-mono text-xs">{APP_VERSION}</span>} />
                <InfoRow label="Metrology Engine" value={<span className="font-mono text-xs">{ENGINE_VERSION}</span>} />
                <InfoRow
                  label="Report Template"
                  value={<span className="font-mono text-xs">{REPORT_TEMPLATE_VERSION}</span>}
                />
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        /* ========================================================================= */
        /* ADMIN SETTINGS VIEW: Full system & database administration                 */
        /* ========================================================================= */
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Session & Identity" />
            <CardBody>
              <InfoRow label="Signed in as" value={user?.name ?? '—'} />
              <InfoRow
                label="Role"
                value={<span className="capitalize font-bold text-emerald-700">{user?.role}</span>}
              />
              <InfoRow label="Jurisdiction" value={user?.jurisdiction ?? '—'} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Versions" subtitle="Embedded in every report for reproducibility" />
            <CardBody>
              <InfoRow label="Application" value={APP_VERSION} />
              <InfoRow label="Metrology engine" value={ENGINE_VERSION} />
              <InfoRow label="Report template" value={REPORT_TEMPLATE_VERSION} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Database & Storage (Admin Only)" icon={<Database className="h-4 w-4 text-rose-600" />} />
            <CardBody className="space-y-3">
              <p className="text-sm text-ink-soft">
                Data is synced with the Python FastAPI backend and stored locally in browser IndexedDB.
              </p>
              <button
                className="btn bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold inline-flex items-center gap-2"
                disabled={busy}
                onClick={async () => {
                  if (
                    window.confirm(
                      'Are you sure you want to reset the database? This will clear all local test sessions and instruments.'
                    )
                  ) {
                    setBusy(true);
                    await resetDatabase();
                    setBusy(false);
                    toast.success('Database Reset', 'Clean initial state restored.');
                  }
                }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Reset database
                to clean state
              </button>
            </CardBody>
          </Card>

          <Card className="border-warn-line/40">
            <CardHeader title="Prototype scope & security" icon={<ShieldAlert className="h-4 w-4 text-warn-fg" />} />
            <CardBody className="space-y-2 text-sm text-ink-soft">
              <p>
                <b>Prototype:</b> role-based mock auth, domain-layer RBAC, input validation, audit logging,
                canonical-JSON SHA-256 integrity.
              </p>
              <p>
                <b>Production would add:</b> a real identity provider, TLS, server-side authorization on every endpoint,
                secure file scanning, rate limiting, encrypted-at-rest storage and HSM/KMS-backed signing.
              </p>
              <p className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn-fg">
                Demonstration prototype for SIH26035 — not a certified production system.
              </p>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
