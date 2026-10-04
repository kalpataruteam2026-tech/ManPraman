import { useState } from 'react';
import { ChevronDown, FunctionSquare } from 'lucide-react';
import type { CalcTrace, ComplianceResult } from '../../domain/types';
import { StatusPill } from '../ui/StatusPill';
import { cn } from '../../lib/cn';

/**
 * Explainable compliance (DESIGN_SPEC PART 18). Every verdict shows the math,
 * the margin/excess and the cited rule — never a bare PASS/FAIL.
 */
export function ExplainCard({
  result,
  traces,
  title,
}: {
  result: ComplianceResult;
  traces?: CalcTrace[];
  title?: string;
}) {
  const fail = result.status === 'FAIL';
  return (
    <div
      className={cn(
        'rounded-xl2 border p-4',
        fail ? 'border-fail-line/40 bg-fail-bg' : result.status === 'PASS' ? 'border-pass-line/40 bg-pass-bg' : 'border-line bg-white',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-ink">{title ?? 'Compliance'}</span>
        <StatusPill status={result.status} />
      </div>
      <p className={cn('mt-2 text-sm font-medium', fail ? 'text-fail-fg' : 'text-ink-soft')}>{result.reason}</p>
      <dl className="mt-3 space-y-1">
        {result.explanation.map((line, i) => (
          <div key={i} className="flex gap-2 text-sm">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
            <span className="text-ink-soft">{line}</span>
          </div>
        ))}
      </dl>
      {traces && traces.length > 0 && <TraceDisclosure traces={traces} />}
    </div>
  );
}

export function TraceDisclosure({ traces }: { traces: CalcTrace[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-line/70 pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-accent-700 hover:text-accent-600"
      >
        <FunctionSquare className="h-3.5 w-3.5" />
        Calculation trace
        <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {traces.map((t, i) => (
            <div key={i} className="rounded-lg bg-navy-900/95 p-3 font-mono text-[11px] leading-relaxed text-slate-100">
              <div className="text-slate-400">
                {t.formulaId} · v{t.formulaVersion}
              </div>
              <div className="mt-1 text-accent-400">{t.expression}</div>
              <div className="mt-1 text-slate-500">{t.engineVersion}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
