/**
 * Tab 5 — Budget Intelligence
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, AlertTriangle, TrendingUp, BarChart3, Target, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell, BarChart, Bar, ReferenceLine } from 'recharts';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateByPillar, getRiskBandColor, type UniversityAggregation } from '@/lib/university-aggregation';
import type { PillarId } from '@/lib/types';

type BudgetScope = '2025-2026' | '2026-2027' | 'total';

interface PillarBudgetRow {
  pillar: PillarId; label: string; allocation: number; committed: number; available: number;
  utilization: number; commitmentIntensity: number; riskIndex: number; budgetPressure: boolean;
}

const PILLAR_LABELS: Record<PillarId, string> = { I: 'Pillar I', II: 'Pillar II', III: 'Pillar III', IV: 'Pillar IV', V: 'Pillar V' };

const MOCK_BUDGET: Record<PillarId, { year1: { allocation: number; committed: number; available: number }; year2: { allocation: number; committed: number; available: number } }> = {
  I:   { year1: { allocation: 2_400_000, committed: 1_920_000, available: 480_000 },  year2: { allocation: 2_600_000, committed: 1_560_000, available: 1_040_000 } },
  II:  { year1: { allocation: 1_800_000, committed: 1_260_000, available: 540_000 },  year2: { allocation: 1_950_000, committed: 1_170_000, available: 780_000 } },
  III: { year1: { allocation: 3_100_000, committed: 2_790_000, available: 310_000 },  year2: { allocation: 3_200_000, committed: 2_240_000, available: 960_000 } },
  IV:  { year1: { allocation: 1_500_000, committed: 900_000, available: 600_000 },    year2: { allocation: 1_600_000, committed: 800_000, available: 800_000 } },
  V:   { year1: { allocation: 2_200_000, committed: 1_760_000, available: 440_000 },  year2: { allocation: 2_300_000, committed: 1_380_000, available: 920_000 } },
};

interface Props { aggregation: UniversityAggregation; }

export default function BudgetIntelligence({ aggregation }: Props) {
  const [budgetScope, setBudgetScope] = useState<BudgetScope>('total');
  const { selectedPillar, viewType, term, academicYear } = useDashboard();
  const { data: unitResults } = useUniversityData();

  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  const allRows = useMemo<PillarBudgetRow[]>(() => {
    const pillarIds: PillarId[] = ['I','II','III','IV','V'];
    return pillarIds.map(p => {
      const mock = MOCK_BUDGET[p];
      let allocation: number, committed: number, available: number;
      if (budgetScope === '2025-2026') { allocation = mock.year1.allocation; committed = mock.year1.committed; available = mock.year1.available; }
      else if (budgetScope === '2026-2027') { allocation = mock.year2.allocation; committed = mock.year2.committed; available = mock.year2.available; }
      else { allocation = mock.year1.allocation + mock.year2.allocation; committed = mock.year1.committed + mock.year2.committed; available = mock.year1.available + mock.year2.available; }
      const utilization = (committed + available) > 0 ? committed / (committed + available) : 0;
      const commitmentIntensity = allocation > 0 ? committed / allocation : 0;
      const riskIdx = pillarAgg.find(pa => pa.pillar === p)?.riskIndex ?? 0;
      const budgetPressure = utilization >= 0.80 && riskIdx >= 1.51;
      return { pillar: p, label: PILLAR_LABELS[p], allocation, committed, available, utilization, commitmentIntensity, riskIndex: riskIdx, budgetPressure };
    });
  }, [budgetScope, pillarAgg]);

  const rows = useMemo(() => selectedPillar === 'all' ? allRows : allRows.filter(r => r.pillar === selectedPillar), [allRows, selectedPillar]);

  const totals = useMemo(() => {
    const allocation = rows.reduce((s, r) => s + r.allocation, 0);
    const committed = rows.reduce((s, r) => s + r.committed, 0);
    const available = rows.reduce((s, r) => s + r.available, 0);
    const utilization = (committed + available) > 0 ? committed / (committed + available) : 0;
    const commitmentIntensity = allocation > 0 ? committed / allocation : 0;
    const budgetPressure = utilization >= 0.80 && aggregation.riskIndex >= 1.51;
    return { allocation, committed, available, utilization, commitmentIntensity, budgetPressure };
  }, [rows, aggregation.riskIndex]);

  const hasPressure = rows.some(r => r.budgetPressure);
  const fmt = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K` : `$${v.toFixed(0)}`;

  return (
    <div className="space-y-6">
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
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive shrink-0" /><span className="text-xs font-medium text-foreground">Budget Pressure Detected — Utilization ≥ 80% and RiskIndex ≥ 1.51</span></div>
        </motion.div>
      )}

      {/* KPI Cards */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <KPICard label="Allocation" value={fmt(totals.allocation)} icon={DollarSign} />
          <KPICard label="Committed" value={fmt(totals.committed)} icon={DollarSign} />
          <KPICard label="Available" value={fmt(totals.available)} icon={DollarSign} />
          <div className="card-elevated p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
            <div className="relative">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Utilization</p>
              <p className="text-2xl font-display font-bold mt-1" style={{ color: totals.utilization >= 0.80 ? 'hsl(var(--destructive))' : totals.utilization >= 0.60 ? '#F59E0B' : '#16A34A' }}>{(totals.utilization * 100).toFixed(1)}%</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-2"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, totals.utilization * 100)}%`, backgroundColor: totals.utilization >= 0.80 ? 'hsl(var(--destructive))' : totals.utilization >= 0.60 ? '#F59E0B' : '#16A34A' }} /></div>
            </div>
          </div>
          <KPICard label="Commitment Intensity" value={`${(totals.commitmentIntensity * 100).toFixed(1)}%`} icon={Target} />
        </div>
      </motion.div>

      {/* Budget Composition */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-elevated p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget Composition (Per Pillar)</span></div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.map(r => ({ name: r.label, committed: r.committed, available: r.available }))} layout="vertical" margin={{ left: 60, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tickFormatter={v => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} width={55} />
              <ReTooltip formatter={(v: number) => `$${(v / 1_000_000).toFixed(2)}M`} contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="committed" stackId="a" fill="hsl(var(--primary))" name="Committed" />
              <Bar dataKey="available" stackId="a" fill="hsl(var(--muted))" name="Available" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Utilization Ranking */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Utilization Ranking</span></div>
        <div className="space-y-2">
          {[...rows].sort((a,b) => b.utilization - a.utilization).map((r, idx) => (
            <div key={r.pillar} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <span className="text-xs font-bold text-muted-foreground w-5">#{idx+1}</span>
              <span className="text-xs font-semibold text-foreground w-16">{r.label}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, r.utilization * 100)}%`, backgroundColor: r.utilization >= 0.80 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }} /></div>
              <span className={`text-xs font-bold w-12 text-right ${r.utilization >= 0.80 ? 'text-destructive' : 'text-foreground'}`}>{(r.utilization*100).toFixed(1)}%</span>
              {r.budgetPressure && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 font-semibold shrink-0">PRESSURE</span>}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Risk-Budget Quadrant */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-elevated p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4"><Target className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk–Budget Alignment Quadrant</span></div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Utilization %', position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
              <YAxis type="number" dataKey="y" domain={[0, 3]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'RiskIndex', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
              <ReferenceLine x={80} stroke="hsl(var(--border))" strokeDasharray="4 4" />
              <ReferenceLine y={1.51} stroke="hsl(var(--border))" strokeDasharray="4 4" />
              <Scatter data={allRows.map(r => ({ x: parseFloat((r.utilization*100).toFixed(1)), y: r.riskIndex, name: r.label }))}>
                {allRows.map((r, i) => {
                  const q = r.utilization >= 0.80 && r.riskIndex >= 1.51 ? '#EF4444' : r.utilization < 0.80 && r.riskIndex >= 1.51 ? '#F97316' : r.utilization >= 0.80 ? '#16A34A' : '#3B82F6';
                  return <Cell key={i} fill={q} r={8} />;
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Comparative Pillar Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card-elevated p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Comparative Pillar Table</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Pillar</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Allocation</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Committed</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Available</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Utilization %</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">RiskIndex</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">Pressure</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.pillar} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-2 font-semibold text-foreground">{r.label}</td>
                  <td className="py-2.5 px-2 text-right text-foreground">{fmt(r.allocation)}</td>
                  <td className="py-2.5 px-2 text-right text-foreground">{fmt(r.committed)}</td>
                  <td className="py-2.5 px-2 text-right text-foreground">{fmt(r.available)}</td>
                  <td className="py-2.5 px-2 text-right font-bold" style={{ color: r.utilization >= 0.80 ? '#EF4444' : undefined }}>{(r.utilization*100).toFixed(1)}%</td>
                  <td className="py-2.5 px-2 text-right font-bold" style={{ color: getRiskBandColor(r.riskIndex) }}>{r.riskIndex.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-center">{r.budgetPressure ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 font-semibold">YES</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function KPICard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="card-elevated p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p><p className="text-2xl font-display font-bold text-foreground mt-1">{value}</p></div>
        <div className="p-2 rounded-lg bg-muted/50"><Icon className="w-4 h-4 text-muted-foreground" /></div>
      </div>
    </div>
  );
}
