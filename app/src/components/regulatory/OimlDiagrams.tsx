import React, { useState } from 'react';

export interface SpanMeasurementPoint {
  index: number;
  condition: string;
  badge?: 'T' | 'D' | 'P';
  errorE: number; // in e units, e.g. 0.12
  errorG: number; // in grams
  loadG: number;
  indicationG: number;
  status: 'PASS' | 'FAIL';
}

interface SpanStabilityPlotProps {
  appNo?: string;
  typeDesignation?: string;
  eVal?: number;
  unit?: string;
  measurements?: SpanMeasurementPoint[];
  passed?: boolean;
}

const DEFAULT_SPAN_MEASUREMENTS: SpanMeasurementPoint[] = [
  { index: 1, condition: 'Initial Reference (Day 0)', errorE: 0.02, errorG: 0.1, loadG: 1500, indicationG: 1500.0, status: 'PASS' },
  { index: 2, condition: 'Temperature Test (+40 °C)', badge: 'T', errorE: 0.12, errorG: 0.6, loadG: 1500, indicationG: 1500.1, status: 'PASS' },
  { index: 3, condition: 'Disconnection from Mains', badge: 'P', errorE: -0.06, errorG: -0.3, loadG: 1500, indicationG: 1499.9, status: 'PASS' },
  { index: 4, condition: 'Damp Heat Steady (85% RH)', badge: 'D', errorE: 0.18, errorG: 0.9, loadG: 1500, indicationG: 1500.2, status: 'PASS' },
  { index: 5, condition: 'Power Interruption Test', badge: 'P', errorE: 0.04, errorG: 0.2, loadG: 1500, indicationG: 1500.0, status: 'PASS' },
  { index: 6, condition: 'Temperature Test (–10 °C)', badge: 'T', errorE: -0.10, errorG: -0.5, loadG: 1500, indicationG: 1499.9, status: 'PASS' },
  { index: 7, condition: 'Damp Heat Recovery Cycle', badge: 'D', errorE: 0.14, errorG: 0.7, loadG: 1500, indicationG: 1500.1, status: 'PASS' },
  { index: 8, condition: 'Final Verification (Day 28)', errorE: 0.06, errorG: 0.3, loadG: 1500, indicationG: 1500.1, status: 'PASS' },
];

