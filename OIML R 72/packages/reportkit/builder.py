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
    lab_dict: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Constructs the canonical ReportView object per TRD §10.2.
    """
    instrument = report_dict.get("instrument", {})
    app = report_dict.get("application", {})
    overall_verdict = str(report_dict.get("verdict", "incomplete")).upper()

    summary_rows = []
    failures = []

    for t in sorted(tests_list, key=lambda x: str(x.get("test_code", ""))):
        code = t.get("test_code", "")
        verdict = str(t.get("verdict", "incomplete")).upper()
        results = t.get("results", {})
        metrics = results.get("metrics", {})
        max_Ec = metrics.get("max_abs_Ec", "-")
        unit = instrument.get("unit", "g")

        key_result = f"Max |Ec|: {max_Ec} {unit}" if max_Ec != "-" else "-"
        remarks = t.get("remarks") or ""

        summary_rows.append({
            "test_no": code,
            "test_name": get_test_title(code),
            "result": verdict,
            "key_result": key_result,
            "remarks": remarks
        })

        if verdict == "FAILED":
            failures.append({
                "test_code": code,
                "test_name": get_test_title(code),
                "reason": f"Observed errors exceeded maximum permissible error limits for {code}."
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
        "checklist": checklist_list
    }

    # Deterministic data hash
    view_bytes = json.dumps(view, sort_keys=True, default=str).encode("utf-8")
    data_hash = hashlib.sha256(view_bytes).hexdigest()
    view["meta"]["data_hash"] = data_hash

    return view

def get_test_title(code: str) -> str:
    titles = {
        "T1": "Weighing Performance (A.4.4)",
        "T2": "Temperature Effect on No-Load (A.5.3.2)",
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
        "17": "Checklist Examination (17.1-17.4)"
    }
    return titles.get(code, f"Test {code}")
