/**
 * University Executive Command Center
 * Tab-based executive dashboard aggregating all 21 units.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateUniversity, type UniversityAggregation } from '@/lib/university-aggregation';
import ExecutiveSidebar, { type ExecutiveTab } from '@/components/executive/ExecutiveSidebar';
import ExecutiveHeader from '@/components/executive/ExecutiveHeader';
import PresidentSnapshot from '@/components/executive/PresidentSnapshot';
import StrategicRiskPriority from '@/components/executive/StrategicRiskPriority';
import BudgetIntelligence from '@/components/executive/BudgetIntelligence';
import UnitComparison from '@/components/executive/UnitComparison';
import AIExecutiveInsights from '@/components/executive/AIExecutiveInsights';
import DashboardGuide from '@/components/executive/DashboardGuide';
import SnapshotTrackerPanel from '@/components/executive/SnapshotTrackerPanel';
import FilterBar from '@/components/dashboard/FilterBar';
import { useDashboard } from '@/contexts/DashboardContext';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ExecutiveDashboard() {
  const [activeTab, setActiveTab] = useState<ExecutiveTab>('snapshot');
  const [trackerOpen, setTrackerOpen] = useState(false);
  const { viewType, academicYear, term } = useDashboard();
  const { data: unitResults, isLoading, isError, error, isRefetching } = useUniversityData();
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['university-data'] });
  }, [queryClient]);

  const aggregation = useMemo<UniversityAggregation | null>(() => {
    if (!unitResults) return null;
    return aggregateUniversity(unitResults, viewType, term, academicYear);
  }, [unitResults, viewType, term, academicYear]);

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <ExecutiveSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading data from all 21 units…</p>
            <p className="text-xs text-muted-foreground/60">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !aggregation) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <ExecutiveSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 max-w-md px-4">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
            <p className="text-sm text-foreground font-medium">Failed to load university data</p>
            <p className="text-xs text-muted-foreground">{error?.message || 'Unknown error'}</p>
            <button onClick={handleRefresh} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const observedAt = unitResults?.filter(u => u.result).map(u => u.result!.observedAt).sort()[0];

  const TAB_TITLES: Record<ExecutiveTab, string> = {
    'snapshot': 'Executive Snapshot',
    'risk-priority': 'Strategic Risk & Priority',
    'budget': 'Budget Intelligence',
    'comparison': 'Unit Comparison',
    'ai-insights': 'AI Executive Insights',
    'guide': 'Dashboard Guide',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ExecutiveSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ExecutiveHeader
          loadedUnits={aggregation.loadedUnits}
          totalUnits={aggregation.totalUnits}
          onRefresh={handleRefresh}
          isRefreshing={isRefetching}
          observedAt={observedAt}
          onOpenSnapshotTracker={() => setTrackerOpen(true)}
        />
        {activeTab !== 'budget' && activeTab !== 'guide' && <FilterBar />}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-[1600px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h2 className="font-display text-base sm:text-lg font-semibold text-foreground">
                {TAB_TITLES[activeTab]}
              </h2>
              {activeTab !== 'budget' && activeTab !== 'guide' && (
                <span className="text-xs text-muted-foreground">
                  {viewType === 'cumulative' ? 'Cumulative (SP)' : 'Yearly'} • AY {academicYear} • {term === 'mid' ? 'Mid-Year' : 'End-of-Year'}
                </span>
              )}
            </div>

            {activeTab === 'snapshot' && <PresidentSnapshot aggregation={aggregation} />}
            {activeTab === 'risk-priority' && <StrategicRiskPriority aggregation={aggregation} />}
            {activeTab === 'budget' && <BudgetIntelligence aggregation={aggregation} />}
            {activeTab === 'comparison' && <UnitComparison aggregation={aggregation} />}
            {activeTab === 'ai-insights' && <AIExecutiveInsights aggregation={aggregation} />}
            {activeTab === 'guide' && <DashboardGuide />}
          </div>
        </main>
      </div>

      <SnapshotTrackerPanel
        open={trackerOpen}
        onClose={() => setTrackerOpen(false)}
        aggregation={aggregation}
      />
    </div>
  );
}
