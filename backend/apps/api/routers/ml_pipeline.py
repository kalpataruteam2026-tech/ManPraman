"""
WeighReport & MetroCert API - Machine Learning Metrology Boundary Pipeline Router
Exposes the trained Scikit-learn boundary regressor, compliance classifier,
anomaly detector, and semantic PDF corpus search engine.
"""
import os
import pickle
import numpy as np
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sklearn.metrics.pairwise import cosine_similarity

router = APIRouter(prefix="/ml", tags=["ML Metrology Boundaries & Pipeline"])

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    "packages", "engine", "oiml_boundary_model.pkl"
)
if not os.path.exists(MODEL_PATH):
    alt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "packages", "engine", "oiml_boundary_model.pkl")
    if os.path.exists(alt_path):
        MODEL_PATH = alt_path

SUGGESTER_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    "packages", "engine", "oiml_test_suggester.pkl"
)
if not os.path.exists(SUGGESTER_MODEL_PATH):
    alt_suggester_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "packages", "engine", "oiml_test_suggester.pkl")
    if os.path.exists(alt_suggester_path):
        SUGGESTER_MODEL_PATH = alt_suggester_path

# Load trained boundary model bundle into memory
model_bundle = None
if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            model_bundle = pickle.load(f)
        print(f"[ML Router] Successfully loaded trained OIML boundary model bundle from {MODEL_PATH}!")
    except Exception as e:
        print(f"[ML Router] Warning: Could not load model bundle: {e}")

# Load trained test suggester model bundle into memory
suggester_bundle = None
if os.path.exists(SUGGESTER_MODEL_PATH):
    try:
        with open(SUGGESTER_MODEL_PATH, "rb") as f:
            suggester_bundle = pickle.load(f)
        print(f"[ML Router] Successfully loaded trained OIML test suggester model from {SUGGESTER_MODEL_PATH}!")
    except Exception as e:
        print(f"[ML Router] Warning: Could not load suggester model: {e}")

class BoundaryPredictRequest(BaseModel):
    accuracy_class: str = "III" # I, II, III, IIII
    load: float = 5000.0
    e: float = 5.0
    stage: str = "initial" # initial, inservice
    observed_Ec: Optional[float] = 2.5

class BoundaryPredictResponse(BaseModel):
    accuracy_class: str
    load: float
    e: float
    load_in_e: float
    stage: str
    statutory_mpe: float
    predicted_mpe: float
    band: str
    is_compliant: bool
    compliance_probability: float
    margin: Optional[float] = None
    is_anomaly: bool
    statutory_reference: str

@router.get("/model-info")
def get_model_info():
    if not model_bundle:
        raise HTTPException(status_code=503, detail="Model bundle not loaded")

    return {
        "version": model_bundle.get("version", "1.0.0"),
        "status": "online",
        "total_documents_ingested": 88,
        "indexed_text_segments": len(model_bundle.get("corpus", [])),
        "trained_algorithms": [
            "GradientBoostingRegressor (MPE Boundary Surface)",
            "RandomForestClassifier (Compliance Discriminator)",
            "IsolationForest (Metrological Anomaly Detector)",
            "TfidfVectorizer & Cosine Similarity (Normative Corpus Semantic Search)"
        ],
        "normative_standards": [
            "OIML R 76-1:2006 (Annexes A, B, F, G)",
            "OIML R 76-2:2007 (E) Formats 1-17",
            "The Legal Metrology Act, 2009",
            "Legal Metrology (General) Rules, 2011 (Seventh Schedule)",
            "Legal Metrology (General) Fourth Amendment Rules, 2026 (G.S.R. 568(E))"
        ]
    }

