'use client';

import { useState } from 'react';
import {
  Users as UsersIcon,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit3,
  Search,
  Lock,
  UserCheck,
  Wrench,
  Shield,
  FileCheck2,
  Mail,
  MoreVertical,
  SlidersHorizontal,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader } from '../components/ui/misc';
import { Card } from '../components/ui/Card';
import { TextInput, Select, Field } from '../components/ui/form';
import { toast } from '../lib/toast';
import { Portal } from '../components/ui/Portal';
import type { Role, User } from '../domain/types';

export default function UsersManagement() {
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const addUser = useAppStore((s) => s.addUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const deleteUser = useAppStore((s) => s.deleteUser);

  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('tester');
  const [isActive, setIsActive] = useState(true);

  const filteredUsers = users
    .filter((u) => {
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchQ =
        !q ||
        u.name.toLowerCase().includes(q.toLowerCase()) ||
        (u.email ?? '').toLowerCase().includes(q.toLowerCase()) ||
        u.role.toLowerCase().includes(q.toLowerCase());
      return matchRole && matchQ;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  function openCreate() {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('tester');
    setIsActive(true);
    setModalOpen(true);
  }

  function openEdit(u: User) {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email || '');
    setRole(u.role);
    setIsActive(u.active !== false);
    setModalOpen(true);
  }

  function saveUser() {
    if (!name || !email) return;

    if (editingUser) {
      updateUser(editingUser.id, {
        name,
        email,
        role,
        active: isActive,
      });
    } else {
      addUser({
        id: `u_${Date.now()}`,
        name,
        email,
        role,
        active: isActive,
      });
    }

    setModalOpen(false);
  }

  function handleDeleteUser() {
    if (!deletingUser) return;
    const roleName = deletingUser.role === 'reviewer' ? 'Reviewer' : 'Tester';
    deleteUser(deletingUser.id);
    toast.success('Account Deleted', `${roleName} account for ${deletingUser.name} has been deleted.`);
    setDeletingUser(null);
  }

  const adminCount = users.filter((u) => u.role === 'admin' && u.active !== false).length;
  const reviewerCount = users.filter((u) => u.role === 'reviewer' && u.active !== false).length;
  const testerCount = users.filter((u) => u.role === 'tester' && u.active !== false).length;
  const activeCount = users.filter((u) => u.active !== false).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UsersIcon className="h-5 w-5" />}
        title="User & Access Governance"
        subtitle="Manage personnel credentials, authorization tiers, and digital signing capabilities."
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
          >
            <UserPlus className="h-4 w-4" /> Add User
          </button>
        }
      />

      {/* Role Authority Summary Cards (Official Slate Metrology Style) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Admin Card */}
        <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Administrator</h4>
                <div className="text-[11px] text-slate-500">System Governance</div>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              {adminCount} Active
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            Full platform governance. Manages users, inspects all sessions & reports, manages instrument
            templates, audits, and configuration.
          </p>
        </div>

        {/* Reviewer Card */}
        <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-xs">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Metrological Reviewer</h4>
                <div className="text-[11px] text-slate-500">Quality & Sign-off</div>
              </div>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
              {reviewerCount} Active
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            Quality & regulatory verification. Inspects raw observations, formulas, calculations, approves
            reports, or returns them for correction.
          </p>
        </div>

        {/* Technician Card */}
        <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-xs">
                <Wrench className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Calibration Tester</h4>
                <div className="text-[11px] text-slate-500">Operational Testing</div>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              {testerCount} Active
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            Operational test execution. Selects registered models, enters test readings, triggers deterministic
            calculations, and submits for review.
          </p>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div className="flex flex-1 items-center gap-3 sm:max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, or role…"
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-xs"
            />
          </div>
          <div className="w-44">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-xs"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="reviewer">Reviewer</option>
              <option value="technician">Tester</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Total Records:</span>
          <span className="font-bold text-slate-900">{users.length}</span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {activeCount} active
          </span>
        </div>
      </div>

      {/* Official Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">User & Identity</th>
                <th className="px-5 py-3.5">Email Address</th>
                <th className="px-5 py-3.5">Assigned Role</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const active = u.active !== false;
                const isAdmin = currentUser?.role === 'admin';
                const canDelete = isAdmin && !isSelf && (u.role === 'tester' || u.role === 'reviewer');
                const initials = u.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    {/* User Name & Avatar */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                          {initials}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            {u.name}
                            {isSelf && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                                Current User
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">ID: {u.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {u.email || '—'}
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="px-5 py-4">
                      <RoleBadge role={u.role} />
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Deactivated
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                          title="Edit User Details"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-slate-500" /> Edit
                        </button>

                        {!isSelf && (
                          <button
                            onClick={() => updateUser(u.id, { active: !active })}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                              active
                                ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition shadow-2xs"
                            title={`Delete ${u.role === 'reviewer' ? 'Reviewer' : 'Tester'} Account`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl my-auto mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              {editingUser ? 'Edit User Credentials' : 'Register New User'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure personnel authorization and assign an official Legal Metrology system role.
            </p>

            <div className="mt-5 space-y-4">
              <Field label="Full Name" required>
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kulkarni"
                  className="bg-white border-slate-300 text-slate-900"
                />
              </Field>

              <Field label="Email Address" required>
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ramesh@metrocert.gov.in"
                  className="bg-white border-slate-300 text-slate-900"
                />
              </Field>

              <Field label="System Authorization Role" required hint="Determines digital signing and workflow rights">
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="bg-white border-slate-300 text-slate-900"
                >
                  <option value="tester">Tester (Operational Testing & Readings)</option>
                  <option value="reviewer">Reviewer (Quality & Compliance Verification)</option>
                  <option value="admin">Administrator (Full System Governance)</option>
                </Select>
              </Field>

              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="isActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Account is active and authorized to access the registry
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
              {editingUser && currentUser?.role === 'admin' && editingUser.id !== currentUser?.id && (editingUser.role === 'tester' || editingUser.role === 'reviewer') ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = editingUser;
                    setModalOpen(false);
                    setDeletingUser(target);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Delete Account
                </button>
              ) : <div />}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveUser}
                  disabled={!name || !email}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Portal>
    )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl animate-fade-up my-auto mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete {deletingUser.role === 'reviewer' ? 'Reviewer' : 'Tester'} Account
                </h3>
                <p className="text-xs text-slate-500">
                  Permanent removal from Legal Metrology Registry
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-xs text-slate-700 space-y-2.5">
              <p className="text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete the account for this personnel?
              </p>
              <div className="rounded-xl border border-rose-200/80 bg-white p-3 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{deletingUser.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{deletingUser.email || 'No email registered'}</div>
                </div>
                <RoleBadge role={deletingUser.role} />
              </div>
              <div className="flex items-start gap-2 pt-1 text-[11px] font-medium text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>
                  This action is irreversible. All access credentials, signature keys, and active session permissions will be revoked immediately.
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Account
              </button>
            </div>
          </div>
        </div>
      </Portal>
    )}
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  switch (role) {
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white shadow-2xs">
          <Shield className="h-3 w-3 text-amber-400" /> ADMIN
        </span>
      );
    case 'reviewer':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800 border border-indigo-200 shadow-2xs">
          <FileCheck2 className="h-3 w-3 text-indigo-600" /> REVIEWER
        </span>
      );
    case 'tester':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
          <Wrench className="h-3 w-3 text-emerald-600" /> TESTER
        </span>
      );
  }
}
