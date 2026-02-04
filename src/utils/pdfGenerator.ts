import { jsPDF } from 'jspdf';
import { CaseData } from '../types/Case';

export const generatePDFReport = (caseData: CaseData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 0;
  const lineHeight = 7;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // =====================
  // PAGE HEADER FUNCTION
  // =====================
  const addPageHeader = (isFirstPage: boolean = false) => {
    if (isFirstPage) {
      // Top decorative band
      doc.setFillColor(0, 51, 102);
      doc.rect(0, 0, pageWidth, 8, 'F');

      // Government Header
      doc.setFillColor(0, 51, 102);
      doc.rect(0, 8, pageWidth, 50, 'F');

      // Title Block
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 220, 255);
      doc.text('GOVERNMENT OF KARNATAKA', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('KARNATAKA STATE POLICE', pageWidth / 2, 32, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DAVANGERE DISTRICT', pageWidth / 2, 44, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 220, 255);
      doc.text('Case Monitoring & Tracking System', pageWidth / 2, 53, { align: 'center' });

      // Gold band
      doc.setFillColor(218, 165, 32);
      doc.rect(0, 58, pageWidth, 3, 'F');

      yPos = 70;
    } else {
      // Continuation page header
      doc.setFillColor(0, 51, 102);
      doc.rect(0, 0, pageWidth, 18, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`Case Report - ${caseData.crimeNumber}`, pageWidth / 2, 12, { align: 'center' });
      yPos = 28;
    }
  };

  // =====================
  // HELPER FUNCTIONS
  // =====================
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPos > pageHeight - 30 - requiredSpace) {
      doc.addPage();
      addPageHeader(false);
    }
  };

  const addSectionTitle = (text: string) => {
    checkPageBreak(25);

    // Section header bar
    doc.setFillColor(0, 51, 102);
    doc.rect(margin, yPos, contentWidth, 9, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(text, margin + 4, yPos + 6.5);
    yPos += 14;
  };

  const addRow = (label: string, value: string | number | undefined, highlight: boolean = false) => {
    checkPageBreak(10);

    if (highlight) {
      doc.setFillColor(255, 250, 230);
      doc.rect(margin, yPos - 4, contentWidth, 9, 'F');
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(`${label}:`, margin + 3, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const valueStr = value?.toString() || '-';
    const maxWidth = contentWidth - 75;
    const lines = doc.splitTextToSize(valueStr, maxWidth);
    doc.text(lines, margin + 70, yPos);
    yPos += lineHeight * Math.max(1, lines.length);
  };

  const addEmptyLine = () => {
    yPos += 4;
  };

  const addInfoBox = (label: string, value: string, color: number[]) => {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(label, margin + 5, yPos + 7);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 5, yPos + 14);

    yPos += 22;
  };

  // =====================
  // START DOCUMENT
  // =====================
  addPageHeader(true);

  // Case Number Banner
  doc.setFillColor(245, 248, 255);
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, contentWidth, 22, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('DETAILED CASE REPORT', pageWidth / 2, yPos + 7, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 102);
  doc.text(`Crime No: ${caseData.crimeNumber}`, pageWidth / 2, yPos + 17, { align: 'center' });
  yPos += 28;

  // Report Meta
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const reportDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  doc.text(`Report Date: ${reportDate}`, margin, yPos);
  doc.text(`Police Station: ${caseData.policeStation}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 8;

  // Status Quick View
  const statusColor = caseData.judgmentResult === 'Convicted'
    ? [39, 174, 96]
    : caseData.judgmentResult === 'Acquitted'
      ? [231, 76, 60]
      : [243, 156, 18];
  const statusText = caseData.judgmentResult || 'PENDING JUDGMENT';
  addInfoBox('Current Status', statusText, statusColor);

  // Section 1: Basic Case Details
  addSectionTitle('BASIC CASE DETAILS');
  addRow('Serial Number', caseData.slNo);
  addRow('Police Station', caseData.policeStation);
  addRow('Sections of Law', caseData.sectionsOfLaw, true);
  addRow('Investigating Officer', caseData.investigatingOfficer);
  addRow('Public Prosecutor', caseData.publicProsecutor);
  addEmptyLine();

  // Section 2: Charge Sheet & Court
  addSectionTitle('CHARGE SHEET & COURT DETAILS');
  addRow('Date of Charge Sheet', caseData.dateOfChargeSheet ? new Date(caseData.dateOfChargeSheet).toLocaleDateString('en-IN') : '-');
  addRow('CC No / SC No', caseData.ccNoScNo, true);
  addRow('Court Name', caseData.courtName);
  addEmptyLine();

  // Section 3: Accused Information
  addSectionTitle('ACCUSED INFORMATION');

  // Accused stats in boxes
  checkPageBreak(30);
  const accusedBoxWidth = contentWidth / 3;
  const accusedStats = [
    { label: 'Total Accused', value: caseData.totalAccused.toString(), color: [52, 73, 94] },
    { label: 'In Judicial Custody', value: caseData.accusedInJudicialCustody.toString(), color: [192, 57, 43] },
    { label: 'On Bail', value: caseData.accusedOnBail.toString(), color: [39, 174, 96] },
  ];

  accusedStats.forEach((stat, index) => {
    const xPos = margin + index * accusedBoxWidth;
    doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
    doc.roundedRect(xPos + 2, yPos, accusedBoxWidth - 4, 20, 2, 2, 'F');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(stat.value, xPos + accusedBoxWidth / 2, yPos + 9, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(stat.label, xPos + accusedBoxWidth / 2, yPos + 16, { align: 'center' });
  });
  yPos += 26;

  addRow('Accused Names', caseData.accusedNames);
  addEmptyLine();

  // Section 4: Trial Status
  addSectionTitle('TRIAL STATUS');
  addRow('Current Stage', caseData.currentStageOfTrial, true);
  addRow('Next Hearing Date', caseData.nextHearingDate ? new Date(caseData.nextHearingDate).toLocaleDateString('en-IN') : '-', true);
  addRow('Date of Framing Charges', caseData.dateOfFramingCharges ? new Date(caseData.dateOfFramingCharges).toLocaleDateString('en-IN') : '-');
  addRow('Date of Judgment', caseData.dateOfJudgment ? new Date(caseData.dateOfJudgment).toLocaleDateString('en-IN') : '-');
  addEmptyLine();

  // Section 5: Witness Summary
  addSectionTitle('WITNESS DETAILS');
  addRow('Total Witnesses', caseData.totalWitnesses);

  // Witness table
  checkPageBreak(50);
  const w = caseData.witnessDetails;
  const witnessData = [
    ['Complainant Witness', w.complainantWitness.supported, w.complainantWitness.hostile],
    ['Mahazar/Seizure Witness', w.mahazarSeizureWitness.supported, w.mahazarSeizureWitness.hostile],
    ['IO Witness', w.ioWitness.supported, w.ioWitness.hostile],
    ['Eye Witness', w.eyeWitness.supported, w.eyeWitness.hostile],
    ['Other Witness', w.otherWitness.supported, w.otherWitness.hostile],
  ];

  // Table header
  doc.setFillColor(230, 236, 245);
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 102);
  doc.text('Witness Type', margin + 5, yPos + 5.5);
  doc.text('Supported', margin + 90, yPos + 5.5);
  doc.text('Hostile', margin + 130, yPos + 5.5);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  witnessData.forEach((row, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, yPos - 3, contentWidth, 7, 'F');
    }
    doc.text(row[0] as string, margin + 5, yPos + 1);
    doc.setTextColor(39, 174, 96);
    doc.text(row[1].toString(), margin + 95, yPos + 1);
    doc.setTextColor(231, 76, 60);
    doc.text(row[2].toString(), margin + 135, yPos + 1);
    doc.setTextColor(40, 40, 40);
    yPos += 7;
  });
  addEmptyLine();

  // Section 6: Judgment & Outcome
  addSectionTitle('JUDGMENT & OUTCOME');
  if (caseData.judgmentResult) {
    addRow('Judgment Result', caseData.judgmentResult, true);
    addRow('Total Accused Convicted', caseData.totalAccusedConvicted);
    addRow('Fine Amount', caseData.fineAmount);
    addRow('Victim Compensation', caseData.victimCompensation);

    if (caseData.reasonForAcquittal) {
      addRow('Reason for Acquittal', caseData.reasonForAcquittal);
    }

    if (caseData.accusedConvictions.length > 0) {
      addEmptyLine();
      checkPageBreak(20);
      doc.setFillColor(245, 248, 255);
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('SENTENCES AWARDED', margin + 5, yPos + 5.5);
      yPos += 12;

      caseData.accusedConvictions.forEach((ac, i) => {
        addRow(`${i + 1}. ${ac.name}`, ac.sentence);
      });
    }
  } else {
    checkPageBreak(15);
    doc.setFillColor(255, 250, 230);
    doc.rect(margin, yPos, contentWidth, 12, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(180, 120, 0);
    doc.text('⏳ Judgment Pending - Case Under Trial', pageWidth / 2, yPos + 8, { align: 'center' });
    yPos += 16;
  }
  addEmptyLine();

  // Section 7: Higher Court Proceedings
  if (caseData.higherCourtDetails.proceedingsPending) {
    addSectionTitle('HIGHER COURT PROCEEDINGS');
    addRow('Type of Proceeding', caseData.higherCourtDetails.proceedingType);
    addRow('Higher Court', caseData.higherCourtDetails.courtName);
    addRow('Petitioner Party', caseData.higherCourtDetails.petitionerParty);
    addRow('Petition Number', caseData.higherCourtDetails.petitionNumber, true);
    addRow('Date of Filing', caseData.higherCourtDetails.dateOfFiling ? new Date(caseData.higherCourtDetails.dateOfFiling).toLocaleDateString('en-IN') : '-');
    addRow('Petition Status', caseData.higherCourtDetails.petitionStatus);
    if (caseData.higherCourtDetails.petitionStatus === 'Disposed') {
      addRow('Nature of Disposal', caseData.higherCourtDetails.natureOfDisposal);
      addRow('Action After Disposal', caseData.higherCourtDetails.actionAfterDisposal);
    }
  }

  // Hearing History
  if (caseData.hearings && caseData.hearings.length > 0) {
    addSectionTitle('HEARING HISTORY');

    // Table header
    checkPageBreak(30);
    doc.setFillColor(230, 236, 245);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('S.No', margin + 5, yPos + 5.5);
    doc.text('Date', margin + 25, yPos + 5.5);
    doc.text('Stage of Trial', margin + 70, yPos + 5.5);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    caseData.hearings.slice(0, 10).forEach((hearing, index) => {
      checkPageBreak(10);
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 252);
        doc.rect(margin, yPos - 3, contentWidth, 7, 'F');
      }
      doc.text((index + 1).toString(), margin + 8, yPos + 1);
      doc.text(hearing.date ? new Date(hearing.date).toLocaleDateString('en-IN') : '-', margin + 25, yPos + 1);
      doc.text(hearing.stageOfTrial || '-', margin + 70, yPos + 1);
      yPos += 7;
    });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    // Footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('DAVANGERE DISTRICT POLICE - OFFICIAL DOCUMENT', margin, pageHeight - 12);
    doc.text('For Official Use Only', pageWidth / 2, pageHeight - 12, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 12, { align: 'right' });

    // Bottom stamp
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(`© 2025 Davangere Police | Case Monitoring System v1.0.0 | Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
  }

  // Save the PDF
  const fileName = `Case_Report_${caseData.crimeNumber.replace(/\//g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
