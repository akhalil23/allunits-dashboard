/**
 * Tab 1 — Executive Snapshot (Redesigned)
 * Strategic command view: KPIs, highlights, execution pace, pillar map, bars, donut.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, TrendingUp, DollarSign,
  ShieldAlert, BarChart3, Lightbulb, Info, Clock,
} from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie, Cell as PieCell,
} from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTip } from '@/components/ui/info-tip';
import { RIMeter } from '@/components/ui/ri-meter';
import type { UniversityAggregation } from '@/lib/university-aggregation';
import { getRiskBandColor, RISK_BAND_COLORS } from '@/lib/university-aggregation';
import { RISK_SIGNAL_ORDER, RISK_SIGNAL_COLORS } from '@/lib/risk-signals';
import { formatRIPercent, getRiskDisplayInfo, formatRIWithBand, RI_TOOLTIP, RI_BAND_LEGEND } from '@/lib/risk-display';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateByPillar } from '@/lib/university-aggregation';
import { PILLAR_LABELS, getLivePillarBudget } from '@/lib/budget-data';
import { useBudgetData } from '@/hooks/use-budget-data';
import { PILLAR_SHORT, PILLAR_FULL, PILLAR_ABBREV } from '@/lib/pillar-labels';
import { getItemStatus, getItemCompletion } from '@/lib/intelligence';
import { isNotApplicableStatus } from '@/lib/types';
import type { PillarId, ActionItem } from '@/lib/types';

interface Props {
  aggregation: UniversityAggregation;
}


function PillarTooltipLabel({ pillar }: { pillar: PillarId }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{PILLAR_SHORT[pillar]}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs"><p>{PILLAR_FULL[pillar]}</p></TooltipContent>
    </Tooltip>
  );
}

export default function PresidentSnapshot({ aggregation }: Props) {
  const { viewType, term, academicYear } = useDashboard();
  const { data: unitResults } = useUniversityData();
  const { data: budgetResult } = useBudgetData();
  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  const budgetUtilization = useMemo(() => {
    if (!budgetResult?.pillars) return 0;
    const pillars: PillarId[] = ['I','II','III','IV','V'];
    let totalCommitted = 0, totalAllocation = 0;
    pillars.forEach(p => {
      const b = getLivePillarBudget(budgetResult.pillars, p);
      totalCommitted += b.committed;
      totalAllocation += b.allocation;
    });
    return totalAllocation > 0 ? parseFloat(((totalCommitted / totalAllocation) * 100).toFixed(1)) : 0;
  }, [budgetResult]);

  // Pillar data with budget
  const pillarData = useMemo(() => {
    return pillarAgg.map(p => {
      const b = getLivePillarBudget(budgetResult?.pillars, p.pillar);
      const util = b.allocation > 0 ? (b.committed / b.allocation) * 100 : 0;
      return {
        pillar: p.pillar,
        label: PILLAR_LABELS[p.pillar],
        shortLabel: PILLAR_SHORT[p.pillar],
        fullLabel: PILLAR_FULL[p.pillar],
        completion: p.completionPct,
        riskIndex: p.riskIndex,
        budgetUtil: parseFloat(util.toFixed(1)),
        applicable: p.applicableItems,
      };
    });
  }, [pillarAgg, budgetResult]);

  // ─── Execution Pace Data ───────────────────────────────────────────────
  const PILLAR_COLORS: Record<PillarId, string> = {
    I: '#2563EB',   // Blue
    II: '#059669',  // Emerald
    III: '#D97706', // Amber
    IV: '#DC2626',  // Red
    V: '#7C3AED',   // Violet
  };

  const executionPaceData = useMemo(() => {
    if (!unitResults) return [];
    const pillarIds: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

    // Expected progress = 100% at reporting deadline
    // Mid Year → Dec 31, End of Year → Jun 30
    // Since we're AT the reporting deadline, expected = 100%
    // But we compute based on where we are in the window:
    const [startYearStr] = academicYear.split('-');
    const startYear = parseInt(startYearStr);
    const windowStart = new Date(startYear, 6, 1); // July 1
    const windowEnd = term === 'mid'
      ? new Date(startYear, 11, 31) // Dec 31
      : new Date(startYear + 1, 5, 30); // Jun 30

    const now = new Date();
    const totalMs = windowEnd.getTime() - windowStart.getTime();
    const elapsedMs = Math.max(0, Math.min(now.getTime() - windowStart.getTime(), totalMs));
    const expectedProgress = Math.round((elapsedMs / totalMs) * 100);

    const reportingWindowLabel = term === 'mid'
      ? `Jul 1, ${startYear} – Dec 31, ${startYear}`
      : `Jul 1, ${startYear} – Jun 30, ${startYear + 1}`;

    return pillarIds.map((pillar, idx) => {
      // Collect all in-progress items for this pillar across all units
      const inProgressItems: { completion: number }[] = [];
      unitResults.forEach(ur => {
        if (!ur.result) return;
        ur.result.data.forEach(item => {
          if (item.pillar !== pillar) return;
          const status = getItemStatus(item, viewType, term, academicYear);
          if (status === 'In Progress') {
            inProgressItems.push({
              completion: getItemCompletion(item, viewType, term, academicYear),
            });
          }
        });
      });

      const hasItems = inProgressItems.length > 0;
      const actualProgress = hasItems
        ? Math.round(inProgressItems.reduce((s, i) => s + i.completion, 0) / inProgressItems.length)
        : -1; // sentinel for "no items"

      const gap = hasItems ? expectedProgress - actualProgress : 0;
      let pace: string;
      if (!hasItems) {
        pace = 'No Data';
      } else if (gap <= -10) {
        pace = 'Ahead of Schedule';
      } else if (gap <= 10) {
        pace = 'On Schedule';
      } else if (gap <= 25) {
        pace = 'Behind Schedule';
      } else {
        pace = 'Significantly Behind';
      }

      return {
        pillar,
        x: idx + 1,
        y: hasItems ? actualProgress : 50, // neutral position for no-data
        actualProgress: hasItems ? actualProgress : null,
        expectedProgress,
        gap: hasItems ? actualProgress - expectedProgress : null,
        pace,
        inProgressCount: inProgressItems.length,
        hasItems,
        color: PILLAR_COLORS[pillar],
        label: PILLAR_ABBREV[pillar],
        fullLabel: PILLAR_FULL[pillar],
        shortLabel: PILLAR_SHORT[pillar],
        reportingWindow: reportingWindowLabel,
      };
    });
  }, [unitResults, viewType, term, academicYear]);

  const allNoData = executionPaceData.every(d => !d.hasItems);
  const expectedProgressLine = executionPaceData[0]?.expectedProgress ?? 100;

  const highlights = useMemo(() => {
    const items: { title: string; insight: string; icon: React.ElementType; color: string }[] = [];
    
    const highCompPillars = pillarData.filter(p => p.completion >= 40);
    if (highCompPillars.length > 0) {
      items.push({
        title: 'Execution Progress',
        insight: `${highCompPillars.length} pillar${highCompPillars.length > 1 ? 's' : ''} show${highCompPillars.length === 1 ? 's' : ''} completion above 40%, indicating strong execution momentum.`,
        icon: TrendingUp,
        color: '#16A34A',
      });
    }

    const worstPillar = [...pillarData].sort((a, b) => b.riskIndex - a.riskIndex)[0];
    if (worstPillar) {
      const wpInfo = getRiskDisplayInfo(worstPillar.riskIndex);
      items.push({
        title: 'Risk Concentration',
        insight: `Risk concentration remains highest in ${worstPillar.shortLabel} with RI ${formatRIPercent(worstPillar.riskIndex)} (${wpInfo.band}).`,
        icon: ShieldAlert,
        color: wpInfo.color,
      });
    }

    items.push({
      title: 'Budget Position',
      insight: `Budget utilization reached ${budgetUtilization}% with ${pillarData.filter(p => p.budgetUtil > 80).length > 0 ? 'pressure in some pillars' : 'balanced allocation across pillars'}.`,
      icon: DollarSign,
      color: budgetUtilization >= 80 ? '#EF4444' : '#3B82F6',
    });

    const onTrackUnits = aggregation.unitAggregations.filter(u => u.riskIndex <= 0.75).length;
    if (onTrackUnits > 0) {
      items.push({
        title: 'Low-Risk Units',
        insight: `${onTrackUnits} unit${onTrackUnits > 1 ? 's' : ''} maintain${onTrackUnits === 1 ? 's' : ''} a Risk Index below 25%, reflecting strong delivery alignment.`,
        icon: CheckCircle2,
        color: '#16A34A',
      });
    }

    return items.slice(0, 5);
  }, [pillarData, budgetUtilization, aggregation]);

  const riInfo = getRiskDisplayInfo(aggregation.riskIndex);
  const donutData = aggregation.riskDistribution.filter(d => d.count > 0);

  return (
    <div className="space-y-8">
      {/* Pillar Legend */}
      <PillarLegend />

      {/* Section 1: Strategic KPI Banner */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <KPICard label="Completion — Actions Completed" value={`${aggregation.completionPct}%`} icon={CheckCircle2} color="hsl(var(--primary))" />
          <KPICard label="On-Track — As Planned" value={`${aggregation.onTrackPct}%`} icon={CheckCircle2} color="#16A34A" />
          <KPICard label="Below Target — Underperforming" value={`${aggregation.belowTargetPct}%`} icon={AlertTriangle} color="#B23A48" />
          <KPICard label="RI (Risk Index) — Structural Risk" value={formatRIPercent(aggregation.riskIndex)} icon={ShieldAlert} color={riInfo.color} subtitle={riInfo.band} riValue={aggregation.riskIndex} />
          <KPICard label="Budget Utilization — Used" value={`${budgetUtilization}%`} icon={DollarSign} color={budgetUtilization >= 80 ? '#EF4444' : budgetUtilization >= 60 ? '#F59E0B' : '#16A34A'} />
        </div>
        <p className="text-xs text-muted-foreground italic mt-2.5 px-1">Budget context: Based on 2-Year Strategic Plan (2025–2027) planned allocations.</p>
      </section>

      {/* Section 2: Executive Highlights */}
      <section>
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" /> Executive highlights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {highlights.map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-elevated p-4 sm:p-5 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full rounded-r" style={{ backgroundColor: h.color }} />
              <div className="flex items-start gap-3 pl-2">
                <div className="p-2 rounded-lg bg-muted/50 mt-0.5">
                  <h.icon className="w-4 h-4" style={{ color: h.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{h.title}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">{h.insight}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Section 3: Execution Pace vs Time Progress */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Execution Pace vs Time Progress</span>
            <InfoTip text="Evaluates whether in-progress work within each pillar is advancing fast enough relative to the reporting period. Bubbles show actual average completion of in-progress items. The reference line marks the expected progress at the reporting deadline." />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">In-progress items only — actual completion vs expected progress by strategic pillar.</p>

          {allNoData ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No active in-progress items for the selected period.</p>
            </div>
          ) : (
            <>
              <div className="h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 40, bottom: 30, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      domain={[0.5, 5.5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tickFormatter={(v: number) => {
                        const labels: Record<number, string> = { 1: 'PI', 2: 'PII', 3: 'PIII', 4: 'PIV', 5: 'PV' };
                        return labels[v] || '';
                      }}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                      label={{ value: 'Strategic Pillar', position: 'insideBottom', offset: -18, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      label={{ value: 'Actual Progress %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
                    />
                    <ReferenceLine
                      y={expectedProgressLine}
                      stroke="#DC2626"
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      label={{
                        value: `Expected (${expectedProgressLine}%)`,
                        position: 'right',
                        style: { fontSize: 10, fill: '#DC2626', fontWeight: 700 },
                      }}
                    />
                    <ReTooltip
                      content={({ payload }) => {
                        if (!payload?.[0]) return null;
                        const d = payload[0].payload;
                        if (!d.hasItems) {
                          return (
                            <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                              <p className="font-semibold text-foreground">{d.fullLabel}</p>
                              <p className="text-muted-foreground italic">No in-progress items in selected period</p>
                            </div>
                          );
                        }
                        const gapSign = d.gap >= 0 ? '+' : '';
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                            <p className="font-semibold text-foreground">{d.fullLabel}</p>
                            <p className="text-muted-foreground">Actual Progress: <span className="text-foreground font-medium">{d.actualProgress}%</span></p>
                            <p className="text-muted-foreground">Expected Progress: <span className="text-foreground font-medium">{d.expectedProgress}%</span></p>
                            <p className="text-muted-foreground">Schedule Gap: <span className="font-medium" style={{ color: d.gap >= 0 ? '#16A34A' : '#EF4444' }}>{gapSign}{d.gap}%</span></p>
                            <p className="text-muted-foreground">Execution Pace: <span className="text-foreground font-bold">{d.pace}</span></p>
                            <p className="text-muted-foreground">In-Progress Items: <span className="text-foreground font-medium">{d.inProgressCount}</span></p>
                            <p className="text-muted-foreground/70 text-[10px]">{d.reportingWindow}</p>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={executionPaceData}>
                      {executionPaceData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={d.hasItems ? d.color : '#6B7280'}
                          fillOpacity={d.hasItems ? 0.85 : 0.3}
                          stroke={d.hasItems ? d.color : '#6B7280'}
                          strokeWidth={d.hasItems ? 2 : 1}
                          r={d.hasItems ? Math.max(12, Math.min(22, 8 + d.inProgressCount / 5)) : 10}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Legend: Pillar Colors + Pace Categories */}
              <div className="mt-5 space-y-3">
                {/* Pillar identity legend */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Pillars:</span>
                  {executionPaceData.map(d => (
                    <div key={d.pillar} className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-muted-foreground">{d.label}</span>
                    </div>
                  ))}
                </div>
                {/* Execution Pace categories */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { label: 'Ahead of Schedule', desc: 'Gap ≤ −10%', color: '#059669', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.25)' },
                    { label: 'On Schedule', desc: '−10% < Gap ≤ 10%', color: '#2563EB', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.25)' },
                    { label: 'Behind Schedule', desc: '10% < Gap ≤ 25%', color: '#D97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.25)' },
                    { label: 'Significantly Behind', desc: 'Gap > 25%', color: '#DC2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.25)' },
                  ].map(c => (
                    <div key={c.label} className="text-center p-3 rounded-lg" style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderStyle: 'solid' }}>
                      <p className="text-xs font-semibold" style={{ color: c.color }}>{c.label}</p>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </section>


      {/* Section 4: Pillar Performance Comparison Bars */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Pillar Performance Comparison</span>
          </div>
          <div className="space-y-5">
            {pillarData.map((p, idx) => (
              <motion.div
                key={p.pillar}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + idx * 0.07, duration: 0.4, ease: 'easeOut' }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm font-semibold text-foreground cursor-help">{p.shortLabel}</span>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">{p.fullLabel}</p></TooltipContent>
                  </Tooltip>
                  <span className="text-xs text-muted-foreground">{p.applicable} applicable items</span>
                </div>
                <div className="space-y-2">
                  <BarRow label="Completion" value={p.completion} max={100} suffix="%" color="hsl(var(--primary))" delay={0.3 + idx * 0.07} />
                  <BarRow label="RI" value={p.riskIndex} max={3} suffix="" color={getRiskDisplayInfo(p.riskIndex).color} format={(v) => formatRIPercent(v)} delay={0.35 + idx * 0.07} />
                  <BarRow label="Budget Util" value={p.budgetUtil} max={100} suffix="%" color={p.budgetUtil >= 80 ? '#EF4444' : '#3B82F6'} delay={0.4 + idx * 0.07} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Section 5: Risk Signal Distribution */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Risk Signal Distribution</span>
            <InfoTip text="Distribution of all applicable items by risk signal category." />
          </div>
           <p className="text-xs sm:text-sm text-muted-foreground mb-4">
             <strong>No Risk:</strong> Actions showing no risk indicators. <strong>Emerging:</strong> Early warning signals. <strong>Critical:</strong> Severe risk requiring intervention. <strong>Realized:</strong> Risk event has already occurred.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-4">
            <div className="w-36 h-36 sm:w-44 sm:h-44 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donutData} innerRadius="60%" outerRadius="85%" dataKey="count" nameKey="signal" startAngle={90} endAngle={-270} strokeWidth={0}>
                    {donutData.map((d, i) => (<Cell key={i} fill={d.color} />))}
                  </Pie>
                  <ReTooltip
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const d = payload[0].payload;
                      const label = d.signal.split(' (')[0];
                      return (
                        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs space-y-0.5">
                          <p className="font-semibold text-foreground">{label}</p>
                          <p className="text-muted-foreground">{d.count} items ({d.percent}%)</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              {RISK_SIGNAL_ORDER.map(signal => {
                const item = aggregation.riskDistribution.find(d => d.signal === signal);
                return (
                  <div key={signal} className="flex items-center gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: RISK_SIGNAL_COLORS[signal] }} />
                    <span className="text-sm text-foreground flex-1 truncate">{signal.split(' (')[0]}</span>
                    <span className="text-sm font-bold text-foreground">{item?.count || 0}</span>
                    <span className="text-sm text-muted-foreground w-14 text-right">{item?.percent || 0}%</span>
                  </div>
                );
              })}
              <div className="pt-3 mt-3 border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Applicable</span>
                <span className="text-sm font-bold text-foreground">{aggregation.applicableItems}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

/** Pillar Legend component accessible from Executive Snapshot */
function PillarLegend() {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V'] as PillarId[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 sm:p-6"
    >
      {/* Decorative corner pattern */}
      <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {[20, 40, 60, 80].map(r => (
            <circle key={r} cx="100" cy="0" r={r} fill="none" stroke="currentColor" strokeWidth="1" className="text-foreground" />
          ))}
        </svg>
      </div>

      <div className="relative">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-1.5 rounded-lg bg-muted">
            <Info className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-foreground tracking-wide">Strategic Plan IV — Pillar Reference</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">5 strategic pillars guiding university-wide execution</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-0 sm:gap-0">
          {romanNumerals.map((p, i) => (
            <Tooltip key={p}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="group flex-1 cursor-help relative"
                  >
                    {/* Horizontal layout: connected steps */}
                    <div className="flex sm:flex-col items-center sm:items-stretch gap-3 sm:gap-0 px-3 py-3 sm:py-0">
                      {/* Number badge */}
                      <div className="flex flex-col items-center sm:mb-2.5">
                        <div className="w-9 h-9 rounded-full border-2 border-border bg-muted/50 flex items-center justify-center group-hover:bg-foreground group-hover:border-foreground transition-colors duration-200">
                          <span className="text-xs font-bold text-foreground group-hover:text-background transition-colors duration-200">
                            {p}
                          </span>
                        </div>
                        {/* Connector line (hidden on last + mobile) */}
                        {i < 4 && <div className="hidden sm:block w-px h-0 sm:h-0" />}
                      </div>
                      {/* Text */}
                      <div className="flex-1 sm:text-center">
                        <span className="text-[11px] font-semibold text-foreground block leading-tight">
                          {PILLAR_SHORT[p]}
                        </span>
                        <span className="text-[10px] sm:text-[10px] text-muted-foreground leading-snug line-clamp-2 mt-0.5 block">
                          {PILLAR_FULL[p].replace(`Pillar ${p} — `, '')}
                        </span>
                      </div>
                    </div>
                    {/* Horizontal connector between steps (desktop only) */}
                    {i < 4 && (
                      <div className="hidden sm:block absolute top-[18px] -right-[1px] w-[2px] h-[2px]">
                        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 w-6 h-px bg-border" />
                      </div>
                    )}
                    {/* Divider for mobile */}
                    {i < 4 && <div className="sm:hidden border-b border-border/40 mx-3" />}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p>{PILLAR_FULL[p]}</p>
                </TooltipContent>
              </Tooltip>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function KPICard({ label, value, icon: Icon, color, subtitle, riValue }: {
  label: string; value: string; icon: React.ElementType; color: string; subtitle?: string; riValue?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      
      {/* Subtle radial glow */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.12]"
        style={{ backgroundColor: color }}
      />
      
      <div className="relative p-5 sm:p-6 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 flex-1">
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="h-[32px] sm:h-[36px] flex flex-col justify-start">
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                {label.split(' — ')[0]}
              </p>
              {label.includes(' — ') && (
                <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 mt-0.5 font-medium">
                  {label.split(' — ')[1]}
                </p>
              )}
            </div>
            <p className="text-xl sm:text-2xl font-display font-extrabold mt-2 tracking-tight" style={{ color }}>
              {value}
            </p>
            {subtitle && (
              <p className="text-[10px] sm:text-xs font-semibold mt-0.5" style={{ color }}>{subtitle}</p>
            )}
            {riValue !== undefined && (
              <div className="mt-2">
                <RIMeter ri={riValue} showLabel={false} compact />
              </div>
            )}
          </div>
          <div
            className="p-2.5 rounded-xl shrink-0 transition-colors duration-200"
            style={{ backgroundColor: `${color}14` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BarRow({ label, value, max, suffix, color, format, delay = 0 }: {
  label: string; value: number; max: number; suffix: string; color: string; format?: (v: number) => string; delay?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const display = format ? format(value) : `${value}${suffix}`;
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay, duration: 0.6, ease: 'easeOut' }}
          style={{ backgroundColor: color }}
        />
      </div>
      <motion.span
        className="text-xs font-bold w-14 text-right"
        style={{ color }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.3 }}
      >
        {display}
      </motion.span>
    </div>
  );
}
