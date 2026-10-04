'use client';

import React, { useEffect, useRef, memo } from 'react';

const TWO_PI = Math.PI * 2;

export interface DotFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  dotRadius?: number;
  dotSpacing?: number;
  cursorRadius?: number;
  cursorForce?: number;
  bulgeOnly?: boolean;
  bulgeStrength?: number;
  glowRadius?: number;
  sparkle?: boolean;
  waveAmplitude?: number;
  gradientFrom?: string;
  gradientTo?: string;
  glowColor?: string;
}

interface Dot {
  ax: number;
  ay: number;
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

const DotField = memo(function DotField({
  dotRadius = 1.6,
  dotSpacing = 26,
  cursorRadius = 320,
  cursorForce = 0.1,
  bulgeOnly = true,
  bulgeStrength = 55,
  glowRadius = 180,
  sparkle = false,
  waveAmplitude = 0,
  gradientFrom = 'rgba(45, 36, 33, 0.42)',
  gradientTo = 'rgba(180, 140, 95, 0.38)',
  glowColor = 'rgba(213, 186, 152, 0.30)',
  ...rest
}: DotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0, lastTime: 0 });
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const engagement = useRef(0);
  const propsRef = useRef({
    dotRadius,
    dotSpacing,
    cursorRadius,
    cursorForce,
    bulgeOnly,
    bulgeStrength,
    glowRadius,
    sparkle,
    waveAmplitude,
    gradientFrom,
    gradientTo,
    glowColor,
  });
  propsRef.current = {
    dotRadius,
    dotSpacing,
    cursorRadius,
    cursorForce,
    bulgeOnly,
    bulgeStrength,
    glowRadius,
    sparkle,
    waveAmplitude,
    gradientFrom,
    gradientTo,
    glowColor,
  };
  const rebuildRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    let resizeTimer: any;
    let isLoopRunning = false;
    let frameCount = 0;

