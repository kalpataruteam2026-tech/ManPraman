# SIH26035 — Autonomous Test Report Generation System for Non-Automatic Weighing Instruments (NAWI) as per OIML R-76 & Legal Metrology Act

---

## Document Control & Project Identity

| Attribute | Details |
| :--- | :--- |
| **Problem Statement ID** | **SIH26035** (Smart India Hackathon 2026) |
| **Problem Statement Title** | Development of a Software Program/Application for Generation of Test Reports for Non-Automatic Weighing Instruments (NAWI) as per OIML Recommendation R-76 |
| **Ministry / Department** | Ministry of Consumer Affairs, Food & Public Distribution — Department of Consumer Affairs (Legal Metrology Division) |
| **Category** | Software / National Regulatory & Trade Metrology |
| **Primary International Standard** | **OIML R 76-1:2006** (Requirements & Tests), **OIML R 76-2:2007** (Test Report Format), OIML-CS Guidelines |
| **Primary Indian Statutory Acts & Rules**| - The Legal Metrology Act, 2009 (Act 1 of 2010)<br>- Legal Metrology (General) Rules, 2011 — **Seventh Schedule (Heading-A)**<br>- Legal Metrology (Approval of Models) Rules, 2011 & 2019 Amendment<br>- Legal Metrology (General) Fourth Amendment Rules, 2026 (G.S.R. 568(E))<br>- Jan Vishwas (Amendment of Provisions) Act, 2023 & 2026 Reforms |
| **Target User Base** | Legal Metrology Officers (Inspectors/Controllers), Regional Reference Standard Laboratories (RRSLs), National Physical Laboratory (NPL), Government Approved Test Centres (GATC), Weighing Instrument Manufacturers & Importers |

---

## 1. Executive Summary & Problem Context

In commerce, industry, agriculture, and healthcare, non-automatic weighing instruments (NAWIs)—ranging from sub-milligram analytical balances to 120-tonne multi-axle weighbridges—govern billions of dollars in daily transactions and critical quality decisions. A "Non-Automatic Weighing Instrument" requires the direct intervention of an operator during the weighing process to deposit or remove loads and to observe the indication.

### The Problem
Presently across Indian states and testing laboratories:
1. **Manual Data Entry & Calculations**: Inspectors and laboratory personnel manually record weighing values on paper sheets and calculate turning points, net values, and corrected errors using handheld calculators.
2. **Calculation Errors & Rounding Mismatches**: Determining true indication $P = I + \frac{1}{2}e - \Delta L$ and Maximum Permissible Error (MPE) thresholds at varying loads is mathematical and error-prone.
3. **Absence of Unified Standardization**: Standardized OIML R 76-2 multi-page test reports are rarely compiled comprehensively due to the manual labor involved, resulting in abbreviated summaries lacking legal reproducibility.
4. **Lack of Tamper-Resistance & Traceability**: Paper-based and unsecured spreadsheet reports are susceptible to retrospective tampering, lacks cryptographic verification, and cannot be cross-referenced with national databases in real-time.
5. **Slow Turnaround**: Compiling pattern evaluation reports (often 40 to 100 pages long) takes days or weeks, causing massive backlogs in Model Approval and verification certifications.

### The Objective
To build a state-of-the-art, future-ready, cross-platform digital application that guides inspectors and test engineers through the end-to-end verification and pattern evaluation lifecycle of NAWIs, automatically performs complex metrological computations, plots dynamic error curves against statutory MPE envelopes, and generates tamper-evident, cryptographically verifiable, standardized PDF test reports conforming strictly to OIML R-76 and the Seventh Schedule of the Legal Metrology (General) Rules.

---

## 2. Year-Wise Evolution of OIML Rules & Indian Legal Metrology Regulations

To build an architecture that is not only compliant with historical standards but also **future-ready** for upcoming revisions (OIML R 76 3rd/4th editions and ongoing Legal Metrology digitizations), the following timeline highlights how rules, tolerances, and procedures have evolved.

