/**
 * Tab 3 — Budget Intelligence (CFO-Grade)
 * Financial governance with Budget Scope selector and Per-Pillar pillar filter.
 * Updated: Split Budget Utilization into Commitment + Spending Ratios.
 * Removed SEEI. Uses descriptive alignment insights.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, BarChart3, Loader2, Lightbulb } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTip } from '@/components/ui/info-tip';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { useBudgetData } from '@/hooks/use-budget-data';
import { aggregateByPillar, type UniversityAggregation } from '@/lib/university-aggregation';
import { formatRIPercent, getRiskDisplayInfo } from '@/lib/risk-display';
import { PILLAR_LABELS, getLivePillarBudget, formatCurrency, formatCurrencyFull, computeBudgetHealth, computeSpendingHealth, type PillarBudgetRow } from '@/lib/budget-data';
import { PILLAR_SHORT, PILLAR_FULL, PILLAR_ABBREV } from '@/lib/pillar-labels';
import { getItemStatus, getItemCompletion, computeExpectedProgress } from '@/lib/intelligence';
import { PILLAR_COLORS } from '@/lib/pillar-colors';
import PillarViewSelector, { type PillarViewMode } from './PillarViewSelector';
import type { PillarId } from '@/lib/types';

interface Props { aggregation: UniversityAggregation; }

type BudgetScope = 'total' | '2025-2026' | '2026-2027';

function getBudgetInsight(commitmentRatio: number, spendingRatio: number, prog: number): string {
  const commitPct = commitmentRatio * 100;
  const spendPct = spendingRatio * 100;
  if (prog > commitPct + 20) return 'Strong progress achieved with conservative commitment levels.';
  if (prog > spendPct + 10) return 'Execution is outpacing actual spending, indicating efficient resource use.';
  if (spendPct > 50 && prog < 30) return 'High spending with limited delivery indicates potential inefficiency.';
  if (commitPct < 20) return 'Significant funds remain uncommitted relative to execution needs.';
  if (prog > 60) return 'Active commitment with reasonable completion conversion.';
  return 'Commitment is active, but completion conversion remains moderate.';
}

const roundPercent = (value: number) => Math.round(value * 10) / 10;
const formatSignedPercent = (value: number) => {
  const rounded = roundPercent(value);
  const abs = Math.abs(rounded);
  const formatted = Number.isInteger(rounded) ? abs.toFixed(0) : abs.toFixed(1);
  return `${rounded >= 0 ? '+' : '-'}${formatted}%`;
};

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
    const spendingRatio = allocation > 0 ? spent / allocation : 0;
    const health = computeBudgetHealth(available, allocation);
    return { allocation, spent, unspent, committed, available, utilization, spendingRatio, health };
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

  const expectedProgress = useMemo(() => computeExpectedProgress(viewType, academicYear), [viewType, academicYear]);

  const budgetEffectiveness = useMemo(() => {
    const insights: string[] = [];
    const commitPct = (totals.utilization * 100).toFixed(0);
    const spendPct = (totals.spendingRatio * 100).toFixed(0);
    insights.push(`Overall commitment ratio stands at ${commitPct}%, spending ratio at ${spendPct}%.`);
    const highUtil = allRows.filter(r => r.utilization >= 0.80);
    if (highUtil.length > 0) insights.push(`${highUtil.map(r => PILLAR_ABBREV[r.pillar]).join(', ')} ${highUtil.length === 1 ? 'has' : 'have'} commitment above 80%.`);
    const pressure = allRows.filter(r => r.budgetPressure);
    if (pressure.length > 0) insights.push(`Budget pressure detected in ${pressure.map(r => PILLAR_ABBREV[r.pillar]).join(', ')} (high commitment + elevated risk).`);
    const lowUtil = allRows.filter(r => r.utilization < 0.30);
    if (lowUtil.length > 0) insights.push(`${lowUtil.map(r => PILLAR_ABBREV[r.pillar]).join(', ')} show underdeployment (<30% committed).`);
    return insights;
  }, [allRows, totals]);

  const hasPressure = allRows.some(r => r.budgetPressure);
  const displayRows = pillarView === 'all' ? allRows : allRows.filter(r => r.pillar === pillarView);
  const selectedRow = pillarView !== 'all' ? allRows.find(r => r.pillar === pillarView) : null;
  const comparisonRows = pillarView !== 'all' ? allRows.filter(r => r.pillar !== pillarView) : [];

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
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive shrink-0" /><span className="text-xs font-medium text-foreground">Budget Pressure Detected — Commitment ≥ 80% and RI ≥ 50%</span></div>
        </motion.div>
      )}

      {/* KPI Cards — Split into Commitment & Spending Ratios */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <BudgetKPICard label="Allocation" subtitle="Total Planned" value={formatCurrency(totals.allocation)} fullValue={formatCurrencyFull(totals.allocation)} color="hsl(var(--primary))" infoTip="Total approved budget across all pillars for the strategic plan period." />
          <CommittedKPICard committed={totals.committed} spent={totals.spent} unspent={totals.unspent} allocation={totals.allocation} />
          <BudgetKPICard label="Available" subtitle="Remaining" value={formatCurrency(totals.available)} fullValue={formatCurrencyFull(totals.available)} color="hsl(var(--primary))" extraText={totals.allocation > 0 ? `${((totals.available / totals.allocation) * 100).toFixed(1)}% of allocation` : undefined} infoTip="Budget capacity not yet committed and still available for future initiatives." />
         {/* Commitment & Spending Ratio dual card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2, transition: { duration: 0.2 } }} className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.53))' }} />
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none" style={{ backgroundColor: 'hsl(var(--primary))' }} />
            <div className="relative p-4 sm:p-5">
              <div className="flex items-center gap-1">
                <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">Ratios</p>
                <InfoTip text="Commitment Ratio = Committed ÷ Allocated. Spending Ratio = Spent ÷ Allocated." />
              </div>
              <div className="mt-2 space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground font-medium">Commitment</span>
                    <span className="font-bold text-foreground">{(totals.utilization * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(100, totals.utilization * 100)}%` }} transition={{ delay: 0.3, duration: 0.5 }} style={{ backgroundColor: totals.health.color }} />
                  </div>
                  <p className="text-[9px] mt-0.5 font-medium" style={{ color: totals.health.color }}>{totals.health.health}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground font-medium">Spending</span>
                    <span className="font-bold text-foreground">{(totals.spendingRatio * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(100, totals.spendingRatio * 100)}%` }} transition={{ delay: 0.4, duration: 0.5 }} style={{ backgroundColor: computeSpendingHealth(totals.spendingRatio * totals.allocation, totals.allocation).color }} />
                  </div>
                  <p className="text-[9px] mt-0.5 font-medium" style={{ color: computeSpendingHealth(totals.spendingRatio * totals.allocation, totals.allocation).color }}>{computeSpendingHealth(totals.spendingRatio * totals.allocation, totals.allocation).health}</p>
                </div>
              </div>
            </div>
          </motion.div>
          <BudgetKPICard label="Budget Health" subtitle="Financial Capacity" value={totals.health.health} color={totals.health.color} showBar barPct={totals.utilization * 100} barColor={totals.utilization >= 0.80 ? '#059669' : totals.utilization >= 0.60 ? '#16A34A' : totals.utilization >= 0.30 ? '#F59E0B' : '#3B82F6'} extraText={`${(totals.utilization * 100).toFixed(1)}% committed`} infoTip="Budget health based on Commitment Ratio. No Commitment Yet (0–10%), Light (10–30%), Mild (30–60%), Healthy (60–80%), Strong (≥80%). Commitment reflects planning/engagement; Spending reflects actual execution — both are interpreted together but not combined." />
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
              <InfoTip text="Executive view of budget deployment, commitment and spending ratios, financial capacity, and execution alignment by pillar." />
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

          {/* Per-pillar cards */}
          {pillarView === 'all' ? (
            <div className="space-y-4">
              {displayRows.map((r, idx) => (
                <BudgetPillarCard key={r.pillar} r={r} idx={idx} pillarProgressData={pillarProgressData} expectedProgress={expectedProgress} />
              ))}
            </div>
          ) : (
            selectedRow && (
              <SinglePillarBudgetAnalytics
                row={selectedRow}
                pillarProgressData={pillarProgressData}
                expectedProgress={expectedProgress}
                comparisonRows={comparisonRows}
              />
            )
          )}
        </motion.div>
      </section>
    </div>
  );
}


