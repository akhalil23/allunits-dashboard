/**
 * Multi-unit data fetcher for University Executive Dashboard.
 * Fetches all units in parallel with coverage tracking.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UNIT_IDS, UNIT_CONFIGS } from '@/lib/unit-config';
import { getValidAccessToken } from '@/lib/auth-session';
import type { FetchResult } from '@/lib/types';
import type { UnitFetchResult } from '@/lib/university-aggregation';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface UseUniversityDataOptions {
  enabled?: boolean;
}

const UNIVERSITY_DATA_STALE_TIME_MS = 60 * 1000;
const UNIVERSITY_DATA_GC_TIME_MS = 5 * 60 * 1000;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Query aborted', 'AbortError');
  }
}

async function delayWithAbort(ms: number, signal?: AbortSignal) {
  throwIfAborted(signal);

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('Query aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function isUnauthorizedFunctionError(error: unknown): error is FunctionsHttpError {
  return error instanceof FunctionsHttpError && error.context?.status === 401;
}

async function fetchSingleUnit(unitId: string, signal?: AbortSignal): Promise<UnitFetchResult> {
  const unitConfig = UNIT_CONFIGS[unitId];
  const unitName = unitConfig?.fullName || unitId;

  try {
    throwIfAborted(signal);

    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return { unitId, unitName, result: null, error: 'Session ended before request completed' };
    }

    let { data, error } = await supabase.functions.invoke('fetch-gsr-data', {
      body: { unitId },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error && isUnauthorizedFunctionError(error)) {
      const refreshedAccessToken = await getValidAccessToken({ refresh: true });
      if (refreshedAccessToken) {
        const retryResult = await supabase.functions.invoke('fetch-gsr-data', {
          body: { unitId },
          headers: {
            Authorization: `Bearer ${refreshedAccessToken}`,
          },
        });
        data = retryResult.data;
        error = retryResult.error;
      } else {
        // No active session anymore — treat as a soft failure so the rest of the dashboard keeps working.
        return { unitId, unitName, result: null, error: 'Session expired' };
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
    if (isAbortError(err)) throw err;
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn(`Exception fetching ${unitId}:`, msg);
    return { unitId, unitName, result: null, error: msg };
  }
}

/** Fetch units in staggered batches to avoid Google Sheets API rate limits (60 reads/min). */
async function fetchAllUnits(signal?: AbortSignal): Promise<UnitFetchResult[]> {
  const BATCH_SIZE = 2;
  const BATCH_DELAY_MS = 6000; // 2 units every 6s ≈ 20 reads/min, safely under 60/min quota
  const results: UnitFetchResult[] = [];

  for (let i = 0; i < UNIT_IDS.length; i += BATCH_SIZE) {
    throwIfAborted(signal);
    const batch = UNIT_IDS.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(unitId => fetchSingleUnit(unitId, signal)));
    results.push(...batchResults);

    // Delay before next batch (skip after last batch)
    if (i + BATCH_SIZE < UNIT_IDS.length) {
      await delayWithAbort(BATCH_DELAY_MS, signal);
    }
  }

  return results;
}

export function useUniversityData({ enabled = true }: UseUniversityDataOptions = {}) {
  const { isAuthenticated, isLoading: authLoading, session } = useAuth();

  return useQuery<UnitFetchResult[]>({
    queryKey: ['university-data', session?.user.id ?? 'anonymous'],
    queryFn: ({ signal }) => fetchAllUnits(signal),
    enabled: enabled && !authLoading && isAuthenticated && !!session?.access_token,
    staleTime: UNIVERSITY_DATA_STALE_TIME_MS,
    gcTime: UNIVERSITY_DATA_GC_TIME_MS,
    retry: 1,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
