/**
 * Tab 2 — Strategic Risk & Priority (Merged)
 * Combines previous Risk & Exceptions + Priority & Impact.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { ShieldAlert, AlertTriangle, Target, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTip } from '@/components/ui/info-tip';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import {
  aggregateByPillar, aggregateUnitByPillar, getExceptionFlags, getRiskBandColor, RISK_BAND_COLORS,
  type UniversityAggregation, type UnitPillarCell, type ExceptionFlag, type PillarAggregation, type UnitAggregation,
} from '@/lib/university-aggregation';
import { RISK_SIGNAL_COLORS, RISK_SIGNAL_ORDER } from '@/lib/risk-signals';
import { getUnitDisplayLabel, getUnitDisplayName } from '@/lib/unit-config';
import { PILLAR_LABELS } from '@/lib/budget-data';
import { PILLAR_SHORT, PILLAR_FULL } from '@/lib/pillar-labels';
import { RISK_SIGNAL_TOOLTIPS } from '@/lib/metric-definitions';
import type { PillarId } from '@/lib/types';

interface Props { aggregation: UniversityAggregation; }


export default function StrategicRiskPriority({ aggregation }: Props) {
  const { viewType, academicYear, term } = useDashboard();
  const { data: unitResults } = useUniversityData();

  const flags = useMemo(() => unitResults ? getExceptionFlags(unitResults, viewType, term, academicYear, 30) : [], [unitResults, viewType, term, academicYear]);
  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);
  const heatCells = useMemo(() => unitResults ? aggregateUnitByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);
  const unitsByRisk = useMemo(() => [...aggregation.unitAggregations].filter(u => u.applicableItems > 0).sort((a, b) => b.riskIndex - a.riskIndex), [aggregation]);
  const unitsByCompletion = useMemo(() => [...aggregation.unitAggregations].filter(u => u.applicableItems > 0).sort((a, b) => a.completionPct - b.completionPct), [aggregation]);

  return (
    <div className="space-y-8">
      {/* Section 1: Strategic Risk Overview */}
      <section>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5" /> Strategic Risk Overview
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Risk Index by Pillar */}
          <div className="card-elevated p-4 sm:p-5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              RI by Pillar <InfoTip text="Risk Index (RI) represents the weighted severity of risk signals across applicable strategic items. Lower values indicate lower structural risk." />
            </span>
            <div className="space-y-2.5 mt-4">
              {pillarAgg.map(p => {
                const color = getRiskBandColor(p.riskIndex);
                const pct = Math.min(100, (p.riskIndex / 3) * 100);
                return (
                  <div key={p.pillar} className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs font-semibold text-foreground w-14 cursor-help">{PILLAR_LABELS[p.pillar]}</span>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">{PILLAR_FULL[p.pillar]}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-xs font-bold w-10 text-right" style={{ color }}>RI {p.riskIndex.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Distribution Stacked */}
          <div className="card-elevated p-4 sm:p-5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Risk Signal Distribution by Pillar <InfoTip text="Distribution of risk signals across pillars. No Risk: actions with no risk indicators. Emerging: early warning signals. Critical: severe risk requiring intervention. Realized: risk event already occurred." />
            </span>
            <div className="h-48 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pillarAgg.map(p => {
                  const total = p.riskCounts.noRisk + p.riskCounts.emerging + p.riskCounts.critical + p.riskCounts.realized;
                  return { name: PILLAR_LABELS[p.pillar], noRisk: p.riskCounts.noRisk, emerging: p.riskCounts.emerging, critical: p.riskCounts.critical, realized: p.riskCounts.realized, total };
                })} layout="vertical" barSize={18}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={40} tick={{ fontSize: 10 }} />
                  <ReTooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(v: number, n: string, props: any) => {
                      const labelMap: Record<string,string> = { noRisk:'No Risk', emerging:'Emerging', critical:'Critical', realized:'Realized' };
                      const total = props.payload?.total || 1;
                      const pct = ((v / total) * 100).toFixed(1);
                      return [`${v} items (${pct}%)`, labelMap[n] || n];
                    }}
                    labelFormatter={(label: string) => `${label} — Risk Signals`}
                  />
                  <Bar dataKey="noRisk" stackId="a" fill={RISK_SIGNAL_COLORS['No Risk (On Track)']} />
                  <Bar dataKey="emerging" stackId="a" fill={RISK_SIGNAL_COLORS['Emerging Risk (Needs Attention)']} />
                  <Bar dataKey="critical" stackId="a" fill={RISK_SIGNAL_COLORS['Critical Risk (Needs Close Attention)']} />
                  <Bar dataKey="realized" stackId="a" fill={RISK_SIGNAL_COLORS['Realized Risk (Needs Mitigation Strategy)']} radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend with totals */}
            <RiskSignalLegend pillarAgg={pillarAgg} />
          </div>

          {/* Completion Status Distribution Donut */}
          <div className="card-elevated p-4 sm:p-5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completion Status <InfoTip text="Distribution of strategic actions by their completion status across all units." /></span>
            <CompletionDonut aggregation={aggregation} />
          </div>
        </div>
      </section>

      {/* Section 2: Strategic Priority Signals */}
      <section>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Target className="w-3.5 h-3.5" /> Strategic Priority Signals
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankingBars title="Units Ranked by RI (Risk Index)" subtitle="Highest risk first" units={unitsByRisk} metricKey="riskIndex" />
          <RankingBars title="Units Ranked by Completion" subtitle="Lowest completion first" units={unitsByCompletion} metricKey="completionPct" />
        </div>
      </section>

      {/* Section 3: Unit × Pillar Risk Heatmap */}
      <section>
        <HeatMap
          loadedUnits={aggregation.unitAggregations.sort((a, b) => b.riskIndex - a.riskIndex).map(u => ({ unitId: u.unitId, unitName: u.unitName }))}
          heatCells={heatCells}
        />
      </section>

      {/* Section 4: Strategic Exceptions Table */}
      <section>
        <ExceptionsTable flags={flags} />
      </section>
    </div>
  );
}

