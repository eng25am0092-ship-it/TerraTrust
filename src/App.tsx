import { useCallback, useEffect, useState } from 'react';
import { DashboardPage } from './components/DashboardPage';
import { DataInputPage } from './components/DataInputPage';
import { HomePage } from './components/HomePage';
import { HouseholdDashboardPage } from './components/HouseholdDashboardPage';
import { HouseholdInputPage } from './components/HouseholdInputPage';
import { ReportsPage } from './components/ReportsPage';
import { ResultsPage } from './components/ResultsPage';
import { TerraTrustLogo } from './components/TerraTrustLogo';
import { type PageView, TopNav, type WorkspaceMode } from './components/TopNav';
import { HOUSEHOLD_SAMPLE_DATASETS } from './data/householdSamples';
import { SAMPLE_DATASETS } from './data/samples';
import type {
  HouseholdAnalysisResult,
  HouseholdProfile,
  HouseholdSampleDataset,
} from './types/household';
import type {
  EnvironmentalSubmission,
  SampleDataset,
  VerificationResult,
} from './types/verification';

const STORAGE_KEY = 'terratrust_audits_v1';
const HOUSEHOLD_STORAGE_KEY = 'terratrust_household_v1';

function loadLocalAudits(): VerificationResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalAudits(audits: VerificationResult[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(audits.slice(0, 20)));
  } catch {
    // Ignore storage quota errors
  }
}

