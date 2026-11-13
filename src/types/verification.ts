export interface EnvironmentalMetrics {
  carbonEmissions: number | null; // tonnes CO2e
  waterConsumption: number | null; // KL
  energyConsumption: number | null; // MWh
  renewableEnergyPct: number | null; // 0 - 100 %
  wasteGenerated: number | null; // tonnes
  wasteRecycled: number | null; // tonnes
}

export interface HistoricalYearPoint {
  year: number;
  carbonEmissions: number | null;
  waterConsumption: number | null;
  energyConsumption: number | null;
  renewableEnergyPct: number | null;
  wasteGenerated: number | null;
  wasteRecycled: number | null;
}

export interface EnvironmentalSubmission {
  id?: string;
  companyName: string;
  industry?: string;
  reportingYear: number;
  previousYear: number;
  currentMetrics: EnvironmentalMetrics;
  previousMetrics: EnvironmentalMetrics;
  historicalSeries?: HistoricalYearPoint[];
  claims: string[];
  sourceType: 'manual' | 'csv' | 'pdf' | 'sample';
  sourceFileName?: string;
}

export type SeverityLevel = 'Low' | 'Medium' | 'High';

export type FindingCategory =
  | 'Data Inconsistency'
  | 'Potential Greenwashing'
  | 'Trend Anomaly'
  | 'Missing Evidence';

export type ClaimStatus =
  | 'Verified against supplied data'
  | 'Potential inconsistency'
  | 'Suspicious pattern'
  | 'Requires verification';

export interface ClaimEvaluation {
  claim: string;
  metricDomain: string;
  status: ClaimStatus;
  claimedSummary: string;
  actualEvidence: string;
  varianceNote: string;
}

export interface VerificationFinding {
  id: string;
  title: string;
  claimOrDataPoint: string;
  category: FindingCategory;
  severity: SeverityLevel;
  reasonFlagged: string;
  numericalEvidence: string;
  explanation: string;
  verificationSteps: string[];
}

export interface ScoreBreakdown {
  dataConsistency: number; // 0-25
  evidenceCompleteness: number; // 0-25
  trendReliability: number; // 0-25
  claimToDataAlignment: number; // 0-25
}

export type ConsistencyCategory =
  | 'High consistency'
  | 'Moderate consistency'
  | 'Low consistency'
  | 'Significant inconsistencies detected';

export interface MetricDeltaSummary {
  key: keyof EnvironmentalMetrics;
  label: string;
  unit: string;
  previousValue: number | null;
  currentValue: number | null;
  absoluteChange: number | null;
  percentChange: number | null;
  directionNote: string;
}

export interface VerificationResult {
  id: string;
  analyzedAt: string;
  submission: EnvironmentalSubmission;
  consistencyScore: number; // 0-100
  consistencyCategory: ConsistencyCategory;
  scoreBreakdown: ScoreBreakdown;
  summaryMetrics: {
    totalClaimsAnalysed: number;
    verifiedAgainstData: number;
    claimsRequiringVerification: number;
    suspiciousClaims: number;
    detectedAnomalies: number;
    highSeverityWarnings: number;
  };
  metricDeltas: MetricDeltaSummary[];
  claimEvaluations: ClaimEvaluation[];
  findings: VerificationFinding[];
  recommendations: string[];
  executiveSummary: string;
  analysisEngine: 'Gemini AI + Deterministic Rules' | 'Deterministic Rule Engine';
  disclaimer: string;
}

export interface SampleDataset {
  id: string;
  label: string;
  description: string;
  expectedOutcome: string;
  submission: EnvironmentalSubmission;
}
