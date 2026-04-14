/**
 * Hook to fetch live budget data from the Finance spreadsheet.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PillarId } from '@/lib/types';

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
}

async function fetchBudgetData(): Promise<BudgetDataResult> {
  const { data, error } = await supabase.functions.invoke('fetch-budget-data');

  if (error) {
    if (/(RATE_LIMITED|RESOURCE_EXHAUSTED|RATE_LIMIT_EXCEEDED|\b429\b)/i.test(error.message)) {
      throw new Error('Budget source is temporarily rate-limited. Please retry in about a minute.');
    }

    console.error('Budget fetch error:', error);
    throw new Error(error.message || 'Failed to fetch budget data');
  }

  if (data?.error) {
    if (/(RATE_LIMITED|RESOURCE_EXHAUSTED|RATE_LIMIT_EXCEEDED|\b429\b)/i.test(data.error)) {
      throw new Error('Budget source is temporarily rate-limited. Please retry in about a minute.');
    }
    throw new Error(data.error);
  }

  return data as BudgetDataResult;
}

export function useBudgetData() {
  return useQuery<BudgetDataResult>({
    queryKey: ['budget-data'],
    queryFn: fetchBudgetData,
    staleTime: 3 * 60 * 1000,
    retry: (failureCount, err) => {
      if (/(rate-limited|RESOURCE_EXHAUSTED|RATE_LIMIT_EXCEEDED|\b429\b)/i.test(err.message)) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnWindowFocus: false,
  });
}
