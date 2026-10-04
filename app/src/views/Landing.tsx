'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Gauge,
  Zap,
  WifiOff,
  ShieldCheck,
  LineChart,
  FileCheck2,
  CheckCircle2,
  Sparkles,
  Lock,
  Layers,
  Award,
} from 'lucide-react';
import { Link } from '@/lib/navigation';
import { Logo } from '../components/layout/AppShell';
import { PRODUCT_NAME } from '../domain/constants';
import { Reveal } from '../components/ui/motion';
import TableFormulationSimulation from '../components/simulation/TableFormulationSimulation';
import JellyRadio from '../components/ui/JellyRadio';
import DotField from '../components/ui/DotField';

const PROCESS = [
  { label: 'Configure', icon: Gauge, desc: 'Instrument serial & e-interval' },
  { label: 'Test Load', icon: Zap, desc: 'Guided points with delta weights' },
  { label: 'Calculate', icon: LineChart, desc: 'Automatic P, E & Ec formulation' },
  { label: 'Verify', icon: ShieldCheck, desc: 'OIML MPE tolerance corridor' },
  { label: 'Report', icon: FileCheck2, desc: 'Tamper-evident SHA-256 PDF' },
];

const MARQUEE = [
  'Class I High Precision',
  'Class II Laboratory',
  'Class III Industrial Scales',
  'Class IIII High Capacity',
  'Zero Indication',
  'Eccentric Loading',
  'Repeatability (r ≤ 0.2e)',
  'Tare Balancing',
  'Discrimination Threshold',
  '2026 Substitution Rules',
  'GSR 568(E)',
  'Weighbridges',
  'Legal Metrology Division',
];

const USPS = [
  {
    icon: Zap,
    title: 'Zero Manual Mathematics',
    body: 'Enter observed indication and extra weights. True indication P = I + 0.5d - ΔL, raw error, and zero correction compute in real time.',
  },
  {
    icon: ShieldCheck,
    title: 'Statutory MPE Corridors',
    body: 'Automated adherence checks against OIML R-76-1:2006 and the Indian Legal Metrology Rules (Seventh Schedule).',
  },
  {
    icon: WifiOff,
    title: 'Offline-First Local Vault',
    body: 'Operates in remote weighbridges, mandis, and field testing sites without requiring internet. Syncs securely when reconnected.',
  },
  {
    icon: Lock,
    title: 'Tamper-Evident Reporting',
    body: 'Cryptographically sealed certificates with SHA-256 integrity fingerprints and offline verifiable QR verification codes.',
  },
];

const MODE_DETAILS: Record<string, { title: string; standard: string; rule: string }> = {
  'OIML R-76-1': {
    title: 'International Metrology Standard',
    standard: 'OIML R 76-1:2006 / OIML R 76-2:2007',
    rule: 'Global standard for Non-Automatic Weighing Instruments covering verification scale intervals (e), maximum permissible errors, and pattern approval.',
  },
  'Seventh Schedule': {
    title: 'Indian Legal Metrology Rules 2011',
    standard: 'Legal Metrology (General) Rules, 2011',
    rule: 'National requirements for trade instruments, weighbridges, verification seals, and mandatory periodic re-verification.',
  },
  '2026 Substitution': {
    title: 'Substitution Weight Rules',
    standard: 'Fourth Amendment Rules 2026 / GSR 568(E)',
    rule: 'Statutory minimum standard weights (20%, 33.3%, or 50% Max) based on repeatability spread r ≤ 0.2e or r ≤ 0.3e.',
  },
};

