# MetroCert — Digital OIML R-76 NAWI Testing & Compliance Platform

**Problem Statement ID: SIH26035** (Smart India Hackathon)  
**Ministry / Department:** Ministry of Consumer Affairs, Food & Public Distribution — Department of Consumer Affairs (Legal Metrology Division)  
**Domain:** National Regulatory & Trade Metrology / Software  

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployment%20Ready-black?style=flat&logo=vercel)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![OIML R-76](https://img.shields.io/badge/Standard-OIML%20R%2076--1%3A2006-green)](https://www.oiml.org)

---

## 📖 Overview

MetroCert is an offline-first, deterministic metrological testing, compliance verification, and tamper-evident reporting platform for **Non-Automatic Weighing Instruments (NAWI)** conforming to **OIML R 76-1:2006**, **OIML R 76-2:2007**, and the Indian **Legal Metrology (General) Rules** (including the **Seventh Schedule** and **Fourth Amendment Rules 2026 / GSR 568(E)**).

### Key Highlights
- **Deterministic Metrological Engine**: Computes true indication ($P = I + 0.5d - \Delta L$), raw error ($E = P - L$), and corrected error ($E_c = E - E_0$) with complete transparent calculation traces.
- **Dynamic MPE Tolerance Corridors**: Real-time evaluation against Accuracy Classes (Class I, II, III, IV) with visual error envelopes.
- **2026 Standard Weight Substitution Optimizer**: Automatically evaluates repeatability ($r \le 0.2e$, $r \le 0.3e$) and advises statutory standard weight requirements ($20\%$, $33.\bar{3}\%$, or $50\% Max$).
- **Offline-First PWA (Progressive Web App)**: Operates seamlessly in rural mandis, weighbridges, and field locations using IndexedDB with auto-sync.
- **Tamper-Evident Reporting**: Generates standardized Field Verification and Type Approval reports with SHA-256 cryptographic fingerprints and verifiable QR codes.
- **Standardized RBAC Governance**: Strictly enforces 3 metrological roles:
  - **Administrator** (`admin`): Full platform governance, user credential management, audit inspection.
  - **Metrological Tester** (`tester`): Field execution, load readings capture, evidence attachment, submission.
  - **Metrological Reviewer** (`reviewer`): Quality inspection, mathematical verification, sign-off / rejection.

---

## 🏛️ Clean Repository Architecture

```text
SIH26035/
├── app/                          # Next.js 14 Frontend Web Application
│   ├── public/                   # Static branding, symbols, PWA icons
│   ├── src/
│   │   ├── app/                  # Next.js App Router (Layouts, Pages, Error Boundaries)
│   │   ├── components/           # UI components (auth, layout, ui, workflow)
│   │   ├── domain/               # Domain models, types & OIML specifications
│   │   ├── engine/               # Client-side metrology calculation engine
│   │   ├── integrity/            # SHA-256 evidence hashing & cryptographic proofs
│   │   ├── lib/                  # Utilities, formatters & backend API connectors
│   │   ├── regulatory/           # OIML R-76 & India LM 2011 rulebooks
│   │   ├── report/               # Client PDF, Word (.docx), QR code generators
│   │   ├── screens/              # Core application screens
│   │   ├── store/                # Zustand & Dexie.js offline DB
│   │   ├── views/                # Metrology data tables & certificate previews
│   │   └── index.css             # Tailwind design system styling
│   ├── package.json              # Frontend dependencies
│   ├── tsconfig.json             # TypeScript configuration
│   └── Dockerfile                # Production multi-stage build container
│
├── backend/                      # Python FastAPI Metrology Engine & API
│   ├── apps/api/                 # FastAPI routers, models, schemas, config & security
│   ├── packages/engine/          # OIML MPE, numeric & verdict evaluator
│   ├── packages/reportkit/       # Certified PDF, DOCX & visual chart generator
│   ├── rulepacks/                # Statutory boundaries JSON
│   ├── tests/                    # Acceptance & unit test suites
│   ├── requirements.txt          # Python dependencies
│   ├── run_server.py             # Server launcher script
│   └── Dockerfile                # Production Python container
│
├── data/                         # Sample datasets & test workbooks (.xlsx, .csv)
│   ├── multi_object_instruments_multisheet.xlsx
│   ├── multi_object_instruments_multisheet.csv
│   └── sample_all_17_tests_oiml_r76.csv
│
├── docs/                         # Official Documentation & Specifications
│   ├── ARCHITECTURE.md           # System Architecture & Monorepo layout
│   ├── PRD.md                    # Product Requirements Document
│   ├── TRD.md                    # Technical Requirements Document
│   ├── PROJECT_SPECIFICATION_OIML_R76.md
│   ├── TECH_STACK_AND_ALGORITHMS.md
│   ├── DESIGN_SPEC.md
│   ├── WORKFLOW.md
│   └── SIH26035_Problem_Statement.pdf
│
├── standards/                    # Statutory Metrology Reference Standards
│   ├── acts/                     # Legal Metrology Acts, Rules & Gazette Notifications (85 PDFs)
│   └── specifications/           # OIML R 76-1 / 76-2 official specification docs
│
├── scripts/                      # DevOps & Database Automation
│   ├── setup_postgres_cluster.py # Database schema & DDL provisioner
│   ├── generate_multi_object_files.py
│   └── train_test_suggester.py
│
├── artifacts/                    # Generated test reports (.pdf, .docx)
├── docker-compose.yml            # Full-stack local & production orchestrator
├── package.json                  # Root monorepo workspace scripts
├── vercel.json                   # Zero-config Vercel deployment configuration
├── .gitignore                    # Environment & secret hygiene ignores
└── README.md                     # Project documentation
```

---

## 🚀 Deployment Guide

### Option 1: Vercel (Zero-Config Frontend)
1. Push this repository to GitHub (`https://github.com/Ajinkya00Magar/SIH26035.git`).
2. Open your [Vercel Dashboard](https://vercel.com/dashboard) and import the repository.
3. Vercel automatically detects [`vercel.json`](./vercel.json) and builds the Next.js frontend with 0 configuration.

### Option 2: Docker Compose (Full Stack with 1 Command)
Run PostgreSQL, FastAPI Backend, and Next.js Frontend together:
```bash
docker compose up -d --build
```
- **Frontend App**: `http://localhost:3000`
- **FastAPI Documentation**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432`

---

## 💻 Local Development

### Prerequisites
- **Node.js** >= 18.x
- **Python** >= 3.10
- **npm** >= 9.x

### Quickstart

1. **Install Frontend Dependencies:**
   ```bash
   npm --prefix app install
   ```

2. **Install Backend Dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Start Development Servers:**
   - **Frontend**:
     ```bash
     npm run dev
     ```
     Accessible at [http://localhost:3000](http://localhost:3000)

   - **Backend API**:
     ```bash
     npm run server
     ```
     API docs at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

4. **Run Verification & Tests:**
   ```bash
   npm run build     # Verify full Next.js static page production build
   npm run test      # Run unit test suite
   npm run typecheck # Run TypeScript compiler verification
   ```

---

## 👥 Demo Credentials

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@metrocert.gov.in` | `password123` | Full administrative control, user governance, audit trail |
| **Tester** | `tech@metrocert.gov.in` | `password123` | Instrument test execution, observation logging, submission |
| **Reviewer** | `reviewer@metrocert.gov.in` | `password123` | Quality audit, calculation verification, certificate approval |