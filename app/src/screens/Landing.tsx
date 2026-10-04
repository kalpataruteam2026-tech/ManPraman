import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Gauge, Zap, WifiOff, ShieldCheck, LineChart, ScanLine,
  FileCheck2, GitBranch, Sparkles, CheckCircle2, XCircle,
} from 'lucide-react';
import { Logo } from '../components/layout/AppShell';
import { PRODUCT_NAME } from '../domain/constants';
import { Reveal } from '../components/ui/motion';
import DotField from '../components/ui/DotField';

const BalanceScene = lazy(() => import('../components/three/BalanceScene'));

const PROCESS = [
  { label: 'Configure', icon: Gauge },
  { label: 'Test', icon: Zap },
  { label: 'Calculate', icon: LineChart },
  { label: 'Verify', icon: ShieldCheck },
  { label: 'Report', icon: FileCheck2 },
];

const MARQUEE = ['Class I', 'Class II', 'Class III', 'Class IIII', 'Zero', 'Weighing', 'Repeatability', 'Eccentricity', 'Tare', 'Discrimination', 'Weighbridges', 'Retail scales', 'Lab balances'];

const USPS = [
  { icon: Zap, title: 'No more manual maths', body: 'Enter what the scale shows. Errors, tolerances and the verdict are worked out for you, instantly.' },
  { icon: CheckCircle2, title: 'Know exactly why', body: 'Every pass or fail comes with the numbers behind it and the rule it was measured against.' },
  { icon: LineChart, title: 'See it on a curve', body: 'Watch the error plot live against the permitted band as you type. Out-of-tolerance points light up.' },
  { icon: WifiOff, title: 'Works in the field', body: 'Full testing and reporting with no signal — at a mandi, a weighbridge or a factory floor.' },
  { icon: FileCheck2, title: 'Reports in one tap', body: 'A clean, signed, shareable report — with a QR anyone can scan to check it is genuine.' },
  { icon: GitBranch, title: 'Always up to date', body: 'Rules can change without ever rewriting old reports. History stays exactly as it was.' },
  { icon: ScanLine, title: 'Snap the nameplate', body: 'Photograph the plate and let it read the details — you just confirm. Fewer typos, faster start.' },
  { icon: ShieldCheck, title: 'Tamper-evident', body: 'Each report carries a fingerprint, so any change to it is detectable later.' },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-950 text-white">
      {/* Aurora & Interactive DotField background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[40rem] w-[40rem] rounded-full bg-accent-500/25 blur-[130px] animate-aurora" />
        <div className="absolute right-[-10rem] top-10 h-[34rem] w-[34rem] rounded-full bg-iris-500/30 blur-[130px] animate-aurora2" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-accent-400/20 blur-[130px] animate-float" />
        <div className="absolute inset-0 bg-grid-slate opacity-[0.08] [background-size:44px_44px]" />
        <div className="absolute inset-0 opacity-40">
          <DotField
            dotRadius={1.4}
            dotSpacing={18}
            cursorRadius={400}
            bulgeStrength={55}
            glowRadius={160}
            sparkle={true}
            waveAmplitude={0.5}
            gradientFrom="rgba(56, 189, 248, 0.4)"
            gradientTo="rgba(129, 140, 248, 0.25)"
            glowColor="rgba(56, 189, 248, 0.2)"
          />
        </div>
      </div>

      {/* Nav */}
      <header className="relative z-20">
        <div className="mx-auto mt-4 flex max-w-7xl items-center justify-between rounded-2xl border border-white/10 px-4 py-3 glass-dark sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo />
            <div className="leading-tight">
              <div className="text-base font-extrabold tracking-tight">{PRODUCT_NAME}</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent-400">OIML R 76 · NAWI</div>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#flow" className="transition hover:text-white">How it works</a>
            <Link to="/verify" className="transition hover:text-white">Verify a report</Link>
          </nav>
          <Link to="/login" className="btn-accent sheen">Open Platform <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-5 pb-12 pt-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-200"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent-400" />
            Smart India Hackathon 2026 · Dept. of Consumer Affairs
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
          >
            From weighing test<br />to <span className="text-gradient">verified report.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300"
          >
            The digital way to test weighing instruments. Guided checks, instant calculations, a clear
            pass or fail — and an audit-ready report, online or completely offline.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.19 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link to="/login" className="btn-accent sheen h-12 px-6 text-base">
              Start a test <ArrowRight className="h-5 w-5" />
            </Link>
            <a href="#flow" className="btn h-12 border border-white/20 px-6 text-base text-white hover:bg-white/5">
              See how it works
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-400"
          >
            {['Zero manual calculation', 'Explainable pass / fail', 'Works fully offline'].map((t) => (
              <span key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent-400" /> {t}</span>
            ))}
          </motion.div>
        </div>

        {/* 3D + floating cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }}
          className="relative"
        >
          <div className="relative h-[340px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-glow-iris sm:h-[440px]">
            <Suspense fallback={<div className="flex h-full items-center justify-center text-slate-500"><Gauge className="h-10 w-10 animate-pulse" /></div>}>
              <BalanceScene />
            </Suspense>
          </div>

          {/* Floating verdict chips */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="absolute -left-3 top-8 flex items-center gap-2 rounded-xl border border-white/10 bg-white px-3 py-2 text-ink shadow-panel sm:-left-6"
          >
            <CheckCircle2 className="h-4 w-4 text-pass-fg" />
            <div className="text-xs"><b>PASS</b> · Ec +0.02 kg <span className="text-ink-faint">/ ±0.05</span></div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            className="absolute -right-3 bottom-10 flex items-center gap-2 rounded-xl border border-white/10 bg-white px-3 py-2 text-ink shadow-panel sm:-right-6"
          >
            <XCircle className="h-4 w-4 text-fail-fg" />
            <div className="text-xs"><b>FAIL</b> · exceeds MPE by 0.08 kg</div>
          </motion.div>
        </motion.div>
      </section>

      {/* Marquee */}
      <div className="relative z-10 border-y border-white/10 py-4">
        <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="flex shrink-0 animate-marquee items-center gap-3 pr-3">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-300">{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Flow */}
      <section id="flow" className="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <Reveal><h2 className="text-center font-display text-3xl font-bold sm:text-4xl">Five steps. One clean report.</h2></Reveal>
        <div className="relative mt-12 grid grid-cols-2 gap-6 sm:grid-cols-5">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-accent-500/40 to-transparent sm:block" />
          {PROCESS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="relative flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-brand-gradient shadow-glow">
                <s.icon className="h-6 w-6 text-white" />
              </div>
              <div className="mt-3 text-sm font-semibold">{s.label}</div>
              <div className="text-xs text-slate-500">Step {i + 1}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <Reveal>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Built for the people who do the testing</h2>
          <p className="mt-3 max-w-2xl text-slate-300">Everything an inspector or lab engineer needs — and nothing that gets in the way.</p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {USPS.map((u, i) => (
            <Reveal key={u.title} delay={(i % 4) * 0.06}>
              <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent-400/40 hover:bg-white/[0.06]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-accent-400 transition group-hover:bg-brand-gradient group-hover:text-white">
                  <u.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold">{u.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{u.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-brand-gradient bg-[length:200%_200%] p-10 text-center animate-gradient-x">
            <div className="absolute inset-0 bg-grid-slate opacity-20 [background-size:32px_32px]" />
            <h2 className="relative font-display text-3xl font-bold sm:text-4xl">Ready to run your first test?</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-white/85">Pick a role and try the live demo instrument — it takes under five minutes.</p>
            <Link to="/login" className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-bold text-navy-900 transition hover:-translate-y-0.5">
              Open the platform <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-slate-500">
        {PRODUCT_NAME} · A digital OIML R 76 testing platform. Demonstration build.
      </footer>
    </div>
  );
}
