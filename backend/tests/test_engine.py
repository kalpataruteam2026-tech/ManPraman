"""
Unit tests for weighreport_engine
Validates decimal arithmetic, MPE tables, and individual calculators.
"""
from decimal import Decimal
from packages.engine.numeric import to_decimal, to_mg, from_mg, is_1_2_5_step
from packages.engine.mpe import calculate_mpe, RangeInfo
from packages.engine.calculators import (
    calculate_error_rows,
    calculate_temp_zero_change,
    calculate_creep,
    calculate_disturbance,
    calculate_zero_return
)

def test_decimal_numeric_conversions():
    assert to_mg("5", "g") == Decimal("5000")
    assert to_mg("1.5", "kg") == Decimal("1500000")
    assert from_mg("5000", "g") == Decimal("5")
    assert is_1_2_5_step(Decimal("0.1"))
    assert is_1_2_5_step(Decimal("0.2"))
    assert is_1_2_5_step(Decimal("0.5"))
    assert is_1_2_5_step(Decimal("1"))
    assert is_1_2_5_step(Decimal("2"))
    assert is_1_2_5_step(Decimal("5"))
    assert is_1_2_5_step(Decimal("10"))
    assert not is_1_2_5_step(Decimal("3"))
    assert not is_1_2_5_step(Decimal("4"))

def test_table6_mpe_boundaries_class3():
    ranges = [RangeInfo(idx=1, e_val=Decimal("5"), d_val=Decimal("5"), max_val=Decimal("15000"), unit="g")]
    # 0 <= m <= 500 e (2500 g) -> 0.5 e (2.5 g)
    m1 = calculate_mpe("III", "2500", ranges, "g")
    assert m1.k == Decimal("0.5")
    assert m1.abs_mpe == Decimal("2.5")

    # 500 e < m <= 2000 e (10000 g) -> 1.0 e (5.0 g)
    m2 = calculate_mpe("III", "5000", ranges, "g")
    assert m2.k == Decimal("1.0")
    assert m2.abs_mpe == Decimal("5.0")

    # 2000 e < m <= 10000 e -> 1.5 e (7.5 g)
    m3 = calculate_mpe("III", "12000", ranges, "g")
    assert m3.k == Decimal("1.5")
    assert m3.abs_mpe == Decimal("7.5")

def test_creep_condition_a_passes_at_30min():
    rows = [
        {"t": 0, "I": "15000", "dL": "0.5"},
        {"t": 5, "I": "15000", "dL": "0.5"},
        {"t": 15, "I": "15001", "dL": "0.5"},
        {"t": 30, "I": "15001", "dL": "0.5"}
    ]
    res = calculate_creep(rows, e=Decimal("5"), mpe_at_load=Decimal("7.5"))
    assert res.verdict == "passed"
    assert res.metrics.get("condition") == "a"

def test_disturbance_evaluation():
    rows = [
        {"I": "5002", "fault_handling": "none"}, # dev = 2 <= 5 -> pass
        {"I": "5015", "fault_handling": "detected_and_acted"}, # dev = 15 > 5 -> pass with detected flag
        {"I": "5020", "fault_handling": "not_significant", "remarks": "Visual transient only"}, # pass
        {"I": "5030", "fault_handling": "none"} # fail
    ]
    res = calculate_disturbance(rows, ref_indication=Decimal("5000"), e=Decimal("5"), unit="g")
    assert res.verdict == "failed"
    assert res.rows[0]["pass"] is True
    assert res.rows[1]["pass"] is True
    assert res.rows[2]["pass"] is True
    assert res.rows[3]["pass"] is False
