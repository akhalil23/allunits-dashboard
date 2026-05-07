/**
 * useSnapshotFreshness — reads the active monthly publication metadata.
 * This is the single source of truth for the "last dashboard update" timestamp
 * shown across every tab.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SnapshotPublication {
  id: string;
  month: string; // YYYY-MM
  published_at: string;
  total_units: number;
  succeeded_units: number;
  budget_included: boolean;
}

export interface SnapshotFreshness {
  publication: SnapshotPublication | null;
  state: {
    current_status: 'idle' | 'in_progress' | 'pending_retry' | 'failed' | 'success';
    last_success_at: string | null;
    last_attempt_at: string | null;
    next_retry_at: string | null;
    last_error: string | null;
  } | null;
}

export function useSnapshotFreshness() {
  const { isAuthenticated, session } = useAuth();
  return useQuery<SnapshotFreshness>({
    queryKey: ['snapshot-freshness', session?.user.id ?? 'anonymous'],
    queryFn: async () => {
      const [{ data: pubData }, stateRes] = await Promise.all([
        supabase.functions.invoke('get-snapshot', { body: { kind: 'publication' } }),
        supabase.from('monthly_refresh_state').select('current_status,last_success_at,last_attempt_at,next_retry_at,last_error').eq('id', 'singleton').maybeSingle(),
      ]);
      return {
        publication: pubData?.publication ?? null,
        state: (stateRes.data as SnapshotFreshness['state']) ?? null,
      };
    },
    enabled: !!isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function formatFreshnessTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
