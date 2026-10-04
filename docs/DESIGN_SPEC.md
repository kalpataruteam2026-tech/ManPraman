# SIH26035 — MetroCert

## A Digital OIML R‑76 Test, Compliance & Report Generation Platform for Non‑Automatic Weighing Instruments (NAWI)

> Design specification (PARTS 1–18) produced **before** implementation, per the master build brief.
> Department of Consumer Affairs (DoCA), Ministry of Consumer Affairs, Food & Public Distribution, Government of India.

---

### Legend used throughout this document

Every regulatory statement is tagged so mandatory law is never confused with a product idea:

| Tag | Meaning |
| :-- | :-- |
| **[OIML]** | Requirement traceable to OIML R 76 (international recommendation). |
| **[LM]** | Requirement traceable to Indian Legal Metrology Act/Rules. |
| **[ENG]** | Engineering assumption made by us to build the prototype. |
| **[FEAT]** | Proposed product feature (not a legal requirement). |
| **[FUTURE]** | Experimental / future capability, not in the prototype. |
| **[VERIFY]** | Asserted in the research dossier but **must be re‑checked** against the primary source before production use. |

**Authoritative source note.** Primary source is [OIML R 76‑1](https://www.oiml.org/en/files/pdf_r/r076-1-e92.pdf) (Non‑automatic weighing instruments — metrological & technical requirements) and OIML R 76‑2 (test report format), transposed into India via the Legal Metrology Act 2009 and the Legal Metrology (General) Rules 2011 (Seventh Schedule). Because official texts are PDFs behind a viewer, the prototype ships each rule as a **versioned data object with an explicit `source`, `clause`, `edition`, and `effectiveFrom`**, and the UI shows a `[VERIFY]` badge on any rule not yet confirmed against the primary document. The software never hard‑codes a legal claim it cannot cite.

---

## PART 1 — UNDERSTANDING (plain language)

A **weighing instrument** used in trade must be accurate. A **Non‑Automatic Weighing Instrument (NAWI)** is one where a person places the load and reads/accepts the result (shop scales, platform scales, weighbridges, lab balances). Because these scales decide money and safety, the government tests them and issues a **test report / verification certificate**.

Today that testing is largely manual: readings on paper, errors worked out on a calculator, tolerance limits looked up by hand, reports typed later. This is slow and error‑prone, hard to audit, and easy to tamper with.

**What we are building:** software that runs the whole test like a digital lab notebook. The officer configures the instrument once; the system decides which tests apply, guides data entry, does every metrological calculation deterministically, decides PASS/FAIL against the correct tolerance, *explains why*, keeps evidence and a tamper‑evident audit trail, and generates a standardized, verifiable report — online or fully offline in the field.

**One sentence:** *turn Manual test → paper → hand calculation → manual rule‑checking → typed report into a guided digital session that calculates, checks compliance, explains it, and produces an auditable report automatically.*

---

## PART 2 — REGULATORY BASIS

### 2.1 NAWI [OIML][LM]
A weighing instrument requiring operator intervention during weighing (to place/remove load or accept the indication). Scope is **not** limited to electronic scales; it includes mechanical, electromechanical, platform, retail, industrial, and weighbridge‑type instruments.

### 2.2 OIML R 76 [OIML]
The international recommendation defining metrological and technical requirements and test procedures for NAWI. Core concepts the engine must model:

- **Accuracy classes:** I (special), II (high), III (medium), IIII/IV (ordinary).
- **Max / Min** — weighing capacity limits.
- **e** — verification scale interval (the "legal" interval used for tolerances).
- **d** — actual scale interval (the displayed resolution).
- **n = Max / e** — number of verification scale intervals.
- **MPE** — maximum permissible error, which changes by **load band** and class.
- Tests: zero‑setting, weighing performance (increasing/decreasing), repeatability, eccentricity, discrimination, tare, plus influence‑factor/type tests (temperature, damp heat, voltage, EMC/disturbance, creep, zero‑return) and software/electronic requirements for type evaluation.

### 2.3 Verified requirement — MPE tiers [OIML]
MPE at **initial verification / type evaluation**, by load `m = L/e` expressed in verification scale intervals:

| Class | Band (m = L/e) | MPE (initial) |
| :-- | :-- | :-- |
| I | 0 ≤ m ≤ 50 000 | ±0.5 e |
| I | 50 000 < m ≤ 200 000 | ±1.0 e |
| I | m > 200 000 | ±1.5 e |
| II | 0 ≤ m ≤ 5 000 | ±0.5 e |
| II | 5 000 < m ≤ 20 000 | ±1.0 e |
| II | 20 000 < m ≤ 100 000 | ±1.5 e |
| III | 0 ≤ m ≤ 500 | ±0.5 e |
| III | 500 < m ≤ 2 000 | ±1.0 e |
| III | 2 000 < m ≤ 10 000 | ±1.5 e |
| IIII (IV) | 0 ≤ m ≤ 50 | ±0.5 e |
| IIII (IV) | 50 < m ≤ 200 | ±1.0 e |
| IIII (IV) | 200 < m ≤ 1 000 | ±1.5 e |

**In‑service / subsequent verification MPE = 2 × initial verification MPE** for the same band. This is encoded as a `stageMultiplier` so a single table drives both stages.

### 2.4 CONFLICT FOUND & RESOLVED — indication prior to rounding [VERIFY]
The research dossier states the transition‑point formula **two different ways**: `P = I + ½e − ΔL` (§1) and `P = I + ½d − ΔL` (§5). These are not interchangeable in general.

**Resolution (metrologically correct):** the rounding correction uses **the scale interval of the indication being read**. We name that parameter `roundingInterval`:

```
P = I + roundingInterval/2 − ΔL
```

- In normal verification the display shows `d` and `d = e`, so `P = I + e/2 − ΔL` and `P = I + d/2 − ΔL` are identical.
- They diverge only during high‑resolution type testing where `d < e`.

The engine therefore stores `roundingInterval` explicitly per test point and records which interval was used, instead of silently choosing `e` or `d`. The UI shows the chosen basis. **This clause is flagged `[VERIFY]` against the exact OIML R 76‑1:2006 Annex A wording before production.**

### 2.5 Error calculations [OIML]
```
E   = P − L          (error of indication)
E0  = error at (or near) zero
Ec  = E − E0         (corrected error)
PASS  ⇔  −MPE ≤ Ec ≤ +MPE     (evaluated per test point)
```

### 2.6 Indian Legal Metrology relationship [LM]
- **Legal Metrology Act, 2009** and **Legal Metrology (General) Rules, 2011** transpose OIML R 76 into Indian law (Seventh Schedule, Heading A). India's specs are "based on OIML recommendations" (DoCA).
- **Approval of Models Rules** govern type/model approval; **GATC** framework scales testing capacity.
- Amendments (e.g., weight‑substitution provisions, verification periodicity, QR/COO rules) are represented as **dated regulatory versions**, never hard‑coded into UI. Every amendment referenced from the dossier carries a **[VERIFY]** tag with its gazette identifier so it is checked against the official notification before being treated as binding.

### 2.7 Applicable versions
The prototype ships **two ruleset objects**: `OIML R 76‑1 (Edition 2006)` and an `India LM (General) Rules 2011 — Seventh Schedule` overlay. Each historical report pins the exact `rulesetVersion` used.

---

## PART 3 — PRODUCT DEFINITION

**MetroCert** — a Digital OIML R‑76 Test Laboratory & Compliance Platform delivered as a responsive **PWA** (desktop → field mobile), architected so it can later be wrapped as an Android app without redesign.

It is explicitly **not** a form portal or a generic PDF generator. It combines: a laboratory information system, a deterministic metrology calculation engine, a versioned regulatory rules engine, an explainable compliance evaluator, a content‑driven report engine, and a tamper‑evident verification layer — with an offline‑first field mode.

Two operating modes:
- **Mode A — Field / Periodic Verification** (mobile, offline‑first, fast, evidence‑led, compact report).
- **Mode B — Laboratory Model Approval / Pattern Evaluation** (full test matrix, environmental/influence tests, comprehensive dossier).

---

## PART 4 — USERS (roles & permissions)

| Role | Can do | Cannot do |
| :-- | :-- | :-- |
| **Administrator** | Users/orgs/labs, regulatory versions, report templates, settings, full audit read | Alter sealed historical report contents |
| **Lab Technician / Test Engineer** | Create sessions, register instruments, enter observations, upload evidence, run calc, submit for review | Approve/seal reports |
| **Reviewer / Senior Officer** | Inspect results & calc trace, review exceptions, approve/reject, digitally sign | Silently edit raw observations post‑submit |
| **Legal Metrology Officer / Inspector** | Field verification, offline execution, evidence capture, generate field report | Model‑approval‑only tests |
| **Auditor / Viewer** | Read‑only, search reports, verify authenticity, inspect audit trail | Any write |

RBAC is enforced at the domain layer (not just hidden buttons). Every role‑gated action emits an audit event.

---

## PART 5 — END‑TO‑END WORKFLOW

```
Login (role) → Choose Mode (Field / Lab)
   → Register / select Instrument  (Class, Max, Min, e, d, config)
   → Select Regulatory Version (OIML R76 edition + India overlay)
   → System validates config  (e>0, e≥d, n=Max/e in class range, …)
   → Dynamic Test Plan generated (applicable tests + WHY)
   → Reference standard weights recorded (traceability)
   → Guided observation entry per test
        → Metrology engine computes P, E, Ec  (trace stored)
        → MPE engine selects tolerance band  (class + load + stage)
        → Explainable PASS / FAIL / N.A. per point
        → Live error curve vs ±MPE envelope
   → Evidence capture (photos, nameplate OCR assist)
   → Compliance summary (overall verdict + non‑conformities)
   → Submit for Review → Reviewer inspects calc trace → Approve/Reject
   → Report Preview (section checklist) → Finalize (seal)
   → Immutable Report Version + integrity hash + QR
   → Export PDF / JSON  ·  Offline queue → Sync when online
   → QR scan → public verification page (VALID / integrity / versions)
```

---

## PART 6 — INPUT SPECIFICATION

**A. Administrative** [FEAT/LM]: session ID, report ID, laboratory + accreditation/GATC no., jurisdiction, test location (+geo optional), test officer, reviewer, applicant, manufacturer + address, model, serial no., model‑approval ref, evaluation type (Model Approval / Initial / In‑service), date/time, applicable standard version, applicable India regulation version, environment (temperature °C, RH %, pressure kPa, mains V/Hz).

**B. Instrument configuration** [OIML]: type, accuracy class, Max, Min, **e**, **d**, **n**, single/multi‑interval/multiple‑range (+ per‑range Max_i/e_i), tare type & capacity, zero‑setting/zero‑tracking capability, indication/display details, printing device, software identification + version + hash, firmware, legally‑relevant software info, load‑cell info (+R60 cert), indicator info, module info, certificate refs, power/battery, other characteristics.
Validation examples enforced: `e > 0`; `d > 0`; `d ≤ e` and `e/d ∈ {1,2,5,10…}` [VERIFY exact set]; `Min` within class‑dependent multiple of `e`; `n = Max/e` within class band; multi‑interval partial‑range monotonicity.

**C. Reference standard weights** [OIML][LM]: weight ID, certificate no., weight class (OIML R 111 E1/E2/F1/F2/M1/M2 — [VERIFY] interchangeability), nominal value + unit, calibration status, calibration expiry, uncertainty, traceability chain. No assumption that classes are interchangeable.

**D. Empirical observations** — per test (see PART 7).

All quantities carry an explicit **unit**; internally stored in a **canonical unit** (grams) with raw precision preserved separately from display rounding.

---

## PART 7 — TEST ENGINE (config‑driven)

Every test is a **data definition**, not a bespoke page:

```
TestDefinition = {
  id, name, purpose, requiredEquipment,
  applicability(instrument, mode, ruleset) → {applicable, reason},
  inputSchema (zod), validation, calculation(formulaIds),
  acceptance(ruleset), reportMapping
}
```

| Test | Key inputs | Calculation | Acceptance | Report block |
| :-- | :-- | :-- | :-- | :-- |
| **Zero‑setting / zero** | I0, ΔL0 at zero | E0 = (I0 + ri/2 − ΔL0) − 0 | \|E0\| ≤ MPE(0) | Zero test |
| **Weighing performance** | per point: L, I, ΔL (inc & dec) | P=I+ri/2−ΔL; E=P−L; Ec=E−E0 | −MPE(L)≤Ec≤+MPE(L) | Weighing table + curve |
| **Repeatability** | n runs at load L | r = max(P)−min(P) | r ≤ MPE(L) (abs) [VERIFY class‑specific] | Repeatability table |
| **Eccentricity** | center + positions: I, ΔL | Ec per position | each ≤ MPE(L) | Eccentricity table |
| **Discrimination** | I, add ~1.4 d, observe +1 d change | pass if display advances by d | qualitative pass | Discrimination |
| **Tare** | tare load, net weighings | Ec on net loads | −MPE(net)≤Ec≤+MPE | Tare test |
| **Temperature** [Lab] | T points, readings, span | span stability, error at T | within MPE at each T | Influence tests |
| **Damp heat / Voltage / EMC / Creep / Zero‑return** [Lab] | test‑specific | test‑specific | within limits/fault detection | Influence/disturbance |

Applicability is computed: e.g., environmental/EMC tests are **N.A. in Field mode** and applicable in **Lab/Model‑Approval** mode; discrimination applicability depends on instrument type. Each test records **why applicable / why not**.

New tests are added by registering a new `TestDefinition` — no app rewrite.

---

## PART 8 — COMPLIANCE ENGINE (rule selection + calculation)

**Non‑negotiable:** compliance is **deterministic code**, never an LLM. AI is only a data‑capture assistant (PART 16).

Pipeline:
```
observation → metrologyEngine.compute(point, roundingInterval)
   → { P, E, Ec, trace }
mpeEngine.select({ class, load, e, stage, ruleset })
   → { band, mpePos, mpeNeg, ruleRef, ruleVersion }
complianceEngine.evaluate(Ec, mpe)
   → { status: PASS|FAIL, margin/excess, explanation }
```

Every result persists a full trace:
```
{ inputs, formulaId, formulaVersion, intermediates,
  result, ruleRef, ruleVersion, timestamp, appVersion }
```

MPE selection never assumes one tolerance for the whole instrument — it re‑selects per load point (bands change with load and class). Each result exposes: observed error, allowed MPE (±), margin/excess, applicable rule + version, and a human‑readable calculation string.

---

## PART 9 — OUTPUT SPECIFICATION

- **Field report** [FEAT, R76‑2 informed]: ~4–8 pages, content‑driven (metadata, instrument ID, manufacturer, location, verdict, key observations, weighing/repeatability/eccentricity, photos, signatures, QR, integrity block).
- **Laboratory report** [FEAT, R76‑2 informed]: comprehensive dossier (admin, applicant/manufacturer, description, technical + metrological characteristics, regulatory basis, reference standards, environment, examinations, all tests, influence/EMC, creep, software/electronic, modules, results summary, non‑conformities, evidence, approval, annexures). **Structure flagged `[VERIFY]` against the official R 76‑2 format.**
- **JSON** [FEAT]: report ID, instrument, session, standard version, regulatory version, observations, calculations (+traces), results, evidence refs, signatures, integrity hash, timestamps, engine/template/app versions.
- **Verification page** [FEAT]: report ID, instrument, generated date, status VALID/REVOKED/UNKNOWN, integrity VERIFIED/FAILED, standard version, report version — no unnecessary PII.

Page count is **never** hard‑coded; the engine emits content-driven length. Finalization creates an **immutable version**; changes create a **new revision**.

---

## PART 10 — USP (genuine differentiators — not CRUD)

1. **Native deterministic metrology engine** with full, replayable calculation trace (not mere data storage).
2. **Dynamic OIML‑based test planning** — applicable tests generated from configuration, each with a reason.
3. **Explainable compliance** — every PASS/FAIL carries the math + the cited rule/version + margin.
4. **Dynamic MPE visualization** — live error curve against per‑band ±MPE envelope, with textual/numeric equivalents (not color‑only).
5. **Version‑controlled regulation** — rules evolve without corrupting historical reports.
6. **Offline‑first field operation** — full test + calculation + report offline, then sync.
7. **Digital evidence dossier** — observations + evidence + calculations + approvals bound together, reproducible.
8. **AI‑assisted capture** (OCR) that never decides compliance.
9. **Tamper‑evident report architecture** independently checkable via QR (with honest limits — not a legal‑validity claim).
10. **Reproducible historical reports** — each report pins engine/rule/template/app versions.

---

## PART 11 — SYSTEM ARCHITECTURE

```
        React + TypeScript Responsive PWA (UI only — no authoritative rules)
                       │
        ┌──────────────┴───────────────┐
   Offline Engine                   Online API (future backend)
   IndexedDB (Dexie)                FastAPI/Node + PostgreSQL
        │                               │
        └───────────────┬───────────────┘
                        │  Domain layer (portable TS)
        ┌───────────────┼────────────────────────┐
  Metrology Engine   Regulatory Rules Engine   Report Engine
        └───────────────┴────────────────────────┘
                        │
                   Audit System (append-only events)
```

**Separation of concerns:** UI → domain/API → metrology engine → regulatory rules engine → persistence. The frontend contains **no authoritative regulatory logic**; rules live in versioned data + pure functions that are packaged for offline use. In the prototype the domain layer runs client‑side (TS) but is written framework‑free so it lifts into a FastAPI/Node service unchanged.

**Prototype vs production:** prototype persists locally (IndexedDB) with mock auth; production adds the server API, PostgreSQL, real IdP/RBAC, object storage for evidence, and a signing service.

---

## PART 12 — DATABASE (entities & relationships)

Relational model (PostgreSQL in production; mirrored as Dexie tables offline):

```
Users, Organizations, Laboratories
Manufacturers, Models, Instruments
ReferenceStandards
TestSessions ──< TestObservations ──< CalculatedResults ──< ComplianceResults
TestDefinitions (config)         Evidence, Attachments
Reports ──< ReportVersions
RegulatoryStandards ──< RegulatoryVersions ──< Rules, FormulaDefinitions
AuditEvents (append-only), DigitalSignatures, SyncQueue
```

Key relationships: an `Instrument` belongs to a `Model`/`Manufacturer`; a `TestSession` references an `Instrument`, a `RegulatoryVersion`, a technician, a reviewer; observations → results → compliance form a per‑point chain; a `Report` pins `rulesetVersion`, `engineVersion`, `templateVersion`. State is **structured/relational**, not one giant JSON blob.

---

## PART 13 — UI/UX (screens + responsive behavior)

**Design language:** premium, restrained, scientific/government‑grade. Neutral off‑white surfaces, deep navy/charcoal text, one restrained blue/teal accent; green PASS / red FAIL / amber warning with **text + icon**, never color alone. Clean typography, strong hierarchy, high‑quality tables, precise charts. No neon, no meaningless motion in the workspace. (A single tasteful 3D metrology visual appears **only on the landing page**, per the explicit UI request, kept professional.)

**Screen map (27):** Landing · Login · Dashboard · New Test Session · Instrument Registration · Instrument Details · Regulatory Version Selection · Generated Test Plan · Test Execution Overview · Weighing Performance · Repeatability · Eccentricity · Tare · Zero Test · Environmental Test · Evidence Capture · Calculation Details · Compliance Summary · Error Curve · Review · Report Preview · Report Generation · Report Repository · Report Verification · Audit Trail · Regulatory Library · Settings · Mobile Field Mode.

**Responsive:**
- Desktop: sidebar + main workspace + context panel.
- Tablet: collapsible nav, two‑column forms.
- Mobile: top header, single‑column, large touch targets, camera‑first evidence, bottom action bar (`← Previous · Save & Continue →`), stepper (Instrument→Environment→Zero→Weighing→Repeatability→Eccentricity→Evidence→Review→Generate), guarded finalize.

At every step the UI answers: where am I, what am I testing, what to enter, why, what was calculated, which rule applied, did it pass, what remains, can I finalize.

---

## PART 14 — SECURITY

**Prototype:** role‑based mock auth, RBAC enforced in the domain layer, input validation (zod), audit logging of state‑changing actions, integrity hash over canonical report JSON, no secrets in client, evidence stored locally.
**Production (documented, not claimed as done):** real IdP + hardened session mgmt, transport encryption (TLS), server‑side authZ on every endpoint, secure file upload scanning, rate limiting, encrypted at‑rest storage, HSM/KMS‑backed signing, key rotation.
**Honesty rule:** the QR/integrity feature proves the bytes weren't altered; it does **not** by itself confer legal validity — that depends on the deploying authority's signature framework and regulations. This limit is shown in the UI.

---

## PART 15 — OFFLINE (PWA + sync)

Service worker + app‑shell caching; the **verified offline ruleset is packaged** with the app. Offline‑capable: login/session (securely, where possible), test creation, observation entry, deterministic calculations, evidence capture, report generation, local queue.
```
Local (IndexedDB, per-record dirty flag) → SyncQueue → Server
   → conflict resolution (last-writer + field-level merge; sealed reports never auto-overwritten)
   → sync confirmation
```
No cryptographic/security guarantee is claimed beyond what is actually implemented.

---

## PART 16 — AI (assistant, never the authority)

- **Nameplate OCR** [FEAT]: photograph nameplate → extract Manufacturer/Model/Serial/Max/Min/e/d/Class/Power → **"Review extracted values before saving."** Never auto‑committed.
- **Display verification** [FUTURE]: OCR the indicator display and compare to the entered value; flag mismatch.
- Hard boundary: **AI assists data capture; the deterministic engine decides compliance.** The prototype provides an OCR‑assist interface with a clearly labeled mock/real provider seam so no fake accuracy is implied.

---

## PART 17 — IMPLEMENTATION ROADMAP

- **P0 (must work):** instrument registration; test session; Class/Max/Min/e/d; dynamic MPE engine; weighing performance; repeatability; eccentricity; tare; zero; compliance result; explainable calculations; report generation; report repository; responsive mobile UI; engine unit tests.
- **P1 (high value):** offline PWA; error curve; audit trail; evidence management; RBAC; regulatory versioning; QR verification.
- **P2 (innovation):** nameplate OCR; display recognition; visual rule editor; advanced sync/conflict; digital‑signature integration; external registry integration (mock seam); analytics.

This session targets **all P0 + most P1**, with P2 stubbed behind clean seams.

---

## PART 18 — SIH DEMO (3–5 minutes, one instrument)

Instrument: **Demo Weighing Technologies DWT‑300** — Electronic Platform NAWI, **Class III, Max 300 kg, Min 20 kg (200 e), e = d = 0.1 kg, n = 3000**. Clearly labeled **DEMONSTRATION DATA**.

1. Create test session (Field mode). 2. Enter DWT‑300 specs. 3. System validates config. 4. System auto‑generates applicable test plan (with reasons). 5. Technician enters weighing observations. 6. Engine computes P, E, Ec (view trace). 7. MPE engine picks the band per point. 8. Error curve plots Ec vs ±MPE. 9. Enter one **deliberate failing** point (e.g., Ec = +0.18 kg where MPE = ±0.10 kg at that band → **FAIL**). 10. System explains the failure (excess, affected point, curve crosses envelope). 11. Complete remaining tests. 12. Upload evidence. 13. Reviewer inspects the calculation trace. 14. Approve. 15. Generate report. 16. Show QR. 17. Open verification page (VALID + integrity + versions).

The failing point is intentional and central — it proves the compliance engine actually evaluates, not decorates.

---

*Correctness → Traceability → Explainability → Usability → Extensibility → Security → Regulatory Versioning.*
