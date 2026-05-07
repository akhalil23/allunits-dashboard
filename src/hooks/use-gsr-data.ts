import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { getValidAccessToken } from '@/lib/auth-session';
import type { FetchResult, ViewType } from '@/lib/types';

function isUnauthorizedFunctionError(error: unknown): error is FunctionsHttpError {
  return error instanceof FunctionsHttpError && error.context?.status === 401;
}

async function fetchUnitSnapshot(unitId: string): Promise<FetchResult> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    await supabase.auth.signOut();
    throw new Error('Session expired. Please sign in again.');
  }

  let { data, error } = await supabase.functions.invoke('get-snapshot', {
    body: { kind: 'unit', unitId },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (error && isUnauthorizedFunctionError(error)) {
    const refreshed = await getValidAccessToken({ refresh: true });
    if (refreshed) {
      const retry = await supabase.functions.invoke('get-snapshot', {
        body: { kind: 'unit', unitId },
        headers: { Authorization: `Bearer ${refreshed}` },
      });
      data = retry.data; error = retry.error;
    }
  }

  if (error) {
    if (isUnauthorizedFunctionError(error)) {
      await supabase.auth.signOut();
      throw new Error('Session expired. Please sign in again.');
    }
    throw new Error(error.message || 'Failed to load monthly snapshot');
  }
  if (data?.error) throw new Error(data.error);
  return data as FetchResult;
}

/**
 * Reads the active monthly snapshot for the current unit.
 * `viewType` is preserved for API compatibility but is not sent — the snapshot
 * always carries both SP (cumulative) and yearly status fields, and the view
 * is selected purely by client-side intelligence helpers.
 */
export function useGSRData(_viewType?: ViewType) {
  const { unitCode } = useParams<{ unitCode: string }>();
  const resolvedUnitId = unitCode || 'GSR';
  const { isAuthenticated, isLoading: authLoading, session } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  const hasAccess = !authLoading && !roleLoading && !!session?.access_token && userRole && (
    userRole.role === 'admin' ||
    !userRole.unitId ||
    userRole.unitId === resolvedUnitId
  );

  return useQuery<FetchResult>({
    queryKey: ['unit-snapshot', resolvedUnitId, session?.user.id ?? 'anonymous'],
    queryFn: () => fetchUnitSnapshot(resolvedUnitId),
    enabled: !!isAuthenticated && !!hasAccess,
    staleTime: 60 * 60 * 1000, // 1h — monthly data, no need to refetch often
    gcTime: 6 * 60 * 60 * 1000,
    retry: (failureCount, err) => {
      if (/session expired/i.test(err.message)) return false;
      return failureCount < 1;
    },
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
