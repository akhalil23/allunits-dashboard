/**
 * Tab 3 — Budget Intelligence (CFO-Grade)
 * Financial governance: KPIs, budget effectiveness, composition,
 * per-pillar analytics, deployment effectiveness scatter, SSI contribution.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, AlertTriangle, Target, BarChart3, ShieldCheck, Loader2, Lightbulb, Activity } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, BarChart, Bar, ReferenceLine,
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
import { PILLAR_COLORS, computeSSI, getAlignmentStatus, getAlignmentColor } from '@/lib/pillar-colors';
import type { PillarId } from '@/lib/types';

interface Props { aggregation: UniversityAggregation; }

export default function BudgetIntelligence({ aggregation }: Props) {
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

  // ─── Per-pillar in-progress progress ──────────────────────────────────
  const pillarProgressData = useMemo(() => {
    if (!unitResults) return [] as { pillar: PillarId; actualProgress: number; inProgressCount: number }[];
    const pillarIds: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];
    return pillarIds.map(pillar => {
      let sum = 0, count = 0;
      unitResults.forEach(ur => {
        if (!ur.result) return;
        ur.result.data.forEach(item => {
          if (item.pillar !== pillar) return;
          const status = getItemStatus(item, viewType, term, academicYear);
          if (status === 'In Progress') { sum += getItemCompletion(item, viewType, term, academicYear); count++; }
        });
      });
      return { pillar, actualProgress: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0, inProgressCount: count };
    });
  }, [unitResults, viewType, term, academicYear]);

  // ─── Scatter data ─────────────────────────────────────────────────────
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
        markerSize: Math.max(10, Math.min(20, 8 + actualProgress / 5)),
      };
    });
  }, [allRows, pillarProgressData]);

  const avgBudgetUtil = useMemo(() => {
    const vals = scatterData.map(d => d.x);
    return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
  }, [scatterData]);
  const avgProgress = useMemo(() => {
    const vals = scatterData.map(d => d.y);
    return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
  }, [scatterData]);

  const scatterSummary = useMemo(() => {
    const inefficient = scatterData.filter(d => d.x > avgBudgetUtil && d.y < avgProgress);
    const efficient = scatterData.filter(d => d.x < avgBudgetUtil && d.y > avgProgress);
    if (inefficient.length > 0) return `High spending with low progress observed in ${inefficient.map(d => PILLAR_ABBREV[d.pillar]).join(', ')}.`;
    if (efficient.length > 0) return `${efficient.map(d => PILLAR_ABBREV[d.pillar]).join(', ')} show efficient execution with lower resource consumption.`;
    return 'Spending and progress are broadly aligned across all pillars.';
  }, [scatterData, avgBudgetUtil, avgProgress]);

  // ─── Budget Effectiveness ─────────────────────────────────────────────
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

  // ─── SSI-related analysis ─────────────────────────────────────────────
  const overallProgress = useMemo(() => {
    const all = pillarProgressData.filter(p => p.inProgressCount > 0);
    if (all.length === 0) return 0;
    return parseFloat((all.reduce((s, p) => s + p.actualProgress, 0) / all.length).toFixed(1));
  }, [pillarProgressData]);
  const riPctOverall = parseFloat(((aggregation.riskIndex / 3) * 100).toFixed(1));
  const budgetUtilPct = parseFloat((totals.utilization * 100).toFixed(1));
  const ssi = computeSSI(overallProgress, budgetUtilPct, riPctOverall);

  const hasPressure = allRows.some(r => r.budgetPressure);
  const utilColor = totals.utilization >= 0.80 ? '#EF4444' : totals.utilization >= 0.60 ? '#F59E0B' : '#16A34A';

  if (budgetLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading live budget data…</p>
        </div>
      </div>
    );
  }

  if (budgetError || allRows.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3 max-w-md px-4">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm text-foreground font-medium">Failed to load budget data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground italic px-1">Budget context: 2-Year Strategic Plan (2025–2027). All figures are live from the Finance spreadsheet.</p>

      {budgetResult?.validationErrors && budgetResult.validationErrors.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-medium text-foreground">Budget Validation Warnings</span>
              <ul className="mt-1 space-y-0.5">{budgetResult.validationErrors.map((e, i) => <li key={i} className="text-[10px] text-muted-foreground">{e}</li>)}</ul>
            </div>
          </div>
        </motion.div>
      )}

      {hasPressure && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive shrink-0" /><span className="text-xs font-medium text-foreground">Budget Pressure Detected — Utilization ≥ 80% and RI ≥ 50%</span></div>
        </motion.div>
      )}

      {/* Section 1: KPI Cards */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <BudgetKPICard label="Allocation" subtitle="Total Planned" value={formatCurrency(totals.allocation)} fullValue={formatCurrencyFull(totals.allocation)} icon={DollarSign} color="hsl(var(--primary))" infoTip="Total approved budget across all pillars for the strategic plan period." />
          <CommittedKPICard committed={totals.committed} spent={totals.spent} unspent={totals.unspent} allocation={totals.allocation} />
          <BudgetKPICard label="Available" subtitle="Remaining" value={formatCurrency(totals.available)} fullValue={formatCurrencyFull(totals.available)} icon={DollarSign} color="hsl(var(--primary))" extraText={totals.allocation > 0 ? `${((totals.available / totals.allocation) * 100).toFixed(1)}% of allocation` : undefined} infoTip="Budget capacity not yet committed and still available for future initiatives." />
          <BudgetKPICard label="Budget Health" subtitle="Commitment Pressure" value={totals.health.health} icon={ShieldCheck} color={totals.health.color} showBar barPct={totals.utilization * 100} barColor={utilColor} extraText={`${(totals.utilization * 100).toFixed(1)}% utilized`} infoTip="Healthy = strong capacity (≥30% available). Watch = moderate pressure (≥15%). Critical = high saturation (<15%)." />
        </div>
      </section>

      {/* Section 2: Budget Effectiveness Overview */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget Effectiveness Overview</span>
          </div>
          <div className="space-y-2">
            {budgetEffectiveness.map((insight, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <p className="text-xs text-foreground leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Section 3: Budget Composition by Pillar */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-muted-foreground" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget Composition by Pillar</span></div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allRows.map(r => ({ name: r.label, pillar: r.pillar, spent: r.spent, unspent: r.unspent, available: r.available }))} layout="vertical" margin={{ left: 50, right: 20 }}>
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

      {/* Section 4: Per-Pillar Budget Analytics — Enhanced */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Per-Pillar Budget Analytics</span>
          <div className="mt-4 space-y-4">
            {allRows.map(r => {
              const utilPct = (r.utilization * 100).toFixed(1);
              const spentPct = r.allocation > 0 ? ((r.spent / r.allocation) * 100).toFixed(1) : '0';
              const unspentPct = r.allocation > 0 ? ((r.unspent / r.allocation) * 100).toFixed(1) : '0';
              const health = computeBudgetHealth(r.available, r.allocation);
              const prog = pillarProgressData.find(p => p.pillar === r.pillar);
              const riInfo = getRiskDisplayInfo(r.riskIndex);
              const alignment = getAlignmentStatus(prog?.actualProgress ?? 0, parseFloat(utilPct), r.riskIndex);
              const alignColor = getAlignmentColor(alignment);

              return (
                <div key={r.pillar} className="rounded-xl border border-border/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: PILLAR_COLORS[r.pillar] }} />
                      <span className="text-xs font-semibold text-foreground">{PILLAR_SHORT[r.pillar]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${health.color}18`, color: health.color }}>{health.health}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${alignColor}15`, color: alignColor }}>{alignment}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Allocated</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(r.allocation)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Spent</p>
                      <p className="text-sm font-bold" style={{ color: '#16A34A' }}>{formatCurrency(r.spent)}</p>
                      <p className="text-[9px] text-muted-foreground">{spentPct}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Unspent</p>
                      <p className="text-sm font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(r.unspent)}</p>
                      <p className="text-[9px] text-muted-foreground">{unspentPct}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Progress</p>
                      <p className="text-sm font-bold" style={{ color: PILLAR_COLORS[r.pillar] }}>{prog?.actualProgress ?? 0}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">RI</p>
                      <p className="text-sm font-bold" style={{ color: riInfo.color }}>{riInfo.percent}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Funding Status</p>
                      <p className="text-[10px] font-bold" style={{ color: alignColor }}>{alignment}</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mt-3 flex">
                    <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${spentPct}%` }} transition={{ delay: 0.3, duration: 0.5 }} style={{ backgroundColor: '#16A34A' }} />
                    <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${unspentPct}%` }} transition={{ delay: 0.4, duration: 0.5 }} style={{ backgroundColor: '#F59E0B' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Section 5: Budget Deployment Effectiveness Scatter */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget Deployment Effectiveness</span>
            <InfoTip text="Financial diagnostic: maps budget utilization against execution progress. Uses fixed pillar colors and richer financial tooltips." />
          </div>
          <div className="rounded-lg bg-muted/30 border border-border/40 px-3 py-2 mb-4">
            <p className="text-xs text-foreground font-medium flex items-center gap-1.5"><Lightbulb className="w-3 h-3 text-primary" />{scatterSummary}</p>
          </div>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Budget Utilization %', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <YAxis type="number" dataKey="y" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Actual Progress %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <ReferenceLine x={avgBudgetUtil} stroke="#6B7280" strokeDasharray="6 4" strokeWidth={2} label={{ value: `Avg ${avgBudgetUtil}%`, position: 'insideTopRight', style: { fontSize: 9, fill: '#6B7280', fontWeight: 700 } }} />
                <ReferenceLine y={avgProgress} stroke="#6B7280" strokeDasharray="6 4" strokeWidth={2} label={{ value: `Avg ${avgProgress}%`, position: 'insideTopLeft', style: { fontSize: 9, fill: '#6B7280', fontWeight: 700 } }} />
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
                  {scatterData.map((d, i) => (
                    <Cell key={i} fill={PILLAR_COLORS[d.pillar]} stroke="#FFFFFF" strokeWidth={2} r={d.markerSize} />
                  ))}
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
              <div key={p} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PILLAR_COLORS[p] }} />
                <span className="text-xs text-muted-foreground">{PILLAR_ABBREV[p]}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Section 6: Financial Contribution to Strategic Stability */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Financial Contribution to Strategic Stability</span>
            <InfoTip text="How funding patterns support or undermine the Strategic Stability Index (SSI). SSI combines progress, budget alignment, and risk exposure." />
          </div>
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
            {budgetUtilPct > overallProgress + 15 && (
              <p className="text-xs text-foreground flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" /> Budget deployment significantly outpaces execution progress, creating alignment pressure that reduces SSI.</p>
            )}
            {budgetUtilPct < overallProgress - 15 && (
              <p className="text-xs text-foreground flex items-start gap-2"><Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> Progress exceeds budget deployment, suggesting efficient execution. This positively contributes to SSI.</p>
            )}
            {Math.abs(budgetUtilPct - overallProgress) <= 15 && (
              <p className="text-xs text-foreground flex items-start gap-2"><Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> Progress and budget deployment are well-aligned, supporting strategic stability.</p>
            )}
          </div>
        </motion.div>
      </section>
    </div>
  );
}

/* ─── KPI Card Components ─────────────────────────────────────────── */

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
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xl sm:text-2xl font-display font-extrabold mt-2 tracking-tight cursor-help" style={{ color }}>{value}</p>
              </TooltipTrigger>
              {fullValue && <TooltipContent><p className="text-xs font-mono">{fullValue}</p></TooltipContent>}
            </Tooltip>
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
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-tight">Committed <InfoTip text="Funds formally committed. Includes both Spent (disbursed) and Unspent (contractual obligations) commitments." /></p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 mt-0.5 font-medium">Funds in Use</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xl sm:text-2xl font-display font-extrabold mt-2 tracking-tight cursor-help" style={{ color }}>{formatCurrency(committed)}</p>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs font-mono">{formatCurrencyFull(committed)}</p></TooltipContent>
            </Tooltip>
            <div className="space-y-1 mt-2">
              <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">Spent</span><span className="text-[10px] font-semibold" style={{ color: '#16A34A' }}>{formatCurrency(spent)}</span></div>
              <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">Unspent</span><span className="text-[10px] font-semibold" style={{ color: '#F59E0B' }}>{formatCurrency(unspent)}</span></div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mt-2 flex">
              <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${spentPct}%` }} transition={{ delay: 0.3, duration: 0.5 }} style={{ backgroundColor: '#16A34A' }} />
              <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${unspentPct}%` }} transition={{ delay: 0.4, duration: 0.5 }} style={{ backgroundColor: '#F59E0B' }} />
            </div>
          </div>
          <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: `${color}14` }}>
            <DollarSign className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
