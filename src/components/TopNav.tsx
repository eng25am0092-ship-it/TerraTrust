import React, { useState } from 'react';
import { Building2, Home as HomeIcon, Menu, X } from 'lucide-react';
import { TerraTrustLogo } from './TerraTrustLogo';

export type WorkspaceMode = 'company' | 'household';

export type PageView =
  | 'home'
  | 'dashboard'
  | 'input'
  | 'results'
  | 'reports'
  | 'household-dashboard'
  | 'household-input';

interface TopNavProps {
  workspaceMode: WorkspaceMode;
  activePage: PageView;
  onNavigate: (page: PageView) => void;
  onSwitchWorkspace: (mode: WorkspaceMode) => void;
  hasActiveResult: boolean;
}

const COMPANY_NAV_ITEMS: Array<{ id: PageView; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'input', label: 'Data Input' },
  { id: 'results', label: 'Results' },
  { id: 'reports', label: 'Reports' },
];

const HOUSEHOLD_NAV_ITEMS: Array<{ id: PageView; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'household-dashboard', label: 'Household Dashboard' },
  { id: 'household-input', label: 'Monthly Entry' },
];

export const TopNav: React.FC<TopNavProps> = ({
  workspaceMode,
  activePage,
  onNavigate,
  onSwitchWorkspace,
  hasActiveResult,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = workspaceMode === 'company' ? COMPANY_NAV_ITEMS : HOUSEHOLD_NAV_ITEMS;

  const handleNav = (page: PageView) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="no-print sticky top-0 z-30">
      <header className="border-b border-[#DCE4DF] bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-4 py-3 sm:px-6">
          {/* Zone 1: Single-line Original TerraTrust Brand Mark */}
          <button
            type="button"
            onClick={() => handleNav('home')}
            className="text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#14532D]"
          >
            <TerraTrustLogo size="md" />
          </button>

          {/* Zone 2: Clean Text Navigation Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Primary Navigation">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              const disabled =
                workspaceMode === 'company' &&
                (item.id === 'results' || item.id === 'reports') &&
                !hasActiveResult;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#14532D] ${
                    isActive
                      ? 'text-[#14532D]'
                      : disabled
                        ? 'text-[#6A7B72] hover:text-[#0F1F17]'
                        : 'text-[#475850] hover:text-[#0F1F17]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute right-0 -bottom-[13px] left-0 h-[2px] bg-[#14532D]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() =>
                handleNav(workspaceMode === 'company' ? 'input' : 'household-input')
              }
              className={`hidden sm:inline-flex items-center justify-center rounded-md px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14532D] ${
                workspaceMode === 'company'
                  ? 'bg-[#14532D] hover:bg-[#114626]'
                  : 'bg-[#0F766E] hover:bg-[#0D645D]'
              }`}
            >
              {workspaceMode === 'company' ? 'New Verification' : 'Log Monthly Data'}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#DCE4DF] text-[#0F1F17] md:hidden"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-[#DCE4DF] bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    className={`flex min-h-[40px] items-center rounded-md px-3 text-left text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#EEF5F0] text-[#14532D]'
                        : 'text-[#475850] hover:bg-[#F8FAF9] hover:text-[#0F1F17]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  handleNav(workspaceMode === 'company' ? 'input' : 'household-input')
                }
                className="mt-2 flex min-h-[40px] items-center justify-center rounded-md bg-[#14532D] px-4 text-sm font-medium text-white"
              >
                {workspaceMode === 'company' ? 'New Verification' : 'Log Monthly Data'}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Compact Workspace Track Selector */}
      <div className="border-b border-[#DCE4DF] bg-[#F2F6F4]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-1.5 sm:px-6">
          <div className="flex items-center gap-2.5 text-xs text-[#475850]">
            <span className="font-medium text-[#304238]">Workspace:</span>
            <div
              className="inline-flex rounded-md border border-[#D2DCD6] bg-white p-0.5"
              role="group"
              aria-label="Select TerraTrust User Category"
            >
              <button
                type="button"
                onClick={() => onSwitchWorkspace('company')}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  workspaceMode === 'company'
                    ? 'bg-[#14532D] text-white'
                    : 'text-[#475850] hover:text-[#0F1F17]'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                Company Verification
              </button>
              <button
                type="button"
                onClick={() => onSwitchWorkspace('household')}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  workspaceMode === 'household'
                    ? 'bg-[#0F766E] text-white'
                    : 'text-[#475850] hover:text-[#0F1F17]'
                }`}
              >
                <HomeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Household Tracking
              </button>
            </div>
          </div>

          <p className="hidden text-xs text-[#5B6D63] sm:block">
            {workspaceMode === 'company'
              ? 'Corporate sustainability claim audit & inconsistency checks'
              : 'Residential electricity (kWh), water (litres), and waste (kg) monitoring'}
          </p>
        </div>
      </div>
    </div>
  );
};
