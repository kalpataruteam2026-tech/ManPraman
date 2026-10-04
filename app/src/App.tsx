import { Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { AppShell } from './components/layout/AppShell';
import { useAppStore } from './store/useAppStore';
import type { Role } from './domain/types';

import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import SessionsList from './screens/SessionsList';
import NewSession from './screens/NewSession';
import SessionOverview from './screens/SessionOverview';
import TestExecution from './screens/TestExecution';
import Review from './screens/Review';
import ReportPreview from './screens/ReportPreview';
import Reports from './screens/Reports';
import ReportView from './screens/ReportView';
import Verify from './screens/Verify';
import Instruments from './screens/Instruments';
import InstrumentRegister from './screens/InstrumentRegister';
import InstrumentDetails from './screens/InstrumentDetails';
import Rulebook from './screens/Rulebook';
import UsersManagement from './screens/UsersManagement';
import AuditTrail from './screens/AuditTrail';
import TestLibrary from './screens/TestLibrary';
import SettingsPage from './screens/Settings';
import TypeEvaluationReport from './views/TypeEvaluationReport';

import ImportData from './screens/ImportData';
import PendingReviews from './screens/PendingReviews';

function Protected() {
  const hydrated = useAppStore((s) => s.hydrated);
  const user = useAppStore((s) => s.currentUser);
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-ink-faint">
        Loading platform…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

/**
 * Route Guard: Enforces role authorization on direct URL entry.
 * Displays a 403 alert if the user's role is not in the allowed list.
 */
function RequireRole({ allowed }: { allowed: Role[] }) {
  const user = useAppStore((s) => s.currentUser);
  if (!user || !allowed.includes(user.role)) {
    return (
      <div className="mx-auto my-12 max-w-md rounded-3xl border border-fail-line bg-white p-8 text-center shadow-panel">
        <ShieldAlert className="mx-auto h-12 w-12 text-fail-fg" />
        <h2 className="mt-3 text-lg font-bold text-ink">Access Restricted (403)</h2>
        <p className="mt-2 text-xs text-ink-soft leading-relaxed">
          Your active role (<b className="uppercase">{user?.role}</b>) does not have authorization
          to access this section. Please contact your system administrator or switch to an authorized account.
        </p>
        <Link to="/app" className="btn-primary mt-5 inline-flex items-center gap-2 text-xs">
          Return to Dashboard
        </Link>
      </div>
    );
  }
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/verify/:verificationId" element={<Verify />} />

      <Route path="/app" element={<Protected />}>
        {/* Accessible to all roles */}
        <Route index element={<Dashboard />} />
        <Route path="instruments" element={<Instruments />} />
        <Route path="instruments/new" element={<InstrumentRegister />} />
        <Route path="instruments/:id" element={<InstrumentDetails />} />
        <Route path="type-evaluation" element={<TypeEvaluationReport />} />
        <Route path="sessions" element={<SessionsList />} />
        <Route path="sessions/:id" element={<SessionOverview />} />
        <Route path="sessions/:id/report" element={<ReportPreview />} />
        <Route path="rulebook" element={<Rulebook />} />
        <Route path="library" element={<Navigate to="/app/rulebook" replace />} />

        {/* Operational Testing Routes (Admin + Tester) */}
        <Route element={<RequireRole allowed={['admin', 'technician', 'tester']} />}>
          <Route path="sessions/new" element={<NewSession />} />
          <Route path="new" element={<NewSession />} />
          <Route path="my-sessions" element={<SessionsList />} />
          <Route path="sessions/:id/test/:testType" element={<TestExecution />} />
        </Route>

        {/* Reviewer Quality & Approval Routes (Admin + Reviewer) */}
        <Route element={<RequireRole allowed={['admin', 'reviewer']} />}>
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportView />} />
          <Route path="pending-reviews" element={<PendingReviews />} />
          <Route path="review-history" element={<SessionsList />} />
          <Route path="sessions/:id/review" element={<Review />} />
        </Route>

        {/* System Administration Routes (Admin Only) */}
        <Route element={<RequireRole allowed={['admin']} />}>
          <Route path="users" element={<UsersManagement />} />
          <Route path="audit" element={<AuditTrail />} />
          <Route path="test-library" element={<TestLibrary />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
