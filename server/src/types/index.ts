// TypeScript interfaces for the backend

export type UserRole = 'Writer' | 'SHO' | 'SP';

export interface User {
    id: string;
    username: string;
    password?: string; // Only included when needed
    name: string;
    role: UserRole;
    policeStation: string;
    employeeNumber: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DbUser {
    id: string;
    username: string;
    password: string;
    name: string;
    role: UserRole;
    police_station: string;
    employee_number: string;
    created_at?: string;
    updated_at?: string;
}

export interface WitnessDetails {
    complainantWitness: { supported: number; hostile: number };
    mahazarSeizureWitness: { supported: number; hostile: number };
    ioWitness: { supported: number; hostile: number };
    eyeWitness: { supported: number; hostile: number };
    otherWitness: { supported: number; hostile: number };
}

export interface Hearing {
    id: string;
    date: string;
    stageOfTrial: string;
}

export interface HigherCourtDetails {
    proceedingsPending: boolean;
    proceedingType: string;
    courtName: string;
    petitionerParty: string;
    petitionNumber: string;
    dateOfFiling: string;
    petitionStatus: string;
    natureOfDisposal: string;
    actionAfterDisposal: string;
}

export interface AccusedConviction {
    name: string;
    sentence: string;
}

export interface CaseData {
    id: string;
    slNo: string;
    policeStation: string;
    crimeNumber: string;
    sectionsOfLaw: string;
    investigatingOfficer: string;
    publicProsecutor: string;
    dateOfChargeSheet: string;
    ccNoScNo: string;
    courtName: string;
    totalAccused: number;
    accusedNames: string;
    accusedInJudicialCustody: number;
    accusedOnBail: number;
    totalWitnesses: number;
    witnessDetails: WitnessDetails;
    hearings: Hearing[];
    nextHearingDate: string;
    currentStageOfTrial: string;
    dateOfFramingCharges: string;
    dateOfJudgment: string;
    judgmentResult: string;
    reasonForAcquittal: string;
    totalAccusedConvicted: number;
    accusedConvictions: AccusedConviction[];
    fineAmount: string;
    victimCompensation: string;
    higherCourtDetails: HigherCourtDetails;
    status?: 'draft' | 'pending_approval' | 'approved';
    createdBy?: string;
    approvedBy?: string;
    createdAt?: string;
    updatedAt?: string;
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
    witness_details: WitnessDetails | string | null;  // MySQL JSON can be string or parsed object
    hearings: Hearing[] | string | null;
    next_hearing_date: string | null;
    current_stage_of_trial: string;
    date_of_framing_charges: string | null;
    date_of_judgment: string | null;
    judgment_result: string;
    reason_for_acquittal: string;
    total_accused_convicted: number;
    accused_convictions: AccusedConviction[] | string | null;
    fine_amount: string;
    victim_compensation: string;
    higher_court_details: HigherCourtDetails | string | null;
    status: 'draft' | 'pending_approval' | 'approved';
    created_by: string | null;
    approved_by: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface AuditLog {
    id: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: string;
    ipAddress?: string;
    createdAt: string;
}

export interface JwtPayload {
    userId: string;
    username: string;
    role: UserRole;
    policeStation: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
