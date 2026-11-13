import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, ArrowRight, FileSpreadsheet } from 'lucide-react';
import type { HistoricalYearPoint, SampleDataset, VerificationResult } from '../types/verification';
import { TerraTrustLogo } from './TerraTrustLogo';
import type { PageView } from './TopNav';

interface DashboardPageProps {
  activeResult: VerificationResult | null;
  samples: SampleDataset[];
  onSelectSample: (sample: SampleDataset) => void;
  onNavigate: (page: PageView) => void;
  isLoading: boolean;
}

function buildChartSeries(result: VerificationResult): Array<
  HistoricalYearPoint & { recyclingRatePct: number | null; nonRenewablePct: number | null }
> {
  const { submission } = result;
  const series: HistoricalYearPoint[] =
    submission.historicalSeries && submission.historicalSeries.length >= 2
      ? submission.historicalSeries
      : [
          {
            year: submission.previousYear,
            carbonEmissions: submission.previousMetrics.carbonEmissions ?? 0,
            waterConsumption: submission.previousMetrics.waterConsumption ?? 0,
            energyConsumption: submission.previousMetrics.energyConsumption,
            renewableEnergyPct: submission.previousMetrics.renewableEnergyPct ?? 0,
            wasteGenerated: submission.previousMetrics.wasteGenerated ?? 0,
            wasteRecycled: submission.previousMetrics.wasteRecycled ?? 0,
          },
          {
            year: submission.reportingYear,
            carbonEmissions: submission.currentMetrics.carbonEmissions ?? 0,
            waterConsumption: submission.currentMetrics.waterConsumption ?? 0,
            energyConsumption: submission.currentMetrics.energyConsumption,
            renewableEnergyPct: submission.currentMetrics.renewableEnergyPct ?? 0,
            wasteGenerated: submission.currentMetrics.wasteGenerated ?? 0,
            wasteRecycled: submission.currentMetrics.wasteRecycled ?? 0,
          },
        ];

  return series.map((pt) => {
    const recyclingRatePct =
      pt.wasteGenerated !== null &&
      pt.wasteGenerated > 0 &&
      pt.wasteRecycled !== null
        ? Math.round((pt.wasteRecycled / pt.wasteGenerated) * 1000) / 10
        : null;
    const nonRenewablePct =
      pt.renewableEnergyPct !== null
        ? Math.max(0, Math.round((100 - pt.renewableEnergyPct) * 10) / 10)
        : null;
    return {
      ...pt,
      recyclingRatePct,
      nonRenewablePct,
    };
  });
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  activeResult,
  samples,
  onSelectSample,
  onNavigate,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <div className="h-7 w-60 animate-pulse rounded bg-[#DCE4DF]" />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-24 rounded-lg border border-[#DCE4DF] bg-white p-4" />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-72 rounded-lg border border-[#DCE4DF] bg-white p-5" />
          ))}
        </div>
      </div>
    );
  }

  if (!activeResult) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="rounded-lg border border-[#DCE4DF] bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <FileSpreadsheet className="mx-auto h-9 w-9 text-[#14532D]" aria-hidden="true" />
          <h1 className="mt-3 font-display text-xl font-bold text-[#0F1F17]">
            No Environmental Dataset Loaded
          </h1>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-[#475850]">
            Submit company metrics manually, upload a CSV or PDF report, or load one of the built-in
            sample companies to inspect environmental trends.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('input')}
              className="rounded-md bg-[#14532D] px-4 py-2 text-sm font-medium text-white hover:bg-[#114626]"
            >
              Submit Company Data
            </button>
            {samples[0] && (
              <button
                type="button"
                onClick={() => onSelectSample(samples[0])}
                className="rounded-md border border-[#CBD5CF] bg-white px-4 py-2 text-sm font-medium text-[#0F1F17] hover:border-[#14532D]"
              >
                Load {samples[0].label}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const chartData = buildChartSeries(activeResult);
  const { submission, summaryMetrics, consistencyScore, consistencyCategory, metricDeltas } =
    activeResult;

  const scoreTone =
    consistencyScore >= 80
      ? 'text-[#14532D]'
      : consistencyScore >= 60
        ? 'text-[#0F766E]'
        : consistencyScore >= 40
          ? 'text-[#B45309]'
          : 'text-[#B91C1C]';

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      {/* Header + Sample Switcher */}
      <div className="flex flex-col gap-3 border-b border-[#DCE4DF] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-[#475850]">
            <TerraTrustLogo size="sm" showWordmark={false} />
            <span>Company Analytics</span>
            <span aria-hidden="true">·</span>
            <span>{submission.industry || 'Corporate Sustainability Audit'}</span>
            <span aria-hidden="true">·</span>
            <span>
              {submission.previousYear}–{submission.reportingYear}
            </span>
          </div>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-[#0F1F17] sm:text-2xl">
            {submission.companyName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-0.5 text-xs font-medium text-[#5B6D63]">Dataset:</span>
          {samples.map((s) => {
            const isCurrent = s.submission.companyName === submission.companyName;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSample(s)}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isCurrent
                    ? 'border-[#14532D] bg-[#14532D] text-white'
                    : 'border-[#D2DCD6] bg-white text-[#304238] hover:border-[#14532D]'
                }`}
              >
                {s.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onNavigate('results')}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#0F766E] bg-[#F2F6F4] px-3 py-1.5 text-xs font-semibold text-[#0F766E] whitespace-nowrap shrink-0 hover:bg-[#E7EFEA]"
          >
            View Findings
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 5-Column Compact KPI Strip */}
      <section className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5" aria-label="Audit Summary Metrics">
        <div className="rounded-lg border border-[#DCE4DF] bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <p className="text-xs font-medium text-[#5B6D63]">Claims Analysed</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#0F1F17] tabular-nums">
            {summaryMetrics.totalClaimsAnalysed}
          </p>
          <p className="mt-1 text-[11px] text-[#475850]">
            {summaryMetrics.verifiedAgainstData} verified against data
          </p>
        </div>

        <div className="rounded-lg border border-[#DCE4DF] bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <p className="text-xs font-medium text-[#5B6D63]">Suspicious Claims</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#B91C1C] tabular-nums">
            {summaryMetrics.suspiciousClaims}
          </p>
          <p className="mt-1 text-[11px] text-[#475850]">
            Contradictions or selective framing
          </p>
        </div>

        <div className="rounded-lg border border-[#DCE4DF] bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <p className="text-xs font-medium text-[#5B6D63]">Detected Anomalies</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#B45309] tabular-nums">
            {summaryMetrics.detectedAnomalies}
          </p>
          <p className="mt-1 text-[11px] text-[#475850]">
            {summaryMetrics.highSeverityWarnings} high-severity flags
          </p>
        </div>

        <div className="rounded-lg border border-[#DCE4DF] bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <p className="text-xs font-medium text-[#5B6D63]">Needs Verification</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#0F1F17] tabular-nums">
            {summaryMetrics.claimsRequiringVerification}
          </p>
          <p className="mt-1 text-[11px] text-[#475850]">
            Awaiting primary audit evidence
          </p>
        </div>

        <div className="col-span-2 rounded-lg border border-[#DCE4DF] bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)] sm:col-span-1">
          <p className="text-xs font-medium text-[#5B6D63]">Consistency Score</p>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className={`font-mono text-2xl font-semibold tabular-nums ${scoreTone}`}>
              {consistencyScore}
            </span>
            <span className="font-mono text-xs text-[#6A7B72]">/ 100</span>
          </div>
          <p className={`mt-1 text-[11px] font-medium ${scoreTone}`}>{consistencyCategory}</p>
        </div>
      </section>

      {/* Prototype Note */}
      <div className="mt-3.5 flex items-center gap-2 rounded-md border border-[#DCE4DF] bg-white px-3.5 py-2 text-xs text-[#475850]">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#B45309]" aria-hidden="true" />
        <span>
          <strong>Prototype Notice:</strong> Scores and anomaly flags are experimental analytical indicators generated from supplied figures, not an officially certified environmental rating.
        </span>
      </div>

      {/* 4 Environmental Visualizations */}
      <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Chart 1: Carbon Emissions Over Time */}
        <div className="rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#0F1F17]">
                Carbon Emissions Over Time
              </h2>
              <p className="mt-0.5 text-xs text-[#5B6D63]">
                Annual Scope 1 &amp; 2 reported output (tonnes CO2e)
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#14532D] tabular-nums">
              {submission.currentMetrics.carbonEmissions !== null
                ? `${submission.currentMetrics.carbonEmissions.toLocaleString()} t`
                : 'N/A'}
            </span>
          </div>
          <div className="mt-3 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EEEA" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#475850' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475850' }} width={46} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '6px',
                    borderColor: '#D2DCD6',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="carbonEmissions"
                  name="Carbon Emissions (tonnes)"
                  stroke="#14532D"
                  strokeWidth={2}
                  fill="#14532D"
                  fillOpacity={0.09}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Water Consumption Trends */}
        <div className="rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#0F1F17]">
                Water Consumption Trends
              </h2>
              <p className="mt-0.5 text-xs text-[#5B6D63]">
                Annual water intake across reporting periods (KL)
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#0F766E] tabular-nums">
              {submission.currentMetrics.waterConsumption !== null
                ? `${submission.currentMetrics.waterConsumption.toLocaleString()} KL`
                : 'N/A'}
            </span>
          </div>
          <div className="mt-3 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EEEA" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#475850' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475850' }} width={54} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '6px',
                    borderColor: '#D2DCD6',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="waterConsumption"
                  name="Water Consumption (KL)"
                  fill="#0F766E"
                  radius={[3, 3, 0, 0]}
                  barSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Renewable Energy Usage */}
        <div className="rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#0F1F17]">
                Renewable Energy Usage
              </h2>
              <p className="mt-0.5 text-xs text-[#5B6D63]">
                Reported share of renewable vs. conventional energy (%)
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#14532D] tabular-nums">
              {submission.currentMetrics.renewableEnergyPct !== null
                ? `${submission.currentMetrics.renewableEnergyPct}%`
                : 'N/A'}
            </span>
          </div>
          <div className="mt-3 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EEEA" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#475850' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#475850' }} unit="%" width={42} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '6px',
                    borderColor: '#D2DCD6',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="renewableEnergyPct"
                  name="Renewable (%)"
                  stackId="energy"
                  fill="#14532D"
                  barSize={34}
                />
                <Bar
                  dataKey="nonRenewablePct"
                  name="Non-Renewable (%)"
                  stackId="energy"
                  fill="#CBD5CF"
                  radius={[3, 3, 0, 0]}
                  barSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Waste Generation & Recycling Rates */}
        <div className="rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#0F1F17]">
                Waste Generation &amp; Recycling Rates
              </h2>
              <p className="mt-0.5 text-xs text-[#5B6D63]">
                Total waste vs. recycled tonnage with net recycling rate (%)
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#0F766E] tabular-nums">
              {submission.currentMetrics.wasteGenerated &&
              submission.currentMetrics.wasteRecycled !== null
                ? `${Math.round((submission.currentMetrics.wasteRecycled / submission.currentMetrics.wasteGenerated) * 1000) / 10}% rate`
                : 'N/A'}
            </span>
          </div>
          <div className="mt-3 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EEEA" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#475850' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#475850' }} width={42} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: '#475850' }}
                  width={42}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '6px',
                    borderColor: '#D2DCD6',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="wasteGenerated"
                  name="Waste Generated (t)"
                  fill="#94A3B8"
                  radius={[3, 3, 0, 0]}
                  barSize={20}
                />
                <Bar
                  yAxisId="left"
                  dataKey="wasteRecycled"
                  name="Waste Recycled (t)"
                  fill="#0F766E"
                  radius={[3, 3, 0, 0]}
                  barSize={20}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="recyclingRatePct"
                  name="Recycling Rate (%)"
                  stroke="#B45309"
                  strokeWidth={2}
                  dot={{ r: 3.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Year-over-Year Data Table */}
      <section className="mt-5 rounded-lg border border-[#DCE4DF] bg-white shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE4DF] px-5 py-3.5">
          <div>
            <h2 className="font-display text-sm font-semibold text-[#0F1F17]">
              Submitted Environmental Metrics Ledger
            </h2>
            <p className="text-xs text-[#5B6D63]">
              Direct comparison of {submission.previousYear} baseline vs. {submission.reportingYear} figures
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('input')}
            className="text-xs font-semibold text-[#14532D] hover:underline"
          >
            Edit or Upload New Data
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#DCE4DF] bg-[#F8FAF9] text-xs font-semibold text-[#475850]">
                <th className="px-5 py-2.5">Environmental Metric</th>
                <th className="px-5 py-2.5 text-right">{submission.previousYear}</th>
                <th className="px-5 py-2.5 text-right">{submission.reportingYear}</th>
                <th className="px-5 py-2.5 text-right">YoY Delta</th>
                <th className="px-5 py-2.5">Assessment Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE4DF]">
              {metricDeltas.map((row) => (
                <tr key={row.key} className="hover:bg-[#F8FAF9]">
                  <td className="px-5 py-2.5 font-medium text-[#0F1F17]">
                    {row.label}{' '}
                    <span className="text-xs font-normal text-[#617269]">({row.unit})</span>
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-xs text-[#304238] tabular-nums">
                    {row.previousValue !== null ? row.previousValue.toLocaleString() : 'Missing'}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-xs text-[#0F1F17] tabular-nums">
                    {row.currentValue !== null ? row.currentValue.toLocaleString() : 'Missing'}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-xs tabular-nums">
                    {row.percentChange !== null ? (
                      <span
                        className={
                          row.percentChange > 0 && row.key !== 'renewableEnergyPct' && row.key !== 'wasteRecycled'
                            ? 'text-[#B45309]'
                            : 'text-[#14532D]'
                        }
                      >
                        {row.percentChange > 0 ? `+${row.percentChange}` : row.percentChange}
                        {row.key === 'renewableEnergyPct' ? ' pp' : '%'}
                      </span>
                    ) : (
                      <span className="text-[#617269]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-[#475850]">{row.directionNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
