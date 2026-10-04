import Workflow from '@/views/Workflow';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workflow | MetroCert',
  description: 'MetroCert End-to-End Application Workflow',
};

export default function WorkflowPage() {
  return <Workflow />;
}