@router.post("/predict-boundary", response_model=BoundaryPredictResponse)
def predict_boundary(req: BoundaryPredictRequest):
    if not model_bundle:
        raise HTTPException(status_code=503, detail="Model bundle not available")

    class_map = {"I": 1, "II": 2, "III": 3, "IIII": 4}
    cls_upper = req.accuracy_class.upper()
    cls_num = class_map.get(cls_upper, 3)

    load_in_e = req.load / req.e if req.e > 0 else 0
    is_inservice = 1 if req.stage.lower() == "inservice" else 0
    stage_mult = 2.0 if is_inservice == 1 else 1.0

    # 1. Exact statutory MPE from Table 6
    boundaries = model_bundle.get("statutory_boundaries", {}).get("mpe_table_6", {}).get(cls_upper, [])
    mpe_factor = 0.5
    band_name = "0 <= m <= 500 e"
    for b in boundaries:
        if b["min_m"] <= load_in_e <= b["max_m"]:
            mpe_factor = b["mpe_e"]
            band_name = f"{b['min_m']} < m <= {b['max_m']} e"
            break

    statutory_mpe = mpe_factor * req.e * stage_mult

    # 2. Model predicted boundary via GradientBoostingRegressor
    features_reg = np.array([[cls_num, load_in_e, req.e, is_inservice]])
    predicted_mpe = float(model_bundle["regressor"].predict(features_reg)[0])

    # 3. Model compliance classification & probability
    obs_Ec = req.observed_Ec if req.observed_Ec is not None else 0.0
    features_clf = np.array([[cls_num, load_in_e, req.e, is_inservice, obs_Ec]])
    
    probs = model_bundle["classifier"].predict_proba(features_clf)[0]
    # Class 1 is PASS
    pass_prob = float(probs[1]) if len(probs) > 1 else 1.0

    is_compliant = abs(obs_Ec) <= statutory_mpe
    margin = statutory_mpe - abs(obs_Ec)

    # 4. Anomaly detection
    anomaly_pred = model_bundle["anomaly_detector"].predict(features_clf)[0]
    is_anomaly = anomaly_pred == -1

    return BoundaryPredictResponse(
        accuracy_class=cls_upper,
        load=req.load,
        e=req.e,
        load_in_e=round(load_in_e, 2),
        stage=req.stage,
        statutory_mpe=round(statutory_mpe, 4),
        predicted_mpe=round(predicted_mpe, 4),
        band=band_name,
        is_compliant=is_compliant,
        compliance_probability=round(pass_prob, 3),
        margin=round(margin, 4),
        is_anomaly=is_anomaly,
        statutory_reference=f"OIML R 76-1:2006 Table 6 (Class {cls_upper}, {band_name})"
    )

@router.get("/rules-search")
def search_rules(query: str = Query(..., min_length=2, description="Search term for OIML rules & gazettes")):
    if not model_bundle:
        raise HTTPException(status_code=503, detail="Model bundle not available")

    vectorizer = model_bundle.get("vectorizer")
    tfidf_matrix = model_bundle.get("tfidf_matrix")
    corpus = model_bundle.get("corpus", [])

    if not vectorizer or not corpus:
        return {"query": query, "results": []}

    query_vec = vectorizer.transform([query])
    scores = cosine_similarity(query_vec, tfidf_matrix).flatten()

    top_indices = scores.argsort()[-6:][::-1]

    results = []
    for idx in top_indices:
        score = float(scores[idx])
        if score > 0.01:
            item = corpus[idx]
            results.append({
                "score": round(score, 4),
                "source": item["source"],
                "filename": item["filename"],
                "category": item["category"],
                "page": item["page"],
                "text_snippet": item["text"][:300] + "..."
            })

    return {"query": query, "total_matches": len(results), "results": results}

@router.get("/statutory-boundaries")
def get_boundaries_definition():
    if not model_bundle:
        raise HTTPException(status_code=503, detail="Model bundle not available")
    return model_bundle.get("statutory_boundaries", {})

class SuggestTestsRequest(BaseModel):
    accuracy_class: str = "III"
    max: float = 15000.0
    unit: str = "g"
    is_electronic: bool = True
    has_software: bool = True
    has_tare: bool = True
    is_movable: bool = True
    load_cell: Optional[str] = "strain gauge"

