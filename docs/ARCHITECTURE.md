# MetroCert System Architecture & Repository Structure

MetroCert is a statutory Legal Metrology testing, compliance verification, and certificate generation platform built according to international **OIML R 76-1 / R 76-2 (2006)** standards and **India Legal Metrology (General) Rules, 2011**.

---

## 1. Directory Structure

```text
SIH26035/
├── app/                          # Next.js 14 Frontend Web Application
│   ├── public/                   # Static branding, symbols, PWA icons
│   ├── src/
│   │   ├── app/                  # Next.js App Router (Layouts, Pages, Error Boundaries)
│   │   ├── components/           # Reusable UI component modules
│   │   │   ├── auth/             # Authentication & Google Account Chooser
│   │   │   ├── layout/           # AppShell, Navigation, Header, Sidebar
│   │   │   ├── ui/               # Design system primitives (Cards, Badges, Modals)
│   │   │   └── workflow/         # Steppers, interactive stage visualizers
│   │   ├── domain/               # Metrology models, OIML test specs, TypeScript types
│   │   ├── engine/               # Client-side deterministic calculation & MPE engine
│   │   ├── integrity/            # SHA-256 evidence hashing & cryptographic proofs
│   │   ├── lib/                  # Backend connectors, CSV parser, utilities
│   │   ├── regulatory/           # OIML R-76 & India LM 2011 rulebook definitions
│   │   ├── report/               # Client PDF, Word (.docx), QR code generators
│   │   ├── screens/              # Core workflow screens (Dashboard, Testing, Review)
│   │   ├── store/                # Zustand state & Dexie.js offline-first database
│   │   ├── views/                # Metrology data tables & certificate previews
│   │   └── index.css             # Tailwind CSS tokens & glassmorphic styling
│   ├── package.json              # Frontend dependencies & scripts
│   ├── tsconfig.json             # TypeScript configuration
│   ├── tailwind.config.js        # Design system palette
│   └── Dockerfile                # Production multi-stage build container
│
├── backend/                      # Python FastAPI Metrology Engine & API Service
│   ├── apps/
│   │   └── api/
│   │       ├── main.py           # FastAPI entry point & middleware
│   │       ├── config.py         # Environment configuration (pydantic-settings)
│   │       ├── database.py       # SQLAlchemy engine & session manager
│   │       ├── models.py         # Relational database schema models
│   │       ├── schemas.py        # Pydantic request/response schemas
│   │       ├── security.py       # JWT creation, decoding, PBKDF2 hashing
│   │       ├── supabase_client.py# Supabase cloud database & storage client
│   │       └── routers/          # Modular API endpoint routers
│   │           ├── auth.py       # RBAC auth (Admin, Tester, Reviewer)
│   │           ├── applications.py
│   │           ├── checklist.py
│   │           ├── csv_pipeline.py
│   │           ├── dashboard.py
│   │           ├── equipment.py
│   │           ├── generation.py
│   │           ├── import_data.py# Multi-sheet Excel & CSV ingest pipeline
│   │           ├── ml_pipeline.py# Automated test suggester & ML models
│   │           ├── reports.py    # Report verification & cryptographic seals
│   │           ├── supabase_router.py
│   │           └── tests.py
│   ├── packages/
│   │   ├── engine/               # Metrology Calculation Engine (MPE, tare, errors)
│   │   └── reportkit/            # Certified PDF & DOCX generator with charts
│   ├── rulepacks/                # Statutory boundaries JSON
│   ├── tests/                    # Acceptance & engine test suites
│   ├── requirements.txt          # Python package requirements
│   ├── run_server.py             # Server launcher script
│   └── Dockerfile                # Production Python container
│
├── data/                         # Sample Test Datasets & Workbooks
│   ├── multi_object_instruments_multisheet.csv
│   ├── multi_object_instruments_multisheet.xlsx
│   └── sample_all_17_tests_oiml_r76.csv
│
├── docs/                         # Official Documentation & Specifications
│   ├── ARCHITECTURE.md           # This document
│   ├── PRD.md                    # Product Requirements Document
│   ├── TRD.md                    # Technical Requirements Document
│   ├── PROJECT_SPECIFICATION_OIML_R76.md
│   ├── TECH_STACK_AND_ALGORITHMS.md
│   ├── DESIGN_SPEC.md
│   ├── WORKFLOW.md
│   ├── DEV_NOTES.md
│   └── SIH26035_Problem_Statement.pdf
│
├── standards/                    # Official Statutory Reference Standards
│   ├── acts/                     # Legal Metrology Acts, Rules & Gazette Notifications
│   └── specifications/           # OIML R 76-1 / 76-2 official PDF specifications
│
├── scripts/                      # DevOps & Database Automation
│   ├── setup_postgres_cluster.py # PostgreSQL cluster & DDL migration tool
│   ├── generate_multi_object_files.py
│   └── train_test_suggester.py
│
├── artifacts/                    # Generated test reports (.pdf, .docx)
├── docker-compose.yml            # Full-stack Docker orchestration
├── package.json                  # Root monorepo scripts
├── vercel.json                   # Zero-config Vercel deployment configuration
├── .gitignore                    # Environment & secret hygiene ignores
└── README.md                     # Comprehensive project documentation
```

---

## 2. Core Architectural Principles

1. **Deterministic Metrology Calculations**: Every calculation (MPE, error corrections, rounding intervals) strictly follows OIML R-76 statutory formulas with mathematical audit traces.
2. **Strict RBAC Governance**:
   - `Admin`: Full system configuration, user governance, audit trail inspection.
   - `Tester`: Test execution, evidence logging, dataset submission.
   - `Reviewer`: Quality assurance, calculation inspection, certificate approval/return.
3. **Cryptographic Integrity**: Every certified report is stamped with a SHA-256 integrity hash and verifiable QR code for field enforcement.
4. **Offline-First & Cloud Hybrid**: Works in field environments without connectivity using IndexedDB (`Dexie.js`) and synchronizes with Supabase / PostgreSQL when online.
