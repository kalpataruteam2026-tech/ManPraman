'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from './AppShell';
import { useAppStore } from '../../store/useAppStore';

export function Protected({ children }: { children: React.ReactNode }) {
  const hydrated = useAppStore((s) => s.hydrated);
  const user = useAppStore((s) => s.currentUser);
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (hydrated) {
      if (!user) {
        router.replace('/login');
      } else {
        setReady(true);
      }
    }
  }, [hydrated, user, router]);

  if (!hydrated || !user || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-ink-faint">
        Loading platform…
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
