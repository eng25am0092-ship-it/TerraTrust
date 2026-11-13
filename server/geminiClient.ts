import { GoogleGenAI, Type } from '@google/genai';
import type {
  HouseholdAnomaly,
  HouseholdPersonalizedTip,
  HouseholdProfile,
} from '../src/types/household';
import type {
  EnvironmentalSubmission,
  VerificationFinding,
  VerificationResult,
} from '../src/types/verification';

const FREE_TIER_MODEL = 'gemini-4-hydrogen';

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
}

export async function enrichAnalysisWithGemini(
  submission: EnvironmentalSubmission,
  deterministic: Omit<
    VerificationResult,
    'id' | 'analyzedAt' | 'submission' | 'analysisEngine' | 'disclaimer'
  >
): Promise<{
  usedAi: boolean;
  executiveSummary: string;
  findings: VerificationFinding[];
  recommendations: string[];
}> {
  const ai = getClient();
  if (!ai) {
    return {
      usedAi: false,
      executiveSummary: deterministic.executiveSummary,
      findings: deterministic.findings,
      recommendations: deterministic.recommendations,
    };
  }

  try {
    const promptPayload = {
      companyName: submission.companyName,
      industry: submission.industry ?? 'Not specified',
      reportingYear: submission.reportingYear,
      previousYear: submission.previousYear,
      previousMetrics: submission.previousMetrics,
      currentMetrics: submission.currentMetrics,
      claims: submission.claims,
      deterministicDeltas: deterministic.metricDeltas,
      deterministicClaimEvaluations: deterministic.claimEvaluations,
      deterministicFindings: deterministic.findings,
      preliminaryScore: deterministic.consistencyScore,
      preliminaryCategory: deterministic.consistencyCategory,
    };

    const response = await ai.models.generateContent({
      model: FREE_TIER_MODEL,
      contents: `Analyze this corporate environmental submission and the deterministic verification baseline. Improve the clarity, auditing precision, and helpfulness of the executive summary, findings explanations, and recommendations without inventing any missing numbers or evidence.\n\nDATA:\n${JSON.stringify(promptPayload, null, 2)}`,
      config: {
        systemInstruction:
          'You are TerraTrust, an objective environmental data verification analyst. Your role is to compare sustainability claims against supplied numerical figures, explain inconsistencies in clear, accessible language, identify missing evidence, and recommend practical verification steps. CRITICAL RULES: (1) Never invent missing data, units, or evidence. When data is null/missing, explicitly state that further evidence is required. (2) Never accuse a company of fraud or dishonesty; use neutral auditing language such as "Potential inconsistency", "Suspicious pattern", and "Requires verification", clearly distinguishing between an anomaly and proven manipulation. (3) Keep numerical evidence grounded strictly in the provided figures.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: {
              type: Type.STRING,
              description: 'A 2-4 sentence objective summary of the verification findings and score.',
            },
            findings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  claimOrDataPoint: { type: Type.STRING },
                  category: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  reasonFlagged: { type: Type.STRING },
                  numericalEvidence: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  verificationSteps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
              },
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new Error('Empty response from Gemini API');
    }

    const parsed = JSON.parse(rawText) as {
      executiveSummary?: string;
      findings?: Array<Partial<VerificationFinding>>;
      recommendations?: string[];
    };

    const validSeverities = new Set(['Low', 'Medium', 'High']);
    const validCategories = new Set([
      'Data Inconsistency',
      'Potential Greenwashing',
      'Trend Anomaly',
      'Missing Evidence',
    ]);

    const normalizedFindings: VerificationFinding[] =
      Array.isArray(parsed.findings) && parsed.findings.length > 0
        ? parsed.findings.map((f, idx) => {
            const fallback = deterministic.findings[idx];
            return {
              id: f.id || fallback?.id || `TT-F${String(idx + 1).padStart(2, '0')}`,
              title: f.title || fallback?.title || 'Environmental reporting observation',
              claimOrDataPoint:
                f.claimOrDataPoint || fallback?.claimOrDataPoint || 'Submitted environmental data',
              category:
                f.category && validCategories.has(f.category)
                  ? (f.category as VerificationFinding['category'])
                  : fallback?.category || 'Data Inconsistency',
              severity:
                f.severity && validSeverities.has(f.severity)
                  ? (f.severity as VerificationFinding['severity'])
                  : fallback?.severity || 'Medium',
              reasonFlagged: f.reasonFlagged || fallback?.reasonFlagged || 'Requires verification.',
              numericalEvidence:
                f.numericalEvidence || fallback?.numericalEvidence || 'Refer to submitted metrics.',
              explanation: f.explanation || fallback?.explanation || 'Requires further verification.',
              verificationSteps:
                Array.isArray(f.verificationSteps) && f.verificationSteps.length > 0
                  ? f.verificationSteps
                  : fallback?.verificationSteps || ['Request supporting primary documentation.'],
            };
          })
        : deterministic.findings;

    return {
      usedAi: true,
      executiveSummary: parsed.executiveSummary || deterministic.executiveSummary,
      findings: normalizedFindings,
      recommendations:
        Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
          ? parsed.recommendations
          : deterministic.recommendations,
    };
  } catch (err) {
    console.warn('Gemini enrichment failed, falling back to deterministic engine:', err);
    return {
      usedAi: false,
      executiveSummary: deterministic.executiveSummary,
      findings: deterministic.findings,
      recommendations: deterministic.recommendations,
    };
  }
}

