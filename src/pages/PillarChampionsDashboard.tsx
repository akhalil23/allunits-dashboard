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
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: userRole } = useUserRole();
  const isAdmin = userRole?.role === 'admin';

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
        {/* Green Header — matching Executive Command Center */}
        <header className={`relative overflow-hidden ${isMobile ? 'sticky top-0 z-40' : ''}`}>
          <div className="absolute inset-0 header-gradient-animated" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
              backgroundSize: '60px 60px, 80px 80px',
            }}
          />

          <div className={`relative z-10 ${isMobile ? 'px-4 py-3 pl-14' : 'px-6 py-5'}`}>
            <div className="flex items-start justify-between gap-2">
              <motion.div
                className="flex items-center gap-4 min-w-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <div className="flex flex-col min-w-0">
                  <h1 className={`text-white font-display font-bold tracking-tight mb-0.5 ${isMobile ? 'text-base leading-tight' : 'text-2xl mb-1.5'}`}>
                    Pillar Champions Dashboard
                  </h1>
                  {!isMobile && (
                    <motion.p
                      className="text-white/50 text-sm font-medium tracking-wide"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                    >
                      Strategic Plan IV — Pillar Operations & Oversight
                    </motion.p>
                  )}
                </div>
              </motion.div>

              <motion.div
                className="flex items-center gap-1.5 sm:gap-2.5 shrink-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                {isAdmin && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        onClick={() => navigate('/admin')}
                        className="p-2 rounded-lg bg-white/[0.08] text-white/70 hover:bg-white/15 hover:text-white transition-colors duration-200 border border-white/5"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Back to Admin Panel</p></TooltipContent>
                  </Tooltip>
                )}

                {/* Coverage Badge */}
                <motion.div
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full border backdrop-blur-sm text-[11px] font-semibold ${
                    loadedCount === totalCount
                      ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25'
                      : 'bg-amber-400/15 text-amber-300 border-amber-400/25'
                  }`}
                  whileHover={{ scale: 1.03 }}
                >
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${loadedCount === totalCount ? 'bg-emerald-400' : 'bg-amber-400'} opacity-50`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${loadedCount === totalCount ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  </span>
                  <span className="hidden sm:inline">{loadedCount}/{totalCount} Units</span>
                </motion.div>

                <motion.button
                  onClick={handleRefresh}
                  className="p-2 rounded-lg bg-white/[0.08] text-white/70 hover:bg-white/15 hover:text-white transition-colors duration-200 border border-white/5"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  title="Refresh all units"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
                </motion.button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={() => navigate('/logout')}
                      className="p-2 rounded-lg bg-white/[0.08] text-white/70 hover:bg-white/15 hover:text-white transition-colors duration-200 border border-white/5"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <LogOut className="w-4 h-4" />
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Sign out</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={toggleTheme}
                      className="p-2 rounded-lg bg-white/[0.08] text-white/70 hover:bg-white/15 hover:text-white transition-colors duration-200 border border-white/5"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={theme}
                          initial={{ rotate: -90, opacity: 0 }}
                          animate={{ rotate: 0, opacity: 1 }}
                          exit={{ rotate: 90, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </motion.div>
                      </AnimatePresence>
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>{theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}</p></TooltipContent>
                </Tooltip>
              </motion.div>
            </div>

            {!isMobile && (
              <motion.div
                className="mt-3 flex items-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <p className="text-white/40 text-xs font-medium">
                  {loadedCount}/{totalCount} units loaded • {viewType === 'cumulative' ? 'Cumulative (SP)' : 'Yearly'} • AY {academicYear} • {term === 'mid' ? 'Mid-Year' : 'End-of-Year'}
                </p>
              </motion.div>
            )}
          </div>
        </header>

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
