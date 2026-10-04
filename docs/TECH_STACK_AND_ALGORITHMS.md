# MetroCert / WeighReport — Master Technical Stack, Algorithmic Engine & Architectural Specification

**Project Code:** SIH26035  
**Governing Authority:** Department of Consumer Affairs, Ministry of Consumer Affairs, Food & Public Distribution, Government of India  
**Platform Title:** MetroCert / WeighReport — Digital OIML R-76 NAWI Testing, Pattern Evaluation, Legal Metrology Statutory Compliance & Tamper-Evident Report Generation Platform  
**Target Standards & Statutes:**
- **OIML R 76-1:2006 (E):** Non-automatic weighing instruments — Part 1: Metrological and technical requirements – Tests
- **OIML R 76-2:2007 (E):** Non-automatic weighing instruments — Part 2: Pattern evaluation report (Formats 1–17)
- **The Legal Metrology Act, 2009 (Act No. 1 of 2010)**
- **The Legal Metrology (General) Rules, 2011 (Seventh Schedule, Heading A)**
- **Legal Metrology (General) Fourth Amendment Rules, 2026 (G.S.R. 568(E))** — Standard weight substitution requirements  
**Document Classification:** Engineering Master Specification & Complete Technology Reference  
**Release Version:** 2026 Production Edition (Hybrid Next.js + FastAPI + Supabase)

---

## Executive Summary of Recent Platform Enhancements

The MetroCert / WeighReport platform has undergone full-spectrum enhancements across all layers of the stack:

