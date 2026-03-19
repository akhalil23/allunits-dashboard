/**
 * Tab 3 — Budget Intelligence (CFO-Grade, Live Data)
 * Reads live budget from Finance spreadsheet. Spent/Unspent commitment model.
 * Includes Budget Utilization vs Execution Progress scatter chart.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, AlertTriangle, Target, BarChart3, ShieldCheck, Loader2, Lightbulb } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, BarChart, Bar, ReferenceLine, ReferenceArea,
  PieChart, Pie, Cell as PieCell,
} from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTip } from '@/components/ui/info-tip';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { useBudgetData } from '@/hooks/use-budget-data';
import { aggregateByPillar, getRiskBandColor, type UniversityAggregation } from '@/lib/university-aggregation';
import { formatRIPercent, getRiskDisplayInfo, RI_BAND_LEGEND } from '@/lib/risk-display';
import { PILLAR_LABELS, getLivePillarBudget, formatCurrency, formatCurrencyFull, computeBudgetHealth, type PillarBudgetRow } from '@/lib/budget-data';
import { PILLAR_SHORT, PILLAR_FULL, PILLAR_ABBREV } from '@/lib/pillar-labels';
import { getItemStatus, getItemCompletion } from '@/lib/intelligence';
import { isNotApplicableStatus } from '@/lib/types';
import type { PillarId } from '@/lib/types';

interface Props { aggregation: UniversityAggregation; }

const PILLAR_DONUT_COLORS: Record<PillarId, string> = {
  I: '#6366F1', II: '#F59E0B', III: '#10B981', IV: '#F97316', V: '#8B5CF6',
};

const PILLAR_SCATTER_COLORS: Record<PillarId, string> = {
  I: '#2563EB', II: '#059669', III: '#D97706', IV: '#DC2626', V: '#7C3AED',
};

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

  // ─── Per-pillar in-progress actual progress ─────────────────────────
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
          if (status === 'In Progress') {
            sum += getItemCompletion(item, viewType, term, academicYear);
            count++;
          }
        });
      });
      return {
        pillar,
        actualProgress: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0,
        inProgressCount: count,
      };
    });
  }, [unitResults, viewType, term, academicYear]);

  // ─── Scatter data for Budget Utilization vs Execution Progress ──────
  const scatterData = useMemo(() => {
    return allRows.map(r => {
      const prog = pillarProgressData.find(p => p.pillar === r.pillar);
      const budgetUtil = parseFloat((r.utilization * 100).toFixed(1));
      const actualProgress = prog?.actualProgress ?? 0;
      const progressRatio = budgetUtil > 0 ? parseFloat((actualProgress / budgetUtil).toFixed(2)) : 0;
      return {
        pillar: r.pillar,
        x: budgetUtil,
        y: actualProgress,
        name: r.label,
        fullName: PILLAR_FULL[r.pillar],
        progressRatio,
        allocated: r.allocation,
        spent: r.spent,
        available: r.available,
        inProgressCount: prog?.inProgressCount ?? 0,
        markerSize: Math.max(10, Math.min(22, 8 + actualProgress / 5)),
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

  // ─── Automated summary for scatter ──────────────────────────────────
  const scatterSummary = useMemo(() => {
    const inefficient = scatterData.filter(d => d.x > avgBudgetUtil && d.y < avgProgress);
    const efficient = scatterData.filter(d => d.x < avgBudgetUtil && d.y > avgProgress);
    if (inefficient.length > 0) {
      return `High spending with low progress observed in ${inefficient.map(d => PILLAR_ABBREV[d.pillar]).join(', ')}.`;
    }
    if (efficient.length > 0) {
      return `${efficient.map(d => PILLAR_ABBREV[d.pillar]).join(', ')} show${efficient.length === 1 ? 's' : ''} efficient execution with lower resource consumption.`;
    }
    return 'Spending and progress are broadly aligned across all pillars.';
  }, [scatterData, avgBudgetUtil, avgProgress]);

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
          <p className="text-xs text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground italic px-1">Budget context: 2-Year Strategic Plan (2025–2027). All figures are live from the Finance spreadsheet.</p>

      {/* Validation warnings */}
      {budgetResult?.validationErrors && budgetResult.validationErrors.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-medium text-foreground">Budget Validation Warnings</span>
              <ul className="mt-1 space-y-0.5">
                {budgetResult.validationErrors.map((e, i) => (
                  <li key={i} className="text-[10px] text-muted-foreground">{e}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {hasPressure && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive shrink-0" /><span className="text-xs font-medium text-foreground">Budget Pressure Detected — Budget Utilization ≥ 80% and RI ≥ 50%</span></div>
        </motion.div>
      )}

      {/* Section 1: CFO-Grade KPI Header */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <BudgetKPICard
            label="Allocation" subtitle="Total Planned"
            value={formatCurrency(totals.allocation)}
            fullValue={formatCurrencyFull(totals.allocation)}
            icon={DollarSign} color="hsl(var(--primary))"
            infoTip="Total approved budget across all pillars for the strategic plan period."
          />
          <CommittedKPICard
            committed={totals.committed}
            spent={totals.spent}
            unspent={totals.unspent}
            allocation={totals.allocation}
          />
          <BudgetKPICard
            label="Available" subtitle="Remaining"
            value={formatCurrency(totals.available)}
            fullValue={formatCurrencyFull(totals.available)}
            icon={DollarSign} color="hsl(var(--primary))"
            extraText={totals.allocation > 0 ? `${((totals.available / totals.allocation) * 100).toFixed(1)}% of allocation` : undefined}
            infoTip="Budget capacity not yet committed and still available for future initiatives."
          />
          <BudgetKPICard
            label="Budget Health" subtitle="Commitment Pressure"
            value={totals.health.health}
            icon={ShieldCheck} color={totals.health.color}
            showBar barPct={totals.utilization * 100} barColor={utilColor}
            extraText={`${(totals.utilization * 100).toFixed(1)}% utilized`}
            infoTip="Overall financial capacity based on commitment pressure. Healthy = strong available capacity. Watch = moderate pressure, limited room. Critical = high saturation, little flexibility."
          />
        </div>
      </section>

      {/* Section 2: Budget Composition by Pillar */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-muted-foreground" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget Composition by Pillar</span></div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allRows.map(r => ({ name: r.label, spent: r.spent, unspent: r.unspent, available: r.available }))} layout="vertical" margin={{ left: 50, right: 20 }}>
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
            {[
              { label: 'Spent', color: '#16A34A' },
              { label: 'Unspent', color: '#F59E0B' },
              { label: 'Available', color: 'hsl(var(--muted-foreground))', opacity: 0.3 },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color, opacity: l.opacity ?? 1 }} />
                <span className="text-[10px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Section 3: Per-Pillar Budget Analytics */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Per-Pillar Budget Analytics</span>
          <div className="mt-4 space-y-4">
            {allRows.map(r => {
              const utilPct = (r.utilization * 100).toFixed(1);
              const spentPct = r.allocation > 0 ? ((r.spent / r.allocation) * 100).toFixed(1) : '0';
              const unspentPct = r.allocation > 0 ? ((r.unspent / r.allocation) * 100).toFixed(1) : '0';
              const availPct = r.allocation > 0 ? ((r.available / r.allocation) * 100).toFixed(1) : '0';
              const health = computeBudgetHealth(r.available, r.allocation);
              return (
                <div key={r.pillar} className="rounded-xl border border-border/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PILLAR_DONUT_COLORS[r.pillar] }} />
                      <span className="text-xs font-semibold text-foreground">{PILLAR_FULL[r.pillar]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${health.color}18`, color: health.color }}>{health.health}</span>
                      <span className="text-xs font-bold text-foreground">{formatCurrency(r.allocation)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
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
                      <p className="text-[10px] text-muted-foreground mb-0.5">Available</p>
                      <p className="text-sm font-bold text-muted-foreground">{formatCurrency(r.available)}</p>
                      <p className="text-[9px] text-muted-foreground">{availPct}%</p>
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

      {/* Section 4: Budget Utilization vs Execution Progress (NEW) */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget Utilization vs Execution Progress by Strategic Pillar</span>
            <InfoTip text="Scatter chart mapping budget utilization (X) against actual execution progress of in-progress items (Y). Reference lines show average values. Marker size reflects progress level." />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">Determines whether spending translates into execution outcomes.</p>

          {/* Automated summary */}
          <div className="rounded-lg bg-muted/30 border border-border/40 px-3 py-2 mb-4">
            <p className="text-xs text-foreground font-medium flex items-center gap-1.5">
              <Lightbulb className="w-3 h-3 text-primary" />
              {scatterSummary}
            </p>
          </div>

          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                {/* Quadrant background shading */}
                <ReferenceArea x1={0} x2={avgBudgetUtil} y1={avgProgress} y2={100} fill="rgba(5,150,105,0.12)" fillOpacity={1} />
                <ReferenceArea x1={0} x2={avgBudgetUtil} y1={0} y2={avgProgress} fill="rgba(217,119,6,0.12)" fillOpacity={1} />
                <ReferenceArea x1={avgBudgetUtil} x2={100} y1={avgProgress} y2={100} fill="rgba(37,99,235,0.12)" fillOpacity={1} />
                <ReferenceArea x1={avgBudgetUtil} x2={100} y1={0} y2={avgProgress} fill="rgba(220,38,38,0.12)" fillOpacity={1} />
                <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Budget Utilization %', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <YAxis type="number" dataKey="y" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Actual Progress %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <ReferenceLine x={avgBudgetUtil} stroke="hsl(var(--foreground))" strokeDasharray="6 4" strokeOpacity={0.5} label={{ value: `Avg ${avgBudgetUtil}%`, position: 'top', style: { fontSize: 9, fill: 'hsl(var(--muted-foreground))' } }} />
                <ReferenceLine y={avgProgress} stroke="hsl(var(--foreground))" strokeDasharray="6 4" strokeOpacity={0.5} label={{ value: `Avg ${avgProgress}%`, position: 'right', style: { fontSize: 9, fill: 'hsl(var(--muted-foreground))' } }} />
                <ReTooltip content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  const ipsVal = d.x > 0 && d.y < d.x ? ((1 - d.y / d.x) * d.x).toFixed(1) : '0';
                  const ipsNum = parseFloat(ipsVal);
                  const ipsLabel = ipsNum > 25 ? '🔴 Critical Priority' : ipsNum > 15 ? '🟠 High Priority' : ipsNum > 5 ? '🟡 Monitor' : '🟢 Stable';
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                      <p className="font-semibold text-foreground">{d.fullName}</p>
                      <p className="text-muted-foreground">Budget Utilization: <span className="text-foreground font-medium">{d.x}%</span></p>
                      <p className="text-muted-foreground">Actual Progress: <span className="text-foreground font-medium">{d.y}%</span></p>
                      <p className="text-muted-foreground">Progress Ratio: <span className="text-foreground font-medium">{d.progressRatio}</span></p>
                      <p className="text-muted-foreground">Allocated: <span className="text-foreground font-medium">{formatCurrencyFull(d.allocated)}</span></p>
                      <p className="text-muted-foreground">Spent: <span className="text-foreground font-medium">{formatCurrencyFull(d.spent)}</span></p>
                      <p className="text-muted-foreground">Remaining: <span className="text-foreground font-medium">{formatCurrencyFull(d.available)}</span></p>
                      <p className="text-muted-foreground">In-Progress Items: <span className="text-foreground font-medium">{d.inProgressCount}</span></p>
                      <p className="text-muted-foreground">Intervention Priority: <span className="font-medium">{ipsLabel}</span></p>
                    </div>
                  );
                }} />
                <Scatter data={scatterData}>
                  {scatterData.map((d, i) => (
                    <Cell key={i} fill={PILLAR_SCATTER_COLORS[d.pillar]} fillOpacity={0.85} r={d.markerSize} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Pillar legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 mb-3">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Pillars:</span>
            {(['I','II','III','IV','V'] as PillarId[]).map(p => (
              <div key={p} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PILLAR_SCATTER_COLORS[p] }} />
                <span className="text-xs text-muted-foreground">{PILLAR_ABBREV[p]}</span>
              </div>
            ))}
          </div>

          {/* Quadrant legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: 'Low Budget / High Progress', desc: 'Efficient Execution', color: '#059669', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.25)' },
              { label: 'Low Budget / Low Progress', desc: 'Under-resourced / Stalled', color: '#D97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.25)' },
              { label: 'High Budget / High Progress', desc: 'Productive but Costly', color: '#2563EB', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.25)' },
              { label: 'High Budget / Low Progress', desc: 'Critical Inefficiency', color: '#DC2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.25)' },
            ].map(q => (
              <div key={q.desc} className="text-center p-3 rounded-lg" style={{ backgroundColor: q.bg, borderWidth: 1, borderColor: q.border, borderStyle: 'solid' }}>
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: q.color }} />
                  <p className="text-xs font-semibold" style={{ color: q.color }}>{q.desc}</p>
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground">{q.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Section 5: Allocation Distribution Donut */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Allocation Distribution</span>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 mt-4">
            <div className="w-36 h-36 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={allRows.map(r => ({ name: PILLAR_SHORT[r.pillar], value: r.allocation, pillar: r.pillar, fullName: PILLAR_FULL[r.pillar] }))} innerRadius="55%" outerRadius="85%" dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                    {allRows.map((r, i) => <PieCell key={i} fill={PILLAR_DONUT_COLORS[r.pillar]} />)}
                  </Pie>
                  <ReTooltip formatter={(v: number, n: string) => [formatCurrencyFull(v), n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5 min-w-0">
              {allRows.map(r => (
                <Tooltip key={r.pillar}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2.5 cursor-help">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PILLAR_DONUT_COLORS[r.pillar] }} />
                      <span className="text-xs text-foreground flex-1">{PILLAR_SHORT[r.pillar]}</span>
                      <span className="text-xs font-bold text-foreground">{formatCurrency(r.allocation)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">{PILLAR_FULL[r.pillar]} — {formatCurrencyFull(r.allocation)}</p></TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section 6: Budget Efficiency Scatter */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget Efficiency</span>
            <InfoTip text="Scatter chart mapping budget utilization against completion rate for each pillar. Ideal position is top-right (high completion, high utilization)." />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">Budget Utilization vs Completion — colored by quadrant position.</p>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <ReferenceArea x1={50} x2={100} y1={50} y2={100} fill="rgba(22,163,74,0.06)" fillOpacity={1} />
                <ReferenceArea x1={0} x2={50} y1={50} y2={100} fill="rgba(59,130,246,0.06)" fillOpacity={1} />
                <ReferenceArea x1={50} x2={100} y1={0} y2={50} fill="rgba(239,68,68,0.06)" fillOpacity={1} />
                <ReferenceArea x1={0} x2={50} y1={0} y2={50} fill="rgba(245,158,11,0.06)" fillOpacity={1} />
                <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Budget Utilization %', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <YAxis type="number" dataKey="y" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Completion %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <ReferenceLine x={50} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <ReTooltip content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                      <p className="font-semibold text-foreground">{d.fullName}</p>
                      <p className="text-muted-foreground">Budget Utilization: <span className="text-foreground font-medium">{d.x}%</span></p>
                      <p className="text-muted-foreground">Completion: <span className="text-foreground font-medium">{d.y}%</span></p>
                    </div>
                  );
                }} />
                <Scatter data={allRows.map(r => {
                  const comp = pillarAgg.find(pa => pa.pillar === r.pillar)?.completionPct ?? 0;
                  return { x: parseFloat((r.utilization*100).toFixed(1)), y: comp, name: r.label, fullName: PILLAR_FULL[r.pillar] };
                })}>
                  {allRows.map((r, i) => {
                    const comp = pillarAgg.find(pa => pa.pillar === r.pillar)?.completionPct ?? 0;
                    const isHighBudget = r.utilization >= 0.50;
                    const isHighComp = comp >= 50;
                    const color = isHighBudget && isHighComp ? '#16A34A' : !isHighBudget && isHighComp ? '#3B82F6' : isHighBudget && !isHighComp ? '#EF4444' : '#F59E0B';
                    return <Cell key={i} fill={color} fillOpacity={0.7} r={12} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            {[
              { label: 'High Budget / High Completion', desc: 'Strong Efficiency', pos: 'top-right', color: '#16A34A', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.25)' },
              { label: 'Low Budget / High Completion', desc: 'Lean Execution', pos: 'top-left', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
              { label: 'High Budget / Low Completion', desc: 'Spending Risk', pos: 'bottom-right', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
              { label: 'Low Budget / Low Completion', desc: 'Underperforming', pos: 'bottom-left', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
            ].map(q => (
              <div key={q.pos} className="text-center p-3 rounded-lg" style={{ backgroundColor: q.bg, borderWidth: 1, borderColor: q.border, borderStyle: 'solid' }}>
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: q.color }} />
                  <p className="text-xs font-semibold" style={{ color: q.color }}>{q.desc}</p>
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground">{q.label}</p>
              </div>
            ))}
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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.12]" style={{ backgroundColor: color }} />
      <div className="relative p-5 sm:p-6 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 flex-1">
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="h-[32px] sm:h-[36px] flex flex-col justify-start">
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
                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(100, barPct)}%` }} transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }} style={{ backgroundColor: barColor }} />
              </div>
            )}
          </div>
          <div className="p-2.5 rounded-xl shrink-0 transition-colors duration-200" style={{ backgroundColor: `${color}14` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CommittedKPICard({ committed, spent, unspent, allocation }: {
  committed: number; spent: number; unspent: number; allocation: number;
}) {
  const color = 'hsl(var(--primary))';
  const spentPct = allocation > 0 ? (spent / allocation) * 100 : 0;
  const unspentPct = allocation > 0 ? (unspent / allocation) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.12]" style={{ backgroundColor: color }} />
      <div className="relative p-5 sm:p-6 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 flex-1">
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="h-[32px] sm:h-[36px] flex flex-col justify-start">
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-tight">Committed<InfoTip text="Funds formally committed to initiatives. Includes Spent Commitment (funds already disbursed) and Unspent Commitment (contractual or approved obligations not yet paid)." /></p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 mt-0.5 font-medium">Funds in Use</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xl sm:text-2xl font-display font-extrabold mt-2 tracking-tight cursor-help" style={{ color }}>{formatCurrency(committed)}</p>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs font-mono">{formatCurrencyFull(committed)}</p></TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#16A34A' }} />
                <span className="text-[10px] text-muted-foreground">Spent</span>
                <span className="text-[10px] font-bold text-foreground">{formatCurrency(spent)}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                <span className="text-[10px] text-muted-foreground">Unspent</span>
                <span className="text-[10px] font-bold text-foreground">{formatCurrency(unspent)}</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mt-2 flex">
              <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${spentPct}%` }} transition={{ delay: 0.3, duration: 0.5 }} style={{ backgroundColor: '#16A34A' }} />
              <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${unspentPct}%` }} transition={{ delay: 0.4, duration: 0.5 }} style={{ backgroundColor: '#F59E0B' }} />
            </div>
          </div>
          <div className="p-2.5 rounded-xl shrink-0 transition-colors duration-200" style={{ backgroundColor: `${color}14` }}>
            <DollarSign className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
