import type { AccuracyClass, ComplianceStatus, EvaluationType, VerificationStage } from '../domain/types';

export function classLabel(cls: AccuracyClass): string {
  return cls === 'IIII' ? 'Class IIII (IV)' : `Class ${cls}`;
}

export function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function fmtTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function relativeTime(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export const EVAL_LABEL: Record<EvaluationType, string> = {
  model_approval: 'Model Approval / Pattern Evaluation',
  initial_verification: 'Initial Verification',
  inservice_verification: 'In-service / Periodic Verification',
};

export const STAGE_LABEL: Record<VerificationStage, string> = {
  initial: 'Initial verification MPE',
  inservice: 'In-service MPE (×2)',
};

export const VERDICT_LABEL: Record<ComplianceStatus, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  NA: 'N/A',
  PENDING: 'In progress',
};

export function statusColorClasses(status: ComplianceStatus): string {
  switch (status) {
    case 'PASS':
      return 'bg-pass-bg text-pass-fg';
    case 'FAIL':
      return 'bg-fail-bg text-fail-fg';
    case 'NA':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-warn-bg text-warn-fg';
  }
}

export function sessionStatusLabel(status: string): string {
  if (status === 'awaiting_review' || status === 'ready_for_review' || status === 'under_review') {
    return 'Under review';
  }
  if (status === 'in_progress') {
    return 'In progress';
  }
  if (status === 'returned_for_correction') {
    return 'Returned';
  }
  if (status === 'approved') {
    return 'Approved';
  }
  if (status === 'rejected') {
    return 'Rejected';
  }
  if (status === 'reported') {
    return 'Reported';
  }
  return status.replace(/_/g, ' ');
}

