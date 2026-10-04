"""
WeighReport ReportKit
Generates print-ready A4 PDF and editable DOCX reports from a single ReportView model.
"""
from .builder import build_report_view, get_test_title
from .pdf_generator import generate_pdf_report
from .docx_generator import generate_docx_report

__all__ = ["build_report_view", "get_test_title", "generate_pdf_report", "generate_docx_report"]
