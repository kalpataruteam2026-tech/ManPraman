import { motion, type Variants } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** Page transition used by the shell on route change. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' },
    transitionEnd: { transform: 'none' },
  },
  exit: { opacity: 0, transition: { duration: 0.05 } },
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

/** Fade-up on scroll into view. */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Staggered container + item for grids/lists. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] } },
};

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

/** Eased count-up number. */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 800,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className={className}>{display.toFixed(decimals)}</span>;
}

/** Animated circular progress ring. */
export function ProgressRing({
  value,
  size = 88,
  stroke = 8,
  children,
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e4e8f2" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringgrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-line/60', className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}
