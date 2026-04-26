/**
 * useMySessions — Personal "Saved Views" for the Executive Dashboard.
 * Phase 1: list, create, delete personal session snapshots (private per user).
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

export interface CreateMySessionInput {
  label: string;
  notes?: string | null;
  academic_year: string;
  term: string;
  reporting_cycle: string;
  view_type: string;
  filters: Record<string, unknown>;
  metrics: Record<string, unknown>;
  pillar_data?: unknown[];
  unit_data?: unknown[];
  total_items: number;
  applicable_items: number;
  on_track_pct: number;
  below_target_pct: number;
  completion_pct: number;
  budget_utilization: number;
  risk_index: number;
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

export function useCreateMySession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateMySessionInput) => {
      if (!user?.id) throw new Error('You must be signed in to save a session.');
      const payload = {
        user_id: user.id,
        label: input.label,
        notes: input.notes ?? null,
        academic_year: input.academic_year,
        term: input.term,
        reporting_cycle: input.reporting_cycle,
        view_type: input.view_type,
        filters: input.filters,
        metrics: input.metrics,
        pillar_data: input.pillar_data ?? [],
        unit_data: input.unit_data ?? [],
        total_items: input.total_items,
        applicable_items: input.applicable_items,
        on_track_pct: input.on_track_pct,
        below_target_pct: input.below_target_pct,
        completion_pct: input.completion_pct,
        budget_utilization: input.budget_utilization,
        risk_index: input.risk_index,
      };
      const { data, error } = await supabase
        .from('user_session_snapshots')
        .insert(payload as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as MySessionSnapshot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-session-snapshots', user?.id] });
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
