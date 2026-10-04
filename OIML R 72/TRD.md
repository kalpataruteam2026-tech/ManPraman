# TRD — Technical Requirements Document
## WeighReport: OIML R 76 NAWI Type Evaluation Report Application

| Item | Value |
|---|---|
| Document | Technical Requirements Document (TRD) v1.0 – draft for engineering review |
| Date | 29 September 2026 |
| Parent document | `PRD.md` v1.0 (functional requirements FR-xxx are referenced throughout) |
| Normative sources | OIML R 76-2:2007 (report format); OIML R 76-1 (test methods A, B, F, G) – values marked **[VERIFY]** need metrologist confirmation |
| Audience | Solution architects, backend/frontend engineers, DevOps, QA, metrologist (rule-pack owner) |

---

## 1. Purpose, scope and traceability

### 1.1 Purpose
This document defines **how** the PRD is realised: architecture, technology choices, data model, rule-pack format, calculation algorithms, APIs, report pipeline, security, deployment, testing, and delivery plan.

### 1.2 In scope
Everything required for PRD Phases 0–2 (demo → full R 76-2 coverage), with hooks for Phase 3 items (rule editor UI, instrument import, PWA offline).

### 1.3 Design principles
1. **One calculation truth.** A single server-side engine computes every error, mpe, difference and verdict. The UI, the PDF and the DOCX only *display* what the engine stored.
2. **Rules are data.** Thresholds, tables, applicability, validations, forms, checklist items and report mappings live in versioned rule packs, not code.
3. **Exact arithmetic.** Decimal/rational math only; no binary floats anywhere in the compliance path.
4. **Reproducibility.** A report can be recomputed at any time with the exact rule-pack version, engine version and data it was created with.
5. **Explainability.** Every verdict stores its inputs, formula, limit and clause reference.
6. **Operator cannot decide compliance.** No manual verdict override; only annotated deviations.
7. **Boring, maintainable technology** that a metrology lab's IT team can run on-premise.

### 1.4 Traceability (PRD → TRD)
| PRD group | Realised in TRD section |
|---|---|
| FR-AUTH (auth, roles, audit) | §11 Security, §5.7 Audit |
| FR-INS (instrument capture) | §5 Data model, §8 Form engine, §7.2 Instrument validators |
| FR-ENV, FR-EQP | §5, §8, §7 |
| FR-CFG (applicability) | §6.5 Applicability rules, §8 |
| FR-VAL (validation) | §7 Validation engine |
| FR-CAL (calculation, verdicts) | §7 Calculation & compliance engine |
| FR-CHK (checklist) | §6.6 Checklist packs, §8 |
| FR-ATT (attachments) | §12 File service |
| FR-RPT (reports) | §10 Report pipeline |
| FR-REP (repository, search) | §13 Search |
| FR-DSH (dashboard) | §13 Dashboard queries |
| FR-WF (workflow, signature) | §9.4 State machine, §10.6 Signing |
| FR-RUL (rule layer) | §6 Rule pack specification |
| NFR | §14 Infrastructure, §15 Performance & observability, §16 Testing |

---

## 2. Architecture overview

### 2.1 Logical architecture
```
┌──────────────────────────── Browser (React SPA) ────────────────────────────┐
│ Form renderer (from schema) · Grids · Dashboard · Report Composer · Viewer   │
└───────────────▲──────────────────────────────────────────────────────────────┘
                │ HTTPS / JSON (REST, OpenAPI 3.1)
┌───────────────┴───────────── Reverse proxy (nginx / ingress) ────────────────┐
│ TLS termination · static SPA · rate limiting · request-id                    │
└───────────────▲──────────────────────────────────────────────────────────────┘
┌───────────────┴──────────────── API service (FastAPI) ───────────────────────┐
│ AuthN/AuthZ │ Report svc │ TestData svc │ Equipment svc │ Attachment svc      │
│ Search svc  │ Dashboard svc │ RulePack svc │ Audit svc │ Report-job svc       │
│        └────────────► Domain layer ◄──── Calculation & Compliance Engine       │
│                         (weighreport_engine – pure Python library)              │
└───────▲───────────────▲──────────────────▲────────────────────▲──────────────┘
        │               │                  │                    │
   PostgreSQL 16     Redis 7            MinIO (S3)          ClamAV
   (data, audit,   (queue, cache,     (attachments,        (upload scan)
    rule packs)     locks)             generated reports)
                        ▲
                ┌───────┴─────── Worker service (Celery) ───────┐
                │ report builders: HTML→PDF, DOCX, charts, sign │
                └───────────────────────────────────────────────┘
```

### 2.2 Technology decisions (ADRs)

| ADR | Decision | Rationale | Alternatives rejected |
|---|---|---|---|
| ADR-001 | **Python 3.12 + FastAPI** backend | `decimal`/`fractions` in stdlib, strong docx/pdf ecosystem, quick to build a typed REST API, easy for metrology/data staff to read | Node/NestJS (no native decimal), .NET (heavier for lab IT) |
| ADR-002 | **PostgreSQL 16** with JSONB | Relational integrity for entities + JSONB for schema-driven test payloads; FTS and trigram search built in | MongoDB (weaker integrity/audit), SQLite (concurrency) |
| ADR-003 | **Server-authoritative calculation; live preview through a stateless `/calc/preview` endpoint** (debounced ≤ 300 ms) | Avoids the drift risk of maintaining a second (TypeScript/WASM) implementation. *This refines the PRD wording "WASM or shared TypeScript".* Pyodide/WASM build of the engine is a Phase-3 option for offline mode | Duplicate TS engine (risk of mismatched verdicts) |
| ADR-004 | **Rules as YAML → validated → stored in DB**, evaluated by a **custom whitelisted expression evaluator** (Decimal-aware) | Full control of numeric semantics and sandboxing; no `eval` | JSONLogic/CEL (float semantics, limited function set) |
| ADR-005 | **Single `ReportView` JSON → two renderers**: Jinja2/HTML → **WeasyPrint** (PDF) and **docxtpl** (DOCX) | One data model guarantees identical numbers; WeasyPrint supports CSS paged media (running headers, page x/y, bookmarks); docxtpl gives real editable Word tables from Word templates | Headless Chromium (heavy), LibreOffice conversion of DOCX (layout drift) |
| ADR-006 | **React 18 + TypeScript + Vite**, TanStack Query, MUI, AG Grid Community | Spreadsheet-like grids with paste support; mature form ecosystem | Vue/Angular (equivalent; team preference decides) |
| ADR-007 | **Celery + Redis** for report jobs, virus scan, recompute batches | Simple, proven; jobs are idempotent | Cloud queues (offline lab requirement) |
| ADR-008 | **MinIO (S3 API)** for files | On-prem friendly, swap to any S3 | Files in DB |
| ADR-009 | **Modular monolith** (API + worker share code) | Team size, operational simplicity; boundaries kept via packages so services can be split later | Microservices |
| ADR-010 | **Keycloak (OIDC) optional; built-in local auth default** | Labs without IdP can still run; enterprise SSO supported | Only external IdP |

### 2.3 Repository layout (monorepo)
```
weighreport/
├─ apps/
│  ├─ web/                    # React SPA
│  ├─ api/                    # FastAPI app (routers, deps, schemas)
│  └─ worker/                 # Celery tasks (reports, scans)
├─ packages/
│  ├─ engine/                 # weighreport_engine: decimals, units, mpe, calculators, verdicts, validators, evaluator
│  ├─ rulepack_tools/         # schema validation, compile, diff, test runner, CLI
│  └─ reportkit/              # ReportView builder, HTML/DOCX templates, chart rendering, signing
├─ rulepacks/
│  └─ oiml-r76-2007/          # YAML sources: meta, mpe, tests/*.yaml, forms/*.json, checklist/*.yaml, i18n/*.yaml
├─ golden/                    # hand-verified datasets + expected results
├─ deploy/                    # docker-compose, helm, nginx, grafana dashboards
├─ docs/                      # architecture, methodology, operations, API
└─ .github/ (or .gitlab-ci.yml)
```

---

## 3. Environment & version baseline

| Component | Version / spec |
|---|---|
| Python | 3.12 (type-checked with mypy strict on `engine`) |
| FastAPI / Pydantic | 0.11x / v2 |
| SQLAlchemy / Alembic | 2.x / 1.13+ |
| PostgreSQL | 16 (extensions: `pg_trgm`, `btree_gin`, `pgcrypto`) |
| Redis | 7 |
| Celery | 5.4+ |
| WeasyPrint | 62+ (Pango/Cairo present in image) |
| docxtpl / python-docx | current stable |
| pyHanko | current stable (PAdES signing) |
| matplotlib | Agg backend (chart PNG/SVG for span stability) |
| Node / React | Node 20 LTS, React 18, Vite 5 |
| Container runtime | Docker 24+, Compose v2; Kubernetes 1.28+ (Helm 3) |

---

## 4. Non-negotiable technical constraints

