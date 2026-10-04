"""
Setup PostgreSQL Cluster / Schema 'oiml'
Executes DDL to create the 'oiml' cluster/schema and all tables in PostgreSQL.
"""
import os
import sys
from decimal import Decimal
import psycopg2
from psycopg2 import sql

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_URL = os.getenv("DATABASE_URL", f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

def setup_cluster():
    print(f"Connecting to PostgreSQL: {DB_HOST}:{DB_PORT}/{DB_NAME}...")
    try:
        conn = psycopg2.connect(DB_URL, connect_timeout=5)
        conn.autocommit = True
        cur = conn.cursor()

        print("1. Creating schema 'oiml'...")
        cur.execute("CREATE SCHEMA IF NOT EXISTS oiml;")

        print("2. Setting search_path to oiml, public...")
        cur.execute("SET search_path TO oiml, public;")

        print("3. Creating tables inside 'oiml' schema...")
        cur.execute("""
        CREATE TABLE IF NOT EXISTS oiml.app_user (
            id text PRIMARY KEY,
            email text UNIQUE NOT NULL,
            full_name text NOT NULL,
            role text NOT NULL DEFAULT 'engineer',
            pw_hash text,
            status text NOT NULL DEFAULT 'active',
            created_at timestamptz DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS oiml.lab_profile (
            id text PRIMARY KEY,
            name text,
            accreditation_no text,
            address text,
            logo_object_key text,
            timezone text DEFAULT 'Asia/Kolkata',
            default_lang text DEFAULT 'en'
        );

        CREATE TABLE IF NOT EXISTS oiml.application (
            id text PRIMARY KEY,
            application_no text UNIQUE NOT NULL,
            applicant text,
            manufacturer text,
            type_designation text NOT NULL,
            instrument_category text,
            created_by text REFERENCES oiml.app_user(id),
            created_at timestamptz DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS oiml.report (
            id text PRIMARY KEY,
            application_id text NOT NULL REFERENCES oiml.application(id),
            version int NOT NULL DEFAULT 1,
            parent_report_id text,
            status text NOT NULL DEFAULT 'draft',
            verdict text NOT NULL DEFAULT 'incomplete',
            progress_pct numeric(5,2) NOT NULL DEFAULT 0,
            rulepack_id text DEFAULT 'oiml-r76-2007',
            engine_version text NOT NULL DEFAULT '1.0.0',
            instrument jsonb NOT NULL DEFAULT '{}'::jsonb,
            evaluation_start date,
            evaluation_end date,
            report_date date,
            observer_id text REFERENCES oiml.app_user(id),
            reviewer_id text REFERENCES oiml.app_user(id),
            remarks jsonb DEFAULT '{}'::jsonb,
            row_version int NOT NULL DEFAULT 1,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS oiml.test_instance (
            id text PRIMARY KEY,
            report_id text NOT NULL REFERENCES oiml.report(id) ON DELETE CASCADE,
            test_code text NOT NULL,
            instance_no int NOT NULL DEFAULT 1,
            range_idx int DEFAULT 1,
            config jsonb NOT NULL DEFAULT '{}'::jsonb,
            applicability text NOT NULL DEFAULT 'required',
            na_reason text,
            header jsonb NOT NULL DEFAULT '{}'::jsonb,
            data jsonb NOT NULL DEFAULT '{}'::jsonb,
            results jsonb NOT NULL DEFAULT '{}'::jsonb,
            status text NOT NULL DEFAULT 'not_started',
            verdict text NOT NULL DEFAULT 'incomplete',
            form_schema_version text NOT NULL DEFAULT '1.0.0',
            remarks text,
            row_version int NOT NULL DEFAULT 1,
            updated_at timestamptz DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS oiml.checklist_result (
            id text PRIMARY KEY,
            report_id text NOT NULL REFERENCES oiml.report(id) ON DELETE CASCADE,
            item_key text NOT NULL,
            clause text,
            text_en text,
            section text DEFAULT '17.1',
            result text CHECK (result IN ('passed','failed','na')),
            remarks text,
            updated_at timestamptz DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS oiml.equipment (
            id text PRIMARY KEY,
            name text NOT NULL,
            category text NOT NULL,
            manufacturer text,
            model text,
            serial_no text,
            range_text text,
            accuracy_text text,
            resolution_text text,
            cert_no text,
            cal_date date,
            cal_valid_until date,
            traceability text,
            active bool DEFAULT true
        );

        CREATE TABLE IF NOT EXISTS oiml.generated_report (
            id text PRIMARY KEY,
            report_id text NOT NULL REFERENCES oiml.report(id) ON DELETE CASCADE,
            kind text CHECK (kind IN ('detailed','summary')),
            format text CHECK (format IN ('pdf','docx')),
            gen_no int NOT NULL DEFAULT 1,
            file_path text NOT NULL,
            sha256 text NOT NULL,
            data_hash text NOT NULL,
            stale bool NOT NULL DEFAULT false,
            watermark text,
            generated_at timestamptz DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS oiml.audit_event (
            seq bigserial PRIMARY KEY,
            ts timestamptz DEFAULT now(),
            user_id text,
            entity text NOT NULL,
            entity_id text,
            action text NOT NULL,
            old_data jsonb,
            new_data jsonb,
            reason text,
            prev_hash text,
            hash text NOT NULL
        );
        """)

        print("4. PostgreSQL 'oiml' cluster schema setup successfully completed!")
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"PostgreSQL connection note: {e}")
        print("When remote DNS or network to Supabase becomes accessible, this script can be executed at any time to deploy 'oiml' schema.")
        return False

if __name__ == "__main__":
    setup_cluster()
