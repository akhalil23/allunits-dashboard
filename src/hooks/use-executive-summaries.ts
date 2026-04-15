import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExecutiveSummary {
  academicYear: string;
  period: string;
  pillar: string; // I, II, III, IV, V
  achievements: string;
  challenges: string;
  priorities: string;
}

export function useExecutiveSummaries() {
  return useQuery<ExecutiveSummary[]>({
    queryKey: ['executive-summaries'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-executive-summaries');
      if (error) throw error;
      return data?.summaries || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
