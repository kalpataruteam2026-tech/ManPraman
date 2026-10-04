"""
WeighReport Engine - Core Test Calculators
Implements all formulas and compliance rules from OIML R 76-2 and R 76-1.
All calculations use exact Decimal arithmetic.
"""
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel

from .numeric import to_decimal, quantize_display
from .mpe import RangeInfo, calculate_mpe, MpeResult

class Explanation(BaseModel):
    rule_id: str
    clause: str
    inputs: Dict[str, Any]
    formula: str
    values: Dict[str, Any]
    limit: Dict[str, Any]
    result: str # 'passed', 'failed', 'incomplete'
    message: str

class CalculatorResult(BaseModel):
    rows: List[Dict[str, Any]]
    verdict: str # 'passed', 'failed', 'incomplete', 'not_applicable'
    explanations: List[Explanation]
    metrics: Dict[str, Any] = {}

def calculate_error_rows(
    rows: List[Dict[str, Any]],
    e: Decimal,
    ranges: List[RangeInfo],
    accuracy_class: str,
    unit: str = "g",
    tare: Decimal = Decimal("0"),
    pi: Decimal = Decimal("1.0"),
    zero_ref_mode: str = "auto" # 'auto', 'each_measurement', 'series'
) -> CalculatorResult:
    """
    Core calculator for T1, T3.1, T3.2, T9, T13a-c, T15a/c, T8 (loaded).
    Formula:
      P = I + 1/2 e - dL
      E = P - L
      Ec = E - E0
      Pass = |Ec| <= |mpe|
    """
    out_rows = []
    explanations = []
    all_passed = True
    has_load_rows = False
    half_e = e / Decimal("2")

    last_zero_E = None
    max_abs_Ec = Decimal("0")
    min_margin = None

    for idx, r in enumerate(rows):
        row_dict = dict(r)
        kind = str(row_dict.get("kind", "load")).lower()
        L = to_decimal(row_dict.get("L", "0"))
        I = to_decimal(row_dict.get("I", "0"))
        dL = to_decimal(row_dict.get("dL", "0"))

        # P = I + 1/2 e - dL
        P = I + half_e - dL
        # E = P - L
        E = P - L

        row_dict["P"] = str(P)
        row_dict["E"] = str(E)

        if kind == "zero" or L == Decimal("0"):
            last_zero_E = E
            row_dict["E0"] = str(E)
            row_dict["Ec"] = "0"
            row_dict["pass"] = True
            out_rows.append(row_dict)
            continue

        # It's a load row
        has_load_rows = True
        E0 = last_zero_E if last_zero_E is not None else Decimal("0")
        Ec = E - E0
        abs_Ec = abs(Ec)
        row_dict["E0"] = str(E0)
        row_dict["Ec"] = str(Ec)

        # MPE lookup
        mpe_res = calculate_mpe(
            accuracy_class=accuracy_class,
            load=L,
            ranges=ranges,
            unit=unit,
            tare=tare,
            pi=pi
        )

        row_dict["mpe"] = str(mpe_res.abs_mpe)
        row_dict["k"] = str(mpe_res.k)
        row_dict["load_in_e"] = str(mpe_res.load_in_e)

        is_row_pass = abs_Ec <= mpe_res.abs_mpe
        row_dict["pass"] = is_row_pass

        if not is_row_pass:
            all_passed = False

        if abs_Ec > max_abs_Ec:
            max_abs_Ec = abs_Ec

        margin = mpe_res.abs_mpe - abs_Ec
        if min_margin is None or margin < min_margin:
            min_margin = margin

        # Create explanation
        status_str = "passed" if is_row_pass else "failed"
        loc_str = f" Loc {row_dict.get('loc')}" if 'loc' in row_dict else ""
        expl_msg = (
            f"Row {idx + 1}{loc_str}: |Ec| = {abs_Ec} {unit} "
            f"{'<=' if is_row_pass else '>'} mpe = {mpe_res.abs_mpe} {unit} "
            f"({mpe_res.k} e at {mpe_res.load_in_e} e, Class {mpe_res.accuracy_class})"
        )

        explanations.append(Explanation(
            rule_id=f"error_row_{idx+1}",
            clause="R 76-1 A.4.4 / A.4.7",
            inputs={"L": str(L), "I": str(I), "dL": str(dL), "e": str(e), "E0": str(E0)},
            formula="P = I + 1/2 e - dL; E = P - L; Ec = E - E0; |Ec| <= mpe",
            values={"P": str(P), "E": str(E), "Ec": str(Ec)},
            limit={"mpe": str(mpe_res.abs_mpe), "k": str(mpe_res.k), "load_in_e": str(mpe_res.load_in_e)},
            result=status_str,
            message=expl_msg
        ))

        out_rows.append(row_dict)

    if not has_load_rows:
        verdict = "incomplete"
    elif all_passed:
        verdict = "passed"
    else:
        verdict = "failed"

    return CalculatorResult(
        rows=out_rows,
        verdict=verdict,
        explanations=explanations,
        metrics={
            "max_abs_Ec": str(max_abs_Ec),
            "min_margin": str(min_margin if min_margin is not None else 0),
            "total_rows": len(out_rows)
        }
    )

