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
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  CheckCircle2,
  Droplets,
  Home,
  Info,
  Lightbulb,
  Recycle,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type {
  HouseholdAnalysisResult,
  HouseholdSampleDataset,
} from '../types/household';
import { TerraTrustLogo } from './TerraTrustLogo';

interface HouseholdDashboardPageProps {
  result: HouseholdAnalysisResult | null;
  samples: HouseholdSampleDataset[];
  onSelectSample: (sample: HouseholdSampleDataset) => void;
  onOpenInput: () => void;
  isLoading: boolean;
}

export const HouseholdDashboardPage: React.FC<HouseholdDashboardPageProps> = ({
  result,
  samples,
  onSelectSample,
  onOpenInput,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <div className="h-7 w-64 animate-pulse rounded bg-[#DCE4DF]" />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 rounded-lg border border-[#DCE4DF] bg-white p-4" />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-lg border border-[#DCE4DF] bg-white p-5" />
          ))}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="rounded-lg border border-[#DCE4DF] bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <Home className="mx-auto h-9 w-9 text-[#0F766E]" aria-hidden="true" />
          <h1 className="mt-3 font-display text-xl font-bold text-[#0F1F17]">
            No Household Tracking Data Loaded
          </h1>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-[#475850]">
            Enter monthly electricity (kWh), water (litres), and waste/recycling (kg) figures or load a sample household dataset.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onOpenInput}
              className="rounded-md bg-[#0F766E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0D645D]"
            >
              Log Monthly Data
            </button>
            {samples[0] && (
              <button
                type="button"
                onClick={() => onSelectSample(samples[0])}
                className="rounded-md border border-[#CBD5CF] bg-white px-4 py-2 text-sm font-medium text-[#0F1F17] hover:border-[#0F766E]"
              >
                Load {samples[0].label}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const {
    profile,
    latestMonth,
    historicalAverages,
    latestVsAveragePct,
    monthlyComparisons,
    anomalies,
    personalizedSuggestions,
    summaryText,
    analysisEngine,
  } = result;

  const formatDelta = (val: number | null, suffix = '%') => {
    if (val === null) return 'First month';
    if (val === 0) return `0${suffix}`;
    return `${val > 0 ? '+' : ''}${val}${suffix}`;
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      {/* Header + Sample Switcher */}
      <div className="flex flex-col gap-3 border-b border-[#DCE4DF] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-[#475850]">
            <TerraTrustLogo size="sm" showWordmark={false} />
            <span>Household Tracking</span>
            <span aria-hidden="true">·</span>
            <span>{profile.occupants} occupant{profile.occupants > 1 ? 's' : ''}</span>
            {profile.residenceType && (
              <>
                <span aria-hidden="true">·</span>
                <span>{profile.residenceType}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{analysisEngine}</span>
          </div>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-[#0F1F17] sm:text-2xl">
            {profile.householdName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-0.5 text-xs font-medium text-[#5B6D63]">Sample:</span>
          {samples.map((s) => {
            const isCurrent = s.profile.householdName === profile.householdName;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSample(s)}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isCurrent
                    ? 'border-[#0F766E] bg-[#0F766E] text-white'
                    : 'border-[#D2DCD6] bg-white text-[#304238] hover:border-[#0F766E]'
                }`}
              >
                {s.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onOpenInput}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#14532D] bg-[#F2F6F4] px-3 py-1.5 text-xs font-semibold text-[#14532D] whitespace-nowrap shrink-0 hover:bg-[#E7EFEA]"
          >
            Add / Edit Monthly Data
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 4-Column Compact KPI Strip */}
      <section className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Latest Month Household Metrics">
        <div className="rounded-lg border border-[#DCE4DF] bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#5B6D63]">
              Electricity ({latestMonth.label})
            </p>
            <Zap className="h-4 w-4 text-[#14532D]" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#0F1F17] tabular-nums">
            {latestMonth.electricityKwh.toLocaleString()}{' '}
            <span className="text-xs font-normal text-[#5B6D63]">kWh</span>
          </p>
          <p className="mt-1 font-mono text-[11px] text-[#475850] tabular-nums">
            {formatDelta(latestVsAveragePct.electricityPct)} vs {historicalAverages.electricityKwh} kWh avg
          </p>
        </div>

        <div className="rounded-lg border border-[#DCE4DF] bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#5B6D63]">
              Water ({latestMonth.label})
            </p>
            <Droplets className="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#0F1F17] tabular-nums">
            {latestMonth.waterLitres.toLocaleString()}{' '}
            <span className="text-xs font-normal text-[#5B6D63]">litres</span>
          </p>
          <p className="mt-1 font-mono text-[11px] text-[#475850] tabular-nums">
            {formatDelta(latestVsAveragePct.waterPct)} vs {historicalAverages.waterLitres.toLocaleString()} L avg
          </p>
        </div>

        <div className="rounded-lg border border-[#DCE4DF] bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#5B6D63]">
              Waste &amp; Recycling ({latestMonth.label})
            </p>
            <Recycle className="h-4 w-4 text-[#14532D]" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#0F1F17] tabular-nums">
            {latestMonth.wasteGeneratedKg}{' '}
            <span className="text-xs font-normal text-[#5B6D63]">kg</span>
          </p>
          <p className="mt-1 font-mono text-[11px] text-[#475850] tabular-nums">
            {latestMonth.wasteRecycledKg} kg recycled ({latestMonth.recyclingRatePct}% rate)
          </p>
        </div>

        <div className="rounded-lg border border-[#DCE4DF] bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#5B6D63]">Unusual Pattern Alerts</p>
            <Info className="h-4 w-4 text-[#475850]" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#0F1F17] tabular-nums">
            {anomalies.length}
          </p>
          <p className="mt-1 text-[11px] text-[#475850]">
            Across {monthlyComparisons.length} tracked month{monthlyComparisons.length > 1 ? 's' : ''}
          </p>
        </div>
      </section>

      {/* Neutral Summary Banner */}
      <div className="mt-4 rounded-lg border border-[#DCE4DF] bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
        <p className="text-sm leading-relaxed text-[#304238]">{summaryText}</p>
        <p className="mt-1.5 text-xs text-[#5B6D63]">
          Note: Consumption shifts in households are natural indicators of weather, occupancy changes, travel, or utility issues—increases do not indicate misconduct.
        </p>
      </div>

      {/* Monthly Consumption Trend Charts */}
      <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Electricity kWh Chart */}
        <div className="rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#0F1F17]">
                Monthly Electricity Consumption
              </h2>
              <p className="mt-0.5 text-xs text-[#5B6D63]">
                Electricity usage (kWh) vs. baseline ({historicalAverages.electricityKwh} kWh)
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#14532D] tabular-nums">
              {latestMonth.electricityKwh} kWh
            </span>
          </div>
          <div className="mt-3 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyComparisons} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EEEA" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475850' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475850' }} width={42} />
                <Tooltip
                  contentStyle={{ borderRadius: '6px', borderColor: '#D2DCD6', fontSize: '12px' }}
                />
                <ReferenceLine
                  y={historicalAverages.electricityKwh}
                  stroke="#B45309"
                  strokeDasharray="4 4"
                  label={{
                    value: `Avg ${historicalAverages.electricityKwh} kWh`,
                    position: 'insideTopRight',
                    fill: '#B45309',
                    fontSize: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="electricityKwh"
                  name="Electricity (kWh)"
                  stroke="#14532D"
                  strokeWidth={2}
                  fill="#14532D"
                  fillOpacity={0.09}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Water Litres Chart */}
        <div className="rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#0F1F17]">
                Monthly Water Consumption
              </h2>
              <p className="mt-0.5 text-xs text-[#5B6D63]">
                Residential water (litres) vs. baseline ({historicalAverages.waterLitres.toLocaleString()} L)
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#0F766E] tabular-nums">
              {latestMonth.waterLitres.toLocaleString()} L
            </span>
          </div>
          <div className="mt-3 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparisons} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EEEA" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475850' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475850' }} width={52} />
                <Tooltip
                  contentStyle={{ borderRadius: '6px', borderColor: '#D2DCD6', fontSize: '12px' }}
                />
                <ReferenceLine
                  y={historicalAverages.waterLitres}
                  stroke="#B45309"
                  strokeDasharray="4 4"
                />
                <Bar
                  dataKey="waterLitres"
                  name="Water (litres)"
                  fill="#0F766E"
                  radius={[3, 3, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Waste & Recycling kg Chart (full width) */}
        <div className="rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)] lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#0F1F17]">
                Monthly Waste Generation &amp; Recycling (kg)
              </h2>
              <p className="mt-0.5 text-xs text-[#5B6D63]">
                Total household waste vs. recycled material in kilograms and net monthly recycling rate (%)
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#14532D] tabular-nums">
              Latest recycling rate: {latestMonth.recyclingRatePct}%
            </span>
          </div>
          <div className="mt-3 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyComparisons} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EEEA" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475850' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#475850' }} unit=" kg" width={48} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: '#475850' }}
                  width={42}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '6px', borderColor: '#D2DCD6', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="wasteGeneratedKg"
                  name="Waste Generated (kg)"
                  fill="#94A3B8"
                  radius={[3, 3, 0, 0]}
                  barSize={24}
                />
                <Bar
                  yAxisId="left"
                  dataKey="wasteRecycledKg"
                  name="Waste Recycled (kg)"
                  fill="#14532D"
                  radius={[3, 3, 0, 0]}
                  barSize={24}
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

      {/* Detected Anomalies & AI Explanations */}
      <section className="mt-6">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0F1F17]">
            Detected Consumption Shifts &amp; AI Explanations ({anomalies.length})
          </h2>
          <p className="mt-0.5 text-xs text-[#5B6D63]">
            Unusual month-over-month or historical baseline variations with numerical evidence and likely household causes
          </p>
        </div>

        {anomalies.length === 0 ? (
          <div className="mt-3.5 rounded-lg border border-[#DCE4DF] bg-white p-6 text-center">
            <CheckCircle2 className="mx-auto h-7 w-7 text-[#14532D]" aria-hidden="true" />
            <p className="mt-2.5 text-sm font-semibold text-[#0F1F17]">
              No Unusual Consumption Anomalies Detected
            </p>
            <p className="mt-1 text-xs text-[#5B6D63]">
              Latest monthly readings are consistent with your household’s prior historical pattern.
            </p>
          </div>
        ) : (
          <div className="mt-3.5 space-y-3.5">
            {anomalies.map((anomaly) => {
              const isIncrease = anomaly.direction === 'Unusual Increase';
              return (
                <article
                  key={anomaly.id}
                  className="rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-[#5B6D63]">
                      <span className="font-mono font-semibold text-[#0F1F17]">
                        {anomaly.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{anomaly.metric}</span>
                      <span aria-hidden="true">·</span>
                      <span>{anomaly.monthLabel}</span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 font-semibold ${
                        isIncrease ? 'text-[#B45309]' : 'text-[#0F766E]'
                      }`}
                    >
                      {isIncrease ? (
                        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {anomaly.direction} · {anomaly.attentionLevel} Shift
                    </span>
                  </div>

                  <p className="mt-2.5 rounded-md bg-[#F8FAF9] px-3 py-2 font-mono text-xs text-[#0F1F17]">
                    {anomaly.numericalSummary}
                  </p>

                  <p className="mt-2.5 text-sm leading-relaxed text-[#304238]">
                    {anomaly.explanation}
                  </p>

                  <div className="mt-3.5 grid grid-cols-1 gap-5 border-t border-[#DCE4DF] pt-3.5 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-[#0F1F17]">
                        Possible Everyday Reasons
                      </p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#475850]">
                        {anomaly.possibleReasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-[#0F1F17]">
                        Practical Checks
                      </p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#475850]">
                        {anomaly.practicalChecks.map((check, idx) => (
                          <li key={idx}>{check}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Personalized Impact Reduction Suggestions */}
      <section className="mt-6 rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-[#0F1F17]">
            Personalised Suggestions to Reduce Environmental Impact
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-[#5B6D63]">
          Tailored to {profile.householdName} ({profile.occupants} occupant{profile.occupants > 1 ? 's' : ''}) based on your latest utility and waste readings
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {personalizedSuggestions.map((tip) => (
            <div key={tip.id} className="rounded-md border border-[#DCE4DF] p-4">
              <div className="flex items-center justify-between text-xs text-[#5B6D63]">
                <span className="font-semibold text-[#14532D]">{tip.domain}</span>
                <span>{tip.priority}</span>
              </div>
              <h3 className="mt-1 font-display text-sm font-semibold text-[#0F1F17]">
                {tip.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#475850]">
                {tip.description}
              </p>
              {tip.estimatedBenefit && (
                <p className="mt-2 font-mono text-[11px] font-medium text-[#0F766E]">
                  Estimated effect: {tip.estimatedBenefit}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Monthly & Historical Comparison Table */}
      <section className="mt-6 rounded-lg border border-[#DCE4DF] bg-white shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
        <div className="border-b border-[#DCE4DF] px-5 py-3.5">
          <h2 className="font-display text-sm font-semibold text-[#0F1F17]">
            Monthly &amp; Historical Consumption Ledger
          </h2>
          <p className="text-xs text-[#5B6D63]">
            Complete chronological comparison across electricity (kWh), water (litres), and waste/recycling (kg)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#DCE4DF] bg-[#F8FAF9] text-xs font-semibold text-[#475850]">
                <th className="px-4 py-2.5">Month</th>
                <th className="px-4 py-2.5 text-right">Electricity (kWh)</th>
                <th className="px-4 py-2.5 text-right">MoM %</th>
                <th className="px-4 py-2.5 text-right">Water (litres)</th>
                <th className="px-4 py-2.5 text-right">MoM %</th>
                <th className="px-4 py-2.5 text-right">Waste (kg)</th>
                <th className="px-4 py-2.5 text-right">Recycled (kg)</th>
                <th className="px-4 py-2.5 text-right">Recycling Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE4DF]">
              {monthlyComparisons.map((row) => (
                <tr key={row.month} className="hover:bg-[#F8FAF9]">
                  <td className="px-4 py-2.5 text-xs font-medium text-[#0F1F17]">{row.label}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                    {row.electricityKwh.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                    {row.electricityMomPct !== null ? (
                      <span
                        className={
                          row.electricityMomPct >= 20
                            ? 'text-[#B45309]'
                            : row.electricityMomPct <= -20
                              ? 'text-[#0F766E]'
                              : 'text-[#475850]'
                        }
                      >
                        {row.electricityMomPct > 0 ? `+${row.electricityMomPct}%` : `${row.electricityMomPct}%`}
                      </span>
                    ) : (
                      <span className="text-[#617269]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                    {row.waterLitres.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                    {row.waterMomPct !== null ? (
                      <span
                        className={
                          row.waterMomPct >= 20
                            ? 'text-[#B45309]'
                            : row.waterMomPct <= -20
                              ? 'text-[#0F766E]'
                              : 'text-[#475850]'
                        }
                      >
                        {row.waterMomPct > 0 ? `+${row.waterMomPct}%` : `${row.waterMomPct}%`}
                      </span>
                    ) : (
                      <span className="text-[#617269]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                    {row.wasteGeneratedKg}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                    {row.wasteRecycledKg}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-[#14532D] tabular-nums">
                    {row.recyclingRatePct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
