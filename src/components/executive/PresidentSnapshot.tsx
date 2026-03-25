/**
 * Tab 1 — Executive Snapshot
 * SSI + Progress + Commitment/Spending Ratios + RI + Completion KPIs
 * Execution/Budget Focus + Descriptive Alignment Insights
 * Pillar Execution Diagnostics (All/Single Pillar)
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, TrendingUp, DollarSign,
  ShieldAlert, Lightbulb, Info, Eye, BarChart3, Target,
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
import { getItemStatus, getItemCompletion, computeExpectedProgress } from '@/lib/intelligence';
import { isNotApplicableStatus } from '@/lib/types';
import { PILLAR_COLORS, PILLAR_COLOR_LABELS, computeSSI } from '@/lib/pillar-colors';
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

const roundPercent = (value: number) => Math.round(value * 10) / 10;
const formatSignedPercent = (value: number) => {
  const rounded = roundPercent(value);
  const abs = Math.abs(rounded);
  const formatted = Number.isInteger(rounded) ? abs.toFixed(0) : abs.toFixed(1);
  return `${rounded >= 0 ? '+' : '-'}${formatted}%`;
};

/** Descriptive alignment insight for a pillar based on execution & budget ratios */
function getAlignmentInsight(progress: number, commitmentRatio: number, spendingRatio: number, expectedProgress: number): {
  label: string; color: string; badges: string[];
} {
  const commitPct = commitmentRatio * 100;
  const spendPct = spendingRatio * 100;
  const gap = progress - expectedProgress;
  const badges: string[] = [];

  if (gap > 5) badges.push('Ahead of schedule');
  else if (gap < -5) badges.push('Behind schedule');

  let label: string;
  let color: string;

  if (progress > 50 && spendPct < 30) {
    label = 'High execution with low spending (efficient deployment)';
    color = '#065F46';
  } else if (spendPct > 50 && progress < 30) {
    label = 'High spending with low execution (potential inefficiency)';
    color = '#DC2626';
    badges.push('Spending intensive');
  } else if (Math.abs(progress - commitPct) < 20 && Math.abs(progress - spendPct) < 20) {
    label = 'Balanced execution and funding';
    color = '#3B82F6';
    badges.push('Stable alignment');
  } else if (progress > 40 && commitPct < 20) {
    label = 'Under-resourced execution (progress high, funds low)';
    color = '#D97706';
    badges.push('Resource constrained');
  } else if (commitPct > 50 && progress < commitPct - 20) {
    label = 'Front-loaded spending (funds high, progress lagging)';
    color = '#F97316';
    badges.push('Spending intensive');
  } else if (commitPct > 40 && progress < 20) {
    label = 'High funding with limited output (delivery risk)';
    color = '#DC2626';
  } else {
    label = 'Low activity on both dimensions';
    color = '#6B7280';
  }

  return { label, color, badges };
}

