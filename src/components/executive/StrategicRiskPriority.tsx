/**
 * Tab 2 — Strategic Risk & Priority
 * Risk diagnosis with All Pillars / Single Pillar modes.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { ShieldAlert, AlertTriangle, Target, BarChart3, ChevronDown, ChevronRight, TrendingDown, AlertCircle } from 'lucide-react';
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
import { getItemStatus, getItemCompletion } from '@/lib/intelligence';
import { PILLAR_COLORS } from '@/lib/pillar-colors';
import PillarViewSelector, { type PillarViewMode } from './PillarViewSelector';
import type { PillarId } from '@/lib/types';
import StrategicCoverageGaps from './StrategicCoverageGaps';

interface Props { aggregation: UniversityAggregation; }

const roundPercent = (value: number) => Math.round(value * 10) / 10;
const formatSignedPercent = (value: number) => {
  const rounded = roundPercent(value);
  const abs = Math.abs(rounded);
  const formatted = Number.isInteger(rounded) ? abs.toFixed(0) : abs.toFixed(1);
  return `${rounded >= 0 ? '+' : '-'}${formatted}%`;
};

export default function StrategicRiskPriority({ aggregation }: Props) {
  const [pillarView, setPillarView] = useState<PillarViewMode>('all');
  const { viewType, academicYear, term } = useDashboard();
  const { data: unitResults } = useUniversityData();

  const flags = useMemo(() => unitResults ? getExceptionFlags(unitResults, viewType, term, academicYear, 30) : [], [unitResults, viewType, term, academicYear]);
  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);
  const heatCells = useMemo(() => unitResults ? aggregateUnitByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);
  const unitsByRisk = useMemo(() => [...aggregation.unitAggregations].sort((a, b) => b.riskIndex - a.riskIndex), [aggregation]);
  const expectedProgress = useMemo(() => {
    const [startYearStr] = academicYear.split('-');
    const startYear = parseInt(startYearStr);
    const windowStart = new Date(startYear, 6, 1);
    const windowEnd = term === 'mid' ? new Date(startYear, 11, 31) : new Date(startYear + 1, 5, 30);
    const now = new Date();
    const totalMs = windowEnd.getTime() - windowStart.getTime();
    const elapsedMs = Math.max(0, Math.min(now.getTime() - windowStart.getTime(), totalMs));
    return Math.round((elapsedMs / totalMs) * 100);
  }, [academicYear, term]);

  const unitExecutionGaps = useMemo(() => {
    if (!unitResults) return [];
    return aggregation.unitAggregations.map(u => {
      const ur = unitResults.find(r => r.unitId === u.unitId);
      let sum = 0, count = 0;
      if (ur?.result) {
        ur.result.data.forEach(item => {
          if (pillarView !== 'all' && item.pillar !== pillarView) return;
          const status = getItemStatus(item, viewType, term, academicYear);
          if (status === 'In Progress') { sum += getItemCompletion(item, viewType, term, academicYear); count++; }
        });
      }
      const actualProgress = count > 0 ? roundPercent(sum / count) : 0;
      return { ...u, actualProgress, gap: roundPercent(actualProgress - expectedProgress), hasInProgress: count > 0 };
    }).sort((a, b) => a.gap - b.gap);
  }, [unitResults, aggregation.unitAggregations, viewType, term, academicYear, expectedProgress, pillarView]);

  // Pillar-filtered data for single-pillar mode
  const filteredFlags = useMemo(() => pillarView === 'all' ? flags : flags.filter(f => f.pillar === pillarView), [flags, pillarView]);

  // Units ranked by completion — with quality layer
  const unitsCompletionQuality = useMemo(() => {
    if (!unitResults) return [];
    return aggregation.unitAggregations.map(u => {
      const ur = unitResults.find(r => r.unitId === u.unitId);
      let cot = 0, cbt = 0;
      if (ur?.result) {
        ur.result.data.forEach(item => {
          if (pillarView !== 'all' && item.pillar !== pillarView) return;
          const status = getItemStatus(item, viewType, term, academicYear);
          if (status === 'Completed – On Target') cot++;
          if (status === 'Completed – Below Target') cbt++;
        });
      }
      return { ...u, cotCount: cot, cbtCount: cbt };
    }).sort((a, b) => a.completionPct - b.completionPct);
  }, [unitResults, aggregation.unitAggregations, viewType, term, academicYear, pillarView]);

  // Filtered pillar data for single pillar mode
  const selectedPillar = pillarView !== 'all' ? pillarAgg.find(p => p.pillar === pillarView) : null;

  // Pillar-specific unit risks
  const pillarUnitRisks = useMemo(() => {
    if (pillarView === 'all') return unitsByRisk;
    // Include ALL units, even if they have no applicable items for this pillar
    return aggregation.unitAggregations.map(u => {
      const cell = heatCells.find(c => c.unitId === u.unitId && c.pillar === pillarView);
      if (cell && cell.applicableItems > 0) {
        return {
          unitId: cell.unitId, unitName: cell.unitName,
          riskIndex: cell.riskIndex, completionPct: cell.completionPct,
          applicableItems: cell.applicableItems,
          totalItems: cell.applicableItems, naCount: 0,
          cotCount: 0, cbtCount: 0, inProgressCount: 0, notStartedCount: 0,
          onTrackPct: 0, belowTargetPct: 0,
          riskCounts: { noRisk: 0, emerging: 0, critical: 0, realized: 0, notApplicable: 0 },
          _hasData: true,
        } as UnitAggregation & { _hasData: boolean };
      }
      return { ...u, riskIndex: -1, completionPct: -1, _hasData: false } as UnitAggregation & { _hasData: boolean };
    }).sort((a, b) => {
      // Units with data first, sorted by RI desc; units without data last (stable alphabetical placeholders)
      if ((a as any)._hasData && !(b as any)._hasData) return -1;
      if (!(a as any)._hasData && (b as any)._hasData) return 1;
      if (!(a as any)._hasData && !(b as any)._hasData) {
        return getUnitDisplayLabel(a.unitId).localeCompare(getUnitDisplayLabel(b.unitId));
      }
      const riskDiff = b.riskIndex - a.riskIndex;
      if (riskDiff !== 0) return riskDiff;
      return getUnitDisplayLabel(a.unitId).localeCompare(getUnitDisplayLabel(b.unitId));
    });
  }, [pillarView, unitsByRisk, heatCells, aggregation.unitAggregations]);

  const orderedExecutionGaps = useMemo(() => {
    return [...unitExecutionGaps].sort((a, b) => {
      if (a.hasInProgress && !b.hasInProgress) return -1;
      if (!a.hasInProgress && b.hasInProgress) return 1;
      if (!a.hasInProgress && !b.hasInProgress) {
        return getUnitDisplayLabel(a.unitId).localeCompare(getUnitDisplayLabel(b.unitId));
      }
      const gapDiff = a.gap - b.gap;
      if (gapDiff !== 0) return gapDiff;
      return getUnitDisplayLabel(a.unitId).localeCompare(getUnitDisplayLabel(b.unitId));
    });
  }, [unitExecutionGaps]);

  const pillarLabel = pillarView !== 'all' ? ` — Pillar ${pillarView}` : '';

  return (
    <div className="space-y-8">
      {/* Pillar Selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Strategic Risk & Priority{pillarLabel}
        </h3>
        <PillarViewSelector value={pillarView} onChange={setPillarView} />
      </div>

      {/* Section 1: Risk Overview */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Risk Exposure */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Risk Exposure{pillarView !== 'all' ? ` — P${pillarView}` : ' by Pillar'} <InfoTip text={RI_TOOLTIP} />
            </span>
            <div className="space-y-3 mt-4">
              {(pillarView === 'all' ? pillarAgg : pillarAgg.filter(p => p.pillar === pillarView)).map((p, idx) => {
                const ri = getRiskDisplayInfo(p.riskIndex);
                const pct = ri.percent;
                const bandLabel = pct <= 25 ? 'Low' : pct <= 50 ? 'Moderate' : pct <= 75 ? 'High' : 'Critical';
                return (
                  <motion.div key={p.pillar} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + idx * 0.05 }} className="flex items-center gap-2.5">
                    <Tooltip><TooltipTrigger asChild><span className="text-xs font-semibold text-foreground w-14 cursor-help">{PILLAR_LABELS[p.pillar]}</span></TooltipTrigger><TooltipContent><p className="text-xs">{PILLAR_FULL[p.pillar]}</p></TooltipContent></Tooltip>
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.2 + idx * 0.05, duration: 0.6 }} style={{ backgroundColor: ri.color }} />
                    </div>
                    <Tooltip><TooltipTrigger asChild>
                      <span className="text-xs font-bold w-24 text-right cursor-help whitespace-nowrap" style={{ color: ri.color }}>
                        RI {pct}% ({bandLabel})
                      </span>
                    </TooltipTrigger><TooltipContent side="left" className="max-w-xs text-xs">
                      <p className="font-semibold">{ri.band}</p>
                      <p className="text-muted-foreground mt-0.5">{ri.insight}</p>
                      {pct >= 50 && <p className="text-amber-500 font-semibold mt-1">⚠ Monitoring recommended</p>}
                    </TooltipContent></Tooltip>
                  </motion.div>
                );
              })}
            </div>
            {pillarView !== 'all' && selectedPillar && (
              <div className="mt-4 pt-3 border-t border-border">
                <RIMeter ri={selectedPillar.riskIndex} compact />
              </div>
            )}
          </motion.div>

          {/* Risk Signal Distribution */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Risk Signal Distribution{pillarLabel} <InfoTip text="Distribution of risk signals. Percentage labels show relative concentration." />
            </span>
            <div className="h-48 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(pillarView === 'all' ? pillarAgg : pillarAgg.filter(p => p.pillar === pillarView)).map(p => {
                  const total = p.riskCounts.noRisk + p.riskCounts.emerging + p.riskCounts.critical + p.riskCounts.realized;
                  return { name: PILLAR_LABELS[p.pillar], noRisk: p.riskCounts.noRisk, emerging: p.riskCounts.emerging, critical: p.riskCounts.critical, realized: p.riskCounts.realized, total };
                })} layout="vertical" barSize={18}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={40} tick={{ fontSize: 11 }} />
                  <ReTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }} formatter={(v: number, n: string, props: any) => {
                    const labelMap: Record<string,string> = { noRisk:'No Risk', emerging:'Emerging', critical:'Critical', realized:'Realized' };
                    const total = props.payload?.total || 1;
                    const pct = ((v / total) * 100).toFixed(1);
                    return [`${v} items (${pct}%)`, labelMap[n] || n];
                  }} labelFormatter={(label: string) => `${label} — Risk Signals`} />
                  <Bar dataKey="noRisk" stackId="a" fill={RISK_SIGNAL_COLORS['No Risk (On Track)']} />
                  <Bar dataKey="emerging" stackId="a" fill={RISK_SIGNAL_COLORS['Emerging Risk (Needs Attention)']} />
                  <Bar dataKey="critical" stackId="a" fill={RISK_SIGNAL_COLORS['Critical Risk (Needs Close Attention)']} />
                  <Bar dataKey="realized" stackId="a" fill={RISK_SIGNAL_COLORS['Realized Risk (Needs Mitigation Strategy)']} radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <RiskSignalLegend pillarAgg={pillarView === 'all' ? pillarAgg : pillarAgg.filter(p => p.pillar === pillarView)} />
          </motion.div>

          {/* Completion Status */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm p-5 sm:p-6">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Completion Status{pillarLabel} <InfoTip text="Distribution of strategic actions by status." /></span>
            <CompletionDonut aggregation={aggregation} pillarView={pillarView} unitResults={unitResults} />
          </motion.div>
        </div>
      </section>

      {/* Section 2: Strategic Priority Signals */}
      <section>
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Target className="w-4 h-4" /> Strategic Priority Signals{pillarLabel}
          <InfoTip text="Per-pillar ranking view: RI ranking keeps all units visible and places NA/missing units after units with valid numeric values." />
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankingBars title={`Units Ranked by RI${pillarLabel}`} subtitle="Highest risk first" units={pillarUnitRisks} metricKey="riskIndex" infoTip="All units remain visible when filtering by a pillar. Units with valid RI appear first; NA/missing are listed last." />
          <RankingBarsQuality title={`Units Ranked by Completion${pillarLabel}`} subtitle="Lowest completion first — quality indicators included" units={unitsCompletionQuality} />
        </div>
      </section>

      {/* Section 2b: Execution Gap */}
      <section>
        <ExecutionGapPanel units={orderedExecutionGaps} expectedProgress={expectedProgress} pillarLabel={pillarLabel} />
      </section>

      {/* Section 3: Heatmap */}
      <section>
        <HeatMap
          loadedUnits={aggregation.unitAggregations.sort((a, b) => b.riskIndex - a.riskIndex).map(u => ({ unitId: u.unitId, unitName: u.unitName }))}
          heatCells={heatCells}
          highlightPillar={pillarView !== 'all' ? pillarView : undefined}
        />
      </section>

      {/* Section 4: Critical Strategic Items */}
      <section>
        <ExceptionsTable flags={filteredFlags} pillarLabel={pillarLabel} />
      </section>

      {/* Section 5: Coverage Gaps */}
      <StrategicCoverageGaps />

      {/* Single Pillar Narrative */}
      {pillarView !== 'all' && selectedPillar && (
        <section>
          <PillarRiskNarrative pillar={pillarView} pillarAgg={selectedPillar} unitGaps={unitExecutionGaps} flagCount={filteredFlags.length} />
        </section>
      )}
    </div>
  );
}

