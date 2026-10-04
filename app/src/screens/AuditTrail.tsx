import { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader, EmptyState } from '../components/ui/misc';
import { Card } from '../components/ui/Card';
import { TextInput } from '../components/ui/form';
import { fmtDateTime } from '../lib/format';

export default function AuditTrail() {
  const audit = useAppStore((s) => s.audit);
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => audit.filter((a) => (!q ? true : `${a.action} ${a.detail} ${a.userName}`.toLowerCase().includes(q.toLowerCase()))),
    [audit, q],
  );

  return (
    <div>
      <PageHeader
        icon={<History className="h-5 w-5" />}
        title="Audit Trail"
        subtitle="Append-only record of state-changing actions."
      />
      <div className="mb-4 sm:w-80">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-faint" />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions, users…" className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No audit events" icon={<History className="h-8 w-8" />} />
      ) : (
        <Card>
          <ol className="relative divide-y divide-line">
            {filtered.map((a) => (
              <li key={a.id} className="flex gap-4 px-5 py-3.5">
                <div className="w-32 shrink-0 text-xs text-ink-faint">{fmtDateTime(a.ts)}</div>
                <div className="relative flex-1 pl-4">
                  <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-accent-500" />
                  <div className="text-sm font-semibold text-ink">{a.action}</div>
                  {a.detail && <div className="text-xs text-ink-soft">{a.detail}</div>}
                  <div className="mt-0.5 text-[11px] text-ink-faint">
                    {a.userName}
                    {a.oldValue != null && <> · <span className="text-fail-fg">{a.oldValue}</span> → <span className="text-pass-fg">{a.newValue}</span></>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
