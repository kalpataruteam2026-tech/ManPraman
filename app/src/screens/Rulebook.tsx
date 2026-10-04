import { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  FileText,
  ShieldCheck,
  ExternalLink,
  Info,
  Calendar,
  Scale,
} from 'lucide-react';
import { PageHeader } from '../components/ui/misc';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { TextInput, Select } from '../components/ui/form';
import {
  RULEBOOK_DOCUMENTS,
  APPLIED_RULES_REGISTRY,
  ACTIVE_COMPLIANCE_BASIS,
} from '../regulatory/rulebookManifest';
import type { RulebookDocument } from '../domain/types';

export default function Rulebook() {
  const [activeTab, setActiveTab] = useState<'library' | 'applied'>('library');

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        title="Rulebook"
        subtitle="Authoritative regulatory framework, source documents, and active compliance engine rules."
      />

      {/* Primary tab switcher */}
      <div className="flex border-b border-line">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'library'
              ? 'border-accent-600 text-accent-700'
              : 'border-transparent text-ink-faint hover:text-ink'
          }`}
        >
          <FileText className="h-4 w-4" />
          Rules Library
          <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink-soft">
            {RULEBOOK_DOCUMENTS.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('applied')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'applied'
              ? 'border-accent-600 text-accent-700'
              : 'border-transparent text-ink-faint hover:text-ink'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Applied Rules & Compliance Engine
          <span className="rounded-full bg-pass-bg px-2 py-0.5 text-xs font-bold text-pass-fg">
            Active
          </span>
        </button>
      </div>

      {activeTab === 'library' ? <RulesLibraryTab /> : <AppliedRulesTab />}
    </div>
  );
}

/**
 * Tab A: Rules Library
 * Catalog of genuine source documents available in the repository.
 */
function RulesLibraryTab() {
  const [q, setQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<RulebookDocument | null>(null);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'OIML Standard', label: 'OIML Standards & Formats' },
    { value: 'Legal Metrology Act', label: 'Legal Metrology Act' },
    { value: 'General Rules & Schedules', label: 'General Rules & Schedules' },
    { value: 'Gazette Amendment', label: 'Gazette Amendments' },
    { value: 'Model Approval Rules', label: 'Model Approval Rules' },
    { value: 'Advisory / Notification', label: 'Advisories & Notifications' },
  ];

  const filtered = useMemo(() => {
    return RULEBOOK_DOCUMENTS.filter((doc) => {
      const matchCat = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchQ =
        !q ||
        doc.title.toLowerCase().includes(q.toLowerCase()) ||
        doc.filename.toLowerCase().includes(q.toLowerCase()) ||
        doc.description.toLowerCase().includes(q.toLowerCase()) ||
        (doc.year && doc.year.includes(q));
      return matchCat && matchQ;
    });
  }, [q, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Informational callout */}
      <div className="flex items-start gap-3 rounded-2xl border border-accent-200/70 bg-accent-50/50 p-4 text-sm text-accent-950">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" />
        <div>
          <span className="font-semibold text-accent-900">Repository Rules Library:</span>{' '}
          This section indexes all <b>{RULEBOOK_DOCUMENTS.length} verified regulatory PDFs</b> present
          in the project workspace. These documents serve as the learning and authoritative reference
          base for Indian Legal Metrology and OIML international recommendations.
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-faint" />
            <TextInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, clause, subject or year…"
              className="pl-9"
            />
          </div>
          <div className="w-48">
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="text-xs text-ink-faint">
          Showing <b>{filtered.length}</b> of {RULEBOOK_DOCUMENTS.length} documents
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((doc) => (
          <div
            key={doc.id}
            onClick={() => setSelectedDoc(doc)}
            className="card group cursor-pointer p-4 transition duration-200 hover:-translate-y-0.5 hover:border-accent-500 hover:shadow-panel"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="chip text-[11px] bg-navy-50 text-navy-800">
                {doc.category}
              </span>
              <span
                className={`chip text-[10px] font-semibold uppercase ${statusChipClass(
                  doc.status
                )}`}
              >
                {doc.status}
              </span>
            </div>

            <h3 className="mt-2.5 line-clamp-2 text-sm font-bold text-ink group-hover:text-accent-700">
              {doc.title}
            </h3>

            <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{doc.description}</p>

            <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-ink-faint">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {doc.year ?? 'N/A'}
              </span>
              <span className="font-mono text-[10px] truncate max-w-[130px]" title={doc.filename}>
                {doc.filename}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Document Detail / Reader Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-modal">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <span className="chip text-xs bg-navy-50 text-navy-800">
                  {selectedDoc.category}
                </span>
                <h2 className="mt-2 text-lg font-bold text-ink">{selectedDoc.title}</h2>
                <p className="text-xs text-ink-faint">
                  Issuing Organization: <b>{selectedDoc.issuingOrg}</b>
                </p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="btn-ghost h-8 w-8 !p-0 text-ink-faint hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-paper p-3 text-xs">
                <div>
                  <span className="text-ink-faint">Edition / Year:</span>{' '}
                  <span className="font-semibold text-ink">
                    {selectedDoc.year ?? 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-ink-faint">Regulatory Status:</span>{' '}
                  <span className="font-semibold capitalize text-ink">{selectedDoc.status}</span>
                </div>
                <div>
                  <span className="text-ink-faint">Source Filename:</span>{' '}
                  <span className="font-mono text-[11px] text-ink">{selectedDoc.filename}</span>
                </div>
                <div>
                  <span className="text-ink-faint">Relative Path:</span>{' '}
                  <span className="font-mono text-[11px] text-ink">{selectedDoc.path}</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-ink">Scope & Metrological Subject</h4>
                <p className="mt-1 text-ink-soft">{selectedDoc.description}</p>
              </div>

              <div>
                <h4 className="font-semibold text-ink">Source Verification</h4>
                <p className="mt-1 text-xs text-ink-faint leading-relaxed">
                  This document is physically housed in the project directory. In accordance with
                  non-negotiable regulatory safety rules, only verified clauses from this document
                  are mapped to the active compliance evaluation engine.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
              <button
                onClick={() => setSelectedDoc(null)}
                className="btn-ghost text-xs"
              >
                Close
              </button>
              <a
                href={`/${selectedDoc.path}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View / Download Source PDF
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tab B: Applied Rules
 * Answers: WHICH regulatory documents/rules are actually being used by THIS APPLICATION'S COMPLIANCE ENGINE?
 */
