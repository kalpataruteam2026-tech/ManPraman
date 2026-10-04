"""
OIML R-76 & Indian Legal Metrology Boundary Training & Extraction Pipeline
Parses the normative PDF corpus (OIML R 76-1, R 76-2, and Indian Legal Metrology Gazettes),
extracts statutory boundaries, and trains a Scikit-Learn boundary prediction & compliance model.
"""
import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from decimal import Decimal

# Scikit-learn models
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier, IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import fitz # PyMuPDF

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(BASE_DIR))
WORKSPACE_DIR = os.path.dirname(BACKEND_DIR)

OIML_DIR = os.path.join(WORKSPACE_DIR, "OIML")
INSTRUMENTS_DIR = os.path.join(WORKSPACE_DIR, "Instruments_tests_details")
RULEPACKS_DIR = os.path.join(BACKEND_DIR, "rulepacks")
MODEL_OUTPUT_PATH = os.path.join(BASE_DIR, "oiml_boundary_model.pkl")
BOUNDARIES_JSON_PATH = os.path.join(RULEPACKS_DIR, "oiml_statutory_boundaries.json")

os.makedirs(RULEPACKS_DIR, exist_ok=True)

# =============================================================================
# 1. EXTRACT NORMATIVE RULES & TEXT CORPUS FROM PDFS
# =============================================================================

def extract_pdf_corpus() -> List[Dict[str, Any]]:
    """Extracts indexed text chunks from OIML and Indian Legal Metrology PDFs."""
    corpus = []
    pdf_sources = []

    # 1. Primary OIML R 76 Standards
    if os.path.exists(INSTRUMENTS_DIR):
        for f in os.listdir(INSTRUMENTS_DIR):
            if f.lower().endswith(".pdf"):
                pdf_sources.append((os.path.join(INSTRUMENTS_DIR, f), "OIML International Standard", f))

    # 2. Indian Legal Metrology Acts, Rules & 2026 Amendments
    if os.path.exists(OIML_DIR):
        for f in os.listdir(OIML_DIR):
            if f.lower().endswith(".pdf"):
                pdf_sources.append((os.path.join(OIML_DIR, f), "Indian Statutory Gazette / Rule", f))

    print(f"[Extractor] Ingesting {len(pdf_sources)} normative PDF documents...")

    for file_path, category, filename in pdf_sources:
        try:
            doc = fitz.open(file_path)
            for page_num in range(len(doc)):
                text = doc[page_num].get_text()
                cleaned = " ".join(text.split())
                if len(cleaned) > 60:
                    corpus.append({
                        "filename": filename,
                        "category": category,
                        "page": page_num + 1,
                        "text": cleaned[:1500],
                        "source": f"{filename} (p. {page_num + 1})"
                    })
            doc.close()
        except Exception as e:
            # Continue on individual unreadable files
            continue

    print(f"[Extractor] Extracted {len(corpus)} text segments from PDF corpus.")
    return corpus

# =============================================================================
# 2. COMPILE NORMATIVE STATUTORY BOUNDARIES (OIML R 76-1 Table 6 & India GSR 568(E))
# =============================================================================

