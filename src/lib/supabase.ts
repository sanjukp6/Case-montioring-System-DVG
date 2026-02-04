import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ohycqgplsfzqdhatfvzv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oeWNxZ3Bsc2Z6cWRoYXRmdnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Nzg3NjQsImV4cCI6MjA4NDM1NDc2NH0.mg__08_nuaw3-dke3BxYSRA2X35u-A-C21AnKMDdPK8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for TypeScript
export interface DbUser {
    id: string;
    username: string;
    password: string;
    name: string;
    role: 'Writer' | 'SHO' | 'SP';
    police_station: string;
    employee_number: string;
    created_at?: string;
    updated_at?: string;
}

export interface DbCase {
    id: string;
    sl_no: string;
    police_station: string;
    crime_number: string;
    sections_of_law: string;
    investigating_officer: string;
    public_prosecutor: string;
    date_of_charge_sheet: string | null;
    cc_no_sc_no: string;
    court_name: string;
    total_accused: number;
    accused_names: string;
    accused_in_judicial_custody: number;
    accused_on_bail: number;
    total_witnesses: number;
    witness_details: object;
    hearings: object[];
    next_hearing_date: string | null;
    current_stage_of_trial: string;
    date_of_framing_charges: string | null;
    date_of_judgment: string | null;
    judgment_result: string;
    reason_for_acquittal: string;
    total_accused_convicted: number;
    accused_convictions: object[];
    fine_amount: string;
    victim_compensation: string;
    higher_court_details: object;
    status: 'draft' | 'pending_approval' | 'approved';
    created_by: string | null;
    approved_by: string | null;
    created_at?: string;
    updated_at?: string;
}
