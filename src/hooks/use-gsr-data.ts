import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/use-user-role';
import type { FetchResult } from '@/lib/types';

function isUnauthorizedFunctionError(error: unknown): error is FunctionsHttpError {
  return error instanceof FunctionsHttpError && error.context?.status === 401;
}

function isRateLimitedFunctionError(error: unknown): boolean {
  if (error instanceof FunctionsHttpError && error.context?.status === 429) {
    return true;
  }

  const message = error instanceof Error ? error.message : '';
  return /(RATE_LIMITED|RESOURCE_EXHAUSTED|RATE_LIMIT_EXCEEDED|\b429\b)/i.test(message);
}

async function invokeFetch(unitId: string) {
  return supabase.functions.invoke('fetch-gsr-data', {
    body: { unitId },
  });
}

async function fetchUnitData(unitId: string): Promise<FetchResult> {
  let { data, error } = await invokeFetch(unitId);

  // Recover from stale/invalid session on published domains.
  if (error && isUnauthorizedFunctionError(error)) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

    if (!refreshError && refreshed.session) {
      const retryResult = await invokeFetch(unitId);
      data = retryResult.data;
      error = retryResult.error;
    }
  }

  if (error) {
    if (isUnauthorizedFunctionError(error)) {
      await supabase.auth.signOut();
      throw new Error('Session expired. Please sign in again.');
    }

    if (isRateLimitedFunctionError(error)) {
      throw new Error('Data source is temporarily rate-limited. Please retry in about a minute.');
    }

    console.error('Edge function error:', error);
    throw new Error(error.message || 'Failed to fetch data');
  }

  if (data?.error) {
    if (/(RATE_LIMITED|RESOURCE_EXHAUSTED|RATE_LIMIT_EXCEEDED|\b429\b)/i.test(data.error)) {
      throw new Error('Data source is temporarily rate-limited. Please retry in about a minute.');
    }
    if (/(SERVICE_UNAVAILABLE|temporarily unavailable|\b503\b)/i.test(data.error)) {
      throw new Error('Data source is temporarily unavailable. Please retry in a few minutes.');
    }
    throw new Error(data.error);
  }

  return data as FetchResult;
}

export function useGSRData() {
  const { unitCode } = useParams<{ unitCode: string }>();
  const resolvedUnitId = unitCode || 'GSR';
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  // Don't fetch if role is still loading or if unit_user is on wrong unit
  const hasAccess = !roleLoading && userRole && (
    userRole.role === 'admin' ||
    !userRole.unitId ||
    userRole.unitId === resolvedUnitId
  );

  return useQuery<FetchResult>({
    queryKey: ['gsr-data', resolvedUnitId],
    queryFn: () => fetchUnitData(resolvedUnitId),
    enabled: !!hasAccess,
    staleTime: 0,
    retry: (failureCount, err) => {
      if (/(rate-limited|RESOURCE_EXHAUSTED|RATE_LIMIT_EXCEEDED|SERVICE_UNAVAILABLE|temporarily unavailable|\b429\b|\b503\b)/i.test(err.message)) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
}
