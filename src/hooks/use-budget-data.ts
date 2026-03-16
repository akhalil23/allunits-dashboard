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

export interface BudgetDataResult {
  pillars: Record<string, PillarBudgetLive>;
  observedAt: string;
  validationErrors: string[];
}

async function fetchBudgetData(): Promise<BudgetDataResult> {
  const { data, error } = await supabase.functions.invoke('fetch-budget-data');

  if (error) {
    console.error('Budget fetch error:', error);
    throw new Error(error.message || 'Failed to fetch budget data');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as BudgetDataResult;
}

export function useBudgetData() {
  return useQuery<BudgetDataResult>({
    queryKey: ['budget-data'],
    queryFn: fetchBudgetData,
    staleTime: 3 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
