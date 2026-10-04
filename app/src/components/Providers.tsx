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

    // Adaptive favicon for dark/light browser theme
    let removeThemeListener = () => {};
    try {
      const matcher = window.matchMedia('(prefers-color-scheme: dark)');
      const setFavicon = (isDark: boolean) => {
        const iconUrl = isDark ? '/logo-light.png' : '/logo.png';
        const icons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
        icons.forEach((link) => {
          if (link.type === 'image/svg+xml') return;
          link.href = iconUrl;
        });
      };
      setFavicon(matcher.matches);
      const listener = (e: MediaQueryListEvent) => setFavicon(e.matches);
      matcher.addEventListener('change', listener);
      removeThemeListener = () => matcher.removeEventListener('change', listener);
    } catch {
      // noop
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      removeThemeListener();
    };
  }, []);

  return <>{children}</>;
}
