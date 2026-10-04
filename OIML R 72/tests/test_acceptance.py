"""
Acceptance Test Suite (AT-01 to AT-12) from PRD §12.2
Verifies end-to-end metrological compliance.
"""
from decimal import Decimal
from packages.engine import evaluate_test, aggregate_report_verdict, calculate_mpe, RangeInfo
from packages.engine.calculators import calculate_creep, calculate_disturbance

def test_at_01_eccentricity_failure_scenario():
    """
    AT-01: Out-of-tolerance eccentricity observation marks test FAILED
    and propagates failure into overall verdict.
    """
    instrument = {
        "accuracy_class": "III",
        "Max": "15000",
        "e": "5",
        "d": "5",
        "unit": "g"
    }

    # Location 1 (zero): I0 = 0, dL = 0.5 -> E0 = 2.0
    # Location 3: I = 5010, dL = 0.5 -> P = 5012.0, E = 12.0, Ec = 10.0 > mpe 5.0 -> FAIL
    test_payload = {
        "header": {"e": "5", "d": "5"},
        "data": {
            "rows": [
                {"loc": 1, "kind": "zero", "L": "0", "I": "0", "dL": "0.5"},
                {"loc": 3, "kind": "load", "L": "5000", "I": "5010", "dL": "0.5"}
            ]
        }
    }

    eval_res = evaluate_test("T3.1", instrument, test_payload)
    assert eval_res.verdict == "failed"
    row3 = eval_res.results["rows"][1]
    assert row3["pass"] is False
    assert Decimal(str(row3["Ec"])) == Decimal("10.0")
    assert Decimal(str(row3["mpe"])) == Decimal("5.0")

    overall_verdict, progress = aggregate_report_verdict(
        test_verdicts=[eval_res.verdict, "passed"],
        checklist_verdicts=["passed"]
    )
    assert overall_verdict == "failed"

def test_at_02_boundary_inclusive_500e():
    """
    AT-02: Load exactly at 500 e, Class III gets mpe = 0.5 e (inclusive upper bound).
    """
    ranges = [RangeInfo(idx=1, e_val=Decimal("5"), d_val=Decimal("5"), max_val=Decimal("15000"), unit="g")]
    # Exactly 500 e = 2500 g
    res = calculate_mpe("III", "2500", ranges, "g")
    assert res.k == Decimal("0.5")
    assert res.abs_mpe == Decimal("2.5")

def test_at_03_multi_interval_second_interval():
    """
    AT-03: Multi-interval instrument, load in 2nd interval uses e2.
    """
    ranges = [
        RangeInfo(idx=1, e_val=Decimal("2"), d_val=Decimal("2"), max_val=Decimal("6000"), unit="g"),
        RangeInfo(idx=2, e_val=Decimal("5"), d_val=Decimal("5"), max_val=Decimal("15000"), unit="g")
    ]
    # Load 10000 g lies in 2nd interval (6000 < m <= 15000)
    res = calculate_mpe("III", "10000", ranges, "g")
    assert res.e_used == Decimal("5")

def test_at_04_creep_condition_a():
    """
    AT-04: Creep condition a) met at 30 min -> test passes, later rows not required.
    """
    rows = [
        {"t": 0, "I": "10000", "dL": "0.5"},
        {"t": 5, "I": "10000", "dL": "0.5"},
        {"t": 15, "I": "10001", "dL": "0.5"},
        {"t": 30, "I": "10001", "dL": "0.5"}
    ]
    res = calculate_creep(rows, e=Decimal("5"), mpe_at_load=Decimal("5.0"))
    assert res.verdict == "passed"
    assert res.metrics.get("condition") == "a"

def test_at_06_at_07_disturbance_fault_handling():
    """
    AT-06: Deviation 2e with 'detected and acted upon' -> row PASS with flag.
    AT-07: Deviation 2e with no explanation -> FAILED.
    """
    e = Decimal("5")
    # AT-06
    res6 = calculate_disturbance([{"I": "5010", "fault_handling": "detected_and_acted"}], ref_indication=Decimal("5000"), e=e)
    assert res6.verdict == "passed"
    assert res6.rows[0]["flag"] == "detected"

    # AT-07
    res7 = calculate_disturbance([{"I": "5010", "fault_handling": "none"}], ref_indication=Decimal("5000"), e=e)
    assert res7.verdict == "failed"
