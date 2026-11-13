export interface HouseholdMonthlyRecord {
  id: string;
  month: string; // YYYY-MM format, e.g. "2025-10"
  label: string; // Display label, e.g. "Oct 2025"
  electricityKwh: number;
  waterLitres: number;
  wasteGeneratedKg: number;
  wasteRecycledKg: number;
  contextNote?: string;
}

export interface HouseholdProfile {
  id: string;
  householdName: string;
  occupants: number;
  residenceType?: string;
  records: HouseholdMonthlyRecord[]; // Sorted chronologically oldest -> newest
}

export type HouseholdAnomalyDirection = 'Unusual Increase' | 'Unusual Decrease';

export type HouseholdAttentionLevel = 'Low' | 'Moderate' | 'Notable';

export interface HouseholdAnomaly {
  id: string;
  month: string;
  monthLabel: string;
  metric: 'Electricity' | 'Water' | 'Waste Generation' | 'Waste Recycling Rate';
  unit: string;
  direction: HouseholdAnomalyDirection;
  attentionLevel: HouseholdAttentionLevel;
  currentValue: number;
  previousMonthValue: number | null;
  historicalAverageValue: number;
  momPercentChange: number | null;
  vsAveragePercentChange: number;
  numericalSummary: string;
  explanation: string;
  possibleReasons: string[];
  practicalChecks: string[];
}

export interface HouseholdPersonalizedTip {
  id: string;
  domain: 'Electricity' | 'Water' | 'Waste & Recycling' | 'General Habits';
  priority: 'High Impact' | 'Moderate Impact' | 'Quick Win';
  title: string;
  description: string;
  estimatedBenefit: string;
}

export interface HouseholdMonthlyComparison {
  month: string;
  label: string;
  electricityKwh: number;
  waterLitres: number;
  wasteGeneratedKg: number;
  wasteRecycledKg: number;
  recyclingRatePct: number;
  electricityMomPct: number | null;
  waterMomPct: number | null;
  wasteMomPct: number | null;
}

export interface HouseholdAnalysisResult {
  id: string;
  analyzedAt: string;
  profile: HouseholdProfile;
  latestMonth: HouseholdMonthlyComparison;
  historicalAverages: {
    electricityKwh: number;
    waterLitres: number;
    wasteGeneratedKg: number;
    wasteRecycledKg: number;
    recyclingRatePct: number;
  };
  latestVsAveragePct: {
    electricityPct: number;
    waterPct: number;
    wastePct: number;
    recyclingRateDiffPp: number;
  };
  monthlyComparisons: HouseholdMonthlyComparison[];
  anomalies: HouseholdAnomaly[];
  personalizedSuggestions: HouseholdPersonalizedTip[];
  summaryText: string;
  analysisEngine: 'Gemini AI + Deterministic Rules' | 'Deterministic Rule Engine';
}

export interface HouseholdSampleDataset {
  id: string;
  label: string;
  description: string;
  profile: HouseholdProfile;
}
