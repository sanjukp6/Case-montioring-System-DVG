import React, { useState } from 'react';
import { useCases } from '../context/CaseContext';
import { useAuth } from '../context/AuthContext';
import {
    Calendar,
    Search,
    Save,
    Plus,
    Trash2,
    AlertCircle,
    CheckCircle,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const HearingUpdate: React.FC = () => {
    const { cases, updateCase } = useCases();
    const { user, hasRole } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState('');

    // Filter cases based on user role
    let visibleCases = cases;
    if (user?.role === 'SHO') {
        visibleCases = cases.filter((c) => c.policeStation === user.policeStation);
    }

    // Apply search
    const filteredCases = visibleCases.filter(
        (c) =>
            c.crimeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.accusedNames.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedCase = selectedCaseId
        ? cases.find((c) => c.id === selectedCaseId)
        : null;

    const [newHearingDate, setNewHearingDate] = useState('');
    const [newHearingStage, setNewHearingStage] = useState('');

    const handleAddHearing = () => {
        if (!selectedCase || !newHearingDate) return;

        const updatedCase = {
            ...selectedCase,
            hearings: [
                ...selectedCase.hearings,
                {
                    id: uuidv4(),
                    date: newHearingDate,
                    stageOfTrial: newHearingStage,
                },
            ],
            nextHearingDate: newHearingDate,
            currentStageOfTrial: newHearingStage || selectedCase.currentStageOfTrial,
        };

        updateCase(updatedCase);
        setNewHearingDate('');
        setNewHearingStage('');
        setSuccessMessage('Hearing date added successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleRemoveHearing = (hearingId: string) => {
        if (!selectedCase) return;

        const updatedHearings = selectedCase.hearings.filter((h) => h.id !== hearingId);
        const latestHearing = updatedHearings.length > 0
            ? updatedHearings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
            : null;

        const updatedCase = {
            ...selectedCase,
            hearings: updatedHearings,
            nextHearingDate: latestHearing?.date || '',
        };

        updateCase(updatedCase);
    };

    const trialStages = [
        'Filing of Charge Sheet',
        'Cognizance',
        'Appearance',
        'Framing of Charges',
        'Prosecution Evidence',
        'Defense Evidence',
        'Final Arguments',
        'Judgment',
        'Sentencing',
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Update Hearing Dates</h1>
                <p className="text-gray-600">Add or modify court hearing dates for cases</p>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="flex items-center space-x-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    <CheckCircle size={18} />
                    <span>{successMessage}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Case Selection */}
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Case</h2>

                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by Crime No or Accused..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Case List */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {filteredCases.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No cases found</p>
                        ) : (
                            filteredCases.map((caseItem) => (
                                <button
                                    key={caseItem.id}
                                    onClick={() => setSelectedCaseId(caseItem.id)}
                                    className={`w-full text-left p-3 rounded-lg border transition ${selectedCaseId === caseItem.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <p className="font-semibold text-blue-700">{caseItem.crimeNumber}</p>
                                    <p className="text-sm text-gray-600">{caseItem.policeStation}</p>
                                    <p className="text-xs text-gray-500 truncate">{caseItem.accusedNames}</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Hearing Details */}
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Hearing Details</h2>

                    {!selectedCase ? (
                        <div className="text-center py-12 text-gray-500">
                            <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                            <p>Select a case to manage hearing dates</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Case Info */}
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="font-semibold text-gray-800">{selectedCase.crimeNumber}</p>
                                <p className="text-sm text-gray-600">{selectedCase.courtName}</p>
                                <p className="text-sm text-gray-500">
                                    Current Stage: {selectedCase.currentStageOfTrial || 'Not set'}
                                </p>
                            </div>

                            {/* Add New Hearing */}
                            <div className="border border-dashed border-gray-300 rounded-lg p-4">
                                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                                    <Plus size={18} className="mr-2" />
                                    Add New Hearing Date
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Hearing Date *</label>
                                        <input
                                            type="date"
                                            value={newHearingDate}
                                            onChange={(e) => setNewHearingDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Stage of Trial</label>
                                        <select
                                            value={newHearingStage}
                                            onChange={(e) => setNewHearingStage(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Select stage...</option>
                                            {trialStages.map((stage) => (
                                                <option key={stage} value={stage}>
                                                    {stage}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleAddHearing}
                                        disabled={!newHearingDate}
                                        className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save size={18} />
                                        <span>Add Hearing</span>
                                    </button>
                                </div>
                            </div>

                            {/* Existing Hearings */}
                            <div>
                                <h3 className="font-medium text-gray-700 mb-3">Existing Hearings</h3>
                                {selectedCase.hearings.length === 0 ? (
                                    <p className="text-gray-500 text-sm text-center py-4">No hearings recorded</p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedCase.hearings
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((hearing) => (
                                                <div
                                                    key={hearing.id}
                                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                                >
                                                    <div>
                                                        <p className="font-medium text-gray-800">
                                                            {new Date(hearing.date).toLocaleDateString('en-IN', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric',
                                                            })}
                                                        </p>
                                                        <p className="text-sm text-gray-600">{hearing.stageOfTrial || 'No stage specified'}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveHearing(hearing.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
