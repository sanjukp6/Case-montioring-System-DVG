-- ============================================================
-- DAVANGERE POLICE DEPARTMENT - CASE MONITORING SYSTEM
-- PostgreSQL Database Schema
-- ============================================================

-- Drop existing tables if they exist (for fresh installation)
DROP TABLE IF EXISTS higher_court_details CASCADE;
DROP TABLE IF EXISTS accused_convictions CASCADE;
DROP TABLE IF EXISTS hearings CASCADE;
DROP TABLE IF EXISTS witness_details CASCADE;
DROP TABLE IF EXISTS cases CASCADE;

-- ============================================================
-- MAIN CASES TABLE
-- ============================================================
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Step 1: Basic Case Details
    sl_no VARCHAR(50),
    police_station VARCHAR(255) NOT NULL,
    crime_number VARCHAR(100) NOT NULL UNIQUE,
    sections_of_law TEXT NOT NULL,
    investigating_officer VARCHAR(255) NOT NULL,
    public_prosecutor VARCHAR(255),
    
    -- Step 2: Charge Sheet & Court Details
    date_of_charge_sheet DATE,
    cc_no_sc_no VARCHAR(100),
    court_name VARCHAR(255),
    
    -- Step 3: Accused Information
    total_accused INTEGER DEFAULT 0,
    accused_names TEXT,
    accused_in_judicial_custody INTEGER DEFAULT 0,
    accused_on_bail INTEGER DEFAULT 0,
    
    -- Step 4: Witness Details (stored as JSON for flexibility)
    total_witnesses INTEGER DEFAULT 0,
    
    -- Step 5: Trial & Hearing Tracking
    next_hearing_date DATE,
    current_stage_of_trial VARCHAR(255),
    date_of_framing_charges DATE,
    date_of_judgment DATE,
    
    -- Step 6: Judgment & Outcome
    judgment_result VARCHAR(50), -- 'Convicted', 'Acquitted', 'Partly'
    reason_for_acquittal TEXT,
    total_accused_convicted INTEGER DEFAULT 0,
    fine_amount VARCHAR(100),
    victim_compensation TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- Index for faster crime number lookups
CREATE INDEX idx_cases_crime_number ON cases(crime_number);

-- Index for finding cases with upcoming hearings
CREATE INDEX idx_cases_next_hearing ON cases(next_hearing_date);

-- Index for filtering by police station
CREATE INDEX idx_cases_police_station ON cases(police_station);

-- Index for filtering by judgment result
CREATE INDEX idx_cases_judgment_result ON cases(judgment_result);

-- ============================================================
-- WITNESS DETAILS TABLE
-- ============================================================
CREATE TABLE witness_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    
    -- Complainant Witness
    complainant_witness_supported INTEGER DEFAULT 0,
    complainant_witness_hostile INTEGER DEFAULT 0,
    
    -- Mahazar / Seizure Witness
    mahazar_seizure_witness_supported INTEGER DEFAULT 0,
    mahazar_seizure_witness_hostile INTEGER DEFAULT 0,
    
    -- IO Witness
    io_witness_supported INTEGER DEFAULT 0,
    io_witness_hostile INTEGER DEFAULT 0,
    
    -- Eye Witness
    eye_witness_supported INTEGER DEFAULT 0,
    eye_witness_hostile INTEGER DEFAULT 0,
    
    -- Other Witness
    other_witness_supported INTEGER DEFAULT 0,
    other_witness_hostile INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_witness_details_case_id ON witness_details(case_id);

-- ============================================================
-- HEARINGS TABLE (Dynamic list of hearing dates)
-- ============================================================
CREATE TABLE hearings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    hearing_date DATE NOT NULL,
    stage_of_trial VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for finding hearings by case
CREATE INDEX idx_hearings_case_id ON hearings(case_id);

-- Index for sorting by date
CREATE INDEX idx_hearings_date ON hearings(hearing_date);

-- ============================================================
-- ACCUSED CONVICTIONS TABLE (Names and sentences)
-- ============================================================
CREATE TABLE accused_convictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    accused_name VARCHAR(255) NOT NULL,
    sentence_awarded TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accused_convictions_case_id ON accused_convictions(case_id);

