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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTip } from '@/components/ui/info-tip';
import { RIMeter } from '@/components/ui/ri-meter';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import {
  aggregateByPillar, aggregateUnitByPillar, getExceptionFlags, getRiskBandColor, RISK_BAND_COLORS,
  type UniversityAggregation, type UnitPillarCell, type ExceptionFlag, type PillarAggregation, type UnitAggregation,
} from '@/lib/university-aggregation';
import { RISK_SIGNAL_COLORS, RISK_SIGNAL_ORDER } from '@/lib/risk-signals';
import { formatRIPercent, getRiskDisplayInfo, RI_TOOLTIP, RI_BAND_LEGEND } from '@/lib/risk-display';
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
  const unitsByRisk = useMemo(() => [...aggregation.unitAggregations].sort((a, b) => b.riskIndex - a.riskIndex), [aggregation]);
  const unitsByCompletion = useMemo(() => [...aggregation.unitAggregations].sort((a, b) => a.completionPct - b.completionPct), [aggregation]);

  return (
    <div className="space-y-8">
      {/* Section 1: Strategic Risk Overview */}
      <section>
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Strategic Risk Overview
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Risk Index by Pillar */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
              RI by Pillar <InfoTip text={RI_TOOLTIP} />
            </span>
            <div className="space-y-3 mt-4">
              {pillarAgg.map((p, idx) => {
                const riInfo = getRiskDisplayInfo(p.riskIndex);
                const pct = riInfo.percent;
                return (
                  <motion.div
                    key={p.pillar}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className="flex items-center gap-2.5"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-semibold text-foreground w-14 cursor-help">{PILLAR_LABELS[p.pillar]}</span>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">{PILLAR_FULL[p.pillar]}</p></TooltipContent>
                    </Tooltip>
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.2 + idx * 0.05, duration: 0.6, ease: 'easeOut' }}
                        style={{ backgroundColor: riInfo.color }}
                      />
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-bold w-14 text-right cursor-help" style={{ color: riInfo.color }}>RI {pct}%</span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs text-xs">
                        <p className="font-semibold">{riInfo.band}</p>
                        <p className="text-muted-foreground mt-0.5">{riInfo.insight}</p>
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Risk Distribution Stacked */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Risk Signal Distribution by Pillar <InfoTip text="Distribution of risk signals across pillars. No Risk: actions with no risk indicators. Emerging: early warning signals. Critical: severe risk requiring intervention. Realized: risk event already occurred." />
            </span>
            <div className="h-48 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pillarAgg.map(p => {
                  const total = p.riskCounts.noRisk + p.riskCounts.emerging + p.riskCounts.critical + p.riskCounts.realized;
                  return { name: PILLAR_LABELS[p.pillar], noRisk: p.riskCounts.noRisk, emerging: p.riskCounts.emerging, critical: p.riskCounts.critical, realized: p.riskCounts.realized, total };
                })} layout="vertical" barSize={18}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={40} tick={{ fontSize: 11 }} />
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
            <RiskSignalLegend pillarAgg={pillarAgg} />
          </motion.div>

          {/* Completion Status Distribution Donut */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Completion Status <InfoTip text="Distribution of strategic actions by their completion status across all units." /></span>
            <CompletionDonut aggregation={aggregation} />
          </motion.div>
        </div>
      </section>

      {/* Section 2: Strategic Priority Signals */}
      <section>
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Target className="w-4 h-4" /> Strategic Priority Signals
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
        <Tooltip key={item.key}>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs font-bold text-foreground">{totals[item.key]}</span>
              <span className="text-xs text-muted-foreground">({pct(totals[item.key])}%)</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs"><p>{item.tip}</p></TooltipContent>
        </Tooltip>
      ))}
      <span className="text-xs text-muted-foreground ml-auto">Total: {grand} items</span>
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
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 mt-4">
      <div className="w-32 h-32 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} innerRadius="55%" outerRadius="85%" dataKey="value" nameKey="name" startAngle={90} endAngle={-270} strokeWidth={0}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <ReTooltip content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs space-y-0.5">
                  <p className="font-semibold text-foreground">{d.name}</p>
                  <p className="text-muted-foreground">{d.value} items</p>
                </div>
              );
            }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-foreground flex-1">{d.name}</span>
            <span className="text-xs font-bold text-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingBars({ title, subtitle, units, metricKey }: { title: string; subtitle: string; units: UnitAggregation[]; metricKey: 'riskIndex' | 'completionPct' }) {
  const INITIAL_COUNT = 10;
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? units : units.slice(0, INITIAL_COUNT);
  const hasMore = units.length > INITIAL_COUNT;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
      <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
      <p className="text-xs text-muted-foreground mb-4 mt-0.5">{subtitle}</p>
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {visible.map((unit, idx) => {
            const value = unit[metricKey];
            const isRisk = metricKey === 'riskIndex';
            const color = isRisk ? getRiskDisplayInfo(value).color : 'hsl(var(--primary))';
            const maxVal = isRisk ? 3 : 100;
            const pct = isRisk ? getRiskDisplayInfo(value).percent : Math.min(100, (value / maxVal) * 100);
            return (
              <motion.div
                key={unit.unitId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ delay: 0.05 + idx * 0.02 }}
                className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
                <span className="text-xs font-medium text-foreground flex-1 truncate min-w-0">{getUnitDisplayLabel(unit.unitId)}</span>
                <div className="w-20 h-2 rounded-full bg-muted overflow-hidden shrink-0">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.1 + idx * 0.02, duration: 0.5, ease: 'easeOut' }}
                    style={{ backgroundColor: isRisk ? color : undefined, background: !isRisk ? 'hsl(var(--primary))' : undefined }}
                  />
                </div>
                <span className="text-xs font-bold w-14 text-right shrink-0" style={{ color: isRisk ? color : undefined }}>
                  {isRisk ? `RI ${value.toFixed(2)}` : `${value}%`}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 pt-3 border-t border-border w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {showAll ? (
            <>Show Less <ChevronDown className="w-3.5 h-3.5 rotate-180" /></>
          ) : (
            <>Show All {units.length} Units <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </motion.div>
  );
}

function HeatMap({ loadedUnits, heatCells }: { loadedUnits: { unitId: string; unitName: string }[]; heatCells: UnitPillarCell[] }) {
  const pillars: PillarId[] = ['I','II','III','IV','V'];
  const getCell = (unitId: string, pillar: PillarId) => heatCells.find(c => c.unitId === unitId && c.pillar === pillar);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Unit × Pillar Risk Heatmap</span>
        <InfoTip text="Interactive heatmap showing Risk Index per unit and pillar intersection. Hover for details." />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2.5 px-2 font-medium text-muted-foreground border-b border-border sticky left-0 bg-card z-10 min-w-[140px]">Unit</th>
              {pillars.map(p => (
                <th key={p} className="text-center py-2.5 px-2 font-medium text-muted-foreground border-b border-border w-20">
                  <Tooltip>
                    <TooltipTrigger asChild><span className="cursor-help">{PILLAR_LABELS[p]}</span></TooltipTrigger>
                    <TooltipContent><p className="text-xs">{PILLAR_FULL[p]}</p></TooltipContent>
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadedUnits.map(unit => (
              <tr key={unit.unitId} className="border-b border-border/30">
                <td className="py-2 px-2 font-medium text-foreground truncate max-w-[160px] sticky left-0 bg-card z-10 text-xs">{getUnitDisplayLabel(unit.unitId)}</td>
                {pillars.map(pillar => {
                  const cell = getCell(unit.unitId, pillar);
                  if (!cell || cell.applicableItems === 0) return (<td key={pillar} className="text-center py-2 px-2"><span className="text-xs text-muted-foreground/50">—</span></td>);
                  const color = getRiskBandColor(cell.riskIndex);
                  const opacity = Math.max(0.15, Math.min(0.85, cell.riskIndex / 3));
                  return (
                    <td key={pillar} className="text-center py-2 px-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="rounded-md py-1 px-1 mx-auto w-16 cursor-default" style={{ backgroundColor: color }}>
                            <span className="text-xs font-bold text-white">RI {cell.riskIndex.toFixed(2)}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs space-y-1">
                          <p className="font-semibold">{getUnitDisplayLabel(unit.unitId)} — {PILLAR_FULL[pillar]}</p>
                          <p>RI: <span className="font-bold" style={{ color }}>{cell.riskIndex.toFixed(2)}</span></p>
                          <p>Completion: {cell.completionPct}%</p>
                          <p>Applicable Items: {cell.applicableItems}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">Risk Band:</span>
        {(['green','amber','orange','red'] as const).map(band => (
          <span key={band} className="text-xs px-2.5 py-0.5 rounded-full" style={{ borderColor: `${RISK_BAND_COLORS[band]}40`, color: RISK_BAND_COLORS[band], backgroundColor: `${RISK_BAND_COLORS[band]}10`, border: `1px solid ${RISK_BAND_COLORS[band]}40` }}>
            {band === 'green' ? '0–0.75' : band === 'amber' ? '0.76–1.50' : band === 'orange' ? '1.51–2.25' : '2.26–3.00'}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function ExceptionsTable({ flags }: { flags: ExceptionFlag[] }) {
  const INITIAL_COUNT = 10;
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? flags : flags.slice(0, INITIAL_COUNT);
  const hasMore = flags.length > INITIAL_COUNT;

  if (flags.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm p-8 text-center">
        <ShieldAlert className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No critical or realized risk items detected.</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-4 h-4 text-destructive" />
        <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Strategic Exceptions</span>
        <span className="text-xs text-muted-foreground ml-auto">{flags.length} item{flags.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Items with Critical or Realized risk signals. Click to expand details.</p>
      <div className="space-y-1">
        {visible.map((flag, idx) => {
          const isExpanded = expandedIdx === idx;
          const isRealized = flag.riskSignal.includes('Realized');
          const severity = isRealized ? 'Realized' : 'Critical';
          const badgeBackground = isRealized ? '#7F1D1D' : 'hsl(var(--destructive))';
          const badgeBorder = isRealized ? '#7F1D1D' : 'hsl(var(--destructive))';
          return (
            <div key={`${flag.unitId}-${flag.sheetRow}-${idx}`}>
               <button
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors text-left flex-wrap sm:flex-nowrap"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ color: 'hsl(var(--destructive-foreground))', backgroundColor: badgeBackground, border: `1px solid ${badgeBorder}` }}>{severity}</span>
                <span className="text-xs font-medium text-foreground truncate flex-1 min-w-0">{getUnitDisplayName(flag.unitId)} — {PILLAR_SHORT[flag.pillar]}</span>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">Completion: {flag.completion}%</span>
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
                    <div className="ml-8 mr-3 mb-2 p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1.5">
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Strategic Action:</span> {flag.actionStep}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Unit:</span> {getUnitDisplayLabel(flag.unitId)}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Execution Status:</span> {flag.status}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Pillar:</span> {PILLAR_FULL[flag.pillar]}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Risk Signal:</span> {flag.riskSignal}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Completion:</span> {flag.completion}%</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => { setShowAll(!showAll); setExpandedIdx(null); }}
          className="mt-3 pt-3 border-t border-border w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {showAll ? (
            <>Show Less <ChevronDown className="w-3.5 h-3.5 rotate-180" /></>
          ) : (
            <>Show All {flags.length} Exceptions <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </motion.div>
  );
}