1. No `float` type in `engine`; lint rule bans `float(`, literals with `.` outside `Decimal("...")`.
2. All decimal values are transported in JSON **as strings** (`"5010"`, `"0.5"`), stored in DB as `numeric` (inside JSONB as strings).
3. Canonical internal mass unit: **milligram (mg)**; display unit follows the instrument's unit.
4. Timestamps stored in UTC (`timestamptz`), displayed in lab timezone.
5. Finalised reports and generated artifacts are immutable (DB constraints + object-store retention tag).
6. Every write goes through the service layer, which writes an audit event in the same transaction.

---

## 5. Data model (physical design)

### 5.1 Conventions
UUIDv7 primary keys; `created_at/updated_at`; `row_version int` for optimistic locking; soft-delete via `deleted_at` only for non-final drafts.

### 5.2 Core tables (DDL excerpt)
```sql
CREATE TYPE role_t AS ENUM ('admin','engineer','reviewer','readonly');
CREATE TYPE report_status_t AS ENUM ('draft','in_progress','under_review','returned','finalised','archived');
CREATE TYPE verdict_t AS ENUM ('passed','failed','incomplete','not_applicable');
CREATE TYPE test_status_t AS ENUM ('not_started','in_progress','complete');

CREATE TABLE app_user (
  id uuid PRIMARY KEY, email citext UNIQUE NOT NULL, full_name text NOT NULL,
  role role_t NOT NULL, permissions text[] NOT NULL DEFAULT '{}',   -- e.g. {'rulepack:approve'}
  pw_hash text, mfa_secret text, status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE lab_profile (
  id uuid PRIMARY KEY, name text, accreditation_no text, address text,
  logo_object_key text, timezone text DEFAULT 'Asia/Kolkata', default_lang text DEFAULT 'en'
);

CREATE TABLE application (              -- "Application no." of R 76-2
  id uuid PRIMARY KEY, application_no text UNIQUE NOT NULL,
  applicant text, manufacturer text, type_designation text NOT NULL,
  instrument_category text, created_by uuid REFERENCES app_user, created_at timestamptz DEFAULT now()
);

CREATE TABLE report (
  id uuid PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES application,
  version int NOT NULL DEFAULT 1, parent_report_id uuid REFERENCES report,
  status report_status_t NOT NULL DEFAULT 'draft',
  verdict verdict_t NOT NULL DEFAULT 'incomplete',
  progress_pct numeric(5,2) NOT NULL DEFAULT 0,
  rulepack_id uuid NOT NULL REFERENCES rule_pack,
  engine_version text NOT NULL,
  instrument jsonb NOT NULL,          -- general information page (validated by pack schema)
  evaluation_start date, evaluation_end date, report_date date,
  observer_id uuid REFERENCES app_user, reviewer_id uuid REFERENCES app_user,
  remarks jsonb DEFAULT '{}',         -- additional remarks page, construction description
  row_version int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  UNIQUE (application_id, version)
);

CREATE TABLE instrument_range (          -- up to 3 ranges/intervals
  id uuid PRIMARY KEY, report_id uuid REFERENCES report ON DELETE CASCADE,
  idx smallint CHECK (idx BETWEEN 1 AND 3),
  e_mg numeric NOT NULL, d_mg numeric NOT NULL, max_mg numeric NOT NULL, n integer NOT NULL,
  UNIQUE (report_id, idx)
);

CREATE TABLE test_instance (
  id uuid PRIMARY KEY, report_id uuid NOT NULL REFERENCES report ON DELETE CASCADE,
  test_code text NOT NULL,              -- 'T1','T2','T3.1',...
  instance_no int NOT NULL DEFAULT 1,   -- repeated tests (temperature, ranges)
  range_idx smallint,                   -- multiple range instruments
  config jsonb NOT NULL DEFAULT '{}',   -- e.g. {"temperature_c":"40","variant":"digital"}
  applicability text NOT NULL DEFAULT 'required',  -- required | na | optional
  na_reason text,
  header jsonb NOT NULL DEFAULT '{}',   -- date, observer, e, resolution, env At start/max/end
  data jsonb NOT NULL DEFAULT '{}',     -- raw observations (schema from pack form definition)
  results jsonb NOT NULL DEFAULT '{}',  -- computed columns + explanation records
  status test_status_t NOT NULL DEFAULT 'not_started',
  verdict verdict_t NOT NULL DEFAULT 'incomplete',
  form_schema_version text NOT NULL,
  remarks text, row_version int NOT NULL DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (report_id, test_code, instance_no)
);

CREATE TABLE checklist_result (
  id uuid PRIMARY KEY, report_id uuid REFERENCES report ON DELETE CASCADE,
  item_key text NOT NULL,               -- e.g. '17.1/7.1.1/manufacturer_mark'
  result text CHECK (result IN ('passed','failed','na')),
  value jsonb, remarks text, updated_by uuid, updated_at timestamptz,
  UNIQUE (report_id, item_key)
);

CREATE TABLE equipment (
  id uuid PRIMARY KEY, name text, category text, manufacturer text, model text, serial_no text,
  range_text text, accuracy_text text, resolution_text text,
  cert_no text, cal_date date, cal_valid_until date, traceability text, active bool DEFAULT true
);
CREATE TABLE test_equipment_use (test_instance_id uuid REFERENCES test_instance ON DELETE CASCADE,
  equipment_id uuid REFERENCES equipment, PRIMARY KEY (test_instance_id, equipment_id));

CREATE TABLE attachment (
  id uuid PRIMARY KEY, report_id uuid REFERENCES report ON DELETE CASCADE,
  owner_type text CHECK (owner_type IN ('report','test','checklist')), owner_ref text,
  object_key text NOT NULL, filename text, mime text, size_bytes bigint, sha256 text NOT NULL,
  caption text, category text, include_in_report bool DEFAULT false,
  scan_status text DEFAULT 'pending', uploaded_by uuid, uploaded_at timestamptz DEFAULT now()
);

CREATE TABLE generated_report (
  id uuid PRIMARY KEY, report_id uuid NOT NULL REFERENCES report,
  kind text CHECK (kind IN ('detailed','summary')),
  format text CHECK (format IN ('pdf','docx')),
  gen_no int NOT NULL, object_key text NOT NULL, sha256 text NOT NULL,
  rulepack_id uuid, engine_version text, data_hash text NOT NULL,   -- hash of ReportView input
  stale bool NOT NULL DEFAULT false, watermark text,
  generated_by uuid, generated_at timestamptz DEFAULT now(),
  UNIQUE (report_id, kind, format, gen_no)
);

CREATE TABLE rule_pack (
  id uuid PRIMARY KEY, name text NOT NULL, version text NOT NULL,       -- semver
  status text CHECK (status IN ('draft','approved','active','retired')),
  effective_from date, effective_to date,
  content jsonb NOT NULL,               -- compiled pack
  content_sha256 text NOT NULL, source_commit text,
  approved_by uuid, approved_at timestamptz,
  UNIQUE (name, version)
);

CREATE TABLE review_comment (id uuid PRIMARY KEY, report_id uuid, test_code text, field_path text,
  body text, author_id uuid, resolved bool DEFAULT false, created_at timestamptz DEFAULT now());

CREATE TABLE signature (id uuid PRIMARY KEY, generated_report_id uuid REFERENCES generated_report,
  signer_id uuid, method text, signed_at timestamptz, cert_subject text, cert_serial text);

CREATE TABLE audit_event (
  seq bigserial PRIMARY KEY, ts timestamptz DEFAULT now(), user_id uuid, ip inet,
  entity text, entity_id uuid, action text, old jsonb, new jsonb, reason text,
  prev_hash bytea, hash bytea NOT NULL
);
REVOKE UPDATE, DELETE, TRUNCATE ON audit_event FROM PUBLIC;  -- plus trigger raising exception
```

### 5.3 Indexes
```sql
CREATE INDEX ix_report_status_verdict ON report (status, verdict, updated_at DESC);
CREATE INDEX ix_report_app ON report (application_id, version DESC);
CREATE INDEX ix_report_class ON report ((instrument->>'accuracy_class'));
CREATE INDEX ix_test_report_code ON test_instance (report_id, test_code);
CREATE INDEX ix_test_verdict ON test_instance (test_code, verdict);
CREATE INDEX ix_app_trgm ON application USING gin ((application_no || ' ' || type_designation || ' ' || coalesce(manufacturer,'') || ' ' || coalesce(applicant,'')) gin_trgm_ops);
CREATE INDEX ix_report_fts ON report USING gin (to_tsvector('simple', coalesce(remarks::text,'') || ' ' || coalesce(instrument::text,'')));
CREATE INDEX ix_equipment_cal ON equipment (cal_valid_until);
CREATE INDEX ix_audit_entity ON audit_event (entity, entity_id, seq);
```

