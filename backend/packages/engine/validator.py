"""
WeighReport Engine - Validation Engine
Implements entry-time and submit-time validation rules from PRD Appendix B and TRD §7.7.
"""
from decimal import Decimal
from typing import List, Dict, Any, Optional
from datetime import date, datetime
from pydantic import BaseModel

from .numeric import to_decimal, is_1_2_5_step
from .mpe import normalize_class

class ValidationIssue(BaseModel):
    id: str
    severity: str # 'error', 'warning', 'info'
    path: str
    message: str
    acknowledged: bool = False
    reason: Optional[str] = None

# Class n limits (OIML R 76-1 Table 3)
CLASS_N_LIMITS = {
    "I": {"min_n": 50000, "max_n": None},
    "II": {"min_n": 100, "max_n": 100000},
    "III": {"min_n": 500, "max_n": 10000},
    "IIII": {"min_n": 100, "max_n": 1000},
}

def validate_instrument(instrument_dict: Dict[str, Any]) -> List[ValidationIssue]:
    """Validate instrument configuration."""
    issues = []
    cls = normalize_class(instrument_dict.get("accuracy_class", "III"))
    ranges = instrument_dict.get("ranges", [])

    if not ranges:
        # Check top-level e, d, Max
        e_val = to_decimal(instrument_dict.get("e", "0"))
        d_val = to_decimal(instrument_dict.get("d", "0"))
        max_val = to_decimal(instrument_dict.get("Max", "0"))
        ranges = [{"e": str(e_val), "d": str(d_val), "Max": str(max_val)}]

    prev_max = Decimal("0")
    prev_e = Decimal("0")

    for idx, r in enumerate(ranges):
        r_path = f"ranges[{idx}]"
        e = to_decimal(r.get("e", "0"))
        d = to_decimal(r.get("d", "0"))
        max_v = to_decimal(r.get("Max", "0"))

        # V-INS-01: e, d in {1, 2, 5} x 10^k
        if not is_1_2_5_step(e):
            issues.append(ValidationIssue(
                id="V-INS-01-e",
                severity="error",
                path=f"{r_path}.e",
                message=f"Verification scale interval e ({e}) must be of the form (1, 2, or 5) × 10^k."
            ))
        if not is_1_2_5_step(d):
            issues.append(ValidationIssue(
                id="V-INS-01-d",
                severity="error",
                path=f"{r_path}.d",
                message=f"Actual scale interval d ({d}) must be of the form (1, 2, or 5) × 10^k."
            ))

        # V-INS-03: d <= e
        if d > e:
            issues.append(ValidationIssue(
                id="V-INS-03",
                severity="error",
                path=f"{r_path}.d",
                message=f"Scale interval d ({d}) cannot exceed verification scale interval e ({e})."
            ))

        # Class I/II: e <= 10 d
        if cls in ("I", "II") and e > (Decimal("10") * d):
            issues.append(ValidationIssue(
                id="V-INS-03-ratio",
                severity="warning",
                path=f"{r_path}.e",
                message=f"For Class {cls}, e typically does not exceed 10 d (here e={e}, d={d})."
            ))

        # V-INS-02: n = Max / e
        if e > 0 and max_v > 0:
            n_calc = max_v / e
            if n_calc != int(n_calc):
                issues.append(ValidationIssue(
                    id="V-INS-02-int",
                    severity="error",
                    path=f"{r_path}.Max",
                    message=f"Number of scale intervals n = Max/e ({n_calc}) must be an integer."
                ))
            else:
                n_int = int(n_calc)
                limits = CLASS_N_LIMITS.get(cls, CLASS_N_LIMITS["III"])
                min_n = limits["min_n"]
                max_n = limits["max_n"]
                if n_int < min_n:
                    issues.append(ValidationIssue(
                        id="V-INS-02-min",
                        severity="error",
                        path=f"{r_path}.n",
                        message=f"n = {n_int} is below minimum {min_n} for Class {cls}."
                    ))
                if max_n is not None and n_int > max_n:
                    issues.append(ValidationIssue(
                        id="V-INS-02-max",
                        severity="error",
                        path=f"{r_path}.n",
                        message=f"n = {n_int} exceeds maximum {max_n} for Class {cls}."
                    ))

        # V-INS-04: multi-range monotonic checks
        if idx > 0:
            if max_v <= prev_max:
                issues.append(ValidationIssue(
                    id="V-INS-04-max",
                    severity="error",
                    path=f"{r_path}.Max",
                    message=f"Range {idx+1} Max ({max_v}) must be greater than previous range Max ({prev_max})."
                ))
            if e <= prev_e:
                issues.append(ValidationIssue(
                    id="V-INS-04-e",
                    severity="error",
                    path=f"{r_path}.e",
                    message=f"Range {idx+1} e ({e}) must be greater than previous range e ({prev_e})."
                ))

        prev_max = max_v
        prev_e = e

    return issues

