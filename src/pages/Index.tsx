import { useMemo, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import FilterBar from '@/components/dashboard/FilterBar';
import StatusOverview from '@/components/dashboard/StatusOverview';
import PillarHealthGrid from '@/components/dashboard/PillarHealthGrid';
import IntelligencePanel from '@/components/dashboard/IntelligencePanel';
import AIInsightCard from '@/components/dashboard/AIInsightCard';
import { useDashboard } from '@/contexts/DashboardContext';
import { mockFetchResult } from '@/lib/mock-data';
import { PILLAR_LABELS } from '@/lib/constants';

export default function Index() {
  const { viewMode, viewType, academicYear, selectedPillar } = useDashboard();
  const [fetchResult, setFetchResult] = useState(mockFetchResult);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredItems = useMemo(() => {
    if (selectedPillar === 'all') return fetchResult.data;
    return fetchResult.data.filter(i => i.pillar === selectedPillar);
  }, [fetchResult.data, selectedPillar]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Mock refresh
    setTimeout(() => {
      setFetchResult({ ...mockFetchResult, observedAt: new Date().toISOString() });
      setIsRefreshing(false);
    }, 800);
  }, []);

  const sectionTitle = selectedPillar === 'all'
    ? 'All Pillars'
    : `Pillar ${selectedPillar} — ${PILLAR_LABELS[selectedPillar]}`;

  const aiContext = useMemo(() => {
    const total = filteredItems.length;
    if (total === 0) return '';
    return `Based on ${total} action items across ${selectedPillar === 'all' ? '5 pillars' : `Pillar ${selectedPillar}`}, the current ${viewType === 'cumulative' ? 'cumulative' : 'yearly'} data suggests that execution tracking may benefit from focused attention on items showing limited progress relative to the academic year timeline. This pattern potentially indicates areas where resource allocation review could be valuable.`;
  }, [filteredItems, selectedPillar, viewType]);

  return (
    <DashboardLayout>
      <Header
        observedAt={fetchResult.observedAt}
        dataQuality={fetchResult.dataQuality}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <FilterBar />

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8 max-w-[1600px]">
          {/* Section title */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {sectionTitle}
            </h2>
            <span className="text-xs text-muted-foreground">
              {viewType === 'cumulative' ? 'Cumulative (SP)' : 'Yearly'} • AY {academicYear}
            </span>
          </div>

          {/* Layer 1: Reporting */}
          <StatusOverview items={filteredItems} viewType={viewType} />
          <PillarHealthGrid items={filteredItems} viewType={viewType} />

          {/* Layer 2: Intelligence (if enabled) */}
          {viewMode === 'intelligence' && (
            <IntelligencePanel
              items={filteredItems}
              viewType={viewType}
              observedAt={fetchResult.observedAt}
              academicYear={academicYear}
            />
          )}

          {/* AI Insight */}
          <AIInsightCard context={aiContext} />
        </div>
      </main>
    </DashboardLayout>
  );
}
