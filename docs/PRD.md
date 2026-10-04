# PRD — NAWI Type Evaluation Report Generator (OIML R 76)

| Item | Value |
|---|---|
| Product name (working) | **WeighReport** — OIML R 76 Test Report Application |
| Document version | 1.0 (draft for review) |
| Date | 29 September 2026 |
| Primary source document | OIML R 76-2:2007(E) *Non-automatic weighing instruments, Part 2: Test report format* |
| Technical source | OIML R 76-1 (Annexes A, B, F, G) – referenced by clause number in R 76-2 |
| Output formats | PDF **and** editable Word (.docx) – each in two variants: **Detailed Report** and **Short Summary Report** |

> **Important note on normative values.** Every threshold, mpe table, test level and applicability rule in this PRD is taken from the R 76-2 form text supplied or from R 76-1 as commonly published. Before go-live, a qualified metrologist must verify each rule against the official R 76-1 text and sign off the initial *Rule Pack* (see §9). Values that are not printed in R 76-2 are marked **[VERIFY]**.

---

## 1. Overview

### 1.1 Problem
Type evaluation of a Non-Automatic Weighing Instrument (NAWI) under OIML R 76 involves ~17 test forms and a ~250-line checklist, with manual calculation of error `E = I + ½e − ΔL − L`, corrected error `Ec = E − E0`, and comparison with an mpe that depends on accuracy class, `e` and load. Labs today fill this in Word/Excel: calculation mistakes, wrong mpe lookups, inconsistent overall verdicts, and slow report assembly are common, and a revised OIML recommendation means re-editing every spreadsheet.

### 1.2 Product vision
A web application in which a test engineer enters raw observations in guided, tabbed forms that mirror the R 76-2 report pages. The system **computes everything (errors, mpe, differences, verdicts) from the recommendation rules – never from operator judgement**, validates data at entry, and produces a complete, standardised report as PDF and Word in detailed and summary forms. Rules live in versioned data files, so a revised recommendation is a rule-pack update, not a code change.

### 1.3 Goals
1. Digital entry forms for **every** test and checklist in R 76-2 (tests 1–15, examination 16, checklist 17.1–17.4).
2. Automatic mpe, error, corrected error and pass/fail determination – operator cannot override a computed verdict.
3. Entry-time validation that catches implausible / out-of-range observations.
4. Report generation: **Detailed** + **Short Summary**, each as **PDF + DOCX**, fully auto-populated, with the failure carried into the overall verdict.
5. Repository organised per instrument with search, plus a **Testing Dashboard** with pass/fail and other filters.
6. Role-based access, audit trail, optional digital signatures.
7. Rule layer separated from code (versioned, effective-dated, testable).

### 1.4 Non-goals (v1)
- Direct acquisition from balances / data loggers (planned as an integration point, §11 Phase 3).
- Verification (routine, R 76-1 in-service) reports – only type evaluation. (Rule pack supports in-service mpe factor for future use.)
- OIML certificate issuing (only the type evaluation report).
- Uncertainty budgeting of the lab's reference weights (only calibration validity tracking).

### 1.5 Personas
| Persona | Needs |
|---|---|
| **Test Engineer** | Fast, tab-based data entry; immediate calculation feedback; no manual mpe lookup; clear "what's still missing". |
| **Reviewer / Technical Manager** | See all raw data and computed results; approve/reject with comments; view diff after edits. |
| **Lab Admin** | Users, roles, lab profile, equipment register, templates, rule packs. |
| **Auditor / Read-only** | Search and view finalised reports, audit trail. |
| **Applicant/Client (optional, external)** | Download final report only (phase 3). |

### 1.6 Success metrics
- ≥ 95 % of test forms completed without operator-calculated fields.
- 0 mismatches between application results and the reference (golden) datasets (§12).
- Report assembly time (data complete → PDF/DOCX) < 30 s (detailed) / < 10 s (summary).
- Time to adopt a revised recommendation: rule-pack change + regression tests, **no application redeploy of code** for parameter/threshold changes.

---

## 2. "Smallest thing that wins the room" — Demo scenario (Phase 0)

**Scenario:** An engineer enters an out-of-tolerance eccentricity observation. The app computes the mpe for that load, marks the test **FAILED**, and regenerates the whole report with the failure propagated to the overall verdict.

**Worked example (hypothetical data, used as acceptance test AT-01):**

| Input | Value |
|---|---|
| Instrument | Class III, `e = d = 5 g`, `Max = 15 kg` → `n = 3000` |
| Eccentricity load `L` (≈ ⅓ Max) | 5000 g = **1000 e** |
| mpe lookup (Class III, 500 e < m ≤ 2000 e) | **±1.0 e = 5 g** |
| Location 1 (zero, before load) | `I0 = 0`, `ΔL0 = 0.5 g` → `E0 = 0 + 2.5 − 0.5 − 0 = 2.0 g` |
| Location 3 | `I = 5010 g`, `ΔL = 0.5 g` → `P = 5010 + 2.5 − 0.5 = 5012.0`, `E = 12.0 g` |
| Corrected error | `Ec = E − E0 = 12.0 − 2.0 = 10.0 g` |
| Check `|Ec| ≤ |mpe|` | 10.0 g > 5 g → **FAILED** |

**Expected system behaviour (all automatic):**
1. Location 3 row turns red; test 3.1 = FAILED with reason "|Ec| = 10.0 g > mpe 5.0 g at 1000 e (Class III)".
2. Summary-of-type-evaluation row 3.1 = FAILED; overall verdict = **FAILED**; dashboard tile moves the report to "Failed".
3. Regenerated Detailed PDF/DOCX show the eccentricity page with the failing row highlighted; Short Summary lists 3.1 as FAILED in the pass/fail table and the overall verdict banner reads FAILED.
4. Editing `I` back to a value within tolerance re-computes, flips verdict to PASSED, and creates an audit-trail entry.

---

## 3. Source-report structure → application modules

The R 76-2 report is the primary structure. Every page below becomes a form/tab and a report section.

| R 76-2 section | Application module | Notes |
|---|---|---|
| General information concerning the type (pp. 6–7) | **Instrument & Application** tab | Includes additional-remarks page |
| Information on test equipment (p. 8) | **Test Equipment** register + per-report selection | Calibration validity checked |
| Summary of type evaluation (p. 9) | **Auto-generated** from test verdicts | Not manually editable |
| 1 Weighing performance | Test form T1 | Repeated per temperature/config; multiple range → separate form per range |
| 2 Temperature effect on no-load | T2 | |
| 3.1 / 3.2 Eccentricity (weights / rolling load) | T3.1, T3.2 | Sketch/location map |
| 4.1.1, 4.1.2, 4.1.3 Discrimination; 4.2 Sensitivity | T4.1.1, T4.1.2, T4.1.3, T4.2 | Applicability by indication type |
| 5 Repeatability | T5 | 2 × 10 weighings |
| 6.1 Zero return; 6.2 Creep | T6.1, T6.2 | Time-series entry |
| 7 Stability of equilibrium | T7 | Three sub-tables |
| 8 Tilting | T8 | 5 positions |
| 9 Tare (weighing test) | T9 | Two tare loads |
| 10 Warm-up time | T10 | 0/5/15/30 min |
| 11 Voltage variations | T11 | Per power-supply category |
| 12.1–12.7 Electrical disturbances | T12.1 … T12.7 | Significant-fault logic |
| 13 Damp heat (a/b/c) | T13a, T13b, T13c | Linked to T1 load set |
| 14 Span stability | T14 | ≥ 8 measurements + chart |
| 15 Endurance (a/b/c) | T15 | Initial / cycles / final |
| 16 Examination of construction | Construction tab | Rich text + photos |
| 17.1–17.4 Checklist | Checklist module | Data-driven items |

Report page numbering ("Report page …/…") is auto-generated.

---

## 4. Functional requirements

Priority: **M** = Must, **S** = Should, **C** = Could.

