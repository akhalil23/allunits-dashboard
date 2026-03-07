/**
 * Tab 3 — Priority & Impact
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { BarChart3, Target } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateByPillar, getRiskBandColor, type UniversityAggregation, type UnitAggregation } from '@/lib/university-aggregation';
import type { PillarId } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = { 'Completed – On Target': '#16A34A', 'Completed – Below Target': '#7F1D1D', 'In Progress': '#F59E0B', 'Not Started': '#EF4444' };
const PILLAR_LABELS: Record<PillarId, string> = { I: 'Pillar I', II: 'Pillar II', III: 'Pillar III', IV: 'Pillar IV', V: 'Pillar V' };

interface Props { aggregation: UniversityAggregation; }

export default function PriorityImpact({ aggregation }: Props) {
  const { viewType, academicYear, term } = useDashboard();
  const { data: unitResults } = useUniversityData();
  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  const statusDist = useMemo(() => {
    const { cotCount, cbtCount, inProgressCount, notStartedCount, applicableItems } = aggregation;
    const denom = applicableItems || 1;
    return [
      { status: 'Completed – On Target', count: cotCount, pct: Math.round((cotCount / denom) * 100) },
      { status: 'Completed – Below Target', count: cbtCount, pct: Math.round((cbtCount / denom) * 100) },
      { status: 'In Progress', count: inProgressCount, pct: Math.round((inProgressCount / denom) * 100) },
      { status: 'Not Started', count: notStartedCount, pct: Math.round((notStartedCount / denom) * 100) },
    ];
  }, [aggregation]);

  const unitsByRisk = useMemo(() => [...aggregation.unitAggregations].filter(u => u.applicableItems > 0).sort((a, b) => b.riskIndex - a.riskIndex || a.unitName.localeCompare(b.unitName)), [aggregation]);
  const unitsByCompletion = useMemo(() => [...aggregation.unitAggregations].filter(u => u.applicableItems > 0).sort((a, b) => a.completionPct - b.completionPct || a.unitName.localeCompare(b.unitName)), [aggregation]);

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground italic px-1">Risk signals are derived exclusively from execution status and do not incorporate time progression.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <StatusDistributionCard statusDist={statusDist} applicableItems={aggregation.applicableItems} />
        <PillarDistributionCard pillarAgg={pillarAgg} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <UnitRankingCard title="Units Ranked by RiskIndex" subtitle="Highest risk first" icon={BarChart3} units={unitsByRisk} metricKey="riskIndex" />
        <UnitRankingCard title="Units Ranked by Completion %" subtitle="Lowest completion first" icon={Target} units={unitsByCompletion} metricKey="completionPct" />
      </div>
    </div>
  );
}

function StatusDistributionCard({ statusDist, applicableItems }: { statusDist: { status: string; count: number; pct: number }[]; applicableItems: number }) {
  const donutData = statusDist.filter(d => d.count > 0);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-4 sm:p-6">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Distribution by Status</span>
      <div className="flex items-center gap-4 sm:gap-6 mt-4">
        <div className="w-28 h-28 sm:w-36 sm:h-36 shrink-0">
          <ResponsiveContainer><PieChart><Pie data={donutData} innerRadius="60%" outerRadius="85%" dataKey="count" startAngle={90} endAngle={-270} strokeWidth={0} nameKey="status">{donutData.map((d, i) => (<Cell key={i} fill={STATUS_COLORS[d.status] || '#9CA3AF'} />))}</Pie><RechartsTooltip formatter={(value: number, name: string) => [`${value} items`, name]} /></PieChart></ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          {statusDist.map(d => (
            <div key={d.status} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[d.status] || '#9CA3AF' }} />
              <span className="text-xs text-foreground flex-1 truncate">{d.status.replace('Completed – ', '')}</span>
              <span className="text-xs font-semibold text-foreground">{d.count}</span>
              <span className="text-xs text-muted-foreground w-10 text-right">{d.pct}%</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-border"><span className="text-xs text-muted-foreground">{applicableItems} applicable items</span></div>
        </div>
      </div>
    </motion.div>
  );
}

function PillarDistributionCard({ pillarAgg }: { pillarAgg: { pillar: PillarId; riskIndex: number; applicableItems: number; completionPct: number }[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-4 sm:p-6">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Distribution by Pillar</span>
      <div className="space-y-3 mt-4">
        {pillarAgg.map(p => {
          const riskColor = getRiskBandColor(p.riskIndex);
          return (
            <div key={p.pillar} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{PILLAR_LABELS[p.pillar]}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{p.applicableItems} items</span>
                  <span className="text-xs font-semibold" style={{ color: riskColor }}>RI {p.riskIndex.toFixed(2)}</span>
                  <span className="text-xs font-semibold text-foreground">{p.completionPct}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden flex"><div className="h-full transition-all" style={{ width: `${p.completionPct}%`, backgroundColor: 'hsl(var(--primary))' }} /></div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function UnitRankingCard({ title, subtitle, icon: Icon, units, metricKey }: { title: string; subtitle: string; icon: React.ElementType; units: UnitAggregation[]; metricKey: 'riskIndex' | 'completionPct' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-elevated p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span></div>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {units.map((unit, idx) => {
          const value = unit[metricKey];
          const isRisk = metricKey === 'riskIndex';
          const color = isRisk ? getRiskBandColor(value) : 'hsl(var(--primary))';
          const maxVal = isRisk ? 3 : 100;
          const pct = Math.min(100, (value / maxVal) * 100);
          return (
            <div key={unit.unitId} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
              <span className="text-xs font-medium text-foreground flex-1 truncate min-w-0">{getUnitDisplayLabel(unit.unitId)}</span>
              <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden shrink-0"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: isRisk ? color : undefined, background: !isRisk ? 'hsl(var(--primary))' : undefined }} /></div>
              <span className="text-xs font-bold w-12 text-right shrink-0" style={{ color: isRisk ? color : undefined }}>{isRisk ? value.toFixed(2) : `${value}%`}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
