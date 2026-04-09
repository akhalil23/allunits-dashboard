/**
 * Pillar Champions Dashboard — Main page
 * Cross-pillar command view for pillar champions and chairs.
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { useUniversityData } from '@/hooks/use-university-data';
import { useBudgetData } from '@/hooks/use-budget-data';
import { useDashboard } from '@/contexts/DashboardContext';
import { UNIT_IDS } from '@/lib/unit-config';
import { PILLAR_SHORT } from '@/lib/pillar-labels';
import PillarChampionsSidebar, { type PillarChampionTab } from '@/components/pillar-champions/PillarChampionsSidebar';
import PillarFilters from '@/components/pillar-champions/PillarFilters';
import PillarOverviewSnapshot from '@/components/pillar-champions/PillarOverviewSnapshot';
import PillarPerformanceAnalysis from '@/components/pillar-champions/PillarPerformanceAnalysis';
import ActionExplorer from '@/components/pillar-champions/ActionExplorer';
import PillarBudgetView from '@/components/pillar-champions/PillarBudgetView';
import PillarRiskSignals from '@/components/pillar-champions/PillarRiskSignals';
import DashboardGuide from '@/components/executive/DashboardGuide';
import type { PillarId } from '@/lib/types';
import { Loader2, AlertCircle, RefreshCw, Moon, Sun, LogOut, ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/use-user-role';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function PillarChampionsDashboard() {
  const [activeTab, setActiveTab] = useState<PillarChampionTab>('overview');
  const [selectedPillar, setSelectedPillar] = useState<'all' | PillarId>('all');
  const [selectedUnits, setSelectedUnits] = useState<string[]>(UNIT_IDS);
  const mainRef = useRef<HTMLElement>(null);
  const queryClient = useQueryClient();

  const handleTabChange = useCallback((tab: PillarChampionTab) => {
    setActiveTab(tab);
    mainRef.current?.scrollTo({ top: 0 });
  }, []);

  const { viewType, term, academicYear } = useDashboard();
  const { data: unitResults, isLoading, isError, error, isRefetching } = useUniversityData();
  const { data: budgetResult } = useBudgetData();

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['university-data'] });
    queryClient.invalidateQueries({ queryKey: ['budget-data'] });
  }, [queryClient]);

  const loadedCount = unitResults?.filter(u => u.result).length ?? 0;
  const totalCount = unitResults?.length ?? 22;

  const TAB_TITLES: Record<PillarChampionTab, string> = {
    overview: 'Pillar Overview Snapshot',
    performance: 'Performance Analysis',
    actions: 'Action Explorer',
    budget: 'Budget Intelligence',
    risk: 'Risk & Attention Signals',
    guide: 'Dashboard Guide',
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background" style={{ overflow: 'clip' }}>
        <PillarChampionsSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading data from all 22 units…</p>
            <p className="text-xs text-muted-foreground/60">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !unitResults) {
    return (
      <div className="flex h-screen bg-background" style={{ overflow: 'clip' }}>
        <PillarChampionsSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 max-w-md px-4">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
            <p className="text-sm text-foreground font-medium">Failed to load data</p>
            <p className="text-xs text-muted-foreground">{error?.message || 'Unknown error'}</p>
            <button onClick={handleRefresh} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background" style={{ overflow: 'clip' }}>
      <PillarChampionsSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-sm sm:text-base font-bold text-foreground">Pillar Champions Dashboard</h1>
              <p className="text-[10px] text-muted-foreground">{loadedCount}/{totalCount} units loaded • {viewType === 'cumulative' ? 'Cumulative (SP)' : 'Yearly'} • AY {academicYear} • {term === 'mid' ? 'Mid-Year' : 'End-of-Year'}</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefetching}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters — hide on guide tab */}
        {activeTab !== 'guide' && (
          <PillarFilters
            selectedPillar={selectedPillar}
            onPillarChange={setSelectedPillar}
            selectedUnits={selectedUnits}
            onUnitsChange={setSelectedUnits}
          />
        )}

        {/* Main content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-[1600px]">
            {/* Section Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full bg-primary" />
                <h2 className="font-display text-base sm:text-lg font-semibold text-foreground">{TAB_TITLES[activeTab]}</h2>
              </div>
              {selectedPillar !== 'all' && activeTab !== 'guide' && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Filtered: {PILLAR_SHORT[selectedPillar]}
                </span>
              )}
            </div>

            {activeTab === 'overview' && (
              <PillarOverviewSnapshot
                unitResults={unitResults}
                budgetResult={budgetResult}
                viewType={viewType}
                term={term}
                academicYear={academicYear}
                selectedPillar={selectedPillar}
                selectedUnits={selectedUnits}
              />
            )}

            {activeTab === 'performance' && (
              <PillarPerformanceAnalysis
                unitResults={unitResults}
                viewType={viewType}
                term={term}
                academicYear={academicYear}
                selectedPillar={selectedPillar}
                selectedUnits={selectedUnits}
              />
            )}

            {activeTab === 'actions' && (
              <ActionExplorer
                unitResults={unitResults}
                viewType={viewType}
                term={term}
                academicYear={academicYear}
                selectedPillar={selectedPillar}
                selectedUnits={selectedUnits}
              />
            )}

            {activeTab === 'budget' && (
              <PillarBudgetView
                budgetResult={budgetResult}
                selectedPillar={selectedPillar}
              />
            )}

            {activeTab === 'risk' && (
              <PillarRiskSignals
                unitResults={unitResults}
                budgetResult={budgetResult}
                viewType={viewType}
                term={term}
                academicYear={academicYear}
                selectedPillar={selectedPillar}
                selectedUnits={selectedUnits}
              />
            )}

            {activeTab === 'guide' && <DashboardGuide />}
          </div>
        </main>
      </div>
    </div>
  );
}