def calculate_temp_zero_change(
    rows: List[Dict[str, Any]],
    e: Decimal,
    accuracy_class: str,
    unit: str = "g"
) -> CalculatorResult:
    """
    T2 Temperature effect on no-load (R 76-1 A.5.3.2)
    Consecutive steps:
      P = I + 1/2 e - dL
      dP = P2 - P1
      dT = T2 - T1
      zero_change_per_step = |dP| * step / |dT|
        (step = 5 °C for Class II/III/IIII, 1 °C for Class I)
      pass = zero_change_per_step < e
    """
    half_e = e / Decimal("2")
    step = Decimal("1.0") if accuracy_class == "I" else Decimal("5.0")
    out_rows = []
    explanations = []
    all_passed = True

    calculated_points = []
    for r in rows:
        row_dict = dict(r)
        temp = to_decimal(row_dict.get("temp", "20"))
        I = to_decimal(row_dict.get("I", "0"))
        dL = to_decimal(row_dict.get("dL", "0"))
        P = I + half_e - dL
        row_dict["P"] = str(P)
        calculated_points.append({"temp": temp, "P": P, "raw": row_dict})

    # Evaluate consecutive pairs
    for i in range(1, len(calculated_points)):
        p1 = calculated_points[i - 1]
        p2 = calculated_points[i]
        dP = p2["P"] - p1["P"]
        dT = p2["temp"] - p1["temp"]

        if dT == Decimal("0"):
            zc = Decimal("0")
        else:
            zc = (abs(dP) * step) / abs(dT)

        is_pass = zc < e
        if not is_pass:
            all_passed = False

        target_row = p2["raw"]
        target_row["dP"] = str(dP)
        target_row["dT"] = str(dT)
        target_row["zero_change"] = str(zc)
        target_row["pass"] = is_pass

        explanations.append(Explanation(
            rule_id=f"temp_step_{i}",
            clause="R 76-1 A.5.3.2",
            inputs={"P1": str(p1["P"]), "P2": str(p2["P"]), "T1": str(p1["temp"]), "T2": str(p2["temp"])},
            formula=f"zero_change = |dP| * {step} / |dT| < e",
            values={"dP": str(dP), "dT": str(dT), "zero_change": str(zc)},
            limit={"e": str(e)},
            result="passed" if is_pass else "failed",
            message=f"Step {i}: zero change {zc:.3f} {unit} per {step}°C {'<' if is_pass else '>='} e = {e} {unit}"
        ))

    for pt in calculated_points:
        out_rows.append(pt["raw"])

    verdict = "passed" if (all_passed and len(rows) >= 2) else ("incomplete" if len(rows) < 2 else "failed")
    return CalculatorResult(rows=out_rows, verdict=verdict, explanations=explanations)

