"""
WeighReport Engine - MPE (Maximum Permissible Error) Calculation
Conforming strictly to OIML R 76-1:2006 Table 6 (Clause 3.5.1).
"""
from decimal import Decimal
from typing import List, Dict, Optional, Union
from pydantic import BaseModel

from .numeric import to_decimal, to_mg, from_mg

class RangeInfo(BaseModel):
    idx: int = 1
    e_val: Decimal
    d_val: Decimal
    max_val: Decimal
    min_val: Decimal = Decimal("0")
    unit: str = "g"
    n: int = 3000

    @property
    def max_mg(self) -> Decimal:
        return to_mg(self.max_val, self.unit)

    @property
    def e_mg(self) -> Decimal:
        return to_mg(self.e_val, self.unit)

class MpeResult(BaseModel):
    abs_mpe: Decimal           # Absolute mpe in mass units (same unit as instrument/load)
    k: Decimal                 # Multiple of e (0.5, 1.0, 1.5)
    load_in_e: Decimal         # Load expressed in multiples of e (m/e)
    e_used: Decimal            # The scale interval e used for this load
    accuracy_class: str        # 'I', 'II', 'III', 'IIII'
    unit: str                  # Display unit
    formula: str               # Human-readable formula string
    clause: str = "R 76-1 3.5.1 (Table 6)"

# OIML R 76-1 Table 6: Maximum permissible errors for type evaluation / initial verification
MPE_TABLES: Dict[str, List[Dict[str, Optional[Decimal]]]] = {
    "I": [
        {"upper_e": Decimal("50000"), "k": Decimal("0.5")},
        {"upper_e": Decimal("200000"), "k": Decimal("1.0")},
        {"upper_e": None, "k": Decimal("1.5")},
    ],
    "II": [
        {"upper_e": Decimal("5000"), "k": Decimal("0.5")},
        {"upper_e": Decimal("20000"), "k": Decimal("1.0")},
        {"upper_e": Decimal("100000"), "k": Decimal("1.5")},
    ],
    "III": [
        {"upper_e": Decimal("500"), "k": Decimal("0.5")},
        {"upper_e": Decimal("2000"), "k": Decimal("1.0")},
        {"upper_e": Decimal("10000"), "k": Decimal("1.5")},
    ],
    "IIII": [
        {"upper_e": Decimal("50"), "k": Decimal("0.5")},
        {"upper_e": Decimal("200"), "k": Decimal("1.0")},
        {"upper_e": Decimal("1000"), "k": Decimal("1.5")},
    ],
}

# Normalize roman numerals or digits
CLASS_ALIASES = {
    "1": "I", "I": "I", "CLASS I": "I",
    "2": "II", "II": "II", "CLASS II": "II",
    "3": "III", "III": "III", "CLASS III": "III",
    "4": "IIII", "IIII": "IIII", "CLASS IIII": "IIII", "IV": "IIII"
}

def normalize_class(cls_raw: str) -> str:
    cleaned = str(cls_raw).strip().upper()
    return CLASS_ALIASES.get(cleaned, "III")

def get_applicable_range(ranges: List[RangeInfo], net_load: Decimal, unit: str) -> RangeInfo:
    """Find the range/interval corresponding to the given load."""
    if not ranges:
        raise ValueError("No instrument ranges defined")
    if len(ranges) == 1:
        return ranges[0]
    
    load_mg = to_mg(net_load, unit)
    # Ranges sorted by max_mg
    sorted_ranges = sorted(ranges, key=lambda r: r.max_mg)
    for r in sorted_ranges:
        if load_mg <= r.max_mg:
            return r
    return sorted_ranges[-1]

def calculate_mpe(
    accuracy_class: str,
    load: Union[str, Decimal, int],
    ranges: List[RangeInfo],
    unit: str = "g",
    tare: Union[str, Decimal, int] = Decimal("0"),
    pi: Union[str, Decimal] = Decimal("1.0"),
    in_service: bool = False
) -> MpeResult:
    """
    Computes MPE for a given net load according to OIML R 76-1 Table 6.
    
    Upper boundary is INCLUSIVE:
    Class III:
      0 <= m <= 500 e -> 0.5 e
      500 e < m <= 2000 e -> 1.0 e
      2000 e < m <= 10000 e -> 1.5 e
    """
    cls = normalize_class(accuracy_class)
    d_load = to_decimal(load)
    d_tare = to_decimal(tare)
    d_pi = to_decimal(pi, default="1.0")
    
    # Net load basis
    net_load = d_load - d_tare
    if net_load < Decimal("0"):
        # For evaluation, non-negative magnitude is considered
        net_load = abs(net_load)
        
    range_match = get_applicable_range(ranges, net_load, unit)
    e_val = range_match.e_val
    
    if e_val <= Decimal("0"):
        raise ValueError(f"Invalid verification scale interval e: {e_val}")
        
    load_in_e = net_load / e_val
    
    table = MPE_TABLES.get(cls, MPE_TABLES["III"])
    selected_k = table[-1]["k"] # fallback
    
    for band in table:
        upper = band["upper_e"]
        if upper is None or load_in_e <= upper:
            selected_k = band["k"]
            break
            
    factor = Decimal("2.0") if in_service else Decimal("1.0")
    abs_mpe = selected_k * e_val * d_pi * factor
    
    formula_str = f"±{selected_k} e = ±{abs_mpe} {unit} (at {load_in_e:.1f} e, Class {cls})"
    if d_pi != Decimal("1.0"):
        formula_str += f" [pi={d_pi}]"
        
    return MpeResult(
        abs_mpe=abs_mpe,
        k=selected_k,
        load_in_e=load_in_e,
        e_used=e_val,
        accuracy_class=cls,
        unit=unit,
        formula=formula_str
    )
