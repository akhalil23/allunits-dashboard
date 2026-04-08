/**
 * Section 4: Budget Intelligence per Pillar
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { PILLAR_COLORS } from '@/lib/pillar-colors';
import { PILLAR_SHORT, PILLAR_ABBREV } from '@/lib/pillar-labels';
import { getLivePillarBudget, formatCurrency, formatCurrencyFull, computeBudgetHealth, computeSpendingHealth } from '@/lib/budget-data';
import { InfoTip } from '@/components/ui/info-tip';
import type { PillarId } from '@/lib/types';
import type { BudgetDataResult } from '@/hooks/use-budget-data';

interface Props {
  budgetResult: BudgetDataResult | undefined;
  selectedPillar: 'all' | PillarId;
}

const PILLAR_IDS: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

export default function PillarBudgetView({ budgetResult, selectedPillar }: Props) {
  const pillarBudgets = useMemo(() => {
    const pillars = selectedPillar === 'all' ? PILLAR_IDS : [selectedPillar];
    return pillars.map(p => {
      const b = getLivePillarBudget(budgetResult?.pillars, p);
      const commitRatio = b.allocation > 0 ? b.committed / b.allocation : 0;
      const spendRatio = b.allocation > 0 ? b.spent / b.allocation : 0;
      const bHealth = computeBudgetHealth(b.available, b.allocation);
      const sHealth = computeSpendingHealth(b.spent, b.allocation);
      return { pillar: p, ...b, commitRatio, spendRatio, bHealth, sHealth };
    });
  }, [budgetResult, selectedPillar]);

  const totals = useMemo(() => {
    let alloc = 0, committed = 0, spent = 0, available = 0;
    pillarBudgets.forEach(b => { alloc += b.allocation; committed += b.committed; spent += b.spent; available += b.available; });
    return { alloc, committed, spent, available, commitRatio: alloc > 0 ? committed / alloc : 0, spendRatio: alloc > 0 ? spent / alloc : 0 };
  }, [pillarBudgets]);

  const bHealthTotal = computeBudgetHealth(totals.available, totals.alloc);
  const sHealthTotal = computeSpendingHealth(totals.spent, totals.alloc);

  // Chart data for composition
  const compositionData = pillarBudgets.map(b => ({
    name: PILLAR_ABBREV[b.pillar],
    allocation: b.allocation,
    committed: b.committed,
    spent: b.spent,
    color: PILLAR_COLORS[b.pillar],
  }));

  // Chart data for ratios
  const ratioData = pillarBudgets.map(b => ({
    name: PILLAR_ABBREV[b.pillar],
    commitment: parseFloat((b.commitRatio * 100).toFixed(1)),
    spending: parseFloat((b.spendRatio * 100).toFixed(1)),
    color: PILLAR_COLORS[b.pillar],
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <BudgetKPI label="Allocation" value={formatCurrency(totals.alloc)} tooltip="Total budget allocated across selected pillars." color="hsl(var(--primary))" />
        <BudgetKPI label="Committed" value={formatCurrency(totals.committed)} tooltip="Total funds committed (planned + spent)." color="#3B82F6" />
        <BudgetKPI label="Spent" value={formatCurrency(totals.spent)} tooltip="Total funds actually disbursed." color="#059669" />
        <BudgetKPI label="Commitment Ratio" value={`${(totals.commitRatio * 100).toFixed(1)}%`} subtitle={bHealthTotal.health} tooltip="Committed ÷ Allocated." color={bHealthTotal.color} />
        <BudgetKPI label="Spending Ratio" value={`${(totals.spendRatio * 100).toFixed(1)}%`} subtitle={sHealthTotal.health} tooltip="Spent ÷ Allocated." color={sHealthTotal.color} />
      </div>

      {/* Per-Pillar Budget Cards */}
      {selectedPillar === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {pillarBudgets.map(b => (
            <motion.div key={b.pillar} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-1.5" style={{ backgroundColor: PILLAR_COLORS[b.pillar] }} />
              <div className="p-4 space-y-2">
                <h4 className="text-xs font-bold text-foreground">{PILLAR_SHORT[b.pillar]}</h4>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">Allocated</span><span className="font-semibold text-foreground">{formatCurrency(b.allocation)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Committed</span><span className="font-semibold text-foreground">{formatCurrency(b.committed)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Spent</span><span className="font-semibold text-foreground">{formatCurrency(b.spent)}</span></div>
                  <div className="h-px bg-border/30 my-1" />
                  <div className="flex justify-between"><span className="text-muted-foreground">Commitment</span><span className="font-bold" style={{ color: b.bHealth.color }}>{(b.commitRatio * 100).toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Spending</span><span className="font-bold" style={{ color: b.sHealth.color }}>{(b.spendRatio * 100).toFixed(1)}%</span></div>
                </div>
                {/* Ratio bars */}
                <div className="space-y-1 pt-1">
                  <div className="h-1.5 rounded-full overflow-hidden bg-muted/30">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(b.commitRatio * 100, 100)}%`, backgroundColor: b.bHealth.color }} />
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-muted/30">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(b.spendRatio * 100, 100)}%`, backgroundColor: b.sHealth.color }} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts */}
      {selectedPillar === 'all' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Budget Composition */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Budget Composition by Pillar</h4>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compositionData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatCurrency(v)} />
                  <ReTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} formatter={(v: number) => formatCurrencyFull(v)} />
                  <Bar dataKey="allocation" name="Allocated" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="committed" name="Committed" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spent" name="Spent" fill="#D97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ratio Comparison */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Commitment & Spending Ratios</h4>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratioData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                  <ReTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                  <Bar dataKey="commitment" name="Commitment %" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spending" name="Spending %" fill="#D97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Single pillar detailed budget */}
      {selectedPillar !== 'all' && pillarBudgets[0] && (
        <SinglePillarBudgetDetail budget={pillarBudgets[0]} />
      )}
    </div>
  );
}