def calculate_discrimination_digital(
    rows: List[Dict[str, Any]],
    d: Decimal
) -> CalculatorResult:
    """
    T4.1.1 Discrimination digital indication (R 76-1 A.4.8.2)
    Extra load = 1.4 d added in 1/10 d steps.
    Criterion: I2 - I1 >= d
    """
    out_rows = []
    explanations = []
    all_passed = True

    for idx, r in enumerate(rows):
        row_dict = dict(r)
        I1 = to_decimal(row_dict.get("I1", "0"))
        I2 = to_decimal(row_dict.get("I2", "0"))
        diff = I2 - I1
        is_pass = diff >= d
        if not is_pass:
            all_passed = False
        row_dict["diff"] = str(diff)
        row_dict["pass"] = is_pass
        out_rows.append(row_dict)

        explanations.append(Explanation(
            rule_id=f"disc_dig_{idx+1}",
            clause="R 76-1 A.4.8.2",
            inputs={"I1": str(I1), "I2": str(I2), "d": str(d)},
            formula="I2 - I1 >= d",
            values={"diff": str(diff)},
            limit={"d": str(d)},
            result="passed" if is_pass else "failed",
            message=f"Discrimination point {idx+1}: I2 - I1 = {diff} {'>=' if is_pass else '<'} d = {d}"
        ))

    verdict = "passed" if (all_passed and len(rows) > 0) else ("incomplete" if not rows else "failed")
    return CalculatorResult(rows=out_rows, verdict=verdict, explanations=explanations)

def calculate_repeatability(
    sets: List[Dict[str, Any]],
    e: Decimal,
    ranges: List[RangeInfo],
    accuracy_class: str,
    unit: str = "g"
) -> CalculatorResult:
    """
    T5 Repeatability (R 76-1 A.4.10)
    Two series of 10 weighings.
    (a) E_i <= mpe
    (b) Emax - Emin <= |mpe|
    """
    all_passed = True
    explanations = []
    out_sets = []
    half_e = e / Decimal("2")

    for s_idx, s in enumerate(sets):
        s_dict = dict(s)
        load = to_decimal(s_dict.get("L", "0"))
        weighings = s_dict.get("weighings", [])
        mpe_res = calculate_mpe(accuracy_class, load, ranges, unit)
        mpe_abs = mpe_res.abs_mpe

        errors = []
        out_weighings = []
        set_all_e_pass = True

        for w_idx, w in enumerate(weighings):
            w_dict = dict(w)
            I = to_decimal(w_dict.get("I", "0"))
            dL = to_decimal(w_dict.get("dL", "0"))
            P = I + half_e - dL
            E = P - load
            errors.append(E)
            w_pass = abs(E) <= mpe_abs
            if not w_pass:
                set_all_e_pass = False
            w_dict["P"] = str(P)
            w_dict["E"] = str(E)
            w_dict["pass"] = w_pass
            out_weighings.append(w_dict)

        if errors:
            e_max = max(errors)
            e_min = min(errors)
            e_range = e_max - e_min
            range_pass = e_range <= mpe_abs
        else:
            e_max = e_min = e_range = Decimal("0")
            range_pass = False

        set_pass = set_all_e_pass and range_pass and (len(weighings) >= 10)
        if not set_pass:
            all_passed = False

        s_dict["weighings"] = out_weighings
        s_dict["Emax"] = str(e_max)
        s_dict["Emin"] = str(e_min)
        s_dict["range"] = str(e_range)
        s_dict["mpe"] = str(mpe_abs)
        s_dict["pass"] = set_pass
        out_sets.append(s_dict)

        explanations.append(Explanation(
            rule_id=f"repeatability_set_{s_idx+1}",
            clause="R 76-1 3.6.1 & A.4.10",
            inputs={"L": str(load), "mpe": str(mpe_abs), "count": len(weighings)},
            formula="all(|E| <= mpe) and (Emax - Emin <= mpe)",
            values={"range": str(e_range), "Emax": str(e_max), "Emin": str(e_min)},
            limit={"mpe": str(mpe_abs)},
            result="passed" if set_pass else "failed",
            message=f"Set {s_idx+1}: Range = {e_range} {unit} {'<=' if range_pass else '>'} mpe {mpe_abs} {unit}"
        ))

    verdict = "passed" if (all_passed and len(sets) >= 2) else ("incomplete" if len(sets) < 2 else "failed")
    return CalculatorResult(rows=out_sets, verdict=verdict, explanations=explanations)