```
1992 ────► 2006/2007 ────► 2009/2011 ────► 2013-2019 ────► 2021-2023 ────► 2025-2026 ────► Future 2026+
OIML R 76    OIML R 76-1    India LM Act   GATC Rules &   Jan Vishwas,    4th Amendment   IoT Weighing,
Basic Mech   Electronic,    & Gen Rules    Model Approval Digital Records (GSR 568(E)),   Cryptographic
& Classes    EMC, Software  7th Schedule   Amendments     & QR Codes      Weight Sub.     Audit Trails
```

### Chronological Evolution Matrix

| Era / Year | Regulatory Document | Key Additions / Modifications | Impact on Software Architecture |
| :--- | :--- | :--- | :--- |
| **1992** | **OIML R 76 (1992 Edition)** | Established the 4 Accuracy Classes (Class I, II, III, IV). Defined Verification Scale Interval ($e$), Actual Interval ($d$), and classical 3-step MPE tiers ($0.5e, 1.0e, 1.5e$). | Foundational class calculation logic and load step partitioning. |
| **2006** | **OIML R 76-1:2006 (Requirements)** | **Electronic & Software Revolution**:<br>• Formalized software validation (Clause 5.5): separation of legal software, cryptographic software ID, event loggers.<br>• Comprehensive Disturbance tests (ESD, RF immunity, surge, voltage dips).<br>• Multi-interval and multiple range rules.<br>• Modular evaluation (load cells under R 60, indicator under R 76). | Engine must store software hash (SHA-256), firmware version, event counter, and distinguish single vs multi-interval instruments. |
| **2007** | **OIML R 76-2:2007 (Format)** | Standardized international Pattern Evaluation / Test Report Format (100+ pages of standardized checklist, data tables, and environmental logs). | Defines exact structural hierarchy of comprehensive laboratory type approval report. |
| **2009–2011** | **The Legal Metrology Act, 2009** & **General Rules, 2011** | India replaced the 1976 & 1985 Acts. Transposed OIML R 76 into the **Seventh Schedule (Heading A)**. Made Type Approval mandatory via **Approval of Models Rules, 2011**. | Application must support statutory Indian terminology (Seventh Schedule Part I/II, Form LM-1, etc.). |
| **2013–2019** | **GATC Rules & 2019 Model Approval Amendment** | Introduced Government Approved Test Centres (GATC) to scale testing capacity. Defined 2019 timelines, fee models, and authorized regional reference laboratories (RRSLs). | Multi-tenant role management (State LM Officers vs GATC private engineers vs Central RRSL scientists). |
| **2021** | **LM General Amendment (GSR 149(E))** | Mandatory digital register maintenance, inter-state movement of verified instruments, tamper-proof security seals (holographic/lead). | Unique Machine ID tracking and physical seal register integration. |
| **2023** | **Jan Vishwas (Amendment) Act (Act 18/2023)** | Decriminalization of minor technical measurement and non-compliance offenses. Transitioned criminal prosecutions into monetary compounding and civil penalties by Adjudicating Officers. | Automated compliance scoring; flagging critical metrological failure vs non-critical administrative defect. |
| **2025** | **General Rules 7th Amendment (GSR 905(E), Dec 2025)** | Extended verification periodicity to **24 months (2 years)** for specific physical measures, beam scales, counter machines, and fuel dispensers. Electronic NAWIs remain on strict 12-month inspection or risk-based cycles. | Dynamic recalibration alert scheduling based on instrument class and latest gazette periodicity rules. |
| **2026** | **General Rules 3rd Amendment (GSR 175(E), Mar 2026)** | Omission of obsolete rules (rules 16, 21, and 21A) to streamline regulatory compliance. | Cleansed workflow eliminating discontinued statutory declarations. |
| **2026** | **General Rules 4th Amendment (GSR 568(E), July 3, 2026)** | **Crucial Technical Amendment on Substitution of Standard Weights**:<br>Amended Seventh Schedule, Heading-A, Part II, paragraph 9(2)(ii):<br>• Regular substitution: at least 50% standard weights.<br>• **If Repeatability Error $\le 0.3e$**: standard weight portion reduced to **one-third ($33.\bar{3}\% Max$)**.<br>• **If Repeatability Error $\le 0.2e$**: standard weight portion reduced to **one-fifth ($20\% Max$)**.<br>• Repeatability determined with 3 consecutive placings.<br>• Revised verification fee schedules (Twelfth Schedule Sl. 2: Rs. 5,000 to Rs. 50,000). | **Active Algorithm Requirement**: Software automatically calculates repeatability error from 3 runs and informs the field inspector of the exact standard weight tonnage needed for substitution! |
| **Future (2026+)** | **OIML R 76 Revision (Draft 4-Part Structure) & IoT** | Splitting into R 76-1 (Requirements), R 76-2 (Procedures), R 76-3 (Test Report), R 76-4 (Type Evaluation). Cloud-connected weighing systems, Over-The-Air (OTA) legally relevant software updates, continuous health self-monitoring. | Modern, decoupled data model supporting future IoT payload ingestion and zero-trust cryptographic audit trails. |

