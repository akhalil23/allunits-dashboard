/**
 * Section 1: Pillar Overview Snapshot
 * High-level KPI cards per pillar + university totals
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { InfoTip } from '@/components/ui/info-tip';
import { RIMeter } from '@/components/ui/ri-meter';
import { PILLAR_COLORS } from '@/lib/pillar-colors';
import { PILLAR_SHORT, PILLAR_ABBREV } from '@/lib/pillar-labels';
import { getRiskDisplayInfo, formatRIPercent } from '@/lib/risk-display';
import { getLivePillarBudget, formatCurrency, computeBudgetHealth, computeSpendingHealth } from '@/lib/budget-data';
import { computeExpectedProgress, getItemStatus, getItemCompletion } from '@/lib/intelligence';
import { isNotApplicableStatus } from '@/lib/types';
import { aggregateByPillar, computeRiskIndexFromCounts } from '@/lib/university-aggregation';
import type { UnitFetchResult } from '@/lib/university-aggregation';
import type { PillarId, ViewType, Term, AcademicYear } from '@/lib/types';
import type { BudgetDataResult } from '@/hooks/use-budget-data';
import ExecutiveSummarySection from '@/components/shared/ExecutiveSummarySection';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

interface Props {
  unitResults: UnitFetchResult[];
  budgetResult: BudgetDataResult | undefined;
  viewType: ViewType;
  term: Term;
  academicYear: AcademicYear;
  selectedPillar: 'all' | PillarId;
  selectedUnits: string[];
}

const PILLAR_IDS: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

export default function PillarOverviewSnapshot({ unitResults, budgetResult, viewType, term, academicYear, selectedPillar, selectedUnits }: Props) {
  const filtered = useMemo(() => unitResults.filter(u => selectedUnits.includes(u.unitId) && u.result), [unitResults, selectedUnits]);

  const pillarStats = useMemo(() => {
    const pillarsToShow = selectedPillar === 'all' ? PILLAR_IDS : [selectedPillar];
    const expectedProgress = computeExpectedProgress(viewType, academicYear);

    return pillarsToShow.map(pillar => {
      let totalItems = 0, naCount = 0, cotCount = 0, cbtCount = 0, inProgressCount = 0, notStartedCount = 0;
      let progressSum = 0, progressCount = 0;

      filtered.forEach(ur => {
        ur.result!.data.forEach(item => {
          if (item.pillar !== pillar) return;
          totalItems++;
          const status = getItemStatus(item, viewType, term, academicYear);
          if (isNotApplicableStatus(status)) { naCount++; return; }
          switch (status) {
            case 'Completed – On Target': cotCount++; break;
            case 'Completed – Below Target': cbtCount++; break;
            case 'In Progress':
              inProgressCount++;
              progressSum += getItemCompletion(item, viewType, term, academicYear);
              progressCount++;
              break;
            case 'Not Started': notStartedCount++; break;
          }
        });
      });

      const applicableItems = totalItems - naCount;
      const completionPct = applicableItems > 0 ? parseFloat(((cotCount + cbtCount) / applicableItems * 100).toFixed(1)) : 0;
      const actualProgress = progressCount > 0 ? Math.round(progressSum / progressCount) : 0;
      const pillarAgg = aggregateByPillar(filtered, viewType, term, academicYear).find(p => p.pillar === pillar);
      const riskIndex = pillarAgg?.riskIndex ?? 0;
      const b = getLivePillarBudget(budgetResult?.pillars, pillar);

      return {
        pillar, totalItems, naCount, applicableItems, cotCount, cbtCount, inProgressCount, notStartedCount,
        completionPct, actualProgress, riskIndex, expectedProgress,
        allocated: b.allocation, committed: b.committed, spent: b.spent, available: b.available,
      };
    });
  }, [filtered, selectedPillar, viewType, term, academicYear, budgetResult]);

  // University-level totals
  const totals = useMemo(() => {
    let total = 0, applicable = 0, cot = 0, cbt = 0, ip = 0, ns = 0;
    let alloc = 0, committed = 0, spent = 0;
    pillarStats.forEach(s => {
      total += s.totalItems; applicable += s.applicableItems;
      cot += s.cotCount; cbt += s.cbtCount; ip += s.inProgressCount; ns += s.notStartedCount;
      alloc += s.allocated; committed += s.committed; spent += s.spent;
    });
    const avgProgress = pillarStats.reduce((s, p) => s + p.actualProgress, 0) / (pillarStats.length || 1);
    const avgRi = pillarStats.length > 0
      ? parseFloat((pillarStats.reduce((s, p) => s + p.riskIndex * p.applicableItems, 0) / (applicable || 1)).toFixed(2))
      : 0;
    const commitRatio = alloc > 0 ? committed / alloc : 0;
    const spendRatio = alloc > 0 ? spent / alloc : 0;
    return { total, applicable, cot, cbt, ip, ns, avgProgress: Math.round(avgProgress), avgRi, alloc, committed, spent, commitRatio, spendRatio };
  }, [pillarStats]);

  const riInfo = getRiskDisplayInfo(totals.avgRi);

  // Chart data for all-pillar view
  const chartData = useMemo(() => pillarStats.map(s => ({
    name: PILLAR_ABBREV[s.pillar],
    progress: s.actualProgress,
    completion: s.completionPct,
    ri: parseFloat(((s.riskIndex / 3) * 100).toFixed(1)),
    color: PILLAR_COLORS[s.pillar],
  })), [pillarStats]);

  return (
    <div className="space-y-6">
      {/* University-level KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <KPICard label="Total Items" value={`${totals.total}`} subtitle={`${totals.applicable} applicable`} color="hsl(var(--primary))" tooltip="Total action steps across selected scope." />
        <KPICard label="Progress" value={`${totals.avgProgress}%`} subtitle={`Expected ${pillarStats[0]?.expectedProgress ?? 0}%`} color={totals.avgProgress >= (pillarStats[0]?.expectedProgress ?? 0) ? '#16A34A' : '#DC2626'} tooltip="Average completion of in-progress items." />
        <KPICard label="Completion" value={`${totals.applicable > 0 ? ((totals.cot + totals.cbt) / totals.applicable * 100).toFixed(1) : 0}%`} subtitle={`${totals.cot + totals.cbt} of ${totals.applicable}`} color="#059669" tooltip="Percentage of applicable items completed (on or below target)." />
        <KPICard label="Risk Index" value={`${riInfo.percent}%`} subtitle={riInfo.band} color={riInfo.color} tooltip="Weighted structural risk across applicable items." />
        <KPICard label="Commitment" value={`${(totals.commitRatio * 100).toFixed(1)}%`} subtitle={computeBudgetHealth(totals.alloc - totals.committed, totals.alloc).health} color={computeBudgetHealth(totals.alloc - totals.committed, totals.alloc).color} tooltip="Committed ÷ Allocated budget ratio." />
        <KPICard label="Spending" value={`${(totals.spendRatio * 100).toFixed(1)}%`} subtitle={computeSpendingHealth(totals.spent, totals.alloc).health} color={computeSpendingHealth(totals.spent, totals.alloc).color} tooltip="Spent ÷ Allocated budget ratio." />
      </div>

      {/* Per-Pillar Cards */}
      {selectedPillar === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {pillarStats.map(s => {
            const ri = getRiskDisplayInfo(s.riskIndex);
            const gap = s.actualProgress - s.expectedProgress;
            return (
              <motion.div key={s.pillar} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-1.5 w-full" style={{ background: PILLAR_COLORS[s.pillar] }} />
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground">{PILLAR_SHORT[s.pillar]}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${ri.color}15`, color: ri.color }}>{ri.band}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-muted-foreground">Items:</span> <span className="font-semibold text-foreground">{s.applicableItems}/{s.totalItems}</span></div>
                    <div><span className="text-muted-foreground">Progress:</span> <span className="font-semibold" style={{ color: gap >= 0 ? '#16A34A' : '#DC2626' }}>{s.actualProgress}%</span></div>
                    <div><span className="text-muted-foreground">Completion:</span> <span className="font-semibold text-foreground">{s.completionPct}%</span></div>
                    <div><span className="text-muted-foreground">RI:</span> <span className="font-semibold" style={{ color: ri.color }}>{ri.percent}%</span></div>
                    <div><span className="text-muted-foreground">Allocated:</span> <span className="font-semibold text-foreground">{formatCurrency(s.allocated)}</span></div>
                    <div><span className="text-muted-foreground">Spent:</span> <span className="font-semibold text-foreground">{formatCurrency(s.spent)}</span></div>
                  </div>
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Status Distribution</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-muted/30 flex">
                      {s.applicableItems > 0 && (
                        <>
                          <div style={{ width: `${s.cotCount / s.applicableItems * 100}%`, backgroundColor: '#16A34A' }} />
                          <div style={{ width: `${s.cbtCount / s.applicableItems * 100}%`, backgroundColor: '#7F1D1D' }} />
                          <div style={{ width: `${s.inProgressCount / s.applicableItems * 100}%`, backgroundColor: '#E6A23C' }} />
                          <div style={{ width: `${s.notStartedCount / s.applicableItems * 100}%`, backgroundColor: '#94A3B8' }} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Single Pillar Expanded View */}
      {selectedPillar !== 'all' && pillarStats[0] && (
        <SinglePillarDetail stat={pillarStats[0]} budgetResult={budgetResult} />
      )}

      {/* Cross-pillar comparison chart */}
      {selectedPillar === 'all' && chartData.length > 1 && (
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4 sm:p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">Cross-Pillar Comparison</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                <ReTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="progress" name="Progress %" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
                </Bar>
                <Bar dataKey="completion" name="Completion %" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.4} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {chartData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Executive Summary Section */}
      <ExecutiveSummarySection
        academicYear={academicYear}
        term={term}
        pillarFilter={selectedPillar}
        title="Pillar Executive Summary"
      />
    </div>
  );
}

function SinglePillarDetail({ stat, budgetResult }: { stat: any; budgetResult: BudgetDataResult | undefined }) {
  const ri = getRiskDisplayInfo(stat.riskIndex);
  const commitRatio = stat.allocated > 0 ? stat.committed / stat.allocated : 0;
  const spendRatio = stat.allocated > 0 ? stat.spent / stat.allocated : 0;
  const bHealth = computeBudgetHealth(stat.available, stat.allocated);
  const sHealth = computeSpendingHealth(stat.spent, stat.allocated);
  const gap = stat.actualProgress - stat.expectedProgress;

  const statusData = [
    { name: 'On Target', value: stat.cotCount, color: '#16A34A' },
    { name: 'Below Target', value: stat.cbtCount, color: '#7F1D1D' },
    { name: 'In Progress', value: stat.inProgressCount, color: '#E6A23C' },
    { name: 'Not Started', value: stat.notStartedCount, color: '#94A3B8' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Execution */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Execution</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Progress</span><span className="font-bold" style={{ color: gap >= 0 ? '#16A34A' : '#DC2626' }}>{stat.actualProgress}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Expected</span><span className="font-semibold text-foreground">{stat.expectedProgress}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Exec. Gap</span><span className="font-bold" style={{ color: gap >= 0 ? '#16A34A' : '#DC2626' }}>{gap >= 0 ? '+' : ''}{gap.toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Completion</span><span className="font-semibold text-foreground">{stat.completionPct}%</span></div>
          </div>
        </div>

        {/* Risk */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Risk Profile</h4>
          <div className="flex items-center gap-3">
            <RIMeter ri={stat.riskIndex} compact />
            <div>
              <p className="text-lg font-display font-extrabold" style={{ color: ri.color }}>{ri.percent}%</p>
              <p className="text-xs text-muted-foreground">{ri.band}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">{ri.insight}</p>
        </div>

        {/* Budget */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Budget</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Allocated</span><span className="font-semibold text-foreground">{formatCurrency(stat.allocated)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Committed</span><span className="font-semibold text-foreground">{formatCurrency(stat.committed)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Spent</span><span className="font-semibold text-foreground">{formatCurrency(stat.spent)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Commitment</span><span className="font-bold" style={{ color: bHealth.color }}>{(commitRatio * 100).toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Spending</span><span className="font-bold" style={{ color: sHealth.color }}>{(spendRatio * 100).toFixed(1)}%</span></div>
          </div>
        </div>
      </div>

      {/* Status Distribution Donut */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Status Distribution</h4>
        <div className="flex items-center gap-6">
          <div className="w-[140px] h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {statusData.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground flex-1">{d.name}</span>
                <span className="font-bold text-foreground">{d.value}</span>
                <span className="text-muted-foreground">({stat.applicableItems > 0 ? (d.value / stat.applicableItems * 100).toFixed(1) : 0}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, subtitle, color, tooltip }: { label: string; value: string; subtitle: string; color: string; tooltip: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 30% 20%, ${color}12, transparent 70%)` }} />
      <div className="relative p-4 sm:p-5">
        <div className="flex items-center gap-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
          <InfoTip text={tooltip} />
        </div>
        <p className={`font-display font-extrabold mt-1.5 tracking-tight ${value.length > 10 ? 'text-sm sm:text-base' : 'text-xl sm:text-2xl'}`} style={{ color }}>{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </motion.div>
  );
}
