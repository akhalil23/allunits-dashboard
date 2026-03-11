import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import FilterBar from '@/components/dashboard/FilterBar';
import StatusOverview from '@/components/dashboard/StatusOverview';
import PillarHealthGrid from '@/components/dashboard/PillarHealthGrid';
import RiskSignalsStudio from '@/components/dashboard/RiskSignalsStudio';
import UnitDashboardGuide from '@/components/dashboard/UnitDashboardGuide';
import { useDashboard } from '@/contexts/DashboardContext';
import { useGSRData } from '@/hooks/use-gsr-data';
import { PILLAR_LABELS } from '@/lib/constants';
import { runIntegrityAudit } from '@/lib/intelligence';
import { Loader2, AlertCircle } from 'lucide-react';

export default function Index() {
  const { viewType, academicYear, term, selectedPillar } = useDashboard();
  const { data: fetchResult, isLoading, isError, error, isRefetching } = useGSRData();
  const queryClient = useQueryClient();

  const filteredItems = useMemo(() => {
    if (!fetchResult?.data) return [];
    if (selectedPillar === 'all') return fetchResult.data;
    return fetchResult.data.filter(i => i.pillar === selectedPillar);
  }, [fetchResult?.data, selectedPillar]);

  const integrityAudit = useMemo(() => {
    if (!fetchResult) return null;
    return runIntegrityAudit(filteredItems, viewType, term, fetchResult.observedAt, academicYear, fetchResult.dataQuality);
  }, [filteredItems, viewType, term, fetchResult, academicYear]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['gsr-data'] });
  }, [queryClient]);

  const sectionTitle = selectedPillar === 'all'
    ? 'All Pillars'
    : `Pillar ${selectedPillar} — ${PILLAR_LABELS[selectedPillar]}`;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading dashboard data…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !fetchResult) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 max-w-md px-4">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
            <p className="text-sm text-foreground font-medium">Failed to load data</p>
            <p className="text-xs text-muted-foreground">{error?.message || 'Unknown error'}</p>
            <button onClick={handleRefresh} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Retry</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header observedAt={fetchResult.observedAt} dataQuality={fetchResult.dataQuality} onRefresh={handleRefresh} isRefreshing={isRefetching} items={filteredItems} term={term} academicYear={academicYear} viewType={viewType} integrityAudit={integrityAudit} sheetLastModified={fetchResult.sheetLastModified} sheetLastModifiedBy={fetchResult.sheetLastModifiedBy} />
      <FilterBar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-[1600px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground">{sectionTitle}</h2>
            <span className="text-xs text-muted-foreground">{viewType === 'cumulative' ? 'Cumulative (SP)' : 'Yearly'} • AY {academicYear} • {term === 'mid' ? 'Mid-Year' : 'End-of-Year'}</span>
          </div>
          {/* Section 1: Performance Overview */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-primary" />
              <h2 className="font-display text-base sm:text-lg font-bold text-foreground">Pillar Performance Overview</h2>
            </div>
            <StatusOverview items={filteredItems} viewType={viewType} term={term} academicYear={academicYear} />
            <PillarHealthGrid items={filteredItems} viewType={viewType} term={term} academicYear={academicYear} />
          </div>

          {/* Section 2: Risk Signals */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-primary/60" />
              <h2 className="font-display text-base sm:text-lg font-bold text-foreground">Risk Signals Overview</h2>
            </div>
            <RiskSignalsStudio items={filteredItems} viewType={viewType} term={term} academicYear={academicYear} />
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