export async function extractSustainabilityPdfWithGemini(
  fileName: string,
  base64Data: string
): Promise<{
  submission: Partial<EnvironmentalSubmission>;
  extractionMethod: 'gemini' | 'fallback';
  warning?: string;
}> {
  const ai = getClient();
  if (!ai) {
    // Lightweight fallback text scan for uncompressed text-based PDFs
    const rawUtf8 = Buffer.from(base64Data, 'base64').toString('latin1');
    const readableText = rawUtf8.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ');
    return {
      extractionMethod: 'fallback',
      warning:
        'Gemini API key is not configured, so automated PDF parsing used basic text scanning. Please review and complete any missing fields below.',
      submission: {
        companyName: fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '),
        reportingYear: 2025,
        previousYear: 2024,
        claims: readableText.includes('carbon')
          ? ['Extracted text references carbon metrics; please paste specific claims below.']
          : [],
        sourceType: 'pdf',
        sourceFileName: fileName,
      },
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: FREE_TIER_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data,
            },
          },
          {
            text: 'Extract environmental reporting metrics and sustainability claims from this PDF sustainability report. Only extract values explicitly present in the document. Use null for any figure not explicitly reported.',
          },
        ],
      },
      config: {
        systemInstruction:
          'Extract corporate environmental data accurately. Do not invent or estimate missing figures; return null for unavailable numbers. Convert units to tonnes CO2e for carbon, kiloliters (KL) for water if stated in m3 (1 m3 = 1 KL) or liters (1000 L = 1 KL), MWh for energy, % (0-100) for renewable energy share, and tonnes for waste.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyName: { type: Type.STRING },
            industry: { type: Type.STRING },
            reportingYear: { type: Type.INTEGER },
            previousYear: { type: Type.INTEGER },
            currentMetrics: {
              type: Type.OBJECT,
              properties: {
                carbonEmissions: { type: Type.NUMBER, nullable: true },
                waterConsumption: { type: Type.NUMBER, nullable: true },
                energyConsumption: { type: Type.NUMBER, nullable: true },
                renewableEnergyPct: { type: Type.NUMBER, nullable: true },
                wasteGenerated: { type: Type.NUMBER, nullable: true },
                wasteRecycled: { type: Type.NUMBER, nullable: true },
              },
            },
            previousMetrics: {
              type: Type.OBJECT,
              properties: {
                carbonEmissions: { type: Type.NUMBER, nullable: true },
                waterConsumption: { type: Type.NUMBER, nullable: true },
                energyConsumption: { type: Type.NUMBER, nullable: true },
                renewableEnergyPct: { type: Type.NUMBER, nullable: true },
                wasteGenerated: { type: Type.NUMBER, nullable: true },
                wasteRecycled: { type: Type.NUMBER, nullable: true },
              },
            },
            claims: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<EnvironmentalSubmission>;
    return {
      extractionMethod: 'gemini',
      submission: {
        ...parsed,
        sourceType: 'pdf',
        sourceFileName: fileName,
      },
    };
  } catch (err) {
    console.warn('Gemini PDF extraction failed:', err);
    return {
      extractionMethod: 'fallback',
      warning:
        'Could not automatically parse this PDF via Gemini API. Please enter the extracted metrics manually or upload a CSV file.',
      submission: {
        companyName: fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '),
        reportingYear: 2025,
        previousYear: 2024,
        sourceType: 'pdf',
        sourceFileName: fileName,
      },
    };
  }
}

