"""
weighreport_engine - Pure Python calculation and compliance engine for OIML R 76
"""
from decimal import Decimal
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from .numeric import to_decimal, to_mg, from_mg, quantize_display, is_1_2_5_step
from .mpe import calculate_mpe, RangeInfo, MpeResult, normalize_class
from .calculators import (
    calculate_error_rows,
    calculate_temp_zero_change,
    calculate_discrimination_digital,
    calculate_repeatability,
    calculate_zero_return,
    calculate_creep,
    calculate_disturbance,
    CalculatorResult,
    Explanation
)
from .validator import (
    validate_instrument,
    validate_observations,
    validate_environment,
    ValidationIssue
)
from .evaluator import safe_eval
from .verdict import aggregate_report_verdict

class TestEvaluation(BaseModel):
    test_code: str
    status: str # 'not_started', 'in_progress', 'complete'
    verdict: str # 'passed', 'failed', 'incomplete', 'not_applicable'
    results: Dict[str, Any]
    explanations: List[Explanation]
    issues: List[ValidationIssue]

def evaluate_test(
    test_code: str,
    instrument: Dict[str, Any],
    test_payload: Dict[str, Any]
) -> TestEvaluation:
    """
    Server-authoritative evaluation of an individual test according to R 76-2.
    """
    data = test_payload.get("data", {})
    header = test_payload.get("header", {})
    config = test_payload.get("config", {})
    applicability = str(test_payload.get("applicability", "required")).lower()

    if applicability == "na" or applicability == "not_applicable":
        return TestEvaluation(
            test_code=test_code,
            status="complete",
            verdict="not_applicable",
            results={},
            explanations=[],
            issues=[]
        )

    # Instrument metadata
    cls = normalize_class(instrument.get("accuracy_class", "III"))
    unit = str(instrument.get("unit", "g"))
    tare = to_decimal(instrument.get("tare", "0"))
    pi = to_decimal(instrument.get("pi", "1.0"))

    # Build ranges
    raw_ranges = instrument.get("ranges", [])
    ranges = []
    if raw_ranges:
        for idx, r in enumerate(raw_ranges):
            ranges.append(RangeInfo(
                idx=idx + 1,
                e_val=to_decimal(r.get("e", "5")),
                d_val=to_decimal(r.get("d", "5")),
                max_val=to_decimal(r.get("Max", "15000")),
                unit=unit
            ))
    else:
        e_val = to_decimal(header.get("e") or instrument.get("e", "5"))
        d_val = to_decimal(header.get("d") or instrument.get("d", "5"))
        max_val = to_decimal(instrument.get("Max", "15000"))
        ranges.append(RangeInfo(idx=1, e_val=e_val, d_val=d_val, max_val=max_val, unit=unit))

    e_active = ranges[0].e_val
    d_active = ranges[0].d_val
    max_active = ranges[0].max_val

    # Run validation
    issues: List[ValidationIssue] = []
    issues.extend(validate_environment(header.get("env", {}), cls))

    calc_res: Optional[CalculatorResult] = None

    if test_code in ("T1", "T3.1", "T3.2", "T9", "T13a", "T13b", "T13c", "T15a", "T15c", "T8"):
        rows = data.get("rows", [])
        issues.extend(validate_observations(rows, d=d_active, e=e_active, Max=max_active, tare=tare))
        calc_res = calculate_error_rows(
            rows=rows,
            e=e_active,
            ranges=ranges,
            accuracy_class=cls,
            unit=unit,
            tare=tare,
            pi=pi
        )

    elif test_code == "T2":
        rows = data.get("rows", [])
        calc_res = calculate_temp_zero_change(rows, e=e_active, accuracy_class=cls, unit=unit)

    elif test_code == "T4.1.1":
        rows = data.get("rows", [])
        calc_res = calculate_discrimination_digital(rows, d=d_active)

    elif test_code == "T5":
        sets = data.get("sets", [])
        calc_res = calculate_repeatability(sets, e=e_active, ranges=ranges, accuracy_class=cls, unit=unit)

    elif test_code == "T6.1":
        calc_res = calculate_zero_return(data, e=e_active, e1=ranges[0].e_val if len(ranges) > 1 else None)

    elif test_code == "T6.2":
        rows = data.get("rows", [])
        mpe_load = calculate_mpe(cls, max_active, ranges, unit).abs_mpe
        calc_res = calculate_creep(rows, e=e_active, mpe_at_load=mpe_load)

    elif test_code.startswith("T12"):
        rows = data.get("rows", [])
        ref_I = to_decimal(data.get("ref_I", "0"))
        calc_res = calculate_disturbance(rows, ref_indication=ref_I, e=e_active, unit=unit)

    else:
        # Generic error rows fallback
        rows = data.get("rows", [])
        if rows:
            calc_res = calculate_error_rows(rows, e=e_active, ranges=ranges, accuracy_class=cls, unit=unit)
        else:
            calc_res = CalculatorResult(rows=[], verdict="incomplete", explanations=[])

    has_errors = any(i.severity == "error" for i in issues)
    status = "complete" if (calc_res.verdict in ("passed", "failed") and not has_errors) else "in_progress"

    return TestEvaluation(
        test_code=test_code,
        status=status,
        verdict=calc_res.verdict,
        results={
            "rows": calc_res.rows,
            "metrics": calc_res.metrics
        },
        explanations=calc_res.explanations,
        issues=issues
    )
