import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, Save, Info, Wand2 } from 'lucide-react';
import { useAppStore, genId } from '../store/useAppStore';
import { PageHeader } from '../components/ui/misc';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Field, TextInput, NumberInput, Select } from '../components/ui/form';
import { getRuleset, DEFAULT_RULESET_ID } from '../regulatory/registry';
import { validateInstrument, hasBlockingErrors } from '../regulatory/validation';
import { MASS_UNITS } from '../domain/units';
import type { AccuracyClass, Instrument, IntervalConfig, TareType } from '../domain/types';
import { verificationIntervals } from '../domain/types';
import { classLabel } from '../lib/format';

type Form = {
  manufacturer: string; model: string; serial: string; instrumentType: string;
  accuracyClass: AccuracyClass; unit: string; max: string; min: string; e: string; d: string;
  intervalConfig: IntervalConfig; tareType: TareType;
  displayType: string; softwareVersion: string; softwareHash: string; loadCellInfo: string;
  indicatorInfo: string; power: string; modelApprovalNo: string; notes: string;
  zeroSetting: boolean; zeroTracking: boolean; printingDevice: boolean;
};

const BLANK: Form = {
  manufacturer: '', model: '', serial: '', instrumentType: 'Electronic platform NAWI',
  accuracyClass: 'III', unit: 'kg', max: '', min: '', e: '', d: '',
  intervalConfig: 'single', tareType: 'additive', displayType: '', softwareVersion: '', softwareHash: '',
  loadCellInfo: '', indicatorInfo: '', power: '', modelApprovalNo: '', notes: '',
  zeroSetting: true, zeroTracking: true, printingDevice: false,
};

