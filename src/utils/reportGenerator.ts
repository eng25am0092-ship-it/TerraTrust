import { jsPDF } from 'jspdf';
import type { VerificationResult } from '../types/verification';

export function downloadVerificationPdf(result: VerificationResult): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  const maxWidth = pageWidth - margin * 2;
  let y = 48;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 48) {
      doc.addPage();
      y = 48;
    }
  };

  const addWrappedText = (
    text: string,
    x: number,
    width: number,
    fontSize: number,
    color: [number, number, number] = [30, 41, 35],
    fontStyle: 'normal' | 'bold' = 'normal'
  ) => {
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, width) as string[];
    for (const line of lines) {
      ensureSpace(fontSize + 6);
      doc.text(line, x, y);
      y += fontSize + 5;
    }
  };

  // Header band
  doc.setFillColor(20, 83, 45); // Forest green #14532D
  doc.rect(0, 0, pageWidth, 74, 'F');

  // Vector Globe + Leaf emblem in PDF header
  const logoCx = margin + 12;
  const logoCy = 32;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.3);
  doc.circle(logoCx, logoCy, 10, 'S');
  doc.setDrawColor(153, 246, 228); // Subtle teal highlight on dark forest background
  doc.setLineWidth(0.9);
  doc.line(logoCx - 9.5, logoCy, logoCx + 5, logoCy);
  doc.line(logoCx, logoCy - 10, logoCx, logoCy + 10);
  // Stylized leaf arc
  doc.setFillColor(15, 118, 110);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.1);
  doc.ellipse(logoCx + 5.5, logoCy - 2, 6, 3.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('TerraTrust', margin + 30, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(220, 238, 226);
  doc.text('Environmental Data Verification Report  |  Making Sustainability Claims More Transparent', margin + 30, 52);

  y = 102;

  // Company & Metadata block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 31, 23);
  doc.text(result.submission.companyName, margin, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 88, 80);
  const metaLine = [
    `Reporting Period: ${result.submission.previousYear} vs ${result.submission.reportingYear}`,
    result.submission.industry ? `Sector: ${result.submission.industry}` : null,
    `Generated: ${new Date(result.analyzedAt).toLocaleString()}`,
    `Engine: ${result.analysisEngine}`,
  ]
    .filter(Boolean)
    .join('   ·   ');
  doc.text(metaLine, margin, y);
  y += 22;

  // Score Summary Box
  ensureSpace(92);
  doc.setDrawColor(210, 222, 215);
  doc.setFillColor(246, 249, 247);
  doc.roundedRect(margin, y, maxWidth, 78, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 88, 80);
  doc.text('TERRATRUST CONSISTENCY SCORE (PROTOTYPE)', margin + 16, y + 20);

  doc.setFontSize(26);
  doc.setTextColor(20, 83, 45);
  doc.text(`${result.consistencyScore} / 100`, margin + 16, y + 48);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 31, 23);
  doc.text(result.consistencyCategory, margin + 145, y + 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 88, 80);
  doc.text(
    `Data: ${result.scoreBreakdown.dataConsistency}/25  ·  Completeness: ${result.scoreBreakdown.evidenceCompleteness}/25  ·  Trends: ${result.scoreBreakdown.trendReliability}/25  ·  Claim Alignment: ${result.scoreBreakdown.claimToDataAlignment}/25`,
    margin + 145,
    y + 62
  );

  y += 94;

  // Disclaimer
  addWrappedText(
    result.disclaimer,
    margin,
    maxWidth,
    8.5,
    [100, 112, 106],
    'normal'
  );
  y += 8;

  // Executive Summary
  ensureSpace(50);
  addWrappedText('Executive Verification Summary', margin, maxWidth, 12.5, [15, 31, 23], 'bold');
  y += 2;
  addWrappedText(result.executiveSummary, margin, maxWidth, 10, [40, 52, 46], 'normal');
  y += 12;

  // Environmental Data Summary Table
  ensureSpace(150);
  addWrappedText('Environmental Data Comparison', margin, maxWidth, 12.5, [15, 31, 23], 'bold');
  y += 4;

  // Table header
  doc.setFillColor(235, 241, 237);
  doc.rect(margin, y, maxWidth, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 31, 23);
  doc.text('Metric', margin + 8, y + 14);
  doc.text(`${result.submission.previousYear}`, margin + 215, y + 14);
  doc.text(`${result.submission.reportingYear}`, margin + 305, y + 14);
  doc.text('Year-over-Year Assessment', margin + 385, y + 14);
  y += 22;

  for (const row of result.metricDeltas) {
    ensureSpace(24);
    doc.setDrawColor(226, 232, 228);
    doc.line(margin, y + 20, margin + maxWidth, y + 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 31, 23);
    doc.text(row.label, margin + 8, y + 13);
    doc.text(
      row.previousValue !== null ? `${row.previousValue.toLocaleString()} ${row.unit}` : 'Missing',
      margin + 215,
      y + 13
    );
    doc.text(
      row.currentValue !== null ? `${row.currentValue.toLocaleString()} ${row.unit}` : 'Missing',
      margin + 305,
      y + 13
    );
    const shortNote = row.directionNote.length > 26 ? `${row.directionNote.slice(0, 25)}…` : row.directionNote;
    doc.setTextColor(71, 88, 80);
    doc.text(shortNote, margin + 385, y + 13);
    y += 20;
  }
  y += 16;

  // Detailed Findings
  ensureSpace(60);
  addWrappedText(
    `Detailed Verification Findings (${result.findings.length})`,
    margin,
    maxWidth,
    12.5,
    [15, 31, 23],
    'bold'
  );
  y += 4;

  if (result.findings.length === 0) {
    addWrappedText(
      'No inconsistencies or missing evidence anomalies were detected in the supplied dataset.',
      margin,
      maxWidth,
      10,
      [21, 128, 61],
      'normal'
    );
  } else {
    for (const f of result.findings) {
      ensureSpace(95);
      const sevColor: [number, number, number] =
        f.severity === 'High'
          ? [185, 28, 28]
          : f.severity === 'Medium'
            ? [180, 83, 9]
            : [71, 88, 80];

      addWrappedText(
        `${f.id} · ${f.severity} Severity · ${f.category}`,
        margin,
        maxWidth,
        8.5,
        sevColor,
        'bold'
      );
      addWrappedText(f.title, margin, maxWidth, 11, [15, 31, 23], 'bold');
      addWrappedText(`Evidence: ${f.numericalEvidence}`, margin, maxWidth, 9, [50, 65, 58], 'normal');
      addWrappedText(f.explanation, margin, maxWidth, 9.5, [40, 52, 46], 'normal');
      if (f.verificationSteps.length > 0) {
        addWrappedText(
          `Verification steps: ${f.verificationSteps.join(' ')}`,
          margin + 8,
          maxWidth - 8,
          9,
          [71, 88, 80],
          'normal'
        );
      }
      y += 8;
    }
  }

  // Recommendations
  ensureSpace(60);
  y += 4;
  addWrappedText('Verification Recommendations', margin, maxWidth, 12.5, [15, 31, 23], 'bold');
  y += 2;
  result.recommendations.forEach((rec, idx) => {
    addWrappedText(`${idx + 1}. ${rec}`, margin, maxWidth, 9.5, [40, 52, 46], 'normal');
  });

  const safeSlug = result.submission.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  doc.save(`terratrust-verification-${safeSlug || 'report'}-${result.submission.reportingYear}.pdf`);
}

export function downloadAuditJson(result: VerificationResult): void {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeSlug = result.submission.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  a.href = url;
  a.download = `terratrust-audit-${safeSlug || 'report'}-${result.submission.reportingYear}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
