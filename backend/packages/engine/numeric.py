"""
WeighReport Engine - Exact Decimal Numeric Layer
No binary floats allowed anywhere in the calculation path.
"""
from decimal import Decimal, getcontext, ROUND_HALF_EVEN, ROUND_HALF_UP
from fractions import Fraction
from typing import Union, Optional

# Set high precision for intermediate calculations
getcontext().prec = 40

# Conversion factors to canonical internal unit: milligram (mg)
MG_FACTORS = {
    "mg": Decimal("1"),
    "g": Decimal("1000"),
    "kg": Decimal("1000000"),
    "t": Decimal("1000000000"),
    "lb": Decimal("453592.37"),
    "oz": Decimal("28349.523125")
}

def to_decimal(val: Union[str, int, float, Decimal, None], default: str = "0") -> Decimal:
    """Safely convert any input to Decimal from string representation."""
    if val is None or val == "":
        return Decimal(default)
    if isinstance(val, Decimal):
        return val
    # Always convert float/int to str first to preserve string representation
    return Decimal(str(val).strip())

def to_mg(val: Union[str, Decimal, int], unit: str = "g") -> Decimal:
    """Convert a value in given unit to canonical milligrams (mg)."""
    d_val = to_decimal(val)
    unit_norm = unit.strip().lower()
    if unit_norm not in MG_FACTORS:
        raise ValueError(f"Unknown mass unit: {unit}")
    return d_val * MG_FACTORS[unit_norm]

def from_mg(val_mg: Union[str, Decimal, int], unit: str = "g") -> Decimal:
    """Convert a canonical milligram value to target unit."""
    d_mg = to_decimal(val_mg)
    unit_norm = unit.strip().lower()
    if unit_norm not in MG_FACTORS:
        raise ValueError(f"Unknown mass unit: {unit}")
    return d_mg / MG_FACTORS[unit_norm]

def quantize_display(val: Decimal, step: Optional[Decimal] = None) -> str:
    """
    Format decimal for display.
    If step is provided (e.g. 0.1, 0.5, 1), quantize to matching precision.
    """
    if val is None:
        return ""
    if step is not None and step > 0:
        # Determine number of decimal places from step
        step_str = format(step, 'f')
        if '.' in step_str:
            decimals = len(step_str.split('.')[1].rstrip('0'))
            if decimals == 0:
                decimals = 1
            pattern = Decimal('10') ** -decimals
            return str(val.quantize(pattern, rounding=ROUND_HALF_UP))
    # Default: format cleanly without scientific notation where possible
    s = format(val, 'f')
    if '.' in s:
        s = s.rstrip('0').rstrip('.')
    return s if s else "0"

def is_1_2_5_step(val: Decimal) -> bool:
    """
    Check if a value is of the form (1, 2, or 5) * 10^k.
    As required by OIML R 76 for e and d.
    """
    if val <= 0:
        return False
    # Normalize scientific string
    d = val.normalize()
    sign, digits, exponent = d.as_tuple()
    # Check if single leading digit is 1, 2, or 5
    if len(digits) == 1 and digits[0] in (1, 2, 5):
        return True
    return False
