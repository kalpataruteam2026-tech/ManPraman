import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { BackgroundGradient } from '../components/ui/BackgroundGradient';
import AuthForm from '../components/auth/AuthForm';
import { PRODUCT_NAME } from '../domain/constants';

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
        {/* Left Side: Logo and Application Name in One Line, Badges & Metrology Credential */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left px-4 sm:px-6">
          {/* Logo and Application Name arranged in one line without any white background */}
          <div className="flex items-center gap-3.5 sm:gap-4 mb-3">
            <img
              src="/logo.png"
              alt="ManPraman Logo"
              className="h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 object-contain shrink-0 transition-transform duration-200 hover:scale-105"
            />
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-espresso-950">
              {PRODUCT_NAME}
            </h1>
          </div>

          <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-espresso-200/80 bg-white/80 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-espresso-800 shadow-xs backdrop-blur-xs">
            <span>OIML R 76-1:2006</span>
            <span className="text-espresso-400">·</span>
            <span>NAWI Verification Platform</span>
          </div>

          <p className="mt-4 text-sm sm:text-base text-ink-soft leading-relaxed max-w-md">
            The national deterministic calculation, inspection, and statutory compliance certification engine for Non-Automatic Weighing Instruments.
          </p>

          {/* Clearly visible divider line below the description */}
          <div className="mt-8 pt-6 border-t-2 border-slate-300 w-full max-w-md flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>National Metrology Directorate</span>
            </div>
            <span className="font-mono text-[11px] text-espresso-600 font-semibold">Legal Metrology Division</span>
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
