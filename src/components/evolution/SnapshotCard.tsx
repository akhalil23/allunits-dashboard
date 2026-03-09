import { useMemo } from 'react';
import type { ActionItem, PillarId } from '@/lib/types';
import type { AxisConfig } from './AxisSelector';
import { PILLAR_LABELS } from '@/lib/constants';
import { getItemStatus } from '@/lib/intelligence';
import {
  computeRiskSignalDistribution,
  computeNewRiskIndex,
  RISK_SIGNAL_COLORS,
  RISK_SIGNAL_ORDER,
} from '@/lib/risk-signals';
import { formatRIPercent, getRiskDisplayInfo } from '@/lib/risk-display';
import { motion } from 'framer-motion';

interface Props {
  label: string;
  accent: string;
  items: ActionItem[];
  config: AxisConfig;
  observedAt: string;
}

const pillars: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

export default function SnapshotCard({ label, accent, items, config, observedAt }: Props) {
  const { viewType, term, academicYear } = config;

  const stats = useMemo(() => {
    const applicable = items.filter(i => getItemStatus(i, viewType, term, academicYear) !== 'Not Applicable');
    const riskIndex = computeNewRiskIndex(items, viewType, term, academicYear);
    const riskDist = computeRiskSignalDistribution(items, viewType, term, academicYear);

    const pillarStats = pillars.map(p => {
      const pi = items.filter(i => i.pillar === p);
      const pa = pi.filter(i => getItemStatus(i, viewType, term, academicYear) !== 'Not Applicable');
      const completed = pa.filter(i => getItemStatus(i, viewType, term, academicYear) === 'Completed – On Target').length;
      return { pillar: p, total: pi.length, applicable: pa.length, completedPct: pa.length ? Math.round((completed / pa.length) * 100) : 0 };
    });

    return { applicable: applicable.length, total: items.length, riskIndex, riskDist, pillarStats };
  }, [items, viewType, term, academicYear]);

  const riskColor = stats.riskIndex < 1
    ? RISK_SIGNAL_COLORS['No Risk (On Track)']
    : stats.riskIndex < 2
    ? RISK_SIGNAL_COLORS['Emerging Risk (Needs Attention)']
    : RISK_SIGNAL_COLORS['Critical Risk (Needs Close Attention)'];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-3 h-3 rounded-full ${accent}`} />
        <span className="text-sm font-display font-semibold text-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{academicYear} • {term === 'mid' ? 'Mid' : 'End'} • {viewType === 'cumulative' ? 'SP' : 'Yearly'}</span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-2xl font-display font-bold text-foreground">{stats.applicable}</p>
          <p className="text-[10px] text-muted-foreground">Applicable</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-2xl font-display font-bold" style={{ color: riskColor }}>{stats.riskIndex.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Risk Index</p>
        </div>
      </div>

      {/* Risk Signal Distribution bar */}
      <div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk Signal Distribution</span>
        <div className="h-4 rounded-full overflow-hidden flex bg-muted mt-1">
          {stats.riskDist.filter(d => d.count > 0).map(d => (
            <div key={d.signal} className="h-full" style={{ backgroundColor: d.color, width: `${d.percent}%` }} title={`${d.signal}: ${d.percent}%`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {stats.riskDist.filter(d => d.count > 0).map(d => (
            <div key={d.signal} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-[9px] text-muted-foreground">{d.signal.split(' (')[0]} {d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pillar mini bars */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pillar Completion</span>
        {stats.pillarStats.map(ps => (
          <div key={ps.pillar} className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground w-5">{ps.pillar}</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${ps.completedPct}%` }} />
            </div>
            <span className="text-[10px] font-semibold text-foreground w-8 text-right">{ps.completedPct}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