/* ─── Budget Pillar Card (updated — no SEEI) ────────────────────── */

function BudgetPillarCard({ r, idx, pillarProgressData, expectedProgress }: { r: any; idx: number; pillarProgressData: any[]; expectedProgress: number }) {
  const commitmentPct = (r.utilization * 100).toFixed(1);
  const spendingPct = r.allocation > 0 ? ((r.spent / r.allocation) * 100).toFixed(1) : '0';
  const health = computeBudgetHealth(r.available, r.allocation);
  const prog = pillarProgressData.find((p: any) => p.pillar === r.pillar);
  const actualProgress = prog?.actualProgress ?? 0;
  const riInfo = getRiskDisplayInfo(r.riskIndex);
  const pillarColor = PILLAR_COLORS[r.pillar];
  const availPct = r.allocation > 0 ? ((r.available / r.allocation) * 100).toFixed(1) : '0';
  const executionGap = roundPercent(actualProgress - expectedProgress);
  const insight = getBudgetInsight(r.utilization, r.allocation > 0 ? r.spent / r.allocation : 0, actualProgress);

  const budgetDonut = [
    { name: 'Spent', value: r.spent, fill: '#16A34A' },
    { name: 'Unspent', value: r.unspent, fill: '#F59E0B' },
    { name: 'Available', value: r.available, fill: '#D1D5DB' },
  ].filter(d => d.value > 0);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + idx * 0.04 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:border-border/70 transition-all duration-300 overflow-hidden"
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${pillarColor}, ${pillarColor}66)` }} />
      <div className="p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          {/* Col 1: Pillar identity + health badge */}
          <div className="flex items-center gap-3 md:w-[180px] shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${pillarColor}18`, border: `1px solid ${pillarColor}30` }}>
              <span className="text-xs font-bold" style={{ color: pillarColor }}>{r.pillar}</span>
            </div>
            <div className="min-w-0">
              <Tooltip><TooltipTrigger asChild><p className="text-sm font-semibold text-foreground truncate cursor-help">{PILLAR_SHORT[r.pillar]}</p></TooltipTrigger><TooltipContent><p className="text-xs">{PILLAR_FULL[r.pillar]}</p></TooltipContent></Tooltip>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg inline-block mt-1" style={{ backgroundColor: `${health.color}15`, color: health.color }}>{health.health}</span>
            </div>
          </div>

          {/* Col 2: Budget Composition donut */}
          <div className="md:w-[200px] shrink-0">
            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider mb-1.5">Composition</p>
            <div className="flex items-center gap-2">
              <div className="w-[48px] h-[48px] shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={budgetDonut} innerRadius="42%" outerRadius="92%" dataKey="value" strokeWidth={0}>
                      {budgetDonut.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-0.5 text-[10px]">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" /><span className="text-foreground">Spent</span><span className="font-bold text-foreground ml-auto">{formatCurrency(r.spent)}</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" /><span className="text-foreground">Unspent</span><span className="font-bold text-foreground ml-auto">{formatCurrency(r.unspent)}</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D1D5DB] shrink-0" /><span className="text-foreground">Available</span><span className="font-bold text-foreground ml-auto">{formatCurrency(r.available)}</span></div>
              </div>
            </div>
          </div>

          {/* Col 3: Commitment & Spending Ratios + Capacity */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-foreground font-medium">Commitment Ratio</span>
                <span className="font-bold text-foreground">{commitmentPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, parseFloat(commitmentPct))}%` }} transition={{ delay: 0.3, duration: 0.5 }} className="h-full rounded-full" style={{ backgroundColor: parseFloat(commitmentPct) >= 80 ? '#EF4444' : parseFloat(commitmentPct) >= 60 ? '#F59E0B' : '#16A34A' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-foreground font-medium">Spending Ratio</span>
                <span className="font-bold text-foreground">{spendingPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, parseFloat(spendingPct))}%` }} transition={{ delay: 0.35, duration: 0.5 }} className="h-full rounded-full bg-[#16A34A]" />
              </div>
            </div>
            <div className="flex gap-4 text-[10px]">
              <div><span className="text-foreground">Capacity</span><p className="font-bold" style={{ color: health.color }}>{availPct}%</p></div>
              <div><span className="text-foreground">Allocation</span><p className="font-bold text-foreground">{formatCurrency(r.allocation)}</p></div>
            </div>
          </div>

          {/* Col 4: Execution context */}
          <div className="md:w-[160px] shrink-0 space-y-1 text-[10px]">
            <div className="flex justify-between"><span className="text-foreground">Progress</span><span className="font-bold" style={{ color: pillarColor }}>{actualProgress}%</span></div>
            <div className="flex justify-between"><span className="text-foreground">Risk Index</span><span className="font-bold" style={{ color: riInfo.color }}>{riInfo.percent}%</span></div>
            <div className="flex justify-between"><span className="text-foreground">Exec. Gap</span><span className="font-bold" style={{ color: executionGap >= 0 ? '#16A34A' : '#DC2626' }}>{formatSignedPercent(executionGap)}</span></div>
            <p className="text-[9px] text-foreground mt-1 leading-relaxed">{insight}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SinglePillarBudgetAnalytics({
  row,
  pillarProgressData,
  expectedProgress,
  comparisonRows,
}: {
  row: any;
  pillarProgressData: any[];
  expectedProgress: number;
  comparisonRows: any[];
}) {
  const prog = pillarProgressData.find((p: any) => p.pillar === row.pillar);
  const actualProgress = prog?.actualProgress ?? 0;
  const executionGap = roundPercent(actualProgress - expectedProgress);
  const commitmentRatio = row.utilization;
  const spendingRatio = row.allocation > 0 ? row.spent / row.allocation : 0;
  const insight = getBudgetInsight(commitmentRatio, spendingRatio, actualProgress);
  const health = computeBudgetHealth(row.available, row.allocation);
  const riInfo = getRiskDisplayInfo(row.riskIndex);
  const pillarColor = PILLAR_COLORS[row.pillar];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/50 bg-card/90 p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${pillarColor}18`, border: `1px solid ${pillarColor}30` }}>
            <span className="text-xs font-bold" style={{ color: pillarColor }}>{row.pillar}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Expanded View — {PILLAR_FULL[row.pillar]}</p>
            <p className="text-[10px] text-foreground">Focused budget-to-execution analysis for selected pillar</p>
          </div>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold" style={{ backgroundColor: `${health.color}15`, color: health.color }}>{health.health}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <MetricBox label="Commitment Ratio" value={`${(commitmentRatio * 100).toFixed(1)}%`} />
        <MetricBox label="Spending Ratio" value={`${(spendingRatio * 100).toFixed(1)}%`} />
        <MetricBox label="Actual Progress" value={`${roundPercent(actualProgress)}%`} />
        <MetricBox label="Expected Progress" value={`${expectedProgress}%`} />
        <MetricBox label="Execution Gap" value={formatSignedPercent(executionGap)} valueClass={executionGap >= 0 ? 'text-primary' : 'text-destructive'} />
        <MetricBox label="Risk Index" value={`${riInfo.percent}%`} valueStyle={{ color: riInfo.color }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RatioTrack label="Commitment Ratio" value={commitmentRatio * 100} color={commitmentRatio >= 0.8 ? '#EF4444' : commitmentRatio >= 0.4 ? '#F59E0B' : '#16A34A'} />
        <RatioTrack label="Spending Ratio" value={spendingRatio * 100} color="#16A34A" />
      </div>

      <div className="rounded-xl border border-border/40 p-4">
        <p className="text-xs font-semibold text-foreground uppercase mb-2">Pillar Diagnosis</p>
        <p className="text-xs text-foreground leading-relaxed">{insight}</p>
      </div>

      <div className="rounded-xl border border-border/40 p-4">
        <p className="text-xs font-semibold text-foreground uppercase mb-2">Other Pillars Context</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          {comparisonRows.map((other) => {
            const otherProgress = pillarProgressData.find((p: any) => p.pillar === other.pillar)?.actualProgress ?? 0;
            const otherGap = roundPercent(otherProgress - expectedProgress);
            const otherHasValue = other.utilization >= 0;
            return (
              <div key={other.pillar} className="rounded-lg border border-border/30 p-2.5">
                <p className="text-[10px] font-semibold text-foreground">P{other.pillar}</p>
                <p className="text-[10px] text-foreground">Commit {(other.utilization * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-foreground">Spend {(other.allocation > 0 ? (other.spent / other.allocation) * 100 : 0).toFixed(1)}%</p>
                <p className={`text-[10px] font-semibold ${otherHasValue ? '' : 'text-muted-foreground'}`} style={otherHasValue ? { color: otherGap >= 0 ? '#16A34A' : '#DC2626' } : undefined}>
                  Gap {otherHasValue ? formatSignedPercent(otherGap) : '—'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function MetricBox({ label, value, valueClass, valueStyle }: { label: string; value: string; valueClass?: string; valueStyle?: React.CSSProperties }) {
  return (
    <div className="rounded-lg border border-border/40 p-3">
      <p className="text-[10px] text-foreground mb-1">{label}</p>
      <p className={`text-sm font-bold text-foreground ${valueClass ?? ''}`} style={valueStyle}>{value}</p>
    </div>
  );
}

function RatioTrack({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold text-foreground">{roundPercent(value)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={{ delay: 0.2, duration: 0.45 }} style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}

/* ─── Helper Components ──────────────────────────────────────────── */

function BudgetKPICard({ label, subtitle, value, fullValue, color, showBar, barPct, barColor, extraText, infoTip }: {
  label: string; subtitle: string; value: string; fullValue?: string; color: string; showBar?: boolean; barPct?: number; barColor?: string; extraText?: string; infoTip?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2, transition: { duration: 0.2 } }} className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none" style={{ backgroundColor: color }} />
      <div className="relative p-4 sm:p-5 flex flex-col h-full">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-1">
            <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-tight">{label}</p>
            {infoTip && <InfoTip text={infoTip} />}
          </div>
          {subtitle && <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 mt-0.5 font-medium">{subtitle}</p>}
          <Tooltip><TooltipTrigger asChild>
            <p className="text-xl sm:text-2xl font-display font-extrabold mt-1.5 tracking-tight cursor-help" style={{ color }}>{value}</p>
          </TooltipTrigger>{fullValue && <TooltipContent><p className="text-xs font-mono">{fullValue}</p></TooltipContent>}</Tooltip>
          {extraText && <p className="text-[10px] text-muted-foreground mt-1">{extraText}</p>}
          {showBar && barPct !== undefined && barColor && (
            <div className="h-2 rounded-full bg-muted overflow-hidden mt-3">
              <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(100, barPct)}%` }} transition={{ delay: 0.3, duration: 0.6 }} style={{ backgroundColor: barColor }} />
            </div>
          )}
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
      </div>
    </motion.div>
  );
}