### 4.1 Authentication, roles, security
| ID | Requirement | P |
|---|---|---|
| FR-AUTH-1 | Username/password login with MFA option; SSO (OIDC/SAML) optional. | M |
| FR-AUTH-2 | Roles: **Admin, Test Engineer, Reviewer, Read-only**. Permission matrix in §4.1.1. | M |
| FR-AUTH-3 | Session timeout, password policy, lockout after failed attempts. | M |
| FR-AUTH-4 | Every create/update/delete/verdict change/report generation/download is written to an immutable audit log (who, when, old → new value, reason). | M |
| FR-AUTH-5 | Optional digital signature of finalised reports (see §4.14). | S |

**4.1.1 Permission matrix**
| Action | Admin | Engineer | Reviewer | Read-only |
|---|:-:|:-:|:-:|:-:|
| Manage users, lab profile, rule packs, templates | ✔ | | | |
| Manage equipment register | ✔ | ✔ | | |
| Create/edit reports & test data (while Draft/In progress) | ✔ | ✔ | | |
| Submit for review | ✔ | ✔ | | |
| Approve / return / finalise | ✔ | | ✔ | |
| Generate report (draft watermark) | ✔ | ✔ | ✔ | |
| Download final report | ✔ | ✔ | ✔ | ✔ |
| View audit trail | ✔ | | ✔ | ✔ |

### 4.2 Instrument & application capture (General information, pp. 6–7)
| ID | Requirement | P |
|---|---|---|
| FR-INS-1 | Capture all fields on the general-information page: Application no., Type designation, Manufacturer, Applicant, Instrument category, **Complete instrument / Module** (+ error fraction `pi`), **Accuracy class** (I, II, III, IIII), **Self-indicating / Semi-self-indicating / Non-self-indicating**, `Min`, `e`, `Max`, `d`, `n`, and up to 3 ranges (`e1..e3`, `Max1..3`, `d1..3`, `n1..3`), `T+`, `T−`, `Unom`, `Umin`, `Umax`, `f`, `Battery Unom`. | M |
| FR-INS-2 | Zero-setting device flags (non-automatic, semi-automatic, automatic zero-setting, initial zero-setting, zero-tracking) and tare device flags (tare balancing, tare weighing, preset tare, subtractive, additive, combined zero/tare); initial zero-setting range (% of Max); temperature range (°C); printer (built-in / connected / not present but connectable / no connection). | M |
| FR-INS-3 | Instrument submitted, identification no., software version, connected equipment, interfaces (number, nature), load cell (manufacturer, type, capacity, number, classification symbol), remarks, evaluation period, date of report, observer. | M |
| FR-INS-4 | **Derived and checked automatically:** `n = Max/e` (and `ni = Maxi/ei`); verify `n` against the class limits from the rule pack; verify `e` and `d` are of the form (1, 2, 5)×10ᵏ; `d ≤ e`; class I/II: `e ≤ 10 d` where applicable; `Min` consistent with class table [VERIFY]. Inconsistencies raise blocking errors. | M |
| FR-INS-5 | Multiple-range / multi-interval instruments: a **separate range record** and separate test forms per range (as required by the R 76-2 introduction), sharing one application. | M |
| FR-INS-6 | Instrument-model library: reuse previously entered manufacturer/model data to pre-fill new applications. | S |
| FR-INS-7 | Free-text "additional remarks" page (p. 7): connection equipment, interfaces, load cells, manufacturer's choice on protection against disturbances (5.1.1 a or b of R 76-1). | M |

### 4.3 Laboratory & environmental conditions
| ID | Requirement | P |
|---|---|---|
| FR-ENV-1 | Every test header records **Date, Observer, `e`, resolution during test (if smaller than `e`)**, and the three-column condition block **At start / At max / At end** for **Temp (°C), Rel. h. (%), Time, Bar. pres. (hPa)**. | M |
| FR-ENV-2 | Barometric pressure is **mandatory** for span stability, for tests where IEC provisions require it, and for **class I**; optional otherwise. Greyed cells in the original form (e.g. tilting, eccentricity) are not required and the UI mirrors that. | M |
| FR-ENV-3 | "Automatic zero-setting and zero-tracking device is: Non-existent / Not in operation / Out of working range / In operation" recorded per test, defaulting from the instrument configuration and restricted to the options allowed for that test in the original form. | M |
| FR-ENV-4 | Lab profile (name, accreditation, address, logo) auto-populates every report header. Test location per report and per measurement (span stability records location). | M |
| FR-ENV-5 | Environmental plausibility checks (see §6): RH 0–100 %, temperature within stated test range, time ordering start ≤ max ≤ end, pressure 800–1100 hPa (warn outside). | M |

### 4.4 Test equipment register (p. 8)
| ID | Requirement | P |
|---|---|---|
| FR-EQP-1 | Register: name, manufacturer, model, serial/ref no., range, accuracy or accuracy class, resolution, calibration certificate no., calibration date, valid-until, traceability body, category (standard weights, temperature/climatic chamber, humidity chamber, AC/DC supply, simulator/module simulator, ESD generator, burst generator, surge generator, dips/interruption generator, RF generator/antenna/CDN/clamp, thermometer, hygrometer, barometer, multimeter, oscilloscope, timer, tilt platform, DAQ). | M |
| FR-EQP-2 | Each report selects the equipment used per test; the system **blocks or warns** if calibration expired on the test date. | M |
| FR-EQP-3 | Field for "description of the procedure of field calibration for the test of immunity to radiated electromagnetic fields" (intro to R 76-2). | M |
| FR-EQP-4 | Warn if the reference-weight accuracy is not adequate vs the instrument (rule: standard uncertainty/error ≤ ⅓ mpe of the loads used **[VERIFY]**). | S |
| FR-EQP-5 | Equipment pages auto-generated in report (short list: name, type, reference number, traceability). | M |

### 4.5 Test configuration & applicability engine
| ID | Requirement | P |
|---|---|---|
| FR-CFG-1 | A **Test Plan wizard** generates the list of applicable tests from the instrument configuration; each test shows *Required / Not applicable (with justification) / Optional*. | M |
| FR-CFG-2 | Applicability rules (rule pack), examples: 3.2 rolling-load eccentricity only for instruments with divided load receptor/rolling loads; 4.1.1 for digital indication; 4.1.2 for analog; 4.1.3 & 4.2 only for non-self-indicating; 6.1 multi-range extra 5-min step only for multiple-range; 7 sub-tables by presence of printing/storage, zero-setting, tare balancing; 8 tilting variant by category (levelling device, tilt sensor, none, mobile); 9 only if a tare device exists; 11 sections per power-supply category; 12.2b only if I/O or communication lines exist; 12.6 only if mains/I-O cables exist; 12.5 frequency range depends on whether 12.6 is performed; 12.7 only for road-vehicle powered instruments; 13 and 14 as specified; 17.x sections by instrument type (direct sales, price-computing, electronic, software-controlled). | M |
| FR-CFG-3 | Marking a test N/A requires a mandatory reason and is shown as "– –" in the summary, exactly as the R 76-2 explanatory notes prescribe. | M |
| FR-CFG-4 | Multiple instances of a test (e.g. T1 at each temperature, damp-heat load sets) with a "Report page" cross-reference used by T2. | M |

### 4.6 Test data entry forms — one tabbed form per test
General behaviour for **all** forms:
- Header block (application no., type designation – auto; date, observer, e, resolution – pre-filled; conditions block).
- Grid-style entry that mirrors the printed form (↓ ascending / ↑ descending columns, `*` zero-reference rows).
- Live computation column-by-column; computed cells are read-only.
- Per-test **Verdict banner** (PASSED / FAILED / INCOMPLETE / N/A) computed by the engine, with the rule and numbers that decided it.
- "Remarks" field per test; "Attachments" (photos/documents) per test.
- Autosave every change; row-level undo; keyboard-friendly (Tab/Enter navigation, paste from Excel).

The complete field, formula and criterion catalogue is in **Appendix A**. Key points per test:

| Test | Key inputs (raw) | Computed | Criterion |
|---|---|---|---|
| **T1 Weighing performance** (A.4.4, A.5.3.1) | Load `L` (↓/↑), indication `I`, additional load `ΔL`; zero rows `*` | `E`, `Ec = E − E0`, mpe(L) | `|Ec| ≤ |mpe|` for every point; flag if initial zero-setting > 20 % Max |
| **T2 Temp effect on no-load** (A.5.3.2) | Report-page ref, date, time, temp, zero `I`, `ΔL` | `P`, `ΔP`, `ΔTemp`, zero-change per 5 °C (class II/III/IIII) or per 1 °C (class I) | zero-change < `e` |
| **T3.1 Eccentricity (weights)** (A.4.7.1-3) | Location 1–4 (sketch), `L`, `I`, `ΔL` | `E`, `Ec`, mpe | `|Ec| ≤ |mpe|` each location |
| **T3.2 Eccentricity (rolling)** (A.4.7.4) | Sections, direction ←/→, locations, `L`, `I`, `ΔL` | `E`, `Ec`, mpe | `|Ec| ≤ |mpe|` |
| **T4.1.1 Discrimination digital** (A.4.8.2) | `L`, `I1`, removed load `ΔL`, extra load = 1.4 d (after adding 1/10 d steps), `I2` | `I2 − I1` | `I2 − I1 ≥ d` |
| **T4.1.2 Discrimination analog** (A.4.8.1) | `L`, `I1`, extra load = |mpe|, `I2` | `I2 − I1` | `≥ 0.7 mpe` |
| **T4.1.3 Non-self-indicating** | `L`, `I`, extra load = 0.4|mpe|, visible displacement (+) | – | displacement visible |
| **T4.2 Sensitivity** (A.4.9) | 3 loads, extra load = |mpe|, permanent displacement (mm) | – | ≥ 1 mm (I, II); ≥ 2 mm (III/IIII, Max ≤ 30 kg); ≥ 5 mm (III/IIII, Max > 30 kg) |
| **T5 Repeatability** (A.4.10) | Two sets of 10 weighings: `I`, `ΔL` | `E`, `Emax − Emin` per set, mpe | (a) `E ≤ mpe`; (b) `Emax − Emin ≤ |mpe|` |
| **T6.1 Zero return** (A.4.11.2) | `L0`, `I0`, `ΔL` at 0 min, 30 min (and 35 min for multi-range) | `P0`, `P30`, `P35` | `|P30 − P0| ≤ 0.5 e`; multi-range `|P35 − P30| ≤ e1` |
| **T6.2 Creep** (A.4.11.1) | Readings at 0, 5, 15, 30 min, 1, 2, 3, 4 h: `L`, `I`, `ΔL` | `P`, `ΔP` vs start | Cond. a) `ΔP30 ≤ 0.5e` **and** `ΔP(15→30) ≤ 0.2e`; else cond. b) `ΔP ≤ |mpe|` over 4 h |
| **T7 Stability of equilibrium** (A.4.12) | Printing/storage (5 runs, min/max values in 5 s); zero-setting (5 runs, `L0 = 10e`); tare balancing (5 runs) | `E0` | 1 e deviation for print/storage; `E0 ≤ 0.25 e` |
| **T8 Tilting** (A.5.1) | Category, limiting tilt value; 5 positions × (unloaded, `L`, Max): `Iv`, `ΔLv` | `Ev`, `Ecv`, max differences | Unloaded `≤ 2e` (not valid for class II unless direct sales); loaded `≤ |mpe|` |
| **T9 Tare** (A.4.6.1) | Two tare loads; `L` ↓/↑, `I`, `ΔL` | `E`, `Ec`, mpe on net load | `|Ec| ≤ |mpe|` |
| **T10 Warm-up** (A.5.2) | Disconnection duration (h); at 0/5/15/30 min: unloaded & loaded `I`, `ΔL` | `E0`, `EL`, `EL − E0` | `|EL − E0| ≤ |mpe|` |
| **T11 Voltage** (A.5.4) | Power-supply category; `Unom/Umin/Umax`; load 10 e at reference, lower, upper limits | limits, `E`, `Ec` | `|Ec| ≤ |mpe|` |
| **T12.1 Dips/interruptions** (B.3.1) | `Utest`; 6 disturbance rows; indication; significant fault Y/N + remarks | `I − I_ref` vs `e` | No significant fault (>e) *or* detected & acted upon |
| **T12.2 Bursts** (B.3.2) | a) L/N/PE, ±polarity, 1 kV, 1 min; b) up to 9 cables/interfaces, 0.5 kV | | as above |
| **T12.3 Surges** (B.3.3) | a) L-N 0.5 kV, L-PE 1 kV, N-PE 1 kV × angles 0/90/180/270 × 3 pos + 3 neg; b) other supplies | | as above |
| **T12.4 ESD** (B.3.4) | Contact 2/4/6 kV, air 8 kV, ±; ≥ 10 discharges, ≥ 10 s interval; indirect HCP/VCP; test-point sketch | | as above; failing test point recorded |
| **T12.5 Radiated RF** (B.3.5) | Freq range 26–2000 or 80–2000 MHz; 10 V/m, 80 % AM 1 kHz; antenna polarisation × facing (front/right/left/rear); sweep rate; load material | | as above; failing frequency recorded |
| **T12.6 Conducted RF** (B.3.6) | 0.15–80 MHz; 10 V emf; up to 10 cables/interfaces | | as above |
| **T12.7 Road vehicle** (B.3.7) | a) 12 V: 2a +50, 2b +10*, 3a −150, 3b +100, 4 −7; 24 V: 2a +50, 2b +20*, 3a −200, 3b +200, 4 −16; b) coupling a/b (12 V: −60/+40; 24 V: −80/+80) | | as above; *2b only if connected via ignition switch |
| **T13 Damp heat** (B.2) | a) initial, b) high temp & 85 % RH, c) final: `L` ↓/↑, `I`, `ΔL` | `E`, `Ec`, mpe | `|Ec| ≤ |mpe|` each stage |
| **T14 Span stability** (B.4) | Zero load, test load, auto span adjustment flag; measurements 1…n each with 5 (or 1) loadings: `I0`, `ΔL0`, `IL`, `ΔL`, corrected value; condition tag (after temp test, damp heat, disconnection, change of location, other) | `E0`, `EL`, `EL − E0`, average, range, 0.1 e test, variation vs 1st measurement | Variation of average error within ±0.5 e [VERIFY] per the diagram limits; plot auto-drawn |
| **T15 Endurance** (A.6) | a) initial error test, b) number of loadings & load, c) final error test | durability error `|Ec initial − Ec final|` | `≤ mpe` |
| **16 Construction** | Description, photos, remarks | – | Examination result recorded |
| **17 Checklist** | Per item: Passed / Failed / N/A + remarks | – | Any Failed → checklist Failed |

**Disturbance-test verdict logic (12.1–12.7).** Per the R 76-2 explanatory notes, faults greater than `e` are **acceptable if detected and acted upon, or if they result from circumstances not considered significant (T.5.5.6 of R 76-1)**. The form therefore records, per row: *Significant fault (> e)?* = **No** / **Yes (see remarks)**. The engine computes `|I − I_without_disturbance|` and:
- ≤ `e` → row PASS automatically.
- > `e` → operator must choose **"Detected and acted upon"** or **"Not significant – explanation required"** (mandatory text) → row PASS with flag; otherwise FAIL.
- The reviewer sees all flagged rows before approval. (Not a single generic "no change allowed" rule.)

### 4.7 Entry-time validation (implausible / out-of-range detection)
| ID | Requirement | P |
|---|---|---|
| FR-VAL-1 | Three severities: **Error** (blocks save/submit), **Warning** (allowed; requires acknowledge + reason, logged), **Info**. | M |
| FR-VAL-2 | Validation runs on field blur and on row commit; also on submit for cross-form checks. | M |
| FR-VAL-3 | Rules are defined in the rule pack (§9), not hard-coded. | M |
| FR-VAL-4 | Catalogue in **Appendix B** (examples: indication not a multiple of `d`; `ΔL` negative or > `d`; `|E| > 10e` warning; load above `Max + T`; ascending series not ascending; non-monotonic time stamps; temperature outside declared range; RH > 100; creep readings missing a required time point; ESD discharge count < 10; repeatability with ≠ 10 weighings per set; `n` inconsistent with class). | M |