---

## 3. What the Project Wants as User Inputs

To generate an official OIML R-76 test report, the software must intake data across three distinct tiers: **Administrative / Metadata**, **Instrument Specifications**, and **Empirical Test Observations**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER INPUT TIERS                                │
├─────────────────────────┬──────────────────────┬───────────────────────┤
│ 1. Administrative       │ 2. Instrument Specs  │ 3. Test Observations  │
│ • Applicant / Lab info  │ • Class (I to IV)    │ • Zero & Tare Tests   │
│ • Standards used        │ • Max, Min, e, d     │ • Eccentricity Points │
│ • Ambient T° & Humidity │ • Software ID & Hash │ • Increasing/Decreasing│
│ • Inspection Mode       │ • Modular Components │ • Repeatability Runs  │
└─────────────────────────┴──────────────────────┴───────────────────────┘
```

### Tier 1: Administrative & Environmental Context
* **Inspection Mode**:
  - `Model Approval (Pattern Evaluation)` (Conducted at NPL / RRSL laboratories).
  - `Initial Verification` (New instrument at factory or lab before commercial deployment).
  - `Subsequent / In-Service Periodic Verification` (At place of use, e.g., retail store, mandi, weighbridge).
* **Testing Authority & Personnel**:
  - Laboratory Name, GATC Accreditation Number, Jurisdiction code.
  - Testing Officer Name, Designation, Digital Signature certificate.
* **Applicant & Manufacturer Details**:
  - Company Name, Registered Address, License Number, Manufacturing Date, Country of Origin.
* **Reference Standard Weights (Traceability)**:
  - Weight Box Identification / Certificate Number.
  - Accuracy Class of Standard Weights used (OIML R 111 Class $E_1, E_2, F_1, F_2, M_1, M_2$).
  - Calibration validity expiry date and uncertainty value.
* **Ambient Environmental Conditions**:
  - Ambient Temperature ($^\circ\text{C}$), Relative Humidity ($\%RH$), Atmospheric Pressure ($kPa$), Mains Supply Voltage ($V$) and Frequency ($Hz$).

### Tier 2: Instrument Metrological Specifications
The application must dynamically adapt its validation rules based on these inputs:
* **Accuracy Class**:
  - `Class I (Special)`: Analytical micro-balances ($e \le 1\,\text{mg}$, $n \ge 50\,000$).
  - `Class II (High)`: Laboratory / Precious metals scales ($1\,\text{mg} \le e \le 50\,\text{mg}$, $n \ge 100$).
  - `Class III (Medium)`: General commercial platform scales, retail POS, weighbridges ($0.1\,\text{g} \le e \le 2\,\text{g}$ with $n \ge 100$; or $e \ge 5\,\text{g}$ with $n \ge 500$ up to $10\,000$).
  - `Class IV (Ordinary)`: Heavy bulk industrial / non-critical scrap ($e \ge 5\,\text{g}$, $100 \le n \le 1\,000$).
* **Capacity and Scale Intervals**:
  - Maximum Capacity ($Max$), Minimum Capacity ($Min$).
  - Verification Scale Interval ($e$) and Actual Scale Interval ($d$).
  - Multi-Interval / Multiple Range declaration (e.g., $Max_1 = 15\,\text{kg}, e_1 = 2\,\text{g}$; $Max_2 = 30\,\text{kg}, e_2 = 5\,\text{g}$).
  - Maximum Additive Tare ($T = +Max$) or Subtractive Tare ($T = -Max$).
* **Software & Hardware Identification**:
  - Legally relevant software version number and SHA-256 cryptographic hash.
  - Audit trail event counter value (calibration counter, parameter counter).
  - Load cell model, R 60 certificate number, indicator model.

### Tier 3: Empirical Metrological Test Observations
The user inputs raw readings for the mandatory OIML R-76 test procedures:

#### A. Zero-Setting & Zero-Tracking
- Initial zero indication $I_0$.
- Extra weight added $\Delta L$ until indication changes to $I_0 + d$.
- Calculation of zero-setting range ($4\% Max$ for manual, $20\% Max$ for initial zero).

#### B. Eccentricity (Corner Load) Test
- **Input**: Load applied (typically $\frac{1}{3}Max$ for 4-point platform, or $\frac{1}{n-1}Max$ for multi-point weighbridge).
- **Readings**: Center, Position 1, Position 2, Position 3, Position 4 (and additional positions for weighbridges).
- For each position: Indicated Value ($I$) and Additional Load ($\Delta L$).

#### C. Weighing Performance (Increasing & Decreasing Loads)
- **Minimum Test Points**: At least 5 to 10 points distributed across the capacity:
  - Zero, $Min$, inflection point $500e$, intermediate, inflection point $2000e$, $Max$, and return back down to Zero.
- **For each test load ($L$)**:
  - Applied Standard Load ($L$).
  - Displayed Indication ($I$).
  - Added fractional weights ($\Delta L$) to find next display jump point.

#### D. Repeatability Test (Incorporating 2026 4th Amendment)
- **Inputs**: Test load applied (typically $0.5 Max$ and $Max$ or substitution threshold load).
- **Number of Runs**: Minimum 3 runs (for field substitution) or 6 to 10 runs (for laboratory model approval).
- **Readings**: Indicated value and $\Delta L$ for each iteration.

#### E. Discrimination Test
- Load placed on receptor. Small additional load ($1.4d$) gently placed: observer records whether the display advanced by $1d$.

#### F. Tare Test
- Tare load applied, tare balancing confirmed, and weighing performance re-checked with Net loads.

#### G. Disturbance & Environmental Tests (Laboratory Type Approval Only)
- Temperature test readings at $+20^\circ\text{C}, +40^\circ\text{C}, -10^\circ\text{C}, +5^\circ\text{C}, +20^\circ\text{C}$.
- Damp heat steady state ($40^\circ\text{C}, 85\% RH, 48h$).
- AC power variations ($230V +10\%, -15\%$).
- ESD and RF burst disturbance logs.

#### H. Photographic Exhibits
- Upload of 4 mandatory photos:
  1. Complete instrument perspective view.
  2. Clear close-up of the Manufacturer Nameplate / Stamping plate.
  3. Security sealing arrangement (lead-and-wire / destructible holographic sticker).
  4. Display indicating zero with test weights loaded.

---

## 4. What the Software Generates as Output

The software produces **two distinct types of reports** depending on the operational workflow, accompanied by a machine-readable JSON dataset.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SOFTWARE OUTPUT MODES                           │
├────────────────────────────────────┬───────────────────────────────────┤
│ Mode A: Field Verification Report  │ Mode B: Laboratory Model Approval │
│ • 4 to 8 Pages                     │ • 30 to 80+ Pages                 │
│ • On-site verification / Mandis    │ • NPL / RRSL Pattern Evaluation   │
│ • Focus: Visual, Zero, Eccentric,  │ • Includes EMC, Damp Heat, Creep, │
│   Repeatability, Error Curve       │   Checklists, Traceability Dossier│
└────────────────────────────────────┴───────────────────────────────────┘
```

