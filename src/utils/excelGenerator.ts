import * as XLSX from 'xlsx';
import { CaseData } from '../types/Case';

// Helper to format date
const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
};

// Generate Excel report for a single case
export const generateExcelReport = (caseData: CaseData): void => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Case Details
    const caseDetails = [
        ['KARNATAKA STATE POLICE - DAVANGERE DISTRICT'],
        ['CASE REPORT'],
        [''],
        ['Report Generated:', new Date().toLocaleString('en-IN')],
        [''],
        ['BASIC CASE DETAILS'],
        ['Serial Number', caseData.slNo],
        ['Crime Number', caseData.crimeNumber],
        ['Police Station', caseData.policeStation],
        ['Sections of Law', caseData.sectionsOfLaw],
        ['Investigating Officer', caseData.investigatingOfficer],
        ['Public Prosecutor', caseData.publicProsecutor],
        [''],
        ['CHARGE SHEET & COURT DETAILS'],
        ['Date of Charge Sheet', formatDate(caseData.dateOfChargeSheet)],
        ['CC No / SC No', caseData.ccNoScNo || '-'],
        ['Court Name', caseData.courtName || '-'],
        [''],
        ['ACCUSED INFORMATION'],
        ['Total Accused', caseData.totalAccused],
        ['In Judicial Custody', caseData.accusedInJudicialCustody],
        ['On Bail', caseData.accusedOnBail],
        ['Accused Names', caseData.accusedNames],
        [''],
        ['TRIAL STATUS'],
        ['Current Stage', caseData.currentStageOfTrial || '-'],
        ['Next Hearing Date', formatDate(caseData.nextHearingDate)],
        ['Date of Framing Charges', formatDate(caseData.dateOfFramingCharges)],
        ['Date of Judgment', formatDate(caseData.dateOfJudgment)],
        [''],
        ['WITNESS DETAILS'],
        ['Total Witnesses', caseData.totalWitnesses],
        ['Witness Type', 'Supported', 'Hostile'],
        ['Complainant Witness', caseData.witnessDetails.complainantWitness.supported, caseData.witnessDetails.complainantWitness.hostile],
        ['Mahazar/Seizure Witness', caseData.witnessDetails.mahazarSeizureWitness.supported, caseData.witnessDetails.mahazarSeizureWitness.hostile],
        ['IO Witness', caseData.witnessDetails.ioWitness.supported, caseData.witnessDetails.ioWitness.hostile],
        ['Eye Witness', caseData.witnessDetails.eyeWitness.supported, caseData.witnessDetails.eyeWitness.hostile],
        ['Other Witness', caseData.witnessDetails.otherWitness.supported, caseData.witnessDetails.otherWitness.hostile],
        [''],
        ['JUDGMENT & OUTCOME'],
        ['Judgment Result', caseData.judgmentResult || 'Pending'],
        ['Total Accused Convicted', caseData.totalAccusedConvicted || '-'],
        ['Fine Amount', caseData.fineAmount || '-'],
        ['Victim Compensation', caseData.victimCompensation || '-'],
        ['Reason for Acquittal', caseData.reasonForAcquittal || '-'],
    ];

    // Add accused convictions if any
    if (caseData.accusedConvictions && caseData.accusedConvictions.length > 0) {
        caseDetails.push(['']);
        caseDetails.push(['SENTENCES AWARDED']);
        caseDetails.push(['Accused Name', 'Sentence']);
        caseData.accusedConvictions.forEach(ac => {
            caseDetails.push([ac.name, ac.sentence]);
        });
    }

    // Add higher court details if applicable
    if (caseData.higherCourtDetails.proceedingsPending) {
        caseDetails.push(['']);
        caseDetails.push(['HIGHER COURT PROCEEDINGS']);
        caseDetails.push(['Type of Proceeding', caseData.higherCourtDetails.proceedingType || '-']);
        caseDetails.push(['Higher Court', caseData.higherCourtDetails.courtName || '-']);
        caseDetails.push(['Petitioner Party', caseData.higherCourtDetails.petitionerParty || '-']);
        caseDetails.push(['Petition Number', caseData.higherCourtDetails.petitionNumber || '-']);
        caseDetails.push(['Date of Filing', formatDate(caseData.higherCourtDetails.dateOfFiling)]);
        caseDetails.push(['Petition Status', caseData.higherCourtDetails.petitionStatus || '-']);
        if (caseData.higherCourtDetails.petitionStatus === 'Disposed') {
            caseDetails.push(['Nature of Disposal', caseData.higherCourtDetails.natureOfDisposal || '-']);
            caseDetails.push(['Action After Disposal', caseData.higherCourtDetails.actionAfterDisposal || '-']);
        }
    }

    const ws1 = XLSX.utils.aoa_to_sheet(caseDetails);

    // Set column widths
    ws1['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, ws1, 'Case Details');

    // Sheet 2: Hearing History
    if (caseData.hearings && caseData.hearings.length > 0) {
        const hearingData = [
            ['HEARING HISTORY'],
            [''],
            ['S.No', 'Date', 'Stage of Trial'],
            ...caseData.hearings.map((h, i) => [
                i + 1,
                formatDate(h.date),
                h.stageOfTrial || '-'
            ])
        ];

        const ws2 = XLSX.utils.aoa_to_sheet(hearingData);
        ws2['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(wb, ws2, 'Hearing History');
    }

    // Save the file
    const fileName = `Case_Report_${caseData.crimeNumber.replace(/\//g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

// Generate Station Report in Excel
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

    // Sheet 2: All Cases
    const casesHeader = ['S.No', 'Crime Number', 'Sections of Law', 'Court Name', 'Next Hearing Date', 'Status', 'Investigating Officer'];
    const casesData = cases.map((c, i) => [
        i + 1,
        c.crimeNumber,
        c.sectionsOfLaw,
        c.courtName || '-',
        formatDate(c.nextHearingDate),
        c.judgmentResult || 'Pending',
        c.investigatingOfficer || '-'
    ]);

    const ws2 = XLSX.utils.aoa_to_sheet([
        ['REGISTERED CASES'],
        [''],
        casesHeader,
        ...casesData
    ]);
    ws2['!cols'] = [
        { wch: 8 },
        { wch: 20 },
        { wch: 35 },
        { wch: 30 },
        { wch: 15 },
        { wch: 12 },
        { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Cases List');

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
