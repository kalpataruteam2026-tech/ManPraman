"""
WeighReport Database Initialization and Seeding
Initializes schemas, tables, lab profile, standard equipment, users, and baseline tests.
"""
import datetime
from sqlalchemy.orm import Session
from .database import engine, Base
from .models import (
    AppUser, LabProfile, Application, Report, TestInstance, ChecklistResult, Equipment, AuditEvent
)

def init_db(db: Session):
    """Create all tables and seed initial records."""
    Base.metadata.create_all(bind=engine)

    # Check if already seeded
    if db.query(AppUser).first():
        return

    # Seed Users
    admin_user = AppUser(
        email="admin@weighreport.lab",
        full_name="Dr. H. Sharma (Lab Director)",
        role="admin"
    )
    engineer_user = AppUser(
        email="engineer@weighreport.lab",
        full_name="Rajesh Patel (Lead Test Engineer)",
        role="engineer"
    )
    reviewer_user = AppUser(
        email="reviewer@weighreport.lab",
        full_name="Ananya Sen (Technical Manager)",
        role="reviewer"
    )
    db.add_all([admin_user, engineer_user, reviewer_user])
    db.commit()

    # Seed Lab Profile
    lab = LabProfile(
        name="National Metrology Institute of Legal Metrology",
        accreditation_no="ISO/IEC 17025:2017 #NABL-TC-8892",
        address="Legal Metrology Complex, Sector 12, New Delhi 110001",
        timezone="Asia/Kolkata",
        default_lang="en"
    )
    db.add(lab)

    # Seed Standard Test Equipment Register (p. 8)
    eq1 = Equipment(
        name="OIML Class E2 Weights Set (1 mg - 20 kg)",
        category="standard_weights",
        manufacturer="Häfner Gewichte GmbH",
        model="E2-SST-Set",
        serial_no="HAF-2024-9981",
        range_text="1 mg to 20 kg",
        accuracy_text="OIML R 111 Class E2",
        resolution_text="0.1 mg",
        cert_no="CAL-NPL-2026-4421",
        cal_date=datetime.date(2026, 1, 15),
        cal_valid_until=datetime.date(2027, 1, 15),
        traceability="National Physical Laboratory (NPL)",
        active=True
    )
    eq2 = Equipment(
        name="Climatic Environmental Test Chamber",
        category="climatic_chamber",
        manufacturer="Weiß Umwelttechnik",
        model="ClimeEvent C/600",
        serial_no="WU-600-883",
        range_text="-40 °C to +180 °C, 10% to 98% RH",
        accuracy_text="±0.3 °C, ±1.5% RH",
        cert_no="CAL-CC-2026-118",
        cal_date=datetime.date(2026, 3, 10),
        cal_valid_until=datetime.date(2027, 3, 10),
        traceability="PTB / National Standards",
        active=True
    )
    eq3 = Equipment(
        name="Precision Digital Barometer / Altimeter",
        category="barometer",
        manufacturer="Vaisala",
        model="PTB330",
        serial_no="VAI-90218",
        range_text="500 to 1100 hPa",
        accuracy_text="±0.10 hPa",
        cert_no="CAL-BARO-2025-90",
        cal_date=datetime.date(2025, 11, 20),
        cal_valid_until=datetime.date(2026, 11, 20),
        traceability="Vaisala Accredited Lab",
        active=True
    )
    eq4 = Equipment(
        name="Electrostatic Discharge Simulator (ESD)",
        category="ESD generator",
        manufacturer="EM Test / AMETEK",
        model="dito 30 kV",
        serial_no="DITO-552",
        range_text="Contact: up to 10 kV; Air: up to 16.5 kV",
        accuracy_text="IEC 61000-4-2 compliant",
        cert_no="CAL-EMC-2026-03",
        cal_date=datetime.date(2026, 2, 5),
        cal_valid_until=datetime.date(2027, 2, 5),
        traceability="NIST / Accredited EMC Lab",
        active=True
    )
    db.add_all([eq1, eq2, eq3, eq4])
    db.commit()

    # Seed Sample Application: AT-01 Demo Scenario
    app1 = Application(
        application_no="APP-2026-OIML-001",
        applicant="Apex Precision Instruments Pvt Ltd",
        manufacturer="Apex Scales Co., Ltd",
        type_designation="APX-3000 Series Industrial Bench Scale",
        instrument_category="Complete instrument",
        created_by=engineer_user.id
    )
    db.add(app1)
    db.commit()

    # Seed Report for Application 1
    rep1 = Report(
        application_id=app1.id,
        version=1,
        status="in_progress",
        verdict="failed",
        progress_pct=25.0,
        observer_id=engineer_user.id,
        reviewer_id=reviewer_user.id,
        instrument={
            "accuracy_class": "III",
            "Max": "15000",
            "Min": "100",
            "e": "5",
            "d": "5",
            "n": "3000",
            "unit": "g",
            "ranges": [{"idx": 1, "e": "5", "d": "5", "Max": "15000", "Min": "100"}],
            "temperature_range": "-10 °C / +40 °C",
            "power_supply": "230 V AC, 50 Hz",
            "zero_setting": "semi_automatic",
            "tare_device": "subtractive"
        },
        evaluation_start=datetime.date(2026, 9, 20),
        evaluation_end=datetime.date(2026, 9, 29),
        report_date=datetime.date(2026, 9, 29)
    )
    db.add(rep1)
    db.commit()

    # Seed Test T3.1 (AT-01 Eccentricity failure)
    t31 = TestInstance(
        report_id=rep1.id,
        test_code="T3.1",
        applicability="required",
        status="complete",
        verdict="failed",
        header={
            "date": "2026-09-29",
            "observer": "Rajesh Patel",
            "e": "5",
            "d": "5",
            "env": {
                "temp": {"start": "20.5", "max": "21.0", "end": "20.8"},
                "rh": {"start": "52", "max": "54", "end": "50"},
                "pressure": {"start": "1012"}
            }
        },
        config={"mobile_instrument": False, "load_fraction": "0.3333"},
        data={
            "rows": [
                {"loc": 1, "kind": "zero", "L": "0", "I": "0", "dL": "0.5"},
                {"loc": 1, "kind": "load", "L": "5000", "I": "5005", "dL": "0.5"},
                {"loc": 2, "kind": "zero", "L": "0", "I": "0", "dL": "0.5"},
                {"loc": 2, "kind": "load", "L": "5000", "I": "5005", "dL": "0.5"},
                {"loc": 3, "kind": "zero", "L": "0", "I": "0", "dL": "0.5"},
                {"loc": 3, "kind": "load", "L": "5000", "I": "5010", "dL": "0.5"}, # FAILS (|Ec| = 10.0 > 5.0)
                {"loc": 4, "kind": "zero", "L": "0", "I": "0", "dL": "0.5"},
                {"loc": 4, "kind": "load", "L": "5000", "I": "5005", "dL": "0.5"}
            ]
        },
        results={
            "rows": [
                {"loc": 1, "kind": "zero", "L": "0", "I": "0", "dL": "0.5", "P": "2.0", "E": "2.0", "E0": "2.0", "Ec": "0", "pass": True},
                {"loc": 1, "kind": "load", "L": "5000", "I": "5005", "dL": "0.5", "P": "5007.0", "E": "7.0", "E0": "2.0", "Ec": "5.0", "mpe": "5.0", "k": "1.0", "load_in_e": "1000", "pass": True},
                {"loc": 2, "kind": "zero", "L": "0", "I": "0", "dL": "0.5", "P": "2.0", "E": "2.0", "E0": "2.0", "Ec": "0", "pass": True},
                {"loc": 2, "kind": "load", "L": "5000", "I": "5005", "dL": "0.5", "P": "5007.0", "E": "7.0", "E0": "2.0", "Ec": "5.0", "mpe": "5.0", "k": "1.0", "load_in_e": "1000", "pass": True},
                {"loc": 3, "kind": "zero", "L": "0", "I": "0", "dL": "0.5", "P": "2.0", "E": "2.0", "E0": "2.0", "Ec": "0", "pass": True},
                {"loc": 3, "kind": "load", "L": "5000", "I": "5010", "dL": "0.5", "P": "5012.0", "E": "12.0", "E0": "2.0", "Ec": "10.0", "mpe": "5.0", "k": "1.0", "load_in_e": "1000", "pass": False},
                {"loc": 4, "kind": "zero", "L": "0", "I": "0", "dL": "0.5", "P": "2.0", "E": "2.0", "E0": "2.0", "Ec": "0", "pass": True},
                {"loc": 4, "kind": "load", "L": "5000", "I": "5005", "dL": "0.5", "P": "5007.0", "E": "7.0", "E0": "2.0", "Ec": "5.0", "mpe": "5.0", "k": "1.0", "load_in_e": "1000", "pass": True}
            ],
            "metrics": {"max_abs_Ec": "10.0", "min_margin": "-5.0"}
        },
        remarks="Location 3 failed tolerance check (|Ec| = 10.0 g > mpe 5.0 g)."
    )

    # Seed other tests as placeholders for this report
    test_codes = ["T1", "T2", "T4.1.1", "T5", "T6.1", "T6.2", "T7", "T8", "T9", "T10", "T11", "T12.1", "T13a", "T14", "T15"]
    other_tests = []
    for c in test_codes:
        other_tests.append(TestInstance(
            report_id=rep1.id,
            test_code=c,
            applicability="required",
            status="not_started",
            verdict="incomplete",
            header={"e": "5", "d": "5"},
            data={},
            results={}
        ))

    db.add(t31)
    db.add_all(other_tests)

    # Seed Checklist Items
    checklist_seeds = [
        {"item_key": "17.1/7.1.1/manufacturer_mark", "clause": "7.1.1", "text_en": "Manufacturer's mark or name clearly inscribed", "result": "passed"},
        {"item_key": "17.1/7.1.2/accuracy_class", "clause": "7.1.2", "text_en": "Accuracy class symbol (Class III) in oval/rectangle", "result": "passed"},
        {"item_key": "17.1/7.1.3/max_capacity", "clause": "7.1.3", "text_en": "Maximum capacity Max = 15 kg clearly marked", "result": "passed"},
        {"item_key": "17.1/7.1.4/min_capacity", "clause": "7.1.4", "text_en": "Minimum capacity Min = 100 g clearly marked", "result": "passed"},
        {"item_key": "17.1/7.1.5/scale_interval", "clause": "7.1.5", "text_en": "Verification scale interval e = 5 g marked", "result": "passed"},
        {"item_key": "17.2/4.14/direct_sales", "clause": "4.14", "text_en": "Primary indications visible to vendor and customer", "result": "passed"},
        {"item_key": "17.3/5.1/electronic_fault", "clause": "5.1", "text_en": "Significant faults detected and acted upon or warned", "result": "passed"},
        {"item_key": "17.4/5.5/software_protection", "clause": "5.5", "text_en": "Legally relevant software protected and secured", "result": "passed"},
    ]
    for cs in checklist_seeds:
        db.add(ChecklistResult(
            report_id=rep1.id,
            item_key=cs["item_key"],
            clause=cs["clause"],
            text_en=cs["text_en"],
            result=cs["result"]
        ))

    # Audit log entry
    audit = AuditEvent(
        user_id=engineer_user.id,
        entity="report",
        entity_id=rep1.id,
        action="CREATE_AND_INITIAL_EVALUATION",
        old_data=None,
        new_data={"verdict": "failed", "failed_test": "T3.1"},
        reason="Initial test data capture for AT-01 acceptance test",
        prev_hash="0"*64,
        hash="a"*64
    )
    db.add(audit)
    db.commit()
