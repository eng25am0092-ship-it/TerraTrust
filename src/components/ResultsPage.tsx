import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Info,
  RotateCcw,
} from 'lucide-react';
import type { SeverityLevel, VerificationResult } from '../types/verification';
import { downloadVerificationPdf } from '../utils/reportGenerator';
import { ConsistencyGauge } from './ConsistencyGauge';
import { TerraTrustLogo } from './TerraTrustLogo';
import type { PageView } from './TopNav';

interface ResultsPageProps {
  result: VerificationResult | null;
  onNavigate: (page: PageView) => void;
  onResetAnalysis: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  result,
  onNavigate,
  onResetAnalysis,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'All' | SeverityLevel>('All');

  if (!result) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="rounded-lg border border-[#DCE4DF] bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <FileText className="mx-auto h-9 w-9 text-[#14532D]" aria-hidden="true" />
          <h1 className="mt-3 font-display text-xl font-bold text-[#0F1F17]">
            No Verification Analysis Active
          </h1>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-[#475850]">
            Enter environmental metrics and sustainability claims—or load one of the sample company datasets—to generate verification results.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('input')}
            className="mt-5 rounded-md bg-[#14532D] px-4 py-2 text-sm font-medium text-white hover:bg-[#114626]"
          >
            Go to Data Input
          </button>
        </div>
      </div>
    );
  }

  const {
    submission,
    consistencyScore,
    consistencyCategory,
    scoreBreakdown,
    summaryMetrics,
    claimEvaluations,
    findings,
    recommendations,
    executiveSummary,
    analysisEngine,
    disclaimer,
  } = result;

  const filteredFindings =
    severityFilter === 'All'
      ? findings
      : findings.filter((f) => f.severity === severityFilter);

  const breakdownItems = [
    { label: 'Data Consistency', value: scoreBreakdown.dataConsistency, max: 25 },
    { label: 'Evidence Completeness', value: scoreBreakdown.evidenceCompleteness, max: 25 },
    { label: 'Environmental Trend Reliability', value: scoreBreakdown.trendReliability, max: 25 },
    { label: 'Claim-to-Data Alignment', value: scoreBreakdown.claimToDataAlignment, max: 25 },
  ];

  const renderSeverityLabel = (sev: SeverityLevel) => {
    if (sev === 'High') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B91C1C]">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          High Severity
        </span>
      );
    }
    if (sev === 'Medium') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309]">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Medium Severity
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475850]">
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
        Low Severity
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-[#DCE4DF] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-[#475850]">
            <TerraTrustLogo size="sm" showWordmark={false} />
            <span>Verification Results</span>
            <span aria-hidden="true">·</span>
            <span>{analysisEngine}</span>
            <span aria-hidden="true">·</span>
            <span>
              {submission.previousYear}–{submission.reportingYear}
            </span>
          </div>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-[#0F1F17] sm:text-2xl">
            {submission.companyName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('input')}
            className="rounded-lg border border-[#CBD5CF] bg-white px-4 py-2 text-xs font-semibold text-[#0F1F17] whitespace-nowrap shrink-0 hover:border-[#14532D]"
          >
            Edit Data
          </button>
          <button
            type="button"
            onClick={onResetAnalysis}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5CF] bg-white px-4 py-2 text-xs font-semibold text-[#475850] whitespace-nowrap shrink-0 hover:border-[#B91C1C] hover:text-[#B91C1C]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset Analysis
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="rounded-lg border border-[#14532D] bg-[#EEF5F0] px-4 py-2 text-xs font-semibold text-[#14532D] whitespace-nowrap shrink-0 hover:bg-[#E1EDE5]"
          >
            Open Full Report
          </button>
          <button
            type="button"
            onClick={() => downloadVerificationPdf(result)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#14532D] px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 hover:bg-[#166534]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Consistency Score + Executive Summary Split */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Gauge Card */}
        <div className="flex flex-col justify-between rounded-lg border border-[#DCE4DF] bg-white p-6 lg:col-span-5">
          <div>
            <h2 className="font-display text-base font-semibold text-[#0F1F17]">
              TerraTrust Consistency Score
            </h2>
            <p className="mt-0.5 text-xs text-[#5B6D63]">
              Composite index across data reliability and claim alignment
            </p>
          </div>

          <div className="my-5">
            <ConsistencyGauge score={consistencyScore} category={consistencyCategory} />
          </div>

          {/* 4 Sub-scores */}
          <div className="space-y-3 border-t border-[#E2E8E4] pt-4">
            {breakdownItems.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#304238]">{item.label}</span>
                  <span className="font-mono font-semibold text-[#0F1F17] tabular-nums">
                    {item.value} / {item.max}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#E8EEEA]">
                  <div
                    className="h-full rounded-full bg-[#14532D]"
                    style={{ width: `${(item.value / item.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Metrics & Executive Brief */}
        <div className="flex flex-col justify-between gap-6 lg:col-span-7">
          <div className="rounded-lg border border-[#DCE4DF] bg-white p-6">
            <h2 className="font-display text-base font-semibold text-[#0F1F17]">
              Verification Assessment Summary
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#304238]">{executiveSummary}</p>

            {/* 5 Counters */}
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#E2E8E4] pt-5 sm:grid-cols-5">
              <div>
                <p className="text-[11px] font-medium text-[#5B6D63]">Total Claims</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#0F1F17] tabular-nums">
                  {summaryMetrics.totalClaimsAnalysed}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#5B6D63]">Verified</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#15803D] tabular-nums">
                  {summaryMetrics.verifiedAgainstData}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#5B6D63]">Needs Verification</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#B45309] tabular-nums">
                  {summaryMetrics.claimsRequiringVerification}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#5B6D63]">Anomalies</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#0F1F17] tabular-nums">
                  {summaryMetrics.detectedAnomalies}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#5B6D63]">High Warnings</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#B91C1C] tabular-nums">
                  {summaryMetrics.highSeverityWarnings}
                </p>
              </div>
            </div>
          </div>

          {/* Experimental Prototype Disclaimer */}
          <div className="rounded-lg border border-[#DCE4DF] bg-[#F2F6F3] p-5 text-xs leading-relaxed text-[#475850]">
            <p className="font-semibold text-[#0F1F17]">Methodology &amp; Prototype Notice</p>
            <p className="mt-1">{disclaimer}</p>
          </div>
        </div>
      </section>

      {/* Claim-by-Claim Cross-Check Matrix */}
      <section className="mt-8 rounded-lg border border-[#DCE4DF] bg-white">
        <div className="border-b border-[#E2E8E4] px-6 py-4">
          <h2 className="font-display text-base font-semibold text-[#0F1F17]">
            Claim-to-Data Comparison Matrix
          </h2>
          <p className="mt-0.5 text-xs text-[#5B6D63]">
            Every sustainability statement evaluated directly against supplied quantitative figures
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E2E8E4] bg-[#F7F9F8] text-xs font-semibold text-[#475850]">
                <th className="px-6 py-3">Submitted Claim</th>
                <th className="px-6 py-3">Domain</th>
                <th className="px-6 py-3">Verification Status</th>
                <th className="px-6 py-3">Supplied Numerical Evidence</th>
                <th className="px-6 py-3">Variance Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4]">
              {claimEvaluations.map((ce, idx) => {
                const isVerified = ce.status === 'Verified against supplied data';
                const isSuspicious = ce.status === 'Suspicious pattern';
                return (
                  <tr key={idx} className="align-top hover:bg-[#F9FBFA]">
                    <td className="px-6 py-3.5 font-medium text-[#0F1F17] max-w-xs">
                      “{ce.claim}”
                    </td>
                    <td className="px-6 py-3.5 text-xs text-[#475850] whitespace-nowrap">
                      {ce.metricDomain}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          isVerified
                            ? 'text-[#15803D]'
                            : isSuspicious
                              ? 'text-[#B91C1C]'
                              : 'text-[#B45309]'
                        }`}
                      >
                        {isVerified ? (
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : isSuspicious ? (
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {ce.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-[#304238]">
                      {ce.actualEvidence}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-[#475850]">{ce.varianceNote}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detailed Findings */}
      <section className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0F1F17]">
              Detailed Findings ({filteredFindings.length})
            </h2>
            <p className="text-xs text-[#5B6D63]">
              Specific inconsistencies, missing records, and trend anomalies detected in the submission
            </p>
          </div>

          <div className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8E4] bg-[#EEF2EF] p-1">
            {(['All', 'High', 'Medium', 'Low'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  severityFilter === sev
                    ? 'bg-white text-[#0F1F17] shadow-xs'
                    : 'text-[#475850] hover:text-[#0F1F17]'
                }`}
              >
                {sev === 'All' ? `All (${findings.length})` : sev}
              </button>
            ))}
          </div>
        </div>

        {filteredFindings.length === 0 ? (
          <div className="mt-4 rounded-lg border border-[#DCE4DF] bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-[#15803D]" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-[#0F1F17]">
              No findings match this filter.
            </p>
            <p className="mt-1 text-xs text-[#5B6D63]">
              {findings.length === 0
                ? 'All submitted claims and metrics passed automated consistency checks.'
                : 'Select "All" to view findings at other severity levels.'}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {filteredFindings.map((finding, idx) => (
              <article
                key={finding.id}
                className="rounded-lg border border-[#DCE4DF] bg-white p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5B6D63]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium text-[#0F1F17]">
                      Finding {idx + 1} · {finding.id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{finding.category}</span>
                  </div>
                  {renderSeverityLabel(finding.severity)}
                </div>

                <h3 className="mt-2.5 font-display text-lg font-semibold text-[#0F1F17]">
                  {finding.title}
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 border-t border-[#E2E8E4] pt-4 lg:grid-cols-12">
                  <div className="space-y-3 lg:col-span-7">
                    <div>
                      <p className="text-xs font-semibold text-[#475850]">Claim or Data Analysed</p>
                      <p className="mt-1 text-sm text-[#0F1F17]">{finding.claimOrDataPoint}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#475850]">Why It Was Flagged</p>
                      <p className="mt-1 text-sm text-[#304238]">{finding.reasonFlagged}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#475850]">Verification Explanation</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#304238]">
                        {finding.explanation}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-[#E2E8E4] pt-4 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                    <div>
                      <p className="text-xs font-semibold text-[#475850]">
                        Relevant Numerical Evidence
                      </p>
                      <p className="mt-1.5 rounded-lg bg-[#F7F9F8] p-3 font-mono text-xs leading-relaxed text-[#0F1F17]">
                        {finding.numericalEvidence}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-[#475850]">
                        Recommended Verification Steps
                      </p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#304238]">
                        {finding.verificationSteps.map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section className="mt-8 rounded-lg border border-[#DCE4DF] bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
          Recommended Next Verification Actions
        </h2>
        <p className="mt-1 text-xs text-[#5B6D63]">
          Practical evidence requests to resolve flagged inconsistencies and strengthen disclosure reliability
        </p>

        <ol className="mt-4 divide-y divide-[#E2E8E4]">
          {recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-3 py-3 text-sm text-[#0F1F17]">
              <span className="font-mono text-xs font-semibold text-[#14532D] pt-0.5">
                {String(idx + 1).padStart(2, '0')}.
              </span>
              <span>{rec}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};