### 5.4 Test payload shape (example: T3.1 eccentricity)
```json
{
  "header": {
    "date": "2026-10-05", "observer_id": "…", "e": "5", "unit": "g", "resolution_note": null,
    "env": {"temp": {"start":"20.5","max":null,"end":"21.2"}, "rh": {"start":"48"}, "time":{"start":"10:05"}}
  },
  "config": {"mobile_instrument": false, "azs_state": "non_existent"},
  "data": {
    "load_fraction": "0.3333",
    "rows": [
      {"loc": 0, "kind": "zero", "L": "0",    "I": "0",    "dL": "0.5"},
      {"loc": 1, "kind": "load", "L": "5000", "I": "5005", "dL": "0.5"},
      {"loc": 0, "kind": "zero", "L": "0",    "I": "0",    "dL": "0.5"},
      {"loc": 3, "kind": "load", "L": "5000", "I": "5010", "dL": "0.5"}
    ]
  }
}
```

### 5.5 Schema evolution
- Alembic migrations for relational schema; JSONB payloads carry `form_schema_version`; a registry of **upcasters** (`v1 → v2`) migrates payloads when a new rule pack changes a form.
- Rule-pack changes never mutate existing `test_instance.data`; they create new versions on rebase (§6.9).

### 5.6 Concurrency
Optimistic locking: clients send `If-Match: <row_version>`; server returns `412` on mismatch with the current row; UI shows a field-level merge dialog. Redis advisory locks used only for report generation and rule-pack activation.

### 5.7 Audit hash chain
`hash = SHA256(prev_hash || canonical_json(ts,user,entity,entity_id,action,old,new,reason))`. A nightly job verifies the chain and alerts on break. Chain head is optionally anchored (exported to WORM storage / signed timestamp) weekly.

---

## 6. Rule pack specification (FR-RUL)

### 6.1 Pack contents
```
oiml-r76-2007/
  pack.yaml                 # id, name, version, effective dates, sources, min_engine_version
  classes.yaml              # class limits (n ranges, Min rules), e/d constraints
  mpe.yaml                  # mpe tables (per class), in-service factor, module pi handling
  tests/T1.yaml … T15.yaml  # per-test parameters, applicability, calculators, verdict rules, explanations
  disturbance.yaml          # levels for 12.1–12.7 (dips, burst, surge, ESD, RF, vehicle pulses)
  forms/T1.form.json …      # form definitions (JSON Schema + UI layout)
  checklist/17.1.yaml …     # checklist items (clause, procedure, text, gating)
  validation.yaml           # validator rules
  reportmap.yaml            # ReportView field mapping & section order
  i18n/en.yaml, fr.yaml     # labels
  golden/*.yaml             # test cases embedded with the pack (regression on import)
```

### 6.2 `pack.yaml`
```yaml
id: oiml-r76-2007
version: 1.0.0
title: "OIML R 76-1:2006 / R 76-2:2007 type evaluation"
effective_from: 2026-10-01
min_engine_version: 1.0.0
sources:
  - { doc: "OIML R 76-2:2007", used_for: "report format" }
  - { doc: "OIML R 76-1:2006", used_for: "tests, mpe, criteria" }
in_service_factor: 2          # future use
```

### 6.3 `mpe.yaml`
```yaml
inclusive_upper: true
tables:
  I:    [ {upper_e: 50000, k: 0.5}, {upper_e: 200000, k: 1.0}, {upper_e: null, k: 1.5} ]
  II:   [ {upper_e: 5000,  k: 0.5}, {upper_e: 20000,  k: 1.0}, {upper_e: 100000, k: 1.5} ]
  III:  [ {upper_e: 500,   k: 0.5}, {upper_e: 2000,   k: 1.0}, {upper_e: 10000,  k: 1.5} ]
  IIII: [ {upper_e: 50,    k: 0.5}, {upper_e: 200,    k: 1.0}, {upper_e: 1000,   k: 1.5} ]
clause: "R 76-1 3.5.1 (Table 6)"      # [VERIFY]
load_basis: net_load                   # net = gross − tare
range_basis: e_of_interval_containing_load
```

### 6.4 Test definition (`tests/T3.1.yaml`)
```yaml
code: T3.1
title: {en: "Eccentricity using weights", fr: "Excentration avec des poids"}
clause: "R 76-2 §3.1; R 76-1 A.4.7.1-3"
form: forms/T3.1.form.json
applicable_when: "true"                     # always unless marked NA with reason
params:
  load_fraction_default: 0.3333             # [VERIFY]
  zero_ref: each_measurement
calculators:
  - id: error_rows                          # built-in calculator
    args: { zero_ref: "$params.zero_ref" }
verdict:
  per_row: "abs(Ec) <= mpe"
  test:    "all(row.pass for row in rows if row.kind == 'load')"
explain:
  template: "|Ec| = {abs_Ec} {unit} vs mpe = {mpe} {unit} ({k} e at {load_in_e} e, class {class})"
completeness:
  min_load_rows_expr: "n_locations"         # every declared location must have a load row
```

### 6.5 Applicability rules (`tests/*.yaml` → `applicable_when`)
Expression variables come from `instrument` (class, indication type, flags…).

| Test | Expression (illustrative) |
|---|---|
| T3.2 | `instrument.eccentricity_method == 'rolling'` or `instrument.divided_load_receptor` |
| T4.1.1 | `instrument.self_indicating and instrument.digital` |
| T4.1.2 | `instrument.self_indicating and instrument.analog` |
| T4.1.3, T4.2 | `instrument.non_self_indicating` |
| T6.1 (35 min step) | `instrument.multiple_range` (sub-condition) |
| T7 (sub-tables) | printing/storage: `instrument.printer != 'none' or instrument.storage`; zero-setting: `instrument.zero_setting.semi_auto or …`; tare: `instrument.tare.balancing` |
| T8 (variant) | `instrument.tilt_category` |
| T9 | `instrument.tare_device_present` |
| T11 (sections) | one section per declared `power_supply_categories[]` |
| T12.2b | `instrument.has_io_or_comm_lines` |
| T12.6 | `instrument.has_mains_or_io_cables` |
| T12.5 (range) | `26–2000 MHz` if not T12.6 applicable else `80–2000 MHz` |
| T12.7 | `instrument.road_vehicle_powered` |
| 17.2 | `instrument.direct_sales or instrument.price_computing or instrument.labelling` |
| 17.3 | `instrument.electronic` |
| 17.4 | `instrument.software_controlled` |

### 6.6 Checklist packs
```yaml
section: "17.1"
title: "All types of weighing instruments except non-self-indicating"
items:
  - key: 7.1.1.manufacturer_mark
    clause: "7.1.1"
    procedure: "A.3"
    group: "Descriptive markings – compulsory in all cases"
    text: {en: "Manufacturer's mark or name"}
  - key: 4.4.3.gate
    clause: "4.4.3"
    text: {en: "Extended digital indication"}
    type: existence_gate          # existent / non-existent
    children: [4.4.3.a, 4.4.3.b, 4.4.3.c, 4.4.3.d]
  - key: 4.5.1.overall_effect
    clause: "4.5.1"
    procedure: "A.4.2.1"
    text: {en: "Overall effect of zero-setting / zero-tracking / initial zero-setting"}
    type: numeric_percent
    fields: [zero_setting_pct, zero_tracking_pct, initial_zero_pct]
```
Item types: `check` (passed/failed/na), `existence_gate`, `numeric_percent`, `select`. Gate "non-existent" auto-sets children to `na`.

### 6.7 Expression language (evaluator)
- **Grammar:** Python-expression subset parsed with `ast`, whitelist of nodes: constants, names, attribute/subscript access, unary/binary arithmetic (`+ - * / //`, `%` on Decimals), comparisons, `and/or/not`, ternary, comprehensions over provided iterables.
- **Numeric literal rule:** all numbers parsed as `Decimal` from their source text.
- **Built-in functions:** `abs, min, max, sum, avg, all, any, len, range_of(xs), round_to(x, q), mpe(class, e, net_load), e_of(load), between(x,a,b)`.
- **Denied:** attribute calls, imports, lambdas, dunder access, unbounded loops. Time and memory guards (10 ms / 1 MB per expression).
- **Compile step:** expressions are parsed and type-checked at pack import; unknown names fail the import.

### 6.8 Pack lifecycle
```
Git PR (YAML) → CI: schema validation → compile → run embedded golden cases + repo golden set
   → import to DB as 'draft' → metrologist review (permission rulepack:approve) → 'approved'
   → activate with effective_from → previous pack 'retired' (still used by its reports)
```
- Only one pack per `(name)` is `active` for a given date; report creation pins `rulepack_id`.
- `POST /rulepacks/{id}/activate` requires two-person rule (importer ≠ approver).
- Pack content hash stored in each `generated_report` (reproducibility).

### 6.9 Applying a revised recommendation to existing reports
1. New pack imported and approved.
2. `POST /rulepacks/{new}/recompute-preview?report_ids=…` runs `evaluate_report` in a sandbox transaction, returns per-test verdict diff.
3. A reviewer may **rebase** a report: creates report version *n+1* pinned to the new pack, migrates payloads via upcasters, re-evaluates, requires re-review. Old versions stay intact.

---

## 7. Calculation & compliance engine (`weighreport_engine`)

### 7.1 Public interface
```python
def evaluate_test(pack: CompiledPack, instrument: Instrument, test: TestPayload) -> TestResult
def evaluate_report(pack, instrument, tests, checklist) -> ReportEvaluation
def preview(pack, instrument, test_partial) -> TestResult   # same code path, lenient completeness
def validate(pack, instrument, test_partial, phase: 'entry'|'submit') -> list[Issue]
```
`TestResult` = `{rows: [...computed], verdict, status, explanations: [Explanation], issues: [Issue]}`.