def calculate_zero_return(
    readings: Dict[str, Any],
    e: Decimal,
    e1: Optional[Decimal] = None
) -> CalculatorResult:
    """
    T6.1 Zero return (R 76-1 A.4.11.2)
    |P30 - P0| <= 0.5 e
    Multi-range: |P35 - P30| <= e1
    """
    half_e = e / Decimal("2")
    # 0 min
    I0 = to_decimal(readings.get("I0", "0"))
    dL0 = to_decimal(readings.get("dL0", "0"))
    P0 = I0 + half_e - dL0

    # 30 min
    I30 = to_decimal(readings.get("I30", "0"))
    dL30 = to_decimal(readings.get("dL30", "0"))
    P30 = I30 + half_e - dL30

    diff30 = abs(P30 - P0)
    pass30 = diff30 <= (Decimal("0.5") * e)
    all_pass = pass30

    res_data = {
        "P0": str(P0),
        "P30": str(P30),
        "diff30": str(diff30),
        "limit30": str(Decimal("0.5") * e),
        "pass30": pass30
    }

    explanations = [
        Explanation(
            rule_id="zero_return_30",
            clause="R 76-1 A.4.11.2",
            inputs={"P0": str(P0), "P30": str(P30)},
            formula="|P30 - P0| <= 0.5 e",
            values={"diff30": str(diff30)},
            limit={"limit": str(Decimal("0.5") * e)},
            result="passed" if pass30 else "failed",
            message=f"Zero return at 30 min: |P30 - P0| = {diff30} {'<=' if pass30 else '>'} 0.5 e ({Decimal('0.5') * e})"
        )
    ]

    # Multi-range check
    if "I35" in readings and readings["I35"] is not None:
        I35 = to_decimal(readings.get("I35", "0"))
        dL35 = to_decimal(readings.get("dL35", "0"))
        P35 = I35 + half_e - dL35
        diff35 = abs(P35 - P30)
        e1_limit = e1 if e1 is not None else e
        pass35 = diff35 <= e1_limit
        if not pass35:
            all_pass = False
        res_data["P35"] = str(P35)
        res_data["diff35"] = str(diff35)
        res_data["limit35"] = str(e1_limit)
        res_data["pass35"] = pass35

        explanations.append(Explanation(
            rule_id="zero_return_35",
            clause="R 76-1 A.4.11.2",
            inputs={"P30": str(P30), "P35": str(P35)},
            formula="|P35 - P30| <= e1",
            values={"diff35": str(diff35)},
            limit={"e1": str(e1_limit)},
            result="passed" if pass35 else "failed",
            message=f"Multi-range return at 35 min: |P35 - P30| = {diff35} {'<=' if pass35 else '>'} e1 ({e1_limit})"
        ))

    return CalculatorResult(rows=[res_data], verdict="passed" if all_pass else "failed", explanations=explanations)

def calculate_creep(
    rows: List[Dict[str, Any]],
    e: Decimal,
    mpe_at_load: Decimal
) -> CalculatorResult:
    """
    T6.2 Creep (R 76-1 A.4.11.1)
    Readings at 0, 5, 15, 30 min (and optionally 1, 2, 3, 4 h)
    Cond a): |P30 - P0| <= 0.5 e AND |P30 - P15| <= 0.2 e  --> PASS (stops at 30 min)
    Cond b): over 4 h, |P(t) - P(0)| <= mpe
    """
    half_e = e / Decimal("2")
    p_by_t = {}
    out_rows = []

    for r in rows:
        row_dict = dict(r)
        t = int(row_dict.get("t", 0)) # in minutes
        I = to_decimal(row_dict.get("I", "0"))
        dL = to_decimal(row_dict.get("dL", "0"))
        P = I + half_e - dL
        p_by_t[t] = P
        row_dict["P"] = str(P)
        out_rows.append(row_dict)

    if 0 not in p_by_t or 15 not in p_by_t or 30 not in p_by_t:
        return CalculatorResult(rows=out_rows, verdict="incomplete", explanations=[])

    P0 = p_by_t[0]
    P15 = p_by_t[15]
    P30 = p_by_t[30]

    dP30 = abs(P30 - P0)
    dP15_30 = abs(P30 - P15)

    cond_a_met = (dP30 <= Decimal("0.5") * e) and (dP15_30 <= Decimal("0.2") * e)

    if cond_a_met:
        expl = Explanation(
            rule_id="creep_cond_a",
            clause="R 76-1 A.4.11.1",
            inputs={"P0": str(P0), "P15": str(P15), "P30": str(P30), "e": str(e)},
            formula="|P30 - P0| <= 0.5 e and |P30 - P15| <= 0.2 e",
            values={"dP30": str(dP30), "dP15_30": str(dP15_30)},
            limit={"limit_30": str(Decimal("0.5") * e), "limit_15_30": str(Decimal("0.2") * e)},
            result="passed",
            message=f"Condition a) satisfied at 30 min: dP30={dP30} <= {Decimal('0.5')*e}, dP(15->30)={dP15_30} <= {Decimal('0.2')*e}"
        )
        return CalculatorResult(rows=out_rows, verdict="passed", explanations=[expl], metrics={"condition": "a", "terminated_at_min": 30})

    # If condition a fails, check condition b over 4h (240 min)
    required_times = [5, 15, 30, 60, 120, 180, 240]
    has_all_times = all(t in p_by_t for t in required_times)
    if not has_all_times:
        return CalculatorResult(
            rows=out_rows,
            verdict="incomplete",
            explanations=[
                Explanation(
                    rule_id="creep_incomplete",
                    clause="R 76-1 A.4.11.1",
                    inputs={},
                    formula="Condition a failed, 4-hour test required",
                    values={},
                    limit={},
                    result="incomplete",
                    message="Condition a) failed; full 4-hour observations (60, 120, 180, 240 min) are required."
                )
            ]
        )

    all_b_pass = True
    for t in required_times:
        dP = abs(p_by_t[t] - P0)
        if dP > mpe_at_load:
            all_b_pass = False

    expl_b = Explanation(
        rule_id="creep_cond_b",
        clause="R 76-1 A.4.11.1",
        inputs={"mpe": str(mpe_at_load)},
        formula="|P(t) - P0| <= mpe over 4 hours",
        values={},
        limit={"mpe": str(mpe_at_load)},
        result="passed" if all_b_pass else "failed",
        message=f"Condition b): All variations over 4h {'<=' if all_b_pass else '>'} mpe = {mpe_at_load}"
    )

    return CalculatorResult(
        rows=out_rows,
        verdict="passed" if all_b_pass else "failed",
        explanations=[expl_b],
        metrics={"condition": "b"}
    )

