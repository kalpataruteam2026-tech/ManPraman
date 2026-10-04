-- MetroCert Supabase PostgreSQL Schema Definition
-- This file contains the initial schema for migrating from IndexedDB to Supabase

-- 1. Users Table (Maps to Supabase Auth automatically via RLS if needed, but here's a custom profile table)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'reviewer')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Instruments Table (The models being tested)
CREATE TABLE IF NOT EXISTS public.instruments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    serial_number TEXT,
    accuracy_class TEXT CHECK (accuracy_class IN ('I', 'II', 'III', 'IIII')),
    max_capacity NUMERIC NOT NULL,
    e_value NUMERIC NOT NULL,
    d_value NUMERIC NOT NULL,
    min_capacity NUMERIC,
    n_max INTEGER,
    tare_max NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Test Sessions
CREATE TABLE IF NOT EXISTS public.test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instrument_id UUID REFERENCES public.instruments(id),
    technician_id UUID REFERENCES public.users(id),
    reviewer_id UUID REFERENCES public.users(id),
    mode TEXT CHECK (mode IN ('field', 'lab')),
    stage TEXT CHECK (stage IN ('initial', 'periodic', 'repair')),
    status TEXT CHECK (status IN ('draft', 'pending_review', 'approved', 'returned', 'rejected')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    location TEXT,
    temperature NUMERIC,
    humidity NUMERIC,
    overall_verdict TEXT CHECK (overall_verdict IN ('PASS', 'FAIL', 'PENDING')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Test Results (Stores the array of individual test readings)
-- We store results as JSONB to maintain flexibility for different test types (Eccentricity, Weighing, Repeatability)
CREATE TABLE IF NOT EXISTS public.test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.test_sessions(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL, -- e.g., 'weighing', 'eccentricity'
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Example)
-- Technicians can create sessions
CREATE POLICY "Technicians can insert sessions" ON public.test_sessions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'technician')
    );

-- Reviewers can update sessions
CREATE POLICY "Reviewers can update sessions" ON public.test_sessions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'reviewer')
    );