export async function enrichHouseholdAnalysisWithGemini(
  profile: HouseholdProfile,
  deterministic: {
    anomalies: HouseholdAnomaly[];
    personalizedSuggestions: HouseholdPersonalizedTip[];
    summaryText: string;
    historicalAverages: {
      electricityKwh: number;
      waterLitres: number;
      wasteGeneratedKg: number;
      wasteRecycledKg: number;
      recyclingRatePct: number;
    };
  }
): Promise<{
  usedAi: boolean;
  summaryText: string;
  anomalies: HouseholdAnomaly[];
  personalizedSuggestions: HouseholdPersonalizedTip[];
}> {
  const ai = getClient();
  if (!ai) {
    return {
      usedAi: false,
      summaryText: deterministic.summaryText,
      anomalies: deterministic.anomalies,
      personalizedSuggestions: deterministic.personalizedSuggestions,
    };
  }

  try {
    const payload = {
      householdName: profile.householdName,
      occupants: profile.occupants,
      residenceType: profile.residenceType ?? 'Residential Home',
      recentRecords: profile.records.slice(-6),
      historicalAverages: deterministic.historicalAverages,
      detectedAnomalies: deterministic.anomalies,
      baselineSuggestions: deterministic.personalizedSuggestions,
    };

    const response = await ai.models.generateContent({
      model: FREE_TIER_MODEL,
      contents: `Analyze this household's monthly electricity (kWh), water (litres), and waste/recycling (kg) patterns. Provide warm, helpful, non-judgmental explanations for each detected anomaly (including realistic everyday causes like seasonal weather, travel, visiting guests, appliance loads, or possible leaks) and practical personalized tips to reduce environmental impact.\n\nHOUSEHOLD DATA:\n${JSON.stringify(payload, null, 2)}`,
      config: {
        systemInstruction:
          'You are TerraTrust Household Advisor, an objective and supportive residential sustainability assistant. Explain unusual increases or decreases in electricity (kWh), water (litres), and waste/recycling (kg) in simple everyday language. CRITICAL RULES: (1) Never accuse the household of misconduct, dishonesty, or greenwashing—higher consumption is often due to weather, guests, travel, or leaks. (2) Ground all numbers strictly in the supplied data; never invent readings. (3) Keep tips practical, tailored to the household size and highest-impact categories.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryText: { type: Type.STRING },
            anomalies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  possibleReasons: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  practicalChecks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
              },
            },
            personalizedSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  domain: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  estimatedBenefit: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      summaryText?: string;
      anomalies?: Array<{
        id?: string;
        explanation?: string;
        possibleReasons?: string[];
        practicalChecks?: string[];
      }>;
      personalizedSuggestions?: Array<Partial<HouseholdPersonalizedTip>>;
    };

    const mergedAnomalies: HouseholdAnomaly[] = deterministic.anomalies.map((base, idx) => {
      const aiMatch =
        parsed.anomalies?.find((a) => a.id === base.id) || parsed.anomalies?.[idx];
      return {
        ...base,
        explanation: aiMatch?.explanation || base.explanation,
        possibleReasons:
          Array.isArray(aiMatch?.possibleReasons) && aiMatch.possibleReasons.length > 0
            ? aiMatch.possibleReasons
            : base.possibleReasons,
        practicalChecks:
          Array.isArray(aiMatch?.practicalChecks) && aiMatch.practicalChecks.length > 0
            ? aiMatch.practicalChecks
            : base.practicalChecks,
      };
    });

    const validDomains = new Set(['Electricity', 'Water', 'Waste & Recycling', 'General Habits']);
    const validPriorities = new Set(['High Impact', 'Moderate Impact', 'Quick Win']);

    const mergedTips: HouseholdPersonalizedTip[] =
      Array.isArray(parsed.personalizedSuggestions) && parsed.personalizedSuggestions.length > 0
        ? parsed.personalizedSuggestions.map((t, idx) => {
            const fallback = deterministic.personalizedSuggestions[idx];
            return {
              id: t.id || fallback?.id || `HH-TIP-${idx + 1}`,
              domain:
                t.domain && validDomains.has(t.domain)
                  ? (t.domain as HouseholdPersonalizedTip['domain'])
                  : fallback?.domain || 'General Habits',
              priority:
                t.priority && validPriorities.has(t.priority)
                  ? (t.priority as HouseholdPersonalizedTip['priority'])
                  : fallback?.priority || 'Moderate Impact',
              title: t.title || fallback?.title || 'Reduce household resource consumption',
              description: t.description || fallback?.description || '',
              estimatedBenefit: t.estimatedBenefit || fallback?.estimatedBenefit || '',
            };
          })
        : deterministic.personalizedSuggestions;

    return {
      usedAi: true,
      summaryText: parsed.summaryText || deterministic.summaryText,
      anomalies: mergedAnomalies,
      personalizedSuggestions: mergedTips,
    };
  } catch (err) {
    console.warn('Gemini household enrichment failed, falling back to deterministic rules:', err);
    return {
      usedAi: false,
      summaryText: deterministic.summaryText,
      anomalies: deterministic.anomalies,
      personalizedSuggestions: deterministic.personalizedSuggestions,
    };
  }
}