### 4.8 Calculation & compliance engine
| ID | Requirement | P |
|---|---|---|
| FR-CAL-1 | All computed values (`P`, `E`, `Ec`, `ΔP`, mpe, differences, averages, ranges, ratios) are computed server-side by a **single calculation library**; the client shows a preview using the same compiled rules (WASM or shared TypeScript). | M |
| FR-CAL-2 | Exact **decimal arithmetic** (no binary floating point); values stored with unit and scale; rounding only at display. | M |
| FR-CAL-3 | mpe is determined **from class, `e` (or `ei` of the range containing the load), and load** – see §7.2; operator cannot type an mpe. | M |
| FR-CAL-4 | Pass/Fail is a pure function of raw data + rule pack version + instrument configuration. Manual verdict override is **not allowed**; only a reviewed *deviation note* can be attached (does not change the verdict). | M |
| FR-CAL-5 | Overall verdict: **FAILED** if any applicable test or checklist item is failed; **INCOMPLETE** while any required test lacks data; **PASSED** only if all applicable tests and checklist items pass. N/A needs justification. | M |
| FR-CAL-6 | Every verdict stores an **explanation record**: rule id, rule pack version, inputs, formula, result, limit. Shown in UI and included in the Detailed Report. | M |
| FR-CAL-7 | Recompute-on-change: editing any raw datum re-evaluates dependent results, test verdict, overall verdict, dashboard status, and marks existing generated reports as **stale**. | M |
| FR-CAL-8 | Modules with error fraction `pi`: mpe scaled by `pi` where applicable. | M |

### 4.9 Checklist module (§17)
| ID | Requirement | P |
|---|---|---|
| FR-CHK-1 | Checklist items are **data**, seeded from R 76-2 pages 50–62 (17.1 all types except non-self-indicating; 17.2 direct sales/price-computing/labelling/mobile; 17.3 electronic; 17.4 software-controlled incl. embedded software, PC/loadable software, software interfaces, software identification, data storage devices). | M |
| FR-CHK-2 | Each item: requirement clause (e.g. 7.1.1), testing-procedure reference (e.g. A.3), text, tri-state result (Passed / Failed / N/A "– –"), remarks. | M |
| FR-CHK-3 | "Existent / Non-existent" gating switches (e.g. span adjustment device, gravity compensation, multiple ranges, preset tare, locking devices, digital printing, memory storage, auxiliary indicating device) auto-set sub-items to N/A when "Non-existent". | M |
| FR-CHK-4 | Numeric fields inside the checklist (e.g. overall effect of zero-setting/zero-tracking/initial zero-setting in % of Max) validated (initial zero-setting typically ≤ 20 % Max; zero-tracking after tare ≤ 4 % Max **[VERIFY]**). | M |
| FR-CHK-5 | Section visibility driven by instrument configuration (e.g. 17.2 only for direct sales / price computing). | M |
| FR-CHK-6 | Bulk "mark section as compliant" with per-item review to speed entry; each change audited. | S |

### 4.10 Attachments
| ID | Requirement | P |
|---|---|---|
| FR-ATT-1 | Attach photos (JPG/PNG/HEIC), PDFs, and documents (DOCX, XLSX, TXT) at report, test, and checklist-item level; caption, category (instrument photo, setup photo, ESD test points, RF set-up, load-cell certificate, manufacturer declaration, etc.). | M |
| FR-ATT-2 | Size limit configurable (default 25 MB/file); virus scan; checksum stored. | M |
| FR-ATT-3 | Images embedded in reports where marked "include in report" (e.g. ESD test-point specification p. 31, RF set-up p. 33, construction page p. 48). | M |
| FR-ATT-4 | Sketch tool for eccentricity locations (1–4 grid, section strip for rolling load), tilt sketch, and clamp position on I/O cables; annotate uploaded photo with numbered points. | S |

### 4.11 Report generation (two reports × two formats)

**Deliverables per report:** 
1. **Detailed Report** — PDF and DOCX
2. **Short Summary Report** — PDF and DOCX

| ID | Requirement | P |
|---|---|---|
| FR-RPT-1 | **Detailed Report** reproduces the R 76-2 layout page by page: general information, test-equipment page, summary of type evaluation, tests 1–15 with all raw tables, computed columns, formulas used, mpe values, verdict per test, remarks, sketches/photos, construction page, checklist 17.1–17.4. Header has "Report page n/N", application no., type designation. | M |
| FR-RPT-2 | **Short Summary Report** (typically 1–3 pages): (a) instrument identification and key metrological data (class, Min, e, Max, d, n, ranges, T, supply, temperature range); (b) lab, observer, evaluation period, date; (c) **tabular Pass/Fail table** of every test with columns *Test no., Test name, Result (PASSED / FAILED / N/A), Key result (e.g. max |Ec|, mpe, margin), Remarks*; (d) checklist summary (counts by section: passed / failed / N/A); (e) overall verdict banner; (f) list of failed items with reasons; (g) sign-off block. | M |
| FR-RPT-3 | **Scientific/mathematical basis shown in reports:** each test section prints the formula (e.g. `E = I + ½e − ΔL − L`, `Ec = E − E0`), the mpe rule applied (class, load in e, multiple of e), and the intermediate numbers; the Detailed Report ends with a "Calculation methodology and rule pack" appendix (rule pack id/version, formulas, rounding policy). | M |
| FR-RPT-4 | Auto-population of lab profile, instrument, equipment, environmental blocks, observer, dates, attachments. | M |
| FR-RPT-5 | **Failure carried through:** failed tests are highlighted (red row/cell, "FAILED" badge), listed in Summary, and set overall verdict to FAILED in both reports and both formats. | M |
| FR-RPT-6 | **PDF:** print-ready A4, embedded fonts, bookmarks per test, page numbers, optional watermark ("DRAFT", "NOT FINAL") for non-final reports, PDF/A option. | M |
| FR-RPT-7 | **DOCX:** fully editable Word document generated from the same data model; real Word tables (not images), styles, headers/footers, editable text/remarks; computed values are plain text so the lab can correct wording. Editing the DOCX does not write back to the database (documented behaviour). | M |
| FR-RPT-8 | **In-app editing before generation:** tab-based "Report Composer" to edit report-level text (cover remarks, additional remarks page 7, construction description, per-test remarks), choose which optional sections/photos are included, language (EN, FR, EN+FR), header/footer. Raw data and verdicts are not editable here. | M |
| FR-RPT-9 | Preview (HTML/PDF) in-app before download; regenerate button; each generation is stored as a **versioned artifact** with hash, rule pack version, timestamp, user. | M |
| FR-RPT-10 | Stale detection: if data changed after generation, the report shows "Out of date – regenerate". | M |
| FR-RPT-11 | Template management: lab logo, footer text, legal notices; templates stored as data + DOCX/HTML templates under version control. | S |
| FR-RPT-12 | Bilingual output (English/French) as OIML permits for MAA use. | S |
| FR-RPT-13 | Batch export (ZIP of both reports, both formats, attachments). | S |

### 4.12 Instrument-wise repository & search
| ID | Requirement | P |
|---|---|---|
| FR-REP-1 | Repository organised **instrument → application/type → report versions → generated files**; instrument page shows test history and previous verdicts. | M |
| FR-REP-2 | Full-text and field search: application no., type designation, manufacturer, applicant, serial/identification no., class, `Max`, `e`, load-cell model, observer, date range, verdict, status, failed test type. | M |
| FR-REP-3 | Saved searches and quick filters; results exportable to CSV. | S |
| FR-REP-4 | Report versions are immutable once finalised; changes create a new version with reason; version compare (raw data diff + verdict diff). | M |
| FR-REP-5 | Retention policy configurable (default: never delete; archive only). | M |
| FR-REP-6 | Clone a report as a starting point for a modified type or re-test after failure. | S |

