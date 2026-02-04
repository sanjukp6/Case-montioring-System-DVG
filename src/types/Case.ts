// TypeScript interfaces for the Case Monitoring System

export interface Hearing {
  id: string;
  date: string;
  stageOfTrial: string;
}

export interface WitnessDetails {
  complainantWitness: { supported: number; hostile: number };
  mahazarSeizureWitness: { supported: number; hostile: number };
  ioWitness: { supported: number; hostile: number };
  eyeWitness: { supported: number; hostile: number };
  otherWitness: { supported: number; hostile: number };
}

export interface HigherCourtDetails {
  proceedingsPending: boolean;
  proceedingType: string; // REV / REW / APP / CP / WP
  courtName: string;
  petitionerParty: string;
  petitionNumber: string;
  dateOfFiling: string;
  petitionStatus: string; // Pending / Disposed
  natureOfDisposal: string;
  actionAfterDisposal: string;
}

export interface AccusedConviction {
  name: string;
  sentence: string;
}

export interface CaseData {
  id: string;
  // Step 1: Basic Case Details
  slNo: string;
  policeStation: string;
  crimeNumber: string;
  sectionsOfLaw: string;
  investigatingOfficer: string;
  publicProsecutor: string;

  // Step 2: Charge Sheet & Court Details
  dateOfChargeSheet: string;
  ccNoScNo: string;
  courtName: string;

  // Step 3: Accused Information
  totalAccused: number;
  accusedNames: string;
  accusedInJudicialCustody: number;
  accusedOnBail: number;

  // Step 4: Witness Details
  totalWitnesses: number;
  witnessDetails: WitnessDetails;

  // Step 5: Trial & Hearing Tracking
  hearings: Hearing[];
  nextHearingDate: string;
  currentStageOfTrial: string;
  dateOfFramingCharges: string;
  dateOfJudgment: string;

  // Step 6: Judgment & Outcome
  judgmentResult: string; // Convicted / Acquitted / Partly
  reasonForAcquittal: string;
  totalAccusedConvicted: number;
  accusedConvictions: AccusedConviction[];
  fineAmount: string;
  victimCompensation: string;

  // Step 7: Higher Court Proceedings
  higherCourtDetails: HigherCourtDetails;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export const initialCaseData: CaseData = {
  id: '',
  slNo: '',
  policeStation: '',
  crimeNumber: '',
  sectionsOfLaw: '',
  investigatingOfficer: '',
  publicProsecutor: '',
  dateOfChargeSheet: '',
  ccNoScNo: '',
  courtName: '',
  totalAccused: 0,
  accusedNames: '',
  accusedInJudicialCustody: 0,
  accusedOnBail: 0,
  totalWitnesses: 0,
  witnessDetails: {
    complainantWitness: { supported: 0, hostile: 0 },
    mahazarSeizureWitness: { supported: 0, hostile: 0 },
    ioWitness: { supported: 0, hostile: 0 },
    eyeWitness: { supported: 0, hostile: 0 },
    otherWitness: { supported: 0, hostile: 0 },
  },
  hearings: [],
  nextHearingDate: '',
  currentStageOfTrial: '',
  dateOfFramingCharges: '',
  dateOfJudgment: '',
  judgmentResult: '',
  reasonForAcquittal: '',
  totalAccusedConvicted: 0,
  accusedConvictions: [],
  fineAmount: '',
  victimCompensation: '',
  higherCourtDetails: {
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
  createdAt: '',
  updatedAt: '',
};
