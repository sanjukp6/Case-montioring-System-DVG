import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { CaseData, initialCaseData, WitnessDetails, HigherCourtDetails } from '../types/Case';
import * as api from '../lib/api';
import { useCases } from '../context/CaseContext';
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';

// Excel column mapping to CaseData fields
const COLUMN_MAPPING: Record<string, keyof CaseData> = {
    'Sl No': 'slNo',
    'Police Station': 'policeStation',
    'Crime Number': 'crimeNumber',
    'Sections of Law': 'sectionsOfLaw',
    'Investigating Officer': 'investigatingOfficer',
    'Public Prosecutor': 'publicProsecutor',
    'Date of Charge Sheet': 'dateOfChargeSheet',
    'CC No / SC No': 'ccNoScNo',
    'Court Name': 'courtName',
    'Total Accused': 'totalAccused',
    'Accused Names': 'accusedNames',
    'Accused in Custody': 'accusedInJudicialCustody',
    'Accused on Bail': 'accusedOnBail',
    'Total Witnesses': 'totalWitnesses',
    'Next Hearing Date': 'nextHearingDate',
    'Current Stage': 'currentStageOfTrial',
    'Date of Framing Charges': 'dateOfFramingCharges',
    'Date of Judgment': 'dateOfJudgment',
    'Judgment Result': 'judgmentResult',
    'Reason for Acquittal': 'reasonForAcquittal',
    'Fine Amount': 'fineAmount',
    'Victim Compensation': 'victimCompensation',
};

// Default witness details for new cases
const defaultWitnessDetails: WitnessDetails = {
    complainantWitness: { supported: 0, hostile: 0 },
    mahazarSeizureWitness: { supported: 0, hostile: 0 },
    ioWitness: { supported: 0, hostile: 0 },
    eyeWitness: { supported: 0, hostile: 0 },
    otherWitness: { supported: 0, hostile: 0 },
};

// Default higher court details
const defaultHigherCourtDetails: HigherCourtDetails = {
    proceedingsPending: false,
    proceedingType: '',
    courtName: '',
    petitionerParty: '',
    petitionNumber: '',
    dateOfFiling: '',
    petitionStatus: '',
    natureOfDisposal: '',
    actionAfterDisposal: '',
};

