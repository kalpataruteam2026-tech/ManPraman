'use client';

import { useEffect } from 'react';
import { useNavigate } from '@/lib/navigation';
import { useAppStore } from '../store/useAppStore';
import { BackgroundGradient } from '../components/ui/BackgroundGradient';
import AuthForm from '../components/auth/AuthForm';

export default function Login() {
  const currentUser = useAppStore((s) => s.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) navigate('/app');
  }, [currentUser, navigate]);

  return (
    <div className="relative min-h-screen bg-paper text-ink overflow-x-hidden flex items-center justify-center p-4 sm:p-8">
      {/* Inside background with grid and archival paper grain texture */}
      <BackgroundGradient />

      {/* Main 2-Column Responsive Layout on inside background */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center my-auto py-4">
        {/* Left Side: Full-Size Logo, Application Name, and Metrology Credential Header */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left px-4 sm:px-6">
          {/* Full-Size Logo */}
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-espresso-950 text-champagne-100 shadow-2xl border border-espresso-800/80 mb-6 transition-transform hover:scale-105">
            <svg
              viewBox="0 0 64 64"
              className="h-14 w-14 text-accent-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M32 10v44M14 18h36M14 18l-8 16a8 8 0 0 0 16 0zM50 18l-8 16a8 8 0 0 0 16 0zM20 54h24" />
            </svg>
          </div>

          {/* Application Name with appropriate typography & styling */}
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-espresso-950">
            MetroCert
          </h1>

          <div className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-espresso-200/80 bg-white/80 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-espresso-800 shadow-xs backdrop-blur-xs">
            <span>OIML R 76-1:2006</span>
            <span className="text-espresso-400">·</span>
            <span>NAWI Verification Platform</span>
          </div>

          <p className="mt-4 text-sm text-ink-soft leading-relaxed max-w-md">
            The national deterministic calculation, inspection, and statutory compliance certification engine for Non-Automatic Weighing Instruments.
          </p>

          {/* Official Directorate Badge */}
          <div className="mt-8 pt-6 border-t border-line/80 w-full max-w-md flex flex-col sm:flex-row items-center justify-between text-xs text-ink-faint gap-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>National Metrology Directorate</span>
            </div>
            <span className="font-mono text-[11px] text-espresso-600">Legal Metrology Division</span>
          </div>
        </div>

        {/* Right Side: Clean White Auth Form Card */}
        <div className="flex justify-center w-full">
          <div className="w-full max-w-xl">
            <AuthForm onSuccess={() => navigate('/app')} />
          </div>
        </div>
      </div>
    </div>
  );
}
