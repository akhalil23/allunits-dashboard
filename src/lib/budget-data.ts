/**
 * Budget Data Utilities — Shared across executive dashboard components.
 * Now powered by live data from the Finance spreadsheet.
 * 
 * Budget Health uses Commitment Ratio bands:
 *   <10% → Under-Deployed
 *   10–40% → Active Deployment
 *   40–70% → Advanced Deployment
 *   ≥70% → Constrained
 */

import type { PillarId } from './types';
import type { PillarBudgetLive } from '@/hooks/use-budget-data';

export type BudgetScope = '2025-2026' | '2026-2027' | 'total';

export interface PillarBudgetRow {
  pillar: PillarId;
  label: string;
  allocation: number;
  spent: number;
  unspent: number;
  committed: number;
  available: number;
  utilization: number;
  riskIndex: number;
  budgetPressure: boolean;
}

/** Short labels for charts */
export const PILLAR_LABELS: Record<PillarId, string> = {
  I: 'PI', II: 'PII', III: 'PIII', IV: 'PIV', V: 'PV',
};

export type BudgetHealth = 'Under-Deployed' | 'Active Deployment' | 'Advanced Deployment' | 'Constrained';

/**
 * Budget Health based on Commitment Ratio (Committed / Allocated).
 *   <10% → Under-Deployed
 *   10–40% → Active Deployment
 *   40–70% → Advanced Deployment
 *   ≥70% → Constrained / Low Flexibility
 */
export function computeBudgetHealth(available: number, allocation: number): { health: BudgetHealth; color: string } {
  if (allocation <= 0) return { health: 'Under-Deployed', color: '#3B82F6' };
  const commitmentRatio = 1 - (available / allocation); // committed / allocated
  if (commitmentRatio < 0.10) return { health: 'Under-Deployed', color: '#3B82F6' };
  if (commitmentRatio < 0.40) return { health: 'Active Deployment', color: '#16A34A' };
  if (commitmentRatio < 0.70) return { health: 'Advanced Deployment', color: '#F59E0B' };
  return { health: 'Constrained', color: '#EF4444' };
}

/**
 * Get budget for a specific pillar from live data.
 */
export function getLivePillarBudget(
  pillarData: Record<string, PillarBudgetLive> | undefined,
  pillar: PillarId,
): { allocation: number; committed: number; available: number; spent: number; unspent: number } {
  if (!pillarData) return { allocation: 0, committed: 0, available: 0, spent: 0, unspent: 0 };
  const d = pillarData[pillar];
  if (!d) return { allocation: 0, committed: 0, available: 0, spent: 0, unspent: 0 };
  return {
    allocation: d.allocation,
    committed: d.committed,
    available: d.available,
    spent: d.spent,
    unspent: d.unspent,
  };
}

export function formatCurrency(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function formatCurrencyFull(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}