### 4.13 Testing Dashboard
| ID | Requirement | P |
|---|---|---|
| FR-DSH-1 | **KPI tiles:** total reports, Draft, In progress, Under review, Completed/Finalised, Passed, Failed, Overdue, tests pending. | M |
| FR-DSH-2 | **Status board:** Kanban/list of reports by status with progress bar (% of applicable tests complete). | M |
| FR-DSH-3 | **Pass/Fail view (separate option/tab):** matrix of reports × tests showing PASSED / FAILED / INCOMPLETE / N/A, with drill-down to the failing observation. | M |
| FR-DSH-4 | **Filters** (combinable, saved): Verdict (Passed / Failed / Incomplete), Status, Test type (e.g. only reports where eccentricity failed), Accuracy class, Manufacturer, Applicant, Type designation, Instrument category, Max/e range, Observer/Engineer, Lab/location, date created / evaluation period / date of report, equipment used, calibration expiring, rule pack version, has attachments, stale reports. | M |
| FR-DSH-5 | Analytics: pass rate by test type, top failing tests (Pareto), pass rate by class/manufacturer, turnaround time, workload per engineer, monthly completed. | S |
| FR-DSH-6 | Alerts: calibration expiring in N days, reports stale, reviews waiting > N days, rule pack update available for recompute. | S |
| FR-DSH-7 | Export dashboard tables to CSV/Excel. | S |
| FR-DSH-8 | Role-aware: engineers see own work by default; reviewers see review queue. | M |

### 4.14 Workflow, review, and digital signature
| ID | Requirement | P |
|---|---|---|
| FR-WF-1 | States: **Draft → In progress → Under review → Approved/Finalised → Archived**, plus **Returned** (with comments). Finalised = locked. | M |
| FR-WF-2 | Submit requires: all applicable tests complete, no blocking validation errors, equipment calibration valid, warnings acknowledged. | M |
| FR-WF-3 | Reviewer comments per test/field; unresolved comments block approval. | S |
| FR-WF-4 | Amendment after finalisation creates a new version linked to the old one, with reason and re-review. | M |
| FR-WF-5 | **Digital signature (optional):** engineer and reviewer sign the PDF (PAdES with lab certificate/HSM or cloud-signing provider) and a signature block is added to the DOCX (image + typed name + timestamp; DOCX cannot be cryptographically locked, documented). | S |
| FR-WF-6 | Notifications (in-app, email) for review requests, returns, approvals. | S |

### 4.15 Audit & traceability
| ID | Requirement | P |
|---|---|---|
| FR-AUD-1 | Append-only audit log with hash chaining; includes login, data change (old/new), verdict change, report generation/download, rule pack activation, user/role changes. | M |
| FR-AUD-2 | Each report records the **rule pack version**, application software version, and calculation library version used. | M |
| FR-AUD-3 | Audit export (CSV/PDF) per report. | S |

---

## 5. User experience requirements

1. **Tabbed report workspace.** Left rail: report sections; top: tabs — *Instrument · Equipment · Test Plan · Tests · Checklist · Construction · Attachments · Review · Reports*. Each test is its own sub-tab with a status chip (grey = not started, blue = in progress, green = passed, red = failed, dashed = N/A).
2. **Option-filling, not free typing.** Radio/checkbox/segmented controls for every checkbox on the paper form (class, indication type, zero-tracking state, power-supply category, polarity, etc.); dropdowns for equipment; numeric inputs with units and step = `d`.
3. **Live feedback.** Computed columns update as rows are filled; a right-hand "Result" panel shows the current verdict, the governing rule, and margin to limit.
4. **Guided flow.** "Next incomplete test" button; progress ring; missing-field list on the Review tab; keyboard shortcuts.
5. **Spreadsheet-like grids** with paste-from-Excel and row templates (e.g. "generate standard load points from Min/Max").
6. **Edit report by tabs** (FR-RPT-8) with side-by-side live preview.
7. **Responsive** — usable on a lab tablet; large touch targets; offline-tolerant drafts (phase 2 PWA).
8. **Accessibility** — WCAG 2.1 AA; colour never the only failure cue.
9. **Internationalisation** — EN default, FR labels; unit and decimal-separator settings.
10. Unsaved-change protection, conflict handling (two users editing the same test: last-write-wins prevented; optimistic locking with merge prompt).

---

## 6. Data validation specification (summary; full list in Appendix B)

| Category | Example rule | Severity |
|---|---|---|
| Format | `e`, `d` must be (1, 2, 5)×10ᵏ | Error |
| Consistency | `n = Max/e` integer; `d ≤ e` | Error |
| Resolution | Indication `I` must be a multiple of `d` (class I/II may show finer values via auxiliary device) | Error/Warning |
| Range | Load `L` ≤ `Max` (+ `T` for tare tests); `L ≥ 0` | Error |
| ΔL | `0 ≤ ΔL ≤ d` (typically ≤ 1 d) | Error |
| Plausibility | `|E| > 10 e` → "implausible observation" | Warning |
| Sequence | Ascending series increasing; descending series decreasing; time monotonic | Error |
| Completeness | Creep needs all 8 time points; repeatability needs 10 (or 20); ESD needs ≥ 10 discharges | Error at submit |
| Environmental | RH 0–100 %; temperature within instrument range ±tolerance; time start ≤ end | Error/Warning |
| Equipment | Calibration valid on test date | Error |
| Cross-test | T2 report-page reference must exist; T13c/T15c load points same as initial | Warning |
| Dates | Test date within evaluation period and not in future | Warning |

---

## 7. Calculation methodology

### 7.1 Core formulas (all from the R 76-2 explanatory notes and forms)
| Quantity | Formula | Notes |
|---|---|---|
| Indication prior to rounding (digital) | `P = I + ½e − ΔL` | `ΔL` = additional load to next changeover point |
| Error | `E = I − L` **or** `E = P − L` **or** `E = I + ½e − ΔL − L` | Rounding correction ½e used when `ΔL` was determined |
| Corrected error | `Ec = E − E0` | `E0` = error at or near zero, determined prior to each measurement where the form shows `*` |
| Compliance | `|Ec| ≤ |mpe|` | mpe absolute value |
| Zero-setting/tare error | `E0 = I0 + ½e − ΔL − L0` | T7 |
| Repeatability | `Emax − Emin` per set of 10 | compare with `|mpe|`; also `E ≤ mpe` |
| Zero return | `|P30 − P0| ≤ 0.5e`; `|P35 − P30| ≤ e1` | multi-range |
| Creep | `ΔP = P(t) − P(0)`; cond. a) `ΔP30 ≤ 0.5e` and `|P30 − P15| ≤ 0.2e`; cond. b) `ΔP ≤ |mpe|` over 4 h | Stop at 30 min if a) met |
| Temperature effect | `ΔP = P2 − P1`, `ΔT = T2 − T1`, zero-change per 5 °C = `ΔP × 5/ΔT` (per 1 °C for class I: `ΔP × 1/ΔT`) ; must be `< e` | Linear normalisation to the reference step; document in methodology **[VERIFY]** |
| Tilting | `Ev = Iv + ½e − ΔLv − L`; `Ecv = Ev − Ev0`; unloaded: `|E10 − Ev0|max ≤ 2e`; loaded: `|Ec1 − Ecv|max ≤ |mpe|` | v = 1…5 |
| Warm-up | `EL − E0`, `|EL − E0| ≤ |mpe|` | at each time point |
| Span stability | `EL − E0` per loading; average over loadings; range `(EL−E0)max − (EL−E0)min ≤ 0.1e` decides 1 vs 5 loadings; variation of average vs first measurement plotted within ±0.5 e limit **[VERIFY]** | corrections for temp/pressure noted |
| Endurance | Durability error `= |Ec,initial − Ec,final| ≤ mpe` | |
| Discrimination | digital `I2 − I1 ≥ d`; analog `I2 − I1 ≥ 0.7 mpe` | |
| Class metrics | `n = Max/e` | |

Where the form/recommendation does not define a formula (e.g. for EMC tests) the system applies **only** the defined evaluation method: `|I_disturbed − I_reference| ≤ e` or "detected & acted upon", and states this in the report.

### 7.2 Maximum permissible error (mpe) — computed, not entered
The mpe is expressed in multiples of `e` as a function of the **net load `m`** (for tare tests, net = gross − tare) expressed in verification scale intervals `m/e` (using `ei` of the range in which the load lies for multi-interval/multi-range), and the accuracy class. Seed values (R 76-1 Table 6, initial verification / type evaluation) **[VERIFY against official text]**:

