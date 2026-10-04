'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Hydrate offline store from IndexedDB on client mount
    useAppStore.getState().hydrate();

    const onOnline = () => useAppStore.getState().setOnline(true);
    const onOffline = () => useAppStore.getState().setOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return <>{children}</>;
}
