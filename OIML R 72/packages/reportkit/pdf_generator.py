"""
WeighReport ReportKit - PDF Generator
Builds print-ready A4 PDF reports (Detailed and Summary) using ReportLab.
Features failure propagation, red highlighting for failed observations, and official OIML R 76-2 formatting.
"""
import os
from typing import Dict, Any
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from .builder import get_test_title

class NumberedCanvas(canvas.Canvas):
    """Adds running headers and footers with total page numbers."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, total_pages):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#475569"))

        # Header
        self.drawString(40, A4[1] - 30, "OIML R 76-2:2007 (E) — Non-Automatic Weighing Instruments Type Evaluation Report")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(40, A4[1] - 35, A4[0] - 40, A4[1] - 35)

        # Footer
        page_text = f"Report page {self._pageNumber} / {total_pages}"
        self.line(40, 40, A4[0] - 40, 40)
        self.drawString(40, 28, "WeighReport System — Normative Reference: OIML R 76-1 & R 76-2")
        self.drawRightString(A4[0] - 40, 28, page_text)
        self.restoreState()

def generate_pdf_report(
    view: Dict[str, Any],
    output_path: str,
    kind: str = "detailed"
) -> str:
    """
    Renders the unified ReportView into an A4 PDF document.
    kind: 'detailed' | 'summary'
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=18, leading=22,
        textColor=colors.HexColor('#0F172A'), alignment=1
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle', parent=styles['Normal'],
        fontName='Helvetica', fontSize=11, leading=15,
        textColor=colors.HexColor('#475569'), alignment=1
    )
    h1_style = ParagraphStyle(
        'H1', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=13, leading=17,
        textColor=colors.HexColor('#1E293B'), spaceBefore=14, spaceAfter=6
    )
    h2_style = ParagraphStyle(
        'H2', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=10, leading=14,
        textColor=colors.HexColor('#334155'), spaceBefore=8, spaceAfter=4
    )
    normal_style = ParagraphStyle(
        'NormalText', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8.5, leading=12,
        textColor=colors.HexColor('#1E293B')
    )
    code_style = ParagraphStyle(
        'CodeText', parent=styles['Normal'],
        fontName='Courier', fontSize=8, leading=10,
        textColor=colors.HexColor('#334155')
    )

    story = []
    meta = view.get("meta", {})
    lab = view.get("lab", {})
    inst = view.get("instrument", {})
    summary = view.get("summary", {})
    verdict = summary.get("overall_verdict", "INCOMPLETE")

    # Document Header
    story.append(Paragraph("OIML R 76-2 TYPE EVALUATION REPORT", title_style))
    story.append(Spacer(1, 4))
    report_type_text = "SHORT SUMMARY EVALUATION REPORT" if kind == "summary" else "DETAILED TYPE EVALUATION REPORT"
    story.append(Paragraph(f"<b>{report_type_text}</b> — Non-Automatic Weighing Instruments", subtitle_style))
    story.append(Spacer(1, 10))

    # Overall Verdict Banner
    banner_color = colors.HexColor("#10B981") if verdict == "PASSED" else (
        colors.HexColor("#EF4444") if verdict == "FAILED" else colors.HexColor("#F59E0B")
    )
    banner_text = f"OVERALL EVALUATION VERDICT: {verdict}"
    banner_table = Table(
        [[Paragraph(f"<font color='white' size='12'><b>{banner_text}</b></font>", ParagraphStyle('B', alignment=1))]],
        colWidths=[A4[0] - 80]
    )
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), banner_color),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('ROUNDEDCORNERS', [4, 4, 4, 4])
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 12))

    # General Information Table
    story.append(Paragraph("1. General Information Concerning the Type", h1_style))
    gen_info = [
        [Paragraph("<b>Application No.:</b>", normal_style), Paragraph(str(meta.get("application_no")), normal_style),
         Paragraph("<b>Date of Report:</b>", normal_style), Paragraph(str(meta.get("generated_at")), normal_style)],
        [Paragraph("<b>Type Designation:</b>", normal_style), Paragraph(str(inst.get("type_designation")), normal_style),
         Paragraph("<b>Accuracy Class:</b>", normal_style), Paragraph(f"Class {inst.get('accuracy_class')}", normal_style)],
        [Paragraph("<b>Manufacturer:</b>", normal_style), Paragraph(str(inst.get("manufacturer")), normal_style),
         Paragraph("<b>Max / Min:</b>", normal_style), Paragraph(f"{inst.get('Max')} {inst.get('unit')} / {inst.get('Min')} {inst.get('unit')}", normal_style)],
        [Paragraph("<b>Applicant:</b>", normal_style), Paragraph(str(inst.get("applicant")), normal_style),
         Paragraph("<b>e / d:</b>", normal_style), Paragraph(f"e = {inst.get('e')} {inst.get('unit')}, d = {inst.get('d')} {inst.get('unit')}", normal_style)],
        [Paragraph("<b>Instrument Category:</b>", normal_style), Paragraph(str(inst.get("category")), normal_style),
         Paragraph("<b>n = Max/e:</b>", normal_style), Paragraph(str(inst.get("n")), normal_style)],
        [Paragraph("<b>Testing Laboratory:</b>", normal_style), Paragraph(str(lab.get("name", "Metrology Lab")), normal_style),
         Paragraph("<b>Accreditation:</b>", normal_style), Paragraph(str(lab.get("accreditation_no", "ISO 17025")), normal_style)],
    ]
    t_gen = Table(gen_info, colWidths=[110, 150, 110, 145])
    t_gen.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor("#F8FAFC")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_gen)
    story.append(Spacer(1, 10))

    # Summary of Type Evaluation Table (Section 2)
    story.append(Paragraph("2. Summary of Type Evaluation (Pass/Fail Results)", h1_style))
    sum_headers = ["Test No.", "Test Designation", "Verdict", "Key Metric / Margin", "Remarks"]
    sum_data = [[Paragraph(f"<b>{h}</b>", normal_style) for h in sum_headers]]

    for row in summary.get("rows", []):
        r_verdict = row.get("result", "")
        v_color = "#10B981" if r_verdict == "PASSED" else ("#EF4444" if r_verdict == "FAILED" else "#F59E0B")
        sum_data.append([
            Paragraph(f"<b>{row.get('test_no')}</b>", normal_style),
            Paragraph(row.get("test_name", ""), normal_style),
            Paragraph(f"<font color='{v_color}'><b>{r_verdict}</b></font>", normal_style),
            Paragraph(str(row.get("key_result")), normal_style),
            Paragraph(str(row.get("remarks") or "-"), normal_style),
        ])

    t_sum = Table(sum_data, colWidths=[55, 175, 65, 110, 110])
    t_sum.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
    ]))
    story.append(t_sum)
    story.append(Spacer(1, 10))

    # Failures list if any
    failures = summary.get("failures", [])
    if failures:
        story.append(Paragraph("<b>Identified Non-Compliances / Failures:</b>", h2_style))
        for f in failures:
            fail_msg = f"• <b>{f.get('test_code')} ({f.get('test_name')})</b>: <font color='#DC2626'>{f.get('reason')}</font>"
            story.append(Paragraph(fail_msg, normal_style))
        story.append(Spacer(1, 8))

    # Checklist Summary Section
    chk = summary.get("checklist_counts", {})
    chk_text = (
        f"<b>Checklist §17 Examination Results:</b> "
        f"Passed: <font color='#10B981'><b>{chk.get('passed', 0)}</b></font> | "
        f"Failed: <font color='#EF4444'><b>{chk.get('failed', 0)}</b></font> | "
        f"N/A: {chk.get('na', 0)} | Total: {chk.get('total', 0)}"
    )
    story.append(Paragraph(chk_text, normal_style))
    story.append(Spacer(1, 14))

    # If it's a DETAILED report, append all test details
    if kind == "detailed":
        story.append(PageBreak())
        story.append(Paragraph("3. Test Observations and Detailed Calculations", h1_style))

        for t in view.get("tests", []):
            code = t.get("test_code", "")
            title = get_test_title(code)
            t_verdict = str(t.get("verdict", "incomplete")).upper()
            v_color = "#10B981" if t_verdict == "PASSED" else ("#EF4444" if t_verdict == "FAILED" else "#F59E0B")

            story.append(Paragraph(f"<b>{code} — {title}</b> [Verdict: <font color='{v_color}'><b>{t_verdict}</b></font>]", h2_style))
            
            # Formulas & rule clause
            story.append(Paragraph(
                "<i>Normative formulas:</i> Indication prior to rounding <code>P = I + ½e − ΔL</code>; "
                "Error <code>E = P − L</code>; Corrected error <code>Ec = E − E0</code>; Limit: <code>|Ec| ≤ |mpe|</code>.",
                normal_style
            ))
            story.append(Spacer(1, 4))

            # Table of observations
            rows = t.get("results", {}).get("rows", []) or t.get("data", {}).get("rows", [])
            if rows and isinstance(rows, list):
                table_headers = ["Loc/Row", "Kind", "Load L", "Indication I", "Add. Load ΔL", "P", "E", "E0", "Ec", "mpe", "Result"]
                t_data = [[Paragraph(f"<b>{h}</b>", normal_style) for h in table_headers]]
                
                table_styles = [
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F8FAFC")),
                    ('TOPPADDING', (0,0), (-1,-1), 2.5),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
                ]

                row_idx = 1
                for r in rows:
                    if not isinstance(r, dict):
                        continue
                    is_pass = r.get("pass", True)
                    bg = colors.HexColor("#FEE2E2") if not is_pass else colors.white
                    if not is_pass:
                        table_styles.append(('BACKGROUND', (0, row_idx), (-1, row_idx), bg))

                    pass_badge = "<font color='#10B981'><b>PASS</b></font>" if is_pass else "<font color='#DC2626'><b>FAIL</b></font>"
                    loc_label = str(r.get("loc") if "loc" in r else row_idx)
                    
                    t_data.append([
                        Paragraph(loc_label, normal_style),
                        Paragraph(str(r.get("kind", "load")), normal_style),
                        Paragraph(str(r.get("L", "-")), normal_style),
                        Paragraph(str(r.get("I", "-")), normal_style),
                        Paragraph(str(r.get("dL", "-")), normal_style),
                        Paragraph(str(r.get("P", "-")), normal_style),
                        Paragraph(str(r.get("E", "-")), normal_style),
                        Paragraph(str(r.get("E0", "-")), normal_style),
                        Paragraph(str(r.get("Ec", "-")), normal_style),
                        Paragraph(str(r.get("mpe", "-")), normal_style),
                        Paragraph(pass_badge, normal_style),
                    ])
                    row_idx += 1

                t_obs = Table(t_data, colWidths=[40, 40, 48, 55, 55, 50, 42, 42, 45, 50, 48])
                t_obs.setStyle(TableStyle(table_styles))
                story.append(t_obs)
                story.append(Spacer(1, 8))

        # Methodology Appendix
        story.append(PageBreak())
        story.append(Paragraph("4. Calculation Methodology and Rule Pack Specification", h1_style))
        story.append(Paragraph(
            "This test report was evaluated automatically by the WeighReport Rule Engine using exact decimal rational arithmetic. "
            "All Maximum Permissible Error (mpe) limits are computed directly from OIML R 76-1:2006 Table 6 according to accuracy class, "
            "verification scale interval (e), and net test load. Operator verdict override is mathematically prohibited.",
            normal_style
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(f"• Rule Pack: <b>{meta.get('rulepack_id')}</b> | Engine Version: <b>{meta.get('engine_version')}</b>", normal_style))
        story.append(Paragraph(f"• Data Snapshot SHA-256 Hash: <code>{meta.get('data_hash')}</code>", code_style))

    # Sign-off block
    story.append(Spacer(1, 16))
    sign_data = [
        [Paragraph("<b>Evaluated By:</b>", normal_style), Paragraph("<b>Reviewed & Approved By:</b>", normal_style)],
        [Paragraph("Test Engineer: Metrology Department<br/>Date: ________________________", normal_style),
         Paragraph("Technical Manager / Reviewer: Metrology Lab<br/>Date: ________________________", normal_style)],
        [Paragraph("Signature: ___________________", normal_style),
         Paragraph("Signature: ___________________", normal_style)],
    ]
    t_sign = Table(sign_data, colWidths=[250, 265])
    t_sign.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('LINEBELOW', (0,0), (-1,0), 0.5, colors.HexColor("#CBD5E1")),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F8FAFC")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(KeepTogether([t_sign]))

    doc.build(story, canvasmaker=NumberedCanvas)
    return output_path
