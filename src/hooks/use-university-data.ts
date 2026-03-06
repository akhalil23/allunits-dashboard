/**
 * Multi-unit data fetcher for University Executive Dashboard.
 * Fetches all 21 units in parallel with coverage tracking.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UNIT_IDS, UNIT_CONFIGS } from '@/lib/unit-config';
import type { FetchResult } from '@/lib/types';
import type { UnitFetchResult } from '@/lib/university-aggregation';
import { FunctionsHttpError } from '@supabase/supabase-js';

function isUnauthorizedFunctionError(error: unknown): error is FunctionsHttpError {
  return error instanceof FunctionsHttpError && error.context?.status === 401;
}

async function fetchSingleUnit(unitId: string): Promise<UnitFetchResult> {
  const unitConfig = UNIT_CONFIGS[unitId];
  const unitName = unitConfig?.fullName || unitId;

  try {
    let { data, error } = await supabase.functions.invoke('fetch-gsr-data', {
      body: { unitId },
    });

    if (error && isUnauthorizedFunctionError(error)) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshed.session) {
        const retryResult = await supabase.functions.invoke('fetch-gsr-data', {
          body: { unitId },
        });
        data = retryResult.data;
        error = retryResult.error;
      }
    }

    if (error) {
      console.warn(`Failed to fetch ${unitId}:`, error.message);
      return { unitId, unitName, result: null, error: error.message };
    }

    if (data?.error) {
      console.warn(`Error in ${unitId} data:`, data.error);
      return { unitId, unitName, result: null, error: data.error };
    }

    return { unitId, unitName, result: data as FetchResult, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn(`Exception fetching ${unitId}:`, msg);
    return { unitId, unitName, result: null, error: msg };
  }
}

async function fetchAllUnits(): Promise<UnitFetchResult[]> {
  const results = await Promise.all(UNIT_IDS.map(fetchSingleUnit));
  return results;
}

export function useUniversityData() {
  return useQuery<UnitFetchResult[]>({
    queryKey: ['university-data'],
    queryFn: fetchAllUnits,
    staleTime: 3 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
