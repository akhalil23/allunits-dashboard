/**
 * Helpers to build a snapshot payload from the current dashboard state.
 * Phase 1 of "My Sessions": user-controlled saved views.
 */

import type { UniversityAggregation } from './university-aggregation';
import type { CreateMySessionInput } from '@/hooks/use-my-sessions';

export interface CaptureContext {
  activeTab: string;
  academicYear: string;
  term: string;
  viewType: string;
  selectedPillar?: string | null;
  selectedUnit?: string | null;
  extraFilters?: Record<string, unknown>;
}

export function buildSnapshotInput(
  ctx: CaptureContext,
  agg: UniversityAggregation,
  label: string,
  notes?: string,
): CreateMySessionInput {
  const reportingCycle = `${ctx.academicYear} • ${ctx.term === 'mid' ? 'Mid-Year' : 'End-of-Year'}`;

  // Pillar-level capture not yet exposed on UniversityAggregation; keep empty for now.
  const pillarData: unknown[] = [];

  const unitData = (agg.unitAggregations ?? []).map(u => ({
    unitId: u.unitId,
    unitName: u.unitName,
    totalItems: u.totalItems,
    applicableItems: u.applicableItems,
    completionPct: u.completionPct,
    onTrackPct: u.onTrackPct,
    belowTargetPct: u.belowTargetPct,
    riskIndex: u.riskIndex,
  }));

  return {
    label,
    notes: notes?.trim() ? notes.trim() : null,
    academic_year: ctx.academicYear,
    term: ctx.term,
    reporting_cycle: reportingCycle,
    view_type: ctx.viewType,
    filters: {
      activeTab: ctx.activeTab,
      selectedPillar: ctx.selectedPillar ?? 'all',
      selectedUnit: ctx.selectedUnit ?? null,
      ...(ctx.extraFilters ?? {}),
    },
    metrics: {
      completionPct: agg.completionPct,
      onTrackPct: agg.onTrackPct,
      belowTargetPct: agg.belowTargetPct,
      riskIndex: agg.riskIndex,
      totalItems: agg.totalItems,
      applicableItems: agg.applicableItems,
      naCount: agg.naCount,
      cotCount: agg.cotCount,
      cbtCount: agg.cbtCount,
      inProgressCount: agg.inProgressCount,
      notStartedCount: agg.notStartedCount,
      loadedUnits: agg.loadedUnits,
      totalUnits: agg.totalUnits,
    },
    pillar_data: pillarData,
    unit_data: unitData,
    total_items: agg.totalItems,
    applicable_items: agg.applicableItems,
    on_track_pct: agg.onTrackPct,
    below_target_pct: agg.belowTargetPct,
    completion_pct: agg.completionPct,
    budget_utilization: 0,
    risk_index: agg.riskIndex,
  };
}

export function suggestSessionTitle(ctx: CaptureContext): string {
  const tabLabels: Record<string, string> = {
    'snapshot': 'Executive Snapshot',
    'risk-priority': 'Risk & Priority',
    'budget': 'Budget',
    'comparison': 'Unit Comparison',
    'ai-insights': 'AI Insights',
    'reports': 'Reports',
    'my-sessions': 'My Sessions',
    'guide': 'Guide',
  };
  const tab = tabLabels[ctx.activeTab] ?? 'Dashboard';
  const termLabel = ctx.term === 'mid' ? 'Mid-Year' : 'End-of-Year';
  const viewLabel = ctx.viewType === 'cumulative' ? 'SP' : 'Yearly';
  const pillar = ctx.selectedPillar && ctx.selectedPillar !== 'all'
    ? ` · Pillar ${ctx.selectedPillar}`
    : '';
  const date = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${tab} — AY ${ctx.academicYear} ${termLabel} (${viewLabel})${pillar} · ${date}`;
}
