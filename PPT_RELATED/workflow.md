# MetroCert Complex System Architecture & Workflow

Based on your reference flowcharts, this diagram provides a comprehensive, interconnected node-based visual analysis of the MetroCert process flow. It maps the exact relationship between the Actors, Databases, Logic Engines, and Outputs.

You can paste this code into [Mermaid Live Editor](https://mermaid.live/) to export it as a high-resolution PNG or SVG for your presentation.

```mermaid
flowchart TD
    %% Styling & Colors (matching your sophisticated palette requirements)
    classDef actor fill:#FFDDC1,stroke:#FF9B54,stroke-width:2px,color:#333;
    classDef ui fill:#D4F0F0,stroke:#8FCACA,stroke-width:2px,color:#333;
    classDef process fill:#FFF1C1,stroke:#FFD359,stroke-width:2px,color:#333;
    classDef engine fill:#FFC4C4,stroke:#FF7E7E,stroke-width:2px,color:#333;
    classDef db fill:#E2D4F0,stroke:#B589D6,stroke-width:2px,color:#333;
    classDef output fill:#C4FAC7,stroke:#66D774,stroke-width:2px,color:#333;
    classDef logic fill:#FFE5B4,stroke:#FFA500,stroke-width:2px,color:#333;

    %% --------------------------------
    %% 1. ACTORS
    %% --------------------------------
    Admin(["👨‍💼 Admin"]):::actor
    Tech(["👷 Technician"]):::actor
    Rev(["🕵️ Reviewer"]):::actor

    %% --------------------------------
    %% 2. CONFIGURATION PHASE
    %% --------------------------------
    Admin -->|Manages System Policies| ConfigUI["Regulatory Library (OIML R-76)"]:::ui
    ConfigUI -->|Stores MPE & Classes| RulesDB[("📚 OIML Rules DB")]:::db
    
    Admin -->|Manages Master Data| InstUI["Instrument & Model Catalog"]:::ui
    InstUI -->|Stores Device Specs| InstDB[("⚖️ Instruments DB")]:::db

    %% --------------------------------
    %% 3. TEST PLANNING PHASE
    %% --------------------------------
    Tech -->|1. Initiates| NewTestUI["New Test Session"]:::ui
    NewTestUI -.->|Fetches Model Specs| InstDB
    
    NewTestUI -->|2. Requests Generation| MetrologyEngine{{"⚙️ Metrology Engine"}}:::engine
    RulesDB -.->|Injects OIML Constraints| MetrologyEngine
    
    MetrologyEngine -->|3. Auto-calculates| TestPlan["Dynamic Test Plan & Points"]:::output

    %% --------------------------------
    %% 4. EXECUTION & INGESTION PHASE
    %% --------------------------------
    TestPlan --> DataInput{"Data Ingestion"}:::logic
    DataInput -->|Method A| ManualEntry[/"⌨️ Manual Keyboard Entry"/]:::ui
    DataInput -->|Method B| ExcelImport[/"📄 Spreadsheet Import"/]:::ui
    
    ManualEntry --> CalcEngine
    ExcelImport --> CalcEngine

    %% --------------------------------
    %% 5. CALCULATION ENGINE PHASE
    %% --------------------------------
    CalcEngine{{"🧮 Deterministic Calc Engine"}}:::engine
    CalcEngine -->|Calculates True Indication| P_Calc("P = I + 0.5e - ΔL"):::process
    CalcEngine -->|Calculates Error| E_Calc("E = P - L"):::process
    CalcEngine -->|Calculates Corrected Error| Ec_Calc("Ec = E - E0"):::process
    
    P_Calc & E_Calc & Ec_Calc --> ComplianceCheck{"Passes MPE Tier?"}:::logic
    
    ComplianceCheck -->|Yes| PassStatus["✅ Pass"]:::output
    ComplianceCheck -->|No| FailStatus["❌ Fail"]:::output
    
    PassStatus & FailStatus --> SubmitSession["Submit Session Data"]:::process

    %% --------------------------------
    %% 6. REVIEW & FEEDBACK LOOP
    %% --------------------------------
    SubmitSession --> PendingQueue["Pending Reviews Dashboard"]:::ui
    Rev -->|Inspects Traces & Curves| PendingQueue
    
    PendingQueue --> RevDecision{"Reviewer Decision"}:::logic
    
    RevDecision -->|Reject / Discrepancy| Feedback["Return for Correction"]:::process
    Feedback -.->|Feedback Loop| Tech
    
    %% --------------------------------
    %% 7. CERTIFICATION PHASE
    %% --------------------------------
    RevDecision -->|Approve & Sign| CertEngine{{"📜 Certification Engine"}}:::engine
    
    CertEngine -->|Generates Document| FinalReport["Official PDF Report"]:::output
    CertEngine -->|Applies Security| SHASeal["SHA-256 Digital Seal"]:::process
    CertEngine -->|Applies Verification| QRCode["Embedded QR Code"]:::process
    
    FinalReport & SHASeal & QRCode --> FinalOutput["Immutable Test Certificate"]:::output
    FinalOutput --> SecureStorage[("🔒 Secure IndexedDB Storage")]:::db
```
