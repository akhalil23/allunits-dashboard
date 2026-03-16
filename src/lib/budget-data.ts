/**
 * Budget Data Utilities — Shared across executive dashboard components.
 * Now powered by live data from the Finance spreadsheet.
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

export type BudgetHealth = 'Healthy' | 'Watch' | 'Critical';

export function computeBudgetHealth(available: number, allocation: number): { health: BudgetHealth; color: string } {
  if (allocation <= 0) return { health: 'Healthy', color: '#16A34A' };
  const availPct = available / allocation;
  if (availPct >= 0.30) return { health: 'Healthy', color: '#16A34A' };
  if (availPct >= 0.15) return { health: 'Watch', color: '#F59E0B' };
  return { health: 'Critical', color: '#EF4444' };
}

/**
 * Get budget for a specific pillar from live data.
 * Returns total (allocation/committed/available) from the live pillar data.
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
