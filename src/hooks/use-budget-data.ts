/**
 * Hook to fetch live budget data from the Finance spreadsheet.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PillarId } from '@/lib/types';

interface UseBudgetDataOptions {
  enabled?: boolean;
}

const BUDGET_DATA_STALE_TIME_MS = 60 * 1000;

export interface PillarBudgetLive {
  allocation: number;
  spent: number;
  unspent: number;
  committed: number;
  available: number;
  year4: number;
  year5: number;
}

export interface ActionStepBudget {
  pillar: string;
  goal: string;
  objective: string;
  actionStep: string;
  sheetRow: number;
  year4: number;
  year5: number;
  allocation: number;
  spent: number;
  unspent: number;
  committed: number;
  available: number;
}

export interface BudgetDataResult {
  pillars: Record<string, PillarBudgetLive>;
  actionStepBudgets: ActionStepBudget[];
  observedAt: string;
  validationErrors: string[];
  budgetUnavailable?: boolean;
}

const emptyBudgetSnapshot = (validationErrors: string[] = []): BudgetDataResult => ({
  pillars: {},
  actionStepBudgets: [],
  observedAt: new Date().toISOString(),
  validationErrors,
  budgetUnavailable: true,
});

async function fetchBudgetData(): Promise<BudgetDataResult> {
  const { data, error } = await supabase.functions.invoke('get-snapshot', {
    body: { kind: 'budget' },
  });

  if (error) {
    console.error('Budget snapshot error:', error);
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 404 || /Budget snapshot unavailable/i.test(error.message)) {
      return emptyBudgetSnapshot(['Budget snapshot unavailable for the active monthly publication.']);
    }
    throw new Error(error.message || 'Failed to load monthly budget snapshot');
  }
  if (data?.error) {
    if (/Budget snapshot unavailable/i.test(data.error)) {
      return emptyBudgetSnapshot([data.error]);
    }
    throw new Error(data.error);
  }

  return data as BudgetDataResult;
}

export function useBudgetData({ enabled = true }: UseBudgetDataOptions = {}) {
  return useQuery<BudgetDataResult>({
    queryKey: ['budget-data'],
    queryFn: fetchBudgetData,
    enabled,
    staleTime: BUDGET_DATA_STALE_TIME_MS,
    retry: (failureCount, err) => {
      if (/(rate-limited|RESOURCE_EXHAUSTED|RATE_LIMIT_EXCEEDED|\b429\b)/i.test(err.message)) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