`Explanation`:
```json
{"rule_id":"T3.1.row","clause":"R 76-1 A.4.7.1","inputs":{"I":"5010","dL":"0.5","L":"5000","e":"5","E0":"2.0"},
 "formula":"E = I + e/2 − ΔL − L; Ec = E − E0","values":{"E":"12.0","Ec":"10.0"},
 "limit":{"mpe":"5.0","k":"1.0","load_in_e":"1000","class":"III"},
 "result":"failed","message":"|Ec| = 10.0 g > mpe = 5.0 g (1.0 e at 1000 e, class III)"}
```

### 7.2 Numeric layer
```python
from decimal import Decimal as D, getcontext, localcontext, ROUND_HALF_EVEN
getcontext().prec = 40          # far above any input precision; comparisons exact
MG = {"mg": D(1), "g": D(1000), "kg": D(1_000_000)}
def to_mg(x: str, unit: str) -> D: return D(x) * MG[unit]
def from_mg(x: D, unit: str) -> D: return x / MG[unit]
```
- Display formatting uses `quantize` to the resolution of the smallest `ΔL` present in the test (default `d/10`); comparisons always use unquantised values.
- Instrument-level checks use `Fraction` when dividing to test integrality (`n = Max/e`).

### 7.3 mpe function
```python
def e_of_load(ranges, net_load):                 # multi-interval / multi-range
    for r in ranges:                             # ordered by Max
        if net_load <= r.max_mg: return r.e_mg
    raise LoadAboveMax(net_load)

def mpe_abs(pack, cls, ranges, net_load, pi=D(1), in_service=False):
    if net_load < 0: raise ValueError("negative load")
    e_i = e_of_load(ranges, net_load) if len(ranges) > 1 else ranges[0].e_mg
    m_e = net_load / e_i
    for band in pack.mpe.tables[cls]:
        if band.upper_e is None or m_e <= band.upper_e:      # inclusive upper bound
            k = band.k; break
    else:
        raise LoadOutsideClassTable(cls, m_e)
    factor = pack.in_service_factor if in_service else D(1)
    return MpeResult(abs=k * e_i * pi * factor, k=k, load_in_e=m_e, e_used=e_i, cls=cls)
```
Net load = gross load − tare (T9, tare rows) — the test's `load_basis` decides.

### 7.4 Calculators (built-ins) — inputs, outputs, algorithm

| Calculator id | Used by | Input | Algorithm | Output |
|---|---|---|---|---|
| `error_rows` | T1, T3.1, T3.2, T9, T13a-c, T15a/c, T8 (loaded) | rows: `L, I, ΔL, kind(zero/load), series, dir` | `P = I + e/2 − ΔL`; `E = P − L`; `E0` = error of the governing zero row (`series` or `each_measurement`); `Ec = E − E0`; `mpe = mpe_abs(net L)`; `pass = abs(Ec) ≤ mpe` | per-row `P,E,E0,Ec,mpe,pass` |
| `temp_zero_change` | T2 | rows: `date,time,temp,I,ΔL` | `P`; for consecutive pairs `ΔP=P2−P1`, `ΔT=T2−T1`; `zc = |ΔP| × step/|ΔT|` (step = 5 °C, class I: 1 °C) **[VERIFY]**; `pass = zc < e` | per-pair `ΔP, ΔT, zc, pass` |
| `discrimination_digital` | T4.1.1 | `L,I1,ΔLremoved,I2` | `Δ=I2−I1`; `pass = Δ ≥ d` | `Δ,pass` |
| `discrimination_analog` | T4.1.2 | `L,I1,I2, mpe(L)` | `pass = I2−I1 ≥ 0.7·mpe` | |
| `visible_displacement` | T4.1.3 | flags | pass if all flagged `+` | |
| `sensitivity_displacement` | T4.2 | 3 × mm | threshold by class & Max (1/2/5 mm) | |
| `repeatability` | T5 | 2×10 `I,ΔL` at load `L` | `E_i`; per set `range = Emax−Emin`; `pass_a = all(|E_i| ≤ mpe)`; `pass_b = range ≤ mpe` | per-set stats |
| `zero_return` | T6.1 | `I0,ΔL` at 0, 30 (and 35) min | `P0,P30,P35`; `|P30−P0| ≤ 0.5e`; multi-range: `|P35−P30| ≤ e1` | |
| `creep` | T6.2 | time series | see §7.4.1 | |
| `stability_print` | T7(i) | 5 × (first value, min, max) | `max(|first − min|, |first − max|) ≤ 1e` (only two adjacent values) | |
| `stability_zero_tare` | T7(ii),(iii) | 5 × `I0,ΔL,L0` | `E0 = I0 + e/2 − ΔL − L0`; `pass = |E0| ≤ 0.25e` (all runs) | |
| `tilting` | T8 | 5 positions × {unloaded, L, Max} | `Ev`, `Ecv`; unloaded: `max|E10−Ev0| ≤ 2e` (waived for class II unless direct sales); loaded: `max|Ec1−Ecv| ≤ mpe(L)` | |
| `warmup` | T10 | 4 time points × (unloaded, loaded) | `E0,EL`; `|EL−E0| ≤ mpe(L)` each time | |
| `voltage_limits` | T11 | `Unom,Umin,Umax`, category | reference (avg of Umin/Umax if range), lower/upper limits from pack | limits |
| `disturbance` | T12.x | reference indication, per-row indication, fault flags | see §7.4.2 | |
| `span_stability` | T14 | measurements 1..n × 5 loadings | see §7.4.3 | avg, range, variation, chart series |
| `endurance` | T15 | initial & final error grids | `|Ec_init − Ec_final| ≤ mpe` per load point | |

#### 7.4.1 Creep algorithm
```python
def creep(rows, e, mpe_at_L):
    P = {r.t: r.I + e/2 - r.dL for r in rows}           # t in minutes
    dP = {t: P[t] - P[0] for t in P}
    cond_a = (abs(dP[30]) <= 0.5*e) and (abs(P[30]-P[15]) <= 0.2*e)
    if cond_a: return Result("passed", detail="a", terminated_at=30)
    later = [60,120,180,240]
    if any(t not in P for t in later): return Result("incomplete")
    cond_b = all(abs(dP[t]) <= mpe_at_L for t in [5,15,30]+later)
    return Result("passed" if cond_b else "failed", detail="b")
```
Required time points: 0, 5, 15, 30 min mandatory; 1–4 h required only if condition a) fails.

#### 7.4.2 Disturbance evaluation (T12.1–12.7)
```python
for row in rows:                                  # each disturbance row
    dev = abs(row.I - ref_I)                      # ref_I = indication without disturbance
    if dev <= e: row.result = "passed"
    elif row.fault_handling == "detected_and_acted": row.result, row.flag = "passed", "detected"
    elif row.fault_handling == "not_significant" and row.explanation: row.result, row.flag = "passed", "explained"
    else: row.result = "failed"
```
- Also enforces minimum test parameters from `disturbance.yaml` (e.g. ≥ 10 discharges, ≥ 10 s interval, burst 1 min, dips profile list) → `incomplete` if not satisfied.
- A run is `failed` if any row fails; failing frequency / test point is stored in `row.failure_point`.

#### 7.4.3 Span stability algorithm
```
for each measurement m:
  loadings_needed = 5 if m == 1 else (5 if range_1 > 0.1*e else 1)      # decided by measurement 1
  d_i = EL_i − E0_i  (i over loadings)
  avg_m = mean(d_i)  (+ optional corrections: temperature/pressure, from remarks field)
range_1 = max(d) − min(d) for measurement 1 ; rule: range_1 ≤ 0.1e → single loading allowed
variation_m = avg_m − avg_1
pass = all(|variation_m| ≤ 0.5e)     # [VERIFY]  (diagram limits ±0.5 e shown in form)
chart: x = measurement no., y = avg_m/e with T/D/P markers, limits ±0.5e
```

### 7.5 Verdict aggregation
```python
PRECEDENCE = ["failed", "incomplete", "passed"]           # failed dominates
def test_verdict(t): 
    if t.applicability == "na": return "not_applicable"    # requires na_reason
    ...
def report_verdict(tests, checklist):
    v = [t.verdict for t in tests if t.applicability != "na"] + [c.verdict for c in checklist_sections if c.applicable]
    return "failed" if "failed" in v else "incomplete" if "incomplete" in v else "passed"
```
- Checklist section verdict: any `failed` → failed; any unanswered required item → incomplete; else passed.
- `progress_pct = complete_tests / applicable_tests × 100` (checklist items weighted as one test per section).
- Provisional flag: a report in draft can show `failed` (early warning); only `finalised` reports are official.

