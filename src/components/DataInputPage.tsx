import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  EnvironmentalMetrics,
  EnvironmentalSubmission,
  SampleDataset,
} from '../types/verification';
import { generateSampleCsvContent, parseEnvironmentalCsv } from '../utils/csvParser';

interface DataInputPageProps {
  initialSubmission: EnvironmentalSubmission;
  samples: SampleDataset[];
  onSubmitAnalysis: (submission: EnvironmentalSubmission) => Promise<void>;
  onResetAll: () => void;
  isAnalyzing: boolean;
  serverError: string | null;
}

type InputTab = 'manual' | 'csv' | 'pdf';

interface FormMetrics {
  carbonEmissions: string;
  waterConsumption: string;
  energyConsumption: string;
  renewableEnergyPct: string;
  wasteGenerated: string;
  wasteRecycled: string;
}

const METRIC_FIELDS: Array<{
  key: keyof FormMetrics;
  label: string;
  unit: string;
  placeholderPrev: string;
  placeholderCurr: string;
}> = [
  {
    key: 'carbonEmissions',
    label: 'Carbon Emissions',
    unit: 'tonnes CO2e',
    placeholderPrev: 'e.g. 1000',
    placeholderCurr: 'e.g. 880',
  },
  {
    key: 'waterConsumption',
    label: 'Water Consumption',
    unit: 'KL',
    placeholderPrev: 'e.g. 50000',
    placeholderCurr: 'e.g. 65000',
  },
  {
    key: 'energyConsumption',
    label: 'Total Energy Consumption',
    unit: 'MWh (optional if missing)',
    placeholderPrev: 'e.g. 4500',
    placeholderCurr: 'e.g. 4300',
  },
  {
    key: 'renewableEnergyPct',
    label: 'Renewable Energy Share',
    unit: '% (0–100)',
    placeholderPrev: 'e.g. 20',
    placeholderCurr: 'e.g. 55',
  },
  {
    key: 'wasteGenerated',
    label: 'Waste Generated',
    unit: 'tonnes',
    placeholderPrev: 'e.g. 500',
    placeholderCurr: 'e.g. 700',
  },
  {
    key: 'wasteRecycled',
    label: 'Waste Recycled',
    unit: 'tonnes',
    placeholderPrev: 'e.g. 200',
    placeholderCurr: 'e.g. 250',
  },
];

function metricsToForm(m?: Partial<EnvironmentalMetrics>): FormMetrics {
  return {
    carbonEmissions: m?.carbonEmissions !== null && m?.carbonEmissions !== undefined ? String(m.carbonEmissions) : '',
    waterConsumption: m?.waterConsumption !== null && m?.waterConsumption !== undefined ? String(m.waterConsumption) : '',
    energyConsumption: m?.energyConsumption !== null && m?.energyConsumption !== undefined ? String(m.energyConsumption) : '',
    renewableEnergyPct: m?.renewableEnergyPct !== null && m?.renewableEnergyPct !== undefined ? String(m.renewableEnergyPct) : '',
    wasteGenerated: m?.wasteGenerated !== null && m?.wasteGenerated !== undefined ? String(m.wasteGenerated) : '',
    wasteRecycled: m?.wasteRecycled !== null && m?.wasteRecycled !== undefined ? String(m.wasteRecycled) : '',
  };
}

function formToMetrics(f: FormMetrics): EnvironmentalMetrics {
  const parseField = (val: string): number | null => {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  };
  return {
    carbonEmissions: parseField(f.carbonEmissions),
    waterConsumption: parseField(f.waterConsumption),
    energyConsumption: parseField(f.energyConsumption),
    renewableEnergyPct: parseField(f.renewableEnergyPct),
    wasteGenerated: parseField(f.wasteGenerated),
    wasteRecycled: parseField(f.wasteRecycled),
  };
}

