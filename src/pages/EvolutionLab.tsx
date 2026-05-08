import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import AxisSelector, { type AxisConfig } from '@/components/evolution/AxisSelector';
import SnapshotCard from '@/components/evolution/SnapshotCard';
import DeltaStrip from '@/components/evolution/DeltaStrip';
import WhatChangedPanel from '@/components/evolution/WhatChangedPanel';
import { useGSRData } from '@/hooks/use-gsr-data';
import { FlaskConical, Loader2, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { motion } from 'framer-motion';
import FreshnessBanner from '@/components/shared/FreshnessBanner';

export default function EvolutionLab() {
  const { data: fetchResult, isLoading, isError, error, isRefetching } = useGSRData();
  const queryClient = useQueryClient();

  const [axisA, setAxisA] = useState<AxisConfig>({
    academicYear: '2025-2026',
    term: 'mid',
    viewType: 'cumulative',
  });

  const [axisB, setAxisB] = useState<AxisConfig>({
    academicYear: '2025-2026',
    term: 'end',
    viewType: 'cumulative',
  });

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['gsr-data'] });
  }, [queryClient]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading data from source…</p>
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
            <button onClick={handleRefresh} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const items = fetchResult.data;
  const observedAt = fetchResult.observedAt;

  return (
    <DashboardLayout>
      <Header observedAt={observedAt} dataQuality={fetchResult.dataQuality} onRefresh={handleRefresh} isRefreshing={isRefetching} />

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px]">
          <FreshnessBanner />
          {/* Title */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold text-foreground">Strategic Evolution Lab</h2>
              <p className="text-xs text-muted-foreground">Compare any two snapshots of the strategic plan across years, terms, and view types</p>
            </div>
          </motion.div>

          {/* Axis selectors - stack on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
            <AxisSelector label="Axis A (Baseline)" accent="bg-blue-400" config={axisA} onChange={setAxisA} />
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <AxisSelector label="Axis B (Comparison)" accent="bg-primary" config={axisB} onChange={setAxisB} />
          </div>

          {/* Snapshot cards side by side - stack on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <SnapshotCard label="Axis A" accent="bg-blue-400" items={items} config={axisA} observedAt={observedAt} />
            <SnapshotCard label="Axis B" accent="bg-primary" items={items} config={axisB} observedAt={observedAt} />
          </div>

          {/* Delta Strip */}
          <DeltaStrip items={items} axisA={axisA} axisB={axisB} observedAt={observedAt} />

          {/* What Changed */}
          <WhatChangedPanel items={items} axisA={axisA} axisB={axisB} observedAt={observedAt} />
        </div>
      </main>
    </DashboardLayout>
  );
}