### 7.6 Recompute pipeline (FR-CAL-7)
On `PUT/PATCH` of test data or instrument data (single DB transaction):
1. Load pack (cached by id) + instrument + test payload.
2. `validate(... phase='entry')` → issues; block on errors.
3. `evaluate_test` → store `results`, `verdict`, `status`.
4. If instrument data changed → `evaluate_report` (all tests: mpe, `n`, applicability may change).
5. Update `report.verdict`, `progress_pct`, mark `generated_report.stale = true` for that report.
6. Write audit event(s); emit `report.updated` (Redis pub/sub → WebSocket/SSE to open clients).

### 7.7 Validation engine
- Rules from `validation.yaml`: `{id, scope(test/field), when, rule, severity, message{en,fr}, phase}`.
- Phases: `entry` (per field/row), `submit` (completeness, cross-test).
- Issue payload: `{id, severity, path, message, acknowledged?, reason?}`.
- **Warnings** require `POST /issues/{id}/acknowledge` with a reason; stored in `test_instance.results.acknowledged_warnings` and shown to the reviewer.
- Seed catalogue: PRD Appendix B (V-INS-*, V-ENV-*, V-OBS-*, V-Tx-*, V-EQP-*, V-XT-*).

### 7.8 Instrument-level derived checks (`classes.yaml`)
| Check | Implementation |
|---|---|
| `n = Max/e` integral, within class limits | `Fraction(max_mg, e_mg)`; class band from pack |
| `e`,`d` ∈ {1,2,5}×10ᵏ | normalise to mantissa; compare set |
| `d ≤ e`, class I/II `e ≤ 10d` | direct compare |
| Multi-interval consistency | `e1<e2<e3`, `Max1<Max2<Max3`, `n_i = Max_i/e_i` (definition per pack) |
| `Min` per class rule | pack table **[VERIFY]** |

---

## 8. Form engine

### 8.1 Concept
Every test form is defined in `forms/*.form.json`: a JSON-Schema for data + a UI layout descriptor. The SPA has **one generic renderer**; adding/changing a test form requires no frontend release.

### 8.2 Form definition (excerpt, T3.1)
```json
{
  "id": "T3.1", "version": "1.0.0",
  "header": {"blocks": ["standard_header", "env_block:temp,rh,time"], "hide_cells": ["bar_pres"]},
  "sections": [
    {"type": "questions", "fields": [
      {"key": "config.mobile_instrument", "type": "radio", "options": ["yes","no"], "label": "test_on_mobile"},
      {"key": "config.applied_a474", "type": "radio", "when": "config.mobile_instrument=='yes'", "options": ["yes","no"]},
      {"key": "config.description", "type": "textarea", "when": "config.applied_a474=='no'", "required": true}
    ]},
    {"type": "sketch", "key": "data.sketch", "template": "quadrants_1_4", "extras": ["display_location"]},
    {"type": "option_set", "key": "config.azs_state",
     "options": ["non_existent","not_in_operation","out_of_working_range"], "default_from": "instrument.azs_state"},
    {"type": "grid", "key": "data.rows", "row_template": "zero_then_load_per_location",
     "columns": [
       {"key":"loc","type":"int","readonly":true},
       {"key":"L","type":"mass","unit":"instrument","required":true},
       {"key":"I","type":"mass","unit":"instrument","required":true,"step":"d"},
       {"key":"dL","type":"mass","unit":"instrument","min":"0","required":true},
       {"key":"E","type":"mass","computed":true},
       {"key":"Ec","type":"mass","computed":true},
       {"key":"mpe","type":"mass","computed":true}]}
  ],
  "result_panel": {"show": ["verdict","governing_rule","max_abs_Ec","margin"]}
}
```
Field types: `text, textarea, int, decimal, mass, temperature, humidity, pressure, voltage, time, date, radio, checkbox, select, equipment_select, attachment, sketch, grid, chart, computed`.

### 8.3 Grid behaviours
- Row templates (`zero_then_load_per_location`, `ascending_descending_loads`, `time_series`, `runs_1_10`, …) auto-create rows from instrument data (e.g. load-point generator from Min/Max/class change points).
- Paste from Excel (TSV) with per-cell validation; keyboard navigation (Tab/Enter/arrows).
- Computed columns are read-only, populated from the last `results` (or preview response).
- Row-level status icon: green/red/amber with tooltip = explanation message.

### 8.4 Autosave & preview flow
```
keystroke → local state → debounce 800 ms → PATCH /tests/{id}  (If-Match) → server validates+evaluates → 
           response {data, results, verdict, issues, row_version} → grid + result panel update
(for read-only what-if, POST /calc/preview  (no persistence))
```

---

## 9. API specification

### 9.1 Conventions
- Base path `/api/v1`, JSON (UTF-8), OpenAPI 3.1 auto-generated; decimals as strings; times ISO-8601 UTC.
- Auth: `Authorization: Bearer <JWT>` (access 15 min) + refresh token in `HttpOnly; Secure; SameSite=Strict` cookie; OIDC alternative.
- Errors: RFC 7807 `application/problem+json` with `code`, `detail`, `issues[]`.
- Pagination: cursor (`?limit=50&cursor=…`); filters via query params; sorting `sort=-updated_at`.
- Idempotency: `Idempotency-Key` header on `POST /reports/{id}/generate`.
- Rate limits: 300 req/min/user (configurable); 10 generations/min/user.

