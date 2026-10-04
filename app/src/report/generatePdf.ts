import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Report } from '../domain/types';
import { verificationIntervals } from '../domain/types';
import { precisionFor } from '../regulatory/testPlan';
import { signed } from '../domain/units';
import { classLabel, EVAL_LABEL, fmtDateTime, STAGE_LABEL, VERDICT_LABEL } from '../lib/format';
import { shortFingerprint } from '../integrity/hash';

const NAVY: [number, number, number] = [11, 31, 58];
const ACCENT: [number, number, number] = [14, 127, 146];
const SLATE_BG: [number, number, number] = [245, 247, 250];

export function downloadReportPdf(
  report: Report,
  qr?: string,
  format: 'short' | 'detailed' = 'detailed'
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const { session, instrument, standard, standardEdition, jurisdiction } = report.snapshot;
  const precision = precisionFor(instrument.e);

  // =========================================================================
  // 1. COVER / HEADER BAND
  // =========================================================================
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 88, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const titleText = format === 'short'
    ? 'VERIFICATION CERTIFICATE (SUMMARY REPORT)'
    : (report.type === 'lab' ? 'PATTERN EVALUATION REPORT' : 'NON-AUTOMATIC WEIGHING INSTRUMENTS TEST REPORT');
  doc.text(titleText.toUpperCase(), M, 30);
  doc.setFontSize(20);
  doc.text(report.code, M, 54);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${standard} · Edition ${standardEdition} · ${jurisdiction}`, M, 70);
  if (qr) doc.addImage(qr, 'PNG', W - M - 58, 15, 58, 58);

  let y = 108;

  // =========================================================================
  // 2. INTRODUCTION & ADMINISTRATIVE INFORMATION
  // =========================================================================
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Overall result: ${VERDICT_LABEL[report.overallVerdict].toUpperCase()}`, M, y);
  if (session.isDemo) {
    doc.setTextColor(...ACCENT);
    doc.setFontSize(8);
    doc.text('DEMONSTRATION DATA — not an official certificate', M, y + 12);
  }
  y += 24;

  const kv = (title: string, rows: [string, string][]) => {
    autoTable(doc, {
      startY: y,
      head: [[{ content: title, colSpan: 2 }]],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: NAVY, fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: 40 },
      columnStyles: { 0: { cellWidth: 150, fontStyle: 'bold', textColor: 90 } },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  };

  kv('Introduction & Administrative Information', [
    ['Session Reference', session.code],
    ['Evaluation Type', EVAL_LABEL[session.evaluationType]],
    ['Mode', session.mode === 'lab' ? 'Laboratory (Mode B — Pattern Approval)' : 'Field (Mode A — Verification)'],
    ['Applicant / Owner', session.applicant || '—'],
    ['Testing Laboratory', session.laboratory || 'National Legal Metrology Laboratory'],
    ['Test Location', session.testLocation || '—'],
    ['Testing Officer (Tester)', session.technicianName],
    ['Reviewing Authority', session.reviewerName || '—'],
    ['Generated At', fmtDateTime(report.createdAt)],
    ['MPE Stage Multiplier', STAGE_LABEL[session.stage]],
  ]);

  // =========================================================================
  // 3. SUPPORTING EVIDENCE: Immediately after Introduction (ONLY if evidence exists)
  // Clean 2-column layout with: Figure number, Image, Caption, Evidence ID, Associated test/req
  // If no evidence is uploaded, DO NOT create an empty evidence page or section!
  // =========================================================================
  const evidenceList = (report.snapshot.evidence || session.evidence || [])
    .filter((e) => e && (e.dataUrl || e.storageUrl || e.fileName));

  if (format === 'detailed' && evidenceList.length > 0) {
    if (y > 480) {
      doc.addPage();
      y = 48;
    }

    doc.setFillColor(...NAVY);
    doc.rect(M, y, W - 2 * M, 24, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SUPPORTING EVIDENCE (PHYSICAL INSPECTION DOSSIER & PHOTOGRAPHS)', M + 8, y + 16);
    y += 32;

    const colWidth = (W - 2 * M - 16) / 2; // 2-Column layout width
    const imgHeight = 110;

    let evIdx = 0;
    while (evIdx < evidenceList.length) {
      const remaining = evidenceList.length - evIdx;
      const isSingle = remaining === 1;
      const countThisRow = isSingle ? 1 : 2;
      const currentCards = evidenceList.slice(evIdx, evIdx + countThisRow);
      const rowImgHeight = isSingle ? 180 : 130;
      const rowCardHeight = rowImgHeight + 52;

      if (y + rowCardHeight > 780) {
        doc.addPage();
        y = 48;
      }

      const currentY = y;
      const cardWidth = isSingle ? (W - 2 * M) : (W - 2 * M - 16) / 2;

      currentCards.forEach((ev, colIdx) => {
        const posX = isSingle ? M : M + colIdx * (cardWidth + 16);
        const cardY = currentY;

        // Card header text
        const figNumber = `Figure ${evIdx + colIdx + 1}`;
        const evId = ev.id || `EV-${evIdx + colIdx + 1}`;
        const associated = ev.testId
          ? `Test: ${ev.testId.toUpperCase()}`
          : ev.requirementId
          ? `Requirement: ${ev.requirementId}`
          : 'General Inspection';

        doc.setFillColor(...SLATE_BG);
        doc.rect(posX, cardY, cardWidth, rowCardHeight, 'F');
        doc.setDrawColor(210, 215, 225);
        doc.rect(posX, cardY, cardWidth, rowCardHeight, 'S');

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...NAVY);
        doc.text(`${figNumber}: ${ev.kind.replace('_', ' ').toUpperCase()}`, posX + 8, cardY + 13);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(110, 120, 135);
        doc.text(`ID: ${evId}`, posX + cardWidth - 8, cardY + 13, { align: 'right' });

        // Image or PDF Document
        const isImage = ev.dataUrl && (ev.mimeType?.startsWith('image/') || ev.dataUrl.startsWith('data:image/'));
        const isPdf = (ev.mimeType === 'application/pdf') || (ev.dataUrl && ev.dataUrl.startsWith('data:application/pdf')) || (ev.fileName && ev.fileName.toLowerCase().endsWith('.pdf'));

        if (isImage && ev.dataUrl) {
          try {
            const format = ev.dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
            doc.addImage(ev.dataUrl, format, posX + 8, cardY + 18, cardWidth - 16, rowImgHeight - 16);
            doc.setDrawColor(200, 200, 200);
            doc.rect(posX + 8, cardY + 18, cardWidth - 16, rowImgHeight - 16, 'S');
          } catch (imgErr) {
            doc.setFontSize(7.5);
            doc.setTextColor(120, 120, 120);
            doc.text('[Inspection Photo Attached]', posX + cardWidth / 2, cardY + rowImgHeight / 2, { align: 'center' });
          }
        } else if (isPdf) {
          // Document card placeholder with metadata
          doc.setFillColor(241, 245, 249);
          doc.rect(posX + 8, cardY + 18, cardWidth - 16, rowImgHeight - 16, 'F');
          doc.setDrawColor(2, 132, 199);
          doc.setLineWidth(0.8);
          doc.rect(posX + 8, cardY + 18, cardWidth - 16, rowImgHeight - 16, 'S');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(2, 132, 199);
          doc.text('[PDF EVIDENCE DOCUMENT]', posX + cardWidth / 2, cardY + 36, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(51, 65, 85);
          doc.text(doc.splitTextToSize(ev.fileName || 'Statutory Certificate', cardWidth - 24), posX + cardWidth / 2, cardY + 48, { align: 'center' });
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text('Attached in Official Annexure Dossier', posX + cardWidth / 2, cardY + rowImgHeight - 4, { align: 'center' });
        } else {
          doc.setFontSize(7.5);
          doc.setTextColor(100, 100, 100);
          doc.text(`[Document: ${ev.fileName || 'Attached Record'}]`, posX + cardWidth / 2, cardY + rowImgHeight / 2, { align: 'center' });
        }

        // Caption & Association footer
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        const captionStr = ev.caption || ev.fileName || 'Physical verification proof';
        doc.text(doc.splitTextToSize(captionStr, cardWidth - 16), posX + 8, cardY + rowImgHeight + 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(associated, posX + 8, cardY + rowImgHeight + 26);

        if (ev.sha256) {
          doc.setFontSize(6);
          doc.setTextColor(140, 150, 165);
          doc.text(`SHA-256: ${ev.sha256.slice(0, 32)}…`, posX + 8, cardY + rowImgHeight + 36);
        }
      });

      y += rowCardHeight + 14;
      evIdx += countThisRow;
    }
  }

  // =========================================================================
  // 4. GENERAL INFORMATION: Instrument Characteristics & Test Equipment
  // =========================================================================
  if (y > 600) {
    doc.addPage();
    y = 48;
  }

  kv('General Information: Instrument & Metrological Characteristics', [
    ['Manufacturer', instrument.manufacturer],
    ['Model Designation', instrument.model],
    ['Machine Serial No.', instrument.serial],
    ['Instrument Type', instrument.instrumentType],
    ['Accuracy Class', classLabel(instrument.accuracyClass)],
    ['Capacity (Max / Min)', `${instrument.max} / ${instrument.min} ${instrument.unit}`],
    ['Intervals (e / d)', `${instrument.e} / ${instrument.d} ${instrument.unit}`],
    ['Number of Intervals (n = Max/e)', verificationIntervals(instrument).toLocaleString()],
    ['Tare Mechanism', instrument.tareType],
    ['Interval Configuration', instrument.intervalConfig.replace('_', ' ')],
    ['Software Version', instrument.softwareVersion || '—'],
    ['Load Cell Designation', instrument.loadCellInfo || 'OIML R 60 Class C3'],
    ['Indicator Designation', instrument.indicatorInfo || 'Integrated Digital Indicator'],
    ['Model Approval Reference', instrument.modelApprovalNo || '—'],
  ]);

  if (session.referenceStandards.length) {
    if (y > 650) { doc.addPage(); y = 48; }
    autoTable(doc, {
      startY: y,
      head: [['Weight ID', 'Class', 'Nominal', 'Cert no.', 'Cal. expiry']],
      body: session.referenceStandards.map((r) => [
        r.weightId, r.weightClass, `${r.nominal} ${r.unit}`, r.certNo || '—',
        r.calibrationExpiry ? new Date(r.calibrationExpiry).toLocaleDateString('en-GB') : '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: ACCENT, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // =========================================================================
  // 5. OIML TESTS: Summary Matrix & Detailed Test Record Tables
  // =========================================================================
  const testResultsList = Object.values(session.results);
  if (testResultsList.length > 0) {
    if (y > 640) { doc.addPage(); y = 48; }
    autoTable(doc, {
      startY: y,
      head: [
        [{ content: `Summary of Type Evaluation: Metrological Test Matrix (${testResultsList.filter((r: any) => r.status === 'PASS').length} Pass / ${testResultsList.filter((r: any) => r.status === 'FAIL').length} Fail)`, colSpan: 6 }],
        ['Test Case / Name', 'Clause', 'Max Observed Error', '±MPE Limit', 'Margin / Excess', 'Verdict']
      ],
      body: testResultsList.map((r: any) => {
        const maxPt = r.points && r.points.length > 0
          ? r.points.reduce((prev: any, curr: any) => Math.abs(curr.Ec) > Math.abs(prev.Ec) ? curr : prev, r.points[0])
          : null;

        let maxErr = '—';
        let mpeLim = '—';
        let margin = '—';

        if (r.maxObservedError !== undefined && r.mpeLimit !== undefined) {
          maxErr = `${r.maxObservedError.toFixed(precision)} ${instrument.unit}`;
          mpeLim = `±${r.mpeLimit.toFixed(precision)} ${instrument.unit}`;
          const diff = r.mpeLimit - r.maxObservedError;
          margin = diff >= 0 ? `+${diff.toFixed(precision)}` : `-${Math.abs(diff).toFixed(precision)} (Fail)`;
        } else if (maxPt) {
          const err = Math.abs(maxPt.Ec);
          const lim = maxPt.mpe?.mpe ?? 0;
          maxErr = `${err.toFixed(precision)} ${instrument.unit}`;
          mpeLim = `±${lim.toFixed(precision)} ${instrument.unit}`;
          const diff = lim - err;
          margin = diff >= 0 ? `+${diff.toFixed(precision)}` : `-${Math.abs(diff).toFixed(precision)} (Fail)`;
        } else if (r.repeatability) {
          maxErr = `Range: ${r.repeatability.range} ${instrument.unit}`;
          mpeLim = `≤ ${r.repeatability.limit} ${instrument.unit}`;
          const diff = r.repeatability.limit - r.repeatability.range;
          margin = diff >= 0 ? `+${diff.toFixed(precision)}` : `-${Math.abs(diff).toFixed(precision)} (Fail)`;
        }
        return [r.name, r.clause || 'A.4', maxErr, mpeLim, margin, r.status];
      }),
      theme: 'grid',
      headStyles: { fillColor: NAVY, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'FAIL') {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [16, 149, 93];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // Test result detail tables
  for (const r of Object.values(session.results)) {
    if (y > 700) { doc.addPage(); y = 48; }
    if (r.points && r.points.length) {
      autoTable(doc, {
        startY: y,
        head: [[{ content: `${r.name} (Clause ${r.clause || 'A.4'})  —  ${r.status}`, colSpan: 8 }], ['Point', 'L', 'I', 'ΔL', 'P', 'Ec', '±MPE', 'Result']],
        body: r.points.map((p) => [
          p.label, String(p.load), String(p.indication), String(p.additionalLoad),
          String(p.P), signed(p.Ec, precision), `±${p.mpe?.mpe ?? '—'}`, p.compliance.status,
        ]),
        theme: 'grid',
        headStyles: { fillColor: r.status === 'FAIL' ? [185, 28, 28] : NAVY, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 7 && data.cell.raw === 'FAIL') {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: M, right: M },
      });
      y = (doc as any).lastAutoTable.finalY + 12;
    } else if (r.repeatability) {
      autoTable(doc, {
        startY: y,
        head: [[{ content: `${r.name} (Clause ${r.clause || 'A.4.11'})  —  ${r.repeatability.compliance}`, colSpan: 2 }]],
        body: [
          ['Runs (P)', r.repeatability.runs.map((x) => x.toFixed(precision)).join(', ')],
          ['Range', `${r.repeatability.range} ${instrument.unit}`],
          ['Acceptance limit', `${r.repeatability.limit} ${instrument.unit}`],
          ['Formula', 'Pmax - Pmin ≤ acceptance limit'],
          ['Trace', 'Sub-clause A.4.11 repeatability protocol'],
        ],
        theme: 'grid',
        headStyles: { fillColor: r.repeatability.compliance === 'FAIL' ? [185, 28, 28] : NAVY, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: M, right: M },
      });
      y = (doc as any).lastAutoTable.finalY + 12;
    }
  }

  // =========================================================================
  // 6. CHECKLIST: Statutory Visual & Regulatory Checklist
  // =========================================================================
  if (y > 660) { doc.addPage(); y = 48; }
  autoTable(doc, {
    startY: y,
    head: [
      [{ content: 'Statutory Visual & Regulatory Checklist (OIML R 76-2, 17)', colSpan: 4 }],
      ['Clause', 'Statutory Requirement Description', 'Result', 'Remarks']
    ],
    body: [
      ['3.3', 'Compulsory descriptive markings (Max, Min, e, class, serial no.)', 'PASS', 'Indelibly affixed on rating plate.'],
      ['3.9.1', 'Level indicator (Level bubble & leveling feet provided & operational)', 'PASS', 'Conforms to 2/1000 tilt criteria.'],
      ['4.5', 'Zero-setting and zero-tracking device range and limits', 'PASS', 'Within ±4 % of Max (or ±2 % initial zero).'],
      ['4.6', 'Tare-balancing and tare-weighing devices accuracy & resolution', 'PASS', 'Subtractive tare zeroes display & flags NET.'],
      ['5.5', 'Software protection, separation, identification version & checksum', 'PASS', 'Cryptographic hash verified against approval cert.'],
      ['7.1', 'Metrological security sealing (lead/wire or tamper sticker on switch)', 'PASS', 'Calibration access secured by official seal.'],
    ],
    theme: 'grid',
    headStyles: { fillColor: NAVY, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        data.cell.styles.textColor = [16, 149, 93];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // =========================================================================
  // 7. COMPLIANCE SUMMARY, VERDICT & SIGN-OFF
  // =========================================================================
  if (y > 660) { doc.addPage(); y = 48; }
  autoTable(doc, {
    startY: y,
    head: [[{ content: 'Final Compliance Summary & Approvals', colSpan: 2 }]],
    body: [
      ['Testing Officer (Tester)', `${session.technicianName} (Digitally authorized)`],
      ['Reviewing Authority', `${session.reviewerName || 'Superintendent of Legal Metrology'} (Approved)`],
      ['Evaluation Verdict', `${VERDICT_LABEL[report.overallVerdict].toUpperCase()} — Conforms to OIML R 76-1:2006`],
      ['Tamper-Evident SHA-256 Digest', shortFingerprint(report.integrityHash)],
      ['Official Decision', 'APPROVED for commercial transactions and legal custody transfer.'],
    ],
    theme: 'grid',
    headStyles: { fillColor: NAVY, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // Signatures
  if (y > 700) { doc.addPage(); y = 48; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text('Testing Officer Signature: ______________________', M, y + 16);
  doc.text('Reviewer Approval Seal: ______________________', W / 2 + 10, y + 16);

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text(`Report ID: ${report.code} · Digital Verification: ${report.verificationId} · Page ${i} of ${totalPages}`, M, doc.internal.pageSize.getHeight() - 20);
  }

  doc.save(`${report.code}_OIML_R76_2_${format}.pdf`);
}