export default function PresidentSnapshot({ aggregation }: Props) {
  const [focusMode, setFocusMode] = useState<FocusMode>('execution');
  const [pillarView, setPillarView] = useState<PillarViewMode>('all');
  const { viewType, term, academicYear } = useDashboard();
  const { data: unitResults } = useUniversityData();
  const { data: budgetResult } = useBudgetData();
  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  // Budget totals
  const budgetTotals = useMemo(() => {
    if (!budgetResult?.pillars) return { committed: 0, spent: 0, allocation: 0, available: 0 };
    const pillars: PillarId[] = ['I','II','III','IV','V'];
    let totalCommitted = 0, totalAllocation = 0, totalSpent = 0, totalAvailable = 0;
    pillars.forEach(p => {
      const b = getLivePillarBudget(budgetResult.pillars, p);
      totalCommitted += b.committed;
      totalAllocation += b.allocation;
      totalSpent += b.spent;
      totalAvailable += b.available;
    });
    return { committed: totalCommitted, spent: totalSpent, allocation: totalAllocation, available: totalAvailable };
  }, [budgetResult]);

  const commitmentRatio = budgetTotals.allocation > 0 ? budgetTotals.committed / budgetTotals.allocation : 0;
  const spendingRatio = budgetTotals.allocation > 0 ? budgetTotals.spent / budgetTotals.allocation : 0;

  // Budget health
  const budgetHealth = useMemo(() => {
    return getBudgetHealthLabel(budgetTotals.available, budgetTotals.allocation);
  }, [budgetTotals]);

  // Expected Progress
  const expectedProgress = useMemo(() => computeExpectedProgress(viewType, academicYear), [viewType, academicYear]);

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
      const pCommitmentRatio = b.allocation > 0 ? b.committed / b.allocation : 0;
      const pSpendingRatio = b.allocation > 0 ? b.spent / b.allocation : 0;
      const pa = pillarAgg.find(p => p.pillar === pillar);
      const riskIndex = pa?.riskIndex ?? 0;
      const completionPct = pa?.completionPct ?? 0;

      const riPct = parseFloat(((riskIndex / 3) * 100).toFixed(1));
      const onTargetShare = applicableItems > 0 ? parseFloat((cotCount / applicableItems * 100).toFixed(1)) : 0;
      const belowTargetShare = applicableItems > 0 ? parseFloat((cbtCount / applicableItems * 100).toFixed(1)) : 0;
      const bHealth = getBudgetHealthLabel(b.available, b.allocation);
      const executionGap = actualProgress - expectedProgress;

      return {
        pillar, actualProgress, commitmentRatio: pCommitmentRatio, spendingRatio: pSpendingRatio,
        riskIndex, riPct, completionPct,
        applicableItems, hasItems,
        executionGap,
        totalItems, naCount, cotCount, cbtCount, inProgressCount, notStartedCount,
        onTargetShare, belowTargetShare, budgetHealth: bHealth,
        allocated: b.allocation, spent: b.spent, available: b.available, committed: b.committed,
      };
    });
  }, [unitResults, budgetResult, pillarAgg, viewType, term, academicYear, expectedProgress]);

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

  // SSI
  const riPctOverall = parseFloat(((aggregation.riskIndex / 3) * 100).toFixed(1));
  const commitmentRatioPct = parseFloat((commitmentRatio * 100).toFixed(1));
  const ssi = useMemo(() => computeSSI(overallActualProgress, commitmentRatioPct, riPctOverall), [overallActualProgress, commitmentRatioPct, riPctOverall]);

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
    items.push({ title: 'Budget Position', insight: `Commitment ratio at ${(commitmentRatio * 100).toFixed(1)}% — ${budgetHealth.label}. Spending ratio at ${(spendingRatio * 100).toFixed(1)}%.`, icon: DollarSign, color: budgetHealth.color });
    return items.slice(0, 4);
  }, [pillarData, commitmentRatio, spendingRatio, expectedProgress, budgetHealth]);

  const selectedPillarData = pillarView !== 'all' ? pillarData.find(p => p.pillar === pillarView) : null;

  return (
    <div className="space-y-8">
      {/* Pillar Reference Panel */}
      <PillarReferencePanel />

      {/* KPI Cards */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          <KPICard label="SSI" value={`${ssi.value}%`} color={ssi.color} subtitle={ssi.label} tooltip="Integrated signal combining progress, budget alignment, and risk exposure to reflect overall strategic stability." />
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
          {/* Commitment Ratio KPI */}
          <KPICard label="Commitment Ratio" value={`${(commitmentRatio * 100).toFixed(1)}%`} color={budgetHealth.color} subtitle={budgetHealth.label} tooltip="Committed ÷ Allocated. Reflects total financial commitment against planned allocation." />
          {/* Spending Ratio KPI */}
          <KPICard label="Spending Ratio" value={`${(spendingRatio * 100).toFixed(1)}%`} color={spendingRatio > 0.7 ? '#EF4444' : spendingRatio > 0.4 ? '#F59E0B' : '#16A34A'} subtitle="Spent ÷ Allocated" tooltip="Spent ÷ Allocated. Indicates proportion of budget actually disbursed." />
          <KPICard label="Risk Index" value={`${riInfo.percent}%`} color={riInfo.color} subtitle={riInfo.band} tooltip="Risk Index reflects exposure to delivery risk based on emerging, critical, and realized signals." />
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
              <InfoTip text="View Progress or Commitment Ratio per pillar. Alignment Insights provide per-pillar interpretation." />
            </div>
            <div className="flex items-center rounded-xl border border-border bg-muted/30 p-1">
              {([
                { key: 'execution' as FocusMode, label: '📊 Execution', icon: BarChart3 },
                { key: 'budget' as FocusMode, label: '💰 Budget', icon: DollarSign },
              ]).map(m => (
                <button key={m.key} onClick={() => setFocusMode(m.key)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${focusMode === m.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {focusMode === 'execution' && <ExecutionFocusChart pillarData={pillarData} expectedProgress={expectedProgress} />}
          {focusMode === 'budget' && <BudgetFocusChart pillarData={pillarData} />}

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

function AlignmentInsights({ pillarData, expectedProgress }: { pillarData: any[]; expectedProgress: number }) {
  const categories = pillarData.map(p => {
    const insight = getAlignmentInsight(p.actualProgress, p.commitmentRatio, p.spendingRatio, expectedProgress);
    return { ...p, insight };
  });

  // Global alignment summary
  const behindCount = categories.filter(c => c.actualProgress < expectedProgress - 5).length;
  const highSpendLowExec = categories.filter(c => c.spendingRatio > 0.4 && c.actualProgress < 30).length;

  const summaryLines: string[] = [];
  if (behindCount === 0) {
    summaryLines.push('All pillars are tracking at or above expected execution pace relative to the academic timeline.');
  } else {
    summaryLines.push(`${behindCount} of 5 pillars are behind expected progress, indicating schedule pressure in those areas.`);
  }
  const avgCommitment = categories.reduce((s, c) => s + c.commitmentRatio, 0) / (categories.length || 1);
  const avgSpending = categories.reduce((s, c) => s + c.spendingRatio, 0) / (categories.length || 1);
  if (avgCommitment > 0.6 && behindCount > 2) {
    summaryLines.push('High overall commitment levels combined with lagging execution suggest resource deployment is not translating into proportional progress.');
  } else if (avgSpending < 0.2 && behindCount > 0) {
    summaryLines.push('Low spending ratios alongside execution delays may indicate resource constraints or deployment bottlenecks.');
  }
  if (highSpendLowExec > 0) {
    summaryLines.push(`${highSpendLowExec} pillar${highSpendLowExec > 1 ? 's show' : ' shows'} elevated spending with limited execution output, warranting efficiency review.`);
  }

  const badgeTone = (badge: string): string => {
    switch (badge) {
      case 'Ahead of schedule':
        return 'bg-primary/15 text-primary';
      case 'Behind schedule':
        return 'bg-destructive/15 text-destructive';
      case 'Resource constrained':
        return 'bg-amber-500/15 text-amber-600';
      case 'Spending intensive':
        return 'bg-orange-500/15 text-orange-600';
      case 'Stable alignment':
        return 'bg-emerald-500/15 text-emerald-600';
      default:
        return 'bg-muted/40 text-muted-foreground';
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Execution–Budget Alignment Insights</span>
        <InfoTip text="Per-pillar descriptive diagnosis of execution and funding alignment. Execution Gap is the primary highlighted signal." />
      </div>
      {/* Global Alignment Diagnosis */}
      {summaryLines.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1">
          {summaryLines.map((s, i) => (
            <p key={i} className="text-xs text-foreground leading-relaxed flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />{s}</p>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {categories.map(p => {
           const gap = roundPercent(p.executionGap);
           return (
             <div key={p.pillar} className="rounded-xl border border-border/40 p-4 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: PILLAR_COLORS[p.pillar as PillarId] }} />
               <div className="flex items-center gap-2 mb-3 mt-1">
                 <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PILLAR_COLORS[p.pillar as PillarId] }} />
                 <span className="text-xs font-semibold text-foreground">{PILLAR_SHORT[p.pillar as PillarId]}</span>
               </div>
               <div className="space-y-2 text-[11px]">
                 <div className="flex justify-between"><span className="text-foreground">Progress</span><span className="font-bold text-foreground">{p.actualProgress}%</span></div>
                 <div className="flex justify-between"><span className="text-foreground">Commitment Ratio</span><span className="font-bold text-foreground">{(p.commitmentRatio * 100).toFixed(1)}%</span></div>
                 <div className="flex justify-between"><span className="text-foreground">Spending Ratio</span><span className="font-bold text-foreground">{(p.spendingRatio * 100).toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-foreground">Execution Gap</span><span className="font-bold" style={{ color: gap >= 0 ? '#16A34A' : '#DC2626' }}>{formatSignedPercent(gap)}</span></div>
              </div>
              {/* Diagnostic insight */}
              <p className="text-[10px] text-foreground mt-3 leading-relaxed border-t border-border/30 pt-2">{p.insight.label}</p>
              {/* Optional badges */}
              {p.insight.badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.insight.badges.map((badge: string) => (
                    <span key={badge} className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${badgeTone(badge)}`}>{badge}</span>
                  ))}
                </div>
              )}
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

/* ─── Budget Focus (no average line) ──────────────────────────────── */

function BudgetFocusChart({ pillarData }: { pillarData: any[] }) {
  const chartData = pillarData.map(p => ({
    label: PILLAR_ABBREV[p.pillar as PillarId], pillar: p.pillar,
    commitmentRatio: parseFloat((p.commitmentRatio * 100).toFixed(1)),
    spendingRatio: parseFloat((p.spendingRatio * 100).toFixed(1)),
    fullLabel: PILLAR_FULL[p.pillar as PillarId],
    allocated: p.allocated, spent: p.spent, committed: p.committed,
  }));
  return (
    <>
      <div className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 25, right: 20, bottom: 25, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Ratio %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
            <ReTooltip content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                  <p className="font-semibold text-foreground">{d.fullLabel}</p>
                  <p className="text-muted-foreground">Commitment Ratio: <span className="text-foreground font-medium">{d.commitmentRatio}%</span></p>
                  <p className="text-muted-foreground">Spending Ratio: <span className="text-foreground font-medium">{d.spendingRatio}%</span></p>
                  <p className="text-muted-foreground">Allocated: <span className="text-foreground font-medium">{formatCurrencyFull(d.allocated)}</span></p>
                  <p className="text-muted-foreground">Committed: <span className="text-foreground font-medium">{formatCurrencyFull(d.committed)}</span></p>
                  <p className="text-muted-foreground">Spent: <span className="text-foreground font-medium">{formatCurrencyFull(d.spent)}</span></p>
                </div>
              );
            }} />
            <Bar dataKey="commitmentRatio" name="Commitment Ratio" radius={[4, 4, 0, 0]} maxBarSize={24}>
              <LabelList dataKey="commitmentRatio" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--foreground))' }} />
              {chartData.map((d, i) => (<Cell key={i} fill={PILLAR_COLORS[d.pillar as PillarId]} fillOpacity={0.85} />))}
            </Bar>
            <Bar dataKey="spendingRatio" name="Spending Ratio" radius={[4, 4, 0, 0]} maxBarSize={24}>
              <LabelList dataKey="spendingRatio" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--foreground))' }} />
              {chartData.map((d, i) => (<Cell key={i} fill={PILLAR_COLORS[d.pillar as PillarId]} fillOpacity={0.45} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Pillars:</span>
        {(['I','II','III','IV','V'] as PillarId[]).map(p => (
          <div key={p} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PILLAR_COLORS[p] }} />
            <span className="text-xs text-muted-foreground">{PILLAR_ABBREV[p]}</span>
          </div>
        ))}
        <span className="text-[10px] text-muted-foreground ml-2">|</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm shrink-0 opacity-85" style={{ backgroundColor: '#6B7280' }} />
          <span className="text-xs text-muted-foreground">Commitment (solid)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm shrink-0 opacity-45" style={{ backgroundColor: '#6B7280' }} />
          <span className="text-xs text-muted-foreground">Spending (lighter)</span>
        </div>
      </div>
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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + idx * 0.04 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:border-border/70 transition-all duration-300 overflow-hidden"
    >
      {/* Accent bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${pillarColor}, ${pillarColor}66)` }} />
      <div className="p-5">
        {/* Full-width row layout */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          {/* Col 1: Pillar identity + badges */}
          <div className="flex items-center gap-3 md:w-[200px] shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${pillarColor}18`, border: `1px solid ${pillarColor}30` }}>
              <span className="text-xs font-bold" style={{ color: pillarColor }}>{p.pillar}</span>
            </div>
            <div className="min-w-0">
              <Tooltip><TooltipTrigger asChild><p className="text-sm font-semibold text-foreground cursor-help truncate">{PILLAR_SHORT[p.pillar as PillarId]}</p></TooltipTrigger><TooltipContent><p className="text-xs">{PILLAR_FULL[p.pillar as PillarId]}</p></TooltipContent></Tooltip>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg text-white" style={{ backgroundColor: riInfo.color }}>{riInfo.percent}%</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: `${pStatus.color}15`, color: pStatus.color }}>{pStatus.label}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Status Distribution donut */}
          <div className="md:w-[180px] shrink-0">
            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider mb-1.5">Status Distribution</p>
            <div className="flex items-center gap-2">
              <div className="w-[48px] h-[48px] shrink-0">
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

          {/* Col 3: Applicability donut */}
          <div className="md:w-[150px] shrink-0">
            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider mb-1.5">Applicability</p>
            <div className="flex items-center gap-2">
              <div className="w-[48px] h-[48px] shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={applicabilityDonut} innerRadius="42%" outerRadius="92%" dataKey="value" strokeWidth={0}>
                      {applicabilityDonut.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-0.5 text-[10px]">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pillarColor }} /><span className="text-foreground">App: <span className="font-bold">{p.applicableItems}</span></span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6B7280] shrink-0" /><span className="text-foreground">N/A: <span className="font-bold">{p.naCount}</span></span></div>
              </div>
            </div>
          </div>

          {/* Col 4: Progress + Risk bars */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-foreground font-medium">Risk Index</span>
                <span className="font-bold" style={{ color: riInfo.color }}>{riInfo.percent}% — {riInfo.band}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, riInfo.percent)}%` }} transition={{ delay: 0.3, duration: 0.5 }} className="h-full rounded-full" style={{ backgroundColor: riInfo.color }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-foreground font-medium">Progress</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold" style={{ color: pillarColor }}>{p.actualProgress}%</span>
                  <span className="text-foreground/70">/ {expectedProgress}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden relative">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.actualProgress)}%`, backgroundColor: pillarColor }} />
                <div className="absolute top-0 h-full w-0.5 bg-destructive" style={{ left: `${Math.min(100, expectedProgress)}%` }} />
              </div>
            </div>
          </div>

          {/* Col 5: Budget Health */}
          <div className="md:w-[100px] shrink-0 flex md:flex-col items-center md:items-end gap-1">
            <span className="text-[10px] text-foreground font-medium">Budget</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: `${bHealth.color}15`, color: bHealth.color }}>{bHealth.label}</span>
          </div>
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
        <div className="rounded-xl border border-border/40 p-4">
          <h4 className="text-xs font-semibold text-foreground uppercase mb-3">Progress Distribution</h4>
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

        <div className="rounded-xl border border-border/40 p-4">
          <h4 className="text-xs font-semibold text-foreground uppercase mb-3">Applicability</h4>
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
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PILLAR_COLORS[p.pillar as PillarId] }} /><span className="text-[10px] text-foreground">Applicable: <span className="font-bold">{p.applicableItems}</span></span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#6B7280] shrink-0" /><span className="text-[10px] text-foreground">N/A: <span className="font-bold">{p.naCount}</span></span></div>
              <p className="text-[10px] text-foreground mt-1">Total: {p.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 p-4">
          <h4 className="text-xs font-semibold text-foreground uppercase mb-3">Risk Index</h4>
          <p className="text-2xl font-bold" style={{ color: riInfo.color }}>{riInfo.percent}%</p>
          <p className="text-[10px] font-semibold mt-0.5" style={{ color: riInfo.color }}>{riInfo.band}</p>
          <div className="h-3 rounded-full bg-muted overflow-hidden mt-3">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, riInfo.percent)}%` }} transition={{ delay: 0.3, duration: 0.5 }} className="h-full rounded-full" style={{ backgroundColor: riInfo.color }} />
          </div>
          <div className="mt-3"><RIMeter ri={p.riskIndex} compact /></div>
          <p className="text-[10px] text-foreground mt-2 leading-relaxed">{riInfo.insight}</p>
        </div>
      </div>

      {/* Row 2: Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border/40 p-3">
          <p className="text-[10px] text-foreground mb-1">Progress vs Expected</p>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold" style={{ color: PILLAR_COLORS[p.pillar as PillarId] }}>{p.actualProgress}%</span>
            <span className="text-[10px] text-foreground/70">/ {expectedProgress}%</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${pStatus.color}15`, color: pStatus.color }}>{pStatus.label}</span>
          <div className="h-2 rounded-full bg-muted overflow-hidden mt-2 relative">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.actualProgress)}%`, backgroundColor: PILLAR_COLORS[p.pillar as PillarId] }} />
            <div className="absolute top-0 h-full w-0.5 bg-[#DC2626]" style={{ left: `${Math.min(100, expectedProgress)}%` }} />
          </div>
        </div>
        <div className="rounded-lg border border-border/40 p-3">
          <p className="text-[10px] text-foreground mb-1">Completion Rate</p>
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
          <p className="text-[10px] text-foreground mb-1">Commitment Ratio</p>
          <span className="text-lg font-bold text-foreground">{(p.commitmentRatio * 100).toFixed(1)}%</span>
          <p className="text-[10px] text-foreground mt-1">Committed ÷ Allocated</p>
        </div>
        <div className="rounded-lg border border-border/40 p-3">
          <p className="text-[10px] text-foreground mb-1">Spending Ratio</p>
          <span className="text-lg font-bold text-foreground">{(p.spendingRatio * 100).toFixed(1)}%</span>
          <p className="text-[10px] text-foreground mt-1">Spent ÷ Allocated</p>
        </div>
      </div>

      {/* Row 3: Executive Narrative */}
      <div className="rounded-xl border border-border/40 p-4">
        <h4 className="text-xs font-semibold text-foreground uppercase mb-2">Executive Summary</h4>
        <p className="text-xs text-foreground leading-relaxed">
          {getMicroInsight(p, bHealth.label)} {p.belowTargetShare > 15 ? ` Below-target share at ${p.belowTargetShare}% warrants quality review.` : ''} {p.notStartedCount > p.applicableItems * 0.3 ? ` ${p.notStartedCount} items remain unstarted.` : ''}
        </p>
      </div>
    </div>
  );
}

/* ─── Helper Components ──────────────────────────────────────────── */

function StatusLegend({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-foreground">{label}: <span className="font-bold">{value}</span></span>
    </div>
  );
}

function PillarLegendStrip({ showExpectedLine }: { showExpectedLine?: boolean } = {}) {
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
    </div>
  );
}

/* ─── KPI Card ────────────────────────────────────────────────────── */

function KPICard({ label, value, color, subtitle, tooltip: tipText }: {
  label: string; value: string; color: string; subtitle?: string; tooltip?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2, transition: { duration: 0.2 } }} className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none" style={{ backgroundColor: color }} />
      <div className="relative p-4 sm:p-5 flex flex-col h-full">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-1">
            <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-tight">{label}</p>
            {tipText && <InfoTip text={tipText} />}
          </div>
          <p className="text-xl sm:text-2xl font-display font-extrabold mt-1.5 tracking-tight" style={{ color }}>{value}</p>
          {subtitle && <p className="text-[10px] sm:text-xs font-semibold mt-0.5" style={{ color }}>{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
}
