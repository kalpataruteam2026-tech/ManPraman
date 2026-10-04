'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, RotateCcw, ShieldAlert, WifiOff, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader, InfoRow } from '../components/ui/misc';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { APP_VERSION, ENGINE_VERSION, REPORT_TEMPLATE_VERSION } from '../domain/constants';

export default function SettingsPage() {
  const user = useAppStore((s) => s.currentUser);
  const resetDatabase = useAppStore((s) => s.resetDatabase);
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <PageHeader icon={<SettingsIcon className="h-5 w-5" />} title="Settings" subtitle="Environment, versions and database management." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Session" />
          <CardBody>
            <InfoRow label="Signed in as" value={user?.name ?? '—'} />
            <InfoRow label="Role" value={<span className="capitalize">{user?.role}</span>} />
            <InfoRow label="Jurisdiction" value={user?.jurisdiction ?? '—'} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Versions" subtitle="Embedded in every report for reproducibility" />
          <CardBody>
            <InfoRow label="Application" value={APP_VERSION} />
            <InfoRow label="Metrology engine" value={ENGINE_VERSION} />
            <InfoRow label="Report template" value={REPORT_TEMPLATE_VERSION} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Offline & data" icon={<WifiOff className="h-4 w-4" />} />
          <CardBody className="space-y-3">
            <p className="text-sm text-ink-soft">
              Data is synced with the Python FastAPI backend and stored locally in your browser (IndexedDB).
            </p>
            <button
              className="btn-ghost"
              disabled={busy}
              onClick={async () => { setBusy(true); await resetDatabase(); setBusy(false); }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Reset database
            </button>
          </CardBody>
        </Card>

        <Card className="border-warn-line/40">
          <CardHeader title="Prototype scope & security" icon={<ShieldAlert className="h-4 w-4 text-warn-fg" />} />
          <CardBody className="space-y-2 text-sm text-ink-soft">
            <p><b>Prototype:</b> role-based mock auth, domain-layer RBAC, input validation, audit logging, canonical-JSON SHA-256 integrity.</p>
            <p><b>Production would add:</b> a real identity provider, TLS, server-side authorization on every endpoint, secure file scanning, rate limiting, encrypted-at-rest storage and HSM/KMS-backed signing.</p>
            <p className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn-fg">
              This is a demonstration prototype for SIH26035 — not a certified production system. Cryptographic integrity
              is a technical control and does not by itself confer legal validity.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