function loadLocalHousehold(): HouseholdAnalysisResult | null {
  try {
    const raw = localStorage.getItem(HOUSEHOLD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HouseholdAnalysisResult;
  } catch {
    return null;
  }
}

function saveLocalHousehold(result: HouseholdAnalysisResult) {
  try {
    localStorage.setItem(HOUSEHOLD_STORAGE_KEY, JSON.stringify(result));
  } catch {
    // Ignore storage quota errors
  }
}

export default function App() {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('company');
  const [activePage, setActivePage] = useState<PageView>('home');

  // --- Company Verification State (unchanged) ---
  const [samples] = useState<SampleDataset[]>(SAMPLE_DATASETS);
  const [auditHistory, setAuditHistory] = useState<VerificationResult[]>(() => loadLocalAudits());
  const [activeResult, setActiveResult] = useState<VerificationResult | null>(() => {
    const existing = loadLocalAudits();
    return existing[0] ?? null;
  });
  const [draftSubmission, setDraftSubmission] = useState<EnvironmentalSubmission>(
    SAMPLE_DATASETS[0].submission
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInitializingDashboard, setIsInitializingDashboard] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // --- Separate Household Tracking State ---
  const [householdSamples] = useState<HouseholdSampleDataset[]>(HOUSEHOLD_SAMPLE_DATASETS);
  const [activeHouseholdResult, setActiveHouseholdResult] =
    useState<HouseholdAnalysisResult | null>(() => loadLocalHousehold());
  const [draftHouseholdProfile, setDraftHouseholdProfile] = useState<HouseholdProfile>(
    HOUSEHOLD_SAMPLE_DATASETS[0].profile
  );
  const [isAnalyzingHousehold, setIsAnalyzingHousehold] = useState(false);
  const [isInitializingHousehold, setIsInitializingHousehold] = useState(false);
  const [householdError, setHouseholdError] = useState<string | null>(null);

  // Company analysis runner
  const runAnalysis = useCallback(
    async (
      submission: EnvironmentalSubmission,
      options?: { navigateTo?: PageView; silent?: boolean }
    ) => {
      if (options?.silent) {
        setIsInitializingDashboard(true);
      } else {
        setIsAnalyzing(true);
      }
      setAnalysisError(null);

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission),
        });
        const data = await res.json();
        if (!res.ok) {
          setAnalysisError(data.error || 'Verification analysis failed. Please check your inputs.');
          return null;
        }

        const result = data as VerificationResult;
        setActiveResult(result);
        setDraftSubmission(result.submission);
        setAuditHistory((prev) => {
          const updated = [
            result,
            ...prev.filter((a) => a.submission.companyName !== result.submission.companyName),
          ].slice(0, 20);
          saveLocalAudits(updated);
          return updated;
        });

        if (options?.navigateTo) {
          setActivePage(options.navigateTo);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return result;
      } catch {
        setAnalysisError('Network error while connecting to verification server.');
        return null;
      } finally {
        setIsAnalyzing(false);
        setIsInitializingDashboard(false);
      }
    },
    []
  );

  // Separate Household analysis runner
  const runHouseholdAnalysis = useCallback(
    async (
      profile: HouseholdProfile,
      options?: { navigateTo?: PageView; silent?: boolean }
    ) => {
      if (options?.silent) {
        setIsInitializingHousehold(true);
      } else {
        setIsAnalyzingHousehold(true);
      }
      setHouseholdError(null);

      try {
        const res = await fetch('/api/household/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        });
        const data = await res.json();
        if (!res.ok) {
          setHouseholdError(data.error || 'Household analysis failed. Please check your entries.');
          return null;
        }

        const result = data as HouseholdAnalysisResult;
        setActiveHouseholdResult(result);
        setDraftHouseholdProfile(result.profile);
        saveLocalHousehold(result);

        if (options?.navigateTo) {
          setActivePage(options.navigateTo);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return result;
      } catch {
        setHouseholdError('Network error while connecting to household analysis server.');
        return null;
      } finally {
        setIsAnalyzingHousehold(false);
        setIsInitializingHousehold(false);
      }
    },
    []
  );

  // Auto-initialize GreenFuture Industries on startup
  useEffect(() => {
    if (!activeResult && !isInitializingDashboard) {
      runAnalysis(SAMPLE_DATASETS[0].submission, { silent: true });
    }
  }, [activeResult, isInitializingDashboard, runAnalysis]);

  // Auto-initialize Maple Street Family Home on startup
  useEffect(() => {
    if (!activeHouseholdResult && !isInitializingHousehold) {
      runHouseholdAnalysis(HOUSEHOLD_SAMPLE_DATASETS[0].profile, { silent: true });
    }
  }, [activeHouseholdResult, isInitializingHousehold, runHouseholdAnalysis]);

  const handleNavigate = (page: PageView) => {
    if (page === 'household-dashboard' || page === 'household-input') {
      setWorkspaceMode('household');
    } else if (page !== 'home') {
      setWorkspaceMode('company');
    }
    setActivePage(page);
    setAnalysisError(null);
    setHouseholdError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchWorkspace = (mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    setAnalysisError(null);
    setHouseholdError(null);
    setActivePage(mode === 'company' ? 'dashboard' : 'household-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSampleForDashboard = async (sample: SampleDataset) => {
    await runAnalysis(sample.submission, { navigateTo: 'dashboard' });
  };

  const handleRunGreenFutureDemo = async () => {
    setWorkspaceMode('company');
    await runAnalysis(SAMPLE_DATASETS[0].submission, { navigateTo: 'results' });
  };

  const handleSubmitFormAnalysis = async (submission: EnvironmentalSubmission) => {
    await runAnalysis(submission, { navigateTo: 'results' });
  };

  const handleResetAnalysis = () => {
    setActiveResult(null);
    setAnalysisError(null);
    localStorage.removeItem(STORAGE_KEY);
    setAuditHistory([]);
    setActivePage('input');
  };

  const handleSelectHouseholdSample = async (sample: HouseholdSampleDataset) => {
    await runHouseholdAnalysis(sample.profile, { navigateTo: 'household-dashboard' });
  };

  const handleSubmitHouseholdAnalysis = async (profile: HouseholdProfile) => {
    await runHouseholdAnalysis(profile, { navigateTo: 'household-dashboard' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAF9] text-[#0F1F17]">
      <TopNav
        workspaceMode={workspaceMode}
        activePage={activePage}
        onNavigate={handleNavigate}
        onSwitchWorkspace={handleSwitchWorkspace}
        hasActiveResult={Boolean(activeResult)}
      />

      <main className="flex-1">
        {activePage === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
            onSwitchWorkspace={handleSwitchWorkspace}
            onRunGreenFutureDemo={handleRunGreenFutureDemo}
            isLoadingDemo={isAnalyzing}
          />
        )}

        {/* Company Verification Pages */}
        {activePage === 'dashboard' && (
          <DashboardPage
            activeResult={activeResult}
            samples={samples}
            onSelectSample={handleSelectSampleForDashboard}
            onNavigate={handleNavigate}
            isLoading={isInitializingDashboard || isAnalyzing}
          />
        )}

        {activePage === 'input' && (
          <DataInputPage
            initialSubmission={draftSubmission}
            samples={samples}
            onSubmitAnalysis={handleSubmitFormAnalysis}
            onResetAll={() => {
              setActiveResult(null);
              setAnalysisError(null);
            }}
            isAnalyzing={isAnalyzing}
            serverError={analysisError}
          />
        )}

        {activePage === 'results' && (
          <ResultsPage
            result={activeResult}
            onNavigate={handleNavigate}
            onResetAnalysis={handleResetAnalysis}
          />
        )}

        {activePage === 'reports' && (
          <ReportsPage
            activeResult={activeResult}
            auditHistory={auditHistory}
            onSelectAudit={(audit) => setActiveResult(audit)}
            onNavigate={handleNavigate}
          />
        )}

        {/* Household Environmental Tracking Pages */}
        {activePage === 'household-dashboard' && (
          <HouseholdDashboardPage
            result={activeHouseholdResult}
            samples={householdSamples}
            onSelectSample={handleSelectHouseholdSample}
            onOpenInput={() => handleNavigate('household-input')}
            isLoading={isInitializingHousehold || isAnalyzingHousehold}
          />
        )}

        {activePage === 'household-input' && (
          <HouseholdInputPage
            initialProfile={draftHouseholdProfile}
            samples={householdSamples}
            onAnalyzeProfile={handleSubmitHouseholdAnalysis}
            onResetToSample={() => {
              localStorage.removeItem(HOUSEHOLD_STORAGE_KEY);
              setHouseholdError(null);
            }}
            isAnalyzing={isAnalyzingHousehold}
            serverError={householdError}
          />
        )}
      </main>

      <footer className="no-print border-t border-[#DCE4DF] bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-3 px-4 py-4 text-xs text-[#5B6D63] sm:flex-row sm:items-center sm:px-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <TerraTrustLogo size="sm" />
            <span aria-hidden="true">·</span>
            <span>Making Sustainability Claims More Transparent</span>
          </div>
          <p>Experimental environmental auditing &amp; household tracking prototype.</p>
        </div>
      </footer>
    </div>
  );
}