-- ============================================================
-- HIGHER COURT DETAILS TABLE
-- ============================================================
CREATE TABLE higher_court_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    
    proceedings_pending BOOLEAN DEFAULT FALSE,
    proceeding_type VARCHAR(10), -- REV, REW, APP, CP, WP
    higher_court_name VARCHAR(255),
    petitioner_party VARCHAR(255),
    petition_number VARCHAR(100),
    date_of_filing DATE,
    petition_status VARCHAR(50), -- Pending, Disposed
    nature_of_disposal TEXT,
    action_after_disposal TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_higher_court_case_id ON higher_court_details(case_id);

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- View for cases with upcoming hearings (within 7 days)
CREATE OR REPLACE VIEW v_upcoming_hearings AS
SELECT 
    c.id,
    c.crime_number,
    c.police_station,
    c.court_name,
    c.next_hearing_date,
    c.current_stage_of_trial,
    c.investigating_officer,
    (c.next_hearing_date - CURRENT_DATE) AS days_until_hearing
FROM cases c
WHERE c.next_hearing_date IS NOT NULL 
    AND c.next_hearing_date >= CURRENT_DATE
    AND c.next_hearing_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY c.next_hearing_date ASC;

-- View for urgent cases (within 3 days)
CREATE OR REPLACE VIEW v_urgent_hearings AS
SELECT * FROM v_upcoming_hearings
WHERE days_until_hearing <= 3;

-- View for case summary with all related data
CREATE OR REPLACE VIEW v_case_summary AS
SELECT 
    c.*,
    wd.complainant_witness_supported,
    wd.complainant_witness_hostile,
    wd.mahazar_seizure_witness_supported,
    wd.mahazar_seizure_witness_hostile,
    wd.io_witness_supported,
    wd.io_witness_hostile,
    wd.eye_witness_supported,
    wd.eye_witness_hostile,
    wd.other_witness_supported,
    wd.other_witness_hostile,
    hcd.proceedings_pending AS higher_court_pending,
    hcd.proceeding_type,
    hcd.petition_status
FROM cases c
LEFT JOIN witness_details wd ON c.id = wd.case_id
LEFT JOIN higher_court_details hcd ON c.id = hcd.case_id;

-- ============================================================
-- FUNCTIONS FOR DATA MANAGEMENT
-- ============================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_witness_details_updated_at
    BEFORE UPDATE ON witness_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_higher_court_updated_at
    BEFORE UPDATE ON higher_court_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================

INSERT INTO cases (
    sl_no, police_station, crime_number, sections_of_law,
    investigating_officer, public_prosecutor, date_of_charge_sheet,
    cc_no_sc_no, court_name, total_accused, accused_names,
    accused_in_judicial_custody, accused_on_bail, total_witnesses,
    next_hearing_date, current_stage_of_trial, date_of_framing_charges
) VALUES (
    '001', 'Davangere City PS', 'CR/2024/001', 'IPC 302, 307',
    'SI Ramesh Kumar', 'Adv. Suresh Patil', '2024-02-15',
    'SC/2024/125', 'Sessions Court, Davangere', 3, 'Accused 1, Accused 2, Accused 3',
    2, 1, 12,
    CURRENT_DATE + INTERVAL '2 days', 'Prosecution Evidence', '2024-03-01'
);

-- Get the inserted case ID for related tables
DO $$
DECLARE
    case_uuid UUID;
BEGIN
    SELECT id INTO case_uuid FROM cases WHERE crime_number = 'CR/2024/001';
    
    -- Insert witness details
    INSERT INTO witness_details (
        case_id, complainant_witness_supported, complainant_witness_hostile,
        mahazar_seizure_witness_supported, mahazar_seizure_witness_hostile,
        io_witness_supported, io_witness_hostile,
        eye_witness_supported, eye_witness_hostile,
        other_witness_supported, other_witness_hostile
    ) VALUES (
        case_uuid, 2, 0, 3, 1, 2, 0, 2, 1, 1, 0
    );
    
    -- Insert hearing records
    INSERT INTO hearings (case_id, hearing_date, stage_of_trial) VALUES
        (case_uuid, '2024-03-01', 'Framing of Charges'),
        (case_uuid, '2024-04-15', 'Prosecution Evidence');
END $$;

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE cases IS 'Main table storing all case information for the Case Monitoring System';
COMMENT ON TABLE witness_details IS 'Stores supported and hostile witness counts by category';
COMMENT ON TABLE hearings IS 'Dynamic list of all hearing dates and stages for each case';
COMMENT ON TABLE accused_convictions IS 'Names and sentences of convicted accused';
COMMENT ON TABLE higher_court_details IS 'Information about appeals and petitions in higher courts';

COMMENT ON COLUMN cases.judgment_result IS 'Valid values: Convicted, Acquitted, Partly';
COMMENT ON COLUMN higher_court_details.proceeding_type IS 'Valid values: REV (Revision), REW (Review), APP (Appeal), CP (Criminal Petition), WP (Writ Petition)';
COMMENT ON COLUMN higher_court_details.petition_status IS 'Valid values: Pending, Disposed';