### 9.2 Endpoint catalogue
| Area | Method & path | Role(s) | Notes |
|---|---|---|---|
| Auth | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/mfa/verify` | any | |
| Users | `GET/POST /users`, `PATCH /users/{id}` | admin | |
| Lab | `GET/PUT /lab` | admin | logo upload via file svc |
| Applications | `GET/POST /applications`, `GET/PATCH /applications/{id}` | admin, engineer | |
| Reports | `POST /reports` (application_id, from_report_id?) | admin, engineer | pins active rule pack |
| | `GET /reports?…filters` | all | dashboard/repository list |
| | `GET /reports/{id}` | all | header + instrument + statuses |
| | `PATCH /reports/{id}/instrument` | admin, engineer | triggers full re-evaluate |
| | `POST /reports/{id}/submit` `/return` `/approve` `/finalise` `/reopen` | per state machine | |
| | `POST /reports/{id}/clone` | admin, engineer | |
| Test plan | `GET /reports/{id}/test-plan` | all | applicability result |
| | `POST /reports/{id}/tests/{code}/mark-na` (reason) | admin, engineer | |
| Tests | `POST /reports/{id}/tests` (code, config) | admin, engineer | new instance |
| | `GET /tests/{tid}` | all | data+results+issues+form schema ref |
| | `PATCH /tests/{tid}` (If-Match) | admin, engineer | autosave |
| | `POST /tests/{tid}/issues/{iid}/acknowledge` | admin, engineer | warning + reason |
| | `POST /calc/preview` | admin, engineer | stateless |
| Checklist | `GET /reports/{id}/checklist`, `PATCH /reports/{id}/checklist/{item_key}` | admin, engineer | |
| Equipment | `GET/POST/PATCH /equipment`, `GET /equipment/expiring?days=30` | admin, engineer (write) | |
| Attachments | `POST /attachments/initiate` → presigned PUT; `POST /attachments/{id}/complete`; `GET /attachments/{id}/download` | admin, engineer (write); all (read) | scan gate |
| Comments | `GET/POST /reports/{id}/comments`, `POST …/{cid}/resolve` | reviewer, engineer | |
| Reports out | `POST /reports/{id}/generate` `{kind, format, lang, watermark?, options}` → `202 {job_id}` | admin, engineer, reviewer | |
| | `GET /jobs/{job_id}`; `GET /reports/{id}/artifacts`; `GET /artifacts/{aid}/download` | all (download of final only for readonly) | |
| | `POST /artifacts/{aid}/sign` | signer | PAdES |
| | `GET /reports/{id}/export.zip` | admin, engineer, reviewer | bundle |
| Dashboard | `GET /dashboard/kpis`, `/dashboard/status-board`, `/dashboard/pass-fail-matrix`, `/dashboard/analytics/*` | per role scope | filters shared with list |
| Search | `GET /search?q=&filters` | all | FTS + trigram |
| Rule packs | `GET /rulepacks`, `POST /rulepacks/import`, `POST /rulepacks/{id}/approve`, `/activate`, `POST /rulepacks/{id}/recompute-preview`, `GET /rulepacks/{a}/diff/{b}` | admin, approver | |
| Audit | `GET /audit?entity=&entity_id=` , `GET /audit/verify` | admin, reviewer, readonly | |
| System | `GET /healthz`, `/readyz`, `/version` | none/ops | |

### 9.3 Example — save eccentricity observation (AT-01)
`PATCH /api/v1/tests/8c1f…`   `If-Match: 6`
```json
{"data":{"rows":[
  {"loc":0,"kind":"zero","L":"0","I":"0","dL":"0.5"},
  {"loc":3,"kind":"load","L":"5000","I":"5010","dL":"0.5"}]}}
```
`200 OK`
```json
{
 "row_version": 7, "status": "in_progress", "verdict": "failed",
 "results": {"rows":[
   {"loc":0,"P":"2.0","E":"2.0","E0":"2.0"},
   {"loc":3,"P":"5012.0","E":"12.0","E0":"2.0","Ec":"10.0","mpe":"5.0","k":"1.0","load_in_e":"1000","pass":false}]},
 "explanations":[{"rule_id":"T3.1.row","message":"|Ec| = 10.0 g > mpe = 5.0 g (1.0 e at 1000 e, class III)"}],
 "issues":[],
 "report":{"verdict":"failed","progress_pct":"4.00","stale_artifacts":2}
}
```

### 9.4 Report state machine
```
draft ──start──► in_progress ──submit──► under_review ──approve──► finalised ──archive──► archived
                       ▲                     │return                    │reopen(amend → new version)
                       └─────────────────────┘                          ▼
                                                                    new draft (version n+1)
```
Guards on `submit`: all applicable tests `status=complete`, no error-level issues, all warnings acknowledged, equipment calibration valid at each test date, no unresolved comments (if enabled). Guard on `finalise`: reviewer ≠ sole author when configured; at least one artifact of each kind generated **after** last data change (not stale).

---

## 10. Report generation pipeline (FR-RPT)

### 10.1 Flow
```
POST /generate → job(id) → Celery task:
  1. Load report, tests, results, checklist, attachments, equipment, lab, pack
  2. Build ReportView (pure function; deterministic)             → JSON + data_hash
  3. If watermark policy (non-final) → set watermark
  4. Render:
        PDF  : Jinja2 HTML/CSS (paged media) → WeasyPrint → (optional PDF/A-2b via pikepdf/ghostscript)
        DOCX : docxtpl over .docx template(s) → post-process (TOC/fields) → python-docx
  5. Charts (span stability, creep, tilt sketch) rendered once (matplotlib SVG → PNG for DOCX, SVG for PDF)
  6. Store to MinIO, insert generated_report (sha256, data_hash, pack, engine version)
  7. Return artifact ids
```

### 10.2 ReportView (single source)
```
ReportView {
  meta{ report_no, version, generated_at, lang, watermark, rulepack{id,version,sha}, engine_version, data_hash }
  lab{...}  instrument{...}  ranges[...]  equipment[...]
  summary{ overall_verdict, rows[ {no, name, page_ref, result, remarks} ], failures[...] }
  tests[ { code, title, clause, header{date,observer,e,resolution,env}, config, tables[...],
           formulas[...], checks[ {label, expr_text, actual, limit, result} ], verdict, remarks, attachments[] } ]
  construction{...}  checklist{ sections[ {id,title,items[ {clause,proc,text,result,remarks} ]} ], counts }
  methodology{ formulas[], mpe_tables[], rounding_policy, rulepack_sources }
  signatures[...]
}
```
Page numbering "Report page n/N" is computed in the render stage (CSS counters / Word fields); the Summary's *Report page* column resolves to page anchors (PDF) or bookmarks (DOCX).

### 10.3 Two report kinds
| Kind | Sections | Target size |
|---|---|---|
| **Detailed** | R 76-2 order: general info, remarks, equipment, summary, tests 1–15, construction, checklist 17.1–17.4, methodology appendix, signatures | 40–150 pages |
| **Summary** | Instrument block, lab block, **test result table** (No., Test, PASSED/FAILED/N/A, key figure & margin, remarks), checklist counts per section, overall verdict banner, failure list with reasons, sign-off | 1–3 pages |

Failure propagation: `verdict=failed` rows use a `.fail` CSS class / Word style `WR_Fail` (red text + shading), a "FAILED" badge and the overall banner; both kinds read the same `results` so they cannot disagree.

### 10.4 Templates
- **HTML/PDF:** `reportkit/templates/pdf/{detailed,summary}.html.j2` + partials per test (`t1.html.j2`, …); CSS `@page` with running header ("OIML R 76-2 Type evaluation report — Application no. — Report page n/N"), footers, bookmarks (`bookmark-level`), table `break-inside: avoid`.
- **DOCX:** `reportkit/templates/docx/{detailed,summary}.docx` built in Word with named styles (`WR_Heading1`, `WR_Table`, `WR_Pass`, `WR_Fail`) and docxtpl tags (`{%tr for r in t.rows %}`); tables are real Word tables; computed numbers are plain text.
- Bilingual (EN/FR): labels from `i18n/*.yaml`; `lang = en | fr | en+fr` (two-line labels).
- Lab customisation: logo, footer text, legal notice via `lab_profile` and template variables.

### 10.5 Consistency & parity controls
- **Data hash** of `ReportView` stored; `stale` set whenever `report`/`test_instance`/`checklist_result` changes after generation.
- **Parity test (CI + runtime option):** extract text from PDF (pdfminer.six) and DOCX (python-docx); assert that all numeric result tokens (E, Ec, mpe, verdicts) present in `ReportView` appear in both outputs.
- DOCX edits are **not** written back (documented in UI); footer contains `data_hash[:8]` so any edited copy can be traced to its source snapshot.

### 10.6 Digital signature (optional, FR-WF-5)
- **PDF:** pyHanko PAdES-B-LT; keys from PKCS#11 HSM / cloud signing / encrypted PFX in vault; visible signature block + timestamp authority (RFC 3161) configurable.
- **DOCX:** signature block (typed name, date, image of signature, hash of the matching signed PDF); no cryptographic lock (limitation documented).
- Signature metadata in `signature` table; `finalise` can require both engineer and reviewer signatures (config).

### 10.7 Performance targets
Detailed (≤ 150 pages incl. 40 photos): ≤ 30 s; Summary: ≤ 10 s. Images resized server-side (max 1600 px long edge, JPEG q=85) before embedding; original preserved in MinIO.

---

## 11. Security architecture

| Topic | Design |
|---|---|
| Authentication | Local: Argon2id password hashes, TOTP MFA (RFC 6238), lockout (5 attempts/15 min); OIDC/SAML through Keycloak optional |
| Session/JWT | Access token 15 min (RS256), refresh 8 h rolling, revocation list in Redis; secure cookies for refresh |
| Authorization | Role + permission checks via FastAPI dependencies (`require(role=…, perm=…)`); object-level checks (report status guards; readonly can download only `finalised` artifacts); policy tests cover the PRD §4.1.1 matrix |
| Input handling | Pydantic v2 strict models; decimal-string regex; HTML-escaped rendering; Jinja2 autoescape; parameterised SQL only |
| File upload | Presigned upload to quarantine bucket → ClamAV → move to clean bucket; magic-byte MIME check; extension allow-list (jpg, png, heic, pdf, docx, xlsx, txt); size limit; EXIF GPS stripping (config) |
| Transport | TLS 1.2+ (HSTS), internal traffic on private network; mTLS optional in Kubernetes |
| Secrets | Env/Secret manager (Docker secrets, Vault, K8s Secrets sealed) — no secrets in images or Git |
| Web hardening | CSP (no inline scripts), CORS allow-list, CSRF protection for cookie endpoints, `X-Content-Type-Options`, `Referrer-Policy` |
| Data at rest | Disk/volume encryption; MinIO SSE; backups encrypted (age/GPG) |
| Audit | Hash-chained `audit_event` (§5.7); read access to reports logged for finalised artifacts |
| Supply chain | Pinned dependencies (lockfiles), SBOM (CycloneDX), Trivy/Grype scans, Dependabot/Renovate |
| Privacy | Minimal PII (user names/emails); retention configurable; export/delete user data procedure |

---

## 12. File service
- Upload flow: `initiate` (validates type/size, returns presigned PUT to `quarantine/`) → client uploads → `complete` (server computes sha256 & enqueues scan) → worker scans → copies to `clean/` → `scan_status='clean'`.
- Download through API-authorised redirect to short-lived presigned GET (≤ 60 s) or streaming for generated artifacts.
- Final artifacts get object-lock/retention tag; deleting is impossible while the report is finalised.
- Thumbnails (WebP 320 px) generated by worker for gallery view.
- Sketch tool stores annotations as JSON (`data.sketch`) and renders SVG for reports; photo annotations composited server-side.

---

## 13. Search, repository & dashboard

### 13.1 Search
- Postgres FTS (`simple` config, unaccented) + `pg_trgm` for partial application no./type designation/serial matching.
- Structured filters translate to indexed predicates (class, `Max`, `e` ranges from `instrument_range`, dates, verdict, status, manufacturer, observer, equipment id via join, failed test code via `test_instance` join).
- `GET /search` returns paged hits with highlights; saved searches stored per user (`saved_filter` table: `id, user_id, name, filter jsonb`).

### 13.2 Repository
`instrument → application → report versions → generated files` implemented via `application` → `report(version)` → `generated_report`; instrument history endpoint `GET /applications/{id}/history` returns versions with verdicts and failed-test summaries; version diff endpoint compares `instrument`, `data`, `results`, `verdict` (JSON diff, decimal-aware).

### 13.3 Dashboard queries
| Widget | Source |
|---|---|
| KPI tiles | `SELECT status, verdict, count(*) FROM report … GROUP BY …` (scoped by role) |
| Status board | `report` joined with `progress_pct`, last updated, reviewer |
| **Pass/Fail matrix** | pivot over `test_instance(test_code, verdict)` per report (max ~40 columns); server returns `{report_id, cells:{T1:'passed',…}}` |
| Top failing tests | `SELECT test_code, count(*) FROM test_instance WHERE verdict='failed' GROUP BY 1 ORDER BY 2 DESC` |
| Pass rate by class/manufacturer | join to `report.instrument` JSON keys (indexed expression) |
| Turnaround | `finalised_at − created_at` (from audit / status history) |
| Calibration alerts | `equipment.cal_valid_until < now() + interval 'N days'` |
| Stale reports | `generated_report.stale` |

At the v1 scale (10 k reports) direct SQL with the indexes above meets < 300 ms p95; a materialised view `mv_report_test_matrix` (refreshed on verdict change via task) is introduced if the matrix exceeds this. All filters listed in PRD FR-DSH-4 are supported through one shared filter schema (`ReportFilter`), used by dashboard, list, search and CSV export.

---

## 14. Infrastructure & deployment

### 14.1 Topology
| Environment | Purpose | Notes |
|---|---|---|
| dev | local developer stack | Docker Compose, seeded golden data |
| ci | ephemeral per pipeline | full stack in containers, Playwright e2e |
| staging | UAT + regression | mirrors prod, anonymised data, pack candidates |
| prod | lab production | on-prem VM(s) or private cloud |

### 14.2 Docker Compose (single-lab reference)
```yaml
services:
  proxy:   { image: nginx:stable, ports: ["443:443"], volumes: [./nginx.conf:/etc/nginx/nginx.conf:ro, ./certs:/certs:ro, web-dist:/usr/share/nginx/html:ro] }
  api:     { image: weighreport/api:${TAG}, env_file: .env, depends_on: [db, redis, minio], healthcheck: {test: ["CMD","curl","-f","http://localhost:8000/healthz"]} }
  worker:  { image: weighreport/worker:${TAG}, env_file: .env, depends_on: [db, redis, minio, clamav] }
  db:      { image: postgres:16, volumes: [pgdata:/var/lib/postgresql/data], env_file: .env }
  redis:   { image: redis:7, command: ["redis-server","--appendonly","yes"] }
  minio:   { image: minio/minio, command: server /data --console-address ":9001", volumes: [miniodata:/data] }
  clamav:  { image: clamav/clamav:stable }
  keycloak: { image: quay.io/keycloak/keycloak, profiles: ["sso"] }
volumes: { pgdata: {}, miniodata: {}, web-dist: {} }
```

### 14.3 Kubernetes (optional)
Helm chart: `api` (2+ replicas, HPA on CPU), `worker` (1–4, HPA on queue length), managed/StatefulSet Postgres (or external), MinIO/S3, Ingress with TLS, NetworkPolicies (api→db/redis/minio only), PodSecurity `restricted`.

### 14.4 Configuration (env)
| Variable | Purpose |
|---|---|
| `DATABASE_URL`, `REDIS_URL`, `S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY/S3_BUCKET_*` | infra |
| `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `ACCESS_TTL`, `REFRESH_TTL` | auth |
| `OIDC_ISSUER`, `OIDC_CLIENT_ID/SECRET` | SSO (optional) |
| `LAB_TIMEZONE`, `DEFAULT_LANG` | localisation |
| `MAX_UPLOAD_MB`, `ALLOWED_MIME` | files |
| `SIGNING_MODE` (`none|pfx|pkcs11|remote`), `SIGNING_KEY_REF`, `TSA_URL` | signatures |
| `REQUIRE_TWO_PERSON_RULEPACK` | governance |
| `REPORT_PDFA` (`true|false`) | PDF/A output |

### 14.5 CI/CD (pipeline stages)
1. Lint/type-check (ruff, mypy strict on `engine`, eslint, tsc)
2. Unit tests (engine ≥ 90 % coverage, api ≥ 80 %)
3. **Rule-pack CI:** schema validation, compile, embedded + repo golden cases (block on any diff)
4. Contract tests (OpenAPI schema vs implementation; frontend types generated from OpenAPI)
5. Integration tests (Postgres/Redis/MinIO containers)
6. Report parity tests (PDF/DOCX text extraction)
7. E2E (Playwright): AT-01…AT-12 scenarios
8. Build images, SBOM, vulnerability scan (block on critical)
9. Deploy to staging; smoke tests; manual approval to prod
10. DB migration job (Alembic) runs before API rollout; backward-compatible migrations (expand → migrate → contract)

### 14.6 Backup, recovery, retention
| Asset | Method | RPO/RTO |
|---|---|---|
| PostgreSQL | nightly base backup + WAL archiving (pgBackRest) | RPO ≤ 15 min, RTO ≤ 4 h |
| MinIO | bucket replication / nightly `mc mirror` to secondary | RPO ≤ 24 h |
| Config & rule packs | Git + DB export | – |
| Restore drill | quarterly, documented | |

---

## 15. Performance, scalability & observability

### 15.1 Budgets
| Operation | p95 target |
|---|---|
| Test PATCH (validate + evaluate + persist) | ≤ 300 ms |
| `/calc/preview` | ≤ 150 ms |
| `evaluate_report` (full, ~40 tests) | ≤ 2 s |
| Report list/search (10 k reports) | ≤ 400 ms |
| Dashboard pass/fail matrix (200 reports) | ≤ 500 ms |
| Detailed PDF / DOCX (≤150 pages) | ≤ 30 s |
| Summary PDF / DOCX | ≤ 10 s |

### 15.2 Scalability
Stateless API; horizontal scaling behind proxy; worker concurrency configurable (default 2 per core; WeasyPrint is CPU heavy); pack cache in-process keyed by `(pack_id, content_sha256)`; DB connection pool via PgBouncer when replicas > 4.

### 15.3 Observability
- **Logging:** structured JSON (`request_id`, `user_id`, `report_id`), no sensitive payloads.
- **Metrics (Prometheus):** request latency/error rate, job durations/failures, queue depth, evaluation duration, validation issues per test, report generation size, DB pool usage.
- **Tracing:** OpenTelemetry (API → worker) with `report_id` attribute.
- **Alerts:** audit chain break, job failure rate > 5 %, queue backlog > 50, DB replication lag, certificate expiry, backup failure.
- **Dashboards:** Grafana (service health, report throughput, engine timings).

---

## 16. Testing strategy (technical)

### 16.1 Levels
| Level | Tools | Focus |
|---|---|---|
| Unit | pytest, Hypothesis | Decimal math, mpe bands (boundary at 500 e etc.), evaluator sandbox, each calculator |
| Rule pack | `rulepack_tools test` | schema, compile, golden cases |
| Integration | pytest + testcontainers | DB, audit chain, file scan, jobs |
| Contract | schemathesis / OpenAPI diff | API stability |
| Report | pytest + pdfminer/python-docx + visual regression (pdf → PNG diff) | parity, layout |
| E2E | Playwright | acceptance tests AT-01…AT-12 |
| Security | ZAP baseline, RBAC matrix tests, dependency scans | |
| Performance | k6 | budgets in §15 |

### 16.2 Golden dataset format
```yaml
id: G-CLASS3-SINGLE-001
description: Class III, e=d=5 g, Max=15 kg, eccentricity fail
instrument: { class: III, ranges: [{e: "5", d: "5", max: "15000", unit: g}], … }
tests:
  T3.1:
    data: { rows: [ {loc: 0, kind: zero, L: "0", I: "0", dL: "0.5"},
                    {loc: 3, kind: load, L: "5000", I: "5010", dL: "0.5"} ] }
expected:
  T3.1:
    rows: [ {loc: 3, E: "12.0", Ec: "10.0", mpe: "5.0", pass: false} ]
    verdict: failed
report: { verdict: failed }
```
Set includes: class I–IIII, multi-interval (mpe uses `e2`), multiple range, module with `pi`, tare (net load basis), each disturbance path, creep a)/b), span stability with 1 vs 5 loadings, boundary loads (exactly at band limits).

### 16.3 Engine property tests (examples)
- `mpe(load)` is non-decreasing with load for each class.
- Scaling invariance: unit conversion (g↔kg↔mg) leaves verdicts unchanged.
- `E` is independent of the unit chosen for display.
- Adding a passing row never turns a `failed` test into `passed`.

---

## 17. Delivery plan (technical work packages)

| WP | Deliverable | PRD phase | Key dependencies |
|---|---|---|---|
| WP-1 | Repo, CI skeleton, Docker Compose, Alembic base schema, auth/RBAC, audit chain | 0/1 | – |
| WP-2 | `engine`: numeric layer, evaluator, mpe, `error_rows`, verdict aggregation | 0 | rule-pack schema |
| WP-3 | Rule-pack tooling (schema, compile, import, golden runner) + pack v1 for T1, T3.1 | 0 | WP-2 |
| WP-4 | Form engine (schema → UI), instrument form, T3.1 form, result panel | 0 | WP-3 |
| WP-5 | `ReportView` + Summary and Detailed templates (PDF + DOCX) for the demo subset | 0 | WP-2 |
| **Milestone M0** | **AT-01 end-to-end demo** | | WP-1..5 |
| WP-6 | Instrument data (all fields), derived checks, equipment register, env block | 1 | WP-4 |
| WP-7 | Calculators + forms: T1, T2, T3.2, T4.x, T5, T6.x, T9, T10 | 1 | WP-2/3/4 |
| WP-8 | Validation engine + catalogue v1, warning acknowledgement | 1 | WP-7 |
| WP-9 | Repository, search, dashboard (KPIs, status board, Pass/Fail tab, filters) | 1 | WP-1 |
| WP-10 | Report Composer (tabbed edit), preview, artifact history, stale logic | 1 | WP-5 |
| **Milestone M1** | **MVP pilot** | | |
| WP-11 | T7, T8, T11, T13, T14 (chart), T15 calculators/forms | 2 | WP-7 |
| WP-12 | Disturbance module T12.1–12.7 + acceptance logic | 2 | WP-7 |
| WP-13 | Checklist engine + packs 17.1–17.4 + construction page | 2 | WP-4 |
| WP-14 | Attachments (scan, thumbnails, sketch tool), embedding in reports | 2 | WP-1 |
| WP-15 | Workflow/review/comments, digital signature, bilingual output, bundle export | 2 | WP-10 |
| WP-16 | Hardening: security tests, performance tests, backup/restore, docs | 2 | all |
| **Milestone M2** | **Full R 76-2 coverage, golden set 100 %** | | |
| WP-17 | Rule editor UI, recompute preview UI, rebase flow | 3 | WP-3 |
| WP-18 | Import from balances/CSV, PWA offline drafts, Pyodide engine option | 3 | |

Indicative team: 1 tech lead/architect, 2 backend, 2 frontend, 1 QA/automation, 0.5 DevOps, 0.5 metrologist (rule-pack owner and reviewer), 0.25 UX.

---

## 18. Technical risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Rule encoded incorrectly | Wrong verdicts | Metrologist review of every pack change; golden sets; explanation records print clause and numbers; two-person activation |
| Divergence between UI preview and stored result | Operator confusion | Preview uses the same engine (ADR-003); UI always re-renders from server response |
| DOCX layout differences vs PDF | Inconsistent look | Separate templates, parity test on **content** not layout; visual regression only on PDF |
| Large photo sets slow generation | Timeouts | Downscale, async jobs, progress reporting, generation time budgets |
| WeasyPrint rendering edge cases (wide tables) | Layout breaks | Table CSS conventions, per-test partial snapshots in CI |
| Form/schema changes breaking old data | Data loss | `form_schema_version` + upcasters + migration tests |
| Concurrent edits | Lost updates | Optimistic locking, merge dialog |
| Digital-signature provider variability | Delay | Signing abstraction (`pfx`, `pkcs11`, `remote`); ship `pfx` first |
| Regulatory variations (national annexes) | Scope creep | Multiple packs + pack inheritance (`extends:`) |

---

## 19. Open technical items (need decisions)

1. **Frontend framework confirmation** (React assumed) and UI component library licence check (AG Grid Community vs Enterprise features).
2. **PDF/A requirement** (yes/no) and target level (2b vs 3b).
3. **Signature model** – provider, certificate type, whether both signatures are mandatory to finalise.
4. **Hosting** – on-prem VM, private cloud, or SaaS; determines Helm vs Compose as the primary artifact.
5. **T2 temperature normalisation**, **T3.1 load fraction/number of loads**, **Min per class** and **span-stability limit convention** — metrologist to fix values in the pack ([VERIFY] markers).
6. **Retention period** for finalised reports and audit logs (default: indefinite).
7. **Localisation** – FR translation ownership and review process for legal terminology.
8. **Import formats** for Phase 3 (balance protocols, CSV templates).

---

## Appendix A — Reference implementation snippets

### A.1 Error row calculator (core of T1/T3.1/T9/T13/T15)
```python
def error_rows(rows, e, ranges, cls, pack, zero_ref, tare=D(0), pi=D(1)):
    out, last_zero = [], None
    for r in sorted(rows, key=lambda x: x.order):
        P = r.I + e/2 - r.dL
        E = P - r.L
        if r.kind == "zero":
            last_zero = E
            out.append({**r.as_dict(), "P": P, "E": E, "E0": E})
            continue
        if last_zero is None:
            out.append({**r.as_dict(), "P": P, "E": E, "issue": "NO_ZERO_REFERENCE"}); continue
        Ec = E - last_zero                       # zero_ref handled by row ordering (series / each_measurement)
        m = mpe_abs(pack, cls, ranges, r.L - tare, pi)
        out.append({**r.as_dict(), "P": P, "E": E, "E0": last_zero, "Ec": Ec,
                    "mpe": m.abs, "k": m.k, "load_in_e": m.load_in_e, "pass": abs(Ec) <= m.abs})
    return out
```
*(For `each_measurement` tests, the form's row template inserts a zero row before every load row; for `series` tests, one zero row precedes a series of ascending/descending loads.)*

### A.2 Expression evaluator skeleton
```python
ALLOWED = (ast.Expression, ast.BoolOp, ast.BinOp, ast.UnaryOp, ast.Compare, ast.IfExp, ast.Call,
           ast.Name, ast.Attribute, ast.Subscript, ast.Constant, ast.List, ast.Tuple, ast.GeneratorExp,
           ast.comprehension, ast.Load, ast.And, ast.Or, ast.Not, ast.Add, ast.Sub, ast.Mult, ast.Div,
           ast.Mod, ast.USub, ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.Eq, ast.NotEq)
SAFE_FUNCS = {"abs": abs, "min": min, "max": max, "sum": sum, "all": all, "any": any, "len": len,
              "avg": lambda xs: sum(xs)/len(xs), "range_of": lambda xs: max(xs)-min(xs), "mpe": mpe_fn, "e_of": e_of_fn}

def compile_expr(src: str):
    tree = ast.parse(src, mode="eval")
    for n in ast.walk(tree):
        if not isinstance(n, ALLOWED): raise RuleCompileError(type(n).__name__)
        if isinstance(n, ast.Call) and not (isinstance(n.func, ast.Name) and n.func.id in SAFE_FUNCS):
            raise RuleCompileError("call not allowed")
        if isinstance(n, ast.Attribute) and n.attr.startswith("_"): raise RuleCompileError("dunder")
    return _to_decimal_literals(tree)      # rewrite numeric Constants to Decimal(str)
```

### A.3 Audit hash chain
```python
def append_audit(conn, ev):
    prev = conn.scalar("SELECT hash FROM audit_event ORDER BY seq DESC LIMIT 1 FOR UPDATE") or b""
    payload = canonical_json(ev)                       # sorted keys, no whitespace, decimals as strings
    h = hashlib.sha256(prev + payload).digest()
    conn.execute(INSERT_AUDIT, {**ev, "prev_hash": prev, "hash": h})
```

### A.4 Worked walkthrough (AT-01) through the stack
1. UI grid edit → debounce → `PATCH /tests/{id}` with rows (zero + location 3).
2. API: authZ (engineer) → optimistic lock check → pydantic decimal parse.
3. Engine: `validate` (I multiple of d ✔, ΔL ≤ d ✔) → `error_rows` → `E0=2.0`, `E=12.0`, `Ec=10.0`, `mpe_abs(III, e=5 g, 5000 g)` → `m_e=1000` → band `≤2000` → `k=1.0` → `5.0 g` → `pass=false`.
4. Verdict rule `all(row.pass …)` → test `failed`; explanation stored.
5. Report aggregate: `failed`; `generated_report.stale=true`; audit event chained.
6. UI re-renders row red; dashboard tile "Failed" increments via SSE.
7. User clicks **Generate → Detailed + Summary → PDF + DOCX** → 4 jobs → `ReportView` shows `summary.rows[T3.1].result=FAILED`, `overall_verdict=FAILED` → artifacts stored with hashes.
8. Engineer corrects `I` to `5005` → `Ec=5.0 g` → `|Ec| ≤ 5.0 g` → pass (boundary inclusive) → report verdict recomputed; previous artifacts flagged stale; regenerate.

## Appendix B — PRD ↔ Engine calculator coverage check

| PRD test | Calculator(s) | Pack params needing metrologist confirmation |
|---|---|---|
| T1, T9, T13, T15 | `error_rows`, `endurance` | mpe table, load-point generator rules |
| T2 | `temp_zero_change` | ΔT normalisation, temperature sequence |
| T3.1 / T3.2 | `error_rows` | load fraction, locations |
| T4.1.x, T4.2 | `discrimination_*`, `visible_displacement`, `sensitivity_displacement` | — |
| T5 | `repeatability` | number of weighings by Max |
| T6.1, T6.2 | `zero_return`, `creep` | — |
| T7 | `stability_print`, `stability_zero_tare` | — |
| T8 | `tilting` | limiting tilt value defaults |
| T10 | `warmup` | — |
| T11 | `voltage_limits` + `error_rows` | supply-limit table by category |
| T12.1–12.7 | `disturbance` | test-level tables (kept as declared in R 76-2 forms) |
| T14 | `span_stability` | limit convention, minimum measurement count/period |
| 16, 17 | checklist engine | — |
