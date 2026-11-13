import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { SAMPLE_DATASETS } from './src/data/samples';
import { HOUSEHOLD_SAMPLE_DATASETS } from './src/data/householdSamples';
import type {
  HouseholdAnalysisResult,
  HouseholdMonthlyRecord,
  HouseholdProfile,
} from './src/types/household';
import type {
  EnvironmentalMetrics,
  EnvironmentalSubmission,
  VerificationResult,
} from './src/types/verification';
import { runDeterministicVerification } from './server/analysisEngine';
import { formatMonthLabel, runHouseholdDeterministicAnalysis } from './server/householdEngine';
import {
  enrichAnalysisWithGemini,
  enrichHouseholdAnalysisWithGemini,
  extractSustainabilityPdfWithGemini,
  isGeminiConfigured,
} from './server/geminiClient';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, '.data');
const AUDITS_FILE = path.join(DATA_DIR, 'audits.json');

const PROTOTYPE_DISCLAIMER =
  'Experimental Prototype Notice: The TerraTrust Consistency Score is an analytical prototype indicator derived from supplied environmental figures and verification rules. It is not an officially certified environmental rating or legal finding of misconduct.';

function loadStoredAudits(): VerificationResult[] {
  try {
    if (fs.existsSync(AUDITS_FILE)) {
      const raw = fs.readFileSync(AUDITS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage read errors in ephemeral environments
  }
  return [];
}

function saveStoredAudits(audits: VerificationResult[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(AUDITS_FILE, JSON.stringify(audits.slice(0, 25), null, 2), 'utf-8');
  } catch {
    // Ignore storage write errors in read-only environments
  }
}

function sanitizeMetricValue(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (Number.isNaN(num) || !Number.isFinite(num)) return null;
  return num;
}

function sanitizeMetrics(raw: Partial<EnvironmentalMetrics> | undefined): EnvironmentalMetrics {
  return {
    carbonEmissions: sanitizeMetricValue(raw?.carbonEmissions),
    waterConsumption: sanitizeMetricValue(raw?.waterConsumption),
    energyConsumption: sanitizeMetricValue(raw?.energyConsumption),
    renewableEnergyPct: sanitizeMetricValue(raw?.renewableEnergyPct),
    wasteGenerated: sanitizeMetricValue(raw?.wasteGenerated),
    wasteRecycled: sanitizeMetricValue(raw?.wasteRecycled),
  };
}

function validateSubmission(submission: EnvironmentalSubmission): string[] {
  const errors: string[] = [];
  if (!submission.companyName || submission.companyName.trim().length < 2) {
    errors.push('Company name is required (minimum 2 characters).');
  }
  if (
    !Number.isInteger(submission.reportingYear) ||
    submission.reportingYear < 1990 ||
    submission.reportingYear > 2100
  ) {
    errors.push('Reporting year must be a valid year between 1990 and 2100.');
  }

  const checkMetricsBlock = (metrics: EnvironmentalMetrics, label: string) => {
    const entries = Object.entries(metrics) as Array<[keyof EnvironmentalMetrics, number | null]>;
    for (const [k, v] of entries) {
      if (v !== null && v < 0) {
        errors.push(`${label} ${k} cannot be negative.`);
      }
      if (k === 'renewableEnergyPct' && v !== null && (v < 0 || v > 100)) {
        errors.push(`${label} renewable energy percentage must be between 0 and 100.`);
      }
    }
  };

  checkMetricsBlock(submission.currentMetrics, 'Current year');
  checkMetricsBlock(submission.previousMetrics, 'Previous year');

  const hasAnyMetric = Object.values(submission.currentMetrics).some((v) => v !== null);
  if (!hasAnyMetric) {
    errors.push('Please provide at least one current-year environmental metric.');
  }

  if (!Array.isArray(submission.claims) || submission.claims.filter((c) => c.trim()).length === 0) {
    errors.push('Please enter at least one sustainability claim to verify.');
  }

  return errors;
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  let auditHistory: VerificationResult[] = loadStoredAudits();

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      geminiConfigured: isGeminiConfigured(),
      storedAudits: auditHistory.length,
    });
  });

  app.get('/api/samples', (_req, res) => {
    res.json({ samples: SAMPLE_DATASETS });
  });

  app.get('/api/audits', (_req, res) => {
    res.json({ audits: auditHistory });
  });

  app.delete('/api/audits/:id', (req, res) => {
    auditHistory = auditHistory.filter((a) => a.id !== req.params.id);
    saveStoredAudits(auditHistory);
    res.json({ ok: true });
  });

  app.post('/api/analyze', async (req, res) => {
    try {
      const body = req.body as Partial<EnvironmentalSubmission>;
      const reportingYear = Number(body.reportingYear || new Date().getFullYear());
      const previousYear = Number(body.previousYear || reportingYear - 1);

      const submission: EnvironmentalSubmission = {
        id: body.id || `sub-${Date.now()}`,
        companyName: String(body.companyName ?? '').trim(),
        industry: body.industry ? String(body.industry).trim() : undefined,
        reportingYear,
        previousYear,
        currentMetrics: sanitizeMetrics(body.currentMetrics),
        previousMetrics: sanitizeMetrics(body.previousMetrics),
        historicalSeries: Array.isArray(body.historicalSeries) ? body.historicalSeries : undefined,
        claims: Array.isArray(body.claims)
          ? body.claims.map((c) => String(c).trim()).filter(Boolean)
          : [],
        sourceType: body.sourceType || 'manual',
        sourceFileName: body.sourceFileName,
      };

      const validationErrors = validateSubmission(submission);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: validationErrors[0],
          validationErrors,
        });
      }

      const deterministic = runDeterministicVerification(submission);
      const aiEnriched = await enrichAnalysisWithGemini(submission, deterministic);

      const result: VerificationResult = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        analyzedAt: new Date().toISOString(),
        submission,
        consistencyScore: deterministic.consistencyScore,
        consistencyCategory: deterministic.consistencyCategory,
        scoreBreakdown: deterministic.scoreBreakdown,
        summaryMetrics: deterministic.summaryMetrics,
        metricDeltas: deterministic.metricDeltas,
        claimEvaluations: deterministic.claimEvaluations,
        findings: aiEnriched.findings,
        recommendations: aiEnriched.recommendations,
        executiveSummary: aiEnriched.executiveSummary,
        analysisEngine: aiEnriched.usedAi
          ? 'Gemini AI + Deterministic Rules'
          : 'Deterministic Rule Engine',
        disclaimer: PROTOTYPE_DISCLAIMER,
      };

      auditHistory = [result, ...auditHistory.filter((a) => a.id !== result.id)].slice(0, 25);
      saveStoredAudits(auditHistory);

      return res.json(result);
    } catch (err) {
      console.error('Analysis error:', err);
      return res.status(500).json({
        error: 'Failed to process environmental verification analysis.',
      });
    }
  });

  app.post('/api/extract-pdf', async (req, res) => {
    try {
      const { fileName, base64Data } = req.body as {
        fileName?: string;
        base64Data?: string;
      };

      if (!fileName || !base64Data) {
        return res.status(400).json({ error: 'PDF filename and base64 payload are required.' });
      }

      const extracted = await extractSustainabilityPdfWithGemini(fileName, base64Data);
      return res.json(extracted);
    } catch (err) {
      console.error('PDF extraction error:', err);
      return res.status(500).json({ error: 'Unable to process uploaded PDF report.' });
    }
  });

  // --- Separate Household Environmental Tracking Routes ---
  app.get('/api/household/samples', (_req, res) => {
    res.json({ samples: HOUSEHOLD_SAMPLE_DATASETS });
  });

  app.post('/api/household/analyze', async (req, res) => {
    try {
      const body = req.body as Partial<HouseholdProfile>;
      const householdName = String(body.householdName ?? '').trim();
      const occupants = Math.max(1, Math.round(Number(body.occupants || 1)));
      const rawRecords = Array.isArray(body.records) ? body.records : [];

      if (householdName.length < 2) {
        return res.status(400).json({ error: 'Household name is required (minimum 2 characters).' });
      }
      if (rawRecords.length === 0) {
        return res.status(400).json({ error: 'At least one monthly environmental record is required.' });
      }

      const cleanRecords: HouseholdMonthlyRecord[] = [];
      for (const r of rawRecords) {
        const month = String(r.month ?? '').trim();
        const electricityKwh = Number(r.electricityKwh);
        const waterLitres = Number(r.waterLitres);
        const wasteGeneratedKg = Number(r.wasteGeneratedKg);
        const wasteRecycledKg = Number(r.wasteRecycledKg);

        if (!/^\d{4}-\d{2}$/.test(month)) {
          return res.status(400).json({ error: `Invalid month format "${month}". Expected YYYY-MM.` });
        }
        if (
          [electricityKwh, waterLitres, wasteGeneratedKg, wasteRecycledKg].some(
            (n) => Number.isNaN(n) || !Number.isFinite(n) || n < 0
          )
        ) {
          return res.status(400).json({ error: 'All monthly consumption and waste numbers must be zero or positive.' });
        }
        if (wasteRecycledKg > wasteGeneratedKg) {
          return res.status(400).json({
            error: `In ${month}, recycled waste (${wasteRecycledKg} kg) cannot exceed total waste generated (${wasteGeneratedKg} kg).`,
          });
        }

        cleanRecords.push({
          id: r.id || `hh-rec-${month}`,
          month,
          label: r.label || formatMonthLabel(month),
          electricityKwh,
          waterLitres,
          wasteGeneratedKg,
          wasteRecycledKg,
          contextNote: r.contextNote ? String(r.contextNote).trim() : undefined,
        });
      }

      const profile: HouseholdProfile = {
        id: body.id || `hh-${Date.now()}`,
        householdName,
        occupants,
        residenceType: body.residenceType ? String(body.residenceType).trim() : undefined,
        records: cleanRecords,
      };

      const deterministic = runHouseholdDeterministicAnalysis(profile);
      const aiEnriched = await enrichHouseholdAnalysisWithGemini(deterministic.sortedProfile, deterministic);

      const result: HouseholdAnalysisResult = {
        id: `hh-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        analyzedAt: new Date().toISOString(),
        profile: deterministic.sortedProfile,
        latestMonth: deterministic.latestMonth,
        historicalAverages: deterministic.historicalAverages,
        latestVsAveragePct: deterministic.latestVsAveragePct,
        monthlyComparisons: deterministic.monthlyComparisons,
        anomalies: aiEnriched.anomalies,
        personalizedSuggestions: aiEnriched.personalizedSuggestions,
        summaryText: aiEnriched.summaryText,
        analysisEngine: aiEnriched.usedAi
          ? 'Gemini AI + Deterministic Rules'
          : 'Deterministic Rule Engine',
      };

      return res.json(result);
    } catch (err) {
      console.error('Household analysis error:', err);
      return res.status(500).json({ error: 'Failed to analyze household environmental data.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TerraTrust server running on http://localhost:${PORT}`);
  });
}

createServer();