def calculate_disturbance(
    rows: List[Dict[str, Any]],
    ref_indication: Decimal,
    e: Decimal,
    unit: str = "g"
) -> CalculatorResult:
    """
    Disturbance tests T12.1 - T12.7 (dips, bursts, surges, ESD, RF, vehicle)
    Criterion:
      dev = |I - I_ref|
      dev <= e -> PASS
      dev > e:
        if fault_handling == 'detected_and_acted': PASS (flagged)
        elif fault_handling == 'not_significant' and remarks: PASS (flagged)
        else: FAIL
    """
    out_rows = []
    explanations = []
    all_passed = True

    for idx, r in enumerate(rows):
        row_dict = dict(r)
        I = to_decimal(row_dict.get("I", "0"))
        fault_handling = str(row_dict.get("fault_handling", "none")).lower()
        remarks = str(row_dict.get("remarks", "")).strip()

        dev = abs(I - ref_indication)
        row_dict["dev"] = str(dev)

        if dev <= e:
            is_pass = True
            flag = "normal"
            reason = f"|I - I_ref| = {dev} <= e ({e})"
        elif fault_handling == "detected_and_acted":
            is_pass = True
            flag = "detected"
            reason = f"Significant fault ({dev} > e) detected and acted upon"
        elif fault_handling == "not_significant" and len(remarks) > 0:
            is_pass = True
            flag = "explained"
            reason = f"Fault ({dev} > e) not significant: {remarks}"
        else:
            is_pass = False
            flag = "unhandled"
            reason = f"Significant fault |I - I_ref| = {dev} > e ({e}) without acceptable handling"

        if not is_pass:
            all_passed = False

        row_dict["pass"] = is_pass
        row_dict["flag"] = flag
        row_dict["evaluation"] = reason
        out_rows.append(row_dict)

        explanations.append(Explanation(
            rule_id=f"disturbance_row_{idx+1}",
            clause="R 76-1 B.3 / T.5.5.6",
            inputs={"I": str(I), "I_ref": str(ref_indication), "e": str(e), "handling": fault_handling},
            formula="|I - I_ref| <= e or detected_and_acted or not_significant",
            values={"deviation": str(dev)},
            limit={"e": str(e)},
            result="passed" if is_pass else "failed",
            message=f"Row {idx+1}: {reason}"
        ))

    verdict = "passed" if (all_passed and len(rows) > 0) else ("incomplete" if not rows else "failed")
    return CalculatorResult(rows=out_rows, verdict=verdict, explanations=explanations)
