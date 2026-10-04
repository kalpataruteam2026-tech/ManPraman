'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
}

/**
 * Renders modal/overlay content directly into document.body
 * bypassing all parent transforms, offsets, and scroll containers.
 */
export function Portal({ children }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
}
