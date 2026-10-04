import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { AccuracyClass, VerificationStage } from '../../domain/types';
import { getRuleset } from '../../regulatory/registry';
import { selectMpe } from '../../engine/mpe';
import { signed } from '../../domain/units';
import { cn } from '../../lib/cn';

export interface CurvePoint {
  load: number;
  Ec: number;
  label: string;
  status: 'PASS' | 'FAIL' | 'NA' | 'PENDING';
  direction?: 'up' | 'down';
}

interface Props {
  points: CurvePoint[];
  max: number;
  e: number;
  accuracyClass: AccuracyClass;
  rulesetId: string;
  stage: VerificationStage;
  unit: string;
  precision: number;
  height?: number;
}

const W = 760;

/**
 * Dynamic MPE visualization (DESIGN_SPEC PART 26). The ±MPE envelope is a
 * staircase (tolerance widens with load). Colour is backed by text + exact
 * numbers for accessibility — never colour alone.
 */
export function ErrorCurve({
  points, max, e, accuracyClass, rulesetId, stage, unit, precision, height = 340,
}: Props) {
  const H = height;
  const padL = 64, padR = 20, padT = 20, padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const midY = padT + plotH / 2;
  const [hover, setHover] = useState<number | null>(null);
  const ruleset = getRuleset(rulesetId);

  const envelope = useMemo(() => {
    const samples = 160;
    const pts: { load: number; mpe: number }[] = [];
    for (let i = 0; i <= samples; i++) {
      const load = (max * i) / samples;
      pts.push({ load, mpe: selectMpe({ ruleset, accuracyClass, load, e, stage, precision }).mpe });
    }
    return pts;
  }, [ruleset, accuracyClass, max, e, stage, precision]);

  const maxMpe = envelope.reduce((a, p) => Math.max(a, p.mpe), 0);
  const maxAbsEc = points.reduce((a, p) => Math.max(a, Math.abs(p.Ec)), 0);
  const yLimit = Math.max(maxMpe, maxAbsEc, e) * 1.2 || 1;

  const x = (load: number) => padL + (max > 0 ? (load / max) * plotW : 0);
  const y = (err: number) => midY - (err / yLimit) * (plotH / 2);

  const envTop = envelope.map((p) => `${x(p.load).toFixed(1)},${y(p.mpe).toFixed(1)}`).join(' ');
  const envBot = envelope.map((p) => `${x(p.load).toFixed(1)},${y(-p.mpe).toFixed(1)}`).join(' ');
  const corridorPath =
    `M ${envelope.map((p) => `${x(p.load).toFixed(1)} ${y(p.mpe).toFixed(1)}`).join(' L ')} ` +
    `L ${[...envelope].reverse().map((p) => `${x(p.load).toFixed(1)} ${y(-p.mpe).toFixed(1)}`).join(' L ')} Z`;

  const upPts = points.filter((p) => p.direction !== 'down').sort((a, b) => a.load - b.load);
  const actualLine = upPts.map((p) => `${x(p.load).toFixed(1)},${y(p.Ec).toFixed(1)}`).join(' ');

  const yTicks = [-1, -0.5, 0, 0.5, 1].map((f) => f * yLimit);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const statusColor = (s: CurvePoint['status']) => (s === 'FAIL' ? '#f43f5e' : s === 'PASS' ? '#10b981' : '#f59e0b');

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
        aria-label={`Error curve: corrected error against load with a ±MPE envelope, ${points.length} points plotted.`}>
        <defs>
          <linearGradient id="corridor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.16" />
          </linearGradient>
          <linearGradient id="curveline" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <motion.path d={corridorPath} fill="url(#corridor)" stroke="none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />

        {yTicks.map((t, i) => (
          <g key={`y${i}`}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#94a3b8' : '#eef2f7'} strokeWidth={t === 0 ? 1.5 : 1} />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-faint" style={{ fontSize: 11 }}>{signed(t, precision)}</text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <g key={`x${i}`}>
            <line x1={x(t)} x2={x(t)} y1={padT} y2={padT + plotH} stroke="#f1f5f9" />
            <text x={x(t)} y={H - padB + 18} textAnchor="middle" className="fill-ink-faint" style={{ fontSize: 11 }}>{t.toLocaleString()}</text>
          </g>
        ))}
        <text x={padL} y={12} className="fill-ink-faint" style={{ fontSize: 10 }}>error ({unit})</text>
        <text x={W - padR} y={H - 6} textAnchor="end" className="fill-ink-faint" style={{ fontSize: 10 }}>load ({unit})</text>

        <motion.polyline points={envTop} fill="none" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="5 4"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1 }} />
        <motion.polyline points={envBot} fill="none" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="5 4"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1 }} />

        {upPts.length > 1 && (
          <motion.polyline points={actualLine} fill="none" stroke="url(#curveline)" strokeWidth={2.5} strokeLinejoin="round"
            filter="url(#glow)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.3, ease: 'easeInOut' }} />
        )}

        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
            <motion.circle
              cx={x(p.load)} cy={y(p.Ec)} r={hover === i ? 6 : 4.5}
              fill={statusColor(p.status)} stroke="#fff" strokeWidth={1.5}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.05, type: 'spring', stiffness: 400, damping: 20 }}
            />
            {hover === i && (
              <g>
                <rect x={x(p.load) - 62} y={y(p.Ec) - 46} width={124} height={36} rx={8} fill="#0b1020" />
                <text x={x(p.load)} y={y(p.Ec) - 30} textAnchor="middle" fill="#fff" style={{ fontSize: 11, fontWeight: 700 }}>{p.label}</text>
                <text x={x(p.load)} y={y(p.Ec) - 16} textAnchor="middle" fill="#a5b4fc" style={{ fontSize: 10 }}>Ec {signed(p.Ec, precision)} {unit}</text>
              </g>
            )}
          </g>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 px-2 text-xs text-ink-faint">
        <LegendDot color="#f43f5e" dash label="±MPE envelope" />
        <LegendDot color="#6366f1" label="Corrected error" />
        <LegendDot color="#10b981" label="Within MPE" />
        <LegendDot color="#f43f5e" label="Exceeds MPE" />
      </div>
    </div>
  );
}

function LegendDot({ color, label, dash }: { color: string; label: string; dash?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('inline-block h-2.5 w-4 rounded-full')}
        style={{ background: dash ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)` : color }} />
      {label}
    </span>
  );
}