    function resize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doResize, 60);
    }

    function doResize() {
      if (!canvas || !ctx) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      const w = Math.max(rect?.width || 0, typeof window !== 'undefined' ? window.innerWidth : 800);
      const h = Math.max(rect?.height || 0, typeof window !== 'undefined' ? window.innerHeight : 600);

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      sizeRef.current = { w, h };
      buildDots(w, h);
      wakeUp();
    }

    function buildDots(w: number, h: number) {
      const p = propsRef.current;
      const step = p.dotRadius + p.dotSpacing;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const padX = (w % step) / 2;
      const padY = (h % step) / 2;
      const dots: Dot[] = new Array(rows * cols);
      let idx = 0;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ax = padX + col * step + step / 2;
          const ay = padY + row * step + step / 2;
          dots[idx++] = { ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
        }
      }
      dotsRef.current = dots;
    }

    function wakeUp() {
      if (!isLoopRunning) {
        isLoopRunning = true;
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    function onMouseMove(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const now = performance.now();
      const m = mouseRef.current;
      const newX = e.clientX - rect.left;
      const newY = e.clientY - rect.top;
      const dt = Math.max(1, now - (m.lastTime || now));
      const dx = newX - (m.prevX === -9999 ? newX : m.prevX);
      const dy = newY - (m.prevY === -9999 ? newY : m.prevY);
      const dist = Math.sqrt(dx * dx + dy * dy);
      m.speed += (Math.min(20, dist / (dt * 0.1)) - m.speed) * 0.4;
      m.prevX = newX;
      m.prevY = newY;
      m.x = newX;
      m.y = newY;
      m.lastTime = now;
      wakeUp();
    }

    function onMouseLeave() {
      const m = mouseRef.current;
      m.x = -9999;
      m.y = -9999;
      m.prevX = -9999;
      m.prevY = -9999;
      m.speed = 0;
      wakeUp();
    }

    function onVisibilityChange() {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        isLoopRunning = false;
      } else {
        wakeUp();
      }
    }

    function tick() {
      if (!ctx) {
        isLoopRunning = false;
        return;
      }
      frameCount++;
      const dots = dotsRef.current;
      const m = mouseRef.current;
      const { w, h } = sizeRef.current;
      const p = propsRef.current;
      const len = dots.length;
      const t = frameCount * 0.02;

      // Mouse speed decay
      m.speed *= 0.92;
      if (m.speed < 0.001) m.speed = 0;

      // Maintain active engagement while cursor is inside or near viewport
      const isMouseActive = m.x > -200 && m.x < w + 200 && m.y > -200 && m.y < h + 200;
      const targetEngagement = isMouseActive ? Math.max(0.7, Math.min(m.speed / 4 + 0.7, 1)) : 0;
      engagement.current += (targetEngagement - engagement.current) * 0.08;
      if (engagement.current < 0.001) engagement.current = 0;
      const eng = engagement.current;

      ctx.clearRect(0, 0, w, h);

      let maxDisplacement = 0;

      if (w > 0 && h > 0) {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, p.gradientFrom);
        grad.addColorStop(1, p.gradientTo);
        ctx.fillStyle = grad;

        const cr = p.cursorRadius;
        const crSq = cr * cr;
        const rad = p.dotRadius;
        const isBulge = p.bulgeOnly;

        ctx.beginPath();

        for (let i = 0; i < len; i++) {
          const d = dots[i];
          const dx = m.x - d.ax;
          const dy = m.y - d.ay;
          const roughDistX = Math.abs(dx);
          const roughDistY = Math.abs(dy);

          // Fast rejection if far outside cursor interaction radius
          if (roughDistX < cr && roughDistY < cr && eng > 0.01) {
            const distSq = dx * dx + dy * dy;
            if (distSq < crSq) {
              const dist = Math.sqrt(distSq) || 0.001;
              const proximity = 1 - dist / cr;

              if (isBulge) {
                const push = proximity * proximity * p.bulgeStrength * eng;
                const angle = Math.atan2(dy, dx);
                d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.18;
                d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.18;
              } else {
                const angle = Math.atan2(dy, dx);
                const move = (500 / dist) * (m.speed * p.cursorForce);
                d.vx += Math.cos(angle) * -move;
                d.vy += Math.sin(angle) * -move;
              }
            } else if (isBulge) {
              d.sx += (d.ax - d.sx) * 0.14;
              d.sy += (d.ay - d.sy) * 0.14;
            }
          } else if (isBulge) {
            d.sx += (d.ax - d.sx) * 0.14;
            d.sy += (d.ay - d.sy) * 0.14;
          }

          if (!isBulge) {
            d.vx *= 0.9;
            d.vy *= 0.9;
            d.x = d.ax + d.vx;
            d.y = d.ay + d.vy;
            d.sx += (d.x - d.sx) * 0.14;
            d.sy += (d.y - d.sy) * 0.14;
          }

          let drawX = d.sx;
          let drawY = d.sy;
          if (p.waveAmplitude > 0) {
            drawY += Math.sin(d.ax * 0.03 + t) * p.waveAmplitude;
            drawX += Math.cos(d.ay * 0.03 + t * 0.7) * p.waveAmplitude * 0.5;
          }

          const disp = Math.abs(drawX - d.ax) + Math.abs(drawY - d.ay);
          if (disp > maxDisplacement) maxDisplacement = disp;

          ctx.moveTo(drawX + rad, drawY);
          ctx.arc(drawX, drawY, rad, 0, TWO_PI);
        }

        ctx.fill();
      }

      // If idle (no mouse movement, dots settled, no wave animation), pause RAF to save CPU
      if (!isMouseActive && maxDisplacement < 0.05 && p.waveAmplitude === 0) {
        isLoopRunning = false;
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    doResize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseout', onMouseLeave, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    rebuildRef.current = () => {
      const { w, h } = sizeRef.current;
      if (w > 0 && h > 0) {
        buildDots(w, h);
        wakeUp();
      }
    };

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseout', onMouseLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    rebuildRef.current?.();
  }, [dotRadius, dotSpacing]);

  return (
    <div className="w-full h-full relative" {...rest}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
});

DotField.displayName = 'DotField';

export default DotField;
