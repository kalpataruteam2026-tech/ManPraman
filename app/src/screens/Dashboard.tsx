import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  ClipboardList,
  CheckCircle2,
  FileCheck2,
  ArrowRight,
  Play,
  Users,
  Shield,
  Clock,
  RotateCcw,
  FileText,
  Gauge,
  Sparkles,
  AlertCircle,
  History,
  CheckSquare,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card, CardHeader } from '../components/ui/Card';
import { AnimatedNumber, Stagger, StaggerItem } from '../components/ui/motion';
import { classLabel, relativeTime, sessionStatusLabel } from '../lib/format';
import { ACTIVE_COMPLIANCE_BASIS } from '../regulatory/rulebookManifest';
import type { ComponentType } from 'react';

export default function Dashboard() {
  const user = useAppStore((s) => s.currentUser);

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (user?.role === 'reviewer') {
    return <ReviewerDashboard />;
  }

  return <TechnicianDashboard />;
}

// ======================================================================
// 1. ADMIN DASHBOARD
// ======================================================================
function AdminDashboard() {
  const sessions = useAppStore((s) => s.sessions);
  const reports = useAppStore((s) => s.reports);
  const users = useAppStore((s) => s.users);
  const audit = useAppStore((s) => s.audit);
  const user = useAppStore((s) => s.currentUser);
  const navigate = useNavigate();

  const totalUsers = users.length;
  const techniciansCount = users.filter((u) => u.role === 'technician').length;
  const reviewersCount = users.filter((u) => u.role === 'reviewer').length;
  const totalSessions = sessions.length;
  const inProgress = sessions.filter((s) => s.status === 'in_progress' || s.status === 'draft').length;
  const awaitingReview = sessions.filter(
    (s) => s.status === 'ready_for_review' || s.status === 'awaiting_review' || s.status === 'under_review'
  ).length;
  const approvedReports = reports.filter((r) => r.status === 'valid').length;
  const returnedSessions = sessions.filter(
    (s) => s.status === 'returned_for_correction' || s.status === 'rejected'
  ).length;

  const recentSessions = [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const recentAudit = [...audit].slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Admin Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-navy-950 p-6 text-white sm:p-8"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-purple-500/25 blur-[90px]" />
          <div className="absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-accent-500/20 blur-[90px]" />
          <div className="absolute inset-0 bg-grid-slate opacity-[0.1] [background-size:36px_36px]" />
        </div>
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
              <Shield className="h-4 w-4" /> System Administrator Console
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
              Welcome back, {user?.name || 'Administrator'}
            </h1>
            <p className="mt-1 max-w-lg text-sm text-slate-300">
              Central metrology platform oversight: users, testing queues, compliance rulesets, and audit records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/app/instruments/new')}
              className="btn bg-champagne-500 text-espresso-950 font-bold hover:bg-champagne-400 h-10 px-5 text-xs shadow-card inline-flex items-center gap-2 rounded-lg transition-all hover:scale-[1.02]"
              title="Open Register Instrument form to configure a new instrument model"
            >
              <Plus className="h-3.5 w-3.5" /> Register Instrument
            </button>
            <button
              onClick={() => navigate('/app/users')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <Users className="h-4 w-4" /> Manage Users
            </button>
            <button
              onClick={() => navigate('/app/audit')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <History className="h-4 w-4" /> Audit Ledger
            </button>
          </div>
        </div>
      </motion.div>

      {/* Admin KPI Grid */}
      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={totalUsers}
          icon={Users}
          tone="accent"
          hint={`${techniciansCount} Testers · ${reviewersCount} Reviewers`}
        />
        <StatCard
          label="Test Sessions"
          value={totalSessions}
          icon={ClipboardList}
          tone="accent"
          hint={`${inProgress} in progress / draft`}
        />
        <StatCard
          label="Under Review"
          value={awaitingReview}
          icon={Clock}
          tone={awaitingReview > 0 ? 'warn' : 'accent'}
          hint="Pending quality verification"
        />
        <StatCard
          label="Approved / Returned"
          value={`${approvedReports} / ${returnedSessions}`}
          icon={FileCheck2}
          tone="iris"
          hint="Final reports / returned"
        />
      </Stagger>

      {/* Admin Overview Split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Sessions */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="System Test Sessions"
            subtitle="Latest testing activity across the application"
            actions={
              totalSessions > 0 ? (
                <Link to="/app/sessions" className="text-xs font-semibold text-accent-600 hover:underline">
                  View all ({totalSessions}) →
                </Link>
              ) : undefined
            }
          />
          {totalSessions === 0 ? (
            <div className="p-8 text-center text-sm text-ink-faint">
              <ClipboardList className="mx-auto h-10 w-10 text-ink-faint/30" />
              <p className="mt-2 font-semibold text-ink">No test sessions yet</p>
              <p className="text-xs">
                When testers register models and conduct test procedures or import spreadsheets, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-line bg-paper/60 text-xs">
                  <tr>
                    <th className="th">Session Code</th>
                    <th className="th">Tester</th>
                    <th className="th">Verdict</th>
                    <th className="th">Workflow Status</th>
                    <th className="th">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs">
                  {recentSessions.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/app/sessions/${s.id}`)}
                      className="cursor-pointer transition hover:bg-paper/80"
                    >
                      <td className="td font-mono font-semibold text-ink">{s.code}</td>
                      <td className="td text-ink-soft">{s.technicianName}</td>
                      <td className="td">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            s.overallVerdict === 'PASS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.overallVerdict === 'FAIL'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {s.overallVerdict}
                        </span>
                      </td>
                      <td className="td capitalize text-xs text-ink font-medium">
                        {sessionStatusLabel(s.status)}
                      </td>
                      <td className="td text-ink-faint">{relativeTime(s.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Regulatory Status & Live Audit Stream */}
        <div className="space-y-6">
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-ink">Active Compliance Basis</h4>
                <p className="text-[11px] text-ink-faint">Verified regulatory baseline</p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="rounded-lg bg-paper p-2.5">
                <span className="font-semibold text-ink">International: </span>
                <span className="text-ink-soft">
                  {ACTIVE_COMPLIANCE_BASIS.oiml.standard} ({ACTIVE_COMPLIANCE_BASIS.oiml.edition})
                </span>
                <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                  Verified
                </span>
              </div>
              <div className="rounded-lg bg-paper p-2.5">
                <span className="font-semibold text-ink">Applied Ruleset: </span>
                <span className="font-mono text-accent-700 font-bold">{ACTIVE_COMPLIANCE_BASIS.activeRulesetId}</span>
              </div>
            </div>

            <Link
              to="/app/rulebook"
              className="mt-3 block text-center text-xs font-semibold text-accent-600 hover:underline"
            >
              Inspect Applied Rules & Documents →
            </Link>
          </div>

          {/* Recent Audit events */}
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-faint">Live Audit Stream</h4>
              {audit.length > 0 && (
                <Link to="/app/audit" className="text-[11px] font-semibold text-accent-600 hover:underline">
                  Full Log →
                </Link>
              )}
            </div>
            {recentAudit.length === 0 ? (
              <p className="mt-3 text-xs text-ink-faint text-center py-4">No audit events recorded yet.</p>
            ) : (
              <div className="mt-3 divide-y divide-line text-xs">
                {recentAudit.map((a) => (
                  <div key={a.id} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">{a.action}</span>
                      <span className="text-[10px] text-ink-faint">{relativeTime(a.ts)}</span>
                    </div>
                    <p className="text-[11px] text-ink-soft">
                      by <span className="font-medium text-ink">{a.userName}</span>
                      {a.detail ? ` · ${a.detail}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ======================================================================
// 2. REVIEWER DASHBOARD
// ======================================================================
function ReviewerDashboard() {
  const sessions = useAppStore((s) => s.sessions);
  const reports = useAppStore((s) => s.reports);
  const user = useAppStore((s) => s.currentUser);
  const navigate = useNavigate();

  const pending = sessions.filter(
    (s) => s.status === 'ready_for_review' || s.status === 'awaiting_review'
  );
  const underReview = sessions.filter((s) => s.status === 'under_review');
  const approved = sessions.filter((s) => s.status === 'approved' || s.status === 'reported');
  const returned = sessions.filter(
    (s) => s.status === 'returned_for_correction' || s.status === 'rejected'
  );

  return (
    <div className="space-y-6">
      {/* Reviewer Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-navy-950 p-6 text-white sm:p-8"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/25 blur-[90px]" />
          <div className="absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-indigo-500/25 blur-[90px]" />
          <div className="absolute inset-0 bg-grid-slate opacity-[0.1] [background-size:36px_36px]" />
        </div>
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <CheckCircle2 className="h-4 w-4" /> Quality & Compliance Review Console
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
              Reviewer {user?.name}
            </h1>
            <p className="mt-1 max-w-lg text-sm text-slate-300">
              Inspect raw observations, verify calculation traces against OIML MPE corridors, and approve or return test submissions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/app/instruments/new')}
              className="btn bg-champagne-500 text-espresso-950 font-bold hover:bg-champagne-400 h-10 px-5 text-xs shadow-card inline-flex items-center gap-2 rounded-lg transition-all hover:scale-[1.02]"
              title="Open Register Instrument form to configure a new instrument model"
            >
              <Plus className="h-3.5 w-3.5" /> Register Instrument
            </button>
            <Link
              to="/app/pending-reviews"
              className="btn-accent sheen h-10 px-4 text-xs font-semibold inline-flex items-center gap-2 rounded-lg"
            >
              <CheckSquare className="h-4 w-4" /> Open Pending Queue ({pending.length})
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Reviewer Metrics */}
      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending Reviews"
          value={pending.length}
          icon={Clock}
          tone={pending.length > 0 ? 'warn' : 'accent'}
          hint="Awaiting quality inspection"
        />
        <StatCard
          label="Under Review"
          value={underReview.length}
          icon={Play}
          tone="accent"
          hint="Active inspection in progress"
        />
        <StatCard
          label="Approved Sessions"
          value={approved.length}
          icon={CheckCircle2}
          tone="accent"
          hint="Passed and certified"
        />
        <StatCard
          label="Returned for Correction"
          value={returned.length}
          icon={RotateCcw}
          tone={returned.length > 0 ? 'fail' : 'accent'}
          hint="Returned to tester"
        />
      </Stagger>

      {/* Priority Review Worklist */}
      <Card>
        <CardHeader
          title="Submissions Waiting for Review"
          subtitle="Inspect raw readings, calculated true indication P, and corrected error Ec test-by-test"
        />
        {pending.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-faint">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/50" />
            <p className="mt-2 font-semibold text-ink">No submissions waiting for review.</p>
            <p className="text-xs">When testers submit completed test sessions, they will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line bg-paper/60 text-xs">
                <tr>
                  <th className="th">Session Code</th>
                  <th className="th">Tester</th>
                  <th className="th">Submitted</th>
                  <th className="th">Overall Verdict</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {pending.map((s) => (
                  <tr key={s.id} className="transition hover:bg-paper/80">
                    <td className="td font-mono font-bold text-ink">{s.code}</td>
                    <td className="td text-ink-soft">{s.technicianName}</td>
                    <td className="td text-ink-faint">{relativeTime(s.updatedAt)}</td>
                    <td className="td">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          s.overallVerdict === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.overallVerdict === 'FAIL'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.overallVerdict}
                      </span>
                    </td>
                    <td className="td capitalize text-xs text-ink font-medium">
                      {sessionStatusLabel(s.status)}
                    </td>
                    <td className="td text-right">
                      <Link
                        to={`/app/sessions/${s.id}/review`}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 transition hover:bg-accent-100"
                      >
                        Inspect & Verify <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ======================================================================
// 3. TECHNICIAN DASHBOARD
// ======================================================================
function TechnicianDashboard() {
  const sessions = useAppStore((s) => s.sessions);
  const user = useAppStore((s) => s.currentUser);
  const navigate = useNavigate();

  const mySessions = sessions.filter((s) => !user || s.technicianId === user.id);
  const drafts = mySessions.filter((s) => s.status === 'draft');
  const inProgress = mySessions.filter((s) => s.status === 'in_progress');
  const submitted = mySessions.filter(
    (s) => s.status === 'ready_for_review' || s.status === 'awaiting_review' || s.status === 'under_review'
  );
  const returned = mySessions.filter((s) => s.status === 'returned_for_correction');
  const completed = mySessions.filter((s) => s.status === 'approved' || s.status === 'reported');

  return (
    <div className="space-y-6">
      {/* Technician Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-navy-950 p-6 text-white sm:p-8"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/25 blur-[90px]" />
          <div className="absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-teal-500/25 blur-[90px]" />
          <div className="absolute inset-0 bg-grid-slate opacity-[0.1] [background-size:36px_36px]" />
        </div>
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <Sparkles className="h-4 w-4" /> Operational Testing Console
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
              Hello, {user?.name || 'Tester'}
            </h1>
            <p className="mt-1 max-w-lg text-sm text-slate-300">
              Execute guided OIML R-76 test procedures: Zero, Eccentricity, Weighing, Repeatability, and submit for verification.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/app/instruments/new')}
              className="btn bg-champagne-500 text-espresso-950 font-bold hover:bg-champagne-400 h-11 px-6 text-sm shadow-card inline-flex items-center gap-2 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Open Register Instrument form to configure a new instrument model"
            >
              <Plus className="h-4 w-4" /> Register Instrument
            </button>
            <button
              onClick={() => navigate('/app/sessions/new?import=true')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <FileText className="h-4 w-4" /> Import Spreadsheet
            </button>
          </div>
        </div>
      </motion.div>

      {/* Alert if any sessions are returned for correction */}
      {returned.length > 0 && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div className="flex-1">
              <h4 className="text-sm font-bold">
                {returned.length} Test Session{returned.length > 1 ? 's' : ''} Returned for Correction
              </h4>
              <p className="mt-0.5 text-xs text-rose-800">
                The reviewing officer has flagged observations or parameters requiring correction. Please review reviewer comments and resubmit.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {returned.map((r) => (
                  <Link
                    key={r.id}
                    to={`/app/sessions/${r.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                  >
                    Open {r.code} →
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technician KPI Grid */}
      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Drafts"
          value={drafts.length}
          icon={ClipboardList}
          tone="accent"
          hint="Unstarted test sessions"
        />
        <StatCard
          label="In Progress"
          value={inProgress.length}
          icon={Play}
          tone="accent"
          hint="Ongoing observations"
        />
        <StatCard
          label="Submitted for Review"
          value={submitted.length}
          icon={Clock}
          tone="warn"
          hint="Pending reviewer approval"
        />
        <StatCard
          label="Returned for Edit"
          value={returned.length}
          icon={RotateCcw}
          tone={returned.length > 0 ? 'fail' : 'accent'}
          hint="Correction requested"
        />
        <StatCard
          label="Completed"
          value={completed.length}
          icon={CheckCircle2}
          tone="accent"
          hint="Approved test sessions"
        />
      </Stagger>

      {/* Recent Test Sessions Table */}
      <Card>
        <CardHeader
          title="My Recent Test Sessions"
          subtitle="Testing instances created and processed under your tester account"
          actions={
            mySessions.length > 0 ? (
              <Link to="/app/my-sessions" className="text-xs font-semibold text-accent-600 hover:underline">
                View all ({mySessions.length}) →
              </Link>
            ) : undefined
          }
        />
        {mySessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-faint">
            <ClipboardList className="mx-auto h-10 w-10 text-ink-faint/30" />
            <p className="mt-2 font-semibold text-ink">No test sessions yet</p>
            <p className="text-xs">Register an instrument to configure parameters and begin testing.</p>
            <button
              onClick={() => navigate('/app/instruments/new')}
              className="btn bg-champagne-500 text-espresso-950 font-bold hover:bg-champagne-400 mt-4 inline-flex items-center gap-2 text-xs px-5 py-2.5 rounded-lg shadow-card transition-all hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" /> Register Instrument
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line bg-paper/60 text-xs">
                <tr>
                  <th className="th">Session Code</th>
                  <th className="th">Updated</th>
                  <th className="th">Verdict</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {mySessions.slice(0, 5).map((s) => (
                  <tr key={s.id} className="transition hover:bg-paper/80">
                    <td className="td font-mono font-bold text-ink">{s.code}</td>
                    <td className="td text-ink-faint">{relativeTime(s.updatedAt)}</td>
                    <td className="td">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          s.overallVerdict === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.overallVerdict === 'FAIL'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.overallVerdict}
                      </span>
                    </td>
                    <td className="td capitalize text-xs text-ink font-medium">
                      {sessionStatusLabel(s.status)}
                    </td>
                    <td className="td text-right">
                      <Link
                        to={`/app/sessions/${s.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper/80"
                      >
                        Open Session <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------
// Reusable KPI Stat Card
// ----------------------------------------------------------------------
function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  tone: 'accent' | 'warn' | 'iris' | 'fail';
  hint?: string;
}) {
  const toneClasses = {
    accent: 'bg-emerald-50 text-emerald-600',
    warn: 'bg-amber-50 text-amber-600',
    iris: 'bg-indigo-50 text-indigo-600',
    fail: 'bg-rose-50 text-rose-600',
  }[tone];

  return (
    <StaggerItem>
      <div className="flex h-full flex-col justify-between rounded-xl border border-line bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-faint">{label}</span>
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3">
          <div className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
          </div>
          {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
        </div>
      </div>
    </StaggerItem>
  );
}

