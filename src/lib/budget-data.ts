/**
 * Budget Data Utilities — Shared across executive dashboard components.
 * Now powered by live data from the Finance spreadsheet.
 * 
 * Budget Health uses Commitment Ratio bands:
 *   0–10% → No Commitment Yet
 *   10–30% → Light Commitment
 *   30–60% → Mild Commitment
 *   60–80% → Healthy Commitment
 *   ≥80% → Strong Commitment
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

export type BudgetHealth = 'No Commitment Yet' | 'Light Commitment' | 'Mild Commitment' | 'Healthy Commitment' | 'Strong Commitment';

export type SpendingHealth = 'No Spending Yet' | 'Light Spending' | 'Mild Spending' | 'Healthy Spending' | 'Strong Spending';

/**
 * Budget Health based on Commitment Ratio (Committed / Allocated).
 *   0–10% → No Commitment Yet
 *   10–30% → Light Commitment
 *   30–60% → Mild Commitment
 *   60–80% → Healthy Commitment
 *   ≥80% → Strong Commitment
 */
export function computeBudgetHealth(available: number, allocation: number): { health: BudgetHealth; color: string } {
  if (allocation <= 0) return { health: 'No Commitment Yet', color: '#94A3B8' };
  const commitmentRatio = 1 - (available / allocation); // committed / allocated
  if (commitmentRatio < 0.10) return { health: 'No Commitment Yet', color: '#94A3B8' };
  if (commitmentRatio < 0.30) return { health: 'Light Commitment', color: '#3B82F6' };
  if (commitmentRatio < 0.60) return { health: 'Mild Commitment', color: '#F59E0B' };
  if (commitmentRatio < 0.80) return { health: 'Healthy Commitment', color: '#16A34A' };
  return { health: 'Strong Commitment', color: '#059669' };
}

/**
 * Spending Health based on Spending Ratio (Spent / Allocated).
 *   0% → No Spending Yet
 *   0–20% → Light Spending
 *   20–50% → Mild Spending
 *   50–75% → Healthy Spending
 *   ≥75% → Strong Spending
 */
export function computeSpendingHealth(spent: number, allocation: number): { health: SpendingHealth; color: string } {
  if (allocation <= 0 || spent <= 0) return { health: 'No Spending Yet', color: '#94A3B8' };
  const spendingRatio = spent / allocation;
  if (spendingRatio < 0.20) return { health: 'Light Spending', color: '#3B82F6' };
  if (spendingRatio < 0.50) return { health: 'Mild Spending', color: '#F59E0B' };
  if (spendingRatio < 0.75) return { health: 'Healthy Spending', color: '#16A34A' };
  return { health: 'Strong Spending', color: '#059669' };
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