import React from 'react';
import { Download, FileJson, FileText, Printer } from 'lucide-react';
import type { VerificationResult } from '../types/verification';
import { downloadAuditJson, downloadVerificationPdf } from '../utils/reportGenerator';
import { TerraTrustLogo } from './TerraTrustLogo';
import type { PageView } from './TopNav';

interface ReportsPageProps {
  activeResult: VerificationResult | null;
  auditHistory: VerificationResult[];
  onSelectAudit: (audit: VerificationResult) => void;
  onNavigate: (page: PageView) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  activeResult,
  auditHistory,
  onSelectAudit,
  onNavigate,
}) => {
  if (!activeResult) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="rounded-lg border border-[#DCE4DF] bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <FileText className="mx-auto h-9 w-9 text-[#14532D]" aria-hidden="true" />
          <h1 className="mt-3 font-display text-xl font-bold text-[#0F1F17]">
            No Verification Report Available
          </h1>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-[#475850]">
            Run an environmental verification analysis first to preview and export a formal PDF audit report.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('input')}
            className="mt-5 rounded-md bg-[#14532D] px-4 py-2 text-sm font-medium text-white hover:bg-[#114626]"
          >
            Start New Verification
          </button>
        </div>
      </div>
    );
  }

  const { submission } = activeResult;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      {/* Toolbar */}
      <div className="no-print flex flex-col gap-3 border-b border-[#DCE4DF] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-[#0F1F17] sm:text-2xl">
            Verification Report Preview
          </h1>
          <p className="mt-1 text-xs text-[#5B6D63]">
            Export a structured PDF verification dossier or raw JSON audit record
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => downloadAuditJson(activeResult)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5CF] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F1F17] whitespace-nowrap shrink-0 hover:border-[#14532D]"
          >
            <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5CF] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F1F17] whitespace-nowrap shrink-0 hover:border-[#14532D]"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print
          </button>
          <button
            type="button"
            onClick={() => downloadVerificationPdf(activeResult)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#14532D] px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 hover:bg-[#166534]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Audit History Selector */}
      {auditHistory.length > 1 && (
        <div className="no-print mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#5B6D63]">Recent audits:</span>
          {auditHistory.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectAudit(item)}
              className={`rounded-md border px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                item.id === activeResult.id
                  ? 'border-[#14532D] bg-[#14532D] text-white'
                  : 'border-[#D5DED8] bg-white text-[#304238] hover:border-[#14532D]'
              }`}
            >
              {item.submission.companyName} ({item.consistencyScore}/100)
            </button>
          ))}
        </div>
      )}

      {/* Printable Audit Document */}
      <div className="mt-5 rounded-lg border border-[#DCE4DF] bg-white p-6 shadow-[0_1px_2px_rgba(15,31,23,0.04)] sm:p-8">
        {/* Document Masthead */}
        <div className="flex flex-col justify-between gap-4 border-b-2 border-[#14532D] pb-5 sm:flex-row sm:items-end">
          <div>
            <TerraTrustLogo size="md" />
            <p className="mt-1.5 text-xs text-[#5B6D63]">
              Environmental Data Verification System · Automated Pre-Audit Dossier
            </p>
          </div>
          <div className="text-left text-xs text-[#475850] sm:text-right">
            <p className="font-mono">Audit ID: {activeResult.id}</p>
            <p>Generated: {new Date(activeResult.analyzedAt).toLocaleString()}</p>
          </div>
        </div>

        {/* Company & Score Header */}
        <div className="mt-6 grid grid-cols-1 gap-6 border-b border-[#E2E8E4] pb-6 sm:grid-cols-12">
          <div className="sm:col-span-7">
            <p className="text-xs font-semibold text-[#5B6D63]">AUDITED ENTITY</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#0F1F17]">
              {submission.companyName}
            </h2>
            <p className="mt-1 text-sm text-[#475850]">
              {submission.industry || 'Corporate Sustainability Reporting'}
              <span className="mx-2" aria-hidden="true">·</span>
              Reporting Period: {submission.previousYear} vs. {submission.reportingYear}
            </p>
            <p className="mt-1 text-xs text-[#5B6D63]">
              Verification Engine: {activeResult.analysisEngine}
            </p>
          </div>

          <div className="rounded-lg border border-[#E2E8E4] bg-[#F7F9F8] p-4 sm:col-span-5">
            <p className="text-[11px] font-semibold text-[#5B6D63]">
              TERRATRUST CONSISTENCY SCORE
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-[#14532D] tabular-nums">
                {activeResult.consistencyScore}
              </span>
              <span className="font-mono text-sm text-[#5B6D63]">/ 100</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-[#0F1F17]">
              {activeResult.consistencyCategory}
            </p>
          </div>
        </div>

        {/* Prototype Notice */}
        <p className="mt-4 text-xs italic text-[#5B6D63]">{activeResult.disclaimer}</p>

        {/* Executive Summary */}
        <section className="mt-6">
          <h3 className="font-display text-base font-bold text-[#0F1F17]">
            1. Executive Summary
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#304238]">
            {activeResult.executiveSummary}
          </p>
        </section>

        {/* Environmental Data Summary */}
        <section className="mt-8">
          <h3 className="font-display text-base font-bold text-[#0F1F17]">
            2. Environmental Data Summary ({submission.previousYear} vs. {submission.reportingYear})
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-y border-[#E2E8E4] bg-[#F7F9F8] font-semibold text-[#475850]">
                  <th className="px-3 py-2.5">Metric</th>
                  <th className="px-3 py-2.5 text-right">{submission.previousYear}</th>
                  <th className="px-3 py-2.5 text-right">{submission.reportingYear}</th>
                  <th className="px-3 py-2.5 text-right">YoY Change</th>
                  <th className="px-3 py-2.5">Observation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E4]">
                {activeResult.metricDeltas.map((row) => (
                  <tr key={row.key}>
                    <td className="px-3 py-2.5 font-medium text-[#0F1F17]">
                      {row.label} ({row.unit})
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {row.previousValue !== null ? row.previousValue.toLocaleString() : 'Missing'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {row.currentValue !== null ? row.currentValue.toLocaleString() : 'Missing'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {row.percentChange !== null
                        ? `${row.percentChange > 0 ? `+${row.percentChange}` : row.percentChange}${row.key === 'renewableEnergyPct' ? ' pp' : '%'}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[#475850]">{row.directionNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detected Anomalies & Greenwashing Indicators */}
        <section className="mt-8">
          <h3 className="font-display text-base font-bold text-[#0F1F17]">
            3. Detected Anomalies &amp; Potential Greenwashing Indicators
          </h3>
          {activeResult.findings.length === 0 ? (
            <p className="mt-2 text-sm text-[#15803D]">
              No material anomalies or claim-to-data discrepancies were identified in this submission.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {activeResult.findings.map((f, idx) => (
                <div key={f.id} className="rounded-lg border border-[#E2E8E4] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-[#0F1F17]">
                      {idx + 1}. {f.id} · {f.category}
                    </span>
                    <span
                      className={`font-semibold ${
                        f.severity === 'High'
                          ? 'text-[#B91C1C]'
                          : f.severity === 'Medium'
                            ? 'text-[#B45309]'
                            : 'text-[#475850]'
                      }`}
                    >
                      {f.severity} Severity
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-[#0F1F17]">{f.title}</p>
                  <p className="mt-1 font-mono text-xs text-[#475850]">
                    Evidence: {f.numericalEvidence}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[#304238]">{f.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recommendations */}
        <section className="mt-8">
          <h3 className="font-display text-base font-bold text-[#0F1F17]">
            4. Verification Recommendations
          </h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-[#304238]">
            {activeResult.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
};
