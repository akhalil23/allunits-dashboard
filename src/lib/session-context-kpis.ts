/**
 * Context-aware KPI definitions for My Sessions comparison.
 *
 * Each saved snapshot is captured from a specific dashboard tab (context).
 * When comparing two snapshots, we only show KPIs that are meaningful for
 * that context. Comparing across different contexts is disallowed — instead
 * we show a metadata-only view with a "limited comparability" notice.
 */

import type { MySessionSnapshot } from '@/hooks/use-my-sessions';

export type SessionContext =
  | 'snapshot'
  | 'risk-priority'
  | 'budget'
  | 'comparison'
  | 'ai-insights'
  | 'reports'
  | 'guide'
  | 'my-sessions'
  | 'unknown';

export const CONTEXT_LABELS: Record<SessionContext, string> = {
  'snapshot': 'Executive Snapshot',
  'risk-priority': 'Strategic Risk & Priority',
  'budget': 'Budget Intelligence',
  'comparison': 'Unit Comparison',
  'ai-insights': 'AI Executive Insights',
  'reports': 'Reports',
  'guide': 'Dashboard Guide',
  'my-sessions': 'My Sessions',
  'unknown': 'Unknown Context',
};

export interface KpiRow {
  label: string;
  av: number;
  bv: number;
  /** Suffix appended to the value, e.g. '%'. */
  suffix?: string;
  /** When true, format with one decimal and a percent symbol. */
  isPct?: boolean;
  /** When true, format as an integer / locale string. */
  isCount?: boolean;
}

/** Read a numeric value from a snapshot's metrics.contextMetrics block (or fallback). */
function num(snapshot: MySessionSnapshot, key: string): number {
  const m = (snapshot.metrics ?? {}) as Record<string, unknown>;
  const ctx = (m.contextMetrics ?? {}) as Record<string, unknown>;
  const v = ctx[key] ?? m[key];
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}

export function getSessionContext(snapshot: MySessionSnapshot): SessionContext {
  const f = (snapshot.filters ?? {}) as Record<string, unknown>;
  const m = (snapshot.metrics ?? {}) as Record<string, unknown>;
  const raw = (m.context as string | undefined) ?? (f.activeTab as string | undefined);
  switch (raw) {
    case 'snapshot':
    case 'risk-priority':
    case 'budget':
    case 'comparison':
    case 'ai-insights':
    case 'reports':
    case 'guide':
    case 'my-sessions':
      return raw;
    default:
      return 'unknown';
  }
}

/**
 * Returns the KPI rows to display for two snapshots that share the same context.
 * Returns an empty array if the context is not KPI-comparable.
 */
export function buildContextKpiRows(
  context: SessionContext,
  a: MySessionSnapshot,
  b: MySessionSnapshot,
): KpiRow[] {
  switch (context) {
    case 'snapshot':
      return [
        { label: 'Completion', av: a.completion_pct, bv: b.completion_pct, suffix: '%', isPct: true },
        { label: 'On Track', av: a.on_track_pct, bv: b.on_track_pct, suffix: '%', isPct: true },
        { label: 'Below Target', av: a.below_target_pct, bv: b.below_target_pct, suffix: '%', isPct: true },
        { label: 'Risk Index', av: a.risk_index, bv: b.risk_index, suffix: '' },
        { label: 'Total Items', av: a.total_items, bv: b.total_items, isCount: true },
        { label: 'Applicable Items', av: a.applicable_items, bv: b.applicable_items, isCount: true },
      ];

    case 'risk-priority':
      return [
        { label: 'Risk Index', av: a.risk_index, bv: b.risk_index, suffix: '' },
        { label: 'Below Target', av: a.below_target_pct, bv: b.below_target_pct, suffix: '%', isPct: true },
        { label: 'On Track', av: a.on_track_pct, bv: b.on_track_pct, suffix: '%', isPct: true },
        { label: 'Critical Items', av: num(a, 'criticalCount'), bv: num(b, 'criticalCount'), isCount: true },
        { label: 'Emerging Items', av: num(a, 'emergingCount'), bv: num(b, 'emergingCount'), isCount: true },
        { label: 'Realized Items', av: num(a, 'realizedCount'), bv: num(b, 'realizedCount'), isCount: true },
      ];

    case 'budget':
      return [
        { label: 'Budget Utilization', av: num(a, 'budgetUtilization'), bv: num(b, 'budgetUtilization'), suffix: '%', isPct: true },
        { label: 'Commitment Ratio', av: num(a, 'commitmentRatio'), bv: num(b, 'commitmentRatio'), suffix: '%', isPct: true },
        { label: 'Spending Ratio', av: num(a, 'spendingRatio'), bv: num(b, 'spendingRatio'), suffix: '%', isPct: true },
        { label: 'Total Allocation', av: num(a, 'totalAllocation'), bv: num(b, 'totalAllocation'), isCount: true },
        { label: 'Total Spent', av: num(a, 'totalSpent'), bv: num(b, 'totalSpent'), isCount: true },
        { label: 'Total Committed', av: num(a, 'totalCommitted'), bv: num(b, 'totalCommitted'), isCount: true },
        { label: 'Available Balance', av: num(a, 'totalAvailable'), bv: num(b, 'totalAvailable'), isCount: true },
        { label: 'Unspent', av: num(a, 'totalUnspent'), bv: num(b, 'totalUnspent'), isCount: true },
      ];

    case 'comparison':
      return [
        { label: 'Loaded Units', av: num(a, 'loadedUnits'), bv: num(b, 'loadedUnits'), isCount: true },
        { label: 'Avg Completion', av: a.completion_pct, bv: b.completion_pct, suffix: '%', isPct: true },
        { label: 'Avg On Track', av: a.on_track_pct, bv: b.on_track_pct, suffix: '%', isPct: true },
        { label: 'Avg Risk Index', av: a.risk_index, bv: b.risk_index, suffix: '' },
      ];

    // AI insights, reports, guide, my-sessions are not numerical-KPI contexts.
    default:
      return [];
  }
}

export function isKpiComparableContext(context: SessionContext): boolean {
  return ['snapshot', 'risk-priority', 'budget', 'comparison'].includes(context);
}
