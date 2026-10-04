'use client';

import React, { type ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/cn';
import JellyRadio from './JellyRadio';

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="rounded-xl border border-line bg-champagne-200 p-2 text-espresso-800 shadow-card">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-faint">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'pass' | 'fail' | 'warn' | 'accent';
  icon?: ReactNode;
}) {
  const tones = {
    default: 'text-ink',
    pass: 'text-pass-fg',
    fail: 'text-fail-fg',
    warn: 'text-warn-fg',
    accent: 'text-accent-700',
  } as const;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="section-title">{label}</span>
        {icon && <span className="text-ink-faint">{icon}</span>}
      </div>
      <div className={cn('mt-2 text-2xl font-bold tabular', tones[tone])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}

export function InfoRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-faint">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
}) {
  return (
    <JellyRadio
      items={options.map((o) => ({ value: o.value, label: o.label }))}
      value={value}
      onChange={(v) => onChange(v as T)}
      chipColor="#FAF6F0"
      activeColor="#2D2421"
      textColor="#52433A"
      activeTextColor="#FAF6F0"
      size="sm"
      gap={6}
      radius={8}
    />
  );
}

export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-line bg-champagne-50/50 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-ink-faint">{icon}</div>}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-ink-faint">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Shows next to any rule/value not yet confirmed against the primary source. */
export function VerifyBadge({ note }: { note?: string }) {
  return (
    <span
      className="chip bg-warn-bg text-warn-fg border border-warn-line/30"
      title={note ?? 'Not yet verified against the primary official source.'}
    >
      <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
      VERIFY
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="chip bg-champagne-200 text-espresso-800 border border-champagne-300">
      DEMO DATA
    </span>
  );
}
