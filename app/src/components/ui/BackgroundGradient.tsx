'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface BackgroundGradientProps {
  className?: string;
  children?: React.ReactNode;
}

export const BackgroundGradient = ({
  className,
  children,
}: BackgroundGradientProps) => {
  return (
    <div
      className={cn(
        'fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#F8FAFC]',
        className
      )}
    >
      {/* Single clean solid background color from our palette */}
      <div className="absolute inset-0 bg-[#F8FAFC]" />

      {/* Tactile archival paper grain texture - slightly increased intensity */}
      <div
        className="absolute inset-0 opacity-[0.24] pointer-events-none mix-blend-multiply contrast-130"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.4 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none mix-blend-overlay contrast-125"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='fineGrain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.90' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23fineGrain)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content layer if used as wrapper */}
      {children && <div className="relative z-10 h-full w-full pointer-events-auto">{children}</div>}
    </div>
  );
};

export default function BackgroundGradientDemo() {
  return <BackgroundGradient />;
}

export type { BackgroundGradientProps as BackgroundGradientPropsType };