function SinglePillarBudgetDetail({ budget }: { budget: any }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 space-y-4">
      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Detailed Budget Breakdown</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Allocated', value: formatCurrencyFull(budget.allocation), color: 'hsl(var(--primary))' },
          { label: 'Total Committed', value: formatCurrencyFull(budget.committed), color: '#3B82F6' },
          { label: 'Total Spent', value: formatCurrencyFull(budget.spent), color: '#059669' },
          { label: 'Unspent', value: formatCurrencyFull(budget.unspent), color: '#D97706' },
          { label: 'Available', value: formatCurrencyFull(budget.available), color: '#6B7280' },
        ].map(item => (
          <div key={item.label} className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
            <p className="text-lg font-display font-bold" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 pt-2">
        <div className="space-y-1">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Commitment Ratio</span><span className="font-bold" style={{ color: budget.bHealth.color }}>{(budget.commitRatio * 100).toFixed(1)}% — {budget.bHealth.health}</span></div>
          <div className="h-2 rounded-full overflow-hidden bg-muted/30"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(budget.commitRatio * 100, 100)}%`, backgroundColor: budget.bHealth.color }} /></div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Spending Ratio</span><span className="font-bold" style={{ color: budget.sHealth.color }}>{(budget.spendRatio * 100).toFixed(1)}% — {budget.sHealth.health}</span></div>
          <div className="h-2 rounded-full overflow-hidden bg-muted/30"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(budget.spendRatio * 100, 100)}%`, backgroundColor: budget.sHealth.color }} /></div>
        </div>
      </div>
    </div>
  );
}

function BudgetKPI({ label, value, subtitle, tooltip, color }: { label: string; value: string; subtitle?: string; tooltip: string; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 30% 20%, ${color}12, transparent 70%)` }} />
      <div className="relative p-4 sm:p-5">
        <div className="flex items-center gap-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
          <InfoTip text={tooltip} />
        </div>
        <p className={`font-display font-extrabold mt-1.5 tracking-tight ${value.length > 10 ? 'text-sm sm:text-base' : 'text-xl sm:text-2xl'}`} style={{ color }}>{value}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </motion.div>
  );
}
