import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Search, ShieldCheck, Scale, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageHeader, EmptyState, Segmented } from '../components/ui/misc';
import { StatusPill } from '../components/ui/StatusPill';
import { classLabel, fmtDateTime } from '../lib/format';

type Filter = 'all' | 'my' | 'valid' | 'field' | 'lab';

export default function Reports() {
  const reports = useAppStore((s) => s.reports);
  const user = useAppStore((s) => s.currentUser);
  const location = useLocation();
  const isMyReports = location.pathname.includes('my-reports');

  const [filter, setFilter] = useState<Filter>(isMyReports ? 'my' : 'all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return reports
      .filter((r) => {
        if (isMyReports && user) {
          if (r.createdBy !== user.name && r.createdBy !== user.id) return false;
        }
        if (filter === 'my') return r.createdBy === user?.name || r.createdBy === user?.id;
        if (filter === 'valid') return r.status === 'valid';
        if (filter === 'field') return r.type === 'field';
        if (filter === 'lab') return r.type === 'lab';
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        const target = `${r.code} ${r.snapshot.instrument.model} ${r.snapshot.instrument.manufacturer} ${r.snapshot.instrument.serial} ${r.verificationId} ${r.createdBy}`.toLowerCase();
        return target.includes(q.toLowerCase());
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [reports, filter, q, user, isMyReports]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        title={isMyReports || user?.role === 'tester' ? 'My Reports' : 'Certified Test Reports'}
        subtitle="Cryptographically sealed, verifiable evaluation certificates generated under OIML R 76 standards."
        actions={
          <Link
            to="/verify"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Verify a Certificate
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `All (${reports.length})` },
            { value: 'my', label: 'My Reports' },
            { value: 'valid', label: 'Valid / Active' },
            { value: 'field', label: 'Field' },
            { value: 'lab', label: 'Laboratory' },
          ]}
        />
        <div className="relative sm:w-72">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code, model, verification ID…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-2xs"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No reports found"
          hint="Complete a test session and finalize it to generate an immutable report."
          icon={<FileText className="h-8 w-8" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const inst = r.snapshot.instrument;
            const isLab = r.type === 'lab';

            return (
              <div
                key={r.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition"
              >
                <div>
                  {/* Card Header: Code & Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="font-mono text-sm font-bold text-slate-900 group-hover:text-accent-700 transition">
                        {r.code}
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                        {isLab ? 'Laboratory Dossier (64-Page)' : 'Field Verification Report'} · v{r.version}
                      </div>
                    </div>
                    <StatusPill status={r.overallVerdict} size="sm" />
                  </div>

                  {/* Instrument Details */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                      <Scale className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="truncate">{inst.manufacturer} {inst.model}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Serial</span>
                        <div className="font-mono font-medium truncate">{inst.serial}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Accuracy</span>
                        <div className="font-semibold">{classLabel(inst.accuracyClass)}</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 pt-1">
                      Max: <b className="text-slate-700">{inst.max} {inst.unit}</b> · e: <b className="text-slate-700">{inst.e} {inst.unit}</b>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
                    <span>{fmtDateTime(r.createdAt)}</span>
                    <span className="font-mono text-[11px] text-slate-500">ID: {r.verificationId}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/app/reports/${r.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-slate-950 transition"
                    >
                      View Report <ArrowRight className="h-3.5 w-3.5" />
                    </Link>

                    <Link
                      to={`/verify/${r.code || r.verificationId}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verify
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
