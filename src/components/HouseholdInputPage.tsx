import React, { useState } from 'react';
import { AlertCircle, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type {
  HouseholdMonthlyRecord,
  HouseholdProfile,
  HouseholdSampleDataset,
} from '../types/household';

interface HouseholdInputPageProps {
  initialProfile: HouseholdProfile;
  samples: HouseholdSampleDataset[];
  onAnalyzeProfile: (profile: HouseholdProfile) => Promise<void>;
  onResetToSample: () => void;
  isAnalyzing: boolean;
  serverError: string | null;
}

function formatMonthLabelLocal(monthStr: string): string {
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
  if (Number.isNaN(date.getTime())) return monthStr;
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export const HouseholdInputPage: React.FC<HouseholdInputPageProps> = ({
  initialProfile,
  samples,
  onAnalyzeProfile,
  onResetToSample,
  isAnalyzing,
  serverError,
}) => {
  const [householdName, setHouseholdName] = useState(initialProfile.householdName);
  const [occupants, setOccupants] = useState(String(initialProfile.occupants));
  const [residenceType, setResidenceType] = useState(initialProfile.residenceType || '');
  const [records, setRecords] = useState<HouseholdMonthlyRecord[]>(initialProfile.records);

  // Fields for adding/updating a month
  const [newMonth, setNewMonth] = useState('2025-11');
  const [newElec, setNewElec] = useState('');
  const [newWater, setNewWater] = useState('');
  const [newWasteGen, setNewWasteGen] = useState('');
  const [newWasteRec, setNewWasteRec] = useState('');
  const [newNote, setNewNote] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleLoadSample = (sample: HouseholdSampleDataset) => {
    setHouseholdName(sample.profile.householdName);
    setOccupants(String(sample.profile.occupants));
    setResidenceType(sample.profile.residenceType || '');
    setRecords(sample.profile.records);
    setValidationError(null);
    setNotice(`Loaded sample household "${sample.label}" (${sample.profile.records.length} months).`);
  };

  const handleAddOrUpdateMonth = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setNotice(null);

    if (!/^\d{4}-\d{2}$/.test(newMonth.trim())) {
      setValidationError('Please select a valid month (YYYY-MM).');
      return;
    }

    const elec = Number(newElec);
    const water = Number(newWater);
    const wasteGen = Number(newWasteGen);
    const wasteRec = Number(newWasteRec);

    if (
      newElec.trim() === '' ||
      newWater.trim() === '' ||
      newWasteGen.trim() === '' ||
      newWasteRec.trim() === ''
    ) {
      setValidationError('Please fill in Electricity (kWh), Water (litres), Waste Generated (kg), and Waste Recycled (kg).');
      return;
    }

    if ([elec, water, wasteGen, wasteRec].some((n) => Number.isNaN(n) || n < 0)) {
      setValidationError('All consumption and waste numbers must be zero or positive.');
      return;
    }

    if (wasteRec > wasteGen) {
      setValidationError('Waste recycled (kg) cannot exceed total waste generated (kg).');
      return;
    }

    const entry: HouseholdMonthlyRecord = {
      id: `hh-rec-${newMonth}`,
      month: newMonth.trim(),
      label: formatMonthLabelLocal(newMonth.trim()),
      electricityKwh: elec,
      waterLitres: water,
      wasteGeneratedKg: wasteGen,
      wasteRecycledKg: wasteRec,
      contextNote: newNote.trim() || undefined,
    };

    setRecords((prev) => {
      const filtered = prev.filter((r) => r.month !== entry.month);
      return [...filtered, entry].sort((a, b) => a.month.localeCompare(b.month));
    });

    setNewElec('');
    setNewWater('');
    setNewWasteGen('');
    setNewWasteRec('');
    setNewNote('');
    setNotice(`Added ${entry.label} to the household log. Click "Analyze Household Patterns" below to update the dashboard.`);
  };

  const handleRemoveMonth = (month: string) => {
    setRecords((prev) => prev.filter((r) => r.month !== month));
  };

  const handleRunAnalysis = async () => {
    setValidationError(null);
    if (householdName.trim().length < 2) {
      setValidationError('Household name is required (at least 2 characters).');
      return;
    }
    const occNum = parseInt(occupants, 10);
    if (Number.isNaN(occNum) || occNum < 1) {
      setValidationError('Number of occupants must be at least 1.');
      return;
    }
    if (records.length === 0) {
      setValidationError('Add at least one monthly record before running analysis.');
      return;
    }

    await onAnalyzeProfile({
      id: initialProfile.id || `hh-${Date.now()}`,
      householdName: householdName.trim(),
      occupants: occNum,
      residenceType: residenceType.trim() || undefined,
      records,
    });
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-[#DCE4DF] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-[#0F1F17] sm:text-2xl">
            Household Monthly Data Entry
          </h1>
          <p className="mt-1 text-sm text-[#475850]">
            Log monthly electricity (kWh), water (litres), and waste &amp; recycling (kg) readings to track trends and detect unusual shifts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#5B6D63]">Load sample:</span>
          {samples.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleLoadSample(s)}
              className="rounded-md border border-[#D5DED8] bg-white px-3 py-1.5 text-xs font-medium text-[#0F1F17] whitespace-nowrap shrink-0 hover:border-[#14532D] hover:bg-[#EEF5F0]"
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onResetToSample();
              if (samples[0]) handleLoadSample(samples[0]);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#D5DED8] bg-white px-3 py-1.5 text-xs font-medium text-[#475850] whitespace-nowrap shrink-0 hover:border-[#14532D]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset Demo
          </button>
        </div>
      </div>

      {notice && (
        <div className="mt-5 rounded-lg border border-[#BCE0C7] bg-[#EEF7F0] px-4 py-3 text-sm text-[#14532D]">
          {notice}
        </div>
      )}

      {(validationError || serverError) && (
        <div className="mt-5 rounded-lg border border-[#F5C2C2] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]" role="alert">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{validationError || serverError}</span>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {/* Household Profile */}
        <section className="rounded-lg border border-[#DCE4DF] bg-white p-6">
          <h2 className="font-display text-base font-semibold text-[#0F1F17]">
            01. Household Profile
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="hhName" className="block text-xs font-medium text-[#304238]">
                Household Name *
              </label>
              <input
                id="hhName"
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="e.g. Maple Street Family Home"
                className="mt-1.5 w-full rounded-lg border border-[#CBD5CF] bg-white px-3 py-2 text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="hhOccupants" className="block text-xs font-medium text-[#304238]">
                Occupants *
              </label>
              <input
                id="hhOccupants"
                type="number"
                min="1"
                value={occupants}
                onChange={(e) => setOccupants(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#CBD5CF] bg-white px-3 py-2 font-mono text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="hhResidence" className="block text-xs font-medium text-[#304238]">
                Residence Type (optional)
              </label>
              <input
                id="hhResidence"
                type="text"
                value={residenceType}
                onChange={(e) => setResidenceType(e.target.value)}
                placeholder="e.g. Detached 3-Bedroom Home"
                className="mt-1.5 w-full rounded-lg border border-[#CBD5CF] bg-white px-3 py-2 text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Add Monthly Reading Form */}
        <form onSubmit={handleAddOrUpdateMonth} className="rounded-lg border border-[#DCE4DF] bg-white p-6">
          <h2 className="font-display text-base font-semibold text-[#0F1F17]">
            02. Add or Update Monthly Reading
          </h2>
          <p className="mt-0.5 text-xs text-[#5B6D63]">
            Enter a month’s meter and waste totals to append (or replace) that month in your historical series
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="hhMonth" className="block text-xs font-medium text-[#304238]">
                Reporting Month *
              </label>
              <input
                id="hhMonth"
                type="month"
                value={newMonth}
                onChange={(e) => setNewMonth(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#CBD5CF] bg-white px-3 py-2 font-mono text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="hhElec" className="block text-xs font-medium text-[#304238]">
                Electricity Consumption (kWh) *
              </label>
              <input
                id="hhElec"
                type="number"
                step="any"
                min="0"
                value={newElec}
                onChange={(e) => setNewElec(e.target.value)}
                placeholder="e.g. 420"
                className="mt-1.5 w-full rounded-lg border border-[#CBD5CF] bg-white px-3 py-2 font-mono text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="hhWater" className="block text-xs font-medium text-[#304238]">
                Water Consumption (litres) *
              </label>
              <input
                id="hhWater"
                type="number"
                step="any"
                min="0"
                value={newWater}
                onChange={(e) => setNewWater(e.target.value)}
                placeholder="e.g. 14200"
                className="mt-1.5 w-full rounded-lg border border-[#CBD5CF] bg-white px-3 py-2 font-mono text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="hhWasteGen" className="block text-xs font-medium text-[#304238]">
                Waste Generated (kg) *
              </label>
              <input
                id="hhWasteGen"
                type="number"
                step="any"
                min="0"
                value={newWasteGen}
                onChange={(e) => setNewWasteGen(e.target.value)}
                placeholder="e.g. 52"
                className="mt-1.5 w-full rounded-lg border border-[#CBD5CF] bg-white px-3 py-2 font-mono text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="hhWasteRec" className="block text-xs font-medium text-[#304238]">
                Waste Recycled (kg) *
              </label>
              <input
                id="hhWasteRec"
                type="number"
                step="any"
                min="0"
                value={newWasteRec}
                onChange={(e) => setNewWasteRec(e.target.value)}
                placeholder="e.g. 28"
                className="mt-1.5 w-full rounded-lg border border-[#CBD5CF] bg-white px-3 py-2 font-mono text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="hhNote" className="block text-xs font-medium text-[#304238]">
                Context Note (optional)
              </label>
              <input
                id="hhNote"
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="e.g. Family guests / AC usage"
                className="mt-1.5 w-full rounded-lg border border-[#CBD5CF] bg-white px-3 py-2 text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#14532D] bg-[#EEF5F0] px-4 py-2 text-xs font-semibold text-[#14532D] hover:bg-[#E1EDE5]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Month to History
            </button>
          </div>
        </form>

        {/* Recorded Months Table */}
        <section className="rounded-lg border border-[#DCE4DF] bg-white">
          <div className="border-b border-[#E2E8E4] px-6 py-4">
            <h2 className="font-display text-base font-semibold text-[#0F1F17]">
              03. Logged Monthly History ({records.length} month{records.length === 1 ? '' : 's'})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#E2E8E4] bg-[#F7F9F8] text-xs font-semibold text-[#475850]">
                  <th className="px-5 py-3">Month</th>
                  <th className="px-5 py-3 text-right">Electricity (kWh)</th>
                  <th className="px-5 py-3 text-right">Water (litres)</th>
                  <th className="px-5 py-3 text-right">Waste Gen (kg)</th>
                  <th className="px-5 py-3 text-right">Recycled (kg)</th>
                  <th className="px-5 py-3">Context Note</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E4]">
                {records.map((rec) => (
                  <tr key={rec.month} className="hover:bg-[#F9FBFA]">
                    <td className="px-5 py-3 font-medium text-[#0F1F17]">{rec.label}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {rec.electricityKwh.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {rec.waterLitres.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {rec.wasteGeneratedKg}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {rec.wasteRecycledKg}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#475850]">
                      {rec.contextNote || '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveMonth(rec.month)}
                        disabled={records.length <= 1}
                        aria-label={`Remove ${rec.label}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E2E8E4] text-[#5B6D63] hover:border-[#B91C1C] hover:text-[#B91C1C] disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Submit Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#DCE4DF] bg-white px-6 py-4">
          <p className="text-xs text-[#5B6D63]">
            Analyzes month-over-month and historical baseline shifts across kWh, litres, and kg with personalized reduction tips.
          </p>
          <button
            type="button"
            disabled={isAnalyzing}
            onClick={handleRunAnalysis}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#14532D] px-6 py-2.5 text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-[#166534] disabled:opacity-60"
          >
            {isAnalyzing ? 'Analyzing Household Patterns...' : 'Analyze Household Patterns'}
          </button>
        </div>
      </div>
    </div>
  );
};
