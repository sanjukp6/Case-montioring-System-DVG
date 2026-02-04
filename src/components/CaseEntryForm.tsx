import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CaseData, initialCaseData, Hearing, AccusedConviction } from '../types/Case';
import { useCases } from '../context/CaseContext';
import { useAuth } from '../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Plus,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';

const STEPS = [
  'Basic Case Details',
  'Charge Sheet & Court',
  'Accused Information',
  'Witness Details',
  'Trial & Hearing',
  'Judgment & Outcome',
  'Higher Court Proceedings',
];

export const CaseEntryForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addCase, updateCase, getCaseById } = useCases();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<CaseData>(initialCaseData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedSteps, setSavedSteps] = useState<boolean[]>(new Array(7).fill(false));

  // Auto-fill police station from logged-in user
  useEffect(() => {
    if (!id && user?.policeStation) {
      setFormData(prev => ({
        ...prev,
        policeStation: user.policeStation
      }));
    }
  }, [user, id]);

  useEffect(() => {
    if (id) {
      const existingCase = getCaseById(id);
      if (existingCase) {
        setFormData(existingCase);
        setSavedSteps(new Array(7).fill(true));
      }
    }
  }, [id, getCaseById]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleWitnessChange = (
    category: keyof typeof formData.witnessDetails,
    field: 'supported' | 'hostile',
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      witnessDetails: {
        ...prev.witnessDetails,
        [category]: {
          ...prev.witnessDetails[category],
          [field]: parseInt(value) || 0,
        },
      },
    }));
  };

  const handleHigherCourtChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      higherCourtDetails: {
        ...prev.higherCourtDetails,
        [name]: type === 'checkbox' ? checked : value,
      },
    }));
  };

  const addHearing = () => {
    const newHearing: Hearing = { id: uuidv4(), date: '', stageOfTrial: '' };
    setFormData((prev) => ({
      ...prev,
      hearings: [...prev.hearings, newHearing],
    }));
  };

  const removeHearing = (hearingId: string) => {
    setFormData((prev) => ({
      ...prev,
      hearings: prev.hearings.filter((h) => h.id !== hearingId),
    }));
  };

  const updateHearing = (hearingId: string, field: keyof Hearing, value: string) => {
    setFormData((prev) => ({
      ...prev,
      hearings: prev.hearings.map((h) =>
        h.id === hearingId ? { ...h, [field]: value } : h
      ),
    }));
  };

  const addAccusedConviction = () => {
    setFormData((prev) => ({
      ...prev,
      accusedConvictions: [...prev.accusedConvictions, { name: '', sentence: '' }],
    }));
  };

  const removeAccusedConviction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      accusedConvictions: prev.accusedConvictions.filter((_, i) => i !== index),
    }));
  };

  const updateAccusedConviction = (
    index: number,
    field: keyof AccusedConviction,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      accusedConvictions: prev.accusedConvictions.map((ac, i) =>
        i === index ? { ...ac, [field]: value } : ac
      ),
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0:
        if (!formData.policeStation) newErrors.policeStation = 'Police Station is required';
        if (!formData.crimeNumber) newErrors.crimeNumber = 'Crime Number is required';
        if (!formData.sectionsOfLaw) newErrors.sectionsOfLaw = 'Sections of Law is required';
        if (!formData.investigatingOfficer) newErrors.investigatingOfficer = 'IO Name is required';
        break;
      case 1:
        if (!formData.dateOfChargeSheet) newErrors.dateOfChargeSheet = 'Date of Charge Sheet is required';
        if (!formData.ccNoScNo) newErrors.ccNoScNo = 'CC No / SC No is required';
        if (!formData.courtName) newErrors.courtName = 'Court Name is required';
        break;
      case 2:
        if (formData.totalAccused < 1) newErrors.totalAccused = 'At least 1 accused is required';
        if (!formData.accusedNames) newErrors.accusedNames = 'Accused names are required';
        break;
      case 3:
        if (formData.totalWitnesses < 0) newErrors.totalWitnesses = 'Invalid witness count';
        break;
      case 4:
        // No mandatory fields for trial tracking
        break;
      case 5:
        // Judgment details are optional until case is concluded
        break;
      case 6:
        // Higher court details are optional
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [isSaving, setIsSaving] = useState(false);

  const saveStep = async () => {
    if (!validateStep(currentStep)) {
      return false;
    }

    const newSavedSteps = [...savedSteps];
    newSavedSteps[currentStep] = true;
    setSavedSteps(newSavedSteps);

    // Save to database after Step 1 (index 0) or update if already has ID
    if (currentStep === 0 || formData.id) {
      setIsSaving(true);
      try {
        if (formData.id || id) {
          // Update existing case
          const result = await updateCase(formData);
          if (!result.success) {
            console.error('Failed to update case:', result.error);
          }
        } else {
          // Create new draft case
          const result = await addCase(formData);
          if (result.success) {
            // Refresh to get the new case with ID
            // The case is now saved, user can continue editing
          } else {
            console.error('Failed to save draft:', result.error);
            alert('Failed to save case. Please try again.');
            setIsSaving(false);
            return false;
          }
        }
      } catch (error) {
        console.error('Error saving case:', error);
      }
      setIsSaving(false);
    }

    return true;
  };

  const handleNext = async () => {
    const saved = await saveStep();
    if (saved) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!savedSteps.slice(0, 3).every(Boolean)) {
      alert('Please complete and save at least the first 3 steps before submitting.');
      return;
    }

    try {
      if (id) {
        const result = await updateCase(formData);
        if (!result.success) {
          alert('Error updating case: ' + (result.error || 'Unknown error'));
          return;
        }
      } else {
        const result = await addCase(formData);
        if (!result.success) {
          alert('Error adding case: ' + (result.error || 'Unknown error'));
          return;
        }
      }
      navigate('/');
    } catch (error) {
      console.error('Error saving case:', error);
      alert('Failed to save case. Please try again.');
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8 overflow-x-auto">
      <div className="flex min-w-max items-center justify-center space-x-2">
        {STEPS.map((step, index) => (
          <React.Fragment key={index}>
            <button
              onClick={() => {
                if (index <= currentStep || savedSteps[index - 1] || index === 0) {
                  setCurrentStep(index);
                }
              }}
              className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${currentStep === index
                ? 'bg-blue-600 text-white shadow-lg'
                : savedSteps[index]
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${currentStep === index
                  ? 'bg-white text-blue-600'
                  : savedSteps[index]
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                  }`}
              >
                {savedSteps[index] ? <Check size={14} /> : index + 1}
              </span>
              <span className="hidden md:inline">{step}</span>
            </button>
            {index < STEPS.length - 1 && (
              <ChevronRight size={16} className="text-gray-400" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderInputField = (
    label: string,
    name: string,
    type: string = 'text',
    required: boolean = false,
    placeholder?: string
  ) => (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={(formData as any)[name] || ''}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${errors[name] ? 'border-red-500 bg-red-50' : 'border-gray-300'
          }`}
      />
      {errors[name] && (
        <p className="mt-1 flex items-center text-sm text-red-500">
          <AlertCircle size={14} className="mr-1" /> {errors[name]}
        </p>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="grid gap-4 md:grid-cols-2">
      {renderInputField('Sl No', 'slNo', 'text', false, 'e.g., 001')}

      {/* Police Station Dropdown */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Police Station (PS Name) <span className="text-red-500">*</span>
        </label>
        <select
          name="policeStation"
          value={formData.policeStation}
          onChange={handleChange}
          className={`w-full rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${errors.policeStation ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
        >
          <option value="">-- Select Police Station --</option>
          <option value="Davangere City PS">Davangere City PS</option>
          <option value="Davangere Rural PS">Davangere Rural PS</option>
          <option value="Harihar PS">Harihar PS</option>
          <option value="Harpanahalli PS">Harpanahalli PS</option>
          <option value="Jagalur PS">Jagalur PS</option>
          <option value="Channagiri PS">Channagiri PS</option>
          <option value="Nyamathi PS">Nyamathi PS</option>
          <option value="Mayakonda PS">Mayakonda PS</option>
          <option value="Hadadi PS">Hadadi PS</option>
          <option value="Bada PS">Bada PS</option>
          <option value="Kundgol PS">Kundgol PS</option>
          <option value="Lokikere PS">Lokikere PS</option>
          <option value="Traffic PS">Traffic PS</option>
          <option value="Women PS">Women PS</option>
          <option value="Cyber Crime PS">Cyber Crime PS</option>
          <option value="District HQ">District HQ</option>
        </select>
        {errors.policeStation && (
          <p className="mt-1 flex items-center text-sm text-red-500">
            <AlertCircle size={14} className="mr-1" /> {errors.policeStation}
          </p>
        )}
      </div>

      {renderInputField('Crime Number', 'crimeNumber', 'text', true, 'e.g., CR/2024/001')}
      {renderInputField('Section(s) of Law', 'sectionsOfLaw', 'text', true, 'e.g., IPC 302, 307')}
      {renderInputField('Name of Investigating Officer (IO)', 'investigatingOfficer', 'text', true, 'e.g., SI Ramesh Kumar')}
      {renderInputField('Name of Public Prosecutor / APP', 'publicProsecutor', 'text', false, 'e.g., Adv. Suresh Patil')}
    </div>
  );

  const renderStep2 = () => (
    <div className="grid gap-4 md:grid-cols-2">
      {renderInputField('Date of Charge Sheet', 'dateOfChargeSheet', 'date', true)}
      {renderInputField('CC No / SC No', 'ccNoScNo', 'text', true, 'e.g., SC/2024/125')}
      {renderInputField('Name of the Court', 'courtName', 'text', true, 'e.g., Sessions Court, Davangere')}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {renderInputField('Total Number of Accused Persons', 'totalAccused', 'number', true)}
        {renderInputField('Total Accused in Judicial Custody (JC)', 'accusedInJudicialCustody', 'number')}
        {renderInputField('Total Accused on Bail', 'accusedOnBail', 'number')}
      </div>
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Accused Names <span className="text-red-500">*</span>
        </label>
        <textarea
          name="accusedNames"
          value={formData.accusedNames}
          onChange={handleChange}
          rows={4}
          placeholder="Enter accused names, one per line or comma-separated"
          className={`w-full rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${errors.accusedNames ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
        />
        {errors.accusedNames && (
          <p className="mt-1 flex items-center text-sm text-red-500">
            <AlertCircle size={14} className="mr-1" /> {errors.accusedNames}
          </p>
        )}
      </div>
    </div>
  );

  const renderWitnessRow = (
    label: string,
    category: keyof typeof formData.witnessDetails
  ) => (
    <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-3">
      <div className="flex items-center font-medium text-gray-700">{label}</div>
      <div>
        <input
          type="number"
          min="0"
          value={formData.witnessDetails[category].supported}
          onChange={(e) => handleWitnessChange(category, 'supported', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <input
          type="number"
          min="0"
          value={formData.witnessDetails[category].hostile}
          onChange={(e) => handleWitnessChange(category, 'hostile', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      {renderInputField('Total Number of Witnesses', 'totalWitnesses', 'number')}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-4 font-semibold text-gray-800">Witness Breakdown (Supported vs Hostile)</h4>
        <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-2 font-semibold text-gray-600">
          <div>Witness Type</div>
          <div className="text-center">Supported</div>
          <div className="text-center">Hostile</div>
        </div>
        {renderWitnessRow('Complainant Witness', 'complainantWitness')}
        {renderWitnessRow('Mahazar / Seizure Witness', 'mahazarSeizureWitness')}
        {renderWitnessRow('IO Witness', 'ioWitness')}
        {renderWitnessRow('Eye Witness', 'eyeWitness')}
        {renderWitnessRow('Other Witness', 'otherWitness')}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-semibold text-gray-800">Hearing Dates & Stages</h4>
          <button
            type="button"
            onClick={addHearing}
            className="flex items-center space-x-1 rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
          >
            <Plus size={16} /> <span>Add Hearing</span>
          </button>
        </div>
        {formData.hearings.length === 0 ? (
          <p className="py-4 text-center text-gray-500">No hearings added yet. Click "Add Hearing" to begin.</p>
        ) : (
          <div className="space-y-2">
            {formData.hearings.map((hearing, index) => (
              <div
                key={hearing.id}
                className="flex items-center space-x-4 rounded-lg bg-white p-3 shadow-sm"
              >
                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                <input
                  type="date"
                  value={hearing.date}
                  onChange={(e) => updateHearing(hearing.id, 'date', e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={hearing.stageOfTrial}
                  onChange={(e) => updateHearing(hearing.id, 'stageOfTrial', e.target.value)}
                  placeholder="Stage of Trial"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeHearing(hearing.id)}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Next Hearing Date <span className="text-red-500">⚠ Important</span>
          </label>
          <input
            type="date"
            name="nextHearingDate"
            value={formData.nextHearingDate}
            onChange={handleChange}
            className="w-full rounded-lg border-2 border-red-300 bg-red-50 px-4 py-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>
        {renderInputField('Current Stage of Trial', 'currentStageOfTrial')}
        {renderInputField('Date of Framing of Charges', 'dateOfFramingCharges', 'date')}
        {renderInputField('Date of Judgment', 'dateOfJudgment', 'date')}
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Result of Judgment</label>
          <select
            name="judgmentResult"
            value={formData.judgmentResult}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">-- Select --</option>
            <option value="Convicted">Convicted</option>
            <option value="Acquitted">Acquitted</option>
            <option value="Partly">Partly Convicted</option>
          </select>
        </div>
        {renderInputField('Total Number of Accused Convicted', 'totalAccusedConvicted', 'number')}
      </div>

      {formData.judgmentResult === 'Acquitted' && (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Reason for Acquittal</label>
          <textarea
            name="reasonForAcquittal"
            value={formData.reasonForAcquittal}
            onChange={handleChange}
            rows={3}
            placeholder="Enter reason for acquittal"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      )}

      {(formData.judgmentResult === 'Convicted' || formData.judgmentResult === 'Partly') && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-semibold text-gray-800">Convicted Accused & Sentences</h4>
            <button
              type="button"
              onClick={addAccusedConviction}
              className="flex items-center space-x-1 rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            >
              <Plus size={16} /> <span>Add Accused</span>
            </button>
          </div>
          {formData.accusedConvictions.length === 0 ? (
            <p className="py-4 text-center text-gray-500">No convicted accused added yet.</p>
          ) : (
            <div className="space-y-2">
              {formData.accusedConvictions.map((ac, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 rounded-lg bg-white p-3 shadow-sm"
                >
                  <input
                    type="text"
                    value={ac.name}
                    onChange={(e) => updateAccusedConviction(index, 'name', e.target.value)}
                    placeholder="Accused Name"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={ac.sentence}
                    onChange={(e) => updateAccusedConviction(index, 'sentence', e.target.value)}
                    placeholder="Sentence Awarded"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeAccusedConviction(index)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {renderInputField('Fine Amount', 'fineAmount', 'text', false, 'e.g., ₹50,000')}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Victim Compensation Details</label>
          <textarea
            name="victimCompensation"
            value={formData.victimCompensation}
            onChange={handleChange}
            rows={2}
            placeholder="Enter victim compensation details"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>
    </div>
  );

  const renderStep7 = () => (
    <div className="space-y-6">
      <div className="mb-4 flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="proceedingsPending"
            checked={formData.higherCourtDetails.proceedingsPending}
            onChange={handleHigherCourtChange}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-medium text-gray-700">Criminal Proceedings Pending in Higher Court?</span>
        </label>
      </div>

      {formData.higherCourtDetails.proceedingsPending && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Type of Proceeding</label>
              <select
                name="proceedingType"
                value={formData.higherCourtDetails.proceedingType}
                onChange={handleHigherCourtChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">-- Select --</option>
                <option value="REV">REV (Revision)</option>
                <option value="REW">REW (Review)</option>
                <option value="APP">APP (Appeal)</option>
                <option value="CP">CP (Criminal Petition)</option>
                <option value="WP">WP (Writ Petition)</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Name of the Higher Court</label>
              <input
                type="text"
                name="courtName"
                value={formData.higherCourtDetails.courtName}
                onChange={handleHigherCourtChange}
                placeholder="e.g., High Court of Karnataka"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Name of Petitioner Party</label>
              <input
                type="text"
                name="petitionerParty"
                value={formData.higherCourtDetails.petitionerParty}
                onChange={handleHigherCourtChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Petition Number</label>
              <input
                type="text"
                name="petitionNumber"
                value={formData.higherCourtDetails.petitionNumber}
                onChange={handleHigherCourtChange}
                placeholder="e.g., CRL.A.123/2024"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Date of Filing</label>
              <input
                type="date"
                name="dateOfFiling"
                value={formData.higherCourtDetails.dateOfFiling}
                onChange={handleHigherCourtChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Status of Petition</label>
              <select
                name="petitionStatus"
                value={formData.higherCourtDetails.petitionStatus}
                onChange={handleHigherCourtChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">-- Select --</option>
                <option value="Pending">Pending</option>
                <option value="Disposed">Disposed</option>
              </select>
            </div>
          </div>

          {formData.higherCourtDetails.petitionStatus === 'Disposed' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Nature of Disposal</label>
                <textarea
                  name="natureOfDisposal"
                  value={formData.higherCourtDetails.natureOfDisposal}
                  onChange={handleHigherCourtChange}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Action Taken After Disposal</label>
                <textarea
                  name="actionAfterDisposal"
                  value={formData.higherCourtDetails.actionAfterDisposal}
                  onChange={handleHigherCourtChange}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep1();
      case 1: return renderStep2();
      case 2: return renderStep3();
      case 3: return renderStep4();
      case 4: return renderStep5();
      case 5: return renderStep6();
      case 6: return renderStep7();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-blue-900 md:text-3xl">
            {id ? 'Edit Case' : 'New Case Entry'}
          </h1>
          <p className="text-gray-600">Davangere Police Department - Case Monitoring System</p>
        </div>

        {renderStepIndicator()}

        <div className="rounded-xl bg-white p-6 shadow-lg md:p-8">
          <h2 className="mb-6 border-b border-gray-200 pb-4 text-xl font-semibold text-blue-800">
            Step {currentStep + 1}: {STEPS[currentStep]}
          </h2>

          {renderCurrentStep()}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={20} /> <span>Previous</span>
            </button>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={saveStep}
                disabled={isSaving}
                className="flex items-center space-x-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} /> <span>Save Step</span>
                  </>
                )}
              </button>

              {currentStep === STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
                >
                  <Check size={18} /> <span>{id ? 'Update Case' : 'Submit Case'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  <span>Next</span> <ChevronRight size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
