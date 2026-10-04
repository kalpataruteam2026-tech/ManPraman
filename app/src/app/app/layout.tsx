import { Protected } from '@/components/layout/Protected';

export default function AppProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Protected>{children}</Protected>;
}
