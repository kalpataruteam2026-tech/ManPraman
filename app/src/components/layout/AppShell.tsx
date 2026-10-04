'use client';

import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from '@/lib/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu, X, Wifi, WifiOff, LogOut, ChevronDown, Plus, Camera, Mail, MapPin, Briefcase, UserCheck, Trash2,
} from 'lucide-react';
import { getNav } from './nav';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/cn';
import { PRODUCT_NAME } from '../../domain/constants';
import { Toaster } from '../ui/Toaster';
import { toast } from '../../lib/toast';
import { PageTransition } from '../ui/motion';
import { BackgroundGradient } from '../ui/BackgroundGradient';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const online = useAppStore((s) => s.online);
  const user = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="relative min-h-screen bg-paper text-ink overflow-x-hidden">
      {/* Background with custom palette, subtle organic depth, noise texture, and dot matrix */}
      <BackgroundGradient />

      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-espresso-950 border-r border-espresso-800 lg:flex">
        <SidebarContent pathname={location.pathname} role={user?.role} />
      </aside>

      {/* Sidebar — mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-espresso-950/70"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="absolute inset-y-0 left-0 flex w-72 flex-col bg-espresso-950 border-r border-espresso-800"
            >
              <button
                className="absolute right-3 top-4 text-champagne-300 hover:text-white"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent pathname={location.pathname} role={user?.role} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="relative z-10 lg:pl-64">
        {/* Top actions */}
        <header className="sticky top-0 z-30 flex items-center justify-between pointer-events-none px-4 sm:px-6 pt-3 pb-1">
          <button
            className="btn-ghost h-9 w-9 !px-0 lg:hidden pointer-events-auto bg-surface/90 backdrop-blur shadow-sm border border-line"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-2 sm:gap-3 pointer-events-auto">
            <button
              className="btn bg-champagne-500 text-espresso-950 font-bold hover:bg-champagne-400 hidden h-9 sm:inline-flex shadow-sm items-center gap-1.5 px-4 text-xs rounded-lg transition-all hover:scale-[1.02]"
              onClick={() => navigate('/app/instruments/new')}
              title="Open Register Instrument form to configure a new instrument model"
            >
              <Plus className="h-3.5 w-3.5" /> Register Instrument
            </button>
            <UserMenu
              onLogout={() => {
                logout();
                navigate('/login');
              }}
            />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>{children}</PageTransition>
          </AnimatePresence>
        </main>
      </div>

      <Toaster />
    </div>
  );
}

function SidebarContent({ pathname, role, onNavigate }: { pathname: string; role?: any; onNavigate?: () => void }) {
  const navItems = getNav(role);
  return (
    <>
      <div className="flex h-16 items-center gap-3 px-5 border-b border-espresso-800/80">
        <Logo />
        <div className="font-display text-xl font-extrabold tracking-tight text-champagne-100 mt-0.5">
          {PRODUCT_NAME}
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {navItems.map((item) => {
          const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'text-champagne-100 bg-espresso-800 border border-espresso-700/80'
                  : 'text-champagne-200/70 hover:text-champagne-100 hover:bg-espresso-900'
              )}
            >
              <item.icon
                className={cn('relative z-10 h-[18px] w-[18px]', active ? 'text-accent-400' : 'text-champagne-300/60')}
              />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-espresso-800/80 p-4">
        <div className="flex items-center gap-2 rounded-lg bg-espresso-900 border border-espresso-800 px-3 py-2.5">
          <span className="flex h-2 w-2 rounded-full bg-pass-fg" />
          <p className="text-[11px] leading-tight text-champagne-200/80">
            {role ? `MetroCert · ${String(role).toUpperCase()}` : 'MetroCert Online'}
          </p>
        </div>
      </div>
    </>
  );
}

function UserMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAppStore((s) => s.currentUser);
  const updateUser = useAppStore((s) => s.updateUser);

  const name = user?.name || 'Tester User';
  const role = user?.role || 'tester';
  const displayRole = role.charAt(0).toUpperCase() + role.slice(1);
  const initials = (name || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large', 'Please choose a photo under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateUser(user.id, { avatarUrl: dataUrl });
      toast.success('Profile photo updated', 'Your new profile avatar is now saved.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    if (!user) return;
    updateUser(user.id, { avatarUrl: undefined });
    toast.info('Profile photo removed', 'Restored default initials avatar.');
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <button
        className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 transition hover:bg-champagne-50 shadow-sm"
        onClick={() => setOpen((o) => !o)}
        title="View account details and options"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={name}
            className="h-7 w-7 rounded-md object-cover border border-line"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-espresso-800 text-xs font-bold text-champagne-300">
            {initials}
          </span>
        )}
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-semibold leading-tight text-ink">{name}</span>
          <span className="block text-[10px] capitalize leading-tight text-ink-faint">{displayRole}</span>
        </span>
        <ChevronDown
          className="h-4 w-4 text-ink-faint transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-panel"
            >
              {/* Account Header with Editable Profile Photo */}
              <div className="p-4 bg-gradient-to-b from-champagne-50/80 to-white border-b border-line">
                <div className="flex items-start gap-3.5">
                  <div className="relative group shrink-0">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={name}
                        className="h-14 w-14 rounded-lg object-cover border border-line shadow-xs"
                      />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-espresso-800 text-base font-black text-champagne-300 shadow-xs">
                        {initials}
                      </span>
                    )}

                    {/* Camera icon button overlay to edit photo */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-accent-600 text-white shadow-sm hover:bg-accent-700 transition"
                      title="Upload or change profile photo"
                    >
                      <Camera className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-ink truncate block">{name}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-accent-100 text-accent-800 border border-accent-200">
                        {displayRole}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-700 hover:text-accent-800 hover:underline"
                      >
                        <Camera className="h-3 w-3" /> Edit Photo
                      </button>
                      {user?.avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="p-3.5 space-y-2 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint px-1">
                  Account Details
                </div>

                <div className="space-y-1.5 rounded-lg bg-paper/60 border border-line/60 p-2.5">
                  <div className="flex items-center gap-2 text-ink-soft">
                    <Mail className="h-3.5 w-3.5 text-accent-600 shrink-0" />
                    <span className="truncate">{user?.email || 'tester@metrocert.gov.in'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-ink-soft">
                    <MapPin className="h-3.5 w-3.5 text-accent-600 shrink-0" />
                    <span className="truncate">{user?.jurisdiction || 'National Metrology Directorate'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-ink-soft">
                    <Briefcase className="h-3.5 w-3.5 text-accent-600 shrink-0" />
                    <span className="truncate">{user?.designation || `${displayRole} Officer`}</span>
                  </div>

                  <div className="flex items-center gap-2 text-ink-soft font-mono text-[11px]">
                    <UserCheck className="h-3.5 w-3.5 text-accent-600 shrink-0" />
                    <span className="truncate">UID: {user?.id || 'usr_tester_01'}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Logout Option */}
              <div className="border-t border-line p-1.5 bg-slate-50/60">
                <button
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 hover:text-rose-800 transition"
                >
                  <LogOut className="h-4 w-4 text-rose-600" /> Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 text-espresso-950 shadow-card',
        className
      )}
    >
      <svg
        viewBox="0 0 64 64"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M32 12v40M16 20h32M16 20l-7 14a7 7 0 0 0 14 0zM48 20l-7 14a7 7 0 0 0 14 0zM22 52h20" />
      </svg>
    </span>
  );
}