### Output Document Sizing & Structural Breakdown

#### Mode A: Periodic Field Verification Report (4 to 8 Pages)
Ideal for daily enforcement in mandis, retail, factories, and weighbridges.

```
Page 1: Executive Certificate & Legal Verification Stamp
        ├── Certificate No, Legal Seal No, QR Code
        ├── Pass/Fail Verdict, Instrument Details & Photo
        └── Inspector & Verifying Officer Signatures
Page 2: Administrative Details & Visual Conformity Checklist
        ├── Owner & Manufacturer Details, Scale Interval Verification
        └── Descriptive Markings & Sealing Audit Checklist
Page 3: Eccentricity & Repeatability Test Sheets
        ├── Corner loading table with calculated errors
        └── Repeatability table with 2026 Substitution Rule evaluation
Page 4: Weighing Performance Table & MPE Funnel Graph
        ├── Full Increasing/Decreasing Data Table
        └── High-resolution Error Curve Chart vs ±MPE Envelope
Page 5+: Annexure: Photographic Evidence & Geolocation Map
```

#### Mode B: Complete Pattern Evaluation / Model Approval Dossier (30 to 80+ Pages)
Directly mirrors the exhaustive **OIML R 76-2:2007** format for national type approval.

```
Section 1: General & Administrative Information (Pages 1–4)
Section 2: Metrological & Technical Design Checklist (Pages 5–15)
           ├── Indicating & printing devices, Zero/Tare devices
           ├── Software security (Clause 5.5) validation & Checksums
           └── Module compatibility (indicator + load cell)
Section 3: Standard Metrological Tests at Ambient (Pages 16–28)
           ├── Zero setting, discrimination, eccentricity, repeatability
           └── Full weighing performance at increasing/decreasing loads
Section 4: Environmental & Influence Factor Tests (Pages 29–45)
           ├── Static temperatures (-10°C to +40°C) & span stability
           ├── Damp heat steady state (48 hours)
           └── Power supply voltage variations (Mains & Battery)
Section 5: Disturbance & EMC Performance Records (Pages 46–60)
           ├── Electrostatic Discharge (ESD contact & air)
           ├── Radiated RF electromagnetic fields
           └── Electrical fast transients (bursts) & surges
Section 6: Endurance & Time-Dependent Effects (Pages 61–70)
           ├── Creep test at Max (30 min & 4 hr curves)
           └── Zero return drift analysis
Section 7: Photographic Documentation & Schematic Drawings (Pages 71–80+)
```