/* ─── Pillar Risk Narrative ──────────────────────────────────────── */

function PillarRiskNarrative({ pillar, pillarAgg, unitGaps, flagCount }: { pillar: PillarId; pillarAgg: PillarAggregation; unitGaps: any[]; flagCount: number }) {
  const riInfo = getRiskDisplayInfo(pillarAgg.riskIndex);
  const behindUnits = unitGaps.filter(u => u.gap < -10).length;
  const narrative = [
    `Pillar ${pillar} shows ${riInfo.band} risk (RI ${riInfo.percent}%).`,
    behindUnits > 0 ? `${behindUnits} unit${behindUnits > 1 ? 's are' : ' is'} significantly behind expected execution pace.` : 'Most units are tracking near expected pace.',
    flagCount > 0 ? `${flagCount} critical/realized risk item${flagCount > 1 ? 's' : ''} require attention.` : 'No critical items flagged.',
    pillarAgg.completionPct > 60 ? 'Completion rate is strong, but below-target quality should be monitored.' : 'Focus should be placed on accelerating execution and closing gaps.',
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PILLAR_COLORS[pillar] }} />
        <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Executive Risk Narrative — Pillar {pillar}</span>
      </div>
      <div className="space-y-2">
        {narrative.map((line, i) => (
          <p key={i} className="text-xs text-foreground leading-relaxed flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            {line}
          </p>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Execution Gap Panel ─────────────────────────────────────────── */

function ExecutionGapPanel({ units, expectedProgress, pillarLabel }: { units: (UnitAggregation & { actualProgress: number; gap: number; hasInProgress: boolean })[]; expectedProgress: number; pillarLabel: string }) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL = 10;
  const visible = showAll ? units : units.slice(0, INITIAL);
  const hasMore = units.length > INITIAL;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <TrendingDown className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Units Ranked by Execution Gap{pillarLabel}</span>
        <InfoTip text={`Execution Gap = Actual Progress − Expected Progress (${expectedProgress}%). Negative values indicate units behind schedule.`} />
      </div>
      <p className="text-xs text-muted-foreground mb-4">Largest negative gap first — units most behind schedule.</p>
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {visible.map((unit, idx) => {
            if (!unit.hasInProgress) {
              return (
                <motion.div key={unit.unitId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + idx * 0.02 }} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
                  <span className="text-xs font-medium text-foreground flex-1 truncate min-w-0">{getUnitDisplayLabel(unit.unitId)}</span>
                  <span className="text-xs text-muted-foreground w-36 text-right shrink-0">—</span>
                </motion.div>
              );
            }
            const gapColor = unit.gap >= 0 ? '#16A34A' : unit.gap > -15 ? '#D97706' : '#DC2626';
            const barWidth = Math.min(100, Math.abs(unit.gap));
            return (
              <motion.div key={unit.unitId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ delay: 0.05 + idx * 0.02 }} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
                <Tooltip><TooltipTrigger asChild><span className="text-xs font-medium text-foreground flex-1 truncate min-w-0 cursor-help">{getUnitDisplayLabel(unit.unitId)}</span></TooltipTrigger>
                  <TooltipContent className="text-xs space-y-1">
                    <p className="font-semibold">{getUnitDisplayName(unit.unitId)}</p>
                     <p>Actual Progress: {roundPercent(unit.actualProgress)}%</p>
                    <p>Expected Progress: {expectedProgress}%</p>
                     <p>Gap: {formatSignedPercent(unit.gap)}</p>
                  </TooltipContent>
                </Tooltip>
                <div className="w-20 h-2 rounded-full bg-muted overflow-hidden shrink-0 flex justify-end">
                  <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${barWidth}%` }} transition={{ delay: 0.1, duration: 0.5 }} style={{ backgroundColor: gapColor }} />
                </div>
                <span className="text-xs font-bold w-14 text-right shrink-0" style={{ color: gapColor }}>{formatSignedPercent(unit.gap)}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {hasMore && (
        <button onClick={() => setShowAll(!showAll)} className="mt-3 pt-3 border-t border-border w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          {showAll ? <>Show Less <ChevronDown className="w-3.5 h-3.5 rotate-180" /></> : <>Show All {units.length} Units <ChevronDown className="w-3.5 h-3.5" /></>}
        </button>
      )}
    </motion.div>
  );
}

/* ─── Risk Signal Legend ──────────────────────────────────────────── */

function RiskSignalLegend({ pillarAgg }: { pillarAgg: PillarAggregation[] }) {
  const totals = pillarAgg.reduce((acc, p) => ({
    noRisk: acc.noRisk + p.riskCounts.noRisk, emerging: acc.emerging + p.riskCounts.emerging,
    critical: acc.critical + p.riskCounts.critical, realized: acc.realized + p.riskCounts.realized,
  }), { noRisk: 0, emerging: 0, critical: 0, realized: 0 });
  const grand = totals.noRisk + totals.emerging + totals.critical + totals.realized;
  const pct = (v: number) => grand > 0 ? ((v / grand) * 100).toFixed(1) : '0.0';
  const severeConcentration = (totals.critical + totals.realized) / (grand || 1);
  const items = [
    { key: 'noRisk' as const, label: 'No Risk', color: RISK_SIGNAL_COLORS['No Risk (On Track)'], tip: RISK_SIGNAL_TOOLTIPS.noRisk },
    { key: 'emerging' as const, label: 'Emerging', color: RISK_SIGNAL_COLORS['Emerging Risk (Needs Attention)'], tip: RISK_SIGNAL_TOOLTIPS.emerging },
    { key: 'critical' as const, label: 'Critical', color: RISK_SIGNAL_COLORS['Critical Risk (Needs Close Attention)'], tip: RISK_SIGNAL_TOOLTIPS.critical },
    { key: 'realized' as const, label: 'Realized', color: RISK_SIGNAL_COLORS['Realized Risk (Needs Mitigation Strategy)'], tip: RISK_SIGNAL_TOOLTIPS.realized },
  ];

  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-border">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {items.map(item => (
          <Tooltip key={item.key}><TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs font-bold text-foreground">{totals[item.key]}</span>
              <span className="text-xs text-muted-foreground">({pct(totals[item.key])}%)</span>
            </div>
          </TooltipTrigger><TooltipContent side="bottom" className="max-w-xs text-xs"><p>{item.tip}</p></TooltipContent></Tooltip>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">Total: {grand}</span>
      </div>
      {severeConcentration > 0.3 && (
        <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> High severe risk concentration ({((severeConcentration) * 100).toFixed(0)}% critical+realized)
        </p>
      )}
    </div>
  );
}

/* ─── Completion Donut ────────────────────────────────────────────── */

function CompletionDonut({ aggregation, pillarView, unitResults }: { aggregation: UniversityAggregation; pillarView: PillarViewMode; unitResults: any }) {
  const { viewType, term, academicYear } = useDashboard();
  const counts = useMemo(() => {
    if (pillarView === 'all') return { cot: aggregation.cotCount, cbt: aggregation.cbtCount, ip: aggregation.inProgressCount, ns: aggregation.notStartedCount, applicable: aggregation.applicableItems };
    let cot = 0, cbt = 0, ip = 0, ns = 0, na = 0, total = 0;
    unitResults?.forEach((ur: any) => {
      if (!ur.result) return;
      ur.result.data.forEach((item: any) => {
        if (item.pillar !== pillarView) return;
        total++;
        const status = getItemStatus(item, viewType, term, academicYear);
        if (status === 'Completed – On Target') cot++;
        else if (status === 'Completed – Below Target') cbt++;
        else if (status === 'In Progress') ip++;
        else if (status === 'Not Started') ns++;
        else na++;
      });
    });
    return { cot, cbt, ip, ns, applicable: total - na };
  }, [aggregation, pillarView, unitResults, viewType, term, academicYear]);

  const STATUS_CONFIG = [
    { key: 'cot', name: 'Completed - On Target', color: '#16A34A', value: counts.cot },
    { key: 'cbt', name: 'Completed - Below Target', color: '#7F1D1D', value: counts.cbt },
    { key: 'ip', name: 'In Progress', color: '#F59E0B', value: counts.ip },
    { key: 'ns', name: 'Not Started', color: '#EF4444', value: counts.ns },
  ] as const;

  const data = STATUS_CONFIG.filter(d => d.value > 0);

  const total = counts.applicable || 1;
  const completedPct = (((counts.cot + counts.cbt) / total) * 100).toFixed(1);
  const inProgressPct = ((counts.ip / total) * 100).toFixed(1);
  const notStartedPct = ((counts.ns / total) * 100).toFixed(1);

  let narrative = '';
  if (parseFloat(inProgressPct) > 50) narrative = 'Strong execution momentum — majority actively in progress.';
  else if (parseFloat(notStartedPct) > 30) narrative = `Backlog alert: ${notStartedPct}% of items have not started.`;
  else if (parseFloat(completedPct) > 60) narrative = 'Mature execution — over 60% completed.';
  else narrative = 'Balanced distribution across execution stages.';

  return (
    <div className="space-y-3 mt-4">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
        <div className="w-full max-w-[9rem] sm:max-w-[8.75rem] aspect-square shrink-0">
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
                    <p className="text-muted-foreground">{d.value} items ({((d.value / total) * 100).toFixed(1)}%)</p>
                  </div>
                );
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 w-full min-w-0 space-y-2">
          {data.map(d => (
            <div key={d.name} className="grid grid-cols-[auto,minmax(0,1fr),auto,auto] items-start gap-x-2 gap-y-1 rounded-md px-1 py-1">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-[clamp(0.68rem,1.8vw,0.78rem)] leading-tight text-foreground break-words min-w-0">
                {d.name}
              </span>
              <span className="text-[clamp(0.68rem,1.8vw,0.78rem)] font-semibold text-foreground tabular-nums text-right shrink-0">
                {d.value}
              </span>
              <span className="text-[clamp(0.66rem,1.7vw,0.75rem)] text-muted-foreground tabular-nums text-right shrink-0">
                ({((d.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground italic px-1">{narrative}</p>
    </div>
  );
}

/* ─── Ranking Bars ────────────────────────────────────────────────── */

function RankingBars({ title, subtitle, units, metricKey, infoTip }: { title: string; subtitle: string; units: UnitAggregation[]; metricKey: 'riskIndex' | 'completionPct'; infoTip?: string }) {
  const INITIAL_COUNT = 10;
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? units : units.slice(0, INITIAL_COUNT);
  const hasMore = units.length > INITIAL_COUNT;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
      <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider inline-flex items-center gap-1.5">{title}{infoTip && <InfoTip text={infoTip} />}</span>
      <p className="text-xs text-muted-foreground mb-4 mt-0.5">{subtitle}</p>
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {visible.map((unit, idx) => {
            const value = unit[metricKey];
            const isRisk = metricKey === 'riskIndex';
            const noData = value < 0;
            const color = noData ? '#9CA3AF' : isRisk ? getRiskDisplayInfo(value).color : 'hsl(var(--primary))';
            const maxVal = isRisk ? 3 : 100;
            const pct = noData ? 0 : isRisk ? getRiskDisplayInfo(value).percent : Math.min(100, (value / maxVal) * 100);
            return (
              <motion.div key={unit.unitId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ delay: 0.05 + idx * 0.02 }} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
                <span className="text-xs font-medium text-foreground flex-1 truncate min-w-0">{getUnitDisplayLabel(unit.unitId)}</span>
                {noData ? (
                  <span className="text-xs text-muted-foreground w-36 text-right shrink-0">—</span>
                ) : (
                  <>
                    <div className="w-20 h-2 rounded-full bg-muted overflow-hidden shrink-0">
                      <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.1 + idx * 0.02, duration: 0.5 }} style={{ backgroundColor: isRisk ? color : undefined, background: !isRisk ? 'hsl(var(--primary))' : undefined }} />
                    </div>
                    <span className="text-xs font-bold w-14 text-right shrink-0" style={{ color: isRisk ? color : undefined }}>
                      {isRisk ? `RI ${getRiskDisplayInfo(value).percent}%` : `${value}%`}
                    </span>
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {hasMore && (
        <button onClick={() => setShowAll(!showAll)} className="mt-3 pt-3 border-t border-border w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          {showAll ? <>Show Less <ChevronDown className="w-3.5 h-3.5 rotate-180" /></> : <>Show All {units.length} Units <ChevronDown className="w-3.5 h-3.5" /></>}
        </button>
      )}
    </motion.div>
  );
}

/* ─── Ranking Bars with Quality ──────────────────────────────────── */

function RankingBarsQuality({ title, subtitle, units }: { title: string; subtitle: string; units: (UnitAggregation & { cotCount: number; cbtCount: number })[] }) {
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
            const pct = Math.min(100, unit.completionPct);
            return (
              <motion.div key={unit.unitId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ delay: 0.05 + idx * 0.02 }} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
                <Tooltip><TooltipTrigger asChild>
                  <span className="text-xs font-medium text-foreground flex-1 truncate min-w-0 cursor-help">{getUnitDisplayLabel(unit.unitId)}</span>
                </TooltipTrigger><TooltipContent className="text-xs space-y-1">
                  <p className="font-semibold">{getUnitDisplayName(unit.unitId)}</p>
                  <p>Completion: {unit.completionPct}%</p>
                  <p className="text-[#16A34A]">On Target: {unit.cotCount}</p>
                  <p className="text-[#7F1D1D]">Below Target: {unit.cbtCount}</p>
                </TooltipContent></Tooltip>
                <div className="w-20 h-2 rounded-full bg-muted overflow-hidden shrink-0">
                  <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.1, duration: 0.5 }} style={{ background: 'hsl(var(--primary))' }} />
                </div>
                <span className="text-xs font-bold w-14 text-right shrink-0">{unit.completionPct}%</span>
                <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                  <span style={{ color: '#16A34A' }}>{unit.cotCount}✓</span> <span style={{ color: '#7F1D1D' }}>{unit.cbtCount}✗</span>
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {hasMore && (
        <button onClick={() => setShowAll(!showAll)} className="mt-3 pt-3 border-t border-border w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          {showAll ? <>Show Less <ChevronDown className="w-3.5 h-3.5 rotate-180" /></> : <>Show All {units.length} Units <ChevronDown className="w-3.5 h-3.5" /></>}
        </button>
      )}
    </motion.div>
  );
}

/* ─── HeatMap ─────────────────────────────────────────────────────── */

function HeatMap({ loadedUnits, heatCells, highlightPillar }: { loadedUnits: { unitId: string; unitName: string }[]; heatCells: UnitPillarCell[]; highlightPillar?: PillarId }) {
  const pillars: PillarId[] = ['I','II','III','IV','V'];
  const getCell = (unitId: string, pillar: PillarId) => heatCells.find(c => c.unitId === unitId && c.pillar === pillar);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Unit × Pillar Risk Heatmap</span>
        <InfoTip text="Interactive heatmap showing Risk Index per unit and pillar intersection." />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2.5 px-2 font-medium text-muted-foreground border-b border-border sticky left-0 bg-card z-10 min-w-[140px]">Unit</th>
              {pillars.map(p => (
                <th key={p} className={`text-center py-2.5 px-2 font-medium border-b border-border w-20 ${highlightPillar && highlightPillar !== p ? 'opacity-30' : ''}`} style={{ color: highlightPillar === p ? PILLAR_COLORS[p] : undefined }}>
                  <Tooltip><TooltipTrigger asChild><span className="cursor-help">{PILLAR_LABELS[p]}</span></TooltipTrigger><TooltipContent><p className="text-xs">{PILLAR_FULL[p]}</p></TooltipContent></Tooltip>
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
                  const dimmed = highlightPillar && highlightPillar !== pillar;
                  if (!cell || cell.applicableItems === 0) return (<td key={pillar} className={`text-center py-2 px-2 ${dimmed ? 'opacity-20' : ''}`}><span className="text-xs text-muted-foreground/50">—</span></td>);
                  const color = getRiskDisplayInfo(cell.riskIndex).color;
                  const riPct = getRiskDisplayInfo(cell.riskIndex).percent;
                  return (
                    <td key={pillar} className={`text-center py-2 px-1 ${dimmed ? 'opacity-20' : ''}`}>
                      <Tooltip><TooltipTrigger asChild>
                        <div className="rounded-md py-1 px-1 mx-auto w-16 cursor-default" style={{ backgroundColor: color }}>
                          <span className="text-xs font-bold text-white whitespace-nowrap">RI {riPct}%</span>
                        </div>
                      </TooltipTrigger><TooltipContent side="top" className="text-xs space-y-1">
                        <p className="font-semibold">{getUnitDisplayLabel(unit.unitId)} — {PILLAR_FULL[pillar]}</p>
                        <p>RI: <span className="font-bold" style={{ color }}>{riPct}% — {getRiskDisplayInfo(cell.riskIndex).band}</span></p>
                        <p>Completion: {cell.completionPct}%</p>
                        <p>Applicable Items: {cell.applicableItems}</p>
                      </TooltipContent></Tooltip>
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
        {RI_BAND_LEGEND.map(band => (
          <span key={band.label} className="text-xs px-2.5 py-0.5 rounded-full" style={{ borderColor: `${band.color}40`, color: band.color, backgroundColor: `${band.color}10`, border: `1px solid ${band.color}40` }}>
            {band.range} {band.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Exceptions Table ────────────────────────────────────────────── */

function ExceptionsTable({ flags, pillarLabel }: { flags: ExceptionFlag[]; pillarLabel: string }) {
  const INITIAL_COUNT = 10;
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? flags : flags.slice(0, INITIAL_COUNT);
  const hasMore = flags.length > INITIAL_COUNT;

  if (flags.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm p-8 text-center">
        <ShieldAlert className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No critical or realized risk items detected{pillarLabel}.</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-4 h-4 text-destructive" />
        <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Critical Strategic Items{pillarLabel}</span>
        <span className="text-xs text-muted-foreground ml-auto">{flags.length} item{flags.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Items requiring immediate attention due to Critical or Realized risk signals.</p>
      <div className="space-y-1">
        {visible.map((flag, idx) => {
          const isExpanded = expandedIdx === idx;
          const isRealized = flag.riskSignal.includes('Realized');
          const severity = isRealized ? 'Realized' : 'Critical';
          const badgeBackground = isRealized ? '#7F1D1D' : 'hsl(var(--destructive))';
          return (
            <div key={`${flag.unitId}-${flag.sheetRow}-${idx}`}>
              <button onClick={() => setExpandedIdx(isExpanded ? null : idx)} className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors text-left flex-wrap sm:flex-nowrap">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ color: 'hsl(var(--destructive-foreground))', backgroundColor: badgeBackground }}>{severity}</span>
                <span className="text-xs font-medium text-foreground truncate flex-1 min-w-0">{getUnitDisplayName(flag.unitId)} — {PILLAR_SHORT[flag.pillar]}</span>
                <span className="text-xs font-bold shrink-0 ml-1" style={{ color: getRiskDisplayInfo(flag.riskWeight).color }}>RI {getRiskDisplayInfo(flag.riskWeight).percent}%</span>
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="ml-8 mr-3 mb-2 p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1.5">
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Strategic Action:</span> {flag.actionStep}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Unit:</span> {getUnitDisplayLabel(flag.unitId)}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Status:</span> {flag.status}</p>
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
        <button onClick={() => { setShowAll(!showAll); setExpandedIdx(null); }} className="mt-3 pt-3 border-t border-border w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          {showAll ? <>Show Less <ChevronDown className="w-3.5 h-3.5 rotate-180" /></> : <>Show All {flags.length} Items <ChevronDown className="w-3.5 h-3.5" /></>}
        </button>
      )}
    </motion.div>
  );
}
