import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FetchResult } from '@/lib/types';
import { mockFetchResult } from '@/lib/mock-data';

async function fetchGSRData(): Promise<FetchResult> {
  const { data, error } = await supabase.functions.invoke('fetch-gsr-data');

  if (error) {
    console.error('Edge function error:', error);
    throw new Error(error.message || 'Failed to fetch GSR data');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as FetchResult;
}

export function useGSRData() {
  return useQuery<FetchResult>({
    queryKey: ['gsr-data'],
    queryFn: fetchGSRData,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
