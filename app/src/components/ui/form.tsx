import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="label">
        {label} {required && <span className="text-fail-fg">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-fail-fg">{error}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('input', props.className)} />;
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input inputMode="decimal" {...props} type="number" className={cn('input tabular', props.className)} />;
}

export function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...props} className={cn('input pr-8', props.className)}>
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn('input min-h-[80px]', props.className)} />;
}