def validate_observations(
    rows: List[Dict[str, Any]],
    d: Decimal,
    e: Decimal,
    Max: Decimal,
    tare: Decimal = Decimal("0")
) -> List[ValidationIssue]:
    """Validate grid observation values (load, indication, delta load)."""
    issues = []
    prev_L = None
    last_series = None

    for idx, r in enumerate(rows):
        r_path = f"rows[{idx}]"
        L = to_decimal(r.get("L", "0"))
        I = to_decimal(r.get("I", "0"))
        dL = to_decimal(r.get("dL", "0"))
        kind = str(r.get("kind", "load")).lower()
        series = r.get("series", "asc")

        # V-OBS-03: L <= Max + tare and L >= 0
        if L < Decimal("0"):
            issues.append(ValidationIssue(
                id="V-OBS-03-neg",
                severity="error",
                path=f"{r_path}.L",
                message=f"Load cannot be negative ({L})."
            ))
        if Max > Decimal("0") and L > (Max + tare):
            issues.append(ValidationIssue(
                id="V-OBS-03-max",
                severity="error",
                path=f"{r_path}.L",
                message=f"Load {L} exceeds Max + Tare ({Max + tare})."
            ))

        # V-OBS-01: I must be a multiple of d
        if d > Decimal("0") and I > Decimal("0"):
            ratio = I / d
            # Allow minor floating point / decimal rounding
            if abs(ratio - round(ratio)) > Decimal("0.0001"):
                issues.append(ValidationIssue(
                    id="V-OBS-01",
                    severity="error",
                    path=f"{r_path}.I",
                    message=f"Indication I ({I}) must be a multiple of actual scale interval d ({d})."
                ))

        # V-OBS-02: 0 <= dL <= d
        if dL < Decimal("0"):
            issues.append(ValidationIssue(
                id="V-OBS-02-neg",
                severity="error",
                path=f"{r_path}.dL",
                message=f"Additional load ΔL cannot be negative ({dL})."
            ))
        elif d > Decimal("0") and dL > d:
            issues.append(ValidationIssue(
                id="V-OBS-02-d",
                severity="warning",
                path=f"{r_path}.dL",
                message=f"Additional load ΔL ({dL}) should not exceed scale interval d ({d})."
            ))

        # V-OBS-04: |E| > 10 e warning
        P = I + (e / Decimal("2")) - dL
        E = P - L
        if e > Decimal("0") and abs(E) > (Decimal("10") * e):
            issues.append(ValidationIssue(
                id="V-OBS-04",
                severity="warning",
                path=f"{r_path}.E",
                message=f"Error |E| = {abs(E)} is implausibly large (> 10 e = {10*e}). Please verify raw observation."
            ))

        # V-OBS-05: Ascending / Descending order
        if kind != "zero":
            if series == "asc" and prev_L is not None and last_series == "asc":
                if L < prev_L:
                    issues.append(ValidationIssue(
                        id="V-OBS-05-asc",
                        severity="error",
                        path=f"{r_path}.L",
                        message=f"Ascending series loads must be monotonically increasing (current {L} < previous {prev_L})."
                    ))
            elif series == "desc" and prev_L is not None and last_series == "desc":
                if L > prev_L:
                    issues.append(ValidationIssue(
                        id="V-OBS-05-desc",
                        severity="error",
                        path=f"{r_path}.L",
                        message=f"Descending series loads must be monotonically decreasing (current {L} > previous {prev_L})."
                    ))
            prev_L = L
            last_series = series

    return issues

def validate_environment(env_dict: Dict[str, Any], accuracy_class: str) -> List[ValidationIssue]:
    """Validate temperature, humidity, pressure ranges."""
    issues = []
    cls = normalize_class(accuracy_class)

    # Temperature checks
    for phase in ("start", "max", "end"):
        t_val = env_dict.get("temp", {}).get(phase)
        if t_val is not None and str(t_val).strip() != "":
            t_dec = to_decimal(t_val)
            if t_dec < Decimal("-40") or t_dec > Decimal("80"):
                issues.append(ValidationIssue(
                    id="V-ENV-01-temp",
                    severity="warning",
                    path=f"env.temp.{phase}",
                    message=f"Temperature {t_dec}°C is outside typical lab test chamber bounds (-40 to 80°C)."
                ))

    # RH checks
    for phase in ("start", "max", "end"):
        rh_val = env_dict.get("rh", {}).get(phase)
        if rh_val is not None and str(rh_val).strip() != "":
            rh_dec = to_decimal(rh_val)
            if rh_dec < Decimal("0") or rh_dec > Decimal("100"):
                issues.append(ValidationIssue(
                    id="V-ENV-01-rh",
                    severity="error",
                    path=f"env.rh.{phase}",
                    message=f"Relative humidity must be between 0% and 100% (got {rh_dec}%)."
                ))

    # Pressure checks: mandatory for Class I
    pres_start = env_dict.get("pressure", {}).get("start")
    if cls == "I" and (pres_start is None or str(pres_start).strip() == ""):
        issues.append(ValidationIssue(
            id="V-ENV-03",
            severity="error",
            path="env.pressure.start",
            message="Barometric pressure is mandatory for Class I instruments."
        ))

    return issues