export function SpanStabilityPlot({
  appNo = 'LM-2026-6884',
  typeDesignation = 'IND-OIML-X3',
  eVal = 5,
  unit = 'g',
  measurements = DEFAULT_SPAN_MEASUREMENTS,
  passed = true,
}: SpanStabilityPlotProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // SVG coordinate configuration
  const width = 860;
  const height = 480;
  const margin = { top: 75, right: 40, bottom: 65, left: 110 };

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Y-axis spans from -1.5 e to +1.5 e (total 3.0 e)
  const minY = -1.5;
  const maxY = 1.5;
  const zeroY = margin.top + (plotHeight / 2);

  const getY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return zeroY - (clamped / 1.5) * (plotHeight / 2);
  };

  // X-axis: 8 measurement positions
  const getX = (index: number) => {
    const step = plotWidth / 9;
    return margin.left + index * step;
  };

  // Polyline points
  const pointsString = measurements
    .map((m) => `${getX(m.index)},${getY(m.errorE)}`)
    .join(' ');

  const hoveredPoint = measurements.find((m) => m.index === hoveredIndex);

  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden text-xs">
      {/* OIML R 76-2 Standard Header */}
      <div className="border-b border-line bg-slate-50/80 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
              OIML R 76-2: 2007 (E) — Page 45 Visual Diagram
            </div>
            <h3 className="text-base font-black tracking-tight text-navy-950 mt-0.5">
              14 SPAN STABILITY (B.4)
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-ink-soft">
              App No: <strong className="text-ink">{appNo}</strong>
            </span>
            <span className="font-mono text-xs text-ink-soft">
              Type: <strong className="text-ink">{typeDesignation}</strong>
            </span>
            <div className="flex items-center gap-2 text-xs font-bold pl-2 border-l border-line">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border ${
                passed ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-400 border-line'
              }`}>
                {passed ? '☑ Passed' : '☐ Passed'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border ${
                !passed ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-slate-50 text-slate-400 border-line'
              }`}>
                {!passed ? '☒ Failed' : '☐ Failed'}
              </span>
            </div>
          </div>
        </div>

        {/* Legend / Plot Instruction */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-line/60 text-xs text-ink-soft">
          <span>Plot on the diagram the indication of temperature test:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold border border-sky-300 text-[11px]">
            <span className="h-4 w-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">T</span>
            Temperature Test (T)
          </span>
          <span>damp heat test:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300 text-[11px]">
            <span className="h-4 w-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">D</span>
            Damp Heat Test (D)
          </span>
          <span>and disconnections from the mains power supply:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold border border-purple-300 text-[11px]">
            <span className="h-4 w-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">P</span>
            Mains Disconnect (P)
          </span>
        </div>
      </div>

      {/* SVG Diagram Canvas */}
      <div className="relative p-3 bg-white overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[720px] max-w-[900px] mx-auto select-none"
          style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
        >
          {/* Background grid container */}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotWidth}
            height={plotHeight}
            fill="#FFFFFF"
            stroke="#64748B"
            strokeWidth="1.5"
          />

          {/* Permissible tolerance shaded corridor */}
          {/* Inner corridor: +/- 0.5 e (greenish) */}
          <rect
            x={margin.left}
            y={getY(0.5)}
            width={plotWidth}
            height={getY(-0.5) - getY(0.5)}
            fill="#F0FDF4"
            opacity="0.85"
          />
          {/* Warning corridor: +/- 1.0 e (amber tint) */}
          <rect
            x={margin.left}
            y={getY(1.0)}
            width={plotWidth}
            height={getY(0.5) - getY(1.0)}
            fill="#FFFBEB"
            opacity="0.6"
          />
          <rect
            x={margin.left}
            y={getY(-0.5)}
            width={plotWidth}
            height={getY(-1.0) - getY(-0.5)}
            fill="#FFFBEB"
            opacity="0.6"
          />

          {/* Minor horizontal grid lines (every 0.1 e) */}
          {Array.from({ length: 31 }, (_, i) => -1.5 + i * 0.1).map((val) => {
            const isMajor = Math.abs(val % 0.5) < 0.001;
            const y = getY(val);
            if (isMajor) return null;
            return (
              <line
                key={`minor-${val.toFixed(1)}`}
                x1={margin.left}
                y1={y}
                x2={margin.left + plotWidth}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth="0.8"
              />
            );
          })}

          {/* Vertical measurement grid lines */}
          {Array.from({ length: 8 }, (_, i) => i + 1).map((idx) => {
            const x = getX(idx);
            return (
              <g key={`x-grid-${idx}`}>
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={margin.top + plotHeight}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                {/* Measurement Number Ticks */}
                <text
                  x={x}
                  y={margin.top + plotHeight + 24}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="bold"
                  fill="#1E293B"
                >
                  {idx}
                </text>
              </g>
            );
          })}

          {/* Major horizontal grid lines and Y-axis tick labels */}
          {[
            { val: 1.5, text: '+1.5 e' },
            { val: 1.0, text: '+1 e' },
            { val: 0.5, text: '+0.5 e' },
            { val: 0.0, text: '0' },
            { val: -0.5, text: '–0.5 e' },
            { val: -1.0, text: '–1 e' },
            { val: -1.5, text: '–1.5 e' },
          ].map(({ val, text }) => {
            const y = getY(val);
            const isZero = val === 0.0;
            const isLimit = Math.abs(val) === 0.5 || Math.abs(val) === 1.0;
            return (
              <g key={`major-${text}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + plotWidth}
                  y2={y}
                  stroke={isZero ? '#0F172A' : isLimit ? '#94A3B8' : '#CBD5E1'}
                  strokeWidth={isZero ? 2 : isLimit ? 1.5 : 1}
                  strokeDasharray={isLimit ? '4 2' : undefined}
                />
                <text
                  x={margin.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fontWeight={isZero || isLimit ? 'bold' : 'normal'}
                  fill={isZero ? '#0F172A' : isLimit ? '#334155' : '#64748B'}
                >
                  {text}
                </text>
              </g>
            );
          })}

          {/* Axis Titles */}
          <text
            x={margin.left - 50}
            y={zeroY}
            textAnchor="middle"
            transform={`rotate(-90, ${margin.left - 50}, ${zeroY})`}
            fontSize="12"
            fontWeight="bold"
            fill="#0F172A"
          >
            Average error e
          </text>
          <text
            x={margin.left + plotWidth / 2}
            y={margin.top + plotHeight + 46}
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill="#0F172A"
          >
            Measurement no.
          </text>

          {/* Statutory Maximum allowable variation annotations */}
          <text
            x={margin.left + plotWidth - 10}
            y={getY(0.5) - 6}
            textAnchor="end"
            fontSize="10"
            fontWeight="bold"
            fill="#059669"
          >
            Maximum allowable variation: ±0.5 e (Span Stability Corridor)
          </text>
          <text
            x={margin.left + plotWidth - 10}
            y={getY(1.0) - 6}
            textAnchor="end"
            fontSize="10"
            fontWeight="bold"
            fill="#D97706"
          >
            Initial Verification MPE: ±1.0 e
          </text>

          {/* Connecting polyline across measurements */}
          <polyline
            points={pointsString}
            fill="none"
            stroke="#0284C7"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Plotted Data Points with Interactive Circles & Letter Badges */}
          {measurements.map((m) => {
            const cx = getX(m.index);
            const cy = getY(m.errorE);
            const isHovered = hoveredIndex === m.index;

            let badgeFill = '#0284C7';
            let badgeBg = '#E0F2FE';
            if (m.badge === 'T') {
              badgeFill = '#0369A1';
              badgeBg = '#BAE6FD';
            } else if (m.badge === 'D') {
              badgeFill = '#B45309';
              badgeBg = '#FDE68A';
            } else if (m.badge === 'P') {
              badgeFill = '#6D28D9';
              badgeBg = '#DDD6FE';
            }

            return (
              <g
                key={`point-${m.index}`}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setHoveredIndex(m.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Outer halo on hover */}
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="18"
                    fill={badgeFill}
                    opacity="0.2"
                    className="animate-pulse"
                  />
                )}

                {/* Point Node Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 8 : 6}
                  fill={badgeFill}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />

                {/* Badge Circle with Letter Indicator if applicable */}
                {m.badge ? (
                  <g transform={`translate(${cx}, ${cy - 22})`}>
                    <circle cx="0" cy="0" r="10" fill={badgeBg} stroke={badgeFill} strokeWidth="1.5" />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="black"
                      fill={badgeFill}
                    >
                      {m.badge}
                    </text>
                  </g>
                ) : (
                  <text
                    x={cx}
                    y={cy - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#334155"
                  >
                    #{m.index}
                  </text>
                )}

                {/* Error Value Tag */}
                <text
                  x={cx}
                  y={cy + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#0F172A"
                >
                  {m.errorE >= 0 ? `+${m.errorE.toFixed(2)}` : m.errorE.toFixed(2)} e
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover inspection detail banner */}
        {hoveredPoint && (
          <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/90 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-navy-950 text-white font-bold flex items-center justify-center text-xs">
                {hoveredPoint.index}
              </span>
              <div>
                <strong className="text-ink">{hoveredPoint.condition}</strong>
                {hoveredPoint.badge && (
                  <span className="ml-2 font-mono text-[11px] font-bold text-sky-800">
                    Marker [{hoveredPoint.badge}]
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 font-mono text-xs">
              <span>Load: <strong>{hoveredPoint.loadG} {unit}</strong></span>
              <span>Indication: <strong>{hoveredPoint.indicationG} {unit}</strong></span>
              <span>Error (EL – E0): <strong className="text-navy-950">
                {hoveredPoint.errorE >= 0 ? `+${hoveredPoint.errorE}` : hoveredPoint.errorE} e ({hoveredPoint.errorG >= 0 ? `+${hoveredPoint.errorG}` : hoveredPoint.errorG} {unit})
              </strong></span>
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                {hoveredPoint.status}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Measurement Summary Table Footer */}
      <div className="border-t border-line bg-slate-50/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Consecutive Measurement Record (8 Runs under Clause B.4)
          </span>
          <span className="text-xs text-ink-soft">
            Maximum Allowable Variation: <strong>0.5 e</strong> (Class III)
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-line bg-white rounded-lg">
            <thead className="bg-slate-100 text-ink-faint text-[11px] border-b border-line">
              <tr>
                <th className="py-2 px-3">Run #</th>
                <th className="py-2 px-3">Test Condition</th>
                <th className="py-2 px-3">Marker</th>
                <th className="py-2 px-3">Load L</th>
                <th className="py-2 px-3">Indication I</th>
                <th className="py-2 px-3">Span Error (EL – E0)</th>
                <th className="py-2 px-3">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-mono">
              {measurements.map((m) => (
                <tr key={m.index} className="hover:bg-slate-50/60 font-medium">
                  <td className="py-1.5 px-3 font-bold text-ink">#{m.index}</td>
                  <td className="py-1.5 px-3 font-sans text-ink">{m.condition}</td>
                  <td className="py-1.5 px-3">
                    {m.badge ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 border border-slate-300 text-xs font-bold text-navy-950">
                        {m.badge}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-1.5 px-3">{m.loadG} {unit}</td>
                  <td className="py-1.5 px-3">{m.indicationG.toFixed(1)} {unit}</td>
                  <td className="py-1.5 px-3 font-bold text-navy-950">
                    {m.errorE >= 0 ? `+${m.errorE.toFixed(2)}` : m.errorE.toFixed(2)} e
                  </td>
                  <td className="py-1.5 px-3">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface EccentricityQuadrantSketchProps {
  appNo?: string;
  loadG?: number;
  unit?: string;
  errors?: Record<number, number>; // { 1: 0.1, 2: 0.2, 3: 0.0, 4: -0.1 }
}

export function EccentricityQuadrantSketch({
  appNo = 'LM-2026-6884',
  loadG = 5000,
  unit = 'g',
  errors = { 1: 0.1, 2: 0.2, 3: 0.0, 4: -0.1 },
}: EccentricityQuadrantSketchProps) {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden text-xs">
      <div className="border-b border-line bg-slate-50/80 px-5 py-3">
        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
          OIML R 76-2: 2007 (E) — Page 12 Form 3.1
        </div>
        <h3 className="text-sm font-black tracking-tight text-navy-950 mt-0.5">
          Location of test loads: mark on a sketch the successive locations of test loads
        </h3>
        <p className="text-xs text-ink-soft mt-1">
          Numbers shall be repeated in the observation table below. Also indicate in the sketch the location of the display or another perceptible part.
        </p>
      </div>

      <div className="p-5 flex flex-wrap items-center justify-around gap-6 bg-white">
        {/* The 4-Quadrant Load Receptor Sketch */}
        <div className="flex flex-col items-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Load Receptor (Platform)
          </div>

          <div className="relative w-56 h-56 rounded-xl border-4 border-navy-950 bg-slate-50 shadow-inner grid grid-cols-2 grid-rows-2">
            {/* Quadrant 1: Top-Left */}
            <div className="border-r-2 border-b-2 border-dashed border-slate-400 p-3 flex flex-col items-center justify-center hover:bg-sky-50 transition">
              <span className="text-2xl font-black text-navy-950">1</span>
              <span className="text-[10px] font-semibold text-slate-500 mt-1">Back-Left</span>
              <span className="font-mono text-[11px] font-bold text-sky-700">
                {errors[1] !== undefined ? `${errors[1] >= 0 ? `+${errors[1]}` : errors[1]} ${unit}` : ''}
              </span>
            </div>

            {/* Quadrant 2: Top-Right */}
            <div className="border-b-2 border-dashed border-slate-400 p-3 flex flex-col items-center justify-center hover:bg-sky-50 transition">
              <span className="text-2xl font-black text-navy-950">2</span>
              <span className="text-[10px] font-semibold text-slate-500 mt-1">Back-Right</span>
              <span className="font-mono text-[11px] font-bold text-sky-700">
                {errors[2] !== undefined ? `${errors[2] >= 0 ? `+${errors[2]}` : errors[2]} ${unit}` : ''}
              </span>
            </div>

            {/* Quadrant 4: Bottom-Left */}
            <div className="border-r-2 border-dashed border-slate-400 p-3 flex flex-col items-center justify-center hover:bg-sky-50 transition">
              <span className="text-2xl font-black text-navy-950">4</span>
              <span className="text-[10px] font-semibold text-slate-500 mt-1">Front-Left</span>
              <span className="font-mono text-[11px] font-bold text-sky-700">
                {errors[4] !== undefined ? `${errors[4] >= 0 ? `+${errors[4]}` : errors[4]} ${unit}` : ''}
              </span>
            </div>

            {/* Quadrant 3: Bottom-Right */}
            <div className="p-3 flex flex-col items-center justify-center hover:bg-sky-50 transition">
              <span className="text-2xl font-black text-navy-950">3</span>
              <span className="text-[10px] font-semibold text-slate-500 mt-1">Front-Right</span>
              <span className="font-mono text-[11px] font-bold text-sky-700">
                {errors[3] !== undefined ? `${errors[3] >= 0 ? `+${errors[3]}` : errors[3]} ${unit}` : ''}
              </span>
            </div>
          </div>

          {/* Front Display Indicator Strip */}
          <div className="mt-2 w-56 rounded-md bg-navy-950 py-1 text-center font-bold tracking-wider text-[10px] text-cyan-300 shadow">
            ▲ [ FRONT DISPLAY / TERMINAL ] ▲
          </div>
        </div>

        {/* Statutory Conditions & Device Checkboxes */}
        <div className="space-y-3 max-w-sm">
          <div className="rounded-xl border border-line bg-slate-50 p-3 space-y-2">
            <span className="font-bold text-navy-950 block">Automatic zero-setting and zero-tracking device is:</span>
            <div className="space-y-1.5 pl-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" disabled className="rounded border-slate-300" />
                <span className="text-slate-600">Non-existent</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-navy-950">
                <input type="checkbox" checked readOnly className="rounded border-slate-400 text-sky-600" />
                <span>Not in operation (Disabled during test)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" disabled className="rounded border-slate-300" />
                <span className="text-slate-600">Out of working range</span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-paper/60 p-3 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-ink-soft">Test Load Applied (L ≈ ⅓ Max):</span>
              <strong className="text-navy-950">{loadG} {unit}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Max Allowed Error (MPE):</span>
              <strong className="text-emerald-700">± 5.0 {unit} (1.0 e)</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Error Formula:</span>
              <span className="font-bold">Ec = E – E0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RollingLoadTrackSketch() {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden text-xs">
      <div className="border-b border-line bg-slate-50/80 px-5 py-3">
        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
          OIML R 76-2: 2007 (E) — Page 13 Form 3.2
        </div>
        <h3 className="text-sm font-black tracking-tight text-navy-950 mt-0.5">
          Eccentricity using a rolling load (A.4.7.4)
        </h3>
        <p className="text-xs text-ink-soft mt-1">
          Location of test loads for each section of the load receptor: mark on a sketch the successive locations of test loads.
        </p>
      </div>

      <div className="p-5 flex flex-wrap items-center justify-around gap-6 bg-white">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-4 text-xs font-bold text-navy-950 mb-2">
            <span>Travel Direction:</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono">
              (← / →) Bi-Directional
            </span>
          </div>

          {/* 3 Section Track */}
          <div className="w-80 h-24 rounded-xl border-4 border-navy-950 bg-slate-50 shadow-inner grid grid-cols-3">
            <div className="border-r-2 border-dashed border-slate-400 p-2 flex flex-col items-center justify-center hover:bg-sky-50 transition">
              <span className="text-2xl font-black text-navy-950">1</span>
              <span className="text-[10px] text-slate-500">Entry Track</span>
            </div>
            <div className="border-r-2 border-dashed border-slate-400 p-2 flex flex-col items-center justify-center hover:bg-sky-50 transition">
              <span className="text-2xl font-black text-navy-950">2</span>
              <span className="text-[10px] text-slate-500">Centre Span</span>
            </div>
            <div className="p-2 flex flex-col items-center justify-center hover:bg-sky-50 transition">
              <span className="text-2xl font-black text-navy-950">3</span>
              <span className="text-[10px] text-slate-500">Exit Track</span>
            </div>
          </div>

          <div className="mt-2 w-80 rounded-md bg-navy-950 py-1 text-center font-bold tracking-wider text-[10px] text-cyan-300 shadow">
            ▲ [ WEIGHBRIDGE INDICATOR TERMINAL ] ▲
          </div>
        </div>

        <div className="rounded-xl border border-line bg-slate-50 p-4 space-y-2 max-w-sm">
          <span className="font-bold text-navy-950 block">Divided vs. Undivided Receptor:</span>
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" disabled className="rounded" />
              <span>Number of sections: 3</span>
            </label>
            <label className="flex items-center gap-1.5 font-bold text-navy-950">
              <input type="checkbox" checked readOnly className="rounded text-sky-600" />
              <span>Undivided load receptor</span>
            </label>
          </div>
          <p className="text-[11px] text-slate-500">
            Rolling load applied along standard operational track in both forward and reverse directions per A.4.7.4.
          </p>
        </div>
      </div>
    </div>
  );
}