1. **Frontend Modernization & Visualization Suite**:
   - Integrated **Next.js 14 App Router** with **React 18.3** and **Tailwind CSS 3.4** design system tokens.
   - Built a vector regulatory diagram visualizer ([`OimlDiagrams.tsx`](file:///d:/SIH26035/app/src/components/regulatory/OimlDiagrams.tsx)) rendering Eccentricity load points, thermal cycle curves, repeatability distributions, creep relaxation graphs, and damp heat profiles.
   - Added interactive particle animations via [`DotField.tsx`](file:///d:/SIH26035/app/src/components/ui/DotField.tsx) and zero-flicker React modals via [`Portal.tsx`](file:///d:/SIH26035/app/src/components/ui/Portal.tsx).
   - Created a standalone statutory test applicability rule engine ([`testApplicability.ts`](file:///d:/SIH26035/app/src/lib/testApplicability.ts)).
   - Expanded cryptographic verification portal ([`Verify.tsx`](file:///d:/SIH26035/app/src/views/Verify.tsx)) with PDF drag-and-drop hash validation, SHA-256 fingerprint extraction, and QR integrity matching.

2. **Dual Machine Learning Model Suites**:
   - **Model Suite 1 (`oiml_boundary_model.pkl`)**: Gradient Boosting Regressor (continuous MPE surface), Random Forest Classifier (compliance probability), Isolation Forest (anomaly detection), and TF-IDF semantic search over 88 normative PDFs.
   - **Model Suite 2 (`oiml_test_suggester.pkl`)**: Multi-Output Random Forest and Decision Tree classifiers ([`train_test_suggester.py`](file:///d:/SIH26035/scripts/train_test_suggester.py)) predicting statutory test series requirements ($T1$ through $T15$) from instrument parameters ($Class, Max, Min, e, d, n, Power, Application, LoadCell$).

3. **Multi-Object & Multi-Sheet Batch Ingestion**:
   - Ingestion pipeline ([`import_data.py`](file:///d:/SIH26035/backend/apps/api/routers/import_data.py), [`CsvSessionImporter.tsx`](file:///d:/SIH26035/app/src/components/CsvSessionImporter.tsx)) parsing multi-sheet Excel workbooks (`.xlsx` via `openpyxl`) and multi-object CSV datasets with `# === SHEET: SheetName ===` delimiters and `# META` headers.
   - Batch synthetic generator ([`generate_multi_object_files.py`](file:///d:/SIH26035/scripts/generate_multi_object_files.py)) producing verified multi-class test files.

4. **Two-Pass Publication-Grade Document Synthesis**:
   - **Server-Side Vector PDF Engine ([`pdf_generator.py`](file:///d:/SIH26035/backend/packages/reportkit/pdf_generator.py))**: ReportLab 5.0 two-pass `OimlNumberedCanvas` compiling official 64-page OIML R 76-2 dossiers with running headers/footers (*"Report page X of Y"*), Section 17 checklists, and embedded vector charts.
   - **Server-Side Word Engine ([`docx_generator.py`](file:///d:/SIH26035/backend/packages/reportkit/docx_generator.py))**: 925-line Microsoft Word compiler generating styled tables, compliance badges, and Formats 1–17.
   - **Vector Diagram Engine ([`diagrams.py`](file:///d:/SIH26035/backend/packages/reportkit/diagrams.py))**: High-resolution ReportLab Drawing components for technical curve embedding.

5. **Dual-Tier Hybrid Database & Cloud Synchronization**:
   - Client-side offline IndexedDB via **Dexie 4.0** across 7 relational collections.
   - Remote cloud synchronization to **Supabase PostgreSQL 16** (`oiml` schema) with automatic offline fallback to local **SQLite 3** (`oiml.db`).

---

## Table of Contents
1. [Executive Summary & Core System Philosophy](#1-executive-summary--core-system-philosophy)
2. [End-to-End System Architecture & Topological Flow](#2-end-to-end-system-architecture--topological-flow)
3. [Full-Spectrum Technology Stack](#3-full-spectrum-technology-stack)
   - [3.1 Programming Languages, Compilers & Runtimes](#31-programming-languages-compilers--runtimes)
   - [3.2 Frontend Architecture, Frameworks & UI Libraries](#32-frontend-architecture-frameworks--ui-libraries)
   - [3.3 Backend Architecture, Web Frameworks & Micro-Libraries](#33-backend-architecture-web-frameworks--micro-libraries)
   - [3.4 Databases, Caching & Dual-Tier Storage Architecture](#34-databases-caching--dual-tier-storage-architecture)
   - [3.5 Cryptographic & Security Subsystems](#35-cryptographic--security-subsystems)
   - [3.6 Document Generation & Rendering Engines](#36-document-generation--rendering-engines)
   - [3.7 Data Ingestion, Spreadsheets & File Parsers](#37-data-ingestion-spreadsheets--file-parsers)
4. [AI, Machine Learning, NLP & Large Language Models (LLMs)](#4-ai-machine-learning-nlp--large-language-models-llms)
   - [4.1 The Non-Negotiable LLM Determinism Rule](#41-the-non-negotiable-llm-determinism-rule)
   - [4.2 Machine Learning Model Suites & Pickled Artifacts](#42-machine-learning-model-suites--pickled-artifacts)
   - [4.3 Natural Language Processing (NLP) & Semantic Search Pipeline](#43-natural-language-processing-nlp--semantic-search-pipeline)
   - [4.4 Role and Boundaries of Large Language Models (LLMs)](#44-role-and-boundaries-of-large-language-models-llms)
5. [Mathematical Formulations & Deterministic Metrology Algorithms](#5-mathematical-formulations--deterministic-metrology-algorithms)
   - [5.1 Digital Rounding & Continuous Indication Prior to Rounding ($P$)](#51-digital-rounding--continuous-indication-prior-to-rounding-p)
   - [5.2 Error of Indication ($E$) and Zero-Corrected Error ($E_c$)](#52-error-of-indication-e-and-zero-corrected-error-e_c)
   - [5.3 Dynamic Piecewise Maximum Permissible Error (MPE) Step Functions](#53-dynamic-piecewise-maximum-permissible-error-mpe-step-functions)
   - [5.4 Temperature Zero-Stability Differential Algorithm (T2)](#54-temperature-zero-stability-differential-algorithm-t2)
   - [5.5 Corner Loading & Eccentricity Optimization Algorithm (T3.1, T3.2)](#55-corner-loading--eccentricity-optimization-algorithm-t31-t32)
   - [5.6 Digital Discrimination Threshold Algorithm (T4.1.1)](#56-digital-discrimination-threshold-algorithm-t411)
   - [5.7 Analog Discrimination & Sensitivity Displacement Algorithms (T4.1.2, T4.2)](#57-analog-discrimination--sensitivity-displacement-algorithms-t412-t42)
   - [5.8 Repeatability Dispersion Algorithm (T5)](#58-repeatability-dispersion-algorithm-t5)
   - [5.9 Multi-Stage Creep & Zero-Return Relaxation Algorithms (T6.1, T6.2)](#59-multi-stage-creep--zero-return-relaxation-algorithms-t61-t62)
   - [5.10 Indian Legal Metrology Fourth Amendment Rules, 2026 Substitution Algorithm](#510-indian-legal-metrology-fourth-amendment-rules-2026-substitution-algorithm)
   - [5.11 Static Equilibrium, Stability & Zero-Tracking Algorithms (T7)](#511-static-equilibrium-stability--zero-tracking-algorithms-t7)
   - [5.12 Tilting Test Algorithms for Suspended and Mobile Scales (T8)](#512-tilting-test-algorithms-for-suspended-and-mobile-scales-t8)
   - [5.13 Tare Device Net Weighing Performance (T9)](#513-tare-device-net-weighing-performance-t9)
   - [5.14 Warm-Up Drift Algorithm (T10)](#514-warm-up-drift-algorithm-t10)
   - [5.15 Extreme Mains & Battery Voltage Variation (T11)](#515-extreme-mains--battery-voltage-variation-t11)
   - [5.16 Electrical & Environmental Disturbance Verification (T12.1–T12.7)](#516-electrical--environmental-disturbance-verification-t121t127)
   - [5.17 Damp Heat Steady State Climatic Conditioning (T13a–T13c)](#517-damp-heat-steady-state-climatic-conditioning-t13at13c)
   - [5.18 Span Stability Drift & Dynamic Loading Sizing (T14)](#518-span-stability-drift--dynamic-loading-sizing-t14)
   - [5.19 Mechanical Endurance Cycle Degradation (T15)](#519-mechanical-endurance-cycle-degradation-t15)
   - [5.20 Monotonic Dominance Verdict Aggregation Algorithm](#520-monotonic-dominance-verdict-aggregation-algorithm)
   - [5.21 Sandboxed AST Decimal Rule Evaluator](#521-sandboxed-ast-decimal-rule-evaluator)
   - [5.22 Canonical Hashing, Blockchain Hash Chains & Non-Repudiation](#522-canonical-hashing-blockchain-hash-chains--non-repudiation)
   - [5.23 Dimensional Unit Normalization & Exact 1-2-5 Scale Step Verifiers](#523-dimensional-unit-normalization--exact-1-2-5-scale-step-verifiers)
6. [Complete REST API Endpoints Specification](#6-complete-rest-api-endpoints-specification)
7. [Comprehensive Operational Process Workflows](#7-comprehensive-operational-process-workflows)
8. [Complete File System & Monorepo Codebase Map](#8-complete-file-system--monorepo-codebase-map)
9. [Summary Master Technology Matrix](#9-summary-master-technology-matrix)

---

## 1. Executive Summary & Core System Philosophy

MetroCert (engineered under the WeighReport architecture) is an enterprise-grade metrological software platform built to automate and digitalize Non-Automatic Weighing Instrument (NAWI) pattern evaluation, laboratory verification, and statutory legal metrology enforcement under **OIML R 76-1:2006**, **OIML R 76-2:2007 (Formats 1–17)**, and the **Legal Metrology (General) Rules, 2011** (incorporating the **Fourth Amendment Rules, 2026 (G.S.R. 568(E))**).

### Core Architectural Axioms
1. **One Calculation Truth:** All metrological decisions (pass/fail verdicts, tolerance intervals, error corridors) are computed by a single, server-authoritative engine executed with 40-decimal-place fixed-point precision. The client UI, PDF engine, and DOCX compiler render what the deterministic engine asserts.
2. **Rules as Data:** Statutory thresholds, class parameters, test procedures, and checklist criteria are decoupled from compiled application logic into versioned rule packs (`oiml-r76-2007`, `india-lm-2011`, `india-2026-gsr568e`).
3. **No Binary Floating-Point Math:** Binary IEEE 754 floating-point operations introduce representation errors (e.g. $0.1 + 0.2 \ne 0.3$). The system strictly uses Python `decimal.Decimal` and TypeScript exact rational quantization across every calculation step.
4. **Reproducibility & Legal Non-Repudiation:** Any certificate generated can be byte-verified years later using SHA-256 canonical hashing, cryptographic audit trails, and version-pinned rule sets.
5. **Operator Cannot Override Law:** An inspector or laboratory technician cannot manually flip a failed test to passed. Deviations must be physically resolved or officially documented as non-conformities.
6. **Zero-Downtime Offline Capability:** Field inspectors in remote agricultural mandis, mines, or border checkposts operate entirely offline using browser-local IndexedDB and client-side PDF synthesis, seamlessly synchronizing to PostgreSQL upon network reconnection.

---

## 2. End-to-End System Architecture & Topological Flow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PRESENTATION LAYER                                     │
│                        Next.js 14 (App Router) + React 18 + PWA                        │
│                                                                                        │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  ┌───────────────────────┐  │
│  │   Interactive UI & 3D   │  │   Offline Engine         │  │   Local Persistence   │  │
│  │   Tailwind CSS Tokens   │  │   Pure TS Metrology Math │  │   Dexie.js / IndexedDB│  │
│  │   Three.js WebGL Scene  │  │   Dynamic MPE Selector   │  │   7 Relational Tables │  │
│  │   Framer Motion Paths   │  │   Live Error Corridor    │  │   Asynchronous Hooks  │  │
│  │   OimlDiagrams Vector   │  │   Test Applicability lib │  │   Supabase Sync Hook  │  │
│  │   DotField Canvas BG    │  │   Client-side jsPDF      │  │   Optimistic Updates  │  │
│  └─────────────────────────┘  └──────────────────────────┘  └───────────────────────┘  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Reverse Proxy (/api/backend/* & /api/v1/*)
                                            ▼ (localhost:3000 -> 127.0.0.1:8000)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION SERVER LAYER                                  │
│                              FastAPI (Python 3.12) + Uvicorn                           │
│                                                                                        │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  ┌───────────────────────┐  │
│  │   REST Routing & Auth   │  │   Deterministic Engine   │  │   Document Synthesizer│  │
│  │   PBKDF2-HMAC-SHA256    │  │   Exact Decimal Math     │  │   ReportLab 5.0 (PDF) │  │
│  │   HMAC Signed Tokens    │  │   17 OIML Test Runners   │  │   python-docx (Word)  │  │
│  │   Role-Based Access     │  │   Sandboxed AST Parser   │  │   Two-Pass Canvas     │  │
│  │   Streaming CSV/XLSX    │  │   2026 Substitution Rules│  │   ReportLab Diagrams  │  │
│  │   Multi-Sheet Parser    │  │   Dynamic MPE Bounds     │  │   Dynamic QR Codes    │  │
│  └─────────────────────────┘  └──────────────────────────┘  └───────────────────────┘  │
└───────────────────────────┬────────────────────────────────┬───────────────────────────┘
                            │                                │
                            ▼                                ▼
┌──────────────────────────────────────────────┐  ┌──────────────────────────────────────┐
│            DATABASE & PERSISTENCE            │  │        AI / MACHINE LEARNING         │
│  Primary: PostgreSQL (Supabase 'oiml' schema)│  │  Model 1: oiml_boundary_model.pkl    │
│  Fallback: SQLite 3 (zero-downtime offline)  │  │   - GradientBoostingRegressor (MPE)  │
│  ORM: SQLAlchemy 2.0 (Cascading Relational)  │  │   - RandomForestClassifier (Pass %)  │
│  Audit Trail: Tamper-Evident Hash Chain      │  │   - IsolationForest (Anomaly Detector│
│  Client Storage: Dexie.js (IndexedDB)        │  │   - TF-IDF + Cosine Normative Search │
│  Realtime Sync: @supabase/supabase-js        │  │  Model 2: oiml_test_suggester.pkl     │
│                                              │  │   - MultiOutputClassifier (Test Req) │
└──────────────────────────────────────────────┘  └──────────────────────────────────────┘
```

---

## 3. Full-Spectrum Technology Stack

### 3.1 Programming Languages, Compilers & Runtimes

| Language / Runtime | Version | Scope of Application | Technical Rationale |
| :--- | :--- | :--- | :--- |
| **Python** | `3.12.x` | Backend REST API, deterministic metrology engine, AST sandboxed parser, machine learning training/inference, PDF & DOCX synthesis. | High-performance exact Decimal support, robust AST inspection, mature document generation (`reportlab`, `python-docx`), and extensive data science tooling (`scikit-learn`, `numpy`, `pandas`). |
| **TypeScript** | `5.6.3` | Frontend application, client-side metrology runner, schema definitions, unit transformations, test applicability. | Static type safety eliminates null-reference bugs and guarantees metrological data shape integrity (e.g., verifying that tare, divisions, and load intervals are strictly non-negative). |
| **JavaScript (ES Modules)** | ES2022 | Next.js App Router, Vite configuration, service workers, PWA plugins. | Native ESM module loading, top-level `await`, high-speed build resolution. |
| **SQL (PostgreSQL & SQLite Dialects)** | PostgreSQL 16 / SQLite 3 | Relational table schemas, foreign key constraints, JSONB operators, compound indexes, ACID transaction management. | Strong transactional guarantees for official legal records; JSONB provides semi-structured storage for dynamic observation tables. |
| **HTML5 & CSS3** | Standard | Semantic page layout, SVG tolerance corridor graphics, responsive tabular typography. | Accessible UI rendering, hardware-accelerated vector drawing for live error envelopes. |

---

### 3.2 Frontend Architecture, Frameworks & UI Libraries

| Library / Package | Version | Layer / Module | Specific Usage in MetroCert | File Location |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js** | `^14.2.35` | Framework | Full-stack framework providing App Router, SSR, edge routing, and reverse proxies (`/api/backend/*`). | `app/next.config.mjs`, `app/src/app/` |
| **React** | `^18.3.1` | Core UI | Declarative UI rendering, hooks-based architecture, Concurrent Mode. | `app/src/` |
| **React DOM** | `^18.3.1` | Core UI | DOM reconciliation and rendering. | `app/package.json` |
| **React Router DOM** | `^6.27.0` | Client Routing | In-app view switching for single-page application screens. | `app/src/App.tsx` |
| **Tailwind CSS** | `^3.4.14` | Styling Engine | Metrological design system: custom tokens (`paper`, `ink`, `rule`, `pass`, `fail`, `border-edge`, dark theme palettes). | `app/tailwind.config.js`, `app/src/index.css` |
| **PostCSS & Autoprefixer**| `^8.4.47`, `^10.4.20` | CSS Processing | Vendor prefixing and modern CSS compilation. | `app/package.json` |
| **Zustand** | `^4.5.5` | State Management | Reactive store managing active user session, RBAC personas (Admin, Technician, Reviewer), dirty flags, and hydration. | `app/src/store/useAppStore.ts` |
| **Dexie.js** | `^4.0.9` | Client Database | Wrapper for IndexedDB providing offline relational storage across 7 tables with transactional hooks. | `app/src/store/db.ts` |
| **@supabase/supabase-js** | `^2.117.2` | Cloud Database | Real-time Supabase PostgreSQL client handling bidirectional sync from IndexedDB to remote cluster. | `app/src/database/client.ts`, `sync.ts` |
| **Three.js** | `^0.169.0` | 3D Graphics | WebGL rendering engine visualizing physical scales, calibration weights, and pan assemblies. | `app/src/components/three/BalanceScene.tsx` |
| **@react-three/fiber** | `^8.17.10` | 3D Graphics | Declarative React canvas integration for Three.js. | `app/src/components/three/BalanceScene.tsx` |
| **@react-three/drei** | `^9.114.3` | 3D Graphics | Pre-built helpers: RoundedBox geometry, Float animations, orbital lighting, ContactShadows. | `app/src/components/three/BalanceScene.tsx` |
| **Framer Motion & motion** | `^11.11.9`, `^13.4.5` | UI Animation | Micro-animations, compliance drawer expansions, and live SVG path animations for error curves. | `app/src/components/ui/motion.tsx`, `app/src/components/charts/ErrorCurve.tsx` |
| **OimlDiagrams** | Custom Component | Regulatory Visuals | Interactive SVG vector diagrams for Eccentricity, Temperature Cycles, Tare Curves, Repeatability distributions, and Creep. | `app/src/components/regulatory/OimlDiagrams.tsx` |
| **DotField** | Custom Component | Visual Aesthetics | Interactive dynamic particle canvas for high-tech header backgrounds. | `app/src/components/ui/DotField.tsx` |
| **Portal** | Custom Component | Modal Architecture | React portal rendering for accessible modals and drawers without z-index conflicts. | `app/src/components/ui/Portal.tsx` |
| **Test Applicability Engine**| Custom Library | Test Selection | Deterministic solver determining statutory test requirements based on class, max, division, and power type. | `app/src/lib/testApplicability.ts` |
| **jsPDF** | `^2.5.2` | Document Export | Client-side vector PDF generation for field inspectors working with zero network connectivity. | `app/src/report/generatePdf.ts` |
| **jsPDF-AutoTable** | `^3.8.4` | Document Export | Structured tabular layout rendering for client-side PDF certificates. | `app/src/report/generatePdf.ts` |
| **QRCode** | `^1.5.4` | Verification | Generates high-density QR verification codes carrying public verification IDs and cryptographic hashes. | `app/src/report/qr.ts`, `app/src/views/Verify.tsx` |
| **xlsx (SheetJS)** | `^0.18.5` | Data Processing | In-browser parsing and generation of multi-model Excel workbooks for batch test data imports. | `app/src/components/CsvSessionImporter.tsx` |
| **Zod** | `^3.23.8` | Data Validation | Runtime schema validation for user entries, verifying mathematical boundaries before calculation. | `app/src/domain/validators.ts` |
| **Lucide React** | `^0.454.0` | UI Icons | Comprehensive semantic icon set (Scales, Calipers, Alert Shields, QR, Checkmark circles). | Across all UI views |
| **clsx & tailwind-merge** | `^2.1.1`, `^2.5.4` | UI Utilities | Conditional class merging and conflict resolution. | `app/src/lib/cn.ts`, `format.ts` |
| **Vite & Vitest** | `^5.4.10`, `^2.1.4` | Testing & Build | High-speed unit testing suite verifying the deterministic metrology engine against test vectors (39 tests). | `app/src/engine/*.test.ts`, `app/vite.config.ts` |
| **vite-plugin-pwa** | `^0.20.5` | PWA Engine | Service worker registration, offline asset caching, and manifest generation. | `app/vite.config.ts` |

---

### 3.3 Backend Architecture, Web Frameworks & Micro-Libraries

| Library / Package | Version | Layer / Module | Specific Usage in WeighReport | File Location |
| :--- | :--- | :--- | :--- | :--- |
| **FastAPI** | `^0.110.0` | REST API | Asynchronous REST framework providing automatic OpenAPI 3.1 generation, dependency injection, and routing. | `backend/apps/api/main.py` |
| **Uvicorn** | `^0.28.0` | ASGI Server | High-performance ASGI web server hosting the REST API on `http://127.0.0.1:8000`. | `backend/run_server.py` |
| **Pydantic** | `^2.13.5` | Schema Validation | Data parsing, type coercion, and request/response schema validation. | `backend/apps/api/schemas.py` |
| **pydantic-settings** | `^2.14.2` | Configuration | Environment variable loading and typed application settings. | `backend/apps/api/config.py` |
| **SQLAlchemy** | `^2.0.51` | Relational ORM | ORM managing transactional database operations, relationships, and queries. | `backend/apps/api/database.py`, `models.py` |
| **python-multipart** | `^0.0.32` | Ingestion | Streaming multipart form-data parser handling large CSV and XLSX batch upload payloads. | `backend/apps/api/routers/import_data.py` |
| **ReportLab** | `^5.0.1` | Document Engine | Professional vector document typesetting engine producing official 64-page OIML R 76-2 PDF dossiers. | `backend/packages/reportkit/pdf_generator.py` |
| **ReportLab Vector Diagrams**| Custom Library | Diagram Rendering | Drawing shapes, coordinate transforms, and curves for PDF embedded figures. | `backend/packages/reportkit/diagrams.py` |
| **python-docx** | `^1.2.0` | Document Engine | Programmatic Microsoft Word generator creating editable `.docx` files matching OIML Formats 1–17. | `backend/packages/reportkit/docx_generator.py` |
| **openpyxl** | `^3.1.5` | Data Ingestion | Spreadsheet engine parsing multi-sheet Excel workbooks, extracting instrument metadata and observation grids. | `backend/apps/api/routers/import_data.py` |
| **et-xmlfile** | `^2.0.0` | Ingestion Support | Low-memory XML streaming library for OpenPyXL. | Backend dependency |
| **pandas** | `^3.0.3` | Data Engineering | Tabular data manipulation, vector processing, synthetic training dataset generation for ML boundary fitting. | `backend/packages/engine/train_boundaries.py` |
| **numpy** | `^2.5.3` | Numerical Math | Multi-dimensional numerical arrays, linear algebra, vector mathematics. | `backend/packages/engine/train_boundaries.py` |
| **scikit-learn** | `^1.9.0` | Machine Learning | GradientBoostingRegressor, RandomForestClassifier, IsolationForest, MultiOutputClassifier, DecisionTreeClassifier, TfidfVectorizer, cosine_similarity. | `backend/packages/engine/train_boundaries.py`, `scripts/train_test_suggester.py` |
| **PyMuPDF (fitz)** | `^1.28.0` | PDF Extraction | Fast PDF text and table extractor used to ingest statutory gazettes and international standards into corpus chunks. | `backend/packages/engine/train_boundaries.py` |
| **Decimal** | Standard Library | Metrology Core | Fixed-point exact arithmetic used throughout all metrology calculators with 40-digit precision. | `backend/packages/engine/numeric.py`, `calculators.py` |
| **ast** | Standard Library | Rule Engine | Sandboxed abstract syntax tree parser evaluating declarative rule expressions safely. | `backend/packages/engine/evaluator.py` |

---

### 3.4 Databases, Caching & Dual-Tier Storage Architecture

#### 1. Primary Relational Database: PostgreSQL 16 (Hosted via Supabase)
- **Schema Isolation:** Operates within a dedicated `oiml` schema (`CREATE SCHEMA IF NOT EXISTS oiml;`), isolating regulatory data from public application tables.
- **Relational Integrity:** Implements foreign key constraints with cascading deletes for test instances and checklist items belonging to a report.
- **Semi-Structured Fields:** Employs `JSONB` columns for raw observation grids (`data`), computed calculation traces (`results`), and environmental logs (`header`), combining schema flexibility with relational guarantees.
- **Row Level Security (RLS):** Enforces data boundary policies preventing unauthorized technicians from editing peer reports or modifying sealed verification dossiers.

#### 2. Local Zero-Downtime Fallback: SQLite 3 (`oiml.db`)
- **Connection URI:** `sqlite:///./oiml.db` with `StaticPool`.
- **Zero-Downtime Redundancy:** Built with an automated connection probe in `database.py`. If the remote PostgreSQL cluster is unreachable or network cables are severed, the driver immediately boots SQLite locally without raising unhandled exceptions or halting laboratory operations.

#### 3. Client-Side Offline Database: Dexie.js (IndexedDB)
Houses 7 relational collections directly inside the inspector’s browser:
1. `users`: Credentials, full names, assigned laboratory IDs, and active RBAC roles.
2. `instruments`: Technical metrology specifications (Serial, Accuracy Class, Max, Min, $e$, $d$, Tare range, display division).
3. `sessions`: Test sessions with execution states (`draft`, `in_progress`, `awaiting_review`, `approved`).
4. `reports`: Generated reports with SHA-256 digests and verification identifiers.
5. `evidence`: Photographic evidence, calibration certificates, and environmental sensor readings.
6. `audit`: Local append-only log of user interactions and observation edits.
7. `meta`: Hydration flags, regulatory seeds, and synchronization timestamps.

---

### 3.5 Cryptographic & Security Subsystems

1. **PBKDF2-HMAC-SHA256 Password Hashing:**
   - Password credentials are salted with 16 cryptographically secure random bytes generated via `os.urandom(16)`.
   - Iteration count is fixed at 100,000 rounds using SHA-256.
   - Verification utilizes `hmac.compare_digest` to provide constant-time execution, neutralizing timing attack vectors.
2. **HMAC-SHA256 Signed Bearer Tokens:**
   - Token payload containing user identity, active role, issued timestamp (`iat`), and expiration timestamp (`exp`) is canonicalized and encoded into URL-safe Base64.
   - A cryptographic signature is appended using secret-key HMAC-SHA256:
     $$\text{Token} = \text{mc}.\text{Payload}_{\text{b64}}.\text{HMAC-SHA256}_{K}(\text{Payload}_{\text{b64}})$$
3. **Role-Based Access Control (RBAC):**
   - Strictly enforces three statutory personas:
     - `technician`: Can record observations, run test calculations, and submit sessions for review.
     - `reviewer`: Can inspect calculation traces, audit raw data, return reports with comments, and grant official pattern approval.
     - `admin`: Can register reference standard equipment, manage user roles, and activate new statutory rule packs.
4. **Tamper-Evident Hash Chain Ledger (`AuditEvent`):**
   - Every mutation to an instrument, observation, or report generates an immutable row in the audit table.
   - Each audit row contains the SHA-256 digest of the previous row ($H_{n-1}$), establishing an unbroken cryptographic chain:
     $$H_n = \text{SHA-256}(H_{n-1} \parallel \text{seq} \parallel \text{ts} \parallel \text{user\_id} \parallel \text{entity} \parallel \text{action} \parallel \text{new\_data})$$

---

### 3.6 Document Generation & Rendering Engines

1. **ReportLab 5.0 (Server-Side Vector PDF Engine):**
   - Implements a custom two-pass canvas (`OimlNumberedCanvas`) that intercepts `showPage()` and `save()`, calculating the exact total page count $N$ to render running headers and footers (*"Report page X of N"*) across 64 pages.
   - Strictly adheres to OIML R 76-2:2007 (E) Formats 1–17, generating vector tables, climatic test condition boxes, Section 17 checklists, and calibration logs.
2. **ReportLab Vector Diagrams Subsystem ([`diagrams.py`](file:///d:/SIH26035/backend/packages/reportkit/diagrams.py)):**
   - Generates high-resolution vector drawing objects for PDF embedding:
     - Eccentricity 5-point and 4-point platform load layouts.
     - Dynamic Error vs. Load Curves with green/amber/red tolerance envelopes.
     - Creep relaxation and Zero-Return time decay curves.
     - Thermal stability temperature drift profiles ($-10^\circ\text{C}$ to $+40^\circ\text{C}$).
3. **python-docx 1.2.0 (Server-Side Editable Word Engine):**
   - Programmatically synthesizes Microsoft Word `.docx` documents containing native editable tables, stylized compliance badges (PASS/FAIL), and full clause explanations matching OIML Formats 1–17.
4. **jsPDF 2.5.2 & jsPDF-AutoTable 3.8.4 (Client-Side Offline PDF Engine):**
   - Executes entirely in the inspector's browser under Web Worker / main thread isolation, synthesizing field verification certificates on remote sites without internet connectivity.

---

### 3.7 Data Ingestion, Spreadsheets & File Parsers

1. **Multi-Sheet Excel Parser ([`openpyxl`](file:///d:/SIH26035/backend/apps/api/routers/import_data.py) & [`SheetJS xlsx`](file:///d:/SIH26035/app/src/components/CsvSessionImporter.tsx)):** Reads multi-sheet Excel workbooks (`.xlsx`), streaming row-by-row observations, extracting instrument metadata from header cells, and mapping worksheets to separate instrument objects and test codes.
2. **Multi-Object CSV Streaming Parser:** Streams multipart form data uploads, parsing `# === SHEET: Object_Name ===` section breaks, `# META` directives, comma-delimited observation columns, and load series directions.
3. **PyMuPDF (`fitz`) 1.28.0:** Parses statutory gazettes and international standards into normalized, searchable text chunks for the semantic search engine.

---

## 4. AI, Machine Learning, NLP & Large Language Models (LLMs)

The platform incorporates two distinct, specialized machine learning bundles:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          MACHINE LEARNING ARTIFACT BUNDLES                             │
├────────────────────────────────────────────────────────┬───────────────────────────────┤
│    Bundle 1: oiml_boundary_model.pkl (9.65 MB)         │ Bundle 2: oiml_test_suggester │
│    Location: backend/packages/engine/                  │ Location: engine/ (1.07 MB)   │
│                                                        │                               │
│  ┌─────────────────────────┐  ┌──────────────────────┐ │ ┌───────────────────────────┐ │
│  │ GradientBoostingRegressor│ │RandomForestClassifier│ │ │ MultiOutputClassifier     │ │
│  │ Continuous MPE Surface  │  │Compliance Probability│ │ │ (RandomForest / Decision) │ │
│  │ 100 Estimators, Depth=5 │  │100 Estimators,Depth=8│ │ │ Predicts Test Series 1-15 │ │
│  └─────────────────────────┘  └──────────────────────┘ │ └───────────────────────────┘ │
│  ┌─────────────────────────┐  ┌──────────────────────┐ │ ┌───────────────────────────┐ │
│  │     IsolationForest     │  │TF-IDF + Cosine Search│ │ │ Rule-Guardrail Overrides  │ │
│  │  Anomaly / Fraud Detect │  │88 Normative PDF Docs │ │ │ Statutory Compliance Pass │ │
│  └─────────────────────────┘  └──────────────────────┘ │ └───────────────────────────┘ │
└────────────────────────────────────────────────────────┴───────────────────────────────┘
```

### 4.1 The Non-Negotiable LLM Determinism Rule

> [!CRITICAL]
> **Mandatory Metrological Axiom:**  
> **"Compliance is deterministic code, NEVER an LLM."**  
> Decisions regarding legal metrology pattern approval carry criminal liability under the Legal Metrology Act, 2009, and direct commercial implications across global trade. Generative Large Language Models (LLMs) are inherently probabilistic and subject to hallucinations. Therefore, **no LLM is ever used to calculate errors, determine Maximum Permissible Errors, or issue pass/fail verdicts**. All legal decisions are governed by verified Python Decimal and TypeScript mathematical code.

---

### 4.2 Machine Learning Model Suites & Pickled Artifacts

#### Model Suite 1: Boundary & Compliance Classifier (`oiml_boundary_model.pkl`)

| Model | Algorithm / Config | Input Features | Output Target | Specific Operational Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **GradientBoostingRegressor** | Scikit-Learn (`n_estimators=100`, `max_depth=5`) | `class_num` (1–4), `load_in_e` ($L/e$), `e`, `is_inservice` (0/1) | Continuous Maximum Permissible Error ($\text{MPE}_{\text{pred}}$) | Approximates the multi-tiered continuous tolerance envelope across any arbitrary capacity point, useful for rapid pre-test corridor checks and non-standard load points. |
| **RandomForestClassifier** | Scikit-Learn (`n_estimators=100`, `max_depth=8`) | `class_num`, `load_in_e`, `e`, `is_inservice`, `observed_Ec` | Probability of compliance ($P_{\text{pass}} \in [0, 1]$) | Quantifies the statistical confidence of the instrument passing verification; highlights marginal readings that risk failing due to environmental drift. |
| **IsolationForest** | Scikit-Learn (`contamination=0.02`, `random_state=42`) | 5-dimensional observation feature vector | Anomaly flag ($-1$ = Anomaly, $+1$ = Normal) | Detects human data-entry typos (e.g. entering indication 10x higher), physical impossible hysteresis, fabricated test results, and abnormal sensor anomalies. |

#### Model Suite 2: Statutory Test Series Suggester (`oiml_test_suggester.pkl`)

| Model | Algorithm / Config | Input Features | Output Target | Specific Operational Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **MultiOutputClassifier** | Scikit-Learn with `RandomForestClassifier` (150 estimators, max depth 12) & `DecisionTreeClassifier` fallback | 9 features: `class_code` (1–4), `max_g`, `min_g`, `e_g`, `d_g`, `n_intervals`, `is_multi_interval`, `has_tare`, `power_code` (Battery/Mains) | Multi-hot vector across 17 statutory test codes ($T1$ to $T15$, $Checklist$) | Recommends mandatory, optional, and exempted statutory test procedures based on instrument physical design parameters. |

---

### 4.3 Natural Language Processing (NLP) & Semantic Search Pipeline

- **Document Corpus:** 88 normative PDF publications ingested, including:
  - OIML R 76-1:2006 (Annexes A, B, F, G)
  - OIML R 76-2:2007 (E) Pattern Evaluation Formats 1–17
  - The Legal Metrology Act, 2009 (Act No. 1 of 2010)
  - Legal Metrology (General) Rules, 2011 (Seventh Schedule, Heading A)
  - Legal Metrology (General) Fourth Amendment Rules, 2026 (G.S.R. 568(E))
- **Text Extraction:** Ingested via PyMuPDF (`fitz`), chunked into sliding windows of 1,500 characters, filtering noise and metadata headers.
- **Vectorization:** `TfidfVectorizer(stop_words='english', max_features=10000, ngram_range=(1, 2))`.
- **Similarity Computation:** Query input strings are vectorized against the precomputed document matrix via geometric cosine distance:
  $$\text{Cosine Similarity}(\vec{q}, \vec{d}_i) = \frac{\vec{q} \cdot \vec{d}_i}{\|\vec{q}\| \|\vec{d}_i\|}$$
- **Output:** Returns ranked statutory clauses, exact document names, page citations, and text snippets.

---

### 4.4 Role and Boundaries of Large Language Models (LLMs)

Where LLMs are incorporated or architected for extension:
1. **Multimodal Data Capture (Visual OCR):** Vision-capable LLMs assist inspectors in the field by extracting numerical readings from physical photographs of instrument nameplates, calibration weight stamps, and digital LCD/LED displays.
2. **Statutory Explanation & Search Summarization:** LLMs provide natural-language summaries of retrieved statutory clauses when an inspector queries complex regulatory conditions.
3. **Drafting Technical Remarks:** Assisting reviewers by drafting narrative remarks on non-conformities found during Section 17 checklist inspections.
4. **Strict Boundary Defense:** Any value extracted or summarized by an LLM is routed through `validators.py` and `calculators.py` for deterministic confirmation.

---

## 5. Mathematical Formulations & Deterministic Metrology Algorithms

All calculations are implemented with exact Decimal arithmetic in [`backend/packages/engine/calculators.py`](file:///d:/SIH26035/backend/packages/engine/calculators.py) and [`app/src/engine/metrology.ts`](file:///d:/SIH26035/app/src/engine/metrology.ts).

### 5.1 Digital Rounding & Continuous Indication Prior to Rounding ($P$)
Digital weighing instruments display discrete intervals $d$. To determine the continuous indication prior to rounding, fractional standard weights $\Delta L$ are added to the load receptor until the displayed indication $I$ unequivocally rolls over to the next increment ($I + d$):

$$P = I + \frac{1}{2}d - \Delta L$$

*(Where $d$ is the actual scale interval; in standard verification where $d = e$, $P = I + 0.5e - \Delta L$).*

---

### 5.2 Error of Indication ($E$) and Zero-Corrected Error ($E_c$)
The raw error of indication $E$ is the arithmetic difference between continuous indication $P$ and reference standard mass $L$:

$$E = P - L = I + \frac{1}{2}d - \Delta L - L$$

To eliminate zero-load offset error, the corrected error of indication $E_c$ is computed by subtracting the zero-load error $E_0$ (determined at no load or near-zero load):

$$E_c = E - E_0$$

The measurement strictly passes if and only if:

$$|E_c| \le |\text{MPE}|$$

---

### 5.3 Dynamic Piecewise Maximum Permissible Error (MPE) Step Functions
The Maximum Permissible Error (MPE) is determined as a piecewise step function of the net load expressed in verification scale intervals $m = L/e$:

$$\text{MPE}(m, \text{Class}) = k(m, \text{Class}) \times e \times \pi \times \text{Factor}_{\text{stage}}$$

Where:
- $\pi$: Ratio of the maximum permissible error for sub-assemblies (default = $1.0$).
- $\text{Factor}_{\text{stage}}$: $1.0$ for Type Evaluation / Initial Verification; $2.0$ for In-Service Verification.

```
       MPE (±e)
         ▲
    1.5e ┼────────────┐                             ┌────────────────────────
         │            │                             │
    1.0e ┼──────┐     │                       ┌─────┘
         │      │     │                 ┌─────┘
    0.5e ┼──────┴─────┴─────────────────┴───────────────────────────────────► Load (m = L/e)
         0     500   2000              10000 (Class III Scale Intervals)
```

#### Exact Statutory Thresholds (OIML R 76-1 Table 6):

| Accuracy Class | Tier 1 ($\pm 0.5e$) | Tier 2 ($\pm 1.0e$) | Tier 3 ($\pm 1.5e$) |
| :--- | :--- | :--- | :--- |
| **Class I** | $0 \le m \le 50\,000$ | $50\,000 < m \le 200\,000$ | $m > 200\,000$ |
| **Class II** | $0 \le m \le 5\,000$ | $5\,000 < m \le 20\,000$ | $20\,000 < m \le 100\,000$ |
| **Class III** | $0 \le m \le 500$ | $500 < m \le 2\,000$ | $2\,000 < m \le 10\,000$ |
| **Class IIII** | $0 \le m \le 50$ | $50 < m \le 200$ | $200 < m \le 1\,000$ |

---

### 5.4 Temperature Zero-Stability Differential Algorithm (T2)
Evaluates zero-point stability across thermal extremes ($-10^\circ\text{C}$, $+5^\circ\text{C}$, $+20^\circ\text{C}$, $+40^\circ\text{C}$):

$$\Delta P = P_2 - P_1, \quad \Delta T = T_2 - T_1$$

$$\text{Zero Change} = \frac{|\Delta P| \times \text{Step}}{|\Delta T|}$$

Where $\text{Step} = 1.0^\circ\text{C}$ for Class I; $\text{Step} = 5.0^\circ\text{C}$ for Classes II, III, and IIII.  
**Compliance Criterion:** $\text{Zero Change} \le 1.0e$.

---

### 5.5 Corner Loading & Eccentricity Optimization Algorithm (T3.1, T3.2)
Evaluates performance when load is applied off-center across 5 quadrants (Center, Front-Left, Back-Left, Back-Right, Front-Right) using test load $L \approx \frac{1}{3}\text{Max}$ (or $\frac{1}{4}\text{Max}$ for 4-point supports):

$$|E_c| \le |\text{MPE}| \quad \forall \text{ positions } i \in \{1, 2, 3, 4, 5\}$$

---

### 5.6 Digital Discrimination Threshold Algorithm (T4.1.1)
An additional test load equal to $1.4d$ placed gently on the load receptor must produce an unambiguous digital display increment:

$$I_2 - I_1 \ge d$$

---

### 5.7 Analog Discrimination & Sensitivity Displacement Algorithms (T4.1.2, T4.2)
- **Analog Indicator Discrimination:** The extra load applied must produce a pointer displacement of at least $0.7 \times \text{MPE}$.
- **Sensitivity of Non-Self-Indicating Scales:** An additional load equal to $|\text{MPE}|$ must cause a permanent displacement of the indicator by at least $1\text{ mm}$ (Class I/II), $2\text{ mm}$ (Class III/IIII with $\text{Max} \le 30\text{ kg}$), or $5\text{ mm}$ ($\text{Max} > 30\text{ kg}$).

---

### 5.8 Repeatability Dispersion Algorithm (T5)
Two series of 10 consecutive weighings are conducted at $\approx 0.5\text{Max}$ and $\text{Max}$:
1. Every observation must satisfy $|E_i| \le |\text{MPE}|$.
2. The dispersion range $r$ must not exceed the absolute MPE for that load:
   $$r = E_{\max} - E_{\min} \le |\text{MPE}|$$

---

### 5.9 Multi-Stage Creep & Zero-Return Relaxation Algorithms (T6.1, T6.2)

#### Zero Return (T6.1):
After remaining loaded for 30 minutes, the instrument is unloaded:
$$|P_{30} - P_0| \le 0.5e$$
For multi-interval instruments, after 35 minutes: $|P_{35} - P_{30}| \le e_1$.

#### Creep Test (T6.2):
Readings taken at $t \in \{0, 5, 15, 30\}\text{ min}$:
- **Condition (a) Early Pass:**
  $$|P_{30} - P_0| \le 0.5e \quad \text{AND} \quad |P_{30} - P_{15}| \le 0.2e$$
  *(If Condition (a) is met, test terminates at 30 minutes).*
- **Condition (b) 4-Hour Extended Verification:**
  If Condition (a) fails, observations must continue at $t \in \{60, 120, 180, 240\}\text{ min}$:
  $$|P(t) - P(0)| \le |\text{MPE}| \quad \forall t \le 240\text{ min}$$

---

### 5.10 Indian Legal Metrology Fourth Amendment Rules, 2026 Substitution Algorithm
Under the **Legal Metrology (General) Fourth Amendment Rules, 2026 (G.S.R. 568(E))**, standard weight substitution on high-capacity scales is governed by repeatability dispersion error $r = E_{\max} - E_{\min}$:

$$W_{\text{standard}} \ge \begin{cases} 
20\% \times \text{Max} & \text{if } r \le 0.2e \\
33.\bar{3}\% \times \text{Max} & \text{if } 0.2e < r \le 0.3e \\
50\% \times \text{Max} & \text{if } r > 0.3e 
\end{cases}$$

---

### 5.11 Static Equilibrium, Stability & Zero-Tracking Algorithms (T7)
- **Printing Stability:** Evaluates stability before allowing automatic print output: variation between consecutive samples $\le 1e$.
- **Zero-Setting & Zero-Tracking Accuracy:** Residual zero error $|E_0| \le 0.25e$.

---

### 5.12 Tilting Test Algorithms for Suspended and Mobile Scales (T8)
Evaluates performance when tilted at $50\text{ parts per thousand } (50\%_0)$ or marked limiting angle:
- Unloaded zero deviation: $\max |E_{10} - E_{v0}| \le 2e$.
- Loaded error deviation: $\max |E_{c1} - E_{cv}| \le |\text{MPE}(L)|$.

---

### 5.13 Tare Device Net Weighing Performance (T9)
Verifies net weighing accuracy across two tare load levels (small tare and large tare):
$$|E_c| \le |\text{MPE}(\text{Net Load})|$$

---

### 5.14 Warm-Up Drift Algorithm (T10)
Evaluates error drift from power-on at $t \in \{0, 5, 15, 30\}\text{ min}$:
$$|E_L(t) - E_0(t)| \le |\text{MPE}(L)|$$

---

### 5.15 Extreme Mains & Battery Voltage Variation (T11)
Evaluates weighing performance across AC voltage boundaries ($-15\%$ to $+10\%$ of nominal $U_{\text{nom}}$) and DC battery minimum cut-off voltage:
$$|E_c| \le |\text{MPE}| \quad \forall U \in [0.85 U_{\text{nom}}, 1.10 U_{\text{nom}}]$$

---

### 5.16 Electrical & Environmental Disturbance Verification (T12.1–T12.7)
Evaluates behavior under electrostatic discharge (ESD), RF electromagnetic fields, electrical fast transient bursts, surges, and AC voltage dips:
- Let deviation $\Delta = |I - I_{\text{ref}}|$.
- **Normal Pass:** $\Delta \le 1.0e$.
- **Significant Fault ($> 1.0e$):**
  - **Pass (Handled):** Permitted if instrument detects fault, inhibits display, sounds alarm, or halts printing (`detected_and_acted`).
  - **Pass (Explained):** Permitted if fault is temporary and documented (`not_significant`).
  - **Fail:** If deviation $> 1.0e$ without automatic detection or action.

---

### 5.17 Damp Heat Steady State Climatic Conditioning (T13a–T13c)
Evaluates error after 48 hours of conditioning in a climatic chamber at $40^\circ\text{C}$ and $85\%$ Relative Humidity:
$$|E_c| \le |\text{MPE}|$$

---

### 5.18 Span Stability Drift & Dynamic Loading Sizing (T14)
Measures calibration drift across at least 8 test cycles:
- Let $d_i = E_{L,i} - E_{0,i}$.
- If range of measurement 1 satisfies $(d_{\max} - d_{\min}) \le 0.1e$, single loading per cycle is permitted; otherwise 5 loadings are required.
- **Span Variation Criterion:**
  $$|\text{avg}_m - \text{avg}_1| \le 0.5e \quad \forall m \in [1, 8]$$

---

### 5.19 Mechanical Endurance Cycle Degradation (T15)
Subjected to 100,000 repetitive loading cycles:
$$|E_{c,\text{final}} - E_{c,\text{initial}}| \le |\text{MPE}| \quad \forall \text{ load test points}$$

---

### 5.20 Monotonic Dominance Verdict Aggregation Algorithm
Aggregates all 17 test procedures and 112 Section 17 checklist clauses into a singular dossier verdict using strict mathematical dominance:

$$\text{Precedence: } \text{FAILED } (3) \succ \text{INCOMPLETE } (2) \succ \text{PASSED } (1) \succ \text{NOT\_APPLICABLE } (0)$$

$$\text{Verdict}_{\text{report}} = \begin{cases} 
\text{FAILED} & \text{if } \exists v \in V: v = \text{FAILED} \\
\text{INCOMPLETE} & \text{if } \exists v \in V: v = \text{INCOMPLETE} \\
\text{PASSED} & \text{if } \forall v \in V: v \in \{\text{PASSED}, \text{NOT\_APPLICABLE}\}
\end{cases}$$

$$\text{Progress \%} = \frac{\sum [v \in \{\text{PASSED}, \text{FAILED}\}]}{|V_{\text{applicable}}|} \times 100$$

---

### 5.21 Sandboxed AST Decimal Rule Evaluator
Located in [`evaluator.py`](file:///d:/SIH26035/backend/packages/engine/evaluator.py). Evaluates dynamic statutory rules defined in YAML rule packs without arbitrary code execution risk:
- Whitelists only safe mathematical AST nodes: `Expression`, `BinOp`, `UnaryOp`, `Compare`, `BoolOp`, `IfExp`, `Constant`, `Name`, `Subscript`.
- Overrides numeric parsing: all constants are parsed directly into `Decimal(str(val))`.
- Strictly forbids: `import`, `exec`, `eval`, lambda functions, and dunder attribute accesses (`__class__`, `__subclasses__`).

---

### 5.22 Canonical Hashing, Blockchain Hash Chains & Non-Repudiation
To ensure byte-for-byte reproducibility:
1. **Canonical JSON Serialization:** All JSON dictionary keys are recursively sorted in lexicographical order:
   $$\text{Canonical JSON} = \text{stringify}(\text{sort\_keys}(D))$$
2. **Document SHA-256 Digest:**
   $$\text{Digest} = \text{SHA-256}(\text{Canonical JSON})$$
3. **Audit Ledger Hash Chain:**
   $$H_n = \text{SHA-256}(H_{n-1} + \text{user\_id} + \text{entity} + \text{action} + \text{data} + \text{ts})$$

---

### 5.23 Dimensional Unit Normalization & Exact 1-2-5 Scale Step Verifiers
Located in [`numeric.py`](file:///d:/SIH26035/backend/packages/engine/numeric.py):
- **Canonical Mass Conversion:** Intermediate calculations are converted to canonical milligrams ($\text{mg}$) with 40-decimal precision:
  $$\text{mg}: 1, \quad \text{g}: 10^3, \quad \text{kg}: 10^6, \quad \text{t}: 10^9, \quad \text{lb}: 453\,592.37, \quad \text{oz}: 28\,349.523125$$
- **1-2-5 Scale Interval Verification (`is_1_2_5_step`):**
  Verifies that verification scale interval $e$ and actual scale interval $d$ satisfy:
  $$e, d \in \{1, 2, 5\} \times 10^k \quad (k \in \mathbb{Z})$$
- **Scale Interval Integrality:**
  $$n = \frac{\text{Max}}{e} \in \mathbb{Z}^+ \quad \text{and} \quad n_{\min} \le n \le n_{\max}$$

---

## 6. Complete REST API Endpoints Specification

| HTTP Method | Route | Description | Request Body / Parameters | Response Schema |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/healthz` | System health check returning engine status and normative version. | None | `{status: "ok", version: "1.0.0"}` |
| `POST` | `/api/v1/auth/login` | Authenticates user via PBKDF2; issues signed HMAC token. | `{email, password}` | `{token, user}` |
| `GET` | `/api/v1/auth/users` | Lists registered laboratory inspectors and reviewers. | None | `List[UserResponse]` |
| `GET` | `/api/v1/applications/` | Retrieves all registered instrument pattern applications. | None | `List[ApplicationResponse]` |
| `POST` | `/api/v1/applications/` | Creates a new instrument type evaluation application. | `ApplicationCreate` | `ApplicationResponse` |
| `GET` | `/api/v1/reports/{id}` | Fetches complete report dossier with metadata and test results. | `id: string` | `ReportDetailResponse` |
| `PUT` | `/api/v1/reports/{id}` | Updates report lifecycle status (`draft` $\to$ `under_review` $\to$ `approved`). | `ReportUpdate` | `ReportResponse` |
| `GET` | `/api/v1/tests/{report_id}/{test_code}` | Retrieves raw observation rows and computed results for a specific test. | `report_id, test_code` | `TestInstanceResponse` |
| `PUT` | `/api/v1/tests/{report_id}/{test_code}` | Saves raw observations and triggers real-time deterministic recalculation. | `TestSaveRequest` | `TestInstanceResponse` |
| `GET` | `/api/v1/checklist/{report_id}` | Retrieves Section 17 construction compliance checklist items. | `report_id: string` | `List[ChecklistResponse]` |
| `PUT` | `/api/v1/checklist/{report_id}` | Records pass/fail/NA verdicts on technical construction clauses. | `List[ChecklistUpdate]` | `ChecklistSummaryResponse` |
| `GET` | `/api/v1/equipment/` | Retrieves certified laboratory reference standards and climatic chambers. | None | `List[EquipmentResponse]` |
| `POST` | `/api/v1/reports/{id}/generate` | Generates official vector PDF (ReportLab) or Word DOCX dossier. | `{format: "pdf"\|"docx"}` | `GeneratedReportResponse` |
| `GET` | `/api/v1/reports/{id}/download/{fmt}`| Streams generated `.pdf` or `.docx` certificate binary file. | `id, fmt` | Binary File Stream |
| `GET` | `/api/v1/dashboard/stats` | Aggregated laboratory metrics: test completion, pass/fail ratios. | None | `DashboardStatsResponse` |
| `GET` | `/api/v1/csv/template` | Downloads standardized OIML test CSV template with instrument metadata. | None | Plaintext CSV Stream |
| `POST` | `/api/v1/csv/import` | Uploads single-model observation CSV directly into evaluation engine. | `file: UploadFile` | `CsvImportResponse` |
| `POST` | `/api/v1/import/preview` | Analyzes uploaded CSV or multi-model XLSX workbook; returns validation summary. | `file: UploadFile` | `ImportPreviewResponse` |
| `POST` | `/api/v1/import/process` | Processes validated workbook sheets into active test sessions in the database. | `file: UploadFile` | `ImportProcessResponse` |
| `GET` | `/api/v1/ml/model-info` | Returns metadata on trained Scikit-Learn models and normative corpus size. | None | `ModelInfoResponse` |
| `POST` | `/api/v1/ml/predict-boundary` | Evaluates ML MPE surface, compliance probability, and anomaly score. | `BoundaryPredictRequest`| `BoundaryPredictResponse` |
| `POST` | `/api/v1/ml/predict-tests` | Recommends statutory OIML tests using Multi-Output Classifier. | `InstrumentParamsRequest`| `TestSuggestionResponse` |
| `GET` | `/api/v1/ml/rules-search` | Semantic search over normative OIML and Indian Gazette text segments. | `query: string` | `RulesSearchResponse` |
| `GET` | `/api/v1/ml/statutory-boundaries`| Returns compiled statutory JSON definitions of Table 6 and 2026 amendments. | None | `StatutoryBoundariesResponse` |

---

## 7. Comprehensive Operational Process Workflows

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 CORE PROCESS MAP                                       │
│                                                                                        │
│  [1. Application] ──► [2. Test Selection] ──► [3. Test Execution] ──► [4. Engine Calc] │
│         │                     │                       │                     ▲          │
│         │ (Bulk Import)       │ (ML Suggester / Rules)│ (Sensor / Manual)   │          │
│         ▼                     ▼                       ▼                     │          │
│  [CSV/XLSX Parser]     [testApplicability]     [PWA Offline Sync]           │          │
│         │                     │                       │                     │          │
│         └─────────────────────┴───────────────────────┴─────────────────────┘          │
│                                                                             │          │
│                                                                             ▼          │
│                                                                    [5. Review/Approval]│
│                                                                             │          │
│                                                                             ▼ (Seal)   │
│                                                                    [SHA-256 Digest]    │
│                                                                             │          │
│                                                      ┌──────────────────────┴───────┐  │
│                                                      ▼                              ▼  │
│                                             [ReportLab 64p PDF]            [Word DOCX] │
│                                             [Vector Diagrams]              [Public QR] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Process 1: Instrument Registration & Monotonic Multi-Range Validation
1. **Input:** Technician enters model designation, accuracy class, Max, Min, $e$, $d$, tare capacity, and operating temperature range.
2. **Syntactic Validation:** Pydantic and Zod schemas verify required fields.
3. **Metrological Range Check (`validator.py`):**
   - Verifies $e$ and $d$ satisfy the $(1, 2, \text{or } 5) \times 10^k$ step rule (`V-INS-01`).
   - Verifies $d \le e$ (`V-INS-03`).
   - Verifies $n = \text{Max}/e$ is an integer within Class limits ($500 \le n \le 10\,000$ for Class III) (`V-INS-02`).
   - For multi-range instruments, checks monotonic order: $\text{Max}_{i+1} > \text{Max}_i$ and $e_{i+1} > e_i$ (`V-INS-04`).
4. **Persistence:** Saved into PostgreSQL `application` and `report` tables (and mirrored to IndexedDB `instruments`).

---

### Process 2: Live Observation Ingestion & Real-Time Deterministic Verification
1. **Input:** Inspector records load $L$, displayed indication $I$, additional tare weights $\Delta L$, and environmental readings.
2. **Observation Sanity Check:**
   - Verifies $L \ge 0$ and $L \le \text{Max} + \text{Tare}$ (`V-OBS-03`).
   - Verifies $I$ is a multiple of $d$ (`V-OBS-01`).
   - Verifies $0 \le \Delta L \le d$ (`V-OBS-02`).
   - Checks series monotonicity (increasing load series must strictly ascend) (`V-OBS-05`).
3. **Mathematical Engine Execution:**
   - Computes indication prior to rounding: $P = I + 0.5e - \Delta L$.
   - Computes raw error: $E = P - L$.
   - Resolves zero error $E_0$ and computes corrected error: $E_c = E - E_0$.
   - Queries Table 6 dynamic tolerance band: resolves $\text{MPE}(L)$.
   - Evaluates row compliance: $|E_c| \le |\text{MPE}|$.
4. **Trace Generation:** Appends explanation record containing the rule ID, clause citation, input values, formula string, and limits.
5. **Real-Time Display:** Returns updated rows and live visual error curve to the frontend.

---

### Process 3: Bulk Multi-Model CSV & XLSX Streaming Batch Ingestion
1. **File Upload:** Laboratory uploads a single CSV or multi-sheet Excel workbook (`.xlsx`).
2. **Workbook Parsing (`openpyxl` / `csv`):**
   - Extracts `# === SHEET: SheetName ===` blocks or sheet tabs.
   - Extracts `# META` comment blocks or top header rows for instrument specifications.
   - Normalizes columns (`load`, `indication`, `delta_l`, `test_type`, `stage`).
3. **Interactive Preview Mode:**
   - Evaluates each sheet without committing to the database.
   - Compiles valid rows count, validation warnings, and blocking errors.
4. **Batch Execution & Session Convergence:**
   - Creates corresponding `Application` and `Report` instances.
   - Distributes rows into their respective standard test runners (`T1`, `T2`, `T3.1`, etc.).
   - Computes all verdicts, updates `ImportBatch` statistics, and transitions imported dossiers to `under_review`.

---

### Process 4: ML Boundary Surface Prediction & Anomaly Isolation
1. **Input Vector:** Metrological payload $[ \text{Class}, L/e, e, \text{Stage}, E_c ]$ received at `/api/v1/ml/predict-boundary`.
2. **Regression Prediction:** `GradientBoostingRegressor` predicts the continuous boundary surface $\text{MPE}_{\text{pred}}$.
3. **Classification Confidence:** `RandomForestClassifier` calculates compliance probability $P_{\text{pass}}$.
4. **Anomaly Scoring:** `IsolationForest` analyzes whether the observation vector deviates from physical calibration variance (contamination score $< 0$ flags potential data tampering or sensor failure).
5. **Response:** Returns predicted envelope, probability score, anomaly status, and statutory rule citation.

---

### Process 5: Normative PDF Semantic Corpus Ingestion & Search
1. **Corpus Extraction:** `fitz` parses 88 statutory PDF documents into normalized 1,500-character segments.
2. **Vector Space Model:** `TfidfVectorizer` generates a 10,000-feature sparse matrix with unigrams and bigrams.
3. **Query Resolution:** Inspector types a query (e.g. *"standard weight substitution 2026 amendment"*).
4. **Cosine Distance Matching:** Inner product between query vector and corpus matrix resolves top matches.
5. **Output:** Formatted results list containing clause number, gazette title, page citation, and matching text snippet.

---

### Process 6: Two-Pass Vector Publication Report Synthesis (PDF & DOCX)
1. **Request:** Reviewer clicks "Generate Official Report" (`/api/v1/reports/{id}/generate`).
2. **ReportLab 5.0 Two-Pass Vector Canvas (`OimlNumberedCanvas`):**
   - **Pass 1:** Typesets all 17 test formats, environmental blocks, Section 17 checklist tables, and calibration equipment logs, caching page states in memory.
   - **Pass 2:** Calculates total pages ($N$) and draws official running headers and footers (*"Report page X of N"*).
3. **Vector Diagram Rendering ([`diagrams.py`](file:///d:/SIH26035/backend/packages/reportkit/diagrams.py)):** Draws high-res eccentricity coordinate maps and error envelope corridors directly inside the document flow.
4. **python-docx Compilation:** Simultaneously generates editable Microsoft Word document matching OIML Formats 1–17.
5. **Cryptographic Sealing:** Computes SHA-256 hash of generated document bytes and canonical data hash; saves record to `generated_report` table.

---

### Process 7: Cryptographic Sealing, Tamper-Evident Ledgering & Public QR Verification
1. **Dossier Sealing:** When a report transitions to `approved`, the server executes canonical JSON serialization:
   $$\text{Digest} = \text{SHA-256}(\text{canonical\_json\_string})$$
2. **QR Code Synthesis:** Generates high-density QR code embedding:
   - Verification URL: `https://metrocert.gov.in/verify?id={verification_id}`
   - Canonical SHA-256 digest fingerprint.
   - Serial number and accuracy class.
3. **Public Verification Portal ([`Verify.tsx`](file:///d:/SIH26035/app/src/views/Verify.tsx)):** Anyone scanning the QR code or visiting `/verify` enters the public ID or uploads the PDF certificate to execute client-side SHA-256 hash comparison and verify blockchain audit integrity.

---

### Process 8: Dual-Tier Offline-to-Online PWA Synchronization
1. **Offline Mode Detection:** Service worker catches network disconnection; switches app state to offline.
2. **IndexedDB Local Storage:** Inspector conducts tests; observations, photos, and signatures write to Dexie tables.
3. **Client-Side PDF Fallback:** Inspector can generate and print emergency on-site test certificates using `jsPDF`.
4. **Reconnection & Synchronized Convergence:**
   - Dexie lifecycle hooks detect network restoration.
   - Sync engine maps camelCase client entities to PostgreSQL snake_case schema.
   - Pushes queued records to `/api/v1/` endpoints and Supabase cluster via upsert (`onConflict: 'id'`).
   - Server validates all offline calculations and seals the centralized database record.

---

## 8. Complete File System & Monorepo Codebase Map

```
d:\SIH26035\
├── LATEST_TECH_STACK_AND_ALGORITHMS.md       # Master engineering specification & complete tech reference
├── README.md                                 # Quick start and project overview
├── PRD.md                                    # Product Requirements Document (FR-01 to FR-12)
├── TRD.md                                    # Technical Requirements Document (Engineering Blueprint)
├── PROJECT_SPECIFICATION_OIML_R76.md         # Detailed OIML R-76 implementation rules
├── rutviktech.md                             # Tech analysis notes & optimization roadmap
├── package.json                              # Root workspace runner scripts
├── multi_object_instruments_multisheet.csv   # Reference 4-object multi-sheet test dataset
├── multi_object_instruments_multisheet.xlsx  # Reference multi-sheet Excel test workbook
├── oiml.db                                   # Zero-downtime offline SQLite fallback database
│
├── scripts/                                  # Development & Data Utility Scripts
│   ├── generate_multi_object_files.py        # Synthetic multi-sheet dataset generator
│   └── train_test_suggester.py               # ML test recommender training script
│
├── app/                                      # Next.js 14 Frontend Progressive Web Application
│   ├── package.json                          # Frontend dependencies & scripts
│   ├── next.config.mjs                       # Next.js configuration & API reverse proxies
│   ├── tailwind.config.js                    # Metrology design system tokens & colors
│   ├── vite.config.ts                        # Vitest test runner configuration
│   ├── tsconfig.json                         # TypeScript strict compiler configuration
│   └── src/
│       ├── App.tsx                           # Master client application container & routing
│       ├── index.css                         # Global CSS, Tailwind base & utility classes
│       ├── components/                       # Modular UI components
│       │   ├── CsvSessionImporter.tsx        # Multi-sheet CSV/XLSX interactive batch importer
│       │   ├── Providers.tsx                 # Application context and theme providers
│       │   ├── layout/                       # App layout, navigation header, sidebar
│       │   ├── regulatory/
│       │   │   └── OimlDiagrams.tsx          # SVG/Canvas vector OIML regulatory visualizer
│       │   ├── three/
│       │   │   └── BalanceScene.tsx          # Three.js 3D Metrology balance visualizer
│       │   ├── charts/
│       │   │   └── ErrorCurve.tsx            # Live SVG tolerance corridor graph
│       │   ├── ui/
│       │   │   ├── DotField.tsx              # Interactive dynamic particle canvas
│       │   │   ├── Portal.tsx                # Accessible React modal portal
│       │   │   └── motion.tsx                # Framer motion transition presets
│       │   └── qr/
│       │       └── QrScanner.tsx             # Camera QR code reader
│       ├── domain/                           # Core metrological definitions & types
│       │   ├── types.ts                      # TypeScript interfaces (Instrument, TestPoint, etc.)
│       │   └── validators.ts                 # Zod validation schemas
│       ├── engine/                           # Pure TypeScript Client Metrology Engine
│       │   ├── metrology.ts                  # P = I + 1/2e - dL, E, Ec calculators
│       │   ├── mpe.ts                        # Dynamic Table 6 tolerance band selection
│       │   ├── compliance.ts                 # Verdict generator & calculation trace builder
│       │   └── testRunners.ts                # Orchestrators for all test procedures
│       ├── lib/                              # Frontend Helper Libraries
│       │   ├── cn.ts                         # Tailwind CSS class merging helper
│       │   ├── format.ts                     # Numerical & unit formatters
│       │   ├── mockCsvParser.ts              # Client-side multi-sheet CSV parser
│       │   └── testApplicability.ts          # Statutory test requirement determination solver
│       ├── database/                         # Database clients & sync
│       │   ├── client.ts                     # Supabase JS client initializer
│       │   ├── sync.ts                       # Asynchronous Dexie -> Supabase sync hooks
│       │   └── schema.sql                    # PostgreSQL schema definition
│       ├── integrity/                        # Cryptographic tamper evidence
│       │   └── hash.ts                       # SHA-256 canonical hashing & FNV-1a fallback
│       ├── regulatory/                       # Statutory ruleset definitions
│       │   ├── registry.ts                   # Ruleset version registry
│       │   ├── rulesets/oimlR76_2006.ts      # OIML R 76-1:2006 standard ruleset
│       │   └── rulesets/indiaLM_2011.ts      # Indian Legal Metrology 2011 & 2026 ruleset
│       ├── report/                           # Client-side reporting
│       │   ├── generatePdf.ts                # jsPDF certificate generator
│       │   ├── generateDocx.ts               # Word document generator
│       │   └── qr.ts                         # QR code matrix builder
│       ├── screens/ & views/                 # Full Application Views
│       │   ├── Dashboard.tsx                 # Laboratory metrics & status overview
│       │   ├── Landing.tsx                   # Public platform landing screen
│       │   ├── Login.tsx                     # Authentication & role selection
│       │   ├── NewSession.tsx                # Instrument registration & test launcher
│       │   ├── PendingReviews.tsx            # Senior reviewer evaluation queue
│       │   ├── ReportView.tsx & Reports.tsx  # Document generation & PDF preview
│       │   ├── Review.tsx                    # Metrological audit & approval panel
│       │   ├── SessionsList.tsx              # Active & historic test sessions
│       │   ├── TestExecution.tsx             # Interactive test execution interface
│       │   ├── UsersManagement.tsx           # Inspector & laboratory personnel RBAC
│       │   └── Verify.tsx                    # Public cryptographic & QR verify portal
│       └── store/                            # Persistence & State
│           ├── db.ts                         # Dexie.js (IndexedDB) database definitions
│           ├── seed.ts                       # Client-side mock data seeder
│           └── useAppStore.ts                # Zustand global state store
│
└── backend/                                  # FastAPI Python 3.12 Backend Server
    ├── run_server.py                         # Server entrypoint (Uvicorn launcher on port 8000)
    ├── requirements.txt                      # Python backend dependencies
    ├── apps/
    │   └── api/                              # REST API implementation
    │       ├── main.py                       # FastAPI application instance & lifespan
    │       ├── config.py                     # Environment variables & DB settings
    │       ├── database.py                   # SQLAlchemy engine & SQLite fallback mechanism
    │       ├── models.py                     # Relational DB models (Application, Report, etc.)
    │       ├── schemas.py                    # Pydantic request/response schemas
    │       ├── security.py                   # PBKDF2-HMAC-SHA256 password & token utility
    │       ├── seed.py                       # Initial laboratory database seeder
    │       └── routers/                      # Modular API routers
    │           ├── auth.py                   # Authentication & user management
    │           ├── applications.py           # Pattern evaluation applications
    │           ├── reports.py                # Report state & metadata
    │           ├── tests.py                  # Test instances & observation handlers
    │           ├── checklist.py              # Section 17 construction checklist
    │           ├── equipment.py              # Reference standard weights
    │           ├── generation.py             # Document synthesis router
    │           ├── dashboard.py              # Metrics & statistical aggregations
    │           ├── csv_pipeline.py           # Bulk CSV importer/exporter
    │           ├── import_data.py            # Multi-model XLSX batch import engine
    │           └── ml_pipeline.py            # ML boundaries, test suggestions & search
    │
    ├── packages/
    │   ├── engine/                           # Deterministic Metrology & ML Engine
    │   │   ├── calculators.py                # Python Decimal test calculation formulas
    │   │   ├── mpe.py                        # Table 6 lookup and band definitions
    │   │   ├── evaluator.py                  # Sandboxed AST Decimal expression evaluator
    │   │   ├── numeric.py                    # Exact decimal rounding & mg conversion utilities
    │   │   ├── validator.py                  # Entry & submit metrological validation rules
    │   │   ├── verdict.py                    # Monotonic dominance verdict aggregation
    │   │   ├── train_boundaries.py           # Corpus extractor & Scikit-Learn trainer
    │   │   ├── oiml_boundary_model.pkl       # Trained ML model bundle 1 (9.65 MB)
    │   │   └── oiml_test_suggester.pkl       # Trained ML test suggester model 2 (1.07 MB)
    │   └── reportkit/                        # Server-side document generation
    │       ├── builder.py                    # Report view data model constructor
    │       ├── diagrams.py                   # Vector drawing generator for PDF figures
    │       ├── pdf_generator.py              # ReportLab 64-page official PDF generator
    │       └── docx_generator.py             # python-docx official Word document generator
    │
    └── rulepacks/                            # Statutory regulations in machine-readable JSON
        └── oiml_statutory_boundaries.json    # Compiled OIML Table 6 & GSR 568(E) bounds
```

---

## 9. Summary Master Technology Matrix

| Subsystem | Primary Technology | Secondary / Fallback | Algorithmic / Architectural Role |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14.2 (App Router) | Vite 5.4 / React 18.3 | Declarative routing, SSR, edge proxies, offline PWA. |
| **State Management** | Zustand 4.5.5 | React Context / Hooks | Reactive store, persona management, dirty state tracking. |
| **Client Storage** | Dexie.js 4.0.9 (IndexedDB) | LocalStorage (Tokens) | Offline 7-table transactional relational persistence. |
| **Cloud Database Sync** | Supabase JS Client 2.117 | Optimistic Local Queue | Bidirectional real-time IndexedDB $\leftrightarrow$ PostgreSQL sync. |
| **3D Rendering Engine**| Three.js 0.169 + R3F + Drei | Canvas 2D Fallback | Interactive 3D scale and calibration weight visualizer. |
| **Vector UI Visuals** | Custom `OimlDiagrams` SVG | HTML Canvas | Interactive eccentricity, creep & temperature cycle curves. |
| **UI Aesthetics** | Tailwind CSS 3.4 + `DotField` | Pure CSS Tokens | Metrological token design system & dynamic particle canvas. |
| **Backend Framework** | FastAPI 0.110 (Python 3.12)| Uvicorn 0.28 ASGI | Asynchronous routing, auto OpenAPI 3.1 generation. |
| **Relational Database**| PostgreSQL 16 (Supabase) | SQLite 3 (`oiml.db`) | Relational persistence, JSONB observation grids, ACID safety. |
| **Metrology Math Core**| Python `decimal.Decimal` | TypeScript Metrology | 40-digit exact rational calculation for OIML R 76-1/2. |
| **AST Rule Parser** | Python `ast` Sandboxed | Declarative JSON | Safe expression evaluation without arbitrary code execution. |
| **PDF Dossier Compiler**| ReportLab 5.0 (Two-Pass) | jsPDF 2.5 (Client-side) | Two-pass vector A4 64-page official OIML R 76-2 dossier. |
| **Word Dossier Compiler**| python-docx 1.2 | None | Native styled tables & editable OIML Formats 1–17. |
| **Vector PDF Diagrams**| ReportLab Drawing Canvas | Matplotlib vector | High-resolution figures embedded in PDF reports. |
| **Batch File Parsing** | openpyxl 3.1 + pandas 3.0 | SheetJS (`xlsx` 0.18) | Multi-sheet Excel & multi-object CSV batch streaming. |
| **ML Test Suggester** | MultiOutputClassifier (RF) | `testApplicability.ts` | Recommends required test series from physical specs. |
| **ML Boundary Regressor**| GradientBoostingRegressor| Table 6 Static Bounds | Continuous MPE surface approximation across arbitrary loads. |
| **ML Compliance Classifier**| RandomForestClassifier | Deterministic Verdict | Statistical compliance confidence probability ($P_{\text{pass}}$). |
| **Anomaly Detector** | IsolationForest | Tolerance Corridor | Data tampering, typo, and sensor hysteresis anomaly detection. |
| **Normative Search** | TF-IDF + Cosine Distance | PyMuPDF Chunker | Semantic statutory clause retrieval over 88 normative PDFs. |
| **Cryptographic Sealing**| SHA-256 / PBKDF2-HMAC | HMAC-SHA256 Signed | Tamper-evident ledger, non-repudiation & QR verification. |
