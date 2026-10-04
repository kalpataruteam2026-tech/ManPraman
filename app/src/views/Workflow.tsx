'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Settings,
  Scale,
  FileSpreadsheet,
  Calculator,
  ShieldCheck,
  FileBadge,
  QrCode,
  ArrowRight,
  Database,
  ArrowDown,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from '../components/ui/misc';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  })
};

const lineVariant = {
  hidden: { scaleY: 0, opacity: 0 },
  visible: (i: number) => ({
    scaleY: 1,
    opacity: 1,
    transition: { delay: i * 0.15 + 0.3, duration: 0.5, ease: "easeOut" }
  })
};

const NodeCard = ({ title, icon: Icon, desc, role, delayIdx, status }: any) => {
  const roleColors: Record<string, string> = {
    'Admin': 'bg-espresso-900 text-champagne-200 border-espresso-700',
    'Tester': 'bg-accent-600 text-white border-accent-500',
    'Reviewer': 'bg-iris-600 text-white border-iris-500',
    'System': 'bg-paper text-ink border-line shadow-card'
  };

  return (
    <motion.div
      custom={delayIdx}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={fadeIn}
      className={`relative rounded-2xl border p-5 ${roleColors[role] || roleColors['System']} flex flex-col sm:flex-row items-start sm:items-center gap-5 transition-transform hover:-translate-y-1 hover:shadow-panel`}
    >
      <div className={`p-3 rounded-xl ${role === 'System' ? 'bg-champagne-200 text-espresso-800' : 'bg-white/10 text-white'}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${role === 'System' ? 'bg-espresso-100 text-espresso-800' : 'bg-white/20 text-white'}`}>
            {role}
          </span>
          {status === 'pass' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          {status === 'fail' && <AlertCircle className="w-4 h-4 text-rose-400" />}
        </div>
        <h3 className="font-display font-bold text-lg">{title}</h3>
        <p className={`text-sm mt-1 leading-relaxed ${role === 'System' ? 'text-ink-soft' : 'text-white/80'}`}>
          {desc}
        </p>
      </div>
    </motion.div>
  );
};

export default function Workflow() {
  return (
    <div className="min-h-screen bg-paper pb-20">
      <div className="max-w-4xl mx-auto px-6 pt-12">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center p-3 bg-champagne-200 text-espresso-900 rounded-2xl mb-6 shadow-sm border border-champagne-300">
            <Database className="w-8 h-8" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-espresso-900 tracking-tight">
            ManPraman Workflow
          </h1>
          <p className="mt-4 text-ink-soft max-w-2xl mx-auto text-lg">
            A comprehensive overview of the Non-Automatic Weighing Instrument (NAWI) testing lifecycle, from configuration to secure certification.
          </p>
        </motion.div>

        <div className="relative">
          {/* Central Line */}
          <div className="absolute left-[39px] sm:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-accent-300 to-transparent -translate-x-1/2 hidden sm:block" />

          <div className="space-y-12 relative">
            
            {/* Phase 1 */}
            <div className="relative">
              <div className="sticky top-6 z-10 bg-paper/90 backdrop-blur-md inline-block px-4 py-1.5 rounded-full border border-line text-xs font-bold text-ink-soft uppercase tracking-widest mb-8 sm:ml-[50%] sm:-translate-x-1/2 shadow-sm">
                Phase 1: Setup
              </div>
              <div className="grid sm:grid-cols-2 gap-8">
                <NodeCard 
                  delayIdx={1}
                  role="Admin" 
                  title="System Configuration" 
                  icon={Settings} 
                  desc="Provision user accounts, configure OIML R-76 rulesets, and manage master instrument catalogs." 
                />
                <div className="hidden sm:flex items-center justify-center">
                  <motion.div custom={2} initial="hidden" whileInView="visible" variants={fadeIn} className="text-ink-faint">
                    <ArrowRight className="w-8 h-8 opacity-50" />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Phase 2 */}
            <div className="relative pt-4">
              <div className="sticky top-6 z-10 bg-paper/90 backdrop-blur-md inline-block px-4 py-1.5 rounded-full border border-line text-xs font-bold text-ink-soft uppercase tracking-widest mb-8 sm:ml-[50%] sm:-translate-x-1/2 shadow-sm">
                Phase 2: Execution
              </div>
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="hidden sm:block" />
                <NodeCard 
                  delayIdx={3}
                  role="Tester" 
                  title="Test Initiation" 
                  icon={Scale} 
                  desc="Creates a new test session (Field/Lab mode) and selects the registered instrument under test." 
                />
                <NodeCard 
                  delayIdx={4}
                  role="System" 
                  title="Dynamic Test Plan" 
                  icon={FileSpreadsheet} 
                  desc="Metrology engine auto-generates test points and MPE tiers based on accuracy class and stage." 
                />
                <div className="hidden sm:block" />
                <div className="hidden sm:block" />
                <NodeCard 
                  delayIdx={5}
                  role="Tester" 
                  title="Data Ingestion" 
                  icon={Database} 
                  desc="Inputs observation data manually or imports bulk data via spreadsheet templates." 
                />
                <NodeCard 
                  delayIdx={6}
                  role="System" 
                  title="Deterministic Engine" 
                  icon={Calculator} 
                  desc="Calculates True Indication (P), Error (E), and Corrected Error (Ec) against statutory MPE corridors in real-time." 
                />
                <div className="hidden sm:block" />
              </div>
            </div>

            {/* Phase 3 */}
            <div className="relative pt-4">
              <div className="sticky top-6 z-10 bg-paper/90 backdrop-blur-md inline-block px-4 py-1.5 rounded-full border border-line text-xs font-bold text-ink-soft uppercase tracking-widest mb-8 sm:ml-[50%] sm:-translate-x-1/2 shadow-sm">
                Phase 3: Verification
              </div>
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="hidden sm:block" />
                <NodeCard 
                  delayIdx={7}
                  role="Reviewer" 
                  title="Compliance Review" 
                  icon={ShieldCheck} 
                  desc="Inspects detailed calculation traces, visual error curves, and validates adherence to OIML guidelines." 
                />
              </div>
            </div>

            {/* Phase 4 */}
            <div className="relative pt-4">
              <div className="sticky top-6 z-10 bg-paper/90 backdrop-blur-md inline-block px-4 py-1.5 rounded-full border border-line text-xs font-bold text-ink-soft uppercase tracking-widest mb-8 sm:ml-[50%] sm:-translate-x-1/2 shadow-sm">
                Phase 4: Reporting
              </div>
              <div className="grid sm:grid-cols-2 gap-8">
                <NodeCard 
                  delayIdx={8}
                  role="System" 
                  title="Tamper-Evident Report" 
                  icon={FileBadge} 
                  status="pass"
                  desc="Generates an official PDF report embedded with cryptographic SHA-256 seals." 
                />
                <NodeCard 
                  delayIdx={9}
                  role="System" 
                  title="QR Verification" 
                  icon={QrCode} 
                  desc="Instantly verifiable certificate through public QR code scanning, ensuring document integrity." 
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
