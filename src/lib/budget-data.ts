/**
 * Shared Budget Data — Used across executive dashboard components.
 * This is mock data for the 2-Year Strategic Plan (2025–2027).
 */

import type { PillarId } from './types';

export const MOCK_BUDGET: Record<PillarId, {
  year1: { allocation: number; committed: number; available: number };
  year2: { allocation: number; committed: number; available: number };
}> = {
  I:   { year1: { allocation: 2_400_000, committed: 1_920_000, available: 480_000 },  year2: { allocation: 2_600_000, committed: 1_560_000, available: 1_040_000 } },
  II:  { year1: { allocation: 1_800_000, committed: 1_260_000, available: 540_000 },  year2: { allocation: 1_950_000, committed: 1_170_000, available: 780_000 } },
  III: { year1: { allocation: 3_100_000, committed: 2_790_000, available: 310_000 },  year2: { allocation: 3_200_000, committed: 2_240_000, available: 960_000 } },
  IV:  { year1: { allocation: 1_500_000, committed: 900_000, available: 600_000 },    year2: { allocation: 1_600_000, committed: 800_000, available: 800_000 } },
  V:   { year1: { allocation: 2_200_000, committed: 1_760_000, available: 440_000 },  year2: { allocation: 2_300_000, committed: 1_380_000, available: 920_000 } },
};

export type BudgetScope = '2025-2026' | '2026-2027' | 'total';

export interface PillarBudgetRow {
  pillar: PillarId;
  label: string;
  allocation: number;
  committed: number;
  available: number;
  utilization: number;
  riskIndex: number;
  budgetPressure: boolean;
}

/** Short labels for charts (backward-compatible import) */
export const PILLAR_LABELS: Record<PillarId, string> = {
  I: 'PI', II: 'PII', III: 'PIII', IV: 'PIV', V: 'PV',
};

export function getPillarBudget(pillar: PillarId, scope: BudgetScope) {
  const mock = MOCK_BUDGET[pillar];
  if (scope === '2025-2026') return mock.year1;
  if (scope === '2026-2027') return mock.year2;
  return {
    allocation: mock.year1.allocation + mock.year2.allocation,
    committed: mock.year1.committed + mock.year2.committed,
    available: mock.year1.available + mock.year2.available,
  };
}

export function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}
