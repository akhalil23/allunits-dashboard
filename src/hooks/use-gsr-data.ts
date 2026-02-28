import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/use-user-role';
import type { FetchResult } from '@/lib/types';

async function fetchUnitData(unitId: string): Promise<FetchResult> {
  const { data, error } = await supabase.functions.invoke('fetch-gsr-data', {
    body: { unitId },
  });

  if (error) {
    console.error('Edge function error:', error);
    throw new Error(error.message || 'Failed to fetch data');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as FetchResult;
}

export function useGSRData() {
  const { unitId } = useParams<{ unitId: string }>();
  const resolvedUnitId = unitId || 'GSR';
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
    staleTime: 2 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