def get_statutory_boundaries() -> Dict[str, Any]:
    """Defines exact normative statutory boundaries extracted from OIML R 76-1 & 2026 Amendment."""
    return {
        "mpe_table_6": {
            "I": [
                {"min_m": 0, "max_m": 50000, "mpe_e": 0.5, "formula": "± 0.5 e"},
                {"min_m": 50000, "max_m": 200000, "mpe_e": 1.0, "formula": "± 1.0 e"},
                {"min_m": 200000, "max_m": 100000000, "mpe_e": 1.5, "formula": "± 1.5 e"},
            ],
            "II": [
                {"min_m": 0, "max_m": 5000, "mpe_e": 0.5, "formula": "± 0.5 e"},
                {"min_m": 5000, "max_m": 20000, "mpe_e": 1.0, "formula": "± 1.0 e"},
                {"min_m": 20000, "max_m": 100000, "mpe_e": 1.5, "formula": "± 1.5 e"},
            ],
            "III": [
                {"min_m": 0, "max_m": 500, "mpe_e": 0.5, "formula": "± 0.5 e"},
                {"min_m": 500, "max_m": 2000, "mpe_e": 1.0, "formula": "± 1.0 e"},
                {"min_m": 2000, "max_m": 10000, "mpe_e": 1.5, "formula": "± 1.5 e"},
            ],
            "IIII": [
                {"min_m": 0, "max_m": 50, "mpe_e": 0.5, "formula": "± 0.5 e"},
                {"min_m": 50, "max_m": 200, "mpe_e": 1.0, "formula": "± 1.0 e"},
                {"min_m": 200, "max_m": 1000, "mpe_e": 1.5, "formula": "± 1.5 e"},
            ]
        },
        "stage_multipliers": {
            "initial": 1.0,
            "inservice": 2.0
        },
        "test_boundaries": {
            "T1_weighing": {"criterion": "|Ec| <= |mpe|", "formula": "P = I + 0.5e - dL, E = P - L, Ec = E - E0"},
            "T2_temp_zero": {"criterion": "delta_P / 5C <= e (Class II, III, IIII) or <= e / 1C (Class I)"},
            "T3_eccentricity": {"criterion": "|Ec| <= |mpe| at approx Max/3 (weights) or rolling load"},
            "T4_discrimination": {"criterion": "I2 - I1 >= d when 1.4d extra load applied"},
            "T5_repeatability": {"criterion": "Emax - Emin <= |mpe| over 10 or 20 runs"},
            "T61_zero_return": {"criterion": "|delta(P30 - P0)| <= 0.5 e after 30 min"},
            "T62_creep": {"criterion": "delta_P <= 0.5 e in 30 min, and <= 0.2 e between 15m and 30m"},
            "T7_stability": {"criterion": "deviation <= 1 e, zero setting E0 <= 0.25 e, tare balance E0 <= 0.25 e"},
            "T8_tilting": {"criterion": "unloaded delta_E <= 2 e, loaded delta_E <= |mpe|"},
            "T9_tare": {"criterion": "|Ec| <= |mpe| for net weighing at 2 tare levels"},
            "T10_warmup": {"criterion": "|EL - E0| <= |mpe| across 0, 5, 15, 30 min"},
            "T11_voltage": {"criterion": "|Ec| <= |mpe| between -15% and +10% Unom"},
            "T12_disturbances": {"criterion": "Significant fault > e detected and reacted upon"},
            "T13_damp_heat": {"criterion": "|Ec| <= |mpe| after 48h 85% RH @ 40C"},
            "T14_span_stability": {"criterion": "|(EL - E0)max - (EL - E0)min| <= 0.1 e over 8 runs"},
            "T15_endurance": {"criterion": "|Ec_init - Ec_final| <= |mpe| after 100,000 cycles"},
            "india_2026_substitution": {
                "clause": "Legal Metrology Fourth Amendment Rules 2026 (GSR 568(E))",
                "tiers": [
                    {"max_r": 0.2, "standard_weight_pct": 20, "condition": "r <= 0.2 e -> 20% Max standard weights"},
                    {"max_r": 0.3, "standard_weight_pct": 33.33, "condition": "0.2 e < r <= 0.3 e -> 33.33% Max standard weights"},
                    {"max_r": 999.0, "standard_weight_pct": 50, "condition": "r > 0.3 e -> 50% Max standard weights"}
                ]
            }
        }
    }

# =============================================================================
# 3. GENERATE DENSE TRAINING DATASET & TRAIN BOUNDARY ML MODELS
# =============================================================================

