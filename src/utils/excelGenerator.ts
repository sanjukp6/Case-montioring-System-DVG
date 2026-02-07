import * as XLSX from 'xlsx';
import { CaseData } from '../types/Case';

// Helper to format date
const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
};

// Generate Excel report for a single case (horizontal layout)
export const generateExcelReport = (caseData: CaseData): void => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Case Details - Horizontal Layout
    // Headers in first row, data in second row
    const headers = [
        'Sl No',
        'Police Station',
        'Crime Number',
        'Sections of Law',
        'Investigating Officer',
        'Public Prosecutor',
        'Date of Charge Sheet',
        'CC No / SC No',
        'Court Name',
        'Total Accused',
        'Accused Names',
        'Accused in Custody',
        'Accused on Bail',
        'Total Witnesses',
        'Next Hearing Date',
        'Current Stage',
        'Date of Framing Charges',
        'Date of Judgment',
        'Judgment Result',
        'Reason for Acquittal',
        'Total Convicted',
        'Fine Amount',
        'Victim Compensation',
    ];

    const dataRow = [
        caseData.slNo || '',
        caseData.policeStation || '',
        caseData.crimeNumber || '',
        caseData.sectionsOfLaw || '',
        caseData.investigatingOfficer || '',
        caseData.publicProsecutor || '',
        formatDate(caseData.dateOfChargeSheet),
        caseData.ccNoScNo || '',
        caseData.courtName || '',
        caseData.totalAccused || 0,
        caseData.accusedNames || '',
        caseData.accusedInJudicialCustody || 0,
        caseData.accusedOnBail || 0,
        caseData.totalWitnesses || 0,
        formatDate(caseData.nextHearingDate),
        caseData.currentStageOfTrial || '',
        formatDate(caseData.dateOfFramingCharges),
        formatDate(caseData.dateOfJudgment),
        caseData.judgmentResult || 'Pending',
        caseData.reasonForAcquittal || '',
        caseData.totalAccusedConvicted || 0,
        caseData.fineAmount || '',
        caseData.victimCompensation || '',
    ];

    // Create sheet with header title row, then headers, then data
    const sheetData = [
        ['KARNATAKA STATE POLICE - DAVANGERE DISTRICT'],
        ['CASE REPORT - Generated: ' + new Date().toLocaleString('en-IN')],
        [''], // Empty row for spacing
        headers,
        dataRow,
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths - auto-fit based on content
    ws1['!cols'] = headers.map(() => ({ wch: 18 }));

    XLSX.utils.book_append_sheet(wb, ws1, 'Case Details');

    // Sheet 2: Witness Details
    const witnessHeaders = ['Witness Type', 'Supported', 'Hostile'];
    const witnessData = [
        ['Complainant Witness', caseData.witnessDetails.complainantWitness.supported, caseData.witnessDetails.complainantWitness.hostile],
        ['Mahazar/Seizure Witness', caseData.witnessDetails.mahazarSeizureWitness.supported, caseData.witnessDetails.mahazarSeizureWitness.hostile],
        ['IO Witness', caseData.witnessDetails.ioWitness.supported, caseData.witnessDetails.ioWitness.hostile],
        ['Eye Witness', caseData.witnessDetails.eyeWitness.supported, caseData.witnessDetails.eyeWitness.hostile],
        ['Other Witness', caseData.witnessDetails.otherWitness.supported, caseData.witnessDetails.otherWitness.hostile],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet([
        ['WITNESS DETAILS'],
        [''],
        witnessHeaders,
        ...witnessData
    ]);
    ws2['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Witness Details');

    // Sheet 3: Hearing History
    if (caseData.hearings && caseData.hearings.length > 0) {
        const hearingHeaders = ['S.No', 'Date', 'Stage of Trial'];
        const hearingData = caseData.hearings.map((h, i) => [
            i + 1,
            formatDate(h.date),
            h.stageOfTrial || '-'
        ]);

        const ws3 = XLSX.utils.aoa_to_sheet([
            ['HEARING HISTORY'],
            [''],
            hearingHeaders,
            ...hearingData
        ]);
        ws3['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(wb, ws3, 'Hearing History');
    }

    // Sheet 4: Convicted Accused (if any)
    if (caseData.accusedConvictions && caseData.accusedConvictions.length > 0) {
        const convictionHeaders = ['S.No', 'Accused Name', 'Sentence'];
        const convictionData = caseData.accusedConvictions.map((ac, i) => [
            i + 1,
            ac.name,
            ac.sentence
        ]);

        const ws4 = XLSX.utils.aoa_to_sheet([
            ['SENTENCES AWARDED'],
            [''],
            convictionHeaders,
            ...convictionData
        ]);
        ws4['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(wb, ws4, 'Convictions');
    }

    // Sheet 5: Higher Court Details (if applicable)
    if (caseData.higherCourtDetails.proceedingsPending) {
        const hcHeaders = ['Field', 'Value'];
        const hcData = [
            ['Type of Proceeding', caseData.higherCourtDetails.proceedingType || '-'],
            ['Higher Court', caseData.higherCourtDetails.courtName || '-'],
            ['Petitioner Party', caseData.higherCourtDetails.petitionerParty || '-'],
            ['Petition Number', caseData.higherCourtDetails.petitionNumber || '-'],
            ['Date of Filing', formatDate(caseData.higherCourtDetails.dateOfFiling)],
            ['Petition Status', caseData.higherCourtDetails.petitionStatus || '-'],
        ];

        if (caseData.higherCourtDetails.petitionStatus === 'Disposed') {
            hcData.push(['Nature of Disposal', caseData.higherCourtDetails.natureOfDisposal || '-']);
            hcData.push(['Action After Disposal', caseData.higherCourtDetails.actionAfterDisposal || '-']);
        }

        const ws5 = XLSX.utils.aoa_to_sheet([
            ['HIGHER COURT PROCEEDINGS'],
            [''],
            hcHeaders,
            ...hcData
        ]);
        ws5['!cols'] = [{ wch: 25 }, { wch: 45 }];
        XLSX.utils.book_append_sheet(wb, ws5, 'Higher Court');
    }

    // Save the file
    const fileName = `Case_Report_${caseData.crimeNumber.replace(/\//g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

// Generate Station Report in Excel (with full case details horizontally)
export const generateStationExcelReport = (
    cases: CaseData[],
    stationName: string,
    stats: { total: number; pending: number; convicted: number; acquitted: number; convictionRate: number }
): void => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
        ['KARNATAKA STATE POLICE - DAVANGERE DISTRICT'],
        ['POLICE STATION CASE REPORT'],
        [''],
        ['Station:', stationName],
        ['Report Date:', new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
        ['Generated At:', new Date().toLocaleTimeString('en-IN')],
        [''],
        ['CASE STATISTICS SUMMARY'],
        ['Total Cases', stats.total],
        ['Pending', stats.pending],
        ['Convicted', stats.convicted],
        ['Acquitted', stats.acquitted],
        ['Conviction Rate', `${stats.convictionRate}%`],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 25 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // Sheet 2: All Cases - Complete Details (Horizontal Template)
    const fullCaseHeaders = [
        'Sl No',
        'Police Station',
        'Crime Number',
        'Sections of Law',
        'Investigating Officer',
        'Public Prosecutor',
        'Date of Charge Sheet',
        'CC No / SC No',
        'Court Name',
        'Total Accused',
        'Accused Names',
        'Accused in Custody',
        'Accused on Bail',
        'Total Witnesses',
        'Next Hearing Date',
        'Current Stage',
        'Date of Framing Charges',
        'Date of Judgment',
        'Judgment Result',
        'Reason for Acquittal',
        'Total Convicted',
        'Fine Amount',
        'Victim Compensation',
    ];

    const fullCaseData = cases.map((c, i) => [
        c.slNo || (i + 1),
        c.policeStation || '',
        c.crimeNumber || '',
        c.sectionsOfLaw || '',
        c.investigatingOfficer || '',
        c.publicProsecutor || '',
        formatDate(c.dateOfChargeSheet),
        c.ccNoScNo || '',
        c.courtName || '',
        c.totalAccused || 0,
        c.accusedNames || '',
        c.accusedInJudicialCustody || 0,
        c.accusedOnBail || 0,
        c.totalWitnesses || 0,
        formatDate(c.nextHearingDate),
        c.currentStageOfTrial || '',
        formatDate(c.dateOfFramingCharges),
        formatDate(c.dateOfJudgment),
        c.judgmentResult || 'Pending',
        c.reasonForAcquittal || '',
        c.totalAccusedConvicted || 0,
        c.fineAmount || '',
        c.victimCompensation || '',
    ]);

    const ws2 = XLSX.utils.aoa_to_sheet([
        ['ALL CASES - COMPLETE DETAILS'],
        ['Station: ' + stationName],
        [''],
        fullCaseHeaders,
        ...fullCaseData
    ]);

    // Set column widths for all columns
    ws2['!cols'] = fullCaseHeaders.map((header) => ({
        wch: Math.max(header.length + 2, 15)
    }));

    XLSX.utils.book_append_sheet(wb, ws2, 'All Cases Details');

    // Save the file
    const fileName = `Station_Report_${stationName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

// Generate District Report in Excel
export const generateDistrictExcelReport = (
    allCases: CaseData[],
    stationStats: Array<{
        station: string;
        total: number;
        pending: number;
        convicted: number;
        acquitted: number;
        convictionRate: number;
    }>
): void => {
    const wb = XLSX.utils.book_new();

    // Calculate district totals
    const districtTotal = stationStats.reduce((sum, s) => sum + s.total, 0);
    const districtPending = stationStats.reduce((sum, s) => sum + s.pending, 0);
    const districtConvicted = stationStats.reduce((sum, s) => sum + s.convicted, 0);
    const districtAcquitted = stationStats.reduce((sum, s) => sum + s.acquitted, 0);
    const districtDisposed = districtConvicted + districtAcquitted;
    const districtConvictionRate = districtDisposed > 0 ? Math.round((districtConvicted / districtDisposed) * 100) : 0;

    // Sheet 1: District Summary
    const summaryData = [
        ['DAVANGERE DISTRICT'],
        ['POLICE CASE TRACKING REPORT'],
        [''],
        ['Report Generated:', new Date().toLocaleString('en-IN')],
        [''],
        ['DISTRICT SUMMARY'],
        ['Total Cases', districtTotal],
        ['Pending', districtPending],
        ['Convicted', districtConvicted],
        ['Acquitted', districtAcquitted],
        ['Total Disposed', districtDisposed],
        ['Conviction Rate', `${districtConvictionRate}%`],
        ['Total Stations', stationStats.length],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'District Summary');

    // Sheet 2: Station-wise Comparison
    const stationHeader = ['Police Station', 'Total Cases', 'Pending', 'Convicted', 'Acquitted', 'Conviction Rate'];
    const stationData = stationStats.map(s => [
        s.station,
        s.total,
        s.pending,
        s.convicted,
        s.acquitted,
        `${s.convictionRate}%`
    ]);

    const ws2 = XLSX.utils.aoa_to_sheet([
        ['STATION-WISE COMPARISON'],
        [''],
        stationHeader,
        ...stationData
    ]);
    ws2['!cols'] = [
        { wch: 35 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Station Comparison');

    // Sheet 3: Analysis
    const mostPending = [...stationStats].sort((a, b) => b.pending - a.pending)[0];
    const highestConviction = [...stationStats]
        .filter(s => s.convicted + s.acquitted > 0)
        .sort((a, b) => b.convictionRate - a.convictionRate)[0];
    const mostCases = [...stationStats].sort((a, b) => b.total - a.total)[0];

    const analysisData = [
        ['ANALYSIS'],
        [''],
        ['Most Pending Cases', mostPending ? `${mostPending.station} (${mostPending.pending} cases)` : '-'],
        ['Highest Conviction Rate', highestConviction ? `${highestConviction.station} (${highestConviction.convictionRate}%)` : '-'],
        ['Most Total Cases', mostCases ? `${mostCases.station} (${mostCases.total} cases)` : '-'],
    ];

    const ws3 = XLSX.utils.aoa_to_sheet(analysisData);
    ws3['!cols'] = [{ wch: 25 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Analysis');

    // Sheet 4: All Cases (combined)
    const allCasesHeader = ['S.No', 'Police Station', 'Crime Number', 'Sections of Law', 'Court Name', 'Status', 'Next Hearing'];
    const allCasesData = allCases.map((c, i) => [
        i + 1,
        c.policeStation,
        c.crimeNumber,
        c.sectionsOfLaw,
        c.courtName || '-',
        c.judgmentResult || 'Pending',
        formatDate(c.nextHearingDate)
    ]);

    const ws4 = XLSX.utils.aoa_to_sheet([
        ['ALL CASES'],
        [''],
        allCasesHeader,
        ...allCasesData
    ]);
    ws4['!cols'] = [
        { wch: 8 },
        { wch: 25 },
        { wch: 18 },
        { wch: 30 },
        { wch: 25 },
        { wch: 12 },
        { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, ws4, 'All Cases');

    // Save the file
    const fileName = `District_Report_Davangere_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
};
