'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, ArrowLeft, Loader2, Check, ShieldCheck, X } from 'lucide-react';
import { GoogleIcon } from './GoogleSignInButton';
import { loginWithGoogleBackend } from '../../lib/pythonBackend';
import { useAppStore } from '../../store/useAppStore';
import type { User, Role } from '../../domain/types';

interface GoogleAccount {
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
}

const DEFAULT_DEVICE_ACCOUNTS: GoogleAccount[] = [
  {
    name: 'Ajinkya Magar',
    email: 'ajinkya.metrology@gmail.com',
    avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
    role: 'admin',
  },
  {
    name: 'Rutvik M',
    email: 'rutvik.metrocert@gmail.com',
    avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
    role: 'technician',
  },
  {
    name: 'Metrology Testing Officer',
    email: 'tester.oiml@gmail.com',
    avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
    role: 'technician',
  },
];

interface GoogleAccountChooserProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  isDark?: boolean;
}

const AVATAR_COLORS = [
  'bg-[#4285F4]', // Google Blue
  'bg-[#EA4335]', // Google Red
  'bg-[#34A853]', // Google Green
  'bg-[#FBBC05]', // Google Yellow
  'bg-[#9334E6]', // Purple
  'bg-[#0284C7]', // Sky
];

export default function GoogleAccountChooser({
  isOpen,
  onClose,
  onSuccess,
  isDark = false,
}: GoogleAccountChooserProps) {
  const users = useAppStore((s) => s.users);
  const addUser = useAppStore((s) => s.addUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const login = useAppStore((s) => s.login);

  const [accounts, setAccounts] = useState<GoogleAccount[]>(DEFAULT_DEVICE_ACCOUNTS);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load and merge device accounts from localStorage and store users
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      let merged: GoogleAccount[] = [...DEFAULT_DEVICE_ACCOUNTS];

      // Add any saved custom accounts from device localStorage
      const saved = localStorage.getItem('metrocert_device_google_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const item of parsed) {
            if (!merged.some((m) => m.email.toLowerCase() === item.email.toLowerCase())) {
              merged.push(item);
            }
          }
        }
      }

      // Add registered users with valid emails from store
      for (const u of users) {
        const userEmail = u.email?.trim().toLowerCase();
        if (userEmail && !merged.some((m) => m.email.toLowerCase() === userEmail)) {
          merged.push({
            name: u.name,
            email: u.email!,
            avatarUrl: u.avatarUrl,
            role: u.role || 'technician',
          });
        }
      }

      setAccounts(merged);
    } catch {}
  }, [users]);

  const saveAccountsToDevice = (updatedList: GoogleAccount[]) => {
    setAccounts(updatedList);
    try {
      localStorage.setItem('metrocert_device_google_accounts', JSON.stringify(updatedList));
    } catch {}
  };

  // Select an account from the device list: generates account and logs in
  const handleSelectAccount = async (account: GoogleAccount) => {
    setError(null);
    setLoadingEmail(account.email);

    try {
      // 1. Authenticate / provision account in backend
      let backendUser: any;
      try {
        const res = await loginWithGoogleBackend({
          email: account.email,
          name: account.name,
          picture: account.avatarUrl,
        });
        backendUser = res.user;
      } catch (err: any) {
        console.warn('Backend Google Auth notice, creating local session:', err.message);
        backendUser = {
          id: `u_goog_${account.email.replace(/[^a-z0-9]/gi, '_')}`,
          email: account.email,
          full_name: account.name,
          role: account.role || 'technician',
          avatarUrl: account.avatarUrl,
        };
      }

      // 2. Provision or sync in local store
      let matched = users.find(
        (u) =>
          u.email?.toLowerCase() === account.email.toLowerCase() ||
          u.id === backendUser.id
      );

      if (!matched) {
        const newUser: User = {
          id: backendUser.id,
          name: account.name || backendUser.full_name || 'Google User',
          email: account.email,
          role: (backendUser.role as Role) || account.role || 'technician',
          jurisdiction: 'National Central Directorate',
          designation:
            (backendUser.role || account.role) === 'admin'
              ? 'Chief Metrological Inspector'
              : 'Senior Verification Officer',
          uid: `MC-GOOG-${backendUser.id.slice(-4).toUpperCase()}`,
          avatarUrl: account.avatarUrl || 'https://lh3.googleusercontent.com/a/default-user',
          active: true,
        };
        addUser(newUser);
        matched = newUser;
      } else if (account.avatarUrl && !matched.avatarUrl) {
        updateUser(matched.id, { avatarUrl: account.avatarUrl });
      }

      // 3. Complete login and callback
      login(matched.id, 30);
      onSuccess(matched);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with this Google account.');
    } finally {
      setLoadingEmail(null);
    }
  };

  // Add a new Google email on this device
  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const email = customEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid Google email.');
      return;
    }

    const name =
      customName.trim() ||
      email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const newAcc: GoogleAccount = {
      name,
      email,
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
      role: 'technician',
    };

    const updated = [newAcc, ...accounts.filter((a) => a.email !== email)];
    saveAccountsToDevice(updated);
    setShowAddAccount(false);
    handleSelectAccount(newAcc);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-[420px] rounded-2xl border shadow-2xl p-6 transition-all ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute right-4 top-4 p-1.5 rounded-lg transition ${
            isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Google Header */}
        <div className="text-center pt-2 pb-5">
          <div className="flex justify-center mb-3">
            <GoogleIcon className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Choose an account</h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
            to continue to <strong className={isDark ? 'text-white' : 'text-slate-900'}>MetroCert</strong>
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 font-medium">
            {error}
          </div>
        )}

        {/* Account List */}
        {!showAddAccount ? (
          <div className="space-y-1">
            <div className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-1 ${
              isDark ? 'text-neutral-500' : 'text-slate-400'
            }`}>
              Google accounts on this device
            </div>

            <div className="divide-y divide-neutral-800/60 dark:divide-neutral-800/60 max-h-64 overflow-y-auto pr-1">
              {accounts.map((acc) => {
                const isLoading = loadingEmail === acc.email;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={!!loadingEmail}
                    onClick={() => handleSelectAccount(acc)}
                    className={`flex w-full items-center gap-3.5 p-3 rounded-xl text-left transition ${
                      isDark
                        ? 'hover:bg-neutral-800/80 active:bg-neutral-800'
                        : 'hover:bg-slate-50 active:bg-slate-100'
                    } disabled:opacity-60 cursor-pointer`}
                  >
                    {/* Avatar with initials or picture */}
                    {acc.avatarUrl && !acc.avatarUrl.includes('default-user') ? (
                      <img
                        src={acc.avatarUrl}
                        alt={acc.name}
                        className="h-10 w-10 shrink-0 rounded-full object-cover shadow-sm border border-neutral-700/50"
                      />
                    ) : (
                      <div
                        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-white text-sm shadow-sm ${
                          AVATAR_COLORS[
                            Math.abs(
                              acc.email
                                .split('')
                                .reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
                            ) % AVATAR_COLORS.length
                          ]
                        }`}
                      >
                        {acc.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{acc.name}</span>
                        {acc.role === 'admin' && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-300">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className={`text-xs truncate ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        {acc.email}
                      </div>
                    </div>

                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-800 shrink-0" />
                    ) : (
                      <span className={`text-[11px] ${isDark ? 'text-neutral-500' : 'text-slate-400'} shrink-0`}>
                        Signed in
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Use another account button */}
              <button
                type="button"
                onClick={() => setShowAddAccount(true)}
                className={`flex w-full items-center gap-3.5 p-3 rounded-xl text-left transition ${
                  isDark ? 'hover:bg-neutral-800/80' : 'hover:bg-slate-50'
                } cursor-pointer`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed ${
                  isDark ? 'border-neutral-700 bg-neutral-800 text-neutral-300' : 'border-slate-300 bg-slate-100 text-slate-600'
                }`}>
                  <UserPlus className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">Use another account</div>
                  <div className={`text-xs ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    Sign in with a different Google email
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Add another account form */
          <form onSubmit={handleAddCustomAccount} className="space-y-3.5 pt-1">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setShowAddAccount(false)}
                className={`p-1 rounded-lg transition ${
                  isDark ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold">Add another Google account</span>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                Email address
              </label>
              <input
                type="email"
                required
                autoFocus
                placeholder="your.email@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-slate-900/15 ${
                  isDark
                    ? 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-slate-400'
                    : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-slate-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                Full Name (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Aditi Sharma"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-slate-900/15 ${
                  isDark
                    ? 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-slate-400'
                    : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-slate-900'
                }`}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddAccount(false)}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                  isDark ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!customEmail.trim()}
                className="rounded-full bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {/* Footer notice */}
        <div className={`mt-5 pt-4 border-t text-[11px] text-center leading-relaxed ${
          isDark ? 'border-neutral-800 text-neutral-500' : 'border-slate-100 text-slate-400'
        }`}>
          To continue, Google will share your name, email address, language preference, and profile picture with MetroCert.
        </div>
      </div>
    </div>
  );
}
