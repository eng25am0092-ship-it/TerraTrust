import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCheck2,
  Home as HomeIcon,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { TerraTrustLogo } from './TerraTrustLogo';
import type { PageView, WorkspaceMode } from './TopNav';

interface HomePageProps {
  onNavigate: (page: PageView) => void;
  onSwitchWorkspace: (mode: WorkspaceMode) => void;
  onRunGreenFutureDemo: () => void;
  isLoadingDemo: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSwitchWorkspace,
  onRunGreenFutureDemo,
  isLoadingDemo,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:py-10">
      {/* Hero Split */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
        <div className="flex flex-col justify-between lg:col-span-6 lg:py-1">
          <div>
            <TerraTrustLogo size="lg" />
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-[#0F1F17] sm:text-4xl [text-wrap:balance] leading-[1.16]">
              Making Sustainability Claims More Transparent.
            </h1>
            <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-[#475850] sm:text-base">
              TerraTrust cross-checks corporate sustainability statements against supplied emissions,
              water, energy, and waste figures—and helps households monitor monthly electricity,
              water, and recycling consumption patterns.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('input')}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-md bg-[#14532D] px-5 py-2 text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[#114626] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14532D]"
              >
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onRunGreenFutureDemo}
                disabled={isLoadingDemo}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-[#CBD5CF] bg-white px-4 py-2 text-sm font-medium text-[#0F1F17] whitespace-nowrap shrink-0 transition-colors duration-150 hover:border-[#0F766E] hover:bg-[#F2F6F4] disabled:opacity-60"
              >
                {isLoadingDemo ? 'Running Demo Audit...' : 'Inspect GreenFuture Demo'}
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-[#DCE4DF] pt-4 text-xs text-[#5B6D63]">
            <span>Experimental environmental analytics prototype</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Separate workflows for Companies and Households</span>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="lg:col-span-6">
          <div className="h-full overflow-hidden rounded-lg border border-[#DCE4DF] bg-white shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
            {!imgFailed ? (
              <img
                src="/src/assets/images/terratrust_audit_hero_1794553386189.jpg"
                alt="Sustainable timber and glass research campus surrounded by temperate forest canopy"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="h-60 w-full object-cover sm:h-72 lg:h-full lg:min-h-[320px]"
              />
            ) : (
              <div className="flex h-60 w-full flex-col items-center justify-center bg-[#F2F6F4] p-6 text-center sm:h-72 lg:h-full lg:min-h-[320px]">
                <Scale className="h-9 w-9 text-[#14532D]" aria-hidden="true" />
                <p className="mt-3 font-display text-base font-semibold text-[#0F1F17]">
                  TerraTrust Environmental Verification
                </p>
                <p className="mt-1 max-w-sm text-xs text-[#475850]">
                  Cross-referencing reported carbon, water, energy, and waste metrics against public claims.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Two-Category Platform Choice */}
      <section className="mt-9" aria-label="Choose User Category">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-[#0F1F17]">
              Choose Your Environmental Workspace
            </h2>
            <p className="mt-0.5 text-sm text-[#475850]">
              Two independent analysis systems tailored to corporate claim auditing or household resource tracking.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
            <div>
              <div className="flex items-center gap-2 text-[#14532D]">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                <span className="font-mono text-xs font-semibold">01 · Companies</span>
              </div>
              <h3 className="mt-2.5 font-display text-base font-semibold text-[#0F1F17]">
                Company Sustainability Verification
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#475850]">
                Verify corporate sustainability claims against annual carbon, water, energy, and waste data to detect reporting inconsistencies, missing evidence, and potential greenwashing indicators.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onSwitchWorkspace('company')}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#14532D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#114626]"
              >
                Open Company Dashboard
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('input')}
                className="text-xs font-semibold text-[#14532D] hover:underline"
              >
                Upload Company Data
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
            <div>
              <div className="flex items-center gap-2 text-[#0F766E]">
                <HomeIcon className="h-4 w-4" aria-hidden="true" />
                <span className="font-mono text-xs font-semibold">02 · Households</span>
              </div>
              <h3 className="mt-2.5 font-display text-base font-semibold text-[#0F1F17]">
                Household Environmental Tracking
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#475850]">
                Monitor monthly electricity (kWh), water (litres), and waste &amp; recycling (kg) trends, receive AI explanations for unusual spikes or drops, and get personalized conservation tips.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onSwitchWorkspace('household')}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0D645D]"
              >
                Open Household Dashboard
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onSwitchWorkspace('household');
                  onNavigate('household-input');
                }}
                className="text-xs font-semibold text-[#0F766E] hover:underline"
              >
                Log Monthly Readings
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Column Capability Strip */}
      <section className="mt-9 rounded-lg border border-[#DCE4DF] bg-white shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
        <div className="grid grid-cols-1 divide-y divide-[#DCE4DF] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          <div className="p-5">
            <p className="font-mono text-xs font-semibold text-[#14532D]">01</p>
            <h2 className="mt-1.5 font-display text-sm font-semibold text-[#0F1F17]">
              Numerical Cross-Checks
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#475850]">
              Compares year-over-year percentage changes directly against claimed reductions or improvements.
            </p>
          </div>
          <div className="p-5">
            <p className="font-mono text-xs font-semibold text-[#0F766E]">02</p>
            <h2 className="mt-1.5 font-display text-sm font-semibold text-[#0F1F17]">
              Selective Reporting Alerts
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#475850]">
              Detects when positive sub-metrics (such as recycled tonnage) mask worsening overall totals.
            </p>
          </div>
          <div className="p-5">
            <p className="font-mono text-xs font-semibold text-[#14532D]">03</p>
            <h2 className="mt-1.5 font-display text-sm font-semibold text-[#0F1F17]">
              Missing Evidence Detection
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#475850]">
              Flags percentage claims that omit baseline periods, total energy usage, or primary records.
            </p>
          </div>
          <div className="p-5">
            <p className="font-mono text-xs font-semibold text-[#0F766E]">04</p>
            <h2 className="mt-1.5 font-display text-sm font-semibold text-[#0F1F17]">
              Audit-Ready PDF Export
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#475850]">
              Generates downloadable verification reports with consistency scores, evidence, and next steps.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mt-10">
        <div className="max-w-2xl">
          <h2 className="font-display text-lg font-bold tracking-tight text-[#0F1F17] sm:text-xl">
            How TerraTrust Works
          </h2>
          <p className="mt-1 text-sm text-[#475850]">
            A transparent three-stage workflow combining deterministic accounting checks with structured AI interpretation.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-[#14532D]">Step 01</span>
              <FileCheck2 className="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-[#0F1F17]">
              Submit Environmental Data &amp; Claims
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#475850]">
              Enter current and prior-year carbon, water, energy, and waste metrics manually, upload a CSV sheet, extract data from a PDF report, or load a sample dataset.
            </p>
          </div>

          <div className="rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-[#14532D]">Step 02</span>
              <ShieldAlert className="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-[#0F1F17]">
              Hybrid Rule &amp; AI Analysis
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#475850]">
              Deterministic formulas calculate exact YoY variances and data gaps while Gemini AI translates discrepancies into clear explanations without inventing missing evidence.
            </p>
          </div>

          <div className="rounded-lg border border-[#DCE4DF] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-[#14532D]">Step 03</span>
              <CheckCircle2 className="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-[#0F1F17]">
              Review Score &amp; Download Report
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#475850]">
              Inspect the 0–100 experimental consistency score, severity-ranked findings, claim verification matrix, and export a formatted PDF verification report.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits & Auditing Principles */}
      <section className="mt-10 rounded-lg border border-[#DCE4DF] bg-white p-6 shadow-[0_1px_2px_rgba(15,31,23,0.04)]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="font-display text-lg font-bold tracking-tight text-[#0F1F17]">
              Why Environmental Verification Matters
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[#475850]">
              Sustainability disclosures often mix selective wins with unverified percentages. Objective pre-audit screening helps analysts, students, and compliance teams see which claims are backed by numbers and which require supporting documentation.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532D] hover:underline"
            >
              Explore Company Dashboard
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-7">
            <div className="border-t border-[#DCE4DF] pt-3">
              <h3 className="font-display text-sm font-semibold text-[#0F1F17]">
                Evidence-First Screening
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#475850]">
                Separates verified numerical alignment from unsubstantiated statements lacking meter or utility backing.
              </p>
            </div>
            <div className="border-t border-[#DCE4DF] pt-3">
              <h3 className="font-display text-sm font-semibold text-[#0F1F17]">
                Fair, Non-Accusatory Language
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#475850]">
                Distinguishes between reporting anomalies and proven manipulation using transparent audit terminology.
              </p>
            </div>
            <div className="border-t border-[#DCE4DF] pt-3">
              <h3 className="font-display text-sm font-semibold text-[#0F1F17]">
                Multi-Year Trend Visibility
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#475850]">
                Visualizes carbon, water, renewable energy, and recycling trajectories side by side for rapid review.
              </p>
            </div>
            <div className="border-t border-[#DCE4DF] pt-3">
              <h3 className="font-display text-sm font-semibold text-[#0F1F17]">
                Actionable Audit Preparation
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#475850]">
                Lists exact follow-up documents needed—such as Scope 1 &amp; 2 logs, RECs, or waste manifests.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
