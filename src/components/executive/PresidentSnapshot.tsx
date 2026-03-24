/**
 * Tab 1 — Executive Snapshot
 * SEEI + SSI + Progress + Budget Util + RI + Completion KPIs
 * Execution/Budget Focus + Alignment Insights
 * Pillar Execution Diagnostics (All/Single Pillar)
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, TrendingUp, DollarSign,
  ShieldAlert, Lightbulb, Info, Gauge, Activity, Eye, BarChart3, Target,
} from 'lucide-react';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, ReferenceLine,
  LabelList, PieChart, Pie,
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
import { PILLAR_LABELS, getLivePillarBudget, formatCurrency, formatCurrencyFull, computeBudgetHealth } from '@/lib/budget-data';
import { useBudgetData } from '@/hooks/use-budget-data';
import { PILLAR_SHORT, PILLAR_FULL, PILLAR_ABBREV } from '@/lib/pillar-labels';
import { getItemStatus, getItemCompletion } from '@/lib/intelligence';
import { isNotApplicableStatus } from '@/lib/types';
import { PILLAR_COLORS, PILLAR_COLOR_LABELS, computeSSI, getAlignmentStatus, getAlignmentColor } from '@/lib/pillar-colors';
import PillarViewSelector, { type PillarViewMode } from './PillarViewSelector';
import type { PillarId } from '@/lib/types';

interface Props {
  aggregation: UniversityAggregation;
}

type FocusMode = 'execution' | 'budget';

function getBudgetHealthLabel(available: number, allocation: number): { label: string; color: string } {
  const h = computeBudgetHealth(available, allocation);
  return { label: h.health, color: h.color };
}

function getExecutiveStatusLabel(completionPct: number, riPct: number, budgetHealth: string): string {
  if (riPct >= 50 && completionPct < 30) return 'Intervention Required';
  if (riPct >= 50) return 'At Risk';
  if (completionPct < 20) return 'Under-Activated';
  if (completionPct >= 70 && riPct < 25) return 'Efficient Execution';
  if (completionPct >= 50 && riPct < 40) return 'Stable';
  return 'Needs Attention';
}

function getExecStatusColor(status: string): string {
  switch (status) {
    case 'Efficient Execution': return '#065F46';
    case 'Stable': return '#16A34A';
    case 'Needs Attention': return '#D97706';
    case 'At Risk': return '#DC2626';
    case 'Under-Activated': return '#F97316';
    case 'Intervention Required': return '#7F1D1D';
    default: return '#6B7280';
  }
}

function getMicroInsight(p: any, budgetHealth: string): string {
  const riPct = p.riPct;
  const naPct = p.totalItems > 0 ? (p.naCount / p.totalItems * 100) : 0;

  if (naPct > 40) return 'High Not Applicable share suggests limited operational relevance at this stage.';
  if (p.completionPct >= 70 && p.belowTargetShare < 10 && riPct < 25) return 'Strong completion quality with low risk exposure and healthy financial capacity.';
  if (p.inProgressCount > p.applicableItems * 0.5) return 'Execution remains active, but closure quality is moderate and funding flexibility is tightening.';
  if (riPct >= 50 && p.completionPct < 40) return 'Elevated RI with low completion points to unresolved execution issues.';
  if (budgetHealth === 'Critical') return 'Critical financial capacity suggests limited flexibility despite continuing execution.';
  if (p.completionPct >= 50 && riPct < 30) return 'Solid execution momentum with manageable risk. Monitor below-target items.';
  return 'High applicability with uneven completion and rising risk requires closer monitoring.';
}

function getProgressStatus(actual: number, expected: number, tolerance: number = 5): { label: string; color: string } {
  if (actual > expected + tolerance) return { label: 'Ahead of Plan', color: '#065F46' };
  if (actual >= expected - tolerance) return { label: 'On Track', color: '#16A34A' };
  return { label: 'Behind Plan', color: '#DC2626' };
}

export default function PresidentSnapshot({ aggregation }: Props) {
  const [focusMode, setFocusMode] = useState<FocusMode>('execution');
  const [pillarView, setPillarView] = useState<PillarViewMode>('all');
  const { viewType, term, academicYear } = useDashboard();
  const { data: unitResults } = useUniversityData();
  const { data: budgetResult } = useBudgetData();
  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  // Budget Utilization
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

  // Budget health
  const budgetHealth = useMemo(() => {
    if (!budgetResult?.pillars) return { label: 'N/A', color: '#6B7280' };
    const pillars: PillarId[] = ['I','II','III','IV','V'];
    let totalAvail = 0, totalAlloc = 0;
    pillars.forEach(p => {
      const b = getLivePillarBudget(budgetResult.pillars, p);
      totalAvail += b.available;
      totalAlloc += b.allocation;
    });
    return getBudgetHealthLabel(totalAvail, totalAlloc);
  }, [budgetResult]);

  // Expected Progress
  // Expected Progress based on academic year timelines (Sep–Aug), NOT terms
  const expectedProgress = useMemo(() => {
    if (viewType === 'cumulative') {
      const windowStart = new Date(2025, 8, 1); // Sep 1, 2025
      const windowEnd = new Date(2027, 7, 31);  // Aug 31, 2027
      const now = new Date();
      const totalMs = windowEnd.getTime() - windowStart.getTime();
      const elapsedMs = Math.max(0, Math.min(now.getTime() - windowStart.getTime(), totalMs));
      return Math.round((elapsedMs / totalMs) * 100);
    }
    const [startYearStr] = academicYear.split('-');
    const startYear = parseInt(startYearStr);
    const windowStart = new Date(startYear, 8, 1);    // Sep 1
    const windowEnd = new Date(startYear + 1, 7, 31); // Aug 31
    const now = new Date();
    const totalMs = windowEnd.getTime() - windowStart.getTime();
    const elapsedMs = Math.max(0, Math.min(now.getTime() - windowStart.getTime(), totalMs));
    return Math.round((elapsedMs / totalMs) * 100);
  }, [viewType, academicYear]);

  // Pillar-level data
  const pillarData = useMemo(() => {
    if (!unitResults) return [];
    const pillarIds: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

    return pillarIds.map(pillar => {
      let sum = 0, count = 0;
      let totalItems = 0, naCount = 0, cotCount = 0, cbtCount = 0, inProgressCount = 0, notStartedCount = 0;
      unitResults.forEach(ur => {
        if (!ur.result) return;
        ur.result.data.forEach(item => {
          if (item.pillar !== pillar) return;
          totalItems++;
          const status = getItemStatus(item, viewType, term, academicYear);
          if (isNotApplicableStatus(status)) { naCount++; return; }
          switch (status) {
            case 'Completed – On Target': cotCount++; break;
            case 'Completed – Below Target': cbtCount++; break;
            case 'In Progress':
              inProgressCount++;
              sum += getItemCompletion(item, viewType, term, academicYear);
              count++;
              break;
            case 'Not Started': notStartedCount++; break;
          }
        });
      });
      const actualProgress = count > 0 ? Math.round(sum / count) : 0;
      const hasItems = count > 0;
      const applicableItems = totalItems - naCount;

      const b = getLivePillarBudget(budgetResult?.pillars, pillar);
      const budgetUtil = b.allocation > 0 ? parseFloat(((b.committed / b.allocation) * 100).toFixed(1)) : 0;
      const pa = pillarAgg.find(p => p.pillar === pillar);
      const riskIndex = pa?.riskIndex ?? 0;
      const completionPct = pa?.completionPct ?? 0;

      const riPct = parseFloat(((riskIndex / 3) * 100).toFixed(1));
      const alignment = getAlignmentStatus(actualProgress, budgetUtil, riskIndex);
      const onTargetShare = applicableItems > 0 ? parseFloat((cotCount / applicableItems * 100).toFixed(1)) : 0;
      const belowTargetShare = applicableItems > 0 ? parseFloat((cbtCount / applicableItems * 100).toFixed(1)) : 0;
      const bHealth = getBudgetHealthLabel(b.available, b.allocation);

      return {
        pillar, actualProgress, budgetUtil, riskIndex, riPct, completionPct,
        applicableItems, hasItems,
        gap: actualProgress - budgetUtil, alignment,
        totalItems, naCount, cotCount, cbtCount, inProgressCount, notStartedCount,
        onTargetShare, belowTargetShare, budgetHealth: bHealth,
        allocated: b.allocation, spent: b.spent, available: b.available,
      };
    });
  }, [unitResults, budgetResult, pillarAgg, viewType, term, academicYear]);

  // Overall Actual Progress
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

  // SEEI
  const seei = useMemo(() => {
    const effectiveUtil = budgetUtilization <= 0 ? 1 : budgetUtilization;
    const raw = overallActualProgress / effectiveUtil;
    const pct = Math.min(100, parseFloat((raw * 100).toFixed(1)));
    let label: string, color: string;
    if (raw >= 1.20) { label = 'Highly Efficient'; color = '#065F46'; }
    else if (raw >= 0.90) { label = 'Balanced Execution'; color = '#16A34A'; }
    else if (raw >= 0.60) { label = 'Efficiency Concern'; color = '#D97706'; }
    else { label = 'Critical Inefficiency'; color = '#DC2626'; }
    return { value: raw, percent: pct, label, color };
  }, [overallActualProgress, budgetUtilization]);

  // SSI
  const riPctOverall = parseFloat(((aggregation.riskIndex / 3) * 100).toFixed(1));
  const ssi = useMemo(() => computeSSI(overallActualProgress, budgetUtilization, riPctOverall), [overallActualProgress, budgetUtilization, riPctOverall]);

  const avgBudgetUtil = useMemo(() => {
    const vals = pillarData.map(d => d.budgetUtil);
    return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
  }, [pillarData]);

  const riInfo = getRiskDisplayInfo(aggregation.riskIndex);

  // Completion breakdown
  const cotTotal = aggregation.cotCount;
  const cbtTotal = aggregation.cbtCount;
  const completionPctOverall = aggregation.completionPct;
  const otPct = aggregation.applicableItems > 0 ? parseFloat((cotTotal / aggregation.applicableItems * 100).toFixed(1)) : 0;
  const btPct = aggregation.applicableItems > 0 ? parseFloat((cbtTotal / aggregation.applicableItems * 100).toFixed(1)) : 0;

  // Progress status relative to expected
  const progressStatus = getProgressStatus(overallActualProgress, expectedProgress);

  // Executive highlights
  const highlights = useMemo(() => {
    const items: { title: string; insight: string; icon: React.ElementType; color: string }[] = [];
    const behind = pillarData.filter(d => d.hasItems && d.actualProgress < expectedProgress);
    if (behind.length > 0) {
      const worst = [...behind].sort((a, b) => a.actualProgress - b.actualProgress)[0];
      items.push({
        title: 'Execution Pace',
        insight: `${behind.length} pillar${behind.length > 1 ? 's are' : ' is'} below expected progress; ${PILLAR_ABBREV[worst.pillar]} shows the largest delay at ${worst.actualProgress}% vs ${expectedProgress}% expected.`,
        icon: TrendingUp, color: '#D97706',
      });
    } else {
      items.push({ title: 'Execution Pace', insight: 'All pillars are tracking at or above expected timeline progress.', icon: TrendingUp, color: '#16A34A' });
    }
    const worstRisk = [...pillarData].sort((a, b) => b.riskIndex - a.riskIndex)[0];
    if (worstRisk) {
      const info = getRiskDisplayInfo(worstRisk.riskIndex);
      items.push({ title: 'Risk Concentration', insight: `Highest risk in ${PILLAR_ABBREV[worstRisk.pillar]} with RI ${formatRIPercent(worstRisk.riskIndex)} (${info.band}).`, icon: ShieldAlert, color: info.color });
    }
    items.push({ title: 'Budget Position', insight: `Budget utilization at ${budgetUtilization}% — ${budgetHealth.label}. ${pillarData.filter(p => p.budgetUtil > 80).length > 0 ? 'Pressure detected in some pillars.' : 'Allocation balanced across pillars.'}`, icon: DollarSign, color: budgetHealth.color });
    return items.slice(0, 4);
  }, [pillarData, budgetUtilization, expectedProgress, budgetHealth]);

  const selectedPillarData = pillarView !== 'all' ? pillarData.find(p => p.pillar === pillarView) : null;

  return (
    <div className="space-y-8">
      {/* Pillar Reference Panel */}
      <PillarReferencePanel />

      {/* KPI Cards */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          <KPICard label="SEEI" value={`${seei.percent}%`} icon={Gauge} color={seei.color} subtitle={seei.label} tooltip="Measures execution output relative to financial deployment. Higher values indicate stronger efficiency in converting spending into progress." />
          <KPICard label="SSI" value={`${ssi.value}%`} icon={Activity} color={ssi.color} subtitle={ssi.label} tooltip="Integrated signal combining progress, budget alignment, and risk exposure to reflect overall strategic stability." />
          {/* Progress KPI with Expected Progress comparison */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${progressStatus.color}, ${progressStatus.color}88)` }} />
            <div className="relative p-4 sm:p-5">
              <div className="flex items-center gap-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Progress</p>
                <InfoTip text="Average completion of all in-progress strategic items. Compared against Expected Progress derived from the reporting window." />
              </div>
              <p className="text-xl font-display font-extrabold mt-1" style={{ color: progressStatus.color }}>{overallActualProgress}%</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold mt-1 inline-block" style={{ backgroundColor: `${progressStatus.color}15`, color: progressStatus.color }}>{progressStatus.label}</span>
              <p className="text-[10px] text-muted-foreground mt-1">Expected {expectedProgress}%</p>
            </div>
          </motion.div>
          <KPICard label="Budget Utilization" value={`${budgetUtilization}%`} icon={DollarSign} color={budgetHealth.color} subtitle={budgetHealth.label} tooltip="Overall financial capacity. Healthy = ≥30% available. Watch = ≥15%. Critical = <15%. Reflects commitment level against total allocation." />
          <KPICard label="Risk Index" value={`${riInfo.percent}%`} icon={ShieldAlert} color={riInfo.color} subtitle={riInfo.band} tooltip="Risk Index reflects exposure to delivery risk based on emerging, critical, and realized signals." />
          {/* Completion with breakdown */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, #059669, #05966988)` }} />
            <div className="relative p-4 sm:p-5">
              <div className="flex items-center gap-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Completion</p>
                <InfoTip text="Overall Completion Rate across all applicable items. On Target = completed meeting expectations. Below Target = completed but below expectations." />
              </div>
              <p className="text-xl font-display font-extrabold mt-1" style={{ color: '#059669' }}>{completionPctOverall}%</p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> On Target
                  </span>
                  <span className="text-[10px] font-bold text-foreground">{cotTotal} ({otPct}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#7F1D1D]" /> Below Target
                  </span>
                  <span className="text-[10px] font-bold text-foreground">{cbtTotal} ({btPct}%)</span>
                </div>
              </div>
            </div>
          </motion.div>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {highlights.map((h, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-elevated p-4 sm:p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full rounded-r" style={{ backgroundColor: h.color }} />
              <div className="flex items-start gap-3 pl-2">
                <div className="p-2 rounded-lg bg-muted/50 mt-0.5"><h.icon className="w-4 h-4" style={{ color: h.color }} /></div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{h.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{h.insight}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Progress vs Budget Grouped Bar Chart with Focus Mode */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Execution & Budget Alignment by Pillar</span>
              <InfoTip text="View Progress or Budget Utilization per pillar. Alignment Insights provide per-pillar interpretation." />
            </div>
            <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
              {([
                { key: 'execution' as FocusMode, label: 'Execution' },
                { key: 'budget' as FocusMode, label: 'Budget' },
              ]).map(m => (
                <button key={m.key} onClick={() => setFocusMode(m.key)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${focusMode === m.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {focusMode === 'execution' && <ExecutionFocusChart pillarData={pillarData} expectedProgress={expectedProgress} />}
          {focusMode === 'budget' && <BudgetFocusChart pillarData={pillarData} avgBudgetUtil={avgBudgetUtil} />}

          {/* Execution–Budget Alignment Insights */}
          <AlignmentInsights pillarData={pillarData} expectedProgress={expectedProgress} />
        </motion.div>
      </section>

      {/* Pillar Execution Diagnostics */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Pillar Execution Diagnostics</span>
              <InfoTip text="Executive view of execution quality, applicability, completion behavior, risk exposure, and financial capacity by pillar." />
            </div>
            <PillarViewSelector value={pillarView} onChange={setPillarView} />
          </div>
          <p className="text-[10px] text-muted-foreground mb-5">Executive view of execution quality, applicability, completion behavior, risk exposure, and financial capacity by pillar.</p>

          {pillarView === 'all' ? (
            <AllPillarsDiagnostics pillarData={pillarData} expectedProgress={expectedProgress} />
          ) : (
            selectedPillarData && <SinglePillarDiagnostics data={selectedPillarData} pillarAgg={pillarAgg} expectedProgress={expectedProgress} />
          )}
        </motion.div>
      </section>
    </div>
  );
}

/* ─── Pillar Reference Panel ──────────────────────────────────────── */

function PillarReferencePanel() {
  const pillarIds: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-1.5 rounded-lg bg-muted"><Info className="w-4 h-4 text-muted-foreground" /></div>
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-foreground tracking-wide">Strategic Plan IV — Pillar Reference</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">These colors are used consistently across all Executive Command Center visualizations.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {pillarIds.map((p, i) => (
          <Tooltip key={p}>
            <TooltipTrigger asChild>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="group flex items-center sm:flex-col gap-3 sm:gap-2 p-3 rounded-xl border border-border/40 hover:border-border transition-colors cursor-help">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: PILLAR_COLORS[p], boxShadow: `0 0 0 3px ${PILLAR_COLORS[p]}25` }}>
                  <span className="text-sm font-bold text-white">{p}</span>
                </div>
                <div className="sm:text-center flex-1">
                  <span className="text-[11px] font-semibold text-foreground block leading-tight">{PILLAR_SHORT[p]}</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">{PILLAR_COLOR_LABELS[p]}</span>
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs"><p>{PILLAR_FULL[p]}</p></TooltipContent>
          </Tooltip>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Alignment Insights Panel ────────────────────────────────────── */

function getSEEIBand(progress: number, budgetUtil: number): { label: string; color: string; icon: string } {
  if (budgetUtil < 1 && progress < 1) return { label: 'Under-Activated', color: '#1D4ED8', icon: '🔵' };
  const effectiveUtil = budgetUtil <= 0 ? 1 : budgetUtil;
  const seeiRaw = (progress / effectiveUtil) * 100;
  if (seeiRaw >= 120) return { label: 'Highly Efficient', color: '#065F46', icon: '🟢' };
  if (seeiRaw >= 90) return { label: 'Balanced', color: '#16A34A', icon: '🟡' };
  if (seeiRaw >= 60) return { label: 'Concern', color: '#D97706', icon: '🟠' };
  return { label: 'Critical', color: '#DC2626', icon: '🔴' };
}

function AlignmentInsights({ pillarData, expectedProgress }: { pillarData: any[]; expectedProgress: number }) {
  // Generate summary
  const categories = pillarData.map(p => ({ ...p, alignment: getSEEIBand(p.actualProgress, p.budgetUtil) }));
  const healthy = categories.filter(c => c.alignment.label === 'Highly Efficient' || c.alignment.label === 'Balanced');
  const atRisk = categories.filter(c => c.alignment.label === 'Critical' || c.alignment.label === 'Concern');

  const summaryLines: string[] = [];
  if (healthy.length === 5) summaryLines.push('All pillars show balanced or highly efficient execution relative to spending.');
  else {
    if (healthy.length > 0) summaryLines.push(`${healthy.map(c => PILLAR_ABBREV[c.pillar as PillarId]).join(', ')} ${healthy.length === 1 ? 'shows' : 'show'} healthy execution efficiency.`);
    if (atRisk.length > 0) summaryLines.push(`${atRisk.map(c => PILLAR_ABBREV[c.pillar as PillarId]).join(', ')} ${atRisk.length === 1 ? 'requires' : 'require'} attention — execution efficiency is below expectations.`);
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Execution–Budget Alignment Insights</span>
      </div>
      {summaryLines.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1">
          {summaryLines.map((s, i) => (
            <p key={i} className="text-xs text-foreground leading-relaxed flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />{s}</p>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {categories.map(p => {
           const gap = p.actualProgress - p.budgetUtil;
           const effectiveUtil = p.budgetUtil <= 0 ? 1 : p.budgetUtil;
           const seeiRaw = Math.min(100, parseFloat(((p.actualProgress / effectiveUtil) * 100).toFixed(1)));
           const seeiColor = seeiRaw >= 100 ? '#065F46' : seeiRaw >= 90 ? '#16A34A' : seeiRaw >= 60 ? '#D97706' : '#DC2626';
           return (
             <div key={p.pillar} className="rounded-xl border border-border/40 p-4 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: PILLAR_COLORS[p.pillar as PillarId] }} />
               <div className="flex items-center gap-2 mb-3 mt-1">
                 <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PILLAR_COLORS[p.pillar as PillarId] }} />
                 <span className="text-xs font-semibold text-foreground">{PILLAR_SHORT[p.pillar as PillarId]}</span>
               </div>
               <div className="space-y-2 text-[11px]">
                 <div className="flex justify-between"><span className="text-muted-foreground">Progress</span><span className="font-bold" style={{ color: PILLAR_COLORS[p.pillar as PillarId] }}>{p.actualProgress}%</span></div>
                 <div className="flex justify-between"><span className="text-muted-foreground">Budget Util.</span><span className="font-bold text-foreground">{p.budgetUtil}%</span></div>
                 <div className="flex justify-between"><span className="text-muted-foreground">Execution Gap</span><span className="font-bold" style={{ color: gap >= 0 ? '#16A34A' : '#DC2626' }}>{gap >= 0 ? '+' : ''}{gap.toFixed(1)}%</span></div>
                 <div className="flex justify-between"><span className="text-muted-foreground">SEEI</span><span className="font-bold" style={{ color: seeiColor }}>{seeiRaw}%</span></div>
              </div>
              <div className="mt-3 pt-2 border-t border-border/30">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1" style={{ backgroundColor: `${p.alignment.color}15`, color: p.alignment.color }}>
                  <span>{p.alignment.icon}</span> {p.alignment.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Execution Focus ─────────────────────────────────────────────── */

function ExecutionFocusChart({ pillarData, expectedProgress }: { pillarData: any[]; expectedProgress: number }) {
  const chartData = pillarData.map(p => ({
    label: PILLAR_ABBREV[p.pillar as PillarId], pillar: p.pillar,
    actualProgress: p.hasItems ? p.actualProgress : 0, hasItems: p.hasItems,
    fullLabel: PILLAR_FULL[p.pillar as PillarId], gap: p.hasItems ? p.actualProgress - expectedProgress : null,
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
              {chartData.map((d, i) => (<Cell key={i} fill={d.hasItems ? PILLAR_COLORS[d.pillar as PillarId] : '#6B7280'} fillOpacity={d.hasItems ? 0.85 : 0.3} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <PillarLegendStrip showExpectedLine />
    </>
  );
}

/* ─── Budget Focus ────────────────────────────────────────────────── */

function BudgetFocusChart({ pillarData, avgBudgetUtil }: { pillarData: any[]; avgBudgetUtil: number }) {
  const chartData = pillarData.map(p => ({
    label: PILLAR_ABBREV[p.pillar as PillarId], pillar: p.pillar, budgetUtil: p.budgetUtil,
    fullLabel: PILLAR_FULL[p.pillar as PillarId], diff: parseFloat((p.budgetUtil - avgBudgetUtil).toFixed(1)),
    allocated: p.allocated, spent: p.spent,
  }));
  return (
    <>
      <div className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 25, right: 20, bottom: 25, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Budget Utilization %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
            <ReferenceLine y={avgBudgetUtil} stroke="#6B7280" strokeWidth={2.5} strokeDasharray="10 5" label={{ value: `Avg Budget Util. (${avgBudgetUtil}%)`, position: 'top', offset: 8, style: { fontSize: 11, fill: '#6B7280', fontWeight: 700 } }} />
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
              {chartData.map((d, i) => (<Cell key={i} fill={PILLAR_COLORS[d.pillar as PillarId]} fillOpacity={0.85} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <PillarLegendStrip showAvgLine />
    </>
  );
}

/* ─── All Pillars Diagnostics (graphical) ─────────────────────────── */

function AllPillarsDiagnostics({ pillarData, expectedProgress }: { pillarData: any[]; expectedProgress: number }) {
  return (
    <div className="space-y-4">
      {pillarData.map((p, idx) => (
        <PillarDiagCard key={p.pillar} p={p} idx={idx} expectedProgress={expectedProgress} />
      ))}
    </div>
  );
}

function PillarDiagCard({ p, idx, expectedProgress }: { p: any; idx: number; expectedProgress: number }) {
  const riInfo = getRiskDisplayInfo(p.riskIndex);
  const bHealth = p.budgetHealth;
  const pStatus = getProgressStatus(p.actualProgress, expectedProgress);
  const pillarColor = PILLAR_COLORS[p.pillar as PillarId];

  const progressDonut = [
    { name: 'On Target', value: p.cotCount, fill: '#16A34A' },
    { name: 'Below Target', value: p.cbtCount, fill: '#7F1D1D' },
    { name: 'In Progress', value: p.inProgressCount, fill: '#F59E0B' },
    { name: 'Not Started', value: p.notStartedCount, fill: '#EF4444' },
  ].filter(d => d.value > 0);

  const applicabilityDonut = [
    { name: 'Applicable', value: p.applicableItems, fill: pillarColor },
    { name: 'Not Applicable', value: p.naCount, fill: '#6B7280' },
  ].filter(d => d.value > 0);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + idx * 0.05 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:border-border/70 transition-all duration-300 overflow-hidden"
    >
      {/* Accent bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${pillarColor}, ${pillarColor}66)` }} />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${pillarColor}18`, border: `1px solid ${pillarColor}30` }}>
            <span className="text-xs font-bold" style={{ color: pillarColor }}>{p.pillar}</span>
          </div>
          <div className="flex-1 min-w-0">
            <Tooltip><TooltipTrigger asChild><p className="text-sm font-semibold text-foreground cursor-help truncate">{PILLAR_SHORT[p.pillar as PillarId]}</p></TooltipTrigger><TooltipContent><p className="text-xs">{PILLAR_FULL[p.pillar as PillarId]}</p></TooltipContent></Tooltip>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] font-bold px-2 py-1 rounded-lg text-white" style={{ backgroundColor: riInfo.color }}>{riInfo.percent}%</span>
            <span className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: `${pStatus.color}15`, color: pStatus.color }}>{pStatus.label}</span>
          </div>
        </div>

        {/* Charts row: Progress Donut + Applicability Donut */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Progress Distribution */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status Distribution</p>
            <div className="flex items-center gap-2">
              <div className="w-[52px] h-[52px] shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={progressDonut} innerRadius="42%" outerRadius="92%" dataKey="value" strokeWidth={0}>
                      {progressDonut.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-0.5">
                <StatusLegend label="OT" value={p.cotCount} color="#16A34A" />
                <StatusLegend label="BT" value={p.cbtCount} color="#7F1D1D" />
                <StatusLegend label="IP" value={p.inProgressCount} color="#F59E0B" />
                <StatusLegend label="NS" value={p.notStartedCount} color="#EF4444" />
              </div>
            </div>
          </div>
          {/* Applicability */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Applicability</p>
            <div className="flex items-center gap-2">
              <div className="w-[52px] h-[52px] shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={applicabilityDonut} innerRadius="42%" outerRadius="92%" dataKey="value" strokeWidth={0}>
                      {applicabilityDonut.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-0.5 text-[10px]">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pillarColor }} /><span className="text-muted-foreground">App: <span className="font-bold text-foreground">{p.applicableItems}</span></span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6B7280] shrink-0" /><span className="text-muted-foreground">N/A: <span className="font-bold text-foreground">{p.naCount}</span></span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Index bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground font-medium">Risk Index</span>
            <span className="font-bold" style={{ color: riInfo.color }}>{riInfo.percent}% — {riInfo.band}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, riInfo.percent)}%` }} transition={{ delay: 0.3, duration: 0.5 }} className="h-full rounded-full" style={{ backgroundColor: riInfo.color }} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground font-medium">Progress</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold" style={{ color: pillarColor }}>{p.actualProgress}%</span>
              <span className="text-muted-foreground/70">/ {expectedProgress}%</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden relative">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.actualProgress)}%`, backgroundColor: pillarColor }} />
            <div className="absolute top-0 h-full w-0.5 bg-destructive" style={{ left: `${Math.min(100, expectedProgress)}%` }} />
          </div>
        </div>

        {/* Budget Health footer */}
        <div className="pt-3 border-t border-border/30 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-medium">Budget Health</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: `${bHealth.color}15`, color: bHealth.color }}>{bHealth.label}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Single Pillar Diagnostics ──────────────────────────────────── */

function SinglePillarDiagnostics({ data: p, pillarAgg, expectedProgress }: { data: any; pillarAgg: any[]; expectedProgress: number }) {
  const riInfo = getRiskDisplayInfo(p.riskIndex);
  const bHealth = p.budgetHealth;
  const execStatus = getExecutiveStatusLabel(p.completionPct, p.riPct, bHealth.label);
  const execColor = getExecStatusColor(execStatus);
  const total = p.applicableItems || 1;
  const pStatus = getProgressStatus(p.actualProgress, expectedProgress);

  const progressDonut = [
    { name: 'On Target', value: p.cotCount, fill: '#16A34A' },
    { name: 'Below Target', value: p.cbtCount, fill: '#7F1D1D' },
    { name: 'In Progress', value: p.inProgressCount, fill: '#F59E0B' },
    { name: 'Not Started', value: p.notStartedCount, fill: '#EF4444' },
  ].filter(d => d.value > 0);

  const applicabilityDonut = [
    { name: 'Applicable', value: p.applicableItems, fill: PILLAR_COLORS[p.pillar as PillarId] },
    { name: 'Not Applicable', value: p.naCount, fill: '#6B7280' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${PILLAR_COLORS[p.pillar as PillarId]}18` }}>
            <span className="text-sm font-bold" style={{ color: PILLAR_COLORS[p.pillar as PillarId] }}>{p.pillar}</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{PILLAR_FULL[p.pillar as PillarId]}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${pStatus.color}15`, color: pStatus.color }}>{pStatus.label}</span>
        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold" style={{ backgroundColor: `${execColor}15`, color: execColor, border: `1px solid ${execColor}30` }}>{execStatus}</span>
      </div>

      {/* Row 1: Donut Charts + RI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Progress Distribution Donut */}
        <div className="rounded-xl border border-border/40 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Progress Distribution</h4>
          <div className="flex items-center gap-3">
            <div className="w-24 h-24 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={progressDonut} innerRadius="40%" outerRadius="85%" dataKey="value" strokeWidth={0}>
                    {progressDonut.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              <StatusLegend label="On Target" value={p.cotCount} color="#16A34A" />
              <StatusLegend label="Below Target" value={p.cbtCount} color="#7F1D1D" />
              <StatusLegend label="In Progress" value={p.inProgressCount} color="#F59E0B" />
              <StatusLegend label="Not Started" value={p.notStartedCount} color="#EF4444" />
            </div>
          </div>
        </div>

        {/* Applicability Donut */}
        <div className="rounded-xl border border-border/40 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Applicability</h4>
          <div className="flex items-center gap-3">
            <div className="w-24 h-24 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={applicabilityDonut} innerRadius="40%" outerRadius="85%" dataKey="value" strokeWidth={0}>
                    {applicabilityDonut.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PILLAR_COLORS[p.pillar as PillarId] }} /><span className="text-[10px] text-muted-foreground">Applicable: <span className="font-bold text-foreground">{p.applicableItems}</span></span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#6B7280] shrink-0" /><span className="text-[10px] text-muted-foreground">N/A: <span className="font-bold text-foreground">{p.naCount}</span></span></div>
              <p className="text-[10px] text-muted-foreground mt-1">Total: {p.totalItems}</p>
            </div>
          </div>
        </div>

        {/* Risk Index — Horizontal Bar */}
        <div className="rounded-xl border border-border/40 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Risk Index</h4>
          <p className="text-2xl font-bold" style={{ color: riInfo.color }}>{riInfo.percent}%</p>
          <p className="text-[10px] font-semibold mt-0.5" style={{ color: riInfo.color }}>{riInfo.band}</p>
          <div className="h-3 rounded-full bg-muted overflow-hidden mt-3">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, riInfo.percent)}%` }} transition={{ delay: 0.3, duration: 0.5 }} className="h-full rounded-full" style={{ backgroundColor: riInfo.color }} />
          </div>
          <div className="mt-3"><RIMeter ri={p.riskIndex} compact /></div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{riInfo.insight}</p>
        </div>
      </div>

      {/* Row 2: Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border/40 p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Progress vs Expected</p>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold" style={{ color: PILLAR_COLORS[p.pillar as PillarId] }}>{p.actualProgress}%</span>
            <span className="text-[10px] text-muted-foreground">/ {expectedProgress}%</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${pStatus.color}15`, color: pStatus.color }}>{pStatus.label}</span>
          <div className="h-2 rounded-full bg-muted overflow-hidden mt-2 relative">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.actualProgress)}%`, backgroundColor: PILLAR_COLORS[p.pillar as PillarId] }} />
            <div className="absolute top-0 h-full w-0.5 bg-[#DC2626]" style={{ left: `${Math.min(100, expectedProgress)}%` }} />
          </div>
        </div>
        <div className="rounded-lg border border-border/40 p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Completion Rate</p>
          <span className="text-lg font-bold" style={{ color: PILLAR_COLORS[p.pillar as PillarId] }}>{p.completionPct}%</span>
          <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.completionPct)}%`, backgroundColor: PILLAR_COLORS[p.pillar as PillarId] }} />
          </div>
          <div className="mt-1 flex items-center gap-2 text-[9px]">
            <span style={{ color: '#16A34A' }}>OT: {p.cotCount}</span>
            <span style={{ color: '#7F1D1D' }}>BT: {p.cbtCount}</span>
          </div>
        </div>
        <div className="rounded-lg border border-border/40 p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Budget Health</p>
          <span className="text-lg font-bold" style={{ color: bHealth.color }}>{bHealth.label}</span>
          {p.allocated > 0 && <p className="text-[10px] text-muted-foreground mt-1">{((p.available / p.allocated) * 100).toFixed(1)}% available</p>}
        </div>
        <div className="rounded-lg border border-border/40 p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Budget Utilization</p>
          <span className="text-lg font-bold text-foreground">{p.budgetUtil}%</span>
          <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.budgetUtil)}%`, backgroundColor: PILLAR_COLORS[p.pillar as PillarId], opacity: 0.5 }} />
          </div>
        </div>
      </div>

      {/* Row 3: Executive Narrative */}
      <div className="rounded-xl border border-border/40 p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Executive Summary</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {getMicroInsight(p, bHealth.label)} {p.belowTargetShare > 15 ? ` Below-target share at ${p.belowTargetShare}% warrants quality review.` : ''} {p.notStartedCount > p.applicableItems * 0.3 ? ` ${p.notStartedCount} items remain unstarted.` : ''}
        </p>
      </div>
    </div>
  );
}

/* ─── Helper Components ──────────────────────────────────────────── */

function MiniStat({ label, value, color, subtitle }: { label: string; value: string | number; color?: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-muted-foreground mb-0.5">{label}</span>
      <span className="text-sm font-bold" style={{ color }}>{value}</span>
      {subtitle && <span className="text-[9px] text-muted-foreground">{subtitle}</span>}
    </div>
  );
}

function MiniCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border/40 p-3 text-center">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function StatusLegend({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-muted-foreground">{label}: <span className="font-bold text-foreground">{value}</span></span>
    </div>
  );
}

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
          <div className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed" style={{ borderColor: '#DC2626' }} /><span className="text-xs text-muted-foreground">Expected Progress</span></div>
        </>
      )}
      {showAvgLine && (
        <>
          <span className="text-[10px] text-muted-foreground ml-2">|</span>
          <div className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed" style={{ borderColor: '#6B7280' }} /><span className="text-xs text-muted-foreground">Average Utilization</span></div>
        </>
      )}
    </div>
  );
}

/* ─── KPI Card ────────────────────────────────────────────────────── */

function KPICard({ label, value, icon: Icon, color, subtitle, tooltip: tipText }: {
  label: string; value: string; icon: React.ElementType; color: string; subtitle?: string; tooltip?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2, transition: { duration: 0.2 } }} className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none" style={{ backgroundColor: color }} />
      <div className="relative p-4 sm:p-5 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 flex-1">
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-1">
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-tight">{label}</p>
              {tipText && <InfoTip text={tipText} />}
            </div>
            <p className="text-xl sm:text-2xl font-display font-extrabold mt-1.5 tracking-tight" style={{ color }}>{value}</p>
            {subtitle && <p className="text-[10px] sm:text-xs font-semibold mt-0.5" style={{ color }}>{subtitle}</p>}
          </div>
          <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: `${color}14` }}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
