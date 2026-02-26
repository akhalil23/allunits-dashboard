import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { FetchResult } from '@/lib/types';
import { getUnitConfig } from '@/lib/unit-config';

async function fetchUnitData(spreadsheetId: string): Promise<FetchResult> {
  const { data, error } = await supabase.functions.invoke('fetch-gsr-data', {
    body: { spreadsheetId },
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
  const unitConfig = getUnitConfig(unitId || 'GSR');
  const spreadsheetId = unitConfig?.spreadsheetId || '14Z6hsOOx4reMzE5KYIkWgVi31BAuQSOwkZnE7Qhzqvk';

  return useQuery<FetchResult>({
    queryKey: ['gsr-data', unitId || 'GSR'],
    queryFn: () => fetchUnitData(spreadsheetId),
    staleTime: 2 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