| mpe | Class I | Class II | Class III | Class IIII |
|---|---|---|---|---|
| ±0.5 e | 0 ≤ m ≤ 50 000 e | 0 ≤ m ≤ 5 000 e | 0 ≤ m ≤ 500 e | 0 ≤ m ≤ 50 e |
| ±1.0 e | 50 000 e < m ≤ 200 000 e | 5 000 e < m ≤ 20 000 e | 500 e < m ≤ 2 000 e | 50 e < m ≤ 200 e |
| ±1.5 e | 200 000 e < m | 20 000 e < m ≤ 100 000 e | 2 000 e < m ≤ 10 000 e | 200 e < m ≤ 1 000 e |

Rules:
- Upper boundary **inclusive** (a load of exactly 500 e in class III gets 0.5 e).
- Type evaluation uses the initial-verification mpe; **in-service = 2 ×** (rule pack flag, future use).
- Modules: `mpe × pi` where the module has an error fraction.
- Absolute mpe (mass units) = multiple × `e`; comparison `|Ec| ≤ |mpe|`.
- Special mpe references in individual tests (e.g. 0.5 e, 0.25 e, 0.2 e, 2 e, 1 e, e1) are rule-pack parameters keyed by test id.

### 7.3 Units, rounding, and precision
- Mass units g / kg / mg selectable per instrument; internal canonical unit = mg (integer/decimal). Display in the instrument's unit.
- Errors are shown with the resolution of the smallest additional load used (default: `d/10`); never rounded before comparison.
- Temperature °C, RH %, pressure hPa, voltage V, frequency Hz/MHz, field strength V/m, ESD kV, time s/min/h.
- `e` and `d` are separate fields everywhere; no implicit conversion between them.

---

## 8. Data model (logical)

| Entity | Key attributes |
|---|---|
| `User` | id, name, email, role, status, MFA |
| `Lab` | name, accreditation, address, logo, default language |
| `Manufacturer`, `Applicant` | name, address, contact |
| `InstrumentModel` | type designation, manufacturer, category, class, ranges[], load cell(s), supply, options |
| `Application` | application no., applicant, model, status |
| `Report` | id, application, version, status, verdict, rule_pack_version, evaluation period, dates, observer(s), stale flag |
| `InstrumentRange` | e_i, Max_i, d_i, n_i, Min |
| `TestInstance` | report, test_code (e.g. T3.1), instance no., config (temperature, mode), header block, applicability (required/NA + reason), status, verdict, explanation JSON |
| `Observation` | test_instance, row/col keys, raw value (decimal + unit), computed values JSON |
| `EnvReading` | test_instance, phase (start/max/end), temp, RH, time, pressure |
| `ChecklistItem` (template) / `ChecklistResult` | clause, procedure, text, section, result, remarks |
| `Equipment` | as FR-EQP-1 |
| `TestEquipmentUse` | test_instance ↔ equipment |
| `Attachment` | owner (report/test/item), file, hash, caption, category, include_in_report |
| `GeneratedReport` | report, type (detailed/summary), format (pdf/docx), version, hash, rule_pack_version, generated_by, generated_at |
| `RulePack` | id, name, source references, version, effective_from/to, status (draft/approved/active/retired), approver |
| `AuditEvent` | ts, user, entity, action, old/new, reason, prev_hash, hash |
| `Signature` | report version, signer, method, timestamp, certificate info |

---

## 9. Rule layer (separated from code)

### 9.1 Principle
All recommendation-dependent content is **data** in a **Rule Pack**, versioned and effective-dated:
1. **Parameters and tables** — mpe tables, class limits (n, Min), test levels (ESD 2/4/6/8 kV, burst 1/0.5 kV, RF 10 V/m, dip/interruption profiles, pulse levels), tolerances (0.5e, 0.25e, 0.2e, 2e…).
2. **Rules** — declarative expressions (JSON Logic / CEL-style, sandboxed) for applicability, validation, calculations, and verdicts.
3. **Form definitions** — JSON schema of each test form (fields, grids, labels EN/FR, units, greyed cells).
4. **Checklist items** — clause, text, section, gating.
5. **Report templates mapping** — which data go into which report section.

### 9.2 Requirements
| ID | Requirement | P |
|---|---|---|
| FR-RUL-1 | Rule pack stored outside the application binary (database + Git-managed YAML/JSON source); loaded at runtime. | M |
| FR-RUL-2 | Every report pins to the rule pack version used; old reports remain reproducible. | M |
| FR-RUL-3 | **Rule pack lifecycle:** Draft → automated regression tests → Metrologist review → Approved → Activated with effective date. | M |
| FR-RUL-4 | **Recompute preview:** apply a new pack to existing reports in a sandbox and show verdict differences before adopting. | S |
| FR-RUL-5 | Rule Editor UI (Admin) with schema validation, diff between versions, and test-case runner; direct YAML edit also supported. | S |
| FR-RUL-6 | Rules carry the **source clause reference** (e.g. "R 76-1 A.4.10") that is printed in reports. | M |
| FR-RUL-7 | Code changes required only for genuinely new computation types (new operator/plugin), not for new thresholds, tables, forms or checklist items. | M |

### 9.3 Example rule-pack fragment
```yaml
pack: OIML-R76-2007
version: 1.0.0
effective_from: 2026-10-01
mpe_tables:
  III:
    - { upper_e: 500,   mpe_e: 0.5 }   # inclusive upper bound
    - { upper_e: 2000,  mpe_e: 1.0 }
    - { upper_e: 10000, mpe_e: 1.5 }
tests:
  T3.1:
    clause: "R 76-1 A.4.7"
    load_fraction_of_max: 0.3333      # [VERIFY]
    verdict: "all(abs(Ec) <= mpe(class, e, L))"
  T4.1.1:
    verdict: "(I2 - I1) >= d"
  T6.1:
    verdict:
      - "abs(P30 - P0) <= 0.5 * e"
      - "multi_range ? abs(P35 - P30) <= e1 : true"
validation:
  - id: V-IND-DIGIT
    when: "field == 'I'"
    rule: "I % d == 0"
    severity: error
    message: "Indication must be a multiple of d"
```

---

## 10. Architecture & deployment

### 10.1 Recommended stack
| Layer | Choice (recommended) | Alternative |
|---|---|---|
| Frontend | React + TypeScript, component library (MUI/AntD), AG-Grid/TanStack for grids, i18n | Vue |
| Backend API | Python (FastAPI) or Node (NestJS) – REST + OpenAPI | .NET |
| Calculation library | Isolated package (Python `decimal` / `fractions`) with a TypeScript/WASM mirror for live preview; both tested against the same golden files | |
| Rules engine | YAML/JSON rules + JSON-Logic/CEL evaluator, JSON-Schema form definitions | |
| Database | PostgreSQL (JSONB for form payloads, relational for entities) | |
| File store | S3-compatible (MinIO on-prem) | local disk |
| Report generation | Single data model → **HTML→PDF** (Playwright/WeasyPrint) and **DOCX** via template engine (docxtemplater / python-docx-template); parity tests ensure same numbers in both | LibreOffice headless for DOCX→PDF |
| Auth | OIDC (Keycloak) or built-in local auth + MFA | |
| Jobs | Queue (Celery/BullMQ + Redis) for report generation, virus scan | |
| Observability | Structured logs, metrics, health checks | |

### 10.2 Logical components
```
[Browser SPA] ⇄ [API gateway / Auth]
                   ├─ Instrument & Report service
                   ├─ Test-form service (renders forms from rule pack schemas)
                   ├─ Calculation & Compliance engine  ⇄ [Rule Pack store]
                   ├─ Validation service
                   ├─ Report service (HTML/PDF/DOCX builders) → [Job queue]
                   ├─ Search / Repository service (Postgres FTS or OpenSearch)
                   ├─ Dashboard/analytics queries
                   └─ Audit service
[PostgreSQL]  [Object store]  [Redis]
```

### 10.3 Deployment
- **Primary:** containerised (Docker Compose for single-lab on-prem; Helm chart for Kubernetes) – lab can run fully offline on its LAN.
- Environments: dev, staging (with golden-dataset regression), production.
- Nightly encrypted backups (DB + object store), tested restore; RPO ≤ 24 h, RTO ≤ 4 h.
- TLS everywhere; secrets in vault/env; optional cloud SaaS multi-tenant later.

