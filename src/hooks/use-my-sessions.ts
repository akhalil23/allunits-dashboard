/**
 * useMySessions — Personal session snapshot history per user.
 * Phase 1 foundation: read + delete only. Capture/comparison/export come later.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MySessionSnapshot {
  id: string;
  user_id: string;
  label: string;
  notes: string | null;
  academic_year: string;
  term: string;
  reporting_cycle: string;
  view_type: string;
  filters: Record<string, unknown>;
  metrics: Record<string, unknown>;
  pillar_data: unknown[];
  unit_data: unknown[];
  total_items: number;
  applicable_items: number;
  on_track_pct: number;
  below_target_pct: number;
  completion_pct: number;
  budget_utilization: number;
  risk_index: number;
  created_at: string;
  updated_at: string;
}

export function useMySessions() {
  const { user } = useAuth();

  return useQuery<MySessionSnapshot[]>({
    queryKey: ['my-session-snapshots', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_session_snapshots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as MySessionSnapshot[];
    },
  });
}

export function useDeleteMySession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_session_snapshots')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-session-snapshots', user?.id] });
    },
  });
}
