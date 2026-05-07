/**
 * FreshnessBanner — visible across every dashboard tab.
 * Shows the timestamp of the last successful automated monthly snapshot,
 * plus retry/failure status when applicable.
 */
import { Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { useSnapshotFreshness, formatFreshnessTimestamp } from '@/hooks/use-snapshot-freshness';

interface FreshnessBannerProps {
  compact?: boolean;
}

export default function FreshnessBanner({ compact = false }: FreshnessBannerProps) {
  const { data } = useSnapshotFreshness();
  const pub = data?.publication;
  const state = data?.state;

  const lastUpdate = pub?.published_at ?? state?.last_success_at ?? null;
  const status = state?.current_status ?? 'idle';

  let statusLine: string;
  let tone: 'ok' | 'warn' | 'err' = 'ok';
  let Icon = Calendar;

  if (!lastUpdate) {
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

  const toneClasses = tone === 'ok'
    ? 'border-emerald-400/15 bg-emerald-400/[0.04] text-emerald-100/90'
    : tone === 'warn'
      ? 'border-amber-400/20 bg-amber-400/[0.06] text-amber-100/90'
      : 'border-rose-400/20 bg-rose-400/[0.06] text-rose-100/90';

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-[11px] font-medium ${toneClasses}`}>
        <Icon className={`w-3.5 h-3.5 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
        <span className="truncate">{statusLine}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-2.5 rounded-lg border ${toneClasses}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-snug">{statusLine}</p>
        <p className="text-[10.5px] opacity-70 mt-0.5 leading-snug">
          Dashboard data is refreshed automatically on the 1st of each month, as stated in the Dashboard Guide.
        </p>
      </div>
    </div>
  );
}
