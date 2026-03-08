/**
 * Tab 3 — Budget Intelligence (Redesigned)
 * No Commitment Intensity. Add donut allocation, scatter efficiency, improved stacked bars.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, AlertTriangle, Target, BarChart3 } from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, BarChart, Bar, ReferenceLine, ReferenceArea,
  PieChart, Pie, Cell as PieCell,
} from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTip } from '@/components/ui/info-tip';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateByPillar, getRiskBandColor, type UniversityAggregation } from '@/lib/university-aggregation';
import { PILLAR_LABELS, MOCK_BUDGET, getPillarBudget, formatCurrency, type BudgetScope, type PillarBudgetRow } from '@/lib/budget-data';
import { PILLAR_SHORT, PILLAR_FULL } from '@/lib/pillar-labels';
import type { PillarId } from '@/lib/types';

interface Props { aggregation: UniversityAggregation; }


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
  const utilColor = totals.utilization >= 0.80 ? '#EF4444' : totals.utilization >= 0.60 ? '#F59E0B' : '#16A34A';

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
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive shrink-0" /><span className="text-xs font-medium text-foreground">Budget Pressure Detected — Budget Utilization ≥ 80% and RI ≥ 1.51</span></div>
        </motion.div>
      )}

      {/* Section 1: Budget Overview KPIs */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <BudgetKPICard label="Allocation" subtitle="Total Planned" value={formatCurrency(totals.allocation)} icon={DollarSign} color="hsl(var(--primary))" tooltip="Budget Allocation: Total budget allocated across all pillars for the selected scope." />
          <BudgetKPICard label="Committed" subtitle="Funds in Use" value={formatCurrency(totals.committed)} icon={DollarSign} color="hsl(var(--primary))" tooltip="Committed: Total funds committed to active initiatives across all pillars." />
          <BudgetKPICard label="Available" subtitle="Remaining" value={formatCurrency(totals.available)} icon={DollarSign} color="hsl(var(--primary))" tooltip="Available: Remaining uncommitted budget across all pillars." />
          <BudgetKPICard label="Budget Utilization" subtitle="Used" value={`${(totals.utilization * 100).toFixed(1)}%`} icon={DollarSign} color={utilColor} tooltip="Percentage of the allocated budget that has already been utilized during the selected reporting cycle." showBar barPct={totals.utilization * 100} barColor={utilColor} />
        </div>
      </section>

      {/* Section 2: Budget Composition */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-muted-foreground" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget Composition by Pillar</span></div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allRows.map(r => ({ name: r.label, committed: r.committed, remaining: r.available }))} layout="vertical" margin={{ left: 50, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={v => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} width={40} />
                <ReTooltip formatter={(v: number) => `$${(v / 1_000_000).toFixed(2)}M`} contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="committed" stackId="a" fill="hsl(var(--primary))" name="Committed" />
                <Bar dataKey="remaining" stackId="a" fill="hsl(var(--muted-foreground))" fillOpacity={0.4} name="Remaining" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </section>

      {/* Section 3: Risk vs Budget Alignment */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Risk vs Budget Alignment</span>
            <InfoTip text="Quadrant chart mapping budget utilization (X) against Risk Index (Y). High utilization + high RI = budget pressure zone." />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">Budget Utilization vs Risk Index — colored by quadrant position.</p>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                {/* Quadrant zone shading */}
                <ReferenceArea x1={80} x2={100} y1={1.51} y2={3} fill="rgba(239,68,68,0.06)" fillOpacity={1} />
                <ReferenceArea x1={0} x2={80} y1={1.51} y2={3} fill="rgba(249,115,22,0.06)" fillOpacity={1} />
                <ReferenceArea x1={80} x2={100} y1={0} y2={1.51} fill="rgba(22,163,74,0.06)" fillOpacity={1} />
                <ReferenceArea x1={0} x2={80} y1={0} y2={1.51} fill="rgba(59,130,246,0.06)" fillOpacity={1} />
                <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Budget Utilization %', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <YAxis type="number" dataKey="y" domain={[0, 3]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Risk Index', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <ReferenceLine x={80} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <ReferenceLine y={1.51} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                <ReTooltip content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                      <p className="font-semibold text-foreground">{d.fullName}</p>
                      <p className="text-muted-foreground">Budget Utilization: <span className="text-foreground font-medium">{d.x}%</span></p>
                      <p className="text-muted-foreground">RI: <span className="font-medium" style={{ color: getRiskBandColor(d.y) }}>RI {d.y.toFixed(2)}</span></p>
                    </div>
                  );
                }} />
                <Scatter data={allRows.map(r => ({ x: parseFloat((r.utilization*100).toFixed(1)), y: r.riskIndex, name: r.label, fullName: PILLAR_FULL[r.pillar] }))}>
                  {allRows.map((r, i) => {
                    const q = r.utilization >= 0.80 && r.riskIndex >= 1.51 ? '#EF4444' : r.utilization < 0.80 && r.riskIndex >= 1.51 ? '#F97316' : r.utilization >= 0.80 ? '#16A34A' : '#3B82F6';
                    return <Cell key={i} fill={q} fillOpacity={0.7} r={Math.max(8, 12)} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            {[
              { label: 'High Budget / High Risk', desc: 'Budget Pressure', pos: 'top-right', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
              { label: 'Low Budget / High Risk', desc: 'Underfunded Risk', pos: 'top-left', color: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)' },
              { label: 'High Budget / Low Risk', desc: 'Healthy Spend', pos: 'bottom-right', color: '#16A34A', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.25)' },
              { label: 'Low Budget / Low Risk', desc: 'Balanced', pos: 'bottom-left', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
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

      {/* Section 4: Allocation Distribution Donut */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Allocation Distribution</span>
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
            <div className="flex-1 space-y-2.5 min-w-0">
              {allRows.map(r => (
                <TooltipProvider key={r.pillar}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2.5 cursor-help">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PILLAR_DONUT_COLORS[r.pillar] }} />
                        <span className="text-xs text-foreground flex-1">{PILLAR_SHORT[r.pillar]}</span>
                        <span className="text-xs font-bold text-foreground">{formatCurrency(r.allocation)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">{PILLAR_FULL[r.pillar]}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section 5: Budget Efficiency Scatter */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget Efficiency</span>
            <InfoTip text="Scatter chart mapping budget utilization against completion rate for each pillar. Ideal position is top-right (high completion, high utilization)." />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">Budget Utilization vs Completion — colored by quadrant position.</p>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                {/* Quadrant zone shading */}
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
                  const isHighBudget = r.utilization >= 0.50;
                  const isHighComp = comp >= 50;
                  const color = isHighBudget && isHighComp ? '#16A34A' : !isHighBudget && isHighComp ? '#3B82F6' : isHighBudget && !isHighComp ? '#EF4444' : '#F59E0B';
                  return { x: parseFloat((r.utilization*100).toFixed(1)), y: comp, name: r.label, fullName: PILLAR_FULL[r.pillar], qColor: color };
                })}>
                  {allRows.map((r, i) => {
                    const comp = pillarAgg.find(pa => pa.pillar === r.pillar)?.completionPct ?? 0;
                    const isHighBudget = r.utilization >= 0.50;
                    const isHighComp = comp >= 50;
                    const color = isHighBudget && isHighComp ? '#16A34A' : !isHighBudget && isHighComp ? '#3B82F6' : isHighBudget && !isHighComp ? '#EF4444' : '#F59E0B';
                    return <Cell key={i} fill={color} fillOpacity={0.7} r={Math.max(8, 12)} />;
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

function BudgetKPICard({ label, subtitle, value, icon: Icon, color, tooltip, showBar, barPct, barColor }: {
  label: string; subtitle: string; value: string; icon: React.ElementType; color: string; tooltip: string; showBar?: boolean; barPct?: number; barColor?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.12]"
        style={{ backgroundColor: color }}
      />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-tight flex items-center gap-0.5">
              {label}
              <InfoTip text={tooltip} />
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 mt-0.5 font-medium">{subtitle}</p>
            <p className="text-3xl sm:text-4xl font-display font-extrabold mt-3 tracking-tight" style={{ color }}>{value}</p>
            {showBar && barPct !== undefined && barColor && (
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-3">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, barPct)}%` }}
                  transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                  style={{ backgroundColor: barColor }}
                />
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