### 10.4 Technical documentation deliverables
Software architecture document; calculation methodology (formula-by-formula with clause references and worked examples); rule-pack authoring guide; deployment and operations guide; API reference; user manual; validation report (golden-dataset results).

---

## 11. Roadmap

| Phase | Scope | Exit criterion |
|---|---|---|
| **0 – Demo (2–3 weeks)** | Instrument entry (minimal), rule engine core with mpe, **T3.1 eccentricity** form, verdict → summary → overall verdict, Detailed + Summary report in PDF & DOCX, minimal dashboard tile | AT-01 scenario passes end-to-end |
| **1 – MVP** | Auth/RBAC, full instrument form, equipment register, T1, T2, T3, T4, T5, T6, T9, T10 forms, validation catalogue v1, report composer, repository & search, dashboard with pass/fail tab and filters | Pilot lab completes a real type evaluation of a Class III instrument |
| **2 – Full R 76-2** | T7, T8, T11, T12.1–12.7, T13, T14 (chart), T15, construction page, full checklist 17.1–17.4, workflow/review, audit, attachments/sketch tool, bilingual, digital signature | All R 76-2 pages reproducible; golden datasets 100 % |
| **3 – Scale-up** | Rule editor UI, recompute preview, balance/data-logger import (CSV/serial), PWA offline, client portal, analytics, integrations (LIMS/ERP) | Rule pack revision applied without code release |

---

## 12. Quality & acceptance

### 12.1 Test strategy
- **Golden datasets:** ≥ 10 hand-verified instrument datasets (class I–IIII, single/multi-interval, multiple range, module with `pi`) with expected `E`, `Ec`, mpe, verdicts; run in CI for every code or rule change.
- **Property tests:** decimal arithmetic invariants; mpe monotonic with load; boundary loads (e.g. exactly 500e).
- **Report parity tests:** same numbers in DB, UI, PDF, DOCX (automated text extraction comparison).
- **Rule-pack regression:** any new pack must reproduce prior verdicts on golden data except intentional, documented changes.
- **Security testing:** RBAC matrix tests, OWASP ASVS checks, file-upload tests.
- **UAT:** 2 engineers + 1 reviewer per phase using real observations.

### 12.2 Acceptance tests (samples)
| ID | Scenario | Expected |
|---|---|---|
| AT-01 | Eccentricity fail (§2) | Test FAILED, overall FAILED, both reports/formats updated |
| AT-02 | Load exactly at 500 e, Class III | mpe = 0.5 e |
| AT-03 | Multi-interval instrument, load in 2nd interval | mpe uses `e2` |
| AT-04 | Creep: cond. a) met at 30 min | Test passes; later time rows not required |
| AT-05 | Creep: cond. a) fails, cond. b) met over 4 h | Test passes with cond. b) noted |
| AT-06 | Burst: indication deviation 2e, "detected and acted upon" selected | Row PASS with flag; reviewer flag shown |
| AT-07 | Burst: deviation 2e, no explanation | FAILED |
| AT-08 | Edit a raw value in a finalised report | Blocked; amendment creates version 2 |
| AT-09 | Calibration expired on test date | Blocked at submit |
| AT-10 | New rule pack changes a threshold | Recompute preview shows affected reports; old reports unchanged |
| AT-11 | Dashboard filter Verdict = Failed + Test = Eccentricity + Class = III | Only matching reports listed |
| AT-12 | Short Summary | Table lists all tests with PASSED/FAILED/N/A, matches Detailed Report verdicts |

---

## 13. Non-functional requirements
| Area | Requirement |
|---|---|
| Performance | Form save < 300 ms; recompute of a full report < 2 s; PDF Detailed ≤ 30 s (≤ 150 pages incl. photos) |
| Scalability | 50 concurrent users; 10 000 reports; 100 GB attachments (v1 target) |
| Availability | 99.5 % in business hours (on-prem best effort) |
| Security | RBAC, MFA, TLS 1.2+, encrypted backups, password hashing (Argon2/bcrypt), input sanitisation, upload scanning |
| Integrity | Immutable finalised reports, hash-chained audit, generated-artifact hashes |
| Compliance | Supports ISO/IEC 17025 record-keeping (traceability, authorised review, retention) |
| Usability | New engineer productive after ≤ 2 h training; WCAG 2.1 AA |
| Maintainability | ≥ 80 % unit-test coverage on calculation/rules; documented plug-in points |
| Portability | Browser: latest 2 versions of Chrome, Edge, Firefox, Safari; tablet supported |

---

## 14. Risks, assumptions, open questions

### 14.1 Risks
| Risk | Mitigation |
|---|---|
| Misinterpretation of an R 76-1 rule encoded in the pack | Metrologist sign-off; golden datasets; source clause printed in reports |
| Word-editable report diverges from database | Explicit "export snapshot" behaviour; footer states generation timestamp and hash |
| Different national/regional variations of R 76 (e.g. EN 45501, national regs) | Multiple rule packs selectable per application |
| Very large reports (photos) slow to generate | Async jobs, image compression |
| Operators bypassing validation | Warning acknowledgement with mandatory reason and reviewer visibility |

### 14.2 Assumptions
- Instrument is evaluated per R 76-1/R 76-2 (2007); newer editions ship as a new rule pack.
- One lab per installation in v1 (multi-tenant later).
- Observations are entered manually in v1.

### 14.3 Open questions for stakeholders
1. Must the application also support in-service/initial verification reports (mpe × 2)?
2. Which digital-signature provider/certificate type is mandatory (PAdES with HSM, Aadhaar eSign, DSC token, none)?
3. Are national annexes required (e.g. additional national tests or marking checks)?
4. Do you need the DOCX to be re-importable (round-trip), or is export-only acceptable?
5. Preferred deployment: on-prem lab server, private cloud, or SaaS?
6. Exact target for zero-change normalisation in T2 when the temperature step ≠ 5 °C — confirm with the metrologist.
7. Eccentricity load fraction and number of loads per instrument type (⅓ Max vs 1/(n−1) Max) — confirm A.4.7 handling for the rule pack.

---

## Appendix A — Test catalogue (field-level)

*(Common to all tests: Application no., Type designation, Date, Observer, `e`, resolution during test, conditions At start / At max / At end — Temp, Rel. h., Time, Bar. pres.; Passed / Failed; Remarks.)*

**T1 Weighing performance (A.4.4, A.5.3.1)**
- Config: automatic zero-setting/tracking = Non-existent / Not in operation / Out of working range / In operation; initial zero-setting > 20 % of Max? Yes/No.
- Rows: load points ↓ (ascending) and ↑ (descending): `L`, `I`, `ΔL`; zero rows (`*`) before/after; computed `E`, `Ec`, mpe.
- Load-point generator: Min (or near zero), ≈ ¼, ½, ¾ of Max, Max, and loads at/around mpe change points (500e, 2000e … per class), descending mirror.
- Result: all `|Ec| ≤ |mpe|`.

**T2 Temperature effect on no-load (A.5.3.2)**
- Rows: report page ref (T1 page when combined), date, time, temp, zero `I`, `ΔL`; computed `P`, `ΔP`, `ΔTemp`, zero-change per 5 °C (or 1 °C, class I).
- Temperatures: reference (20 °C), high, low, back to reference (and 5 °C if low limit is ≤ 5 °C) **[VERIFY]**.
- Result: each zero-change < `e`.

**T3.1 Eccentricity (weights)** — question set: Test on mobile instrument (A.4.7.5) Yes/No; if Yes, A.4.7 & A.4.7.1–A.4.7.4 applied Yes/No; if No, description in remarks. Sketch with numbered locations (default 4-quadrant 1–4, adjustable for e.g. more supports) + display location. Rows per location: zero row `*`, then `L`, `I`, `ΔL`, `E`, `Ec`, mpe.

**T3.2 Eccentricity (rolling load)** — number of sections or undivided receptor; sketch (1-2-3 strip); per section: direction (← / →), 4 locations, `L`, `I`, `ΔL`, `E`, `Ec`, mpe.

**T4.1.1** `L`, `I1`, removed load `ΔL`, add 1/10 d steps, extra load 1.4 d, `I2`, `I2 − I1`; **T4.1.2** `L`, `I1`, extra load |mpe|, `I2`; **T4.1.3** `L`, `I`, extra load 0.4|mpe|, visible displacement (+); **T4.2** three loads `L`, extra load |mpe|, permanent displacement in mm; threshold by class and Max.

