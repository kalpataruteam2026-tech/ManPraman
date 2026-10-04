import Workflow from '@/views/Workflow';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workflow | ManPraman',
  description: 'ManPraman End-to-End Application Workflow',
};

export default function WorkflowPage() {
  return <Workflow />;
}