---

## 5. Mathematical Formulations & Metrological Engine Logic

The software replaces manual calculations with an automated, zero-error metrological computation engine conforming to OIML R 76-1 Clause 3.5 & Annex A.

### 1. Determining True Indication ($P$)
Because digital weighing instruments display values quantized by the scale interval $d$, small fractional weights $\Delta L$ must be added to identify the transition point:
$$P = I + \frac{1}{2}d - \Delta L$$
*Where:*
- $I$ = Raw displayed indication.
- $d$ = Actual scale interval.
- $\Delta L$ = Sum of fractional test weights placed on the receptor until the display steadily switches to $I + d$.

### 2. Error and Corrected Error ($E$ & $E_c$)
The raw error of indication is:
$$E = P - L = I + \frac{1}{2}d - \Delta L - L$$
The error corrected for the initial zero error ($E_0$) is:
$$E_c = E - E_0$$
*Every test point passes if and only if:*
$$-MPE \le E_c \le +MPE$$

### 3. Maximum Permissible Error (MPE) Tier Formulas
The MPE is dynamically calculated based on the Accuracy Class and the applied load expressed in verification scale intervals ($m = \frac{L}{e}$):

| Accuracy Class | Load Range ($m = L / e$) | Initial Verification MPE | In-Service Verification MPE |
| :--- | :--- | :--- | :--- |
| **Class I** | $0 \le m \le 50\,000$ | $\pm 0.5e$ | $\pm 1.0e$ |
| | $50\,000 < m \le 200\,000$ | $\pm 1.0e$ | $\pm 2.0e$ |
| | $m > 200\,000$ | $\pm 1.5e$ | $\pm 3.0e$ |
| **Class II** | $0 \le m \le 5\,000$ | $\pm 0.5e$ | $\pm 1.0e$ |
| | $5\,000 < m \le 20\,000$ | $\pm 1.0e$ | $\pm 2.0e$ |
| | $20\,000 < m \le 100\,000$ | $\pm 1.5e$ | $\pm 3.0e$ |
| **Class III** | $0 \le m \le 500$ | $\pm 0.5e$ | $\pm 1.0e$ |
| | $500 < m \le 2\,000$ | $\pm 1.0e$ | $\pm 2.0e$ |
| | $2\,000 < m \le 10\,000$ | $\pm 1.5e$ | $\pm 3.0e$ |
| **Class IV** | $0 \le m \le 50$ | $\pm 0.5e$ | $\pm 1.0e$ |
| | $50 < m \le 200$ | $\pm 1.0e$ | $\pm 2.0e$ |
| | $200 < m \le 1\,000$ | $\pm 1.5e$ | $\pm 3.0e$ |