def generate_training_data(n_samples: int = 15000) -> pd.DataFrame:
    """Generates synthetic diverse metrological observation dataset for boundary fitting."""
    np.random.seed(42)
    classes = ["I", "II", "III", "IIII"]
    stages = ["initial", "inservice"]
    units = ["g", "kg"]

    data = []
    class_map = {"I": 1, "II": 2, "III": 3, "IIII": 4}

    boundaries = get_statutory_boundaries()["mpe_table_6"]

    for _ in range(n_samples):
        cls = np.random.choice(classes)
        stage = np.random.choice(stages)
        stage_mult = 2.0 if stage == "inservice" else 1.0

        # Verification scale interval e
        if cls == "I":
            e = np.random.choice([0.001, 0.002, 0.005, 0.01])
            max_intervals = np.random.randint(50000, 300000)
        elif cls == "II":
            e = np.random.choice([0.01, 0.05, 0.1, 0.5])
            max_intervals = np.random.randint(5000, 100000)
        elif cls == "III":
            e = np.random.choice([1.0, 2.0, 5.0, 10.0, 20.0, 50.0])
            max_intervals = np.random.randint(500, 10000)
        else: # IIII
            e = np.random.choice([10.0, 20.0, 50.0, 100.0])
            max_intervals = np.random.randint(100, 1000)

        Max = e * max_intervals
        load = np.random.uniform(0.0, Max)
        load_in_e = load / e

        # Determine exact theoretical MPE
        mpe_factor = 0.5
        for band in boundaries[cls]:
            if band["min_m"] <= load_in_e <= band["max_m"]:
                mpe_factor = band["mpe_e"]
                break
        
        statutory_mpe = mpe_factor * e * stage_mult

        # Generate realistic observed error Ec
        # 80% passing observations within corridor, 20% failing outliers
        is_compliant = np.random.rand() > 0.20
        if is_compliant:
            observed_Ec = np.random.uniform(-statutory_mpe, statutory_mpe)
            verdict = 1 # PASS
        else:
            # Out-of-tolerance error
            sign = np.random.choice([-1, 1])
            excess = np.random.uniform(0.1 * statutory_mpe, 2.5 * statutory_mpe)
            observed_Ec = sign * (statutory_mpe + excess)
            verdict = 0 # FAIL

        data.append({
            "class_num": class_map[cls],
            "load": load,
            "e": e,
            "load_in_e": load_in_e,
            "is_inservice": 1 if stage == "inservice" else 0,
            "statutory_mpe": statutory_mpe,
            "observed_Ec": observed_Ec,
            "margin": statutory_mpe - abs(observed_Ec),
            "verdict": verdict
        })

    return pd.DataFrame(data)

def train_and_export_pipeline():
    print("[Pipeline] Training OIML Boundary Regressor & Compliance Classifier...")
    df = generate_training_data(n_samples=25000)

    # 1. Boundary Regressor: predicts statutory MPE from (class_num, load_in_e, e, is_inservice)
    feature_cols = ["class_num", "load_in_e", "e", "is_inservice"]
    X = df[feature_cols]
    y_mpe = df["statutory_mpe"]

    regressor = GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42)
    regressor.fit(X, y_mpe)

    # 2. Compliance Classifier: predicts pass/fail from (load_in_e, observed_Ec, e, class_num, is_inservice)
    clf_features = ["class_num", "load_in_e", "e", "is_inservice", "observed_Ec"]
    X_clf = df[clf_features]
    y_clf = df["verdict"]

    classifier = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    classifier.fit(X_clf, y_clf)

    # 3. Anomaly Detector for corrupted or impossible readings
    anomaly_detector = IsolationForest(contamination=0.02, random_state=42)
    anomaly_detector.fit(X_clf)

    # 4. Extract PDF text corpus and build TF-IDF Search Engine
    corpus = extract_pdf_corpus()
    vectorizer = TfidfVectorizer(stop_words="english", max_features=10000, ngram_range=(1, 2))
    corpus_texts = [doc["text"] for doc in corpus] if corpus else ["OIML R 76-1: Non-automatic weighing instruments"]
    tfidf_matrix = vectorizer.fit_transform(corpus_texts)

    # 5. Export Model Artifact
    model_bundle = {
        "regressor": regressor,
        "classifier": classifier,
        "anomaly_detector": anomaly_detector,
        "vectorizer": vectorizer,
        "tfidf_matrix": tfidf_matrix,
        "corpus": corpus,
        "statutory_boundaries": get_statutory_boundaries(),
        "version": "1.0.0-oiml-r76-2026",
    }

    with open(MODEL_OUTPUT_PATH, "wb") as f:
        pickle.dump(model_bundle, f)

    # Export JSON boundaries
    with open(BOUNDARIES_JSON_PATH, "w") as f:
        json.dump(get_statutory_boundaries(), f, indent=2)

    print(f"[Pipeline] Successfully trained and serialized ML model to {MODEL_OUTPUT_PATH}")
    print(f"[Pipeline] Exported statutory boundaries to {BOUNDARIES_JSON_PATH}")

if __name__ == "__main__":
    train_and_export_pipeline()
