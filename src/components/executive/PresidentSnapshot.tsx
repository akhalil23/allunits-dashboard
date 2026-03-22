/**
 * Tab 1 — Executive Snapshot
 * Strategic synthesis: SEEI + SSI KPIs, master alignment scatter with Focus Mode,
 * Pillar Execution Diagnostics panel.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, TrendingUp, DollarSign,
  ShieldAlert, Lightbulb, Info, Gauge, Activity, Eye, BarChart3,
} from 'lucide-react';
import {
  ScatterChart, Scatter, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, ReferenceLine,
  LabelList,
} from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTip } from '@/components/ui/info-tip';
import { RIMeter } from '@/components/ui/ri-meter';
import type { UniversityAggregation } from '@/lib/university-aggregation';
import { getRiskBandColor } from '@/lib/university-aggregation';
import { formatRIPercent, getRiskDisplayInfo } from '@/lib/risk-display';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateByPillar } from '@/lib/university-aggregation';
import { PILLAR_LABELS, getLivePillarBudget, formatCurrency, formatCurrencyFull } from '@/lib/budget-data';
import { useBudgetData } from '@/hooks/use-budget-data';
import { PILLAR_SHORT, PILLAR_FULL, PILLAR_ABBREV } from '@/lib/pillar-labels';
import { getItemStatus, getItemCompletion } from '@/lib/intelligence';
import { isNotApplicableStatus } from '@/lib/types';
import { PILLAR_COLORS, PILLAR_COLOR_LABELS, computeSSI, getAlignmentStatus, getAlignmentColor } from '@/lib/pillar-colors';
import type { PillarId } from '@/lib/types';

interface Props {
  aggregation: UniversityAggregation;
}

type FocusMode = 'combined' | 'execution' | 'budget';

function getIPSCategory(ips: number): { label: string; color: string; emoji: string } {
  if (ips > 25) return { label: 'Critical Priority', color: '#DC2626', emoji: '🔴' };
  if (ips > 15) return { label: 'High Priority', color: '#F97316', emoji: '🟠' };
  if (ips > 5) return { label: 'Monitor', color: '#D97706', emoji: '🟡' };
  return { label: 'Stable', color: '#16A34A', emoji: '🟢' };
}

export default function PresidentSnapshot({ aggregation }: Props) {
  const [focusMode, setFocusMode] = useState<FocusMode>('combined');
  const { viewType, term, academicYear } = useDashboard();
  const { data: unitResults } = useUniversityData();
  const { data: budgetResult } = useBudgetData();
  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  // ─── Budget Utilization ───────────────────────────────────────────────
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

  // ─── Expected Progress (timeline-based) ───────────────────────────────
  const expectedProgress = useMemo(() => {
    const [startYearStr] = academicYear.split('-');
    const startYear = parseInt(startYearStr);
    const windowStart = new Date(startYear, 6, 1);
    const windowEnd = term === 'mid'
      ? new Date(startYear, 11, 31)
      : new Date(startYear + 1, 5, 30);
    const now = new Date();
    const totalMs = windowEnd.getTime() - windowStart.getTime();
    const elapsedMs = Math.max(0, Math.min(now.getTime() - windowStart.getTime(), totalMs));
    return Math.round((elapsedMs / totalMs) * 100);
  }, [term, academicYear]);

  // ─── Pillar-level data ────────────────────────────────────────────────
  const pillarData = useMemo(() => {
    if (!unitResults) return [];
    const pillarIds: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

    return pillarIds.map(pillar => {
      // In-progress items
      let sum = 0, count = 0;
      unitResults.forEach(ur => {
        if (!ur.result) return;
        ur.result.data.forEach(item => {
          if (item.pillar !== pillar) return;
          const status = getItemStatus(item, viewType, term, academicYear);
          if (status === 'In Progress') {
            sum += getItemCompletion(item, viewType, term, academicYear);
            count++;
          }
        });
      });
      const actualProgress = count > 0 ? Math.round(sum / count) : 0;
      const hasItems = count > 0;

      const b = getLivePillarBudget(budgetResult?.pillars, pillar);
      const budgetUtil = b.allocation > 0 ? parseFloat(((b.committed / b.allocation) * 100).toFixed(1)) : 0;
      const pa = pillarAgg.find(p => p.pillar === pillar);
      const riskIndex = pa?.riskIndex ?? 0;
      const completionPct = pa?.completionPct ?? 0;
      const applicableItems = pa?.applicableItems ?? 0;

      const progressRatio = hasItems && expectedProgress > 0 ? actualProgress / expectedProgress : 0;
      const ips = hasItems && expectedProgress > 0 ? (1 - progressRatio) * budgetUtil : 0;
      const gap = actualProgress - budgetUtil;
      const riPct = parseFloat(((riskIndex / 3) * 100).toFixed(1));
      const alignment = getAlignmentStatus(actualProgress, budgetUtil, riskIndex);

      return {
        pillar,
        actualProgress: hasItems ? actualProgress : 0,
        budgetUtil,
        riskIndex,
        riPct,
        completionPct,
        applicableItems,
        inProgressCount: count,
        hasItems,
        gap,
        alignment,
        ips: parseFloat(ips.toFixed(1)),
        ipsCategory: getIPSCategory(ips),
        progressRatio: hasItems ? parseFloat(progressRatio.toFixed(2)) : 0,
        allocated: b.allocation,
        spent: b.spent,
      };
    });
  }, [unitResults, budgetResult, pillarAgg, viewType, term, academicYear, expectedProgress]);

  // ─── Overall Actual Progress ──────────────────────────────────────────
  const overallActualProgress = useMemo(() => {
    if (!unitResults) return 0;
    let sum = 0, count = 0;
    unitResults.forEach(ur => {
      if (!ur.result) return;
      ur.result.data.forEach(item => {
        const status = getItemStatus(item, viewType, term, academicYear);
        if (status === 'In Progress') {
          sum += getItemCompletion(item, viewType, term, academicYear);
          count++;
        }
      });
    });
    return count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
  }, [unitResults, viewType, term, academicYear]);

  // ─── SEEI (capped at 100%) ────────────────────────────────────────────
  const seei = useMemo(() => {
    if (budgetUtilization <= 0) return { value: 0, percent: 0, label: 'N/A', color: '#6B7280' };
    const raw = overallActualProgress / budgetUtilization;
    const pct = Math.min(100, parseFloat((raw * 100).toFixed(1)));
    let label: string, color: string;
    if (raw >= 1.20) { label = 'Highly Efficient'; color = '#065F46'; }
    else if (raw >= 0.90) { label = 'Balanced Execution'; color = '#16A34A'; }
    else if (raw >= 0.60) { label = 'Efficiency Concern'; color = '#D97706'; }
    else { label = 'Critical Inefficiency'; color = '#DC2626'; }
    return { value: raw, percent: pct, label, color };
  }, [overallActualProgress, budgetUtilization]);

  // ─── SSI ──────────────────────────────────────────────────────────────
  const riPctOverall = parseFloat(((aggregation.riskIndex / 3) * 100).toFixed(1));
  const ssi = useMemo(() => computeSSI(overallActualProgress, budgetUtilization, riPctOverall), [overallActualProgress, budgetUtilization, riPctOverall]);

  // ─── Master alignment scatter data ────────────────────────────────────
  const avgBudgetUtil = useMemo(() => {
    const vals = pillarData.map(d => d.budgetUtil);
    return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
  }, [pillarData]);

  // ─── Executive highlights ─────────────────────────────────────────────
  const highlights = useMemo(() => {
    const items: { title: string; insight: string; icon: React.ElementType; color: string }[] = [];

    const behind = pillarData.filter(d => d.hasItems && d.actualProgress < expectedProgress);
    if (behind.length > 0) {
      const worst = [...behind].sort((a, b) => a.actualProgress - b.actualProgress)[0];
      items.push({
        title: 'Execution Pace',
        insight: `${behind.length} pillar${behind.length > 1 ? 's are' : ' is'} below expected progress; ${PILLAR_ABBREV[worst.pillar]} shows the largest delay at ${worst.actualProgress}% vs ${expectedProgress}% expected.`,
        icon: TrendingUp,
        color: '#D97706',
      });
    } else {
      items.push({
        title: 'Execution Pace',
        insight: 'All pillars are tracking at or above expected timeline progress.',
        icon: TrendingUp,
        color: '#16A34A',
      });
    }

    const worstRisk = [...pillarData].sort((a, b) => b.riskIndex - a.riskIndex)[0];
    if (worstRisk) {
      const info = getRiskDisplayInfo(worstRisk.riskIndex);
      items.push({
        title: 'Risk Concentration',
        insight: `Highest risk in ${PILLAR_ABBREV[worstRisk.pillar]} with RI ${formatRIPercent(worstRisk.riskIndex)} (${info.band}).`,
        icon: ShieldAlert,
        color: info.color,
      });
    }

    items.push({
      title: 'Budget Position',
      insight: `Budget utilization at ${budgetUtilization}%. ${pillarData.filter(p => p.budgetUtil > 80).length > 0 ? 'Pressure detected in some pillars.' : 'Allocation balanced across pillars.'}`,
      icon: DollarSign,
      color: budgetUtilization >= 80 ? '#EF4444' : '#3B82F6',
    });

    return items.slice(0, 4);
  }, [pillarData, budgetUtilization, expectedProgress]);

  const riInfo = getRiskDisplayInfo(aggregation.riskIndex);

  return (
    <div className="space-y-8">
      {/* Pillar Reference Panel */}
      <PillarReferencePanel />

      {/* KPI Cards: SEEI + SSI + Progress + Budget */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* SEEI */}
          <KPICard
            label="SEEI — Execution Efficiency"
            value={`${seei.percent}%`}
            icon={Gauge}
            color={seei.color}
            subtitle={seei.label}
            tooltip="Strategic Execution Efficiency Index = Actual Progress % ÷ Budget Utilization %. Expressed as 0–100% scale. Measures whether execution output is proportional to resource deployment."
          />
          {/* SSI */}
          <KPICard
            label="SSI — Strategic Stability"
            value={`${ssi.value}%`}
            icon={Activity}
            color={ssi.color}
            subtitle={ssi.label}
            tooltip="Strategic Stability Index combines progress (40%), budget alignment (30%), and risk exposure (30%) into a single executive signal. Higher = more stable. 85–100 Highly Stable, 70–84 Stable, 50–69 Watch, <50 Unstable."
          />
          {/* Actual Progress */}
          <KPICard
            label="Progress — In-Progress Items"
            value={`${overallActualProgress}%`}
            icon={TrendingUp}
            color="#059669"
            tooltip="Average completion % of all in-progress strategic items across all units."
          />
          {/* Budget Utilization */}
          <KPICard
            label="Budget Utilization — Committed"
            value={`${budgetUtilization}%`}
            icon={DollarSign}
            color={budgetUtilization >= 80 ? '#EF4444' : budgetUtilization >= 60 ? '#F59E0B' : '#3B82F6'}
            tooltip="Total Committed ÷ Total Budget × 100. Reflects financial commitment level."
          />
        </div>
        <p className="text-xs text-muted-foreground italic mt-2.5 px-1">
          SEEI and SSI provide complementary views: efficiency of execution (SEEI) and overall strategic stability (SSI).
        </p>
      </section>

      {/* Executive Highlights */}
      <section>
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" /> Executive Highlights
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

      {/* Master Alignment Panel with Focus Mode */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Execution & Budget Alignment by Pillar</span>
              <InfoTip text="Master strategic visual showing how budget deployment translates into execution progress. Use Focus Mode to inspect individual dimensions." />
            </div>
            {/* Focus Mode Switcher */}
            <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
              {([
                { key: 'combined' as FocusMode, label: 'Combined' },
                { key: 'execution' as FocusMode, label: 'Execution' },
                { key: 'budget' as FocusMode, label: 'Budget' },
              ]).map(m => (
                <button
                  key={m.key}
                  onClick={() => setFocusMode(m.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                    focusMode === m.key
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {focusMode !== 'combined' && (
            <p className="text-[10px] text-muted-foreground italic mb-3">
              In Focus Mode, metrics are shown independently to support detailed inspection.
            </p>
          )}

          {/* Combined View — Scatter */}
          {focusMode === 'combined' && (
            <MasterAlignmentScatter
              pillarData={pillarData}
              avgBudgetUtil={avgBudgetUtil}
              expectedProgress={expectedProgress}
            />
          )}

          {/* Focus: Execution Progress */}
          {focusMode === 'execution' && (
            <ExecutionFocusChart
              pillarData={pillarData}
              expectedProgress={expectedProgress}
            />
          )}

          {/* Focus: Budget Utilization */}
          {focusMode === 'budget' && (
            <BudgetFocusChart
              pillarData={pillarData}
              avgBudgetUtil={avgBudgetUtil}
            />
          )}
        </motion.div>
      </section>

      {/* Pillar Execution Diagnostics */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Pillar Execution Diagnostics</span>
            <InfoTip text="Per-pillar breakdown explaining why each pillar sits where it does in the master alignment view." />
          </div>
          <div className="space-y-4">
            {pillarData.map((p, idx) => {
              const riInfo = getRiskDisplayInfo(p.riskIndex);
              const alignColor = getAlignmentColor(p.alignment);
              return (
                <motion.div
                  key={p.pillar}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  className="rounded-xl border border-border/40 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: PILLAR_COLORS[p.pillar] }} />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs font-semibold text-foreground cursor-help">{PILLAR_SHORT[p.pillar]}</span>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">{PILLAR_FULL[p.pillar]}</p></TooltipContent>
                      </Tooltip>
                    </div>
                    <span
                      className="text-[10px] px-2.5 py-1 rounded-full font-bold"
                      style={{ backgroundColor: `${alignColor}15`, color: alignColor, border: `1px solid ${alignColor}30` }}
                    >
                      {p.alignment}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <DiagnosticBar label="Progress" value={p.actualProgress} max={100} suffix="%" color={PILLAR_COLORS[p.pillar]} />
                    <DiagnosticBar label="Budget Util" value={p.budgetUtil} max={100} suffix="%" color="#6B7280" />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-muted-foreground mb-1">Gap</span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: p.gap >= 0 ? '#16A34A' : p.gap > -15 ? '#D97706' : '#DC2626' }}
                      >
                        {p.gap >= 0 ? '+' : ''}{p.gap}%
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-muted-foreground mb-1">RI</span>
                      <span className="text-sm font-bold" style={{ color: riInfo.color }}>{riInfo.percent}%</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-muted-foreground mb-1">Items</span>
                      <span className="text-sm font-bold text-foreground">{p.applicableItems}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>
    </div>
  );
}

/* ─── Pillar Reference Panel ──────────────────────────────────────── */

function PillarReferencePanel() {
  const pillarIds: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-1.5 rounded-lg bg-muted">
          <Info className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-foreground tracking-wide">Strategic Plan IV — Pillar Reference</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">These colors are used consistently across all Executive Command Center visualizations.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {pillarIds.map((p, i) => (
          <Tooltip key={p}>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="group flex items-center sm:flex-col gap-3 sm:gap-2 p-3 rounded-xl border border-border/40 hover:border-border transition-colors cursor-help"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: PILLAR_COLORS[p], boxShadow: `0 0 0 3px ${PILLAR_COLORS[p]}25` }}
                >
                  <span className="text-sm font-bold text-white">{p}</span>
                </div>
                <div className="sm:text-center flex-1">
                  <span className="text-[11px] font-semibold text-foreground block leading-tight">{PILLAR_SHORT[p]}</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">{PILLAR_COLOR_LABELS[p]}</span>
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              <p>{PILLAR_FULL[p]}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Master Alignment Scatter (Combined View) ────────────────────── */

function MasterAlignmentScatter({ pillarData, avgBudgetUtil, expectedProgress }: {
  pillarData: any[];
  avgBudgetUtil: number;
  expectedProgress: number;
}) {
  const scatterData = pillarData.map(p => ({
    x: p.budgetUtil,
    y: p.actualProgress,
    pillar: p.pillar,
    ...p,
  }));

  return (
    <>
      <div className="h-80 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            {/* Quadrant borders only — no colored fills */}
            <XAxis
              type="number" dataKey="x" domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'Budget Utilization %', position: 'insideBottom', offset: -20, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
            />
            <YAxis
              type="number" dataKey="y" domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'Actual Progress %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
            />
            {/* Reference lines */}
            <ReferenceLine
              x={avgBudgetUtil}
              stroke="#6B7280"
              strokeWidth={2}
              strokeDasharray="8 4"
              label={{
                value: `Avg Budget ${avgBudgetUtil}%`,
                position: 'insideTopRight',
                style: { fontSize: 10, fontWeight: 700, fill: '#6B7280' },
              }}
            />
            <ReferenceLine
              y={expectedProgress}
              stroke="#DC2626"
              strokeWidth={2}
              strokeDasharray="8 4"
              label={{
                value: `Expected Progress ${expectedProgress}%`,
                position: 'insideTopLeft',
                style: { fontSize: 10, fontWeight: 700, fill: '#DC2626' },
              }}
            />
            <ReTooltip content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                  <p className="font-semibold text-foreground">{PILLAR_FULL[d.pillar]}</p>
                  <p className="text-muted-foreground">Actual Progress: <span className="text-foreground font-medium">{d.actualProgress}%</span></p>
                  <p className="text-muted-foreground">Budget Utilization: <span className="text-foreground font-medium">{d.budgetUtil}%</span></p>
                  <p className="text-muted-foreground">Progress-Budget Gap: <span className="font-medium" style={{ color: d.gap >= 0 ? '#16A34A' : '#DC2626' }}>{d.gap >= 0 ? '+' : ''}{d.gap}%</span></p>
                  <p className="text-muted-foreground">RI: <span className="font-medium" style={{ color: getRiskDisplayInfo(d.riskIndex).color }}>{d.riPct}%</span></p>
                </div>
              );
            }} />
            <Scatter data={scatterData}>
              {scatterData.map((d, i) => (
                <Cell
                  key={i}
                  fill={PILLAR_COLORS[d.pillar as PillarId]}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  r={14}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {/* Quadrant legend with border-only styling */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {[
          { label: 'Efficient Execution', desc: 'Low budget / High progress', color: '#065F46' },
          { label: 'Under-resourced / Delayed', desc: 'Low budget / Low progress', color: '#D97706' },
          { label: 'Productive but Costly', desc: 'High budget / High progress', color: '#1E40AF' },
          { label: 'Critical Inefficiency', desc: 'High budget / Low progress', color: '#DC2626' },
        ].map(q => (
          <div key={q.label} className="text-center p-2.5 rounded-lg border-2" style={{ borderColor: `${q.color}50`, backgroundColor: '#F5F6F7' }}>
            <p className="text-[11px] font-bold" style={{ color: q.color }}>{q.label}</p>
            <p className="text-[10px] text-muted-foreground">{q.desc}</p>
          </div>
        ))}
      </div>
      {/* Pillar legend */}
      <PillarLegendStrip />
    </>
  );
}

/* ─── Execution Focus Bar Chart ───────────────────────────────────── */

function ExecutionFocusChart({ pillarData, expectedProgress }: { pillarData: any[]; expectedProgress: number }) {
  const chartData = pillarData.map(p => ({
    label: PILLAR_ABBREV[p.pillar as PillarId],
    pillar: p.pillar,
    actualProgress: p.hasItems ? p.actualProgress : 0,
    hasItems: p.hasItems,
    fullLabel: PILLAR_FULL[p.pillar as PillarId],
    gap: p.hasItems ? p.actualProgress - expectedProgress : null,
  }));

  return (
    <>
      <div className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 25, right: 20, bottom: 25, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Progress %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
            <ReferenceLine y={expectedProgress} stroke="#DC2626" strokeWidth={2.5} strokeDasharray="10 5" label={{ value: `Expected Progress (${expectedProgress}%)`, position: 'insideTopRight', style: { fontSize: 11, fill: '#DC2626', fontWeight: 700 } }} />
            <ReTooltip content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              if (!d.hasItems) return <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs"><p className="font-semibold">{d.fullLabel}</p><p className="text-muted-foreground italic">No in-progress items</p></div>;
              return (
                <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                  <p className="font-semibold text-foreground">{d.fullLabel}</p>
                  <p className="text-muted-foreground">Actual Progress: <span className="text-foreground font-medium">{d.actualProgress}%</span></p>
                  <p className="text-muted-foreground">Expected Progress: <span className="text-foreground font-medium">{expectedProgress}%</span></p>
                  <p className="text-muted-foreground">Gap: <span className="font-medium" style={{ color: (d.gap ?? 0) >= 0 ? '#16A34A' : '#EF4444' }}>{(d.gap ?? 0) >= 0 ? '+' : ''}{d.gap}%</span></p>
                </div>
              );
            }} />
            <Bar dataKey="actualProgress" radius={[4, 4, 0, 0]} maxBarSize={50}>
              <LabelList dataKey="actualProgress" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: 'hsl(var(--foreground))' }} />
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.hasItems ? PILLAR_COLORS[d.pillar as PillarId] : '#6B7280'} fillOpacity={d.hasItems ? 0.85 : 0.3} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <PillarLegendStrip showExpectedLine />
    </>
  );
}

/* ─── Budget Focus Bar Chart ──────────────────────────────────────── */

function BudgetFocusChart({ pillarData, avgBudgetUtil }: { pillarData: any[]; avgBudgetUtil: number }) {
  const chartData = pillarData.map(p => ({
    label: PILLAR_ABBREV[p.pillar as PillarId],
    pillar: p.pillar,
    budgetUtil: p.budgetUtil,
    fullLabel: PILLAR_FULL[p.pillar as PillarId],
    diff: parseFloat((p.budgetUtil - avgBudgetUtil).toFixed(1)),
    allocated: p.allocated,
    spent: p.spent,
  }));

  return (
    <>
      <div className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 25, right: 20, bottom: 25, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Budget Utilization %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
            <ReferenceLine y={avgBudgetUtil} stroke="#6B7280" strokeWidth={2.5} strokeDasharray="10 5" label={{ value: `Average (${avgBudgetUtil}%)`, position: 'insideTopRight', style: { fontSize: 11, fill: '#6B7280', fontWeight: 700 } }} />
            <ReTooltip content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                  <p className="font-semibold text-foreground">{d.fullLabel}</p>
                  <p className="text-muted-foreground">Budget Utilization: <span className="text-foreground font-medium">{d.budgetUtil}%</span></p>
                  <p className="text-muted-foreground">Average: <span className="text-foreground font-medium">{avgBudgetUtil}%</span></p>
                  <p className="text-muted-foreground">Difference: <span className="font-medium" style={{ color: d.diff >= 0 ? '#D97706' : '#16A34A' }}>{d.diff >= 0 ? '+' : ''}{d.diff}%</span></p>
                  <p className="text-muted-foreground">Allocated: <span className="text-foreground font-medium">{formatCurrencyFull(d.allocated)}</span></p>
                  <p className="text-muted-foreground">Spent: <span className="text-foreground font-medium">{formatCurrencyFull(d.spent)}</span></p>
                </div>
              );
            }} />
            <Bar dataKey="budgetUtil" radius={[4, 4, 0, 0]} maxBarSize={50}>
              <LabelList dataKey="budgetUtil" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: 'hsl(var(--foreground))' }} />
              {chartData.map((d, i) => (
                <Cell key={i} fill={PILLAR_COLORS[d.pillar as PillarId]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <PillarLegendStrip showAvgLine />
    </>
  );
}

/* ─── Pillar Legend Strip ─────────────────────────────────────────── */

function PillarLegendStrip({ showExpectedLine, showAvgLine }: { showExpectedLine?: boolean; showAvgLine?: boolean } = {}) {
  const pillarIds: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Pillars:</span>
      {pillarIds.map(p => (
        <div key={p} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PILLAR_COLORS[p] }} />
          <span className="text-xs text-muted-foreground">{PILLAR_ABBREV[p]}</span>
        </div>
      ))}
      {showExpectedLine && (
        <>
          <span className="text-[10px] text-muted-foreground ml-2">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dashed" style={{ borderColor: '#DC2626' }} />
            <span className="text-xs text-muted-foreground">Expected Progress</span>
          </div>
        </>
      )}
      {showAvgLine && (
        <>
          <span className="text-[10px] text-muted-foreground ml-2">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dashed" style={{ borderColor: '#6B7280' }} />
            <span className="text-xs text-muted-foreground">Average Utilization</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Diagnostic Bar ──────────────────────────────────────────────── */

function DiagnosticBar({ label, value, max, suffix, color }: {
  label: string; value: number; max: number; suffix: string; color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-muted-foreground mb-1">{label}</span>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold mt-0.5" style={{ color }}>{value}{suffix}</span>
    </div>
  );
}

/* ─── KPI Card ────────────────────────────────────────────────────── */

function KPICard({ label, value, icon: Icon, color, subtitle, tooltip: tipText }: {
  label: string; value: string; icon: React.ElementType; color: string; subtitle?: string; tooltip?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none" style={{ backgroundColor: color }} />
      <div className="relative p-5 sm:p-6 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 flex-1">
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="min-h-[32px] sm:min-h-[36px] flex flex-col justify-start">
              <div className="flex items-center gap-1">
                <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
                  {label.split(' — ')[0]}
                </p>
                {tipText && <InfoTip text={tipText} />}
              </div>
              {label.includes(' — ') && (
                <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 mt-0.5 font-medium">{label.split(' — ')[1]}</p>
              )}
            </div>
            <p className="text-xl sm:text-2xl font-display font-extrabold mt-2 tracking-tight" style={{ color }}>{value}</p>
            {subtitle && <p className="text-[10px] sm:text-xs font-semibold mt-0.5" style={{ color }}>{subtitle}</p>}
          </div>
          <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: `${color}14` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
