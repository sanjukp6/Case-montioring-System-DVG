import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../lib/api';
import { CaseData } from '../types/Case';

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

export const CaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<CaseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch cases from backend on mount
  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const result = await api.getAllCases();

      if (result.success && result.cases) {
        setCases(result.cases);
      } else {
        console.error('Error fetching cases:', result.error);
        setCases([]);
      }
    } catch (err) {
      console.error('Error fetching cases:', err);
      setCases([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Only fetch cases if authenticated
    if (api.isAuthenticated()) {
      fetchCases();
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshCases = async () => {
    await fetchCases();
  };

  const addCase = async (caseData: CaseData): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await api.createCase(caseData);

      if (result.success && result.caseData) {
        setCases((prev) => [result.caseData!, ...prev]);
        return { success: true };
      }

      return { success: false, error: result.error || 'Failed to add case' };
    } catch (err) {
      console.error('Error adding case:', err);
      return { success: false, error: 'Failed to add case. Please check if the server is running.' };
    }
  };

  const updateCase = async (caseData: CaseData): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await api.updateCase(caseData.id, caseData);

      if (result.success && result.caseData) {
        setCases((prev) =>
          prev.map((c) =>
            c.id === caseData.id ? result.caseData! : c
          )
        );
        return { success: true };
      }

      return { success: false, error: result.error || 'Failed to update case' };
    } catch (err) {
      console.error('Error updating case:', err);
      return { success: false, error: 'Failed to update case' };
    }
  };

  const deleteCase = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await api.deleteCase(id);

      if (result.success) {
        setCases((prev) => prev.filter((c) => c.id !== id));
        return { success: true };
      }

      return { success: false, error: result.error || 'Failed to delete case' };
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