export function ExcelUpload() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { refreshCases } = useCases();

    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parsedCases, setParsedCases] = useState<CaseData[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<api.BulkUploadResult | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Parse Excel date to string
    const parseExcelDate = (value: unknown): string => {
        if (!value) return '';
        if (typeof value === 'number') {
            // Excel serial date
            const date = XLSX.SSF.parse_date_code(value);
            if (date) {
                return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
            }
        }
        return String(value);
    };

    // Parse Excel file
    const parseExcel = (fileData: ArrayBuffer) => {
        try {
            const workbook = XLSX.read(fileData, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                setParseError('Excel file is empty or has no valid data rows');
                return;
            }

            const cases: CaseData[] = (jsonData as unknown[]).map((rowData: unknown, index: number) => {
                const row = rowData as Record<string, unknown>;
                const caseData: CaseData = {
                    ...initialCaseData,
                    id: `temp-${index}`, // Temporary ID, backend will assign real one
                    witnessDetails: { ...defaultWitnessDetails },
                    higherCourtDetails: { ...defaultHigherCourtDetails },
                    hearings: [],
                    accusedConvictions: [],
                };

                // Map columns to case fields
                Object.entries(COLUMN_MAPPING).forEach(([excelCol, caseField]) => {
                    const value = row[excelCol];
                    if (value !== undefined && value !== null && value !== '') {
                        if (caseField.includes('Date') || caseField === 'nextHearingDate') {
                            (caseData as unknown as Record<string, unknown>)[caseField] = parseExcelDate(value);
                        } else if (typeof caseData[caseField] === 'number') {
                            (caseData as unknown as Record<string, unknown>)[caseField] = Number(value) || 0;
                        } else {
                            (caseData as unknown as Record<string, unknown>)[caseField] = String(value);
                        }
                    }
                });

                return caseData;
            });

            setParsedCases(cases);
            setParseError(null);
        } catch (err) {
            console.error('Excel parse error:', err);
            setParseError('Failed to parse Excel file. Please check the file format.');
        }
    };

    // Handle file selection
    const handleFileSelect = (selectedFile: File) => {
        if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
            setParseError('Please select an Excel file (.xlsx or .xls)');
            return;
        }

        setFile(selectedFile);
        setParsedCases([]);
        setUploadResult(null);
        setUploadError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            if (data instanceof ArrayBuffer) {
                parseExcel(data);
            }
        };
        reader.onerror = () => {
            setParseError('Failed to read file');
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    // Handle drag events
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    };

    // Handle file input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFileSelect(selectedFile);
        }
    };

    // Upload cases to backend
    const handleUpload = async () => {
        if (parsedCases.length === 0) return;

        setIsUploading(true);
        setUploadError(null);
        setUploadResult(null);

        try {
            const result = await api.bulkUploadCases(parsedCases);

            if (result.success && result.data) {
                setUploadResult(result.data);
                await refreshCases();
            } else {
                setUploadError(result.error || 'Upload failed');
            }
        } catch (err) {
            console.error('Upload error:', err);
            setUploadError('Network error. Please check if the server is running.');
        } finally {
            setIsUploading(false);
        }
    };

    // Download sample template
    const downloadTemplate = () => {
        const headers = Object.keys(COLUMN_MAPPING);
        const sampleData = [
            {
                'Sl No': '1',
                'Police Station': 'Example PS',
                'Crime Number': 'CR001/2025',
                'Sections of Law': 'IPC 302',
                'Investigating Officer': 'SI John Doe',
                'Public Prosecutor': 'PP Jane Smith',
                'Date of Charge Sheet': '2025-01-15',
                'CC No / SC No': 'CC 123/2025',
                'Court Name': 'District Court',
                'Total Accused': 2,
                'Accused Names': 'Accused 1, Accused 2',
                'Accused in Custody': 1,
                'Accused on Bail': 1,
                'Total Witnesses': 5,
                'Next Hearing Date': '2025-02-20',
                'Current Stage': 'Trial',
                'Date of Framing Charges': '2025-01-20',
                'Date of Judgment': '',
                'Judgment Result': '',
                'Reason for Acquittal': '',
                'Fine Amount': '',
                'Victim Compensation': '',
            },
        ];

        const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Cases');
        XLSX.writeFile(wb, 'case_upload_template.xlsx');
    };

    // Clear current file
    const clearFile = () => {
        setFile(null);
        setParsedCases([]);
        setParseError(null);
        setUploadResult(null);
        setUploadError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                        <h1 className="text-2xl font-bold text-gray-900">Upload Cases from Excel</h1>
                    </div>
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download Template
                    </button>
                </div>

                {/* Upload Area */}
                {!uploadResult && (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                            ? 'border-blue-500 bg-blue-50'
                            : file
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                    >
                        {file ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center space-x-2">
                                    <FileSpreadsheet className="h-12 w-12 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-lg font-medium text-gray-900">{file.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {parsedCases.length} cases found
                                    </p>
                                </div>
                                <button
                                    onClick={clearFile}
                                    className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-red-600"
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Remove file
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                                <div>
                                    <p className="text-lg font-medium text-gray-700">
                                        Drag & drop your Excel file here
                                    </p>
                                    <p className="text-sm text-gray-500">or</p>
                                </div>
                                <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleInputChange}
                                        className="hidden"
                                    />
                                    Browse Files
                                </label>
                                <p className="text-xs text-gray-400">Supported formats: .xlsx, .xls</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Parse Error */}
                {parseError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Error parsing file</p>
                            <p className="text-sm text-red-600">{parseError}</p>
                        </div>
                    </div>
                )}

                {/* Preview Table */}
                {parsedCases.length > 0 && !uploadResult && (
                    <div className="mt-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Preview ({parsedCases.length} cases)</h2>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Police Station</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crime Number</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sections</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IO</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {parsedCases.slice(0, 10).map((c, index) => (
                                        <tr key={index} className={!c.policeStation || !c.crimeNumber ? 'bg-red-50' : ''}>
                                            <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                                            <td className="px-4 py-2 text-sm text-gray-900">{c.policeStation || <span className="text-red-500">Required</span>}</td>
                                            <td className="px-4 py-2 text-sm text-gray-900">{c.crimeNumber || <span className="text-red-500">Required</span>}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{c.sectionsOfLaw || '-'}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{c.investigatingOfficer || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {parsedCases.length > 10 && (
                                <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500">
                                    ... and {parsedCases.length - 10} more cases
                                </div>
                            )}
                        </div>

                        {/* Upload Button */}
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={clearFile}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload {parsedCases.length} Cases
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Upload Error */}
                {uploadError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Upload failed</p>
                            <p className="text-sm text-red-600">{uploadError}</p>
                        </div>
                    </div>
                )}

                {/* Upload Result */}
                {uploadResult && (
                    <div className="mt-6 space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                                <div>
                                    <p className="text-lg font-semibold text-green-800">Upload Complete</p>
                                    <p className="text-sm text-green-600">
                                        {uploadResult.inserted} new cases added, {uploadResult.updated} cases updated
                                    </p>
                                </div>
                            </div>
                        </div>

                        {uploadResult.errors.length > 0 && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm font-medium text-yellow-800 mb-2">
                                    {uploadResult.errors.length} rows had errors:
                                </p>
                                <ul className="text-sm text-yellow-700 list-disc list-inside">
                                    {uploadResult.errors.map((err, index) => (
                                        <li key={index}>Row {err.row}: {err.error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={clearFile}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Upload More
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Instructions:</h3>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                        <li><strong>Police Station</strong> and <strong>Crime Number</strong> are required fields</li>
                        <li>Existing cases are matched by Crime Number + Police Station and will be updated</li>
                        <li>New cases will be inserted automatically</li>
                        <li>Download the template for the correct column format</li>
                        <li>Dates should be in YYYY-MM-DD format</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
