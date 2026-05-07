/**
 * University data: reads all-units snapshot from monthly publication.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UNIT_CONFIGS } from '@/lib/unit-config';
import { getValidAccessToken } from '@/lib/auth-session';
import type { FetchResult } from '@/lib/types';
import type { UnitFetchResult } from '@/lib/university-aggregation';

interface UseUniversityDataOptions { enabled?: boolean }

async function fetchAllUnits(): Promise<UnitFetchResult[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error('Session expired');

  const { data, error } = await supabase.functions.invoke('get-snapshot', {
    body: { kind: 'all-units' },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) throw new Error(error.message || 'Failed to load monthly snapshot');
  if (data?.error) throw new Error(data.error);

  const units: { unitId: string; payload: FetchResult }[] = data?.units ?? [];
  return units.map(u => {
    const cfg = UNIT_CONFIGS[u.unitId];
    return {
      unitId: u.unitId,
      unitName: cfg?.fullName || u.unitId,
      result: u.payload as FetchResult,
      error: null,
    };
  });
}

export function useUniversityData({ enabled = true }: UseUniversityDataOptions = {}) {
  const { isAuthenticated, isLoading: authLoading, session } = useAuth();

  return useQuery<UnitFetchResult[]>({
    queryKey: ['university-snapshot', session?.user.id ?? 'anonymous'],
    queryFn: () => fetchAllUnits(),
    enabled: enabled && !authLoading && isAuthenticated && !!session?.access_token,
    staleTime: 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
    retry: 1,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
