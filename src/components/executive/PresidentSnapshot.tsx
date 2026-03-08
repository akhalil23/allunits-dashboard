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
  ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie, Cell as PieCell,
  BarChart, Bar, Legend,
} from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3 h-3 text-muted-foreground/60 cursor-help inline ml-1" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs"><p>{text}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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
      </section>

      {/* Section 2: Executive Highlights */}
      <section>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5" /> Executive Highlights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {highlights.map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-elevated p-4 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full rounded-r" style={{ backgroundColor: h.color }} />
              <div className="flex items-start gap-3 pl-2">
                <div className="p-1.5 rounded-lg bg-muted/50 mt-0.5">
                  <h.icon className="w-3.5 h-3.5" style={{ color: h.color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{h.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{h.insight}</p>
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
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Strategic Performance Matrix</span>
            <InfoTip text="Bubble chart combining delivery (Y), budget (X), and risk (color). Bubble size reflects the number of applicable initiatives." />
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">Budget Utilization vs Completion — colored by Risk Index, sized by applicable items.</p>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            {[
              { label: 'High Delivery / High Budget', desc: 'Strong Execution', pos: 'top-right' },
              { label: 'High Delivery / Low Budget', desc: 'Efficient Execution', pos: 'top-left' },
              { label: 'Low Delivery / High Budget', desc: 'Execution Risk', pos: 'bottom-right' },
              { label: 'Low Delivery / Low Budget', desc: 'Underperforming', pos: 'bottom-left' },
            ].map(q => (
              <div key={q.pos} className="text-center p-2 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-[10px] font-semibold text-foreground">{q.desc}</p>
                <p className="text-[9px] text-muted-foreground">{q.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Section 4: Strategic Pillar Map (Risk vs Budget) */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk vs Budget Strategic Quadrant</span>
            <InfoTip text="Maps each pillar by budget utilization (X) and risk exposure (Y). Quadrants indicate strategic positioning." />
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">Budget Utilization vs RI (Risk Index) — identifying financial pressure zones.</p>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 30, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Budget Utilization %', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <YAxis type="number" dataKey="y" domain={[0, 3]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'RI (Risk Index)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <ReferenceLine x={60} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <ReferenceLine y={1.5} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <ReTooltip
                  content={({ payload }) => {
                    if (!payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                        <p className="font-semibold text-foreground">{d.fullLabel}</p>
                        <p className="text-muted-foreground">Budget Utilization: <span className="text-foreground font-medium">{d.x}%</span></p>
                        <p className="text-muted-foreground">RI: <span className="font-medium" style={{ color: getRiskBandColor(d.y) }}>{d.y.toFixed(2)}</span></p>
                      </div>
                    );
                  }}
                />
                <Scatter data={pillarData.map(p => ({ x: p.budgetUtil, y: p.riskIndex, label: p.label, fullLabel: p.fullLabel }))}>
                  {pillarData.map((p, i) => {
                    const q = p.budgetUtil >= 60 && p.riskIndex >= 1.5 ? '#EF4444' : p.budgetUtil < 60 && p.riskIndex >= 1.5 ? '#F97316' : p.budgetUtil >= 60 && p.riskIndex < 1.5 ? '#16A34A' : '#3B82F6';
                    return <Cell key={i} fill={q} r={9} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            {[
              { label: 'Low Risk / High Budget', desc: 'Efficient Deployment', color: '#16A34A' },
              { label: 'High Risk / Low Budget', desc: 'Underfunded Risk', color: '#F97316' },
              { label: 'High Risk / High Budget', desc: 'Financial Pressure', color: '#EF4444' },
              { label: 'Low Risk / Low Budget', desc: 'Stable', color: '#3B82F6' },
            ].map(q => (
              <div key={q.desc} className="text-center p-2 rounded-lg border border-border/50" style={{ backgroundColor: `${q.color}08` }}>
                <p className="text-[10px] font-semibold" style={{ color: q.color }}>{q.desc}</p>
                <p className="text-[9px] text-muted-foreground">{q.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Section 5: Pillar Performance Comparison Bars */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pillar Performance Comparison</span>
          </div>
          <div className="space-y-4">
            {pillarData.map(p => (
              <div key={p.pillar} className="space-y-2">
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-semibold text-foreground cursor-help">{p.shortLabel}</span>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">{p.fullLabel}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-[10px] text-muted-foreground">{p.applicable} applicable items</span>
                </div>
                <div className="space-y-1.5">
                  <BarRow label="Completion" value={p.completion} max={100} suffix="%" color="hsl(var(--primary))" />
                  <BarRow label="RI" value={p.riskIndex} max={3} suffix="" color={getRiskBandColor(p.riskIndex)} format={(v) => v.toFixed(2)} />
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
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Signal Distribution</span>
            <InfoTip text="Distribution of all applicable items by risk signal category." />
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            <strong>No Risk:</strong> Actions showing no risk indicators. <strong>Emerging:</strong> Early warning signals. <strong>Critical:</strong> Severe risk requiring intervention. <strong>Realized:</strong> Risk event has already occurred.
          </p>
          <div className="flex items-center gap-6 mt-4">
            <div className="w-36 h-36 sm:w-44 sm:h-44 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donutData} innerRadius="60%" outerRadius="85%" dataKey="count" startAngle={90} endAngle={-270} strokeWidth={0}>
                    {donutData.map((d, i) => (<Cell key={i} fill={d.color} />))}
                  </Pie>
                  <ReTooltip formatter={(value: number, name: string) => [`${value} items`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5 min-w-0">
              {RISK_SIGNAL_ORDER.map(signal => {
                const item = aggregation.riskDistribution.find(d => d.signal === signal);
                return (
                  <div key={signal} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: RISK_SIGNAL_COLORS[signal] }} />
                    <span className="text-xs text-foreground flex-1 truncate">{signal.split(' (')[0]}</span>
                    <span className="text-xs font-bold text-foreground">{item?.count || 0}</span>
                    <span className="text-xs text-muted-foreground w-12 text-right">{item?.percent || 0}%</span>
                  </div>
                );
              })}
              <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total Applicable</span>
                <span className="text-xs font-bold text-foreground">{aggregation.applicableItems}</span>
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
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Strategic Plan IV — Pillar Reference</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {(['I','II','III','IV','V'] as PillarId[]).map(p => (
          <div key={p} className="flex items-start gap-2 text-[11px]">
            <span className="font-bold text-primary shrink-0">{PILLAR_LABELS[p]}</span>
            <span className="text-muted-foreground">{PILLAR_FULL[p].replace(`Pillar ${p} — `, '')}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function KPICard({ label, value, icon: Icon, color, tooltip }: {
  label: string; value: string; icon: React.ElementType; color: string; tooltip: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-4 sm:p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center">
            {label}
            <InfoTip text={tooltip} />
          </p>
          <p className="text-xl sm:text-2xl font-display font-bold mt-1" style={{ color }}>{value}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50">
          <Icon className="w-4 h-4 text-muted-foreground" />
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
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-bold w-10 text-right" style={{ color }}>{display}</span>
    </div>
  );
}