export default function InstrumentRegister() {
  const upsert = useAppStore((s) => s.upsertInstrument);
  const navigate = useNavigate();
  const [f, setF] = useState<Form>(BLANK);
  const set = (patch: Partial<Form>) => setF({ ...f, ...patch });

  const partial = {
    accuracyClass: f.accuracyClass, unit: f.unit as any, max: Number(f.max), min: Number(f.min),
    e: Number(f.e), d: Number(f.d), intervalConfig: f.intervalConfig, ranges: undefined,
  };
  const issues = useMemo(() => validateInstrument(partial, getRuleset(DEFAULT_RULESET_ID)), [f]);
  const n = f.e && f.max ? verificationIntervals({ max: Number(f.max), e: Number(f.e) }) : 0;
  const complete = f.manufacturer && f.model && f.serial && f.max && f.e && f.d;

  function save() {
    const inst: Instrument = {
      id: genId('inst'),
      manufacturer: f.manufacturer, model: f.model, serial: f.serial, instrumentType: f.instrumentType,
      accuracyClass: f.accuracyClass, unit: f.unit as any,
      max: Number(f.max), min: Number(f.min), e: Number(f.e), d: Number(f.d),
      intervalConfig: f.intervalConfig, tareType: f.tareType, tareMax: Number(f.max),
      zeroSetting: f.zeroSetting, zeroTracking: f.zeroTracking, printingDevice: f.printingDevice,
      displayType: f.displayType || undefined, softwareVersion: f.softwareVersion || undefined,
      softwareHash: f.softwareHash || undefined, loadCellInfo: f.loadCellInfo || undefined,
      indicatorInfo: f.indicatorInfo || undefined, power: f.power || undefined,
      modelApprovalNo: f.modelApprovalNo || undefined, notes: f.notes || undefined,
      createdAt: new Date().toISOString(),
    };
    upsert(inst);
    navigate(`/app/instruments/${inst.id}`);
  }

  return (
    <div>
      <PageHeader
        icon={<Gauge className="h-5 w-5" />}
        title="Register Instrument"
        subtitle="Capture the metrological configuration. Relationships are validated live."
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Identification" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Manufacturer" required><TextInput value={f.manufacturer} onChange={(e) => set({ manufacturer: e.target.value })} /></Field>
              <Field label="Model" required><TextInput value={f.model} onChange={(e) => set({ model: e.target.value })} /></Field>
              <Field label="Serial number" required><TextInput value={f.serial} onChange={(e) => set({ serial: e.target.value })} /></Field>
              <Field label="Instrument type"><TextInput value={f.instrumentType} onChange={(e) => set({ instrumentType: e.target.value })} /></Field>
              <Field label="Model approval no."><TextInput value={f.modelApprovalNo} onChange={(e) => set({ modelApprovalNo: e.target.value })} /></Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Metrological characteristics" />
            <CardBody className="grid gap-4 sm:grid-cols-3">
              <Field label="Accuracy class" required>
                <Select value={f.accuracyClass} onChange={(e) => set({ accuracyClass: e.target.value as AccuracyClass })}>
                  {(['I', 'II', 'III', 'IIII'] as AccuracyClass[]).map((c) => <option key={c} value={c}>{classLabel(c)}</option>)}
                </Select>
              </Field>
              <Field label="Unit" required>
                <Select value={f.unit} onChange={(e) => set({ unit: e.target.value })}>{MASS_UNITS.map((u) => <option key={u}>{u}</option>)}</Select>
              </Field>
              <Field label="Interval config">
                <Select value={f.intervalConfig} onChange={(e) => set({ intervalConfig: e.target.value as IntervalConfig })}>
                  <option value="single">Single interval</option>
                  <option value="multi_interval">Multi-interval</option>
                  <option value="multiple_range">Multiple range</option>
                </Select>
              </Field>
              <Field label={`Max (${f.unit})`} required><NumberInput value={f.max} onChange={(e) => set({ max: e.target.value })} /></Field>
              <Field label={`Min (${f.unit})`} required><NumberInput value={f.min} onChange={(e) => set({ min: e.target.value })} /></Field>
              <div />
              <Field label={`e — verification interval (${f.unit})`} required><NumberInput value={f.e} onChange={(e) => set({ e: e.target.value })} /></Field>
              <Field label={`d — actual interval (${f.unit})`} required><NumberInput value={f.d} onChange={(e) => set({ d: e.target.value })} /></Field>
              <Field label="Tare type">
                <Select value={f.tareType} onChange={(e) => set({ tareType: e.target.value as TareType })}>
                  <option value="none">None</option><option value="additive">Additive</option><option value="subtractive">Subtractive</option>
                </Select>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Construction & software" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Display type"><TextInput value={f.displayType} onChange={(e) => set({ displayType: e.target.value })} /></Field>
              <Field label="Software version"><TextInput value={f.softwareVersion} onChange={(e) => set({ softwareVersion: e.target.value })} /></Field>
              <Field label="Software checksum / hash"><TextInput value={f.softwareHash} onChange={(e) => set({ softwareHash: e.target.value })} /></Field>
              <Field label="Load cell (R60)"><TextInput value={f.loadCellInfo} onChange={(e) => set({ loadCellInfo: e.target.value })} /></Field>
              <Field label="Indicator"><TextInput value={f.indicatorInfo} onChange={(e) => set({ indicatorInfo: e.target.value })} /></Field>
              <Field label="Power"><TextInput value={f.power} onChange={(e) => set({ power: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.zeroSetting} onChange={(e) => set({ zeroSetting: e.target.checked })} /> Zero-setting device</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.zeroTracking} onChange={(e) => set({ zeroTracking: e.target.checked })} /> Zero-tracking</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.printingDevice} onChange={(e) => set({ printingDevice: e.target.checked })} /> Printing device</label>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="lg:sticky lg:top-20">
            <CardHeader title="Live validation" subtitle="Against OIML R 76" />
            <CardBody className="space-y-3">
              <div className="rounded-lg bg-paper p-3 text-center">
                <div className="text-[11px] uppercase tracking-wide text-ink-faint">n = Max / e</div>
                <div className="tabular text-2xl font-bold text-ink">{n ? n.toLocaleString() : '—'}</div>
              </div>
              {issues.length === 0 ? (
                <p className="rounded-lg bg-pass-bg px-3 py-2 text-sm text-pass-fg">Configuration looks consistent.</p>
              ) : (
                issues.map((iss, i) => (
                  <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${iss.severity === 'error' ? 'bg-fail-bg text-fail-fg' : 'bg-warn-bg text-warn-fg'}`}>
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{iss.message}</span>
                  </div>
                ))
              )}
              <button className="btn-accent w-full" disabled={!complete || hasBlockingErrors(issues)} onClick={save}>
                <Save className="h-4 w-4" /> Register instrument
              </button>
              {!complete && <p className="text-center text-xs text-ink-faint">Fill the required fields marked *.</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
