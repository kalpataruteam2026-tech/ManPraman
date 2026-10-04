'use client';

import { useState } from 'react';
import { Library, BookOpen, ExternalLink } from 'lucide-react';
import { PageHeader, VerifyBadge, InfoRow } from '../components/ui/misc';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { RULESETS } from '../regulatory/registry';
import { fmtDate, classLabel } from '../lib/format';
import type { AccuracyClass } from '../domain/types';

const CLASSES: AccuracyClass[] = ['I', 'II', 'III', 'IIII'];

export default function RegulatoryLibrary() {
  const [activeId, setActiveId] = useState(RULESETS[0].id);
  const rs = RULESETS.find((r) => r.id === activeId)!;

  return (
    <div>
      <PageHeader
        icon={<Library className="h-5 w-5" />}
        title="Regulatory Library"
        subtitle="Versioned rulesets. Every report pins the exact version it was generated under."
      />

      <div className="flex flex-wrap gap-2">
        {RULESETS.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveId(r.id)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
              activeId === r.id ? 'border-accent-500 bg-white text-ink shadow-card' : 'border-line bg-paper text-ink-faint hover:text-ink'
            }`}
          >
            {r.standard} · {r.edition}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title={`${rs.standard} · ${rs.edition}`} subtitle={rs.jurisdiction} icon={<BookOpen className="h-4 w-4" />} actions={!rs.verified && <VerifyBadge note={rs.verifyNote} />} />
          <CardBody>
            <InfoRow label="Ruleset version" value={rs.rulesetVersion} />
            <InfoRow label="Jurisdiction" value={rs.jurisdiction} />
            <InfoRow label="Effective from" value={fmtDate(rs.effectiveFrom)} />
            <InfoRow label="Verified" value={rs.verified ? 'Yes' : 'Pending [VERIFY]'} />
            <div className="mt-3 border-t border-line pt-3">
              <div className="section-title mb-1">Source</div>
              <p className="text-sm text-ink-soft">{rs.source}</p>
              {rs.verifyNote && <p className="mt-2 rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn-fg">{rs.verifyNote}</p>}
            </div>
            <a href="https://www.oiml.org/en/files/pdf_r/r076-1-e92.pdf" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent-700">
              OIML R 76-1 publication <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Maximum permissible error (MPE)" subtitle={`Initial verification; in-service = ×${rs.stageMultiplier.inservice}`} />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-line bg-paper/60"><tr><th className="th">Class</th><th className="th">Load band (m = L/e)</th><th className="th">MPE</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {CLASSES.flatMap((c) =>
                    rs.mpeByClass[c].map((tier, i, arr) => {
                      const lower = i === 0 ? 0 : arr[i - 1].maxInE;
                      const band = i === 0 ? `0 ≤ m ≤ ${tier.maxInE?.toLocaleString()}` : tier.maxInE === null ? `m > ${lower?.toLocaleString()}` : `${lower?.toLocaleString()} < m ≤ ${tier.maxInE.toLocaleString()}`;
                      return (
                        <tr key={`${c}-${i}`}>
                          <td className="td">{i === 0 ? classLabel(c) : ''}</td>
                          <td className="td tabular">{band}</td>
                          <td className="td tabular font-semibold">±{tier.mpeInE} e</td>
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Tests defined" />
            <CardBody className="space-y-2">
              {rs.tests.map((t) => (
                <div key={t.testType} className="flex items-start justify-between gap-3 border-b border-line/60 pb-2 last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-ink">{t.name}</div>
                    <div className="text-xs text-ink-faint">{t.note}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {t.appliesToModes.map((m) => <span key={m} className="chip bg-paper capitalize text-ink-faint">{m}</span>)}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
