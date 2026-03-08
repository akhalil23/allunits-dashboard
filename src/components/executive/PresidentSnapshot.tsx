/**
 * Tab 1 — Executive Snapshot (Redesigned)
 * Strategic command view: KPIs, highlights, bubble quadrant, pillar map, bars, donut.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, DollarSign,
  ShieldAlert, BarChart3, Lightbulb, Info,
} from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, ReferenceLine, ReferenceArea, PieChart, Pie, Cell as PieCell,
} from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTip } from '@/components/ui/info-tip';
import type { UniversityAggregation } from '@/lib/university-aggregation';
import { getRiskBandColor, RISK_BAND_COLORS } from '@/lib/university-aggregation';
import { RISK_SIGNAL_ORDER, RISK_SIGNAL_COLORS } from '@/lib/risk-signals';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateByPillar } from '@/lib/university-aggregation';
import { PILLAR_LABELS, MOCK_BUDGET, getPillarBudget } from '@/lib/budget-data';
import { PILLAR_SHORT, PILLAR_FULL } from '@/lib/pillar-labels';
import type { PillarId } from '@/lib/types';

interface Props {
  aggregation: UniversityAggregation;
}


function PillarTooltipLabel({ pillar }: { pillar: PillarId }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{PILLAR_SHORT[pillar]}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs"><p>{PILLAR_FULL[pillar]}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function PresidentSnapshot({ aggregation }: Props) {
  const { viewType, term, academicYear } = useDashboard();
  const { data: unitResults } = useUniversityData();
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

  // Pillar data with budget
  const pillarData = useMemo(() => {
    return pillarAgg.map(p => {
      const b = getPillarBudget(p.pillar, 'total');
      const util = (b.committed + b.available) > 0 ? (b.committed / (b.committed + b.available)) * 100 : 0;
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
  }, [pillarAgg]);

  // Executive highlights
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
      items.push({
        title: 'Risk Concentration',
        insight: `Risk concentration remains highest in ${worstPillar.shortLabel} with RI ${worstPillar.riskIndex.toFixed(2)}.`,
        icon: ShieldAlert,
        color: getRiskBandColor(worstPillar.riskIndex),
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
        insight: `${onTrackUnits} unit${onTrackUnits > 1 ? 's' : ''} maintain${onTrackUnits === 1 ? 's' : ''} a Risk Index below 0.75, reflecting strong delivery alignment.`,
        icon: CheckCircle2,
        color: '#16A34A',
      });
    }

    return items.slice(0, 5);
  }, [pillarData, budgetUtilization, aggregation]);

  const riskColor = getRiskBandColor(aggregation.riskIndex);
  const donutData = aggregation.riskDistribution.filter(d => d.count > 0);

  return (
    <div className="space-y-8">
      {/* Pillar Legend */}
      <PillarLegend />

      {/* Section 1: Strategic KPI Banner */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <KPICard label="Completion — Actions Completed" value={`${aggregation.completionPct}%`} icon={CheckCircle2} color="hsl(var(--primary))" tooltip="Percentage of applicable strategic actions marked as completed relative to the total strategic actions for the selected pillar or unit." />
          <KPICard label="On-Track — As Planned" value={`${aggregation.onTrackPct}%`} icon={CheckCircle2} color="#16A34A" tooltip="Percentage of strategic actions currently progressing according to the planned schedule." />
          <KPICard label="Below Target — Underperforming" value={`${aggregation.belowTargetPct}%`} icon={AlertTriangle} color="#B23A48" tooltip="Percentage of actions performing below expected progress levels." />
          <KPICard label="RI (Risk Index)" value={`RI ${aggregation.riskIndex.toFixed(2)}`} icon={ShieldAlert} color={riskColor} tooltip="Risk Index (RI) represents the aggregated severity of risk signals across applicable strategic actions. Lower values indicate lower structural risk. Scale: 0 (no risk) to 3 (maximum risk)." />
          <KPICard label="Budget Utilization — Used" value={`${budgetUtilization}%`} icon={DollarSign} color={budgetUtilization >= 80 ? '#EF4444' : budgetUtilization >= 60 ? '#F59E0B' : '#16A34A'} tooltip="Percentage of the allocated budget that has already been utilized during the selected reporting cycle." />
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

      {/* Section 3: Strategic Performance Matrix (Bubble Quadrant) */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Strategic Performance Matrix</span>
            <InfoTip text="Bubble chart combining delivery (Y), budget (X), and risk (color). Bubble size reflects the number of applicable initiatives." />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">Budget Utilization vs Completion — colored by Risk Index, sized by applicable items.</p>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                {/* Quadrant zone shading */}
                <ReferenceArea x1={50} x2={100} y1={50} y2={100} fill="rgba(22,163,74,0.06)" fillOpacity={1} />
                <ReferenceArea x1={0} x2={50} y1={50} y2={100} fill="rgba(59,130,246,0.06)" fillOpacity={1} />
                <ReferenceArea x1={50} x2={100} y1={0} y2={50} fill="rgba(239,68,68,0.06)" fillOpacity={1} />
                <ReferenceArea x1={0} x2={50} y1={0} y2={50} fill="rgba(245,158,11,0.06)" fillOpacity={1} />
                <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Budget Utilization %', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <YAxis type="number" dataKey="y" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Completion %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <ReferenceLine x={50} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <ReTooltip
                  content={({ payload }) => {
                    if (!payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                        <p className="font-semibold text-foreground">{d.fullLabel}</p>
                        <p className="text-muted-foreground">Completion: <span className="text-foreground font-medium">{d.y}%</span></p>
                        <p className="text-muted-foreground">RI: <span className="font-medium" style={{ color: getRiskBandColor(d.ri) }}>{d.ri.toFixed(2)}</span></p>
                        <p className="text-muted-foreground">Budget Utilization: <span className="text-foreground font-medium">{d.x}%</span></p>
                        <p className="text-muted-foreground">Applicable Items: <span className="text-foreground font-medium">{d.applicable}</span></p>
                      </div>
                    );
                  }}
                />
                <Scatter data={pillarData.map(p => ({ x: p.budgetUtil, y: p.completion, ri: p.riskIndex, label: p.label, shortLabel: p.shortLabel, fullLabel: p.fullLabel, applicable: p.applicable, z: Math.max(200, p.applicable * 15) }))}>
                  {pillarData.map((p, i) => (
                    <Cell key={i} fill={getRiskBandColor(p.riskIndex)} fillOpacity={0.7} r={Math.max(8, Math.min(20, p.applicable / 3))} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            {[
              { label: 'High Delivery / High Budget', desc: 'Strong Execution', pos: 'top-right', color: '#16A34A', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.25)' },
              { label: 'High Delivery / Low Budget', desc: 'Efficient Execution', pos: 'top-left', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
              { label: 'Low Delivery / High Budget', desc: 'Execution Risk', pos: 'bottom-right', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
              { label: 'Low Delivery / Low Budget', desc: 'Underperforming', pos: 'bottom-left', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
            ].map(q => (
              <div key={q.pos} className="text-center p-3 rounded-lg" style={{ backgroundColor: q.bg, borderWidth: 1, borderColor: q.border, borderStyle: 'solid' }}>
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: q.color }} />
                  <p className="text-xs font-semibold" style={{ color: q.color }}>{q.desc}</p>
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground">{q.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>


      {/* Section 5: Pillar Performance Comparison Bars */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Pillar Performance Comparison</span>
          </div>
          <div className="space-y-5">
            {pillarData.map(p => (
              <div key={p.pillar} className="space-y-2">
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm font-semibold text-foreground cursor-help">{p.shortLabel}</span>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">{p.fullLabel}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-xs text-muted-foreground">{p.applicable} applicable items</span>
                </div>
                <div className="space-y-2">
                  <BarRow label="Completion" value={p.completion} max={100} suffix="%" color="hsl(var(--primary))" />
                  <BarRow label="RI" value={p.riskIndex} max={3} suffix="" color={getRiskBandColor(p.riskIndex)} format={(v) => `RI ${v.toFixed(2)}`} />
                  <BarRow label="Budget Util" value={p.budgetUtil} max={100} suffix="%" color={p.budgetUtil >= 80 ? '#EF4444' : '#3B82F6'} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Section 6: Risk Signal Distribution */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Risk Signal Distribution</span>
            <InfoTip text="Distribution of all applicable items by risk signal category." />
          </div>
           <p className="text-xs sm:text-sm text-muted-foreground mb-4">
             <strong>No Risk:</strong> Actions showing no risk indicators. <strong>Emerging:</strong> Early warning signals. <strong>Critical:</strong> Severe risk requiring intervention. <strong>Realized:</strong> Risk event has already occurred.
          </p>
          <div className="flex items-center gap-6 mt-4">
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
  const pillarColors: Record<string, string> = {
    I: '#0E7490',
    II: '#6D28D9',
    III: '#DB2777',
    IV: '#0369A1',
    V: '#7C3AED',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.02] p-5 sm:p-6"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/[0.03] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-foreground tracking-wide">Strategic Plan IV — Pillar Reference</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">5 strategic pillars guiding university-wide execution</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {(['I','II','III','IV','V'] as PillarId[]).map((p, i) => (
            <TooltipProvider key={p}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative rounded-lg border border-border/60 bg-card/80 backdrop-blur-sm px-3 py-2.5 cursor-help hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-lg" style={{ backgroundColor: pillarColors[p] }} />
                    <span className="text-xs font-bold block mb-0.5" style={{ color: pillarColors[p] }}>
                      {PILLAR_LABELS[p]}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {PILLAR_FULL[p].replace(`Pillar ${p} — `, '')}
                    </span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p>{PILLAR_FULL[p]}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function KPICard({ label, value, icon: Icon, color, tooltip }: {
  label: string; value: string; icon: React.ElementType; color: string; tooltip: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-5 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center">
            {label}
            <InfoTip text={tooltip} />
          </p>
          <p className="text-2xl sm:text-3xl font-display font-bold mt-1.5" style={{ color }}>{value}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-muted/50">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
}

function BarRow({ label, value, max, suffix, color, format }: {
  label: string; value: number; max: number; suffix: string; color: string; format?: (v: number) => string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const display = format ? format(value) : `${value}${suffix}`;
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-14 text-right" style={{ color }}>{display}</span>
    </div>
  );
}