export const DataInputPage: React.FC<DataInputPageProps> = ({
  initialSubmission,
  samples,
  onSubmitAnalysis,
  onResetAll,
  isAnalyzing,
  serverError,
}) => {
  const [activeTab, setActiveTab] = useState<InputTab>('manual');
  const [companyName, setCompanyName] = useState(initialSubmission.companyName);
  const [industry, setIndustry] = useState(initialSubmission.industry || '');
  const [reportingYear, setReportingYear] = useState(String(initialSubmission.reportingYear));
  const [previousYear, setPreviousYear] = useState(String(initialSubmission.previousYear));
  const [previousMetrics, setPreviousMetrics] = useState<FormMetrics>(() =>
    metricsToForm(initialSubmission.previousMetrics)
  );
  const [currentMetrics, setCurrentMetrics] = useState<FormMetrics>(() =>
    metricsToForm(initialSubmission.currentMetrics)
  );
  const [claims, setClaims] = useState<string[]>(
    initialSubmission.claims.length > 0 ? initialSubmission.claims : ['']
  );
  const [sourceType, setSourceType] = useState<EnvironmentalSubmission['sourceType']>(
    initialSubmission.sourceType
  );
  const [sourceFileName, setSourceFileName] = useState<string | undefined>(
    initialSubmission.sourceFileName
  );
  const [historicalSeries, setHistoricalSeries] = useState(initialSubmission.historicalSeries);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const loadSubmissionIntoForm = (sub: Partial<EnvironmentalSubmission>) => {
    if (sub.companyName) setCompanyName(sub.companyName);
    if (sub.industry !== undefined) setIndustry(sub.industry || '');
    if (sub.reportingYear) setReportingYear(String(sub.reportingYear));
    if (sub.previousYear) setPreviousYear(String(sub.previousYear));
    if (sub.previousMetrics) setPreviousMetrics(metricsToForm(sub.previousMetrics));
    if (sub.currentMetrics) setCurrentMetrics(metricsToForm(sub.currentMetrics));
    if (sub.claims && sub.claims.length > 0) setClaims(sub.claims);
    if (sub.sourceType) setSourceType(sub.sourceType);
    setSourceFileName(sub.sourceFileName);
    setHistoricalSeries(sub.historicalSeries);
    setValidationErrors([]);
  };

  const handleLoadSample = (sample: SampleDataset) => {
    loadSubmissionIntoForm(sample.submission);
    setUploadNotice(`Loaded sample dataset: ${sample.label}. Click "Run Verification Analysis" to inspect results.`);
  };

  const handleClearForm = () => {
    setCompanyName('');
    setIndustry('');
    setReportingYear('2025');
    setPreviousYear('2024');
    setPreviousMetrics(metricsToForm({}));
    setCurrentMetrics(metricsToForm({}));
    setClaims(['']);
    setSourceType('manual');
    setSourceFileName(undefined);
    setHistoricalSeries(undefined);
    setValidationErrors([]);
    setUploadNotice(null);
    onResetAll();
  };

  const handleClaimChange = (idx: number, val: string) => {
    setClaims((prev) => prev.map((c, i) => (i === idx ? val : c)));
  };

  const handleAddClaim = () => {
    setClaims((prev) => [...prev, '']);
  };

  const handleRemoveClaim = (idx: number) => {
    setClaims((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : ['']));
  };

  const handleDownloadSampleCsv = () => {
    const csv = generateSampleCsvContent();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'greenfuture_industries_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (file: File) => {
    setValidationErrors([]);
    setUploadNotice(null);
    try {
      const text = await file.text();
      const parsed = parseEnvironmentalCsv(text, file.name);
      if (parsed.error || !parsed.submission) {
        setValidationErrors([parsed.error || 'Could not parse CSV file.']);
        return;
      }
      loadSubmissionIntoForm(parsed.submission);
      setUploadNotice(
        `Parsed "${file.name}" successfully. Review the imported metrics and claims below, then run verification.`
      );
      setActiveTab('manual');
    } catch {
      setValidationErrors(['Failed to read the uploaded CSV file. Please verify file encoding.']);
    }
  };

  const handlePdfUpload = async (file: File) => {
    setValidationErrors([]);
    setUploadNotice(null);
    if (file.size > 10 * 1024 * 1024) {
      setValidationErrors(['PDF file exceeds 10 MB limit. Please upload a smaller report.']);
      return;
    }

    setIsExtractingPdf(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, base64Data }),
      });

      const data = await response.json();
      if (!response.ok) {
        setValidationErrors([data.error || 'Failed to extract metrics from PDF.']);
        return;
      }

      if (data.submission) {
        loadSubmissionIntoForm(data.submission);
      }
      setUploadNotice(
        data.warning ||
          `Extracted environmental data from "${file.name}" (${data.extractionMethod === 'gemini' ? 'via Gemini AI' : 'text scan'}). Please review all values before running verification.`
      );
      setActiveTab('manual');
    } catch {
      setValidationErrors(['Unable to process the uploaded PDF report. Try CSV or manual entry.']);
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!companyName.trim() || companyName.trim().length < 2) {
      errors.push('Company name is required (at least 2 characters).');
    }
    const repYear = parseInt(reportingYear, 10);
    const prevYear = parseInt(previousYear, 10);
    if (Number.isNaN(repYear) || repYear < 1990 || repYear > 2100) {
      errors.push('Reporting year must be a valid four-digit year.');
    }
    if (Number.isNaN(prevYear) || prevYear < 1990 || prevYear > 2100) {
      errors.push('Previous reporting year must be a valid four-digit year.');
    }

    const currObj = formToMetrics(currentMetrics);
    const prevObj = formToMetrics(previousMetrics);

    const checkBlock = (block: EnvironmentalMetrics, label: string) => {
      for (const field of METRIC_FIELDS) {
        const val = block[field.key];
        if (val !== null && val < 0) {
          errors.push(`${label} ${field.label} cannot be negative.`);
        }
        if (field.key === 'renewableEnergyPct' && val !== null && (val < 0 || val > 100)) {
          errors.push(`${label} Renewable Energy Share must be between 0% and 100%.`);
        }
      }
    };

    checkBlock(currObj, 'Current year');
    checkBlock(prevObj, 'Previous year');

    const hasAnyCurrent = Object.values(currObj).some((v) => v !== null);
    if (!hasAnyCurrent) {
      errors.push('Enter at least one current-year environmental metric.');
    }

    const cleanedClaims = claims.map((c) => c.trim()).filter(Boolean);
    if (cleanedClaims.length === 0) {
      errors.push('Enter at least one sustainability claim made by the company.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    await onSubmitAnalysis({
      companyName: companyName.trim(),
      industry: industry.trim() || undefined,
      reportingYear: repYear,
      previousYear: prevYear,
      previousMetrics: prevObj,
      currentMetrics: currObj,
      historicalSeries,
      claims: cleanedClaims,
      sourceType,
      sourceFileName,
    });
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-[#DCE4DF] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-[#0F1F17] sm:text-2xl">
            Environmental Data Input &amp; Upload
          </h1>
          <p className="mt-1 text-sm text-[#475850]">
            Submit metrics manually, upload a CSV sheet, extract figures from a PDF sustainability report, or load a sample dataset.
          </p>
        </div>

        {/* Sample Quick-Load Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#5B6D63]">Load sample:</span>
          {samples.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleLoadSample(s)}
              className="rounded-md border border-[#D5DED8] bg-white px-3 py-1.5 text-xs font-medium text-[#0F1F17] whitespace-nowrap shrink-0 transition-colors hover:border-[#14532D] hover:bg-[#EEF5F0]"
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClearForm}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#D5DED8] bg-white px-3 py-1.5 text-xs font-medium text-[#475850] whitespace-nowrap shrink-0 hover:border-[#B91C1C] hover:text-[#B91C1C]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      {/* Input Mode Tabs */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-lg border border-[#E2E8E4] bg-[#EEF2EF] p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'manual'}
            onClick={() => setActiveTab('manual')}
            className={`rounded-md px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'manual'
                ? 'bg-white text-[#0F1F17] shadow-xs'
                : 'text-[#475850] hover:text-[#0F1F17]'
            }`}
          >
            Manual Data Entry
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'csv'}
            onClick={() => setActiveTab('csv')}
            className={`rounded-md px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'csv'
                ? 'bg-white text-[#0F1F17] shadow-xs'
                : 'text-[#475850] hover:text-[#0F1F17]'
            }`}
          >
            CSV File Upload
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pdf'}
            onClick={() => setActiveTab('pdf')}
            className={`rounded-md px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'pdf'
                ? 'bg-white text-[#0F1F17] shadow-xs'
                : 'text-[#475850] hover:text-[#0F1F17]'
            }`}
          >
            PDF Report Upload
          </button>
        </div>

        {sourceFileName && (
          <p className="text-xs text-[#5B6D63]">
            Active source: <span className="font-mono text-[#0F1F17]">{sourceFileName}</span>
          </p>
        )}
      </div>

      {/* Notices & Validation Errors */}
      {uploadNotice && (
        <div className="mt-5 rounded-lg border border-[#BCE0C7] bg-[#EEF7F0] px-4 py-3 text-sm text-[#14532D]">
          {uploadNotice}
        </div>
      )}

      {(validationErrors.length > 0 || serverError) && (
        <div className="mt-5 rounded-lg border border-[#F5C2C2] bg-[#FEF2F2] p-4" role="alert">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Please resolve the following validation issues:</span>
          </div>
          <ul className="mt-2 list-disc pl-5 text-xs text-[#991B1B] space-y-1">
            {serverError && <li>{serverError}</li>}
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* CSV Upload Panel */}
      {activeTab === 'csv' && (
        <div className="mt-6 rounded-lg border border-[#DCE4DF] bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
                Import Environmental Dataset via CSV
              </h2>
              <p className="mt-1 text-sm text-[#475850]">
                Upload a CSV containing previous-year and current-year metrics plus sustainability claims.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5CF] bg-white px-4 py-2 text-xs font-semibold text-[#0F1F17] whitespace-nowrap shrink-0 hover:border-[#14532D]"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download Sample CSV
            </button>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleCsvUpload(file);
            }}
            className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5CF] bg-[#F7F9F8] px-6 py-12 text-center"
          >
            <FileSpreadsheet className="h-10 w-10 text-[#14532D]" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-[#0F1F17]">
              Drag and drop a CSV file here, or browse from your computer
            </p>
            <p className="mt-1 text-xs text-[#5B6D63]">
              Supports vertical audit-sheet CSVs and horizontal multi-column sustainability sheets
            </p>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCsvUpload(file);
              }}
            />
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#14532D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#166534]"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Choose CSV File
            </button>
          </div>
        </div>
      )}

      {/* PDF Upload Panel */}
      {activeTab === 'pdf' && (
        <div className="mt-6 rounded-lg border border-[#DCE4DF] bg-white p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold text-[#0F1F17]">
            Extract Data from PDF Sustainability Report
          </h2>
          <p className="mt-1 text-sm text-[#475850]">
            Upload a corporate ESG or sustainability PDF report (up to 10 MB). TerraTrust uses Gemini AI
            document parsing to extract reported environmental figures and claims for verification.
          </p>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handlePdfUpload(file);
            }}
            className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5CF] bg-[#F7F9F8] px-6 py-12 text-center"
          >
            <FileText className="h-10 w-10 text-[#14532D]" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-[#0F1F17]">
              {isExtractingPdf
                ? 'Extracting metrics and sustainability claims from PDF...'
                : 'Drag and drop a PDF sustainability report here, or browse'}
            </p>
            <p className="mt-1 text-xs text-[#5B6D63]">
              Extracted values populate the verification form so you can inspect them before running analysis
            </p>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePdfUpload(file);
              }}
            />
            <button
              type="button"
              disabled={isExtractingPdf}
              onClick={() => pdfInputRef.current?.click()}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#14532D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#166534] disabled:opacity-60"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              {isExtractingPdf ? 'Processing PDF...' : 'Choose PDF Report'}
            </button>
          </div>
        </div>
      )}

      {/* Manual Data Entry Form (Always visible in Manual tab, or after import) */}
      {activeTab === 'manual' && (
        <form onSubmit={validateAndSubmit} className="mt-6 space-y-6">
          {/* Company Metadata */}
          <div className="rounded-lg border border-[#DCE4DF] bg-white p-6">
            <h2 className="font-display text-base font-semibold text-[#0F1F17]">
              01. Company &amp; Reporting Period
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="companyName" className="block text-xs font-medium text-[#304238]">
                  Company Name *
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. GreenFuture Industries"
                  className="mt-1.5 w-full rounded-lg border border-[#CBD5CF] bg-white px-3 py-2 text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="industry" className="block text-xs font-medium text-[#304238]">
                  Industry Sector
                </label>
                <input
                  id="industry"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Industrial Manufacturing"
                  className="mt-1.5 w-full rounded-lg border border-[#CBD5CF] bg-white px-3 py-2 text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="previousYear" className="block text-xs font-medium text-[#304238]">
                  Previous Reporting Year *
                </label>
                <input
                  id="previousYear"
                  type="number"
                  value={previousYear}
                  onChange={(e) => setPreviousYear(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#CBD5CF] bg-white px-3 py-2 font-mono text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="reportingYear" className="block text-xs font-medium text-[#304238]">
                  Current Reporting Year *
                </label>
                <input
                  id="reportingYear"
                  type="number"
                  value={reportingYear}
                  onChange={(e) => setReportingYear(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#CBD5CF] bg-white px-3 py-2 font-mono text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Metrics Comparison Grid */}
          <div className="rounded-lg border border-[#DCE4DF] bg-white p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-base font-semibold text-[#0F1F17]">
                02. Environmental Figures ({previousYear || 'Prev'} vs. {reportingYear || 'Current'})
              </h2>
              <p className="text-xs text-[#5B6D63]">
                Leave blank if a metric was omitted or unavailable in the company report
              </p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8E4] bg-[#F7F9F8] text-xs font-semibold text-[#475850]">
                    <th className="px-4 py-3">Environmental Indicator</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Previous Year ({previousYear || 'Prev'})</th>
                    <th className="px-4 py-3">Current Year ({reportingYear || 'Current'})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E4]">
                  {METRIC_FIELDS.map((field) => (
                    <tr key={field.key}>
                      <td className="px-4 py-3 font-medium text-[#0F1F17]">{field.label}</td>
                      <td className="px-4 py-3 text-xs text-[#5B6D63]">{field.unit}</td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          step="any"
                          aria-label={`${field.label} previous year`}
                          value={previousMetrics[field.key]}
                          onChange={(e) =>
                            setPreviousMetrics((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          placeholder={field.placeholderPrev}
                          className="w-full max-w-[200px] rounded-md border border-[#CBD5CF] bg-white px-3 py-1.5 font-mono text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          step="any"
                          aria-label={`${field.label} current year`}
                          value={currentMetrics[field.key]}
                          onChange={(e) =>
                            setCurrentMetrics((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          placeholder={field.placeholderCurr}
                          className="w-full max-w-[200px] rounded-md border border-[#CBD5CF] bg-white px-3 py-1.5 font-mono text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sustainability Claims */}
          <div className="rounded-lg border border-[#DCE4DF] bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-[#0F1F17]">
                  03. Company Sustainability Claims
                </h2>
                <p className="mt-0.5 text-xs text-[#5B6D63]">
                  Enter each public environmental statement or target to verify against the figures above
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddClaim}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5CF] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F1F17] hover:border-[#14532D]"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Claim
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {claims.map((claim, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <span className="w-6 shrink-0 font-mono text-xs text-[#5B6D63]">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <input
                    type="text"
                    value={claim}
                    onChange={(e) => handleClaimChange(idx, e.target.value)}
                    placeholder="e.g. Carbon emissions reduced by 40%."
                    aria-label={`Sustainability claim ${idx + 1}`}
                    className="w-full rounded-lg border border-[#CBD5CF] bg-white px-3.5 py-2 text-sm text-[#0F1F17] focus:border-[#14532D] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveClaim(idx)}
                    aria-label={`Remove claim ${idx + 1}`}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E2E8E4] text-[#5B6D63] hover:border-[#B91C1C] hover:text-[#B91C1C]"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#DCE4DF] bg-white px-6 py-4">
            <p className="text-xs text-[#5B6D63]">
              Analysis runs deterministic YoY cross-checks paired with Gemini AI verification explanations.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearForm}
                className="rounded-lg border border-[#CBD5CF] bg-white px-4 py-2.5 text-sm font-medium text-[#475850] hover:text-[#0F1F17]"
              >
                Clear All
              </button>
              <button
                type="submit"
                disabled={isAnalyzing}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#14532D] px-6 py-2.5 text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-[#166534] disabled:opacity-60"
              >
                {isAnalyzing ? 'Running Verification Analysis...' : 'Run Verification Analysis'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
