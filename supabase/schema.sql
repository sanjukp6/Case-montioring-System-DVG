-- ============================================================
-- DAVANGERE POLICE CASE TRACKING SYSTEM
-- Supabase Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Writer', 'SHO', 'SP')),
    police_station VARCHAR(255) NOT NULL,
    employee_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default users
INSERT INTO users (username, password, name, role, police_station, employee_number) VALUES
    ('writer1', 'password123', 'Constable Ravi Kumar', 'Writer', 'Davangere City PS', 'EMP001'),
    ('writer2', 'password123', 'Constable Suma B', 'Writer', 'Harihar PS', 'EMP002'),
    ('sho1', 'password123', 'Inspector Manjunath R', 'SHO', 'Davangere City PS', 'SHO001'),
    ('sho2', 'password123', 'Inspector Lakshmi Devi', 'SHO', 'Harihar PS', 'SHO002'),
    ('sp1', 'password123', 'SP Uma Prashanth', 'SP', 'District HQ', 'SP001')
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- CASES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Case Details
    sl_no VARCHAR(50),
    police_station VARCHAR(255) NOT NULL,
    crime_number VARCHAR(100) NOT NULL UNIQUE,
    sections_of_law TEXT NOT NULL,
    investigating_officer VARCHAR(255) NOT NULL,
    public_prosecutor VARCHAR(255),
    
    -- Charge Sheet & Court Details
    date_of_charge_sheet DATE,
    cc_no_sc_no VARCHAR(100),
    court_name VARCHAR(255),
    
    -- Accused Information
    total_accused INTEGER DEFAULT 0,
    accused_names TEXT,
    accused_in_judicial_custody INTEGER DEFAULT 0,
    accused_on_bail INTEGER DEFAULT 0,
    
    -- Witness Details (JSON)
    total_witnesses INTEGER DEFAULT 0,
    witness_details JSONB DEFAULT '{
        "complainantWitness": {"supported": 0, "hostile": 0},
        "mahazarSeizureWitness": {"supported": 0, "hostile": 0},
        "ioWitness": {"supported": 0, "hostile": 0},
        "eyeWitness": {"supported": 0, "hostile": 0},
        "otherWitness": {"supported": 0, "hostile": 0}
    }'::jsonb,
    
    -- Hearings (JSON Array)
    hearings JSONB DEFAULT '[]'::jsonb,
    
    -- Trial & Hearing Tracking
    next_hearing_date DATE,
    current_stage_of_trial VARCHAR(255),
    date_of_framing_charges DATE,
    date_of_judgment DATE,
    
    -- Judgment & Outcome
    judgment_result VARCHAR(50),
    reason_for_acquittal TEXT,
    total_accused_convicted INTEGER DEFAULT 0,
    accused_convictions JSONB DEFAULT '[]'::jsonb,
    fine_amount VARCHAR(100),
    victim_compensation TEXT,
    
    -- Higher Court Details (JSON)
    higher_court_details JSONB DEFAULT '{
        "proceedingsPending": false,
        "proceedingType": "",
        "courtName": "",
        "petitionerParty": "",
        "petitionNumber": "",
        "dateOfFiling": "",
        "petitionStatus": "",
        "natureOfDisposal": "",
        "actionAfterDisposal": ""
    }'::jsonb,
    
    -- Status & Workflow
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved')),
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cases_crime_number ON cases(crime_number);
CREATE INDEX IF NOT EXISTS idx_cases_police_station ON cases(police_station);
CREATE INDEX IF NOT EXISTS idx_cases_next_hearing ON cases(next_hearing_date);
CREATE INDEX IF NOT EXISTS idx_cases_judgment_result ON cases(judgment_result);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users (we'll handle role-based access in the app)
CREATE POLICY "Allow all for authenticated users" ON users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON cases
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cases_updated_at ON cases;
CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INSERT SAMPLE CASE DATA
-- ============================================================
INSERT INTO cases (
    sl_no, police_station, crime_number, sections_of_law,
    investigating_officer, public_prosecutor, date_of_charge_sheet,
    cc_no_sc_no, court_name, total_accused, accused_names,
    accused_in_judicial_custody, accused_on_bail, total_witnesses,
    next_hearing_date, current_stage_of_trial, date_of_framing_charges,
    witness_details, hearings, status
) VALUES (
    '001', 'Davangere City PS', 'CR/2024/001', 'IPC 302, 307',
    'SI Ramesh Kumar', 'Adv. Suresh Patil', '2024-02-15',
    'SC/2024/125', 'Sessions Court, Davangere', 3, 'Accused 1, Accused 2, Accused 3',
    2, 1, 12,
    CURRENT_DATE + INTERVAL '2 days', 'Prosecution Evidence', '2024-03-01',
    '{"complainantWitness": {"supported": 2, "hostile": 0}, "mahazarSeizureWitness": {"supported": 3, "hostile": 1}, "ioWitness": {"supported": 2, "hostile": 0}, "eyeWitness": {"supported": 2, "hostile": 1}, "otherWitness": {"supported": 1, "hostile": 0}}'::jsonb,
    '[{"id": "h1", "date": "2024-03-01", "stageOfTrial": "Framing of Charges"}, {"id": "h2", "date": "2024-04-15", "stageOfTrial": "Prosecution Evidence"}]'::jsonb,
    'approved'
), (
    '002', 'Harihar PS', 'CR/2024/045', 'IPC 420, 406',
    'SI Manjunath B', 'Adv. Lakshmi Devi', '2024-01-20',
    'CC/2024/089', 'JMFC Court, Davangere', 2, 'Accused A, Accused B',
    0, 2, 8,
    CURRENT_DATE + INTERVAL '7 days', 'Evidence', '2024-02-10',
    '{"complainantWitness": {"supported": 1, "hostile": 0}, "mahazarSeizureWitness": {"supported": 2, "hostile": 0}, "ioWitness": {"supported": 1, "hostile": 0}, "eyeWitness": {"supported": 2, "hostile": 1}, "otherWitness": {"supported": 1, "hostile": 0}}'::jsonb,
    '[{"id": "h3", "date": "2024-02-10", "stageOfTrial": "Appearance"}]'::jsonb,
    'approved'
)
ON CONFLICT (crime_number) DO NOTHING;
