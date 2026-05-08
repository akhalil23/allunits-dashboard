/**
 * SnapshotMonitor — admin-only panel for monitoring the automated monthly
 * refresh pipeline and (rare) manual override via "Force Refresh".
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useSnapshotFreshness, formatFreshnessTimestamp } from '@/hooks/use-snapshot-freshness';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Attempt {
  id: string;
  month: string;
  attempt_number: number;
  status: string;
  triggered_by: string;
  units_succeeded: number;
  units_failed: number;
  budget_status: string | null;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export default function SnapshotMonitor() {
  const { data: freshness, refetch } = useSnapshotFreshness();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [forcing, setForcing] = useState(false);
  const qc = useQueryClient();

  async function loadAttempts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('monthly_refresh_attempts')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);
    if (!error && data) setAttempts(data as Attempt[]);
    setLoading(false);
  }

  useEffect(() => { loadAttempts(); }, []);

  async function handleForceRefresh() {
    if (!confirm('Force a new monthly snapshot refresh now? This will fetch fresh data from all unit spreadsheets and may take several minutes.')) return;
    setForcing(true);
    try {
      const { data, error } = await supabase.functions.invoke('monthly-refresh', {
        body: { triggeredBy: 'admin', force: true },
      });
      if (error) throw error;
      toast.success('Monthly refresh triggered. Reloading status…');
      await Promise.all([loadAttempts(), refetch()]);
      qc.invalidateQueries({ queryKey: ['gsr-data'] });
      qc.invalidateQueries({ queryKey: ['university-data'] });
      qc.invalidateQueries({ queryKey: ['budget-data'] });
    } catch (e: any) {
      toast.error(`Force refresh failed: ${e?.message ?? 'Unknown error'}`);
    } finally {
      setForcing(false);
    }
  }

  const state = freshness?.state;
  const pub = freshness?.publication;

  const statusBadge = (s: string) => {
    if (s === 'success' || s === 'idle') return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">{s}</Badge>;
    if (s === 'in_progress') return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">{s}</Badge>;
    if (s === 'pending_retry') return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">{s}</Badge>;
    return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30">{s}</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            Monthly Refresh Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current status</p>
              <div className="mt-1">{statusBadge(state?.current_status ?? 'idle')}</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Active publication</p>
              <p className="font-semibold">{pub?.month ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{formatFreshnessTimestamp(pub?.published_at)}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Last success</p>
              <p className="font-semibold text-xs">{formatFreshnessTimestamp(state?.last_success_at)}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Next retry</p>
              <p className="font-semibold text-xs">{state?.next_retry_at ? formatFreshnessTimestamp(state.next_retry_at) : '—'}</p>
            </div>
          </div>

          {state?.last_error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span><strong>Last error:</strong> {state.last_error}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Refreshes run automatically on the 1st of each month at 02:00 UTC.
              Use Force Refresh only when a corrective re-publish is required.
            </p>
            <Button onClick={handleForceRefresh} disabled={forcing} variant="outline" size="sm">
              {forcing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Force Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Recent Refresh Attempts
          </CardTitle>
          <Button onClick={loadAttempts} variant="ghost" size="sm" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>#</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Units OK</TableHead>
                  <TableHead>Units failed</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground text-sm">No refresh attempts logged yet.</TableCell></TableRow>
                )}
                {attempts.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.month}</TableCell>
                    <TableCell>{a.attempt_number}</TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                    <TableCell className="text-xs">{a.triggered_by}</TableCell>
                    <TableCell>{a.units_succeeded}</TableCell>
                    <TableCell className={a.units_failed > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>{a.units_failed}</TableCell>
                    <TableCell className="text-xs">{a.budget_status ?? '—'}</TableCell>
                    <TableCell className="text-xs">{formatFreshnessTimestamp(a.started_at)}</TableCell>
                    <TableCell className="text-xs">{a.duration_ms ? `${(a.duration_ms / 1000).toFixed(1)}s` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