**T5 Repeatability** — automatic zero: Non-existent / In operation; load (weighing 1–10 and 11–20): per weighing `I`, `ΔL`, `E`; `Emax − Emin`, mpe for each set; checks (a) `E ≤ mpe` (R 76-1 3.6) and (b) `Emax − Emin ≤ |mpe|` (3.6.1).

**T6.1 Zero return** — `L0`, `I0`, `ΔL` at 0 min and 30 min (after "load during 30 min = …"); multi-range: additional 35 min reading; `P0`, `P30`, `P35`, differences.

**T6.2 Creep** — time points 0, 5, 15, 30 min, 1, 2, 3, 4 h; `L`, `I`, `ΔL`, `P`, `ΔP` (vs 0 min). Auto-stop after 30 min if condition a) met; otherwise continue and evaluate b).

**T7 Stability of equilibrium** — (i) printing/storage: 5 runs, load ≈ 50 % Max, first printed/stored value vs min/max readings during 5 s; (ii) zero-setting: 5 runs, zero-load < 4 % Max, `L0 = 10e`, `I0`, `ΔL`, `E0`; (iii) tare balancing: 5 runs, tare load ≈ 30 % Max, `L0 = 10e`, `I0`, `ΔL`, `E0`. Checks: print/store within 1 e (only two adjacent values allowed); `E0 ≤ 0.25 e`.

**T8 Tilting** — category (levelling device+indicator / automatic tilt sensor / none / mobile with tilt sensor / mobile with cardanic suspension); limiting value of tilting; sketch; positions 1 (reference) and 2–5 (tilted); unloaded row `Iv`, `ΔLv`, `Ev0`; load `L` (declared) and Max rows `Iv`, `ΔLv`, `Ev`, `Ecv`, mpe; results `|E10 − Ev0|max`, `|Ec1 − Ecv|max`.

**T9 Tare** — same grid as T1 with first and second tare load (`*` zero rows), mpe on net load.

**T10 Warm-up** — duration of disconnection before test (h); time counted from first appearance of indication; 0/5/15/30 min × (unloaded, loaded): `L`, `I`, `ΔL`, `E`; `EL − E0`; mpe.

**T11 Voltage** — power-supply categories: mains AC (A.5.4.1); external/plug-in AC or DC (A.5.4.2); rechargeable battery with charge during operation possible (A.5.4.2); battery without charge during operation (A.5.4.3); 12/24 V road vehicle (A.5.4.4); `Unom`, `Umin`, `Umax` (reference = average if a range is marked); for each category rows Reference / Lower / Upper (load `10 e`): `U`, `L`, `I`, `ΔL`, `E`, `Ec`, mpe. Limits from rule pack (AC mains: −15 % / +10 %; batteries: to manufacturer's lower end-point; 12 V/24 V vehicle per A.5.4.4) **[VERIFY]**.

**T12.1 Dips** — `Unom/Umin/Umax`, `Utest`; rows: without disturbance; 0 % × 0.5 cycle; 0 % × 1; 40 % × 10; 70 % × 25; 80 % × 250; 0 % × 250; ≥ 10 disturbances, ≥ 10 s interval; indication; fault Y/N.

**T12.2 Bursts** — a) 1 kV on L, N, PE (to ground), positive/negative, 1 min each; b) 0.5 kV on each I/O or communication cable/interface (up to 9), ±, 1 min; clamp location sketch.

**T12.3 Surges** — a) AC mains: L→N 0.5 kV, L→PE 1 kV, N→PE 1 kV; angles 0°, 90°, 180°, 270°; 3 positive + 3 negative; b) other supply (DC/other): L-N 0.5 kV, L-PE 1 kV, N-PE 1 kV, kind/voltage of supply.

**T12.4 ESD** — a) direct: contact (paint penetration) 2/4/6 kV, air 8 kV, positive and negative, ≥ 10 discharges, ≥ 10 s; b) indirect: HCP and VCP 2/4/6 kV; test-point specification page (photos/sketches).

**T12.5 Radiated RF** — frequency range option, sweep rate, load material, 10 V/m, 80 % AM 1 kHz; antenna polarisation vertical/horizontal × facing front/right/left/rear (for each frequency block); set-up page (photos/sketches); failing frequency recorded.

**T12.6 Conducted RF** — sweep rate, load & material, 0.15–80 MHz, 10 V emf (50 Ω), 80 % AM 1 kHz; up to 10 cable/interface rows.

**T12.7 Road vehicle** — 12 V and 24 V tables as in §4.6; capacitive/inductive coupling a/b with kind of lines.

**T13 Damp heat** — a) initial (reference temp), b) high temp & 85 % RH, c) final (reference temp): T1-style grid with mpe.

**T14 Span stability** — `e`, resolution, zero/test load, auto span adjustment existent?; measurement 1 (5 loadings) then subsequent measurements (tag: after temperature test / damp heat / disconnection / change of location / other), auto-span activated?, `I0`, `ΔL0`, `E0`, `IL`, `ΔL`, `EL`, `EL − E0`, corrected value; average error; range vs 0.1e; chart of average error vs measurement number with T/D/P markers and ±limits; unlimited additional measurement pages.

**T15 Endurance** — a) initial test (T1-style), b) number of loadings and load applied, c) final test with durability error `|Ec initial − Ec final|` and mpe.

**T16 Examination of construction** — description, picture of complete instrument, main components, remarks useful for verification authorities, manufacturer references.

## Appendix B — Validation rule catalogue (seed)

| ID | Rule | Sev |
|---|---|---|
| V-INS-01 | `e`, `d` ∈ {1,2,5}×10ᵏ | E |
| V-INS-02 | `n = Max/e` integer, within class limits | E |
| V-INS-03 | `d ≤ e`; for class I/II `e ≤ 10d` where applicable | E |
| V-INS-04 | Multi-interval: `Max_i` increasing, `e_i` increasing, `n_i` limits | E |
| V-INS-05 | `Umin ≤ Unom ≤ Umax`; `f` ∈ {50, 60} or declared | W |
| V-ENV-01 | 0 ≤ RH ≤ 100; temp within −40…+80 °C; pressure 800–1100 hPa | E/W |
| V-ENV-02 | start ≤ max ≤ end (time) | E |
| V-ENV-03 | Class I → pressure mandatory | E |
| V-OBS-01 | `I` multiple of `d` | E |
| V-OBS-02 | `0 ≤ ΔL ≤ d` (rule-pack parameter) | E |
| V-OBS-03 | `L ≤ Max (+T)`, `L ≥ 0` | E |
| V-OBS-04 | `|E| > 10 e` | W |
| V-OBS-05 | Ascending/descending order of loads | E |
| V-OBS-06 | Zero row present before each loaded series where `*` is required | E |
| V-T5-01 | 10 weighings per set (20 if required) | E@submit |
| V-T6-01 | Creep time points complete (0,5,15,30 min; 1–4 h if cond. a) not met) | E@submit |
| V-T12-01 | ESD discharges ≥ 10, interval ≥ 10 s; burst duration ≥ 1 min | E |
| V-T12-02 | "Yes (see remarks)" requires remarks text | E |
| V-T14-01 | ≥ 8 measurements over the required period **[VERIFY]** | W@submit |
| V-EQP-01 | Calibration valid on test date | E |
| V-XT-01 | T2 report-page reference exists | W |
| V-XT-02 | T13c/T15c load points match initial test | W |

## Appendix C — Report layout summary

**Detailed Report (per R 76-2 order):** Cover/general information → additional remarks → test equipment → summary of type evaluation → tests 1–15 (each with raw tables, computed columns, formulas, mpe, verdict, remarks, attachments) → examination of construction → checklist 17.1–17.4 → calculation methodology & rule-pack appendix → signature page.

**Short Summary Report:** Instrument & lab block → **Test result table** (Test no. | Test | PASSED | FAILED | N/A | Key result & margin | Remarks) → checklist summary → overall verdict → list of failures with reasons → sign-off.

Both are produced as **PDF** and **Word (.docx)** from the same data model, and both reflect failures automatically.
