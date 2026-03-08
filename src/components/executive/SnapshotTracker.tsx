/**
 * Strategic Snapshot Tracker
 * Capture performance snapshots and track trajectory across reporting cycles.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Clock, TrendingUp, TrendingDown, Minus, CheckCircle2,
  AlertTriangle, ShieldAlert, DollarSign, Loader2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTip } from '@/components/ui/info-tip';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateByPillar, getRiskBandColor, type UniversityAggregation } from '@/lib/university-aggregation';
import { PILLAR_SHORT, PILLAR_FULL } from '@/lib/pillar-labels';
import { getPillarBudget } from '@/lib/budget-data';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PillarId } from '@/lib/types';
import { toast } from 'sonner';

interface Props { aggregation: UniversityAggregation; }


export default function SnapshotTracker({ aggregation }: Props) {
  const { viewType, term, academicYear } = useDashboard();
  const { data: unitResults } = useUniversityData();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [capturing, setCapturing] = useState(false);

  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  const budgetUtilization = useMemo(() => {
    const pillars: PillarId[] = ['I','II','III','IV','V'];
    let totalCommitted = 0, totalAll = 0;
    pillars.forEach(p => {
      const b = getPillarBudget(p, 'total');
      totalCommitted += b.committed;
      totalAll += b.committed + b.available;
    });
    return totalAll > 0 ? parseFloat(((totalCommitted / totalAll) * 100).toFixed(1)) : 0;
  }, []);

  const reportingCycle = `${term === 'mid' ? 'Mid-Year' : 'End-Year'} AY ${academicYear}`;

  // Fetch stored snapshots
  const { data: snapshots = [], isLoading: loadingSnapshots } = useQuery({
    queryKey: ['strategic-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_snapshots')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const [selectedSnapshotIdx, setSelectedSnapshotIdx] = useState<number | null>(null);

  const handleCapture = useCallback(async () => {
    if (!user) return;
    setCapturing(true);
    try {
      const pillarData = pillarAgg.map(p => ({
        pillar: p.pillar,
        completionPct: p.completionPct,
        riskIndex: p.riskIndex,
        applicableItems: p.applicableItems,
      }));

      const unitData = aggregation.unitAggregations.map(u => ({
        unitId: u.unitId,
        unitName: u.unitName,
        completionPct: u.completionPct,
        riskIndex: u.riskIndex,
        applicableItems: u.applicableItems,
      }));

      const { error } = await supabase.from('strategic_snapshots').insert({
        captured_by: user.id,
        reporting_cycle: reportingCycle,
        academic_year: academicYear,
        term,
        view_type: viewType,
        completion_pct: aggregation.completionPct,
        risk_index: aggregation.riskIndex,
        budget_utilization: budgetUtilization,
        on_track_pct: aggregation.onTrackPct,
        below_target_pct: aggregation.belowTargetPct,
        applicable_items: aggregation.applicableItems,
        total_items: aggregation.totalItems,
        pillar_data: pillarData,
        unit_data: unitData,
      });

      if (error) throw error;
      toast.success('Snapshot captured successfully');
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
    } catch (err: any) {
      toast.error('Failed to capture snapshot: ' + (err.message || 'Unknown error'));
    } finally {
      setCapturing(false);
    }
  }, [user, pillarAgg, aggregation, budgetUtilization, reportingCycle, academicYear, term, viewType, queryClient]);

  const prevSnapshot = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;
  const latestSnapshot = snapshots.length >= 1 ? snapshots[snapshots.length - 1] : null;

  // Change indicators
  const changes = useMemo(() => {
    if (!prevSnapshot || !latestSnapshot) return null;
    return {
      completion: Number(latestSnapshot.completion_pct) - Number(prevSnapshot.completion_pct),
      riskIndex: Number(latestSnapshot.risk_index) - Number(prevSnapshot.risk_index),
      budgetUtil: Number(latestSnapshot.budget_utilization) - Number(prevSnapshot.budget_utilization),
    };
  }, [prevSnapshot, latestSnapshot]);

  // Pillar momentum
  const pillarMomentum = useMemo(() => {
    if (!prevSnapshot || !latestSnapshot) return null;
    const prevPillars = (prevSnapshot.pillar_data as any[]) || [];
    const latestPillars = (latestSnapshot.pillar_data as any[]) || [];
    const pillars: PillarId[] = ['I','II','III','IV','V'];
    return pillars.map(p => {
      const prev = prevPillars.find((pp: any) => pp.pillar === p);
      const latest = latestPillars.find((pp: any) => pp.pillar === p);
      return {
        pillar: p,
        completionDelta: prev && latest ? Number(latest.completionPct) - Number(prev.completionPct) : 0,
        riskDelta: prev && latest ? Number(latest.riskIndex) - Number(prev.riskIndex) : 0,
        currentCompletion: latest?.completionPct ?? 0,
        currentRI: latest?.riskIndex ?? 0,
      };
    });
  }, [prevSnapshot, latestSnapshot]);

  // Trend data from all snapshots
  const trendData = useMemo(() => {
    // Count occurrences per reporting_cycle to add unique suffixes
    const cycleCounts: Record<string, number> = {};
    return snapshots.map((s: any) => {
      const cycle = s.reporting_cycle;
      cycleCounts[cycle] = (cycleCounts[cycle] || 0) + 1;
      const count = cycleCounts[cycle];
      const dt = new Date(s.created_at);
      const timeStr = dt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return {
        label: `${cycle} (${timeStr})`,
        shortLabel: `S${Object.values(cycleCounts).reduce((a, b) => a + b, 0)}`,
        completion: Number(s.completion_pct),
        riskIndex: Number(s.risk_index),
        budgetUtil: Number(s.budget_utilization),
        date: dt.toLocaleDateString(),
      };
    });
  }, [snapshots]);

  return (
    <div className="space-y-8">
      {/* Section A: Current Reporting Snapshot */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Camera className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Reporting Snapshot</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Reporting Cycle: <span className="font-semibold text-foreground">{reportingCycle}</span> •
            Captured at: <span className="font-semibold text-foreground">{new Date().toLocaleString()}</span>
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            <MetricCard label="Completion — Actions Completed" value={`${aggregation.completionPct}%`} icon={CheckCircle2} tooltip="Percentage of applicable strategic actions marked as completed relative to the total strategic actions for the selected pillar or unit." />
            <MetricCard label="RI (Risk Index)" value={`RI ${aggregation.riskIndex.toFixed(2)}`} icon={ShieldAlert} color={getRiskBandColor(aggregation.riskIndex)} tooltip="Risk Index (RI) represents the aggregated severity of risk signals across applicable strategic actions. Lower values indicate lower structural risk." />
            <MetricCard label="Budget Utilization — Used" value={`${budgetUtilization}%`} icon={DollarSign} tooltip="Percentage of the allocated budget that has already been utilized during the selected reporting cycle." />
            <MetricCard label="On-Track — As Planned" value={`${aggregation.onTrackPct}%`} icon={CheckCircle2} tooltip="Percentage of strategic actions currently progressing according to the planned schedule." />
            <MetricCard label="Below Target — Underperforming" value={`${aggregation.belowTargetPct}%`} icon={AlertTriangle} tooltip="Percentage of actions performing below expected progress levels." />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleCapture}
              disabled={capturing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {capturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Capture New Snapshot
            </button>
            <p className="text-[10px] text-muted-foreground italic max-w-md">
              Capturing a snapshot stores the current strategic metrics so progress can be compared across reporting cycles.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Section B: Snapshot Timeline */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Snapshot Timeline</span>
            <InfoTip text="Each node represents a captured snapshot. Click to view that snapshot's metrics." />
          </div>

          {loadingSnapshots ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No snapshots captured yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Use "Capture New Snapshot" above to start tracking progress.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute top-5 left-4 right-4 h-0.5 bg-border" />
              <div className="flex justify-between relative z-10 overflow-x-auto pb-2 gap-2">
                {snapshots.map((snap: any, idx: number) => (
                  <button
                    key={snap.id}
                    onClick={() => setSelectedSnapshotIdx(idx === selectedSnapshotIdx ? null : idx)}
                    className={`flex flex-col items-center min-w-[100px] group ${selectedSnapshotIdx === idx ? '' : ''}`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 transition-all ${selectedSnapshotIdx === idx ? 'bg-primary border-primary scale-125' : 'bg-card border-primary/50 group-hover:border-primary'}`} />
                    <span className={`text-[10px] mt-2 font-medium transition-colors text-center ${selectedSnapshotIdx === idx ? 'text-primary' : 'text-muted-foreground'}`}>
                      {snap.reporting_cycle}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60 text-center">
                      {new Date(snap.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>

              {selectedSnapshotIdx !== null && snapshots[selectedSnapshotIdx] && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50"
                >
                  <p className="text-xs font-semibold text-foreground mb-2">{(snapshots[selectedSnapshotIdx] as any).reporting_cycle}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Completion:</span> <span className="font-bold">{Number((snapshots[selectedSnapshotIdx] as any).completion_pct)}%</span></div>
                    <div><span className="text-muted-foreground">RI:</span> <span className="font-bold" style={{ color: getRiskBandColor(Number((snapshots[selectedSnapshotIdx] as any).risk_index)) }}>RI {Number((snapshots[selectedSnapshotIdx] as any).risk_index).toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Budget Util:</span> <span className="font-bold">{Number((snapshots[selectedSnapshotIdx] as any).budget_utilization)}%</span></div>
                    <div><span className="text-muted-foreground">On-Track:</span> <span className="font-bold">{Number((snapshots[selectedSnapshotIdx] as any).on_track_pct)}%</span></div>
                    <div><span className="text-muted-foreground">Below Target:</span> <span className="font-bold">{Number((snapshots[selectedSnapshotIdx] as any).below_target_pct)}%</span></div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </section>

      {/* Section C: Performance Change Indicators */}
      {changes && (
        <section>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-5 sm:p-6">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 block">Performance Change vs Previous Snapshot</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ChangeCard label="Completion Change" delta={changes.completion} suffix="%" />
              <ChangeCard label="RI Change" delta={changes.riskIndex} suffix="" invert format={(v) => v.toFixed(2)} />
              <ChangeCard label="Budget Util Change" delta={changes.budgetUtil} suffix="%" />
            </div>
          </motion.div>
        </section>
      )}

      {/* Section D: Pillar Momentum */}
      {pillarMomentum && (
        <section>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-elevated p-5 sm:p-6">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 block">Pillar Momentum</span>
            <div className="space-y-2">
              {pillarMomentum.map(m => (
                <div key={m.pillar} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs font-semibold text-foreground w-40 truncate cursor-help">{PILLAR_SHORT[m.pillar]}</span>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">{PILLAR_FULL[m.pillar]}</p></TooltipContent>
                  </Tooltip>
                  <div className="flex-1 flex items-center gap-6">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Completion</span>
                      <DeltaArrow value={m.completionDelta} suffix="%" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">RI</span>
                      <DeltaArrow value={m.riskDelta} invert format={(v) => v.toFixed(2)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* Section E: Trend Visualization */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-elevated p-5 sm:p-6">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 block">
            Trend Visualization <InfoTip text="Shows evolution of key metrics across captured snapshots." />
          </span>

          {trendData.length <= 1 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Trajectory analysis will appear once additional reporting snapshots are captured.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <TrendChart title="Completion %" dataKey="completion" data={trendData} domain={[0, 100]} color="hsl(var(--primary))" suffix="%" />
              <TrendChart title="RI (Risk Index)" dataKey="riskIndex" data={trendData} domain={[0, 3]} color="#EF4444" suffix="" />
              <TrendChart title="Budget Utilization %" dataKey="budgetUtil" data={trendData} domain={[0, 100]} color="#3B82F6" suffix="%" />
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, tooltip }: {
  label: string; value: string; icon: React.ElementType; color?: string; tooltip: string;
}) {
  return (
    <div className="card-elevated p-3 sm:p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
      <div className="relative flex flex-col">
        <div className="min-h-[36px] sm:min-h-[40px] flex flex-col justify-start mb-1.5">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center leading-tight">
            {label.split(' — ')[0]}
            <InfoTip text={tooltip} />
          </p>
          {label.includes(' — ') && (
            <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 mt-0.5 font-medium">{label.split(' — ')[1]}</p>
          )}
        </div>
        <p className="text-base sm:text-lg font-display font-bold" style={{ color: color || 'hsl(var(--primary))' }}>{value}</p>
      </div>
    </div>
  );
}

function ChangeCard({ label, delta, suffix, invert, format }: {
  label: string; delta: number; suffix: string; invert?: boolean; format?: (v: number) => string;
}) {
  const isPositive = invert ? delta < 0 : delta > 0;
  const isNegative = invert ? delta > 0 : delta < 0;
  const color = isPositive ? '#16A34A' : isNegative ? '#EF4444' : 'hsl(var(--muted-foreground))';
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const display = format ? format(delta) : `${delta.toFixed(1)}`;

  return (
    <div className="card-elevated p-4 text-center">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-center justify-center gap-2" style={{ color }}>
        <Icon className="w-5 h-5" />
        <span className="text-xl font-display font-bold">{delta > 0 ? '+' : ''}{display}{suffix}</span>
      </div>
      <p className="text-[9px] text-muted-foreground mt-1">{isPositive ? 'Improvement' : isNegative ? 'Deterioration' : 'No change'}</p>
    </div>
  );
}

function DeltaArrow({ value, suffix = '', invert = false, format }: { value: number; suffix?: string; invert?: boolean; format?: (v: number) => string }) {
  const isPositive = invert ? value < 0 : value > 0;
  const isNegative = invert ? value > 0 : value < 0;
  const color = isPositive ? '#16A34A' : isNegative ? '#EF4444' : 'hsl(var(--muted-foreground))';
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const display = format ? format(value) : `${value.toFixed(1)}`;

  return (
    <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color }}>
      <Icon className="w-3 h-3" />
      {value > 0 ? '+' : ''}{display}{suffix}
    </span>
  );
}

function TrendChart({ title, dataKey, data, domain, color, suffix }: {
  title: string; dataKey: string; data: any[]; domain: [number, number]; color: string; suffix: string;
}) {
  return (
    <div>
      <span className="text-[11px] font-medium text-foreground">{title}</span>
      <div className="h-40 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="shortLabel" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis domain={domain} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
            <ReTooltip
              contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              formatter={(v: number) => [`${v}${suffix}`, title]}
              labelFormatter={(label: string, payload: any[]) => payload?.[0]?.payload?.label || label}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 4, fill: color }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
