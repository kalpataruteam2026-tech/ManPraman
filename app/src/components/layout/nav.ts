import {
  LayoutDashboard,
  ClipboardList,
  Gauge,
  FileText,
  Library,
  History,
  Settings,
  Users,
  CheckSquare,
  FileCheck,
  PlusCircle,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { Role } from '../../domain/types';

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

export function getNav(role?: Role): NavItem[] {
  if (role === 'admin') {
    return [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/instruments', label: 'Instruments / Objects', icon: Gauge },
      { to: '/app/sessions', label: 'Test Sessions', icon: ClipboardList },
      { to: '/app/reports', label: 'Reports', icon: FileText },
      { to: '/app/rulebook', label: 'Rulebook', icon: Library },
      { to: '/app/users', label: 'Users', icon: Users },
      { to: '/app/audit', label: 'Audit Trail', icon: History },
      { to: '/app/settings', label: 'Settings', icon: Settings },
    ];
  }

  if (role === 'tester') {
    return [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/instruments', label: 'Instruments / Objects', icon: Gauge },
      { to: '/app/my-sessions', label: 'My Test Sessions', icon: ClipboardList },
      { to: '/app/rulebook', label: 'Rulebook', icon: Library },
    ];
  }

  if (role === 'reviewer') {
    return [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/instruments', label: 'Instruments / Objects', icon: Gauge },
      { to: '/app/pending-reviews', label: 'Pending Reviews', icon: CheckSquare },
      { to: '/app/review-history', label: 'Review History', icon: FileCheck },
      { to: '/app/reports', label: 'Reports', icon: FileText },
      { to: '/app/rulebook', label: 'Rulebook', icon: Library },
    ];
  }

  // Fallback default
  return [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/instruments', label: 'Instruments / Objects', icon: Gauge },
    { to: '/app/sessions', label: 'Test Sessions', icon: ClipboardList },
    { to: '/app/reports', label: 'Reports', icon: FileText },
    { to: '/app/rulebook', label: 'Rulebook', icon: Library },
  ];
}

export const NAV: NavItem[] = getNav('admin');

