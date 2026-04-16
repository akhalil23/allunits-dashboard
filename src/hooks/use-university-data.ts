/**
 * Multi-unit data fetcher for University Executive Dashboard.
 * Fetches all units in parallel with coverage tracking.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UNIT_IDS, UNIT_CONFIGS } from '@/lib/unit-config';
import type { FetchResult } from '@/lib/types';
import type { UnitFetchResult } from '@/lib/university-aggregation';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface UseUniversityDataOptions {
  enabled?: boolean;
}

const UNIVERSITY_DATA_STALE_TIME_MS = 60 * 1000;
const UNIVERSITY_DATA_GC_TIME_MS = 5 * 60 * 1000;

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

/** Fetch units in staggered batches to avoid Google Sheets API rate limits (60 reads/min). */
async function fetchAllUnits(): Promise<UnitFetchResult[]> {
  const BATCH_SIZE = 2;
  const BATCH_DELAY_MS = 6000; // 2 units every 6s ≈ 20 reads/min, safely under 60/min quota
  const results: UnitFetchResult[] = [];

  for (let i = 0; i < UNIT_IDS.length; i += BATCH_SIZE) {
    const batch = UNIT_IDS.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(fetchSingleUnit));
    results.push(...batchResults);

    // Delay before next batch (skip after last batch)
    if (i + BATCH_SIZE < UNIT_IDS.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return results;
}

export function useUniversityData({ enabled = true }: UseUniversityDataOptions = {}) {
  return useQuery<UnitFetchResult[]>({
    queryKey: ['university-data'],
    queryFn: fetchAllUnits,
    enabled,
    staleTime: UNIVERSITY_DATA_STALE_TIME_MS,
    gcTime: UNIVERSITY_DATA_GC_TIME_MS,
    retry: 1,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