export default function Landing() {
  const [selectedStandard, setSelectedStandard] = useState('OIML R-76-1');

  return (
    <div className="relative min-h-screen bg-paper text-ink selection:bg-champagne-300 selection:text-espresso-950 overflow-x-hidden">
      {/* Background Interactive DotField */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <DotField
          dotRadius={1.6}
          dotSpacing={26}
          cursorRadius={350}
          bulgeStrength={65}
          glowRadius={190}
          sparkle={true}
          waveAmplitude={0}
          gradientFrom="rgba(71, 85, 105, 0.45)"
          gradientTo="rgba(100, 116, 139, 0.35)"
          glowColor="rgba(99, 102, 241, 0.28)"
        />
      </div>

      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur px-5 sm:px-8 py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Left: Action Components */}
          <div className="flex items-center gap-3">
            <Link
              to="/verify"
              className="hidden sm:inline-flex text-xs font-semibold text-espresso-700 hover:text-espresso-950"
            >
              Verify Certificate
            </Link>
            <Link
              to="/login"
              className="btn-primary !px-4 !py-2 text-xs"
            >
              Access Platform <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Right: Only Logo and Name */}
          <Link to="/" className="flex items-center gap-3 group">
            <Logo />
            <span className="font-display text-base font-bold tracking-tight text-espresso-800 group-hover:text-espresso-950 transition-colors">
              {PRODUCT_NAME}
            </span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-5 pt-12 pb-16 sm:px-8 lg:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-champagne-300 bg-champagne-200/60 px-3.5 py-1 text-xs font-semibold text-espresso-800">
            <Sparkles className="h-3.5 w-3.5 text-accent-700" />
            Legal Metrology &amp; Type Approval Engine
          </div>

          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-espresso-800 sm:text-5xl lg:text-6xl">
            From weighing test to <span className="underline decoration-accent-500 underline-offset-4">verified report</span>.
          </h1>

          <p className="mt-5 text-base sm:text-lg leading-relaxed text-ink-soft">
            The deterministic digital platform for non-automatic weighing instruments conforming to{' '}
            <strong className="text-espresso-800 font-semibold">OIML R 76-1:2006</strong> and the{' '}
            <strong className="text-espresso-800 font-semibold">Legal Metrology Rules</strong>. Guided checks,
            instant mathematical formulation, transparent tolerance corridors, and tamper-evident PDF certificates.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login" className="btn-primary h-11 px-6 text-sm">
              Start Verification <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#simulation" className="btn-ghost h-11 px-6 text-sm">
              Explore Live Formulation
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-ink-faint">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-pass-fg" /> Zero manual rounding errors
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-pass-fg" /> MPE tolerance envelopes
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-pass-fg" /> 100% offline-ready
            </span>
          </div>
        </div>

        {/* Live Table Formulation Simulation (Replaces 3D Scene) */}
        <div id="simulation" className="mt-12">
          <TableFormulationSimulation />
        </div>
      </section>

      {/* Marquee Bar with Solid Champagne Theme */}
      <div className="border-y border-line bg-champagne-200/50 py-3">
        <div className="flex overflow-hidden">
          <div className="flex shrink-0 animate-marquee items-center gap-3 pr-3">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span
                key={i}
                className="whitespace-nowrap rounded-full border border-champagne-300 bg-surface px-3.5 py-1 text-xs font-semibold text-espresso-700 shadow-card"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Standard Ruleset Explorer with JellyRadio */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-card text-center">
          <h2 className="font-display text-2xl font-bold text-espresso-800 sm:text-3xl">
            Authoritative Statutory Frameworks
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-faint">
            Inspect pre-configured regulatory rulesets built into the calculation core.
          </p>

          <div className="mt-6 flex justify-center">
            <JellyRadio
              items={['OIML R-76-1', 'Seventh Schedule', '2026 Substitution']}
              value={selectedStandard}
              onChange={(val) => setSelectedStandard(val)}
              chipColor="#F4ECE1"
              activeColor="#2D2421"
              textColor="#52433A"
              activeTextColor="#FAF6F0"
              size="md"
              gap={8}
              radius={16}
            />
          </div>

          <div className="mt-6 mx-auto max-w-2xl rounded-xl border border-line bg-champagne-50 p-5 text-left">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-accent-700" />
              <span className="font-display text-base font-bold text-espresso-800">
                {MODE_DETAILS[selectedStandard]?.title}
              </span>
              <span className="rounded-md bg-champagne-200 px-2 py-0.5 text-[11px] font-bold text-espresso-700">
                {MODE_DETAILS[selectedStandard]?.standard}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              {MODE_DETAILS[selectedStandard]?.rule}
            </p>
          </div>
        </div>
      </section>

      {/* 5-Step Process */}
      <section id="flow" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-espresso-800 sm:text-3xl">
            Five Steps. Deterministic Compliance.
          </h2>
          <p className="mt-2 text-sm text-ink-faint">
            From field scale configuration to a digitally stamped and sealed certificate.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {PROCESS.map((s, i) => (
            <div
              key={s.label}
              className="flex flex-col items-center rounded-2xl border border-line bg-surface p-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-accent-400"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-champagne-200 text-espresso-800 shadow-card">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-bold text-espresso-800">{s.label}</div>
              <div className="text-[11px] font-medium text-ink-faint">Step {i + 1}</div>
              <div className="mt-1 text-[11px] text-ink-soft leading-tight">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Key USPS */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl font-bold text-espresso-800 sm:text-3xl">
            Designed for Metrologists &amp; Field Officers
          </h2>
          <p className="mt-2 text-sm text-ink-faint">
            Built from statutory metrology codes — not generic form templates.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {USPS.map((u) => (
            <div
              key={u.title}
              className="rounded-2xl border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent-400"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-200 text-rose-700">
                <u.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-espresso-800">{u.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Solid CTA Banner */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="rounded-3xl border border-line bg-espresso-950 p-8 sm:p-12 text-center text-champagne-100 shadow-panel">
          <h2 className="font-display text-2xl font-bold text-champagne-100 sm:text-4xl">
            Ready to conduct an OIML R-76 verification?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-champagne-200/80">
            Sign in instantly to test the demo weighbridge or register a custom instrument. No password required.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              to="/login"
              className="btn bg-champagne-500 text-espresso-950 hover:bg-champagne-400 font-bold px-6 py-3 text-sm shadow-card"
            >
              Enter Verification Suite <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Solid Footer */}
      <footer className="border-t border-line bg-surface py-8 text-center text-xs text-ink-faint">
        <div className="mx-auto max-w-7xl px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo className="!h-6 !w-6" />
            <span className="font-bold text-espresso-800">{PRODUCT_NAME}</span>
            <span>· Department of Consumer Affairs Legal Metrology Division</span>
          </div>
          <div>Conforms to OIML R 76-1:2006 &amp; Indian Legal Metrology Rules.</div>
        </div>
      </footer>
    </div>
  );
}
