import { Boxes, FunctionSquare } from 'lucide-react';
import { PageHeader, VerifyBadge } from '../components/ui/misc';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { getRuleset, DEFAULT_RULESET_ID } from '../regulatory/registry';

const FORMULAS = [
  { id: 'P', label: 'Indication prior to rounding', expr: 'P = I + i/2 − ΔL', note: 'i = scale interval of the reading (d; equals e in verification). Resolves the e-vs-d ambiguity by naming the basis explicitly.', verify: true },
  { id: 'E', label: 'Error of indication', expr: 'E = P − L', note: 'L is the applied reference load.' },
  { id: 'Ec', label: 'Corrected error', expr: 'Ec = E − E0', note: 'E0 is the error captured by the zero test.' },
  { id: 'PASS', label: 'Acceptance', expr: '−MPE ≤ Ec ≤ +MPE', note: 'Evaluated per test point; MPE is re-selected per load band.' },
];

const ARCH = ['Definition', 'Applicability', 'Input schema', 'Validation', 'Calculation', 'Acceptance', 'Result', 'Evidence', 'Report mapping'];

export default function TestLibrary() {
  const rs = getRuleset(DEFAULT_RULESET_ID);
  return (
    <div>
      <PageHeader
        icon={<Boxes className="h-5 w-5" />}
        title="Test Library"
        subtitle="Config-driven test architecture — new tests are added as data, not new pages."
      />

      <Card className="mb-6">
        <CardHeader title="Test architecture" subtitle="Every test follows the same pipeline" />
        <CardBody>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {ARCH.map((a, i) => (
              <span key={a} className="flex items-center gap-2">
                <span className="rounded-lg bg-paper px-3 py-1.5 font-medium text-ink-soft">{a}</span>
                {i < ARCH.length - 1 && <span className="text-ink-faint">→</span>}
              </span>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Metrological formulas" subtitle="Deterministic engine (versioned)" icon={<FunctionSquare className="h-4 w-4" />} />
          <CardBody className="space-y-3">
            {FORMULAS.map((f) => (
              <div key={f.id} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">{f.label}</span>
                  {f.verify && <VerifyBadge note="Verify exact variable basis (e vs d) against OIML R 76-1:2006 Annex A." />}
                </div>
                <div className="tabular mt-1 rounded bg-navy-900 px-3 py-1.5 font-mono text-sm text-accent-400">{f.expr}</div>
                <p className="mt-1.5 text-xs text-ink-faint">{f.note}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Defined tests" subtitle={`${rs.standard} · ${rs.edition}`} />
          <CardBody className="space-y-2.5">
            {rs.tests.map((t) => (
              <div key={t.testType} className="border-b border-line/60 pb-2.5 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{t.name}</span>
                  {t.mandatory && <span className="chip bg-navy-50 text-navy-700">required</span>}
                </div>
                <p className="text-xs text-ink-faint">{t.note}</p>
                <div className="mt-1 flex gap-1">
                  {t.appliesToModes.map((m) => <span key={m} className="chip bg-paper capitalize text-ink-faint">{m} mode</span>)}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
