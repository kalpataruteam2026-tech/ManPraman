"""
WeighReport ReportKit - Unified ReportView Builder
Creates the single deterministic data snapshot for both PDF and DOCX reports.
"""
import hashlib
import json
from datetime import datetime
from typing import Dict, Any, List

def build_report_view(
    report_dict: Dict[str, Any],
    tests_list: List[Dict[str, Any]],
    checklist_list: List[Dict[str, Any]],
    equipment_list: List[Dict[str, Any]],
    lab_dict: Dict[str, Any],
    evidence_list: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Constructs the canonical ReportView object per TRD §10.2.
    """
    if evidence_list is None:
        evidence_list = report_dict.get("evidence", [])
    instrument = report_dict.get("instrument", {})
    app = report_dict.get("application", {})
    overall_verdict = str(report_dict.get("verdict", "incomplete")).upper()
    if overall_verdict == "PASS":
        overall_verdict = "PASSED"
    elif overall_verdict == "FAIL":
        overall_verdict = "FAILED"

    summary_rows = []
    failures = []

    for t in sorted(tests_list, key=lambda x: str(x.get("test_code") or x.get("testType") or "")):
        code = t.get("test_code") or t.get("testType") or ""
        verdict = str(t.get("verdict") or t.get("status") or "incomplete").upper()
        if verdict == "PASS":
            verdict = "PASSED"
        elif verdict == "FAIL":
            verdict = "FAILED"

        results = t.get("results", {})
        metrics = results.get("metrics", {}) if isinstance(results, dict) else {}
        unit = instrument.get("unit", "g")

        # Resolve Max Observed Error
        max_Ec = t.get("maxObservedError")
        if max_Ec is None:
            max_Ec = metrics.get("max_abs_Ec")
        if max_Ec is None and "points" in t and t["points"]:
            pts = t["points"]
            try:
                max_Ec = max(abs(float(p.get("Ec", 0))) for p in pts)
            except Exception:
                pass

        # Resolve MPE Limit
        mpe_limit = t.get("mpeLimit")
        if mpe_limit is None:
            mpe_limit = metrics.get("mpe_limit")
        if mpe_limit is None and "points" in t and t["points"]:
            try:
                mpe_limit = float(t["points"][0].get("mpe", {}).get("mpe", 0))
            except Exception:
                pass

        max_err_str = f"{float(max_Ec):.3f} {unit}" if max_Ec is not None and max_Ec != "-" else "-"
        mpe_str = f"±{float(mpe_limit):.3f} {unit}" if mpe_limit is not None and mpe_limit != "-" else "-"

        # Calculate Margin / Excess
        margin_str = "-"
        if max_Ec is not None and mpe_limit is not None:
            try:
                diff = float(mpe_limit) - float(max_Ec)
                if diff >= 0:
                    margin_str = f"+{diff:.3f} {unit}"
                else:
                    margin_str = f"-{abs(diff):.3f} {unit} (Exceeded)"
            except Exception:
                pass

        key_result = f"Max |Ec|: {max_err_str} | Limit: {mpe_str}" if max_err_str != "-" else "-"
        remarks = t.get("remarks") or t.get("reasoning") or ("Compliant with OIML R-76" if verdict == "PASSED" else "Exceeded statutory tolerance limit")

        test_title = t.get("name") or get_test_title(code)
        clause = t.get("clause") or get_test_clause(code)

        summary_rows.append({
            "test_no": code,
            "test_name": test_title,
            "clause": clause,
            "result": verdict,
            "max_observed_error": max_err_str,
            "mpe_limit": mpe_str,
            "margin": margin_str,
            "key_result": key_result,
            "remarks": remarks,
            "step_calculations": t.get("stepCalculations") or t.get("step_calculations") or []
        })

        if verdict == "FAILED":
            failures.append({
                "test_code": code,
                "test_name": test_title,
                "reason": f"Observed error ({max_err_str}) exceeded statutory tolerance ({mpe_str}) [Clause {clause}]."
            })

    # Count checklist
    chk_passed = sum(1 for c in checklist_list if c.get("result") == "passed")
    chk_failed = sum(1 for c in checklist_list if c.get("result") == "failed")
    chk_na = sum(1 for c in checklist_list if c.get("result") == "na")

    if chk_failed > 0:
        failures.append({
            "test_code": "Checklist §17",
            "test_name": "Examination of construction and checklist",
            "reason": f"{chk_failed} checklist requirements marked as FAILED."
        })

    view = {
        "meta": {
            "application_no": app.get("application_no", report_dict.get("application_id", "")),
            "type_designation": app.get("type_designation", "Unknown Type"),
            "report_version": report_dict.get("version", 1),
            "status": str(report_dict.get("status", "draft")).upper(),
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "engine_version": report_dict.get("engine_version", "1.0.0"),
            "rulepack_id": report_dict.get("rulepack_id", "oiml-r76-2007")
        },
        "lab": lab_dict,
        "instrument": {
            "type_designation": app.get("type_designation", ""),
            "manufacturer": app.get("manufacturer", "Manufacturer Ltd"),
            "applicant": app.get("applicant", "Applicant Inc"),
            "category": app.get("instrument_category", "Complete instrument"),
            "accuracy_class": instrument.get("accuracy_class", "III"),
            "Max": instrument.get("Max", "15000"),
            "Min": instrument.get("Min", "100"),
            "e": instrument.get("e", "5"),
            "d": instrument.get("d", "5"),
            "n": instrument.get("n", "3000"),
            "unit": instrument.get("unit", "g"),
            "temperature_range": instrument.get("temperature_range", "-10 °C / +40 °C"),
            "power_supply": instrument.get("power_supply", "230 V AC, 50 Hz")
        },
        "equipment": equipment_list,
        "summary": {
            "overall_verdict": overall_verdict,
            "rows": summary_rows,
            "failures": failures,
            "checklist_counts": {
                "passed": chk_passed,
                "failed": chk_failed,
                "na": chk_na,
                "total": len(checklist_list)
            }
        },
        "tests": tests_list,
        "checklist": checklist_list,
        "evidence": evidence_list or []
    }

    # Deterministic data hash
    view_bytes = json.dumps(view, sort_keys=True, default=str).encode("utf-8")
    data_hash = hashlib.sha256(view_bytes).hexdigest()
    view["meta"]["data_hash"] = data_hash

    return view

def get_test_title(code: str) -> str:
    titles = {
        "T1": "Weighing Performance (A.4.4)",
        "T2": "Temperature Effect on No-Load (A.5.3.1 / A.5.3.2)",
        "T3.1": "Eccentricity using Weights (A.4.7.1-3)",
        "T3.2": "Eccentricity with Rolling Load (A.4.7.4)",
        "T4.1.1": "Discrimination - Digital Indication (A.4.8.2)",
        "T4.1.2": "Discrimination - Analog Indication (A.4.8.1)",
        "T4.2": "Sensitivity of Non-Self-Indicating (A.4.9)",
        "T5": "Repeatability Test (A.4.10)",
        "T6.1": "Zero Return Test (A.4.11.2)",
        "T6.2": "Creep Test (A.4.11.1)",
        "T7": "Stability of Equilibrium (A.4.12)",
        "T8": "Tilting Test (A.5.1)",
        "T9": "Tare Weighing Performance (A.4.6.1)",
        "T10": "Warm-up Time Test (A.5.2)",
        "T11": "Voltage Variations Test (A.5.4)",
        "T12.1": "AC Voltage Dips and Short Interruptions (B.3.1)",
        "T12.2": "Electrical Fast Transients / Bursts (B.3.2)",
        "T12.3": "Surges on Power and I/O Lines (B.3.3)",
        "T12.4": "Electrostatic Discharges (ESD) (B.3.4)",
        "T12.5": "Immunity to Radiated RF Electromagnetic Fields (B.3.5)",
        "T12.6": "Conducted RF Radio-Frequency Fields (B.3.6)",
        "T12.7": "Electrical Transients for Road Vehicles (B.3.7)",
        "T13a": "Damp Heat Steady State - Initial (B.2)",
        "T13b": "Damp Heat Steady State - High Temp/RH (B.2)",
        "T13c": "Damp Heat Steady State - Final (B.2)",
        "T14": "Span Stability Test (B.4)",
        "T15": "Endurance Test (A.6)",
        "16": "Examination of Construction",
        "17": "Checklist Examination (17.1-17.4)",
        # Named keys from frontend
        "weighing": "Weighing Performance",
        "zero": "Zero-Setting & Zero-Tracking",
        "temp_zero": "Temperature Effect on No-Load Indication",
        "temp_span": "Temperature Effect on Span Indication",
        "eccentricity": "Eccentricity (Off-Centre Loading)",
        "repeatability": "Repeatability Test Series",
        "discrimination": "Discrimination of Digital Indication",
        "tare": "Tare Device & Tare Weighing",
        "tilt": "Tilting Test at Limiting Angle",
        "warmup": "Warm-Up Time Stability",
        "creep": "Creep & Zero-Return Recovery",
        "voltage": "Voltage Variations & Power Supply",
        "damp_heat": "Damp Heat Steady State (48h @ 85% RH)",
        "span_stability": "Span Stability (8 Consecutive Runs)",
        "endurance": "Endurance & Durability (100k Cycles)",
    }
    return titles.get(code, f"Test {code}")

def get_test_clause(code: str) -> str:
    clauses = {
        "T1": "A.4.4",
        "T2": "A.5.3.1",
        "T3.1": "A.4.7.1",
        "T3.2": "A.4.7.4",
        "T4.1.1": "A.4.8.2",
        "T4.1.2": "A.4.8.1",
        "T4.2": "A.4.9",
        "T5": "A.4.10",
        "T6.1": "A.4.11.2",
        "T6.2": "A.4.11.1",
        "T7": "A.4.12",
        "T8": "A.5.1",
        "T9": "A.4.6.1",
        "T10": "A.5.2",
        "T11": "A.5.4",
        "T12.1": "B.3.1",
        "T12.2": "B.3.2",
        "T12.3": "B.3.3",
        "T12.4": "B.3.4",
        "T12.5": "B.3.5",
        "T12.6": "B.3.6",
        "T12.7": "B.3.7",
        "T13a": "B.2",
        "T13b": "B.2",
        "T13c": "B.2",
        "T14": "B.4",
        "T15": "A.6",
        "16": "Clause 4",
        "17": "Clause 5, 7",
        # Named keys
        "weighing": "A.4.4",
        "zero": "A.4.1, A.4.2",
        "temp_zero": "A.5.3.1",
        "temp_span": "A.5.3.2",
        "eccentricity": "A.4.7.1",
        "repeatability": "A.4.10",
        "discrimination": "A.4.8.2",
        "tare": "A.4.6.1",
        "tilt": "A.5.1",
        "warmup": "A.5.2",
        "creep": "A.4.11",
        "voltage": "A.5.4",
        "damp_heat": "B.2",
        "span_stability": "B.4",
        "endurance": "A.6",
    }
    return clauses.get(code, "A.4")
