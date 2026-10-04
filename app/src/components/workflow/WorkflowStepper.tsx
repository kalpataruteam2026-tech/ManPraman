'use client';

import React from 'react';
import { useNavigate } from '@/lib/navigation';
import {
  SlidersHorizontal,
  CheckCircle2,
  Camera,
  CheckSquare,
  FileText,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export type WorkflowStepId = 'observations' | 'validation' | 'evidence' | 'review' | 'report';

interface WorkflowStep {
  id: WorkflowStepId;
  label: string;
  tag?: string;
  icon: typeof SlidersHorizontal;
  description: string;
}

const STEPS: WorkflowStep[] = [
  {
    id: 'observations',
    label: 'Observations',
    icon: SlidersHorizontal,
    description: 'Manual input or CSV data import',
  },
  {
    id: 'validation',
    label: 'Validation',
    icon: CheckCircle2,
    description: 'MPE & OIML calculation checks',
  },
  {
    id: 'evidence',
    label: 'Supporting Evidence',
    tag: 'Optional',
    icon: Camera,
    description: 'Inspection photos & documents',
  },
  {
    id: 'review',
    label: 'Review',
    icon: CheckSquare,
    description: 'Technical reviewer sign-off',
  },
  {
    id: 'report',
    label: 'Report',
    icon: FileText,
    description: 'Certified PDF & DOCX export',
  },
];

interface WorkflowStepperProps {
  currentStep: WorkflowStepId;
  sessionId?: string;
  evidenceCount?: number;
  onStepClick?: (step: WorkflowStepId) => void;
  className?: string;
}

export function WorkflowStepper({
  currentStep,
  sessionId,
  evidenceCount = 0,
  onStepClick,
  className = '',
}: WorkflowStepperProps) {
  const navigate = useNavigate();

  const currentIdx = STEPS.findIndex((s) => s.id === currentStep);

  const handleStepClick = (stepId: WorkflowStepId) => {
    if (onStepClick) {
      onStepClick(stepId);
      return;
    }

    if (!sessionId) return;

    if (stepId === 'observations' || stepId === 'validation') {
      navigate(`/app/sessions/${sessionId}`);
    } else if (stepId === 'evidence') {
      navigate(`/app/sessions/${sessionId}?tab=evidence`);
    } else if (stepId === 'review') {
      navigate(`/app/sessions/${sessionId}/review`);
    } else if (stepId === 'report') {
      navigate(`/app/sessions/${sessionId}/report`);
    }
  };

  return (
    <div className={`w-full rounded-2xl border border-line/80 bg-white/95 p-3.5 shadow-2xs backdrop-blur-sm ${className}`}>
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-thin">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = step.id === currentStep;
          const isPast = idx < currentIdx;
          const isFuture = idx > currentIdx;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => handleStepClick(step.id)}
                className={`group flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all ${
                  isCurrent
                    ? 'bg-accent-600 text-white shadow-xs ring-2 ring-accent-500/20'
                    : isPast
                    ? 'bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100/70 border border-emerald-200/60'
                    : 'bg-paper/60 text-ink-soft hover:bg-slate-100 hover:text-ink border border-line/60'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition ${
                    isCurrent
                      ? 'bg-white/20 text-white'
                      : isPast
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-ink-soft group-hover:bg-slate-300'
                  }`}
                >
                  {isPast ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold truncate ${
                        isCurrent ? 'text-white' : isPast ? 'text-emerald-950 font-semibold' : 'text-ink'
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.tag && (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wide ${
                          isCurrent
                            ? 'bg-white/20 text-white'
                            : 'bg-accent-50 text-accent-700 border border-accent-200'
                        }`}
                      >
                        {step.tag}
                      </span>
                    )}
                    {step.id === 'evidence' && evidenceCount > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                          isCurrent
                            ? 'bg-white text-accent-700 font-extrabold'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {evidenceCount} {evidenceCount === 1 ? 'photo' : 'photos'}
                      </span>
                    )}
                  </div>
                  <p
                    className={`hidden lg:block text-[10px] truncate max-w-[130px] ${
                      isCurrent ? 'text-white/80' : isPast ? 'text-emerald-800/80' : 'text-ink-faint'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </button>

              {idx < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 hidden sm:block" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
