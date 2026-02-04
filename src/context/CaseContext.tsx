import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { CaseData } from '../types/Case';
import { v4 as uuidv4 } from 'uuid';

interface CaseContextType {
  cases: CaseData[];
  isLoading: boolean;
  addCase: (caseData: CaseData) => Promise<{ success: boolean; error?: string }>;
  updateCase: (caseData: CaseData) => Promise<{ success: boolean; error?: string }>;
  deleteCase: (id: string) => Promise<{ success: boolean; error?: string }>;
  getCaseById: (id: string) => CaseData | undefined;
  getCaseByCrimeNumber: (crimeNumber: string) => CaseData | undefined;
  searchCases: (query: string) => CaseData[];
  refreshCases: () => Promise<void>;
}

const CaseContext = createContext<CaseContextType | undefined>(undefined);

// Convert database row to CaseData
const dbToCaseData = (row: any): CaseData => ({
  id: row.id,
  slNo: row.sl_no || '',
  policeStation: row.police_station,
  crimeNumber: row.crime_number,
  sectionsOfLaw: row.sections_of_law,
  investigatingOfficer: row.investigating_officer,
  publicProsecutor: row.public_prosecutor || '',
  dateOfChargeSheet: row.date_of_charge_sheet || '',
  ccNoScNo: row.cc_no_sc_no || '',
  courtName: row.court_name || '',
  totalAccused: row.total_accused || 0,
  accusedNames: row.accused_names || '',
  accusedInJudicialCustody: row.accused_in_judicial_custody || 0,
  accusedOnBail: row.accused_on_bail || 0,
  totalWitnesses: row.total_witnesses || 0,
  witnessDetails: row.witness_details || {
    complainantWitness: { supported: 0, hostile: 0 },
    mahazarSeizureWitness: { supported: 0, hostile: 0 },
    ioWitness: { supported: 0, hostile: 0 },
    eyeWitness: { supported: 0, hostile: 0 },
    otherWitness: { supported: 0, hostile: 0 },
  },
  hearings: row.hearings || [],
  nextHearingDate: row.next_hearing_date || '',
  currentStageOfTrial: row.current_stage_of_trial || '',
  dateOfFramingCharges: row.date_of_framing_charges || '',
  dateOfJudgment: row.date_of_judgment || '',
  judgmentResult: row.judgment_result || '',
  reasonForAcquittal: row.reason_for_acquittal || '',
  totalAccusedConvicted: row.total_accused_convicted || 0,
  accusedConvictions: row.accused_convictions || [],
  fineAmount: row.fine_amount || '',
  victimCompensation: row.victim_compensation || '',
  higherCourtDetails: row.higher_court_details || {
    proceedingsPending: false,
    proceedingType: '',
    courtName: '',
    petitionerParty: '',
    petitionNumber: '',
    dateOfFiling: '',
    petitionStatus: '',
    natureOfDisposal: '',
    actionAfterDisposal: '',
  },
  createdAt: row.created_at || '',
  updatedAt: row.updated_at || '',
});

// Convert CaseData to database row
const caseDataToDb = (caseData: CaseData) => ({
  sl_no: caseData.slNo,
  police_station: caseData.policeStation,
  crime_number: caseData.crimeNumber,
  sections_of_law: caseData.sectionsOfLaw,
  investigating_officer: caseData.investigatingOfficer,
  public_prosecutor: caseData.publicProsecutor,
  date_of_charge_sheet: caseData.dateOfChargeSheet || null,
  cc_no_sc_no: caseData.ccNoScNo,
  court_name: caseData.courtName,
  total_accused: caseData.totalAccused,
  accused_names: caseData.accusedNames,
  accused_in_judicial_custody: caseData.accusedInJudicialCustody,
  accused_on_bail: caseData.accusedOnBail,
  total_witnesses: caseData.totalWitnesses,
  witness_details: caseData.witnessDetails,
  hearings: caseData.hearings,
  next_hearing_date: caseData.nextHearingDate || null,
  current_stage_of_trial: caseData.currentStageOfTrial,
  date_of_framing_charges: caseData.dateOfFramingCharges || null,
  date_of_judgment: caseData.dateOfJudgment || null,
  judgment_result: caseData.judgmentResult,
  reason_for_acquittal: caseData.reasonForAcquittal,
  total_accused_convicted: caseData.totalAccusedConvicted,
  accused_convictions: caseData.accusedConvictions,
  fine_amount: caseData.fineAmount,
  victim_compensation: caseData.victimCompensation,
  higher_court_details: caseData.higherCourtDetails,
});

