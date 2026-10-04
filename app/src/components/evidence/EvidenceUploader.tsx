'use client';

import React from 'react';
import { EvidencePipeline, EVIDENCE_KIND_OPTIONS, TEST_ASSOCIATION_OPTIONS } from './EvidencePipeline';

export interface EvidenceUploaderProps {
  sessionId: string;
  testId?: string;
  requirementId?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  onProceedToReview?: () => void;
  onSkip?: () => void;
  hideStepperActions?: boolean;
}

export function EvidenceUploader(props: EvidenceUploaderProps) {
  return <EvidencePipeline {...props} />;
}

export { EvidencePipeline, EVIDENCE_KIND_OPTIONS, TEST_ASSOCIATION_OPTIONS };
