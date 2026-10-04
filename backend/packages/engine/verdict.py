"""
WeighReport Engine - Verdict Aggregation
Enforces strict compliance precedence: FAILED dominates, then INCOMPLETE, then PASSED.
No manual verdict override allowed.
"""
from typing import List, Dict, Any, Tuple

PRECEDENCE = {
    "failed": 3,
    "incomplete": 2,
    "passed": 1,
    "not_applicable": 0
}

def aggregate_report_verdict(
    test_verdicts: List[str],
    checklist_verdicts: List[str]
) -> Tuple[str, float]:
    """
    Computes overall report verdict and completion progress percentage.
    
    Returns:
      (overall_verdict, progress_pct)
    """
    all_applicable = []
    completed_count = 0

    # Tests
    for v in test_verdicts:
        v_norm = str(v).lower().strip()
        if v_norm != "not_applicable":
            all_applicable.append(v_norm)
            if v_norm in ("passed", "failed"):
                completed_count += 1

    # Checklist sections
    for v in checklist_verdicts:
        v_norm = str(v).lower().strip()
        if v_norm != "not_applicable":
            all_applicable.append(v_norm)
            if v_norm in ("passed", "failed"):
                completed_count += 1

    if not all_applicable:
        return "incomplete", 0.0

    progress_pct = round((completed_count / len(all_applicable)) * 100.0, 1)

    # Any failed -> report FAILED immediately (early failure propagation)
    if "failed" in all_applicable:
        return "failed", progress_pct

    # Any incomplete -> report INCOMPLETE
    if "incomplete" in all_applicable:
        return "incomplete", progress_pct

    # All applicable passed -> report PASSED
    return "passed", progress_pct
