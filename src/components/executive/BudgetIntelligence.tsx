/**
 * Tab 3 — Budget Intelligence (CFO-Grade)
 * Financial governance with All/Single Pillar views.
 * Dynamic quadrant chart, per-pillar analytics, strategic resource effectiveness.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, AlertTriangle, Target, BarChart3, ShieldCheck, Loader2, Lightbulb, Activity } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, BarChart, Bar, ReferenceLine, ReferenceArea,
} from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTip } from '@/components/ui/info-tip';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { useBudgetData } from '@/hooks/use-budget-data';
import { aggregateByPillar, type UniversityAggregation } from '@/lib/university-aggregation';
import { formatRIPercent, getRiskDisplayInfo } from '@/lib/risk-display';
import { PILLAR_LABELS, getLivePillarBudget, formatCurrency, formatCurrencyFull, computeBudgetHealth, type PillarBudgetRow } from '@/lib/budget-data';
import { PILLAR_SHORT, PILLAR_FULL, PILLAR_ABBREV } from '@/lib/pillar-labels';
import { getItemStatus, getItemCompletion } from '@/lib/intelligence';
import { PILLAR_COLORS, computeSSI } from '@/lib/pillar-colors';
import PillarViewSelector, { type PillarViewMode } from './PillarViewSelector';
import type { PillarId } from '@/lib/types';

interface Props { aggregation: UniversityAggregation; }

function getBudgetEffectivenessLabel(budgetUtil: number, progress: number): { label: string; color: string } {
  const gap = progress - budgetUtil;
  if (gap > 20) return { label: 'Efficient Deployment', color: '#065F46' };
  if (gap > 5) return { label: 'Balanced Deployment', color: '#16A34A' };
  if (budgetUtil < 20 && progress < 20) return { label: 'Delayed Deployment', color: '#D97706' };
  if (gap < -20) return { label: 'Over-Extended', color: '#DC2626' };
  if (budgetUtil > 70 && progress < 40) return { label: 'Cost Pressure', color: '#EF4444' };
  return { label: 'Under-Utilized', color: '#F59E0B' };
}

function getBudgetInsight(r: any, prog: number): string {
  const util = r.utilization * 100;
  if (prog > util + 20) return 'Strong progress achieved with conservative spending.';
  if (prog > util + 5) return 'Spending and progress are well-aligned with room for growth.';
  if (util > 70 && prog < 40) return 'High spending with limited delivery indicates inefficiency.';
  if (util < 20) return 'Significant funds remain undeployed relative to execution.';
  if (prog > 60) return 'Spending is active with reasonable completion conversion.';
  return 'Spending is active, but completion conversion remains moderate.';
}

export default function BudgetIntelligence({ aggregation }: Props) {
  const [pillarView, setPillarView] = useState<PillarViewMode>('all');
  const { viewType, term, academicYear } = useDashboard();
  const { data: unitResults } = useUniversityData();
  const { data: budgetResult, isLoading: budgetLoading, isError: budgetError } = useBudgetData();

  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  const allRows = useMemo<PillarBudgetRow[]>(() => {
    if (!budgetResult?.pillars) return [];
    const pillarIds: PillarId[] = ['I','II','III','IV','V'];
    return pillarIds.map(p => {
      const b = getLivePillarBudget(budgetResult.pillars, p);
      const utilization = b.allocation > 0 ? b.committed / b.allocation : 0;
      const riskIdx = pillarAgg.find(pa => pa.pillar === p)?.riskIndex ?? 0;
      const budgetPressure = utilization >= 0.80 && riskIdx >= 1.51;
      return { pillar: p, label: PILLAR_LABELS[p], allocation: b.allocation, spent: b.spent, unspent: b.unspent, committed: b.committed, available: b.available, utilization, riskIndex: riskIdx, budgetPressure };
    });
  }, [budgetResult, pillarAgg]);

  const totals = useMemo(() => {
    const allocation = allRows.reduce((s, r) => s + r.allocation, 0);
    const spent = allRows.reduce((s, r) => s + r.spent, 0);
    const unspent = allRows.reduce((s, r) => s + r.unspent, 0);
    const committed = allRows.reduce((s, r) => s + r.committed, 0);
    const available = allRows.reduce((s, r) => s + r.available, 0);
    const utilization = allocation > 0 ? committed / allocation : 0;
    const health = computeBudgetHealth(available, allocation);
    return { allocation, spent, unspent, committed, available, utilization, health };
  }, [allRows]);

  const pillarProgressData = useMemo(() => {
    if (!unitResults) return [] as { pillar: PillarId; actualProgress: number; completionPct: number; inProgressCount: number }[];
    const pillarIds: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];
    return pillarIds.map(pillar => {
      let sum = 0, count = 0;
      const pa = pillarAgg.find(p => p.pillar === pillar);
      unitResults.forEach(ur => {
        if (!ur.result) return;
        ur.result.data.forEach(item => {
          if (item.pillar !== pillar) return;
          const status = getItemStatus(item, viewType, term, academicYear);
          if (status === 'In Progress') { sum += getItemCompletion(item, viewType, term, academicYear); count++; }
        });
      });
      return { pillar, actualProgress: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0, completionPct: pa?.completionPct ?? 0, inProgressCount: count };
    });
  }, [unitResults, pillarAgg, viewType, term, academicYear]);

  // Expected progress
  const expectedProgress = useMemo(() => {
    const [startYearStr] = academicYear.split('-');
    const startYear = parseInt(startYearStr);
    const windowStart = new Date(startYear, 6, 1);
    const windowEnd = term === 'mid' ? new Date(startYear, 11, 31) : new Date(startYear + 1, 5, 30);
    const now = new Date();
    const totalMs = windowEnd.getTime() - windowStart.getTime();
    const elapsedMs = Math.max(0, Math.min(now.getTime() - windowStart.getTime(), totalMs));
    return Math.round((elapsedMs / totalMs) * 100);
  }, [term, academicYear]);

  const scatterData = useMemo(() => {
    return allRows.map(r => {
      const prog = pillarProgressData.find(p => p.pillar === r.pillar);
      const budgetUtil = parseFloat((r.utilization * 100).toFixed(1));
      const actualProgress = prog?.actualProgress ?? 0;
      return {
        pillar: r.pillar, x: budgetUtil, y: actualProgress,
        name: r.label, fullName: PILLAR_FULL[r.pillar],
        allocated: r.allocation, spent: r.spent, available: r.available,
        inProgressCount: prog?.inProgressCount ?? 0,
        markerSize: Math.max(12, Math.min(22, 10 + actualProgress / 4)),
      };
    });
  }, [allRows, pillarProgressData]);

  const avgBudgetUtil = useMemo(() => {
    const vals = scatterData.map(d => d.x);
    return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
  }, [scatterData]);

  const scatterSummary = useMemo(() => {
    const inefficient = scatterData.filter(d => d.x > avgBudgetUtil && d.y < expectedProgress);
    const efficient = scatterData.filter(d => d.x < avgBudgetUtil && d.y > expectedProgress);
    if (inefficient.length > 0) return `High spending with low progress observed in ${inefficient.map(d => PILLAR_ABBREV[d.pillar]).join(', ')}.`;
    if (efficient.length > 0) return `${efficient.map(d => PILLAR_ABBREV[d.pillar]).join(', ')} show efficient execution with lower resource consumption.`;
    return 'Spending and progress are broadly aligned across all pillars.';
  }, [scatterData, avgBudgetUtil, expectedProgress]);

  const budgetEffectiveness = useMemo(() => {
    const insights: string[] = [];
    const utilPct = (totals.utilization * 100).toFixed(0);
    insights.push(`Overall budget utilization stands at ${utilPct}%.`);
    const highUtil = allRows.filter(r => r.utilization >= 0.80);
    if (highUtil.length > 0) insights.push(`${highUtil.map(r => PILLAR_ABBREV[r.pillar]).join(', ')} ${highUtil.length === 1 ? 'has' : 'have'} utilization above 80%.`);
    const pressure = allRows.filter(r => r.budgetPressure);
    if (pressure.length > 0) insights.push(`Budget pressure detected in ${pressure.map(r => PILLAR_ABBREV[r.pillar]).join(', ')} (high utilization + elevated risk).`);
    const lowUtil = allRows.filter(r => r.utilization < 0.30);
    if (lowUtil.length > 0) insights.push(`${lowUtil.map(r => PILLAR_ABBREV[r.pillar]).join(', ')} show underdeployment (<30% utilized).`);
    return insights;
  }, [allRows, totals]);

  // SSI
  const overallProgress = useMemo(() => {
    const all = pillarProgressData.filter(p => p.inProgressCount > 0);
    if (all.length === 0) return 0;
    return parseFloat((all.reduce((s, p) => s + p.actualProgress, 0) / all.length).toFixed(1));
  }, [pillarProgressData]);
  const riPctOverall = parseFloat(((aggregation.riskIndex / 3) * 100).toFixed(1));
  const budgetUtilPct = parseFloat((totals.utilization * 100).toFixed(1));
  const ssi = computeSSI(overallProgress, budgetUtilPct, riPctOverall);

  const utilColor = totals.utilization >= 0.80 ? '#EF4444' : totals.utilization >= 0.60 ? '#F59E0B' : '#16A34A';
  const hasPressure = allRows.some(r => r.budgetPressure);

  const selectedRow = pillarView !== 'all' ? allRows.find(r => r.pillar === pillarView) : null;
  const selectedProgress = pillarView !== 'all' ? pillarProgressData.find(p => p.pillar === pillarView) : null;

  if (budgetLoading) {
    return <div className="flex items-center justify-center py-20"><div className="text-center space-y-3"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /><p className="text-sm text-muted-foreground">Loading live budget data…</p></div></div>;
  }
  if (budgetError || allRows.length === 0) {
    return <div className="flex items-center justify-center py-20"><div className="text-center space-y-3 max-w-md px-4"><AlertTriangle className="w-8 h-8 text-destructive mx-auto" /><p className="text-sm text-foreground font-medium">Failed to load budget data</p></div></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground italic">Budget context: 2-Year Strategic Plan (2025–2027). All figures are live from the Finance spreadsheet.</p>
        <PillarViewSelector value={pillarView} onChange={setPillarView} />
      </div>

      {hasPressure && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive shrink-0" /><span className="text-xs font-medium text-foreground">Budget Pressure Detected — Utilization ≥ 80% and RI ≥ 50%</span></div>
        </motion.div>
      )}

      {/* KPI Cards */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <BudgetKPICard label="Allocation" subtitle="Total Planned" value={formatCurrency(totals.allocation)} fullValue={formatCurrencyFull(totals.allocation)} icon={DollarSign} color="hsl(var(--primary))" infoTip="Total approved budget across all pillars for the strategic plan period." />
          <CommittedKPICard committed={totals.committed} spent={totals.spent} unspent={totals.unspent} allocation={totals.allocation} />
          <BudgetKPICard label="Available" subtitle="Remaining" value={formatCurrency(totals.available)} fullValue={formatCurrencyFull(totals.available)} icon={DollarSign} color="hsl(var(--primary))" extraText={totals.allocation > 0 ? `${((totals.available / totals.allocation) * 100).toFixed(1)}% of allocation` : undefined} infoTip="Budget capacity not yet committed and still available for future initiatives." />
          <BudgetKPICard label="Budget Health" subtitle="Financial Capacity" value={totals.health.health} icon={ShieldCheck} color={totals.health.color} showBar barPct={totals.utilization * 100} barColor={utilColor} extraText={`${(totals.utilization * 100).toFixed(1)}% utilized`} infoTip="Healthy = ≥30% available capacity. Watch = ≥15%. Critical = <15%. Reflects commitment level against total allocation." />
        </div>
      </section>

      {/* Budget Effectiveness Overview */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><Lightbulb className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget Effectiveness Overview</span></div>
          <div className="space-y-2">
            {budgetEffectiveness.map((insight, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" /><p className="text-xs text-foreground leading-relaxed">{insight}</p></div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Budget Composition by Pillar */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-muted-foreground" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget Composition by Pillar</span></div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(pillarView === 'all' ? allRows : allRows.filter(r => r.pillar === pillarView)).map(r => ({ name: r.label, pillar: r.pillar, spent: r.spent, unspent: r.unspent, available: r.available }))} layout="vertical" margin={{ left: 50, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={v => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} width={40} />
                <ReTooltip formatter={(v: number, name: string) => [formatCurrencyFull(v), name]} contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="spent" stackId="a" fill="#16A34A" name="Spent Commitment" />
                <Bar dataKey="unspent" stackId="a" fill="#F59E0B" name="Unspent Commitment" />
                <Bar dataKey="available" stackId="a" fill="hsl(var(--muted-foreground))" fillOpacity={0.3} name="Available" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3">
            {[{ label: 'Spent', color: '#16A34A' }, { label: 'Unspent', color: '#F59E0B' }, { label: 'Available', color: 'hsl(var(--muted-foreground))', opacity: 0.3 }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color, opacity: (l as any).opacity ?? 1 }} /><span className="text-[10px] text-muted-foreground">{l.label}</span></div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Per-Pillar Budget Analytics */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Per-Pillar Budget Analytics</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">Executive view of budget deployment, funding effectiveness, financial capacity, and execution alignment by pillar.</p>

          {pillarView === 'all' ? (
            <AllPillarsBudget allRows={allRows} pillarProgressData={pillarProgressData} />
          ) : (
            selectedRow && selectedProgress && <SinglePillarBudget row={selectedRow} progress={selectedProgress} expectedProgress={expectedProgress} />
          )}
        </motion.div>
      </section>

      {/* Budget Deployment Effectiveness Scatter */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget Utilization vs Execution Progress</span>
            <InfoTip text="Financial diagnostic: maps budget utilization against execution progress with dynamic quadrant viewport." />
          </div>
          <div className="rounded-lg bg-muted/30 border border-border/40 px-3 py-2 mb-4">
            <p className="text-xs text-foreground font-medium flex items-center gap-1.5"><Lightbulb className="w-3 h-3 text-primary" />{scatterSummary}</p>
          </div>
          <DynamicBudgetScatter scatterData={scatterData} avgBudgetUtil={avgBudgetUtil} expectedProgress={expectedProgress} />
        </motion.div>
      </section>

      {/* Financial Contribution to Strategic Stability */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-muted-foreground" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Financial Contribution to Strategic Stability</span><InfoTip text="How funding patterns support or undermine SSI." /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border border-border/40 p-4 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Current SSI</p>
              <p className="text-2xl font-bold" style={{ color: ssi.color }}>{ssi.value}%</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${ssi.color}15`, color: ssi.color }}>{ssi.label}</span>
            </div>
            <div className="rounded-xl border border-border/40 p-4 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Alignment Gap</p>
              <p className="text-2xl font-bold text-foreground">{Math.abs(overallProgress - budgetUtilPct).toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">|Progress − Budget Util.|</p>
            </div>
            <div className="rounded-xl border border-border/40 p-4 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Risk Contribution</p>
              <p className="text-2xl font-bold" style={{ color: getRiskDisplayInfo(aggregation.riskIndex).color }}>{riPctOverall}%</p>
              <p className="text-[10px] text-muted-foreground">Risk Index (normalized)</p>
            </div>
          </div>
          <div className="space-y-2">
            {budgetUtilPct > overallProgress + 15 && <p className="text-xs text-foreground flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" /> Budget deployment significantly outpaces execution, creating alignment pressure that reduces SSI.</p>}
            {budgetUtilPct < overallProgress - 15 && <p className="text-xs text-foreground flex items-start gap-2"><Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> Progress exceeds spending, suggesting efficient execution. Positively contributes to SSI.</p>}
            {Math.abs(budgetUtilPct - overallProgress) <= 15 && <p className="text-xs text-foreground flex items-start gap-2"><Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> Progress and spending well-aligned, supporting stability.</p>}
          </div>
        </motion.div>
      </section>

      {/* Strategic Resource Effectiveness */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><Target className="w-4 h-4 text-muted-foreground" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Strategic Resource Effectiveness</span></div>
          <StrategicResourceEffectiveness allRows={allRows} pillarProgressData={pillarProgressData} />
        </motion.div>
      </section>
    </div>
  );
}

/* ─── All Pillars Budget ──────────────────────────────────────────── */

function AllPillarsBudget({ allRows, pillarProgressData }: { allRows: PillarBudgetRow[]; pillarProgressData: any[] }) {
  return (
    <div className="space-y-4">
      {allRows.map(r => {
        const utilPct = (r.utilization * 100).toFixed(1);
        const spentPct = r.allocation > 0 ? ((r.spent / r.allocation) * 100).toFixed(1) : '0';
        const unspentPct = r.allocation > 0 ? ((r.unspent / r.allocation) * 100).toFixed(1) : '0';
        const health = computeBudgetHealth(r.available, r.allocation);
        const prog = pillarProgressData.find((p: any) => p.pillar === r.pillar);
        const actualProgress = prog?.actualProgress ?? 0;
        const completionPct = prog?.completionPct ?? 0;
        const eff = getBudgetEffectivenessLabel(parseFloat(utilPct), actualProgress);
        const insight = getBudgetInsight(r, actualProgress);

        return (
          <div key={r.pillar} className="rounded-xl border border-border/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: PILLAR_COLORS[r.pillar] }} />
                <span className="text-xs font-semibold text-foreground">{PILLAR_SHORT[r.pillar]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${health.color}18`, color: health.color }}>{health.health}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${eff.color}15`, color: eff.color }}>{eff.label}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
              <div><p className="text-[10px] text-muted-foreground mb-0.5">Allocated</p><p className="text-sm font-bold text-foreground">{formatCurrency(r.allocation)}</p></div>
              <div><p className="text-[10px] text-muted-foreground mb-0.5">Spent</p><p className="text-sm font-bold" style={{ color: '#16A34A' }}>{formatCurrency(r.spent)}</p><p className="text-[9px] text-muted-foreground">{spentPct}%</p></div>
              <div><p className="text-[10px] text-muted-foreground mb-0.5">Unspent</p><p className="text-sm font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(r.unspent)}</p><p className="text-[9px] text-muted-foreground">{unspentPct}%</p></div>
              <div><p className="text-[10px] text-muted-foreground mb-0.5">Progress</p><p className="text-sm font-bold" style={{ color: PILLAR_COLORS[r.pillar] }}>{actualProgress}%</p></div>
              <div><p className="text-[10px] text-muted-foreground mb-0.5">Completion</p><p className="text-sm font-bold text-foreground">{completionPct}%</p></div>
              <div><p className="text-[10px] text-muted-foreground mb-0.5">Utilization</p><p className="text-sm font-bold" style={{ color: parseFloat(utilPct) >= 80 ? '#EF4444' : parseFloat(utilPct) >= 60 ? '#F59E0B' : '#16A34A' }}>{utilPct}%</p></div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mt-3 flex">
              <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${spentPct}%` }} transition={{ delay: 0.3, duration: 0.5 }} style={{ backgroundColor: '#16A34A' }} />
              <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${unspentPct}%` }} transition={{ delay: 0.4, duration: 0.5 }} style={{ backgroundColor: '#F59E0B' }} />
            </div>
            <p className="text-[10px] text-muted-foreground italic mt-2 leading-relaxed">{insight}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Single Pillar Budget ────────────────────────────────────────── */

function SinglePillarBudget({ row: r, progress: prog, expectedProgress }: { row: PillarBudgetRow; progress: any; expectedProgress: number }) {
  const utilPct = (r.utilization * 100).toFixed(1);
  const health = computeBudgetHealth(r.available, r.allocation);
  const eff = getBudgetEffectivenessLabel(parseFloat(utilPct), prog.actualProgress);
  const alignGap = Math.abs(prog.actualProgress - parseFloat(utilPct));

  return (
    <div className="space-y-6">
      {/* Row 1 — Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Budget Composition</h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-[10px] text-muted-foreground">Allocated</p><p className="text-lg font-bold text-foreground">{formatCurrency(r.allocation)}</p></div>
            <div><p className="text-[10px] text-muted-foreground">Spent</p><p className="text-lg font-bold" style={{ color: '#16A34A' }}>{formatCurrency(r.spent)}</p></div>
            <div><p className="text-[10px] text-muted-foreground">Unspent</p><p className="text-lg font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(r.unspent)}</p></div>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden mt-3 flex">
            {r.allocation > 0 && <div style={{ width: `${(r.spent / r.allocation) * 100}%`, backgroundColor: '#16A34A' }} />}
            {r.allocation > 0 && <div style={{ width: `${(r.unspent / r.allocation) * 100}%`, backgroundColor: '#F59E0B' }} />}
          </div>
        </div>
        <div className="rounded-xl border border-border/40 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Budget vs Execution</h4>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div><p className="text-[10px] text-muted-foreground">Utilization</p><p className="text-lg font-bold" style={{ color: parseFloat(utilPct) >= 80 ? '#EF4444' : '#16A34A' }}>{utilPct}%</p></div>
            <div><p className="text-[10px] text-muted-foreground">Progress</p><p className="text-lg font-bold" style={{ color: PILLAR_COLORS[r.pillar] }}>{prog.actualProgress}%</p></div>
            <div><p className="text-[10px] text-muted-foreground">Completion</p><p className="text-lg font-bold text-foreground">{prog.completionPct}%</p></div>
            <div><p className="text-[10px] text-muted-foreground">Alignment Gap</p><p className="text-lg font-bold" style={{ color: alignGap > 20 ? '#DC2626' : '#6B7280' }}>{alignGap.toFixed(1)}%</p></div>
          </div>
        </div>
      </div>

      {/* Row 2 — Key Metrics */}
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
        <MiniCard label="Utilization" value={`${utilPct}%`} color={parseFloat(utilPct) >= 80 ? '#EF4444' : '#16A34A'} />
        <MiniCard label="Spent" value={formatCurrency(r.spent)} color="#16A34A" />
        <MiniCard label="Unspent" value={formatCurrency(r.unspent)} color="#F59E0B" />
        <MiniCard label="Progress" value={`${prog.actualProgress}%`} color={PILLAR_COLORS[r.pillar]} />
        <MiniCard label="Completion" value={`${prog.completionPct}%`} />
        <MiniCard label="Gap" value={`${alignGap.toFixed(1)}%`} color={alignGap > 20 ? '#DC2626' : '#6B7280'} />
        <MiniCard label="Health" value={health.health} color={health.color} />
      </div>

      {/* Row 3 — Intelligence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Budget Intelligence</h4>
          <span className="text-[10px] px-2.5 py-1 rounded-full font-bold" style={{ backgroundColor: `${eff.color}15`, color: eff.color, border: `1px solid ${eff.color}30` }}>{eff.label}</span>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{getBudgetInsight(r, prog.actualProgress)}</p>
        </div>
        <div className="rounded-xl border border-border/40 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Recommended Focus</h4>
          <p className="text-xs text-foreground leading-relaxed">
            {parseFloat(utilPct) > 80 && prog.actualProgress < 50 ? 'High spending with limited progress — investigate cost drivers and execution blockers.' :
             parseFloat(utilPct) < 30 ? 'Budget remains largely undeployed — accelerate procurement and activation activities.' :
             prog.actualProgress > parseFloat(utilPct) + 15 ? 'Execution efficiency is strong — maintain current approach and monitor sustainability.' :
             'Continue balanced deployment while monitoring completion quality and timeline adherence.'}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Dynamic Budget Scatter ──────────────────────────────────────── */

function DynamicBudgetScatter({ scatterData, avgBudgetUtil, expectedProgress }: { scatterData: any[]; avgBudgetUtil: number; expectedProgress: number }) {
  const allX = [...scatterData.map(d => d.x), avgBudgetUtil];
  const allY = [...scatterData.map(d => d.y), expectedProgress];
  const minX = Math.min(...allX); const maxX = Math.max(...allX);
  const minY = Math.min(...allY); const maxY = Math.max(...allY);
  const spanX = Math.max(20, maxX - minX); const spanY = Math.max(20, maxY - minY);
  const padX = spanX * 0.25; const padY = spanY * 0.25;
  const domainX: [number, number] = [Math.max(0, Math.floor(minX - padX)), Math.min(100, Math.ceil(maxX + padX))];
  const domainY: [number, number] = [Math.max(0, Math.floor(minY - padY)), Math.min(100, Math.ceil(maxY + padY))];
  if (avgBudgetUtil < domainX[0]) domainX[0] = Math.max(0, avgBudgetUtil - 5);
  if (avgBudgetUtil > domainX[1]) domainX[1] = Math.min(100, avgBudgetUtil + 5);
  if (expectedProgress < domainY[0]) domainY[0] = Math.max(0, expectedProgress - 5);
  if (expectedProgress > domainY[1]) domainY[1] = Math.min(100, expectedProgress + 5);

  return (
    <>
      <div className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
            <ReferenceArea x1={domainX[0]} x2={avgBudgetUtil} y1={expectedProgress} y2={domainY[1]} fill="#E5E7EB" fillOpacity={0.3} stroke="#065F4650" strokeWidth={2} />
            <ReferenceArea x1={avgBudgetUtil} x2={domainX[1]} y1={expectedProgress} y2={domainY[1]} fill="#F3F4F6" fillOpacity={0.3} stroke="#1E40AF50" strokeWidth={2} />
            <ReferenceArea x1={domainX[0]} x2={avgBudgetUtil} y1={domainY[0]} y2={expectedProgress} fill="#F9FAFB" fillOpacity={0.3} stroke="#D9770650" strokeWidth={2} />
            <ReferenceArea x1={avgBudgetUtil} x2={domainX[1]} y1={domainY[0]} y2={expectedProgress} fill="#FEF2F2" fillOpacity={0.15} stroke="#DC262650" strokeWidth={2} />
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" dataKey="x" domain={domainX} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Budget Utilization %', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
            <YAxis type="number" dataKey="y" domain={domainY} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Actual Progress %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
            <ReferenceLine x={avgBudgetUtil} stroke="#6B7280" strokeDasharray="6 4" strokeWidth={2} label={{ value: `Avg ${avgBudgetUtil}%`, position: 'insideTopRight', style: { fontSize: 9, fill: '#6B7280', fontWeight: 700 } }} />
            <ReferenceLine y={expectedProgress} stroke="#DC2626" strokeDasharray="6 4" strokeWidth={2} label={{ value: `Expected ${expectedProgress}%`, position: 'insideTopLeft', style: { fontSize: 9, fill: '#DC2626', fontWeight: 700 } }} />
            <ReTooltip content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                  <p className="font-semibold text-foreground">{d.fullName}</p>
                  <p className="text-muted-foreground">Budget Utilization: <span className="text-foreground font-medium">{d.x}%</span></p>
                  <p className="text-muted-foreground">Actual Progress: <span className="text-foreground font-medium">{d.y}%</span></p>
                  <p className="text-muted-foreground">Allocated: <span className="text-foreground font-medium">{formatCurrencyFull(d.allocated)}</span></p>
                  <p className="text-muted-foreground">Spent: <span className="text-foreground font-medium">{formatCurrencyFull(d.spent)}</span></p>
                  <p className="text-muted-foreground">Remaining: <span className="text-foreground font-medium">{formatCurrencyFull(d.available)}</span></p>
                  <p className="text-muted-foreground">In-Progress: <span className="text-foreground font-medium">{d.inProgressCount}</span></p>
                </div>
              );
            }} />
            <Scatter data={scatterData}>
              {scatterData.map((d, i) => (<Cell key={i} fill={PILLAR_COLORS[d.pillar]} stroke="#FFFFFF" strokeWidth={2} r={d.markerSize} />))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {[
          { label: 'Efficient Execution', color: '#065F46' },
          { label: 'Under-resourced', color: '#D97706' },
          { label: 'Productive but Costly', color: '#1E40AF' },
          { label: 'Critical Inefficiency', color: '#DC2626' },
        ].map(q => (
          <div key={q.label} className="text-center p-2 rounded-lg border-2" style={{ borderColor: `${q.color}50`, backgroundColor: '#F5F6F7' }}>
            <p className="text-[10px] font-bold" style={{ color: q.color }}>{q.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Pillars:</span>
        {(['I','II','III','IV','V'] as PillarId[]).map(p => (
          <div key={p} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PILLAR_COLORS[p] }} /><span className="text-xs text-muted-foreground">{PILLAR_ABBREV[p]}</span></div>
        ))}
      </div>
    </>
  );
}

/* ─── Strategic Resource Effectiveness ────────────────────────────── */

function StrategicResourceEffectiveness({ allRows, pillarProgressData }: { allRows: PillarBudgetRow[]; pillarProgressData: any[] }) {
  const items = allRows.map(r => {
    const prog = pillarProgressData.find((p: any) => p.pillar === r.pillar);
    const utilPct = r.utilization * 100;
    const actualProgress = prog?.actualProgress ?? 0;
    const gap = actualProgress - utilPct;
    let signal = 'Balanced';
    let signalColor = '#6B7280';
    if (utilPct < 20 && actualProgress < 20) { signal = 'Under-resourced'; signalColor = '#D97706'; }
    else if (utilPct > 70 && actualProgress < 30) { signal = 'Overspending'; signalColor = '#DC2626'; }
    else if (gap > 20) { signal = 'Efficient'; signalColor = '#065F46'; }
    return { pillar: r.pillar, utilPct: utilPct.toFixed(1), actualProgress, gap: gap.toFixed(1), signal, signalColor };
  });

  const actionable = items.find(i => i.signal === 'Overspending') || items.find(i => i.signal === 'Under-resourced');
  const actionInsight = actionable
    ? `${actionable.signal === 'Overspending' ? 'High spending with limited execution progress' : 'Under-resourced with low activation'} in Pillar ${actionable.pillar} — requires intervention.`
    : 'Resource deployment is broadly aligned with execution across all pillars.';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {items.map(i => (
          <div key={i.pillar} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/20 transition-colors">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PILLAR_COLORS[i.pillar] }} />
            <span className="text-xs font-semibold text-foreground w-20">{PILLAR_SHORT[i.pillar]}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Util: {i.utilPct}%</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Prog: {i.actualProgress}%</span>
            <span className="text-xs font-bold whitespace-nowrap" style={{ color: parseFloat(i.gap) >= 0 ? '#16A34A' : '#DC2626' }}>Gap: {parseFloat(i.gap) >= 0 ? '+' : ''}{i.gap}%</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold ml-auto whitespace-nowrap" style={{ backgroundColor: `${i.signalColor}15`, color: i.signalColor }}>{i.signal}</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-muted/30 border border-border/40 px-3 py-2.5">
        <p className="text-xs text-foreground font-medium flex items-start gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          {actionInsight}
        </p>
      </div>
    </div>
  );
}

/* ─── Helper Components ──────────────────────────────────────────── */

function MiniCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border/40 p-3 text-center">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function BudgetKPICard({ label, subtitle, value, fullValue, icon: Icon, color, showBar, barPct, barColor, extraText, infoTip }: {
  label: string; subtitle: string; value: string; fullValue?: string; icon: React.ElementType; color: string; showBar?: boolean; barPct?: number; barColor?: string; extraText?: string; infoTip?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2, transition: { duration: 0.2 } }} className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none" style={{ backgroundColor: color }} />
      <div className="relative p-5 sm:p-6 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 flex-1">
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="min-h-[32px] sm:min-h-[36px] flex flex-col justify-start">
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-tight">{label}{infoTip && <InfoTip text={infoTip} />}</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 mt-0.5 font-medium">{subtitle}</p>
            </div>
            <Tooltip><TooltipTrigger asChild>
              <p className="text-xl sm:text-2xl font-display font-extrabold mt-2 tracking-tight cursor-help" style={{ color }}>{value}</p>
            </TooltipTrigger>{fullValue && <TooltipContent><p className="text-xs font-mono">{fullValue}</p></TooltipContent>}</Tooltip>
            {extraText && <p className="text-[10px] text-muted-foreground mt-1">{extraText}</p>}
            {showBar && barPct !== undefined && barColor && (
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-3">
                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(100, barPct)}%` }} transition={{ delay: 0.3, duration: 0.6 }} style={{ backgroundColor: barColor }} />
              </div>
            )}
          </div>
          <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: `${color}14` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CommittedKPICard({ committed, spent, unspent, allocation }: { committed: number; spent: number; unspent: number; allocation: number }) {
  const color = 'hsl(var(--primary))';
  const spentPct = allocation > 0 ? (spent / allocation) * 100 : 0;
  const unspentPct = allocation > 0 ? (unspent / allocation) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2, transition: { duration: 0.2 } }} className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none" style={{ backgroundColor: color }} />
      <div className="relative p-5 sm:p-6 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 flex-1">
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="min-h-[32px] sm:min-h-[36px] flex flex-col justify-start">
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-tight">Committed <InfoTip text="Funds formally committed. Includes Spent (disbursed) and Unspent (contractual obligations)." /></p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 mt-0.5 font-medium">Funds in Use</p>
            </div>
            <Tooltip><TooltipTrigger asChild><p className="text-xl sm:text-2xl font-display font-extrabold mt-2 tracking-tight cursor-help" style={{ color }}>{formatCurrency(committed)}</p></TooltipTrigger><TooltipContent><p className="text-xs font-mono">{formatCurrencyFull(committed)}</p></TooltipContent></Tooltip>
            <div className="space-y-1 mt-2">
              <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">Spent</span><span className="text-[10px] font-semibold" style={{ color: '#16A34A' }}>{formatCurrency(spent)}</span></div>
              <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">Unspent</span><span className="text-[10px] font-semibold" style={{ color: '#F59E0B' }}>{formatCurrency(unspent)}</span></div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mt-2 flex">
              <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${spentPct}%` }} transition={{ delay: 0.3, duration: 0.5 }} style={{ backgroundColor: '#16A34A' }} />
              <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${unspentPct}%` }} transition={{ delay: 0.4, duration: 0.5 }} style={{ backgroundColor: '#F59E0B' }} />
            </div>
          </div>
          <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: `${color}14` }}><DollarSign className="w-5 h-5" style={{ color }} /></div>
        </div>
      </div>
    </motion.div>
  );
}