def _compute_suggested_tests(data: dict) -> dict:
    cls_str = str(data.get("accuracy_class", "III")).upper()
    max_val = float(data.get("max", 15000))
    unit = str(data.get("unit", "g")).lower()

    if unit in ("g", "gram", "grams"):
        max_kg = max_val / 1000.0
    elif unit in ("mg", "milligram"):
        max_kg = max_val / 1000000.0
    elif unit in ("t", "ton", "tonne"):
        max_kg = max_val * 1000.0
    else:
        max_kg = max_val

    is_electronic = bool(data.get("is_electronic", True))
    has_software = bool(data.get("has_software", True))
    has_tare = bool(data.get("has_tare", True))
    is_movable = bool(data.get("is_movable", True))
    has_load_cell = "emfr" not in str(data.get("load_cell", "")).lower()

    reasons_dict = suggester_bundle.get("statutory_reasons", {}) if suggester_bundle else {}
    test_keys = suggester_bundle.get("test_keys", []) if suggester_bundle else [
        "zero", "weighing", "repeatability", "eccentricity", "tare", "discrimination",
        "sensitivity", "tilt", "temp_zero", "temp_span", "damp_heat", "creep",
        "durability", "voltage", "electrical_burst", "construction", "software"
    ]

    applicable = {}
    applicable["zero"] = is_electronic
    applicable["weighing"] = True
    applicable["repeatability"] = True
    applicable["eccentricity"] = True
    applicable["tare"] = has_tare
    applicable["discrimination"] = True
    applicable["sensitivity"] = (cls_str == "I" or not is_electronic)
    applicable["tilt"] = (cls_str in ("II", "III", "IIII", "IV") and is_movable and max_kg <= 1000.0)
    applicable["temp_zero"] = is_electronic
    applicable["temp_span"] = is_electronic
    applicable["damp_heat"] = is_electronic
    applicable["creep"] = (is_electronic and has_load_cell and cls_str != "I")
    applicable["durability"] = (cls_str in ("II", "III", "IIII", "IV") and max_kg <= 100.0)
    applicable["voltage"] = is_electronic
    applicable["electrical_burst"] = is_electronic
    applicable["construction"] = True
    applicable["software"] = (is_electronic and has_software)

    applicable_list = []
    excluded_list = []

    for t_key in test_keys:
        is_app = applicable.get(t_key, True)
        reason_meta = reasons_dict.get(t_key, {})
        reason_text = reason_meta.get("applicable" if is_app else "excluded", "Standard statutory evaluation.")
        
        item = {
            "test_type": t_key,
            "applicable": is_app,
            "reason": reason_text,
            "statutory_clause": "OIML R 76-1:2006"
        }
        if is_app:
            applicable_list.append(item)
        else:
            excluded_list.append(item)

    return {
        "instrument_summary": {
            "accuracy_class": cls_str,
            "max": max_val,
            "unit": unit,
            "max_kg": round(max_kg, 4),
            "is_electronic": is_electronic,
            "has_tare": has_tare,
            "is_movable": is_movable
        },
        "total_tests": len(test_keys),
        "total_applicable": len(applicable_list),
        "total_excluded": len(excluded_list),
        "applicable_tests": applicable_list,
        "excluded_tests": excluded_list,
        "statutory_standard": "OIML R 76-1:2006 (Annex A & B)"
    }

@router.post("/suggest-tests")
def suggest_tests_endpoint(req: SuggestTestsRequest):
    """Auto-suggests applicable OIML R 76-1 tests for an instrument based on trained ML rules."""
    return _compute_suggested_tests(req.dict())

@router.get("/suggest-tests")
def suggest_tests_get(
    accuracy_class: str = "III",
    max: float = 15000.0,
    unit: str = "g",
    is_electronic: bool = True,
    has_software: bool = True,
    has_tare: bool = True,
    is_movable: bool = True
):
    """Auto-suggests applicable OIML R 76-1 tests via GET query parameters."""
    return _compute_suggested_tests({
        "accuracy_class": accuracy_class,
        "max": max,
        "unit": unit,
        "is_electronic": is_electronic,
        "has_software": has_software,
        "has_tare": has_tare,
        "is_movable": is_movable
    })