export const CaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<CaseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch cases from Supabase on mount
  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cases from Supabase:', error);
        // Show empty state - no fallback to local data
        setCases([]);
      } else if (data && data.length > 0) {
        setCases(data.map(dbToCaseData));
      } else {
        // No data in Supabase - show empty state
        setCases([]);
      }
    } catch (err) {
      console.error('Error fetching cases:', err);
      setCases([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const refreshCases = async () => {
    await fetchCases();
  };

  // Audit log helper function
  const logAudit = async (action: string, caseId: string, crimeNumber: string, details?: string) => {
    try {
      // Get current user from localStorage
      const storedUser = localStorage.getItem('davangere_user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;

      await supabase.from('audit_logs').insert({
        action,
        case_id: caseId,
        crime_number: crimeNumber,
        user_id: currentUser?.id || null,
        user_name: currentUser?.name || 'Unknown User',
        user_role: currentUser?.role || 'Unknown',
        details: details || null,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging audit:', error);
    }
  };

  const addCase = async (caseData: CaseData): Promise<{ success: boolean; error?: string }> => {
    try {
      const newCaseDb = caseDataToDb(caseData);

      const { data, error } = await supabase
        .from('cases')
        .insert(newCaseDb)
        .select()
        .single();

      if (error) {
        console.error('Error adding case:', error);
        return { success: false, error: error.message };
      }

      if (data) {
        setCases((prev) => [dbToCaseData(data), ...prev]);
        // Log audit
        await logAudit('CASE_CREATED', data.id, data.crime_number, `New case registered: ${data.crime_number}`);
      }
      return { success: true };
    } catch (err) {
      console.error('Error adding case:', err);
      return { success: false, error: 'Failed to add case' };
    }
  };

  const updateCase = async (caseData: CaseData): Promise<{ success: boolean; error?: string }> => {
    try {
      const updateData = caseDataToDb(caseData);

      const { error } = await supabase
        .from('cases')
        .update(updateData)
        .eq('id', caseData.id);

      if (error) {
        console.error('Error updating case:', error);
        return { success: false, error: error.message };
      }

      setCases((prev) =>
        prev.map((c) =>
          c.id === caseData.id
            ? { ...caseData, updatedAt: new Date().toISOString() }
            : c
        )
      );

      // Log audit
      await logAudit('CASE_UPDATED', caseData.id, caseData.crimeNumber, `Case updated: ${caseData.crimeNumber}`);

      return { success: true };
    } catch (err) {
      console.error('Error updating case:', err);
      return { success: false, error: 'Failed to update case' };
    }
  };

  const deleteCase = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get case info before deleting for audit log
      const caseToDelete = cases.find(c => c.id === id);

      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting case:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      setCases((prev) => prev.filter((c) => c.id !== id));

      // Log audit
      if (caseToDelete) {
        await logAudit('CASE_DELETED', id, caseToDelete.crimeNumber, `Case deleted: ${caseToDelete.crimeNumber}`);
      }

      return { success: true };
    } catch (err) {
      console.error('Error deleting case:', err);
      return { success: false, error: 'Failed to delete case' };
    }
  };

  const getCaseById = (id: string) => {
    return cases.find((c) => c.id === id);
  };

  const getCaseByCrimeNumber = (crimeNumber: string) => {
    return cases.find((c) => c.crimeNumber === crimeNumber);
  };

  const searchCases = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return cases.filter(
      (c) =>
        c.crimeNumber.toLowerCase().includes(lowerQuery) ||
        c.policeStation.toLowerCase().includes(lowerQuery) ||
        c.accusedNames.toLowerCase().includes(lowerQuery) ||
        c.investigatingOfficer.toLowerCase().includes(lowerQuery)
    );
  };

  return (
    <CaseContext.Provider
      value={{
        cases,
        isLoading,
        addCase,
        updateCase,
        deleteCase,
        getCaseById,
        getCaseByCrimeNumber,
        searchCases,
        refreshCases,
      }}
    >
      {children}
    </CaseContext.Provider>
  );
};

export const useCases = () => {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error('useCases must be used within a CaseProvider');
  }
  return context;
};