function AppliedRulesTab() {
  return (
    <div className="space-y-6">
      {/* Active Compliance Basis Hero */}
      <Card className="border-accent-200 bg-gradient-to-br from-navy-950 to-navy-900 text-white shadow-panel">
        <CardBody className="p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent-500/20 px-2.5 py-0.5 font-mono text-xs font-semibold text-accent-300">
                  ACTIVE COMPLIANCE BASIS
                </span>
                <span className="chip bg-pass-bg text-pass-fg font-bold">ENGINE ACTIVE</span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                OIML R 76-1:2006 + Indian Legal Metrology Rules, 2011
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Ruleset Identifier:{' '}
                <span className="font-mono font-bold text-accent-300">
                  {ACTIVE_COMPLIANCE_BASIS.activeRulesetId}
                </span>{' '}
                · Engine Version: <b>{ACTIVE_COMPLIANCE_BASIS.engineVersion}</b>
              </p>
            </div>
            <div className="text-right sm:border-l sm:border-white/10 sm:pl-6">
              <div className="text-xs uppercase tracking-wide text-slate-400">Total Mapped Rules</div>
              <div className="font-display text-3xl font-extrabold text-white">
                {APPLIED_RULES_REGISTRY.length}
              </div>
              <div className="mt-1 text-[11px] text-accent-300">Deterministic Metrology</div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-xs text-slate-400">Primary International Standard</div>
              <div className="font-semibold text-white">
                {ACTIVE_COMPLIANCE_BASIS.oiml.standard}
              </div>
              <div className="text-[11px] text-slate-400">
                Edition: {ACTIVE_COMPLIANCE_BASIS.oiml.edition}
              </div>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-xs text-slate-400">Indian National Overlay</div>
              <div className="font-semibold text-white">{ACTIVE_COMPLIANCE_BASIS.indianStatute.rules}</div>
              <div className="text-[11px] text-slate-400">
                Act: {ACTIVE_COMPLIANCE_BASIS.indianStatute.act}
              </div>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-xs text-slate-400">Recent Regulatory Gazette</div>
              <div className="font-semibold text-white">
                {ACTIVE_COMPLIANCE_BASIS.indianStatute.latestAmendmentApplied}
              </div>
              <div className="text-[11px] text-accent-300">Weighbridge substitution tiers</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Mapping Flowchart Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper px-6 py-4 text-xs">
        <span className="font-bold text-ink">COMPLIANCE TRACEABILITY CHAIN:</span>
        <span className="flex items-center gap-1.5 font-semibold text-ink-soft">
          Source PDF / Gazette <span className="text-accent-600">→</span> Clause / Schedule{' '}
          <span className="text-accent-600">→</span> Calculation Formula{' '}
          <span className="text-accent-600">→</span> MPE Envelope Evaluation{' '}
          <span className="text-accent-600">→</span> Deterministic PASS / FAIL
        </span>
      </div>

      {/* Applied Rules Registry Table */}
      <Card>
        <CardHeader
          title="Active Rules Registry"
          subtitle="Specific clauses mapped to the metrology test procedures and calculation algorithms"
          icon={<Scale className="h-5 w-5 text-accent-600" />}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper/60 text-[11px] uppercase tracking-wider text-ink-faint">
              <tr>
                <th className="th">Rule & Clause</th>
                <th className="th">Standard & Document</th>
                <th className="th">Applied By Engine</th>
                <th className="th">Calculation Formula / Logic</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {APPLIED_RULES_REGISTRY.map((rule) => (
                <tr key={rule.id} className="hover:bg-paper/80">
                  <td className="td font-medium text-ink">
                    <div className="font-bold text-accent-700">{rule.clause}</div>
                    <div className="text-xs text-ink-soft">{rule.ruleTitle}</div>
                  </td>
                  <td className="td text-xs">
                    <span className="font-semibold text-ink">{rule.sourceDocTitle}</span>
                  </td>
                  <td className="td">
                    <span className="chip bg-navy-50 text-navy-800 text-xs font-semibold">
                      {rule.appliedBy}
                    </span>
                  </td>
                  <td className="td font-mono text-xs text-ink-soft">
                    <span className="rounded bg-paper px-2 py-1 text-accent-800">
                      {rule.engineFormula}
                    </span>
                  </td>
                  <td className="td">
                    <span className="chip bg-pass-bg text-pass-fg text-[11px] font-bold">
                      {rule.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function statusChipClass(st: string) {
  switch (st) {
    case 'Active':
      return 'bg-pass-bg text-pass-fg';
    case 'Reference':
      return 'bg-blue-100 text-blue-800';
    case 'Draft':
      return 'bg-amber-100 text-amber-800';
    case 'Superseded':
      return 'bg-ink-faint/10 text-ink-faint line-through';
    default:
      return 'bg-paper text-ink-faint';
  }
}