### 4. Mathematical Implementation of 2026 4th Amendment Substitution
Under the **Legal Metrology (General) Fourth Amendment Rules, 2026 (GSR 568(E))**:
When verifying high-capacity instruments (e.g., 60-tonne weighbridges) at the place of use, hauling 60 tonnes of standard weights is physically prohibitive. The software calculates:
1. Conduct 3 weighings at substitution load: calculate Repeatability Error $r = P_{max} - P_{min}$.
2. Compare $r$ against $e$:
$$\text{Required Standard Weights} = \begin{cases} 
20\% \times Max & \text{if } r \le 0.2e \\ 
33.\bar{3}\% \times Max & \text{if } 0.2e < r \le 0.3e \\ 
50\% \times Max & \text{if } r > 0.3e 
\end{cases}$$
The software outputs an immediate advisory on screen: *"Repeatability error is 0.18e ($\le 0.2e$). Qualified for Tier 1 standard weight reduction. Required standard weights: 12,000 kg instead of 30,000 kg."*

---

## 6. Current Baseline Solutions vs. Innovative Proposed Solution

### Competitive Landscape & Gap Analysis

```
┌───────────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│     Current Manual / Paper    │     Basic State Portals       │      Proposed SIH26035        │
├───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ • Handwritten paper forms     │ • Form submission only        │ • Automated metrological calc │
│ • Manual turning-point calcs  │ • No OIML R-76 test engine    │ • Real-time MPE tolerance plot│
│ • Unsearchable archives       │ • Static PDF upload only      │ • 2026 Substitution Optimizer │
│ • High risk of fraud          │ • No offline field support    │ • Offline PWA + Cryptographic │
│ • Hours to calculate          │ • No AI nameplate verification│ • AI Nameplate & Display OCR  │
└───────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

| Evaluation Parameter | Traditional Manual / Paper | Isolated Excel Spreadsheets | State LM Web Portals (e.g. e-Tulya) | Proposed Intelligent SIH26035 Solution |
| :--- | :--- | :--- | :--- | :--- |
| **OIML R-76-1 Metrology Engine** | None (Mental/Manual) | Formulas prone to editing errors | None (Only fees & metadata stored) | **Native Automated Engine** with zero-error turning point calculations |
| **Dynamic MPE Charting** | Hand-drawn or omitted | Static scatter charts | None | **Interactive Canvas/SVG Plot** rendering error envelope curves |
| **2026 Weight Substitution Rule** | Rarely known / manual lookup | Hardcoded or missing | Not implemented | **Dynamic calculation** of $0.2e / 0.3e$ threshold with instant tonnage advisory |
| **Field Usability (Offline)** | Works on paper | Requires laptop/Windows | Requires active internet (fails in rural mandis) | **Offline-First PWA** with encrypted local IndexedDB & auto-sync |
| **Data Authenticity & Fraud Prevention**| High risk of forged stamping | High risk of file alteration | Moderate (database logins) | **SHA-256 Hashing, Signed QR Code, EXIF Geotagging & Tamper-Audit Ledger** |
| **Nameplate Verification** | Eyeball check | Manual re-typing | Manual typing | **AI Computer Vision OCR** auto-filling & validating nameplate specs |
| **Bilingual Language Support** | Regionally fragmented | English only | Fragmented | **Standardized Hindi & English** UI and bilingual PDF generation |

---

## 7. Innovative Capabilities to Win SIH 2026

To elevate this project from a standard form generator to an industry-grade, award-winning solution, the architecture incorporates the following differentiators:

### 1. Dynamic Metrological Canvas & Real-Time MPE Funnel Graph
- As the inspector inputs $\Delta L$ for each load step, the UI renders a real-time visualization showing:
  - Upper permissible limit line ($+MPE$).
  - Lower permissible limit line ($-MPE$).
  - Zero datum line.
  - Actual measured error line ($E_c$ curve).
- Instant color feedback: Green line within the tolerance corridor; turns Red immediately if any point breaches the threshold.

```
 Error (e)
   ▲
