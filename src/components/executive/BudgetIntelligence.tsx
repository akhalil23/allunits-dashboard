/**
 * Tab 3 — Budget Intelligence (Redesigned)
 * No Commitment Intensity. Add donut allocation, scatter efficiency, improved stacked bars.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, AlertTriangle, Target, BarChart3, Info } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, BarChart, Bar, ReferenceLine,
  PieChart, Pie, Cell as PieCell,
} from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateByPillar, getRiskBandColor, type UniversityAggregation } from '@/lib/university-aggregation';
import { PILLAR_LABELS, MOCK_BUDGET, getPillarBudget, formatCurrency, type BudgetScope, type PillarBudgetRow } from '@/lib/budget-data';
import { PILLAR_SHORT, PILLAR_FULL } from '@/lib/pillar-labels';
import type { PillarId } from '@/lib/types';

interface Props { aggregation: UniversityAggregation; }

function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground/60 cursor-help inline ml-1" /></TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs"><p>{text}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const PILLAR_DONUT_COLORS: Record<PillarId, string> = {
  I: '#6366F1', II: '#F59E0B', III: '#10B981', IV: '#F97316', V: '#8B5CF6',
};

export default function BudgetIntelligence({ aggregation }: Props) {
  const [budgetScope, setBudgetScope] = useState<BudgetScope>('total');
  const { viewType, term, academicYear } = useDashboard();
  const { data: unitResults } = useUniversityData();

  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  const allRows = useMemo<PillarBudgetRow[]>(() => {
    const pillarIds: PillarId[] = ['I','II','III','IV','V'];
    return pillarIds.map(p => {
      const b = getPillarBudget(p, budgetScope);
      const utilization = (b.committed + b.available) > 0 ? b.committed / (b.committed + b.available) : 0;
      const riskIdx = pillarAgg.find(pa => pa.pillar === p)?.riskIndex ?? 0;
      const budgetPressure = utilization >= 0.80 && riskIdx >= 1.51;
      return { pillar: p, label: PILLAR_LABELS[p], allocation: b.allocation, committed: b.committed, available: b.available, utilization, riskIndex: riskIdx, budgetPressure };
    });
  }, [budgetScope, pillarAgg]);

  const totals = useMemo(() => {
    const allocation = allRows.reduce((s, r) => s + r.allocation, 0);
    const committed = allRows.reduce((s, r) => s + r.committed, 0);
    const available = allRows.reduce((s, r) => s + r.available, 0);
    const utilization = (committed + available) > 0 ? committed / (committed + available) : 0;
    return { allocation, committed, available, utilization };
  }, [allRows]);

  const hasPressure = allRows.some(r => r.budgetPressure);

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground italic px-1">Budget context: 2-Year Strategic Plan (2025–2027). All figures represent planned allocations and commitments.</p>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Budget Scope</span>
        <div className="flex gap-1">
          {([['2025-2026','2025–2026'],['2026-2027','2026–2027'],['total','Total (2025–2027 Plan)']] as [BudgetScope,string][]).map(([val,lbl]) => (
            <button key={val} onClick={() => setBudgetScope(val)} className={`filter-pill ${budgetScope === val ? 'filter-pill-active' : ''}`}>{lbl}</button>
          ))}
        </div>
      </div>

      {hasPressure && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-3 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive shrink-0" /><span className="text-xs font-medium text-foreground">Budget Pressure Detected — Budget Utilization ≥ 80% and RI ≥ 1.51</span></div>
        </motion.div>
      )}

      {/* Section 1: Budget Overview KPIs */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPICard label="Allocation — Total Planned" value={formatCurrency(totals.allocation)} icon={DollarSign} tooltip="Budget Allocation: Total budget allocated across all pillars for the selected scope." />
          <KPICard label="Committed — Funds in Use" value={formatCurrency(totals.committed)} icon={DollarSign} tooltip="Committed: Total funds committed to active initiatives across all pillars." />
          <KPICard label="Available — Remaining" value={formatCurrency(totals.available)} icon={DollarSign} tooltip="Available: Remaining uncommitted budget across all pillars." />
          <div className="card-elevated p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
            <div className="relative">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center">
                Budget Utilization <InfoTip text="Budget Utilization: Percentage of total budget (committed + available) that has been committed." />
              </p>
              <p className="text-xl sm:text-2xl font-display font-bold mt-1" style={{ color: totals.utilization >= 0.80 ? '#EF4444' : totals.utilization >= 0.60 ? '#F59E0B' : '#16A34A' }}>
                {(totals.utilization * 100).toFixed(1)}%
              </p>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, totals.utilization * 100)}%`, backgroundColor: totals.utilization >= 0.80 ? '#EF4444' : totals.utilization >= 0.60 ? '#F59E0B' : '#16A34A' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Budget Composition */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget Composition by Pillar</span></div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allRows.map(r => ({ name: r.label, committed: r.committed, remaining: r.available }))} layout="vertical" margin={{ left: 50, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={v => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} width={40} />
                <ReTooltip formatter={(v: number) => `$${(v / 1_000_000).toFixed(2)}M`} contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="committed" stackId="a" fill="hsl(var(--primary))" name="Committed" />
                <Bar dataKey="remaining" stackId="a" fill="#94A3B8" name="Remaining" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Section 3: Risk vs Budget Alignment Quadrant */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk vs Budget Alignment</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 15, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Budget Utilization %', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <YAxis type="number" dataKey="y" domain={[0, 3]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'RI', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <ReferenceLine x={80} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <ReferenceLine y={1.51} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <ReTooltip content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg p-2.5 shadow-lg text-xs space-y-0.5">
                      <p className="font-semibold text-foreground">{d.fullName}</p>
                      <p>Budget Utilization: {d.x}%</p>
                      <p>RI: <span style={{ color: getRiskBandColor(d.y) }}>{d.y.toFixed(2)}</span></p>
                    </div>
                  );
                }} />
                <Scatter data={allRows.map(r => ({ x: parseFloat((r.utilization*100).toFixed(1)), y: r.riskIndex, name: r.label, fullName: PILLAR_FULL[r.pillar] }))}>
                  {allRows.map((r, i) => {
                    const q = r.utilization >= 0.80 && r.riskIndex >= 1.51 ? '#EF4444' : r.utilization < 0.80 && r.riskIndex >= 1.51 ? '#F97316' : r.utilization >= 0.80 ? '#16A34A' : '#3B82F6';
                    return <Cell key={i} fill={q} r={9} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Section 4: Allocation Distribution Donut */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-5 sm:p-6">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Allocation Distribution</span>
          <div className="flex items-center gap-5 mt-4">
            <div className="w-36 h-36 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={allRows.map(r => ({ name: PILLAR_SHORT[r.pillar], value: r.allocation, pillar: r.pillar, fullName: PILLAR_FULL[r.pillar] }))} innerRadius="55%" outerRadius="85%" dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                    {allRows.map((r, i) => <Cell key={i} fill={PILLAR_DONUT_COLORS[r.pillar]} />)}
                  </Pie>
                  <ReTooltip formatter={(v: number, n: string) => [formatCurrency(v), n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              {allRows.map(r => (
                <TooltipProvider key={r.pillar}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PILLAR_DONUT_COLORS[r.pillar] }} />
                        <span className="text-[11px] text-foreground flex-1">{PILLAR_SHORT[r.pillar]}</span>
                        <span className="text-[11px] font-bold text-foreground">{formatCurrency(r.allocation)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">{PILLAR_FULL[r.pillar]}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Section 5: Budget Efficiency Scatter */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget Efficiency</span>
            <InfoTip text="Scatter chart mapping budget utilization against completion rate for each pillar. Ideal position is top-right." />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 15, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Budget Utilization %', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <YAxis type="number" dataKey="y" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Completion %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <ReTooltip content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg p-2.5 shadow-lg text-xs space-y-0.5">
                      <p className="font-semibold text-foreground">{d.fullName}</p>
                      <p>Budget Utilization: {d.x}%</p>
                      <p>Completion: {d.y}%</p>
                    </div>
                  );
                }} />
                <Scatter data={allRows.map(r => {
                  const comp = pillarAgg.find(pa => pa.pillar === r.pillar)?.completionPct ?? 0;
                  return { x: parseFloat((r.utilization*100).toFixed(1)), y: comp, name: r.label, fullName: PILLAR_FULL[r.pillar] };
                })}>
                  {allRows.map((_, i) => <Cell key={i} fill="hsl(var(--primary))" r={9} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, tooltip }: { label: string; value: string; icon: React.ElementType; tooltip: string }) {
  return (
    <div className="card-elevated p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center">
            {label}<InfoTip text={tooltip} />
          </p>
          <p className="text-xl sm:text-2xl font-display font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50"><Icon className="w-4 h-4 text-muted-foreground" /></div>
      </div>
    </div>
  );
}
