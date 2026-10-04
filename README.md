# MetroCert — Digital OIML R-76 NAWI Testing & Compliance Platform

**Problem Statement ID: SIH26035** (Smart India Hackathon)  
**Ministry / Department:** Ministry of Consumer Affairs, Food & Public Distribution — Department of Consumer Affairs (Legal Metrology Division)  
**Domain:** National Regulatory & Trade Metrology / Software  

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployment%20Ready-black?style=flat&logo=vercel)](https://vercel.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat&logo=react)](https://react.dev/)
[![OIML R-76](https://img.shields.io/badge/Standard-OIML%20R%2076--1%3A2006-green)](https://www.oiml.org)

---

## 📖 Overview

MetroCert is an offline-first, deterministic metrological testing, compliance, and tamper-evident reporting platform for **Non-Automatic Weighing Instruments (NAWI)** conforming to **OIML R 76-1:2006**, **OIML R 76-2:2007**, and the Indian **Legal Metrology (General) Rules** (including the **Seventh Schedule** and **Fourth Amendment Rules 2026 / GSR 568(E)**).

### Key Features
- **Deterministic Metrological Engine**: Computes true indication ($P = I + 0.5d - \Delta L$), raw error ($E = P - L$), and corrected error ($E_c = E - E_0$) with complete transparent calculation traces.
- **Dynamic MPE Tolerance Corridors**: Real-time evaluation against Accuracy Classes (Class I, II, III, IV) with visual error envelopes.
- **2026 Standard Weight Substitution Optimizer**: Automatically evaluates repeatability ($r \le 0.2e$, $r \le 0.3e$) and advises statutory standard weight requirements ($20\%$, $33.\bar{3}\%$, or $50\% Max$).
- **Offline-First PWA (Progressive Web App)**: Operates seamlessly in rural mandis, weighbridges, and field locations using IndexedDB with auto-sync.
- **Tamper-Evident Reporting**: Generates standardized Field Verification and Type Approval reports with SHA-256 cryptographic fingerprints and verifiable QR codes.
- **Role-Based Workflow**: Field Technician, Senior Reviewer, Laboratory Scientist, and Admin personas with full tamper-audit trail logging.

---

## 🚀 Vercel Deployment

This project is pre-configured and 100% ready for one-click deployment on **Vercel**.

### Option 1: Direct Import via GitHub (Recommended)
1. Push this repository to your GitHub account (`https://github.com/Ajinkya00Magar/SIH26035.git`).
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New Project"**.
3. Import the `SIH26035` repository.
4. **Deploy as-is** (Vercel will automatically read the root [`vercel.json`](./vercel.json) and build `app/`):
   - **Framework Preset**: `Next.js`
   - **Build Command**: `cd app && npm install && npm run build`
5. Click **Deploy**. Your app will be live with Next.js App Router routing supported!

---

## 💻 Local Development

### Prerequisites
- Node.js >= 18.x
- npm >= 9.x

### Quick Start
```bash
# Clone the repository
git clone https://github.com/Ajinkya00Magar/SIH26035.git
cd SIH26035

# Install dependencies and start local dev server
npm install --prefix app
npm run dev

# Or directly in the app directory:
cd app
npm install
npm run dev
```

### Available Scripts
```bash
npm run dev      # Start local Next.js development server (default: port 3000)
npm run build    # Production Next.js build
npm run start    # Start Next.js production server
npm test         # Run the 39 unit tests (Vitest)
```

---

## 🏛️ Project Structure

```
SIH26035/
├── app/                              # Production React + TypeScript PWA
│   ├── src/
│   │   ├── components/               # UI components, layout, navigation, charts
│   │   ├── engine/                   # Metrology, MPE & compliance calculation engine
│   │   ├── pages/                    # Route pages (Dashboard, Sessions, Reports, Verify, etc.)
│   │   ├── regulatory/               # OIML R-76 & Legal Metrology statutory rulesets
│   │   ├── report/                   # PDF generation (jsPDF, autoTable), QR code & JSON export
│   │   ├── store/                    # Dexie (IndexedDB) offline store & Zustand state
│   │   └── types/                    # Metrological data contracts and schemas
│   ├── package.json                  # App dependencies
│   ├── vite.config.ts                # Vite & PWA configuration
│   └── vercel.json                   # Subdirectory SPA routing configuration
├── docs/                             # Technical design specifications
│   └── DESIGN_SPEC.md                # 18-part full design specification
├── Instruments_tests_details/        # Reference OIML standards (R 76-1, R 76-2)
├── OIML/                             # Indian Legal Metrology gazette notifications (2011–2026)
├── PRD.md                            # Product Requirements Document
├── TRD.md                            # Technical Requirements Document
├── PROJECT_SPECIFICATION_OIML_R76.md # OIML R-76 metrological rules & evolution roadmap
├── package.json                      # Root proxy scripts
├── vercel.json                       # Root Vercel deployment configuration
└── README.md                         # Project documentation
```

---

## 🧪 Testing & Verification

Run the test suite covering metrological formulas, MPE band evaluations, compliance logic, and seed data:

```bash
npm test
```

All 39 unit tests execute deterministically against OIML R-76 tolerances:
- Zero setting & zero tracking formulas ($P = I + 0.5d - \Delta L$)
- Eccentricity (corner load) error limits
- Weighing performance (increasing & decreasing)
- In-service vs initial verification MPE multipliers ($2 \times$)
- 2026 GSR 568(E) substitution threshold reduction ($0.2e / 0.3e$)

---

## 📜 Regulatory Standards & Acts

- **OIML R 76-1:2006**: Non-automatic weighing instruments — Part 1: Metrological and technical requirements
- **OIML R 76-2:2007**: Non-automatic weighing instruments — Part 2: Test report format
- **The Legal Metrology Act, 2009** (Act No. 1 of 2010)
- **Legal Metrology (General) Rules, 2011** — Seventh Schedule (Heading A)
- **Legal Metrology (General) Fourth Amendment Rules, 2026** (G.S.R. 568(E))
. Administrator Role

Email: admin@metrocert.gov.in
Password: password123
Access Level: Full access to all features, including system configuration, session management, and report generation.
2. Technician Role

Email: tech@metrocert.gov.in
Password: password123
Access Level: Can create and perform new test sessions, record results, and view test data.
3. Reviewer Role

Email: reviewer@metrocert.gov.in
Password: password123
Access Level: Can review submitted test sessions and generate official PDF/Word reports, but cannot create new tests.