function RiskSignalLegend({ pillarAgg }: { pillarAgg: PillarAggregation[] }) {
  const totals = pillarAgg.reduce((acc, p) => ({
    noRisk: acc.noRisk + p.riskCounts.noRisk,
    emerging: acc.emerging + p.riskCounts.emerging,
    critical: acc.critical + p.riskCounts.critical,
    realized: acc.realized + p.riskCounts.realized,
  }), { noRisk: 0, emerging: 0, critical: 0, realized: 0 });
  const grand = totals.noRisk + totals.emerging + totals.critical + totals.realized;
  const pct = (v: number) => grand > 0 ? ((v / grand) * 100).toFixed(1) : '0.0';

  const items = [
    { key: 'noRisk' as const, label: 'No Risk', color: RISK_SIGNAL_COLORS['No Risk (On Track)'], tip: RISK_SIGNAL_TOOLTIPS.noRisk },
    { key: 'emerging' as const, label: 'Emerging', color: RISK_SIGNAL_COLORS['Emerging Risk (Needs Attention)'], tip: RISK_SIGNAL_TOOLTIPS.emerging },
    { key: 'critical' as const, label: 'Critical', color: RISK_SIGNAL_COLORS['Critical Risk (Needs Close Attention)'], tip: RISK_SIGNAL_TOOLTIPS.critical },
    { key: 'realized' as const, label: 'Realized', color: RISK_SIGNAL_COLORS['Realized Risk (Needs Mitigation Strategy)'], tip: RISK_SIGNAL_TOOLTIPS.realized },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-border">
      {items.map(item => (
        <TooltipProvider key={item.key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-help">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
                <span className="text-[10px] font-bold text-foreground">{totals[item.key]}</span>
                <span className="text-[10px] text-muted-foreground">({pct(totals[item.key])}%)</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs"><p>{item.tip}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      <span className="text-[10px] text-muted-foreground ml-auto">Total: {grand} items</span>
    </div>
  );
}

function CompletionDonut({ aggregation }: { aggregation: UniversityAggregation }) {
  const STATUS_COLORS: Record<string, string> = { 'On Target': '#16A34A', 'Below Target': '#7F1D1D', 'In Progress': '#F59E0B', 'Not Started': '#EF4444' };
  const data = [
    { name: 'On Target', value: aggregation.cotCount, color: STATUS_COLORS['On Target'] },
    { name: 'Below Target', value: aggregation.cbtCount, color: STATUS_COLORS['Below Target'] },
    { name: 'In Progress', value: aggregation.inProgressCount, color: STATUS_COLORS['In Progress'] },
    { name: 'Not Started', value: aggregation.notStartedCount, color: STATUS_COLORS['Not Started'] },
  ].filter(d => d.value > 0);

  return (
    <div className="flex items-center gap-4 mt-3">
      <div className="w-28 h-28 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} innerRadius="55%" outerRadius="85%" dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <ReTooltip formatter={(v: number, n: string) => [`${v} items`, n]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-[11px] text-foreground flex-1">{d.name}</span>
            <span className="text-[11px] font-bold text-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingBars({ title, subtitle, units, metricKey }: { title: string; subtitle: string; units: UnitAggregation[]; metricKey: 'riskIndex' | 'completionPct' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-4 sm:p-5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
      <p className="text-[10px] text-muted-foreground mb-3">{subtitle}</p>
      <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
        {units.map((unit, idx) => {
          const value = unit[metricKey];
          const isRisk = metricKey === 'riskIndex';
          const color = isRisk ? getRiskBandColor(value) : 'hsl(var(--primary))';
          const maxVal = isRisk ? 3 : 100;
          const pct = Math.min(100, (value / maxVal) * 100);
          return (
            <div key={unit.unitId} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
              <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">{idx + 1}</span>
              <span className="text-[11px] font-medium text-foreground flex-1 truncate min-w-0">{getUnitDisplayName(unit.unitId)}</span>
              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: isRisk ? color : undefined, background: !isRisk ? 'hsl(var(--primary))' : undefined }} />
              </div>
              <span className="text-[11px] font-bold w-14 text-right shrink-0" style={{ color: isRisk ? color : undefined }}>
                {isRisk ? `RI ${value.toFixed(2)}` : `${value}%`}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function HeatMap({ loadedUnits, heatCells }: { loadedUnits: { unitId: string; unitName: string }[]; heatCells: UnitPillarCell[] }) {
  const pillars: PillarId[] = ['I','II','III','IV','V'];
  const getCell = (unitId: string, pillar: PillarId) => heatCells.find(c => c.unitId === unitId && c.pillar === pillar);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit × Pillar Risk Heatmap</span>
        <InfoTip text="Interactive heatmap showing Risk Index per unit and pillar intersection. Hover for details." />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground border-b border-border sticky left-0 bg-card z-10 min-w-[140px]">Unit</th>
              {pillars.map(p => (
                <th key={p} className="text-center py-2 px-2 font-medium text-muted-foreground border-b border-border w-20">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild><span className="cursor-help">{PILLAR_LABELS[p]}</span></TooltipTrigger>
                      <TooltipContent><p className="text-xs">{PILLAR_FULL[p]}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadedUnits.map(unit => (
              <tr key={unit.unitId} className="border-b border-border/30">
                <td className="py-1.5 px-2 font-medium text-foreground truncate max-w-[160px] sticky left-0 bg-card z-10">{getUnitDisplayLabel(unit.unitId)}</td>
                {pillars.map(pillar => {
                  const cell = getCell(unit.unitId, pillar);
                  if (!cell || cell.applicableItems === 0) return (<td key={pillar} className="text-center py-1.5 px-2"><span className="text-[10px] text-muted-foreground/50">—</span></td>);
                  const color = getRiskBandColor(cell.riskIndex);
                  const opacity = Math.max(0.15, Math.min(0.85, cell.riskIndex / 3));
                  return (
                    <td key={pillar} className="text-center py-1.5 px-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-md py-1 px-1 mx-auto w-14 cursor-default" style={{ backgroundColor: `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` }}>
                              <span className="text-xs font-bold" style={{ color }}>RI {cell.riskIndex.toFixed(2)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs space-y-1">
                            <p className="font-semibold">{getUnitDisplayLabel(unit.unitId)} — {PILLAR_FULL[pillar]}</p>
                            <p>RI: <span className="font-bold" style={{ color }}>{cell.riskIndex.toFixed(2)}</span></p>
                            <p>Completion: {cell.completionPct}%</p>
                            <p>Applicable Items: {cell.applicableItems}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">Risk Band:</span>
        {(['green','amber','orange','red'] as const).map(band => (
          <span key={band} className="text-[10px] px-2 py-0.5 rounded-full" style={{ borderColor: `${RISK_BAND_COLORS[band]}40`, color: RISK_BAND_COLORS[band], backgroundColor: `${RISK_BAND_COLORS[band]}10`, border: `1px solid ${RISK_BAND_COLORS[band]}40` }}>
            {band === 'green' ? '0–0.75' : band === 'amber' ? '0.76–1.50' : band === 'orange' ? '1.51–2.25' : '2.26–3.00'}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function ExceptionsTable({ flags }: { flags: ExceptionFlag[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (flags.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-6 text-center">
        <ShieldAlert className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No critical or realized risk items detected.</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-4 h-4 text-destructive" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Strategic Exceptions</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{flags.length} item{flags.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Items with Critical or Realized risk signals. Click to expand details.</p>
      <div className="space-y-1">
        {flags.map((flag, idx) => {
          const color = RISK_SIGNAL_COLORS[flag.riskSignal];
          const isExpanded = expandedIdx === idx;
          const severity = flag.riskSignal.includes('Realized') ? 'Realized' : 'Critical';
          return (
            <div key={`${flag.unitId}-${flag.sheetRow}`}>
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors text-left"
              >
                {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>{severity}</span>
                <span className="text-xs font-medium text-foreground truncate flex-1">{getUnitDisplayName(flag.unitId)} — {PILLAR_SHORT[flag.pillar]}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">Completion: {flag.completion}%</span>
                <span className="text-xs font-bold shrink-0 ml-1" style={{ color: getRiskBandColor(flag.riskWeight) }}>RI {flag.riskWeight.toFixed(1)}</span>
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-8 mr-3 mb-2 p-3 rounded-lg bg-muted/20 border border-border/50 space-y-1.5">
                      <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Strategic Action:</span> {flag.actionStep}</p>
                      <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Unit:</span> {getUnitDisplayLabel(flag.unitId)}</p>
                      <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Execution Status:</span> {flag.status}</p>
                      <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Pillar:</span> {PILLAR_FULL[flag.pillar]}</p>
                      <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Risk Signal:</span> {flag.riskSignal}</p>
                      <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Completion:</span> {flag.completion}%</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
