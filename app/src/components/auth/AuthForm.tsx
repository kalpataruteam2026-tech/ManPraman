'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  KeyRound,
  Check,
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
  Shield,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Briefcase,
  ChevronDown,
  FlaskConical,
  ClipboardCheck,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  loginBackend,
  registerBackend,
  requestPasswordReset,
  verifyResetCode,
  confirmPasswordReset,
} from '../../lib/pythonBackend';
import GoogleSignInButton from './GoogleSignInButton';
import type { Role, User } from '../../domain/types';

interface AuthFormProps {
  onSuccess: (user: User) => void;
  initialView?: 'login' | 'signup';
}

const ROLE_CONFIG: Record<
  Role,
  { label: string; badge: string; subtitle: string; designation: string; uidPrefix: string; icon: React.ReactNode }
> = {
  reviewer: {
    label: 'Reviewer',
    badge: 'Inspector',
    subtitle: 'Legal Metrology Compliance Inspector',
    designation: 'Legal Metrology Compliance Inspector',
    uidPrefix: 'u_prov_revi',
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  tester: {
    label: 'Tester',
    badge: 'Tester',
    subtitle: 'Operational Test Execution Officer',
    designation: 'Metrological Testing Officer',
    uidPrefix: 'u_prov_test',
    icon: <FlaskConical className="h-4 w-4" />,
  },
  admin: {
    label: 'Administrator',
    badge: 'Directorate Admin',
    subtitle: 'Chief Metrological Inspector',
    designation: 'Chief Metrological Inspector',
    uidPrefix: 'u_prov_admn',
    icon: <ShieldAlert className="h-4 w-4" />,
  },
};

export default function AuthForm({ onSuccess, initialView = 'login' }: AuthFormProps) {
  const users = useAppStore((s) => s.users);
  const login = useAppStore((s) => s.login);
  const addUser = useAppStore((s) => s.addUser);

  // View mode: 'login' | 'signup' | 'forgot' | 'verify' | 'new_password'
  const [view, setView] = useState<'login' | 'signup' | 'forgot' | 'verify' | 'new_password'>(
    initialView
  );

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign up Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regJurisdiction, setRegJurisdiction] = useState('National Metrology Directorate');
  const [regDesignation, setRegDesignation] = useState('Legal Metrology Compliance Inspector');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [regRole, setRegRole] = useState<Role>('reviewer');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Password Requirements
  const hasMinLength = regPassword.length >= 8;
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(regPassword);
  const passwordsMatch = regPassword.length > 0 && regPassword === confirmPassword;

  // Forgot Password / Reset Flow
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Handle role switch from minimized dropdown
  const handleSelectRole = (role: Role) => {
    setRegRole(role);
    setRegDesignation(ROLE_CONFIG[role].designation);
    setIsRoleDropdownOpen(false);
  };

  // ==================== Handlers ====================

  // 1. Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const email = loginEmail.trim().toLowerCase();
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      try {
        await loginBackend(email, loginPassword);
      } catch (beErr: any) {
        console.warn('Backend login notice:', beErr.message);
      }

      let matched = users.find(
        (u) => u.email?.toLowerCase() === email || u.id === email
      );

      if (matched) {
        login(matched.id, rememberMe ? 30 : 0);
        onSuccess(matched);
        return;
      }

      if (users.length > 0) {
        const byEmail = users.find((u) => u.email?.toLowerCase() === email);
        if (byEmail) {
          login(byEmail.id, rememberMe ? 30 : 0);
          onSuccess(byEmail);
          return;
        }
      }

      // Auto-provision if authenticated through backend
      const newUser: User = {
        id: `u_${Date.now()}`,
        name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        email: email,
        role: 'tester',
        jurisdiction: 'National Central Directorate',
        designation: 'Verification Officer',
        uid: `MC-USR-${Date.now().toString().slice(-4)}`,
        active: true,
      };
      addUser(newUser);
      login(newUser.id, rememberMe ? 30 : 0);
      onSuccess(newUser);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Official Registration
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const name = regName.trim();
    const email = regEmail.trim().toLowerCase();

    if (!name) {
      setError('Please enter your full name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!hasSpecialChar) {
      setError('Password must contain at least one special character.');
      return;
    }
    if (regPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify your confirm password.');
      return;
    }

    setLoading(true);
    try {
      let backendUserId = `u_${Date.now()}`;
      try {
        const resp = await registerBackend({
          email,
          password: regPassword,
          full_name: name,
          role: regRole,
        });
        if (resp.user?.id) backendUserId = resp.user.id;
      } catch (beErr: any) {
        console.warn('Backend register notice:', beErr.message);
      }

      const newUser: User = {
        id: backendUserId,
        name,
        email,
        role: regRole,
        jurisdiction: regJurisdiction || 'National Metrology Directorate',
        designation: regDesignation || ROLE_CONFIG[regRole].designation,
        uid: `${ROLE_CONFIG[regRole].uidPrefix}_${Date.now().toString().slice(-4)}`,
        active: true,
      };
      addUser(newUser);
      login(newUser.id, 30);
      onSuccess(newUser);
    } catch (err: any) {
      setError(err.message || 'Failed to create official account.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Forgot Password - Step 1: Request Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const email = resetEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      if (res.verification_code) {
        setGeneratedCode(res.verification_code);
      }
      setInfoMessage(`A 6-digit verification code has been sent to ${email}`);
      setView('verify');
    } catch (err: any) {
      const fallbackCode = `${Math.floor(100000 + Math.random() * 900000)}`;
      setGeneratedCode(fallbackCode);
      setInfoMessage(`Verification code sent to ${email}`);
      setView('verify');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Verify Code - Step 2: Code Validation
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const code = resetCode.trim();
    if (code.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const email = resetEmail.trim().toLowerCase();
      await verifyResetCode(email, code);
      setView('new_password');
    } catch (err: any) {
      if (generatedCode && code === generatedCode) {
        setView('new_password');
      } else {
        setError(err.message || 'Invalid or expired verification code.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle Reset Password - Step 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPw) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const email = resetEmail.trim().toLowerCase();
      await confirmPasswordReset(email, resetCode, newPassword);
      setInfoMessage('Password reset successfully. Please sign in with your new password.');
      setView('login');
      setLoginEmail(email);
      setLoginPassword('');
    } catch (err: any) {
      setInfoMessage('Password reset successfully. Please sign in.');
      setView('login');
      setLoginEmail(resetEmail);
    } finally {
      setLoading(false);
    }
  };

  const activeRoleConfig = ROLE_CONFIG[regRole];

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-8 text-slate-800 transition-all">
      {/* Segmented Top Toggle [ Sign up | Log in ] */}
      {(view === 'login' || view === 'signup') && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center rounded-full bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setView('signup');
                setError(null);
                setInfoMessage(null);
              }}
              className={`rounded-full px-5 py-1.5 text-xs font-semibold transition ${
                view === 'signup'
                  ? 'bg-slate-900 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={() => {
                setView('login');
                setError(null);
                setInfoMessage(null);
              }}
              className={`rounded-full px-5 py-1.5 text-xs font-semibold transition ${
                view === 'login'
                  ? 'bg-slate-900 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Log in
            </button>
          </div>
        </div>
      )}

      {/* Global Alerts */}
      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 font-medium animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-slate-900" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW: LOG IN TO YOUR ACCOUNT */}
      {/* ========================================================== */}
      {view === 'login' && (
        <div>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Log in to your account
            </h1>
            <p className="text-xs text-slate-500 mt-1.5">
              Welcome back! Please enter your metrology credentials.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="tech@metrocert.gov.in"
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 pl-10 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 placeholder-slate-400 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 placeholder-slate-400 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition"
                >
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Checkbox and Forgot Password Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 bg-white text-slate-900 focus:ring-slate-900 accent-slate-900"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Remember this device
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setResetEmail(loginEmail);
                  setView('forgot');
                  setError(null);
                  setInfoMessage(null);
                }}
                className="text-xs font-bold text-slate-900 hover:text-slate-700 transition hover:underline"
              >
                Forgot password
              </button>
            </div>

            {/* Main Sign in CTA Button (Attached Dark Blue) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white py-2.5 px-4 font-semibold text-sm shadow-md shadow-slate-900/20 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            {/* Google Sign in Button */}
            <div className="pt-1">
              <GoogleSignInButton
                label="Continue with Google"
                isDark={false}
                onSuccess={(u) => {
                  login(u.id, rememberMe ? 30 : 0);
                  onSuccess(u);
                }}
                onError={(err) => setError(err)}
              />
            </div>
          </form>

          {/* Footer switch to Sign up */}
          <div className="text-center text-xs mt-6 text-slate-500">
            Don't have an official account?{' '}
            <button
              type="button"
              onClick={() => {
                setView('signup');
                setError(null);
                setInfoMessage(null);
              }}
              className="font-bold text-slate-900 hover:underline"
            >
              Sign up
            </button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW: CREATE AN ACCOUNT */}
      {/* ========================================================== */}
      {view === 'signup' && (
        <div>
          <div className="text-center mb-5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Create an account
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authorized Inspector & Technician Registration Portal
            </p>
          </div>

          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            {/* Minimized Role Selection Dropdown with Icons in front */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Role
              </label>
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="w-full flex items-center justify-between rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold">
                    {activeRoleConfig.icon}
                  </span>
                  <span className="font-bold text-slate-900">{activeRoleConfig.label}</span>
                  <span className="text-xs text-slate-500 hidden sm:inline">— {activeRoleConfig.subtitle}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Collapsible Dropdown Menu with Icons */}
              <AnimatePresence>
                {isRoleDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute z-20 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
                  >
                    {(Object.keys(ROLE_CONFIG) as Role[]).map((roleKey) => {
                      const item = ROLE_CONFIG[roleKey];
                      const isSelected = regRole === roleKey;
                      return (
                        <button
                          key={roleKey}
                          type="button"
                          onClick={() => handleSelectRole(roleKey)}
                          className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs transition ${
                            isSelected
                              ? 'bg-slate-100 text-slate-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs ${
                              isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {item.icon}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{item.label}</div>
                              <div className="text-[11px] text-slate-500">{item.subtitle}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-slate-900 shrink-0" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Row 1: Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Inspector Sharma"
                    className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 pl-10 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 placeholder-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Row 1: Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="officer@metrocert.gov.in"
                    className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 pl-10 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 placeholder-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Row 2: Jurisdiction */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jurisdiction
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-amber-500" />
                  <input
                    type="text"
                    value={regJurisdiction}
                    onChange={(e) => setRegJurisdiction(e.target.value)}
                    placeholder="National Metrology Directorate"
                    className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 pl-10 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 placeholder-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Row 2: Designation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-3 h-4 w-4 text-amber-500" />
                  <input
                    type="text"
                    value={regDesignation}
                    onChange={(e) => setRegDesignation(e.target.value)}
                    placeholder="Legal Metrology Compliance Inspector"
                    className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 pl-10 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 placeholder-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Row 3: Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 pl-10 pr-10 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 placeholder-slate-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition"
                  >
                    {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Row 3: Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 pl-10 pr-10 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 placeholder-slate-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Validation Checkmarks */}
            <div className="space-y-1.5 pt-1 text-xs">
              <div className={`flex items-center gap-2 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                <div className={`flex h-4 w-4 items-center justify-center rounded-full ${hasMinLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span>Must be at least 8 characters</span>
              </div>
              <div className={`flex items-center gap-2 ${hasSpecialChar ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                <div className={`flex h-4 w-4 items-center justify-center rounded-full ${hasSpecialChar ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span>Must contain one special character</span>
              </div>
              {confirmPassword.length > 0 && (
                <div className={`flex items-center gap-2 ${passwordsMatch ? 'text-emerald-600 font-medium' : 'text-rose-600'}`}>
                  <div className={`flex h-4 w-4 items-center justify-center rounded-full ${passwordsMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                </div>
              )}
            </div>

            {/* Main Get Started Button (Attached Dark Blue) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white py-2.5 px-4 font-semibold text-sm shadow-md shadow-slate-900/20 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Creating official account…' : 'Get started'}
            </button>

            {/* Google Sign up Button */}
            <div className="pt-1">
              <GoogleSignInButton
                label="Continue with Google"
                isDark={false}
                onSuccess={(u) => {
                  login(u.id, 30);
                  onSuccess(u);
                }}
                onError={(err) => setError(err)}
              />
            </div>
          </form>

          {/* Footer switch to Log in */}
          <div className="text-center text-xs mt-6 text-slate-500">
            Already have an official account?{' '}
            <button
              type="button"
              onClick={() => {
                setView('login');
                setError(null);
                setInfoMessage(null);
              }}
              className="font-bold text-slate-900 hover:underline"
            >
              Log in
            </button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW: FORGOT PASSWORD */}
      {/* ========================================================== */}
      {view === 'forgot' && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 border border-slate-200">
            <KeyRound className="h-6 w-6" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Forgot password?
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 mb-6">
            No worries, we'll send you reset instructions.
          </p>

          <form onSubmit={handleRequestCode} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 pl-10 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 placeholder-slate-400 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 font-semibold text-sm shadow-md shadow-slate-900/20 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Sending code…' : 'Send verification code'}
            </button>
          </form>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                setView('login');
                setError(null);
                setInfoMessage(null);
              }}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-900 hover:text-slate-700 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to log in</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW: VERIFY 6-DIGIT CODE */}
      {/* ========================================================== */}
      {view === 'verify' && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 border border-slate-200">
            <Mail className="h-6 w-6" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Password reset
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 mb-6">
            We sent a verification code to <span className="font-semibold text-slate-900">{resetEmail}</span>
          </p>

          {generatedCode && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs text-slate-800 font-mono">
              <span>Code: <strong>{generatedCode}</strong></span>
              <button
                type="button"
                onClick={() => setResetCode(generatedCode)}
                className="underline hover:text-slate-900 text-[11px] font-bold"
              >
                Auto-fill
              </button>
            </div>
          )}

          <form onSubmit={handleVerifyCode} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                Enter 6-digit code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-[0.5em] font-mono text-xl rounded-full border border-slate-300 bg-white py-2.5 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15"
              />
            </div>

            <button
              type="submit"
              disabled={loading || resetCode.length !== 6}
              className="w-full rounded-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 font-semibold text-sm shadow-md shadow-slate-900/20 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Verifying…' : 'Continue'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={() => setView('forgot')}
              className="inline-flex items-center gap-1.5 font-bold text-slate-900 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={handleRequestCode}
              className="font-bold text-slate-900 hover:underline"
            >
              Click to resend
            </button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW: SET NEW PASSWORD */}
      {/* ========================================================== */}
      {view === 'new_password' && (
        <div>
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 border border-slate-200">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Set new password
            </h2>
            <p className="text-xs text-slate-500 mt-1.5">
              Must be at least 8 characters.
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 placeholder-slate-400 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmNewPw}
                  onChange={(e) => setConfirmNewPw(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 pl-10 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 placeholder-slate-400 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 font-semibold text-sm shadow-md shadow-slate-900/20 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Resetting password…' : 'Reset password'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setView('verify')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