+1.5├ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┐ +MPE Corridor
+1.0├ - - - - - - - - - - - - - ┌─────────────────────────────────┘
+0.5├ - - - - - - ┌─────────────┘   * (Ec at 1500e = +0.42e)
 0.0├───*─────────┴───────*─────────────────────────────*─────────► Load (e)
-0.5├ - - - - - - └─────────────┐   * (Ec at 2500e = -0.38e)
-1.0├ - - - - - - - - - - - - - └─────────────────────────────────┐
-1.5├ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┘ -MPE Corridor
   0            500            2000                             Max
```

### 2. AI-Powered Optical Inspection (Edge CV)
- **Nameplate Audit**: The officer snaps a photo of the scale's nameplate. On-device OCR extracts Manufacturer, Model, Class, $Max$, $Min$, $e$, and serial number, automatically cross-checking against the central Model Approval registry to detect counterfeit models.
- **Reading Verification**: Snaps a photo of the 7-segment LED/LCD display at load points, verifying that the inspector entered what the scale actually showed.

### 3. Progressive Web App (PWA) with Offline-First Resilient Architecture
- Inspectors frequently test scales at rural agricultural APMC mandis, remote highway weighbridges, or deep industrial godowns where cell connectivity is absent.
- Built as an offline-first PWA using Service Workers and encrypted IndexedDB.
- Reports can be initiated, calculated, sealed, and generated 100% offline. Once connectivity is restored, the queue securely syncs to the central database.

### 4. Cryptographic Proof & QR-Code Verification
- Every generated PDF contains an immutable **HMAC-SHA256 Digital Fingerprint**.
- A QR code printed on the top corner contains:
  - Certificate ID.
  - Machine Serial Number & Geolocation.
  - Officer ID & Timestamp.
  - URL to the National Legal Metrology portal showing real-time validity status.
- Any consumer or trader can scan the physical certificate using a standard smartphone to verify its genuineness.

### 5. Multi-Interval & Modular Scale Support
- Seamlessly handles multi-interval scales ($e_1, e_2, e_3$) where scale interval and MPE step change as the platform load increases.
- Supports modular calculation (verifying indicators separately with load cell simulators).

---

## 8. Technical Architecture & System Design

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SYSTEM ARCHITECTURE                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             CLIENT LAYER (Responsive PWA / React)       │
       │  • Bilingual UI (English / Hindi)                       │
       │  • Local IndexedDB Storage (Offline Data)               │
       │  • OCR Camera Integration (Tesseract / Vision API)      │
       │  • Interactive SVG Error Curve Graph                    │
       └────────────────────────────┬────────────────────────────┘
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             CORE METROLOGICAL ENGINE (TS/Python)        │
       │  • True Indication Calculator (P = I + 0.5e - dL)       │
       │  • MPE Tolerances Evaluator (Class I, II, III, IV)      │
       │  • 2026 Substitution Rule Optimizer (0.2e / 0.3e)       │
       │  • Repeatability & Eccentricity Matrix Processor        │
       └────────────────────────────┬────────────────────────────┘
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             BACKEND API & SECURITY SERVICES             │
       │  • FastAPI / Node.js Microservices                      │
       │  • PostgreSQL / SQLite for relational data persistence   │
       │  • Cryptographic Signing Service (HMAC-SHA256)          │
       │  • PDF Rendering Engine (Puppeteer / PDFKit / ReportLab)│
       └────────────────────────────┬────────────────────────────┘
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │            EXTERNAL INTEGRATION INTERFACES              │
       │  • National Portal (EDLMS / Legal Metrology DB)         │
       │  • Digital Seal & Hologram Registry                     │
       │  • NPL / RRSL Central Repository                        │
       └─────────────────────────────────────────────────────────┘
```

