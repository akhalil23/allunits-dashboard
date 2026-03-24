/**
 * Tab 3 — Budget Intelligence (CFO-Grade)
 * Financial governance with Budget Scope selector and Per-Pillar pillar filter.
 * Removed: quadrant scatter, standalone Budget Composition, Strategic Resource Effectiveness.
 * Unified Per-Pillar Budget Analytics section.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, AlertTriangle, Target, BarChart3, ShieldCheck, Loader2, Lightbulb } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie,
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

type BudgetScope = 'total' | '2025-2026' | '2026-2027';

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
  const [budgetScope, setBudgetScope] = useState<BudgetScope>('total');
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
      const raw = budgetResult.pillars[p];
      // Apply budget scope: use year-specific allocation from columns Q/R
      let allocation = b.allocation;
      if (budgetScope === '2025-2026' && raw) allocation = raw.year4;
      if (budgetScope === '2026-2027' && raw) allocation = raw.year5;
      const { spent, unspent, committed } = b;
      const available = Math.max(0, allocation - committed);
      const utilization = allocation > 0 ? committed / allocation : 0;
      const riskIdx = pillarAgg.find(pa => pa.pillar === p)?.riskIndex ?? 0;
      const budgetPressure = utilization >= 0.80 && riskIdx >= 1.51;
      return { pillar: p, label: PILLAR_LABELS[p], allocation, spent, unspent, committed, available, utilization, riskIndex: riskIdx, budgetPressure };
    });
  }, [budgetResult, pillarAgg, budgetScope]);

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

  // Filtered rows for Per-Pillar section
  const displayRows = pillarView === 'all' ? allRows : allRows.filter(r => r.pillar === pillarView);

  if (budgetLoading) {
    return <div className="flex items-center justify-center py-20"><div className="text-center space-y-3"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /><p className="text-sm text-muted-foreground">Loading live budget data…</p></div></div>;
  }
  if (budgetError || allRows.length === 0) {
    return <div className="flex items-center justify-center py-20"><div className="text-center space-y-3 max-w-md px-4"><AlertTriangle className="w-8 h-8 text-destructive mx-auto" /><p className="text-sm text-foreground font-medium">Failed to load budget data</p></div></div>;
  }

  return (
    <div className="space-y-8">
      {/* Budget Scope Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground italic">Budget context: Strategic Plan (2025–2027). All figures are live from the Finance spreadsheet.</p>
        <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
          {([
            { key: 'total' as BudgetScope, label: 'Total (2025–2027)' },
            { key: '2025-2026' as BudgetScope, label: '2025–2026' },
            { key: '2026-2027' as BudgetScope, label: '2026–2027' },
          ]).map(s => (
            <button key={s.key} onClick={() => setBudgetScope(s.key)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${budgetScope === s.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {s.label}
            </button>
          ))}
        </div>
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

      {/* UNIFIED Per-Pillar Budget Analytics */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Per-Pillar Budget Analytics</span>
            </div>
            <PillarViewSelector value={pillarView} onChange={setPillarView} />
          </div>
          <p className="text-[10px] text-muted-foreground mb-5">Executive view of budget deployment, funding effectiveness, financial capacity, and execution alignment by pillar.</p>

          {/* A) Financial Structure — Stacked Horizontal Bars */}
          <div className="mb-6">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Financial Structure</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayRows.map(r => ({ name: PILLAR_LABELS[r.pillar], pillar: r.pillar, spent: r.spent, unspent: r.unspent, available: r.available }))} layout="vertical" margin={{ left: 50, right: 20 }}>
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
          </div>

          {/* Per-pillar cards with full analytics */}
          <div className="space-y-4">
            {displayRows.map(r => {
              const utilPct = (r.utilization * 100).toFixed(1);
              const spentPct = r.allocation > 0 ? ((r.spent / r.allocation) * 100).toFixed(1) : '0';
              const unspentPct = r.allocation > 0 ? ((r.unspent / r.allocation) * 100).toFixed(1) : '0';
              const health = computeBudgetHealth(r.available, r.allocation);
              const prog = pillarProgressData.find((p: any) => p.pillar === r.pillar);
              const actualProgress = prog?.actualProgress ?? 0;
              const completionPct = prog?.completionPct ?? 0;
              const eff = getBudgetEffectivenessLabel(parseFloat(utilPct), actualProgress);
              const insight = getBudgetInsight(r, actualProgress);
              const riPct = parseFloat(((r.riskIndex / 3) * 100).toFixed(1));
              const riInfo = getRiskDisplayInfo(r.riskIndex);
              const pillarSSI = computeSSI(actualProgress, parseFloat(utilPct), riPct);
              const seeiRaw = parseFloat(utilPct) > 0 ? actualProgress / parseFloat(utilPct) : 0;
              const seeiPct = Math.min(100, parseFloat((seeiRaw * 100).toFixed(1)));

              return (
                <div key={r.pillar} className="rounded-xl border border-border/40 p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: PILLAR_COLORS[r.pillar] }} />
                      <span className="text-xs font-semibold text-foreground">{PILLAR_SHORT[r.pillar]}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${health.color}18`, color: health.color }}>{health.health}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${eff.color}15`, color: eff.color }}>{eff.label}</span>
                    </div>
                  </div>

                  {/* B) Utilization & Capacity — visual gauge */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-border/40 p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-1">Budget Utilization</p>
                      <span className="text-sm font-bold" style={{ color: parseFloat(utilPct) >= 80 ? '#EF4444' : parseFloat(utilPct) >= 60 ? '#F59E0B' : '#16A34A' }}>{utilPct}%</span>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, parseFloat(utilPct))}%`, backgroundColor: parseFloat(utilPct) >= 80 ? '#EF4444' : parseFloat(utilPct) >= 60 ? '#F59E0B' : '#16A34A' }} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/40 p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-1">Available Capacity</p>
                      <span className="text-sm font-bold" style={{ color: health.color }}>{r.allocation > 0 ? ((r.available / r.allocation) * 100).toFixed(1) : '0'}%</span>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
                        <div className="h-full rounded-full" style={{ width: `${r.allocation > 0 ? Math.min(100, (r.available / r.allocation) * 100) : 0}%`, backgroundColor: health.color }} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/40 p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-1">Allocated</p>
                      <span className="text-sm font-bold text-foreground">{formatCurrency(r.allocation)}</span>
                    </div>
                    <div className="rounded-lg border border-border/40 p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-1">Committed</p>
                      <span className="text-sm font-bold text-foreground">{formatCurrency(r.committed)}</span>
                    </div>
                  </div>

                  {/* C) Execution Context — compact indicators */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-border/40 p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-1">Progress</p>
                      <span className="text-sm font-bold" style={{ color: PILLAR_COLORS[r.pillar] }}>{actualProgress}%</span>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, actualProgress)}%`, backgroundColor: PILLAR_COLORS[r.pillar] }} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/40 p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-1">Completion</p>
                      <span className="text-sm font-bold text-foreground">{completionPct}%</span>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, completionPct)}%`, backgroundColor: PILLAR_COLORS[r.pillar], opacity: 0.6 }} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/40 p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-1">SEEI</p>
                      <span className="text-sm font-bold" style={{ color: seeiPct >= 90 ? '#065F46' : seeiPct >= 60 ? '#16A34A' : '#D97706' }}>{seeiPct}%</span>
                    </div>
                    <div className="rounded-lg border border-border/40 p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-1">SSI</p>
                      <span className="text-sm font-bold" style={{ color: pillarSSI.color }}>{pillarSSI.value}%</span>
                      <p className="text-[9px]" style={{ color: pillarSSI.color }}>{pillarSSI.label}</p>
                    </div>
                  </div>

                  {/* D) Effectiveness & Alignment — Progress vs Utilization visual */}
                  <div className="rounded-lg border border-border/30 bg-muted/10 p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Effectiveness & Alignment</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">Progress</span>
                          <span className="text-[10px] font-bold" style={{ color: PILLAR_COLORS[r.pillar] }}>{actualProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, actualProgress)}%`, backgroundColor: PILLAR_COLORS[r.pillar] }} />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-bold">vs</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">Utilization</span>
                          <span className="text-[10px] font-bold" style={{ color: parseFloat(utilPct) >= 80 ? '#EF4444' : '#6B7280' }}>{utilPct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, parseFloat(utilPct))}%`, backgroundColor: PILLAR_COLORS[r.pillar], opacity: 0.4 }} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Expected Progress: {expectedProgress}%</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${eff.color}15`, color: eff.color }}>{eff.label}</span>
                    </div>
                  </div>

                  {/* E) Budget Deployment Breakdown — mini donut */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 shrink-0">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Spent', value: r.spent, fill: '#16A34A' },
                              { name: 'Unspent', value: r.unspent, fill: '#F59E0B' },
                              { name: 'Available', value: r.available, fill: '#D1D5DB' },
                            ].filter(d => d.value > 0)}
                            innerRadius="50%" outerRadius="90%" dataKey="value" strokeWidth={0}
                          >
                            {[
                              { fill: '#16A34A' },
                              { fill: '#F59E0B' },
                              { fill: '#D1D5DB' },
                            ].map((c, i) => <Cell key={i} fill={c.fill} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-[9px] text-muted-foreground">Spent</p><p className="text-xs font-bold" style={{ color: '#16A34A' }}>{formatCurrency(r.spent)}</p><p className="text-[9px] text-muted-foreground">{spentPct}%</p></div>
                      <div><p className="text-[9px] text-muted-foreground">Unspent</p><p className="text-xs font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(r.unspent)}</p><p className="text-[9px] text-muted-foreground">{unspentPct}%</p></div>
                      <div><p className="text-[9px] text-muted-foreground">Available</p><p className="text-xs font-bold text-muted-foreground">{formatCurrency(r.available)}</p></div>
                    </div>
                  </div>

                  {/* F) Integrated Insight Panel */}
                  <p className="text-[10px] text-muted-foreground italic leading-relaxed px-1">{insight}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </section>

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
