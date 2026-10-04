# MetroCert — Digital OIML R-76 NAWI Testing & Compliance Platform

**SIH26035** · Department of Consumer Affairs, Government of India · *prototype (demonstration data only)*

A responsive **PWA** that digitizes the end-to-end testing of **Non-Automatic Weighing Instruments (NAWI)** under **OIML R 76** and the Indian **Legal Metrology (General) Rules** — with a deterministic metrology engine, explainable compliance, a live error curve, offline field operation, and tamper-evident, verifiable reports.

> Full design (PARTS 1–18) is in [`../docs/DESIGN_SPEC.md`](../docs/DESIGN_SPEC.md).

---

## Quick start

```bash
cd app
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # type-check + production build (+ PWA service worker)
npm run preview    # serve the production build
npm test           # run the engine + demo-flow unit tests (vitest)
```

On first run the app seeds **demonstration data** into IndexedDB (a DWT-300 Class III instrument and three sessions). Use **Settings → Reset demonstration data** to reseed.

---

## 3–5 minute demo

**Dummy Login Details** (Automatically provisioned on first load):
- **Admin**: `admin@metrocert.gov.in` / `password123`
- **Technician**: `tech@metrocert.gov.in` / `password123`
- **Reviewer**: `reviewer@metrocert.gov.in` / `password123`

1. **Sign in** — Use one of the accounts above.
2. On the **Dashboard**, open the highlighted demo session **`LM-2026-00142`** — the DWT-300 with a **deliberate failure**.
3. Open **Weighing performance** → the **100 kg** point shows **Ec = +0.18 kg** against an MPE of **±0.10 kg** → an **explainable FAIL** with the calculation trace, and the **error curve** crosses the ±MPE envelope.
4. Edit the point (e.g. ΔL) to see the curve and verdict update live.
5. Go back → **Review** (as a Reviewer) → inspect the calculation trace → **Approve**.
6. **Report preview** → **Generate & seal report** (field or laboratory).
7. On the report, **Download PDF / JSON**, then open the **verification page** (or `/verify`) and scan/enter the verification ID → **VALID + integrity VERIFIED**.

To create one from scratch: **New Test → pick DWT-300 → generated test plan → enter observations**.

---

## Architecture (separation of concerns)

```
UI (React/TS)  →  domain layer  →  metrology engine  →  regulatory rules engine  →  persistence
```

| Layer | Location | Notes |
| :-- | :-- | :-- |
| Deterministic metrology engine | `src/engine/metrology.ts` | `P = I + i/2 − ΔL`, `E = P − L`, `Ec = E − E0`, full calc trace |
| Dynamic MPE engine | `src/engine/mpe.ts` | per-load-band tier selection, stage multiplier |
| Compliance evaluator | `src/engine/compliance.ts` | explainable PASS/FAIL, margin/excess |
| Test runners | `src/engine/testRunners.ts` | orchestrate raw observations → results |
| Versioned regulation | `src/regulatory/` | OIML R 76 (2006) + India LM overlay, `[VERIFY]` tags |
| Persistence (offline) | `src/store/db.ts` (Dexie) | IndexedDB mirror of the relational model |
| State | `src/store/useAppStore.ts` (zustand) | RBAC, audit, write-through |
| Reports | `src/report/` | HTML doc, jsPDF, JSON, SHA-256 integrity, QR |

**The frontend contains no authoritative regulatory logic** — rules live as versioned data + pure functions, so they can be lifted into a backend service unchanged and packaged for offline use.

## Stack

React + TypeScript · Vite · Tailwind CSS · zustand · Dexie (IndexedDB) · Framer Motion · react-three-fiber/drei (landing 3D, lazy-loaded) · jsPDF · qrcode · vite-plugin-pwa · Vitest.

## Regulatory honesty

- MPE tiers are **verified** against the OIML R 76 structure; in-service = 2× initial.
- Anything not yet confirmed against the primary source carries a **`VERIFY`** badge in the UI.
- Cryptographic integrity proves a report was **not altered** — it does **not** by itself confer legal validity.
- This is a **prototype**, not a certified production system. All bundled data is **DEMONSTRATION DATA**.
