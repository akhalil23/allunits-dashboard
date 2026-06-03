/**
 * FreshnessBanner — visible across every dashboard tab.
 * Shows the timestamp of the last successful automated monthly snapshot,
 * plus retry/failure status when applicable.
 *
 * Includes a manual "Refresh" button so users can re-pull data from the
 * source spreadsheets when not all units loaded (e.g. after a 429/503).
 */
import { useState } from 'react';
import { Calendar, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSnapshotFreshness, formatFreshnessTimestamp } from '@/hooks/use-snapshot-freshness';
import { supabase } from '@/integrations/supabase/client';
import { getValidAccessToken } from '@/lib/auth-session';
import { toast } from 'sonner';

interface FreshnessBannerProps {
  compact?: boolean;
}

export default function FreshnessBanner({ compact = false }: FreshnessBannerProps) {
  const { data, refetch } = useSnapshotFreshness();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const pub = data?.publication;
  const state = data?.state;

  const lastUpdate = pub?.published_at ?? state?.last_success_at ?? null;
  const status = state?.current_status ?? 'idle';
  const isLive = (pub as { id?: string } | null)?.id === 'live';

  async function handleManualRefresh() {
    setRefreshing(true);
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('Session expired — please sign in again.');
      // Bust the server-side live cache so the next fetch hits the spreadsheets.
      const { error } = await supabase.functions.invoke('get-snapshot', {
        body: { kind: 'publication', forceRefresh: true },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error) throw new Error(error.message || 'Refresh failed');
      // Invalidate every dashboard data cache so the UI re-fetches immediately.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['unit-snapshot'] }),
        qc.invalidateQueries({ queryKey: ['university-snapshot'] }),
        qc.invalidateQueries({ queryKey: ['budget-data'] }),
        qc.invalidateQueries({ queryKey: ['snapshot-freshness'] }),
        refetch(),
      ]);
      toast.success('Dashboard data refreshed from source spreadsheets.');
    } catch (e: any) {
      toast.error(e?.message || 'Refresh failed.');
    } finally {
      setRefreshing(false);
    }
  }

  let statusLine: string;
  let tone: 'ok' | 'warn' | 'err' = 'ok';
  let Icon = Calendar;

  if (isLive) {
    statusLine = 'Live data — the dashboard is reading directly from the source spreadsheets.';
    tone = 'ok';
  } else if (!lastUpdate) {
    statusLine = 'Awaiting first automated monthly snapshot.';
    tone = 'warn';
    Icon = Loader2;
  } else if (status === 'in_progress') {
    statusLine = `Monthly refresh in progress. Last successful update: ${formatFreshnessTimestamp(lastUpdate)}.`;
    tone = 'warn';
    Icon = Loader2;
  } else if (status === 'pending_retry') {
    statusLine = `Monthly refresh pending. Last successful update: ${formatFreshnessTimestamp(lastUpdate)}. The system will retry automatically.`;
    tone = 'warn';
    Icon = AlertTriangle;
  } else if (status === 'failed') {
    statusLine = `Latest monthly refresh attempt failed. Previous validated monthly snapshot remains active (${formatFreshnessTimestamp(lastUpdate)}).`;
    tone = 'err';
    Icon = AlertTriangle;
  } else {
    statusLine = `Last dashboard update: ${formatFreshnessTimestamp(lastUpdate)}.`;
  }

  const subline = isLive
    ? 'Changes made in the source spreadsheets are reflected in near real-time (short server-side cache). Use Refresh if a unit failed to load.'
    : 'Dashboard data is refreshed automatically on the 1st of each month, as stated in the Dashboard Guide.';

  const toneClasses = tone === 'ok'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
    : tone === 'warn'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200';

  const RefreshButton = (
    <button
      type="button"
      onClick={handleManualRefresh}
      disabled={refreshing}
      className={`inline-flex items-center gap-1.5 rounded-md border border-current/30 bg-background/40 px-2 py-1 text-[11px] font-semibold transition hover:bg-background/70 disabled:opacity-60 disabled:cursor-not-allowed`}
      title="Re-pull data from the source spreadsheets"
    >
      <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
      {refreshing ? 'Refreshing…' : 'Refresh'}
    </button>
  );

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-[11px] font-medium ${toneClasses}`}>
        <Icon className={`w-3.5 h-3.5 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
        <span className="truncate flex-1">{statusLine}</span>
        {RefreshButton}
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-2.5 rounded-lg border ${toneClasses}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-snug">{statusLine}</p>
        <p className="text-[10.5px] opacity-70 mt-0.5 leading-snug">
          {subline}
        </p>
      </div>
      <div className="flex-shrink-0">{RefreshButton}</div>
    </div>
  );
}
