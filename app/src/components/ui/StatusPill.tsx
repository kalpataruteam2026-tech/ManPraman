import { CheckCircle2, XCircle, MinusCircle, Clock } from 'lucide-react';
import type { ComplianceStatus } from '../../domain/types';
import { cn } from '../../lib/cn';
import { statusColorClasses, VERDICT_LABEL } from '../../lib/format';

/**
 * Status is never conveyed by colour alone — always icon + text (accessibility,
 * DESIGN_SPEC PART 26, 60).
 */
export function StatusPill({
  status,
  size = 'md',
  className,
}: {
  status: ComplianceStatus;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const Icon =
    status === 'PASS' ? CheckCircle2 : status === 'FAIL' ? XCircle : status === 'NA' ? MinusCircle : Clock;
  return (
    <span
      className={cn(
        'chip',
        statusColorClasses(status),
        size === 'sm' ? 'text-[11px]' : 'text-xs',
        className,
      )}
      role="status"
    >
      <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
      {VERDICT_LABEL[status]}
    </span>
  );
}