### Database Schema Design (Core Entities)

1. **`Users`**:
   - `id`, `name`, `role` (Inspector, Senior Officer, GATC Engineer, Admin), `jurisdiction`, `digital_signature_hash`.
2. **`Instruments`**:
   - `serial_number`, `model_approval_number`, `manufacturer_name`, `accuracy_class`, `max_capacity`, `min_capacity`, `verification_interval_e`, `actual_interval_d`, `is_multi_interval`, `intervals_json`, `software_hash`, `event_counter`.
3. **`TestSessions`**:
   - `session_id`, `instrument_id`, `inspector_id`, `test_type` (Verification, Re-verification, Model Approval), `temperature`, `humidity`, `standard_weights_cert_no`, `repeatability_error`, `substitution_tier_applied`, `overall_verdict` (PASS/FAIL), `created_at`, `geo_lat`, `geo_lng`.
4. **`TestReadings`**:
   - `id`, `session_id`, `test_category` (Zero, Eccentricity, Weighing, Repeatability, Tare), `step_index`, `load_applied`, `indicated_value`, `delta_load`, `calculated_P`, `error_E`, `corrected_error_Ec`, `allowed_MPE`, `status` (PASS/FAIL).
5. **`GeneratedReports`**:
   - `report_id`, `session_id`, `report_type` (Field_Short / Lab_Full), `sha256_hash`, `pdf_url`, `qr_code_payload`, `sync_status`.

---

## 9. Implementation Roadmap & Project Milestones

```
Milestone 1 (Foundations)      ► Core Metrological Math Engine + OIML R-76 Unit Tests
Milestone 2 (Data Capture)     ► Responsive PWA UI + Offline IndexedDB + Dynamic Forms
Milestone 3 (2026 Compliance)  ► GSR 568(E) 4th Amendment Substitution Optimizer
Milestone 4 (Visual Engine)    ► Interactive Error Curve Graphing + OCR Nameplate Scanner
Milestone 5 (Reporting System) ► PDF Engine (Field 4-page & Lab 60-page) + QR Verification
Milestone 6 (Security & Audit) ► Role-Based Access Control + Digital Signatures + Pilot Validation
```

### Deliverables Checklist
- [x] Comprehensive OIML R-76 regulatory and metrological baseline established.
- [x] Incorporation of all gazette notifications up to **July 2026 (GSR 568(E))**.
- [x] Clear mapping of User Inputs (Administrative, Technical, Empirical).
- [x] Clear structural breakdown of Outputs (Field 4–8 pages vs Lab 30–80 pages).
- [x] Innovative differentiator suite (Offline PWA, AI OCR, Error Curve Canvas, QR verification).
- [x] Ready-to-build software specification document for the hackathon team.

---
*Document prepared for Project SIH26035 — Department of Consumer Affairs, Government of India.*
