import { useMemo } from 'react';
import type { ActionItem, ViewType, AcademicYear, Term } from '@/lib/types';
import { QUALIFIER_COLORS } from '@/lib/constants';
import { computeQualifierDistribution, computeRiskIndex, computeTimeProgress } from '@/lib/intelligence';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, ShieldAlert } from 'lucide-react';

interface Props {
  items: ActionItem[];
  viewType: ViewType;
  term: Term;
  observedAt: string;
  academicYear: AcademicYear;
}

export default function IntelligencePanel({ items, viewType, term, observedAt, academicYear }: Props) {
  const timeProgress = useMemo(() => computeTimeProgress(observedAt, academicYear), [observedAt, academicYear]);
  const qualDist = useMemo(
    () => computeQualifierDistribution(items, viewType, term, observedAt, academicYear),
    [items, viewType, term, observedAt, academicYear]
  );
  const riskIndex = useMemo(
    () => computeRiskIndex(items, viewType, term, observedAt, academicYear),
    [items, viewType, term, observedAt, academicYear]
  );

  const riskColor = riskIndex >= 2 ? 'text-qualifier-critical' : riskIndex >= 1.2 ? 'text-qualifier-emerging' : 'text-qualifier-ontrack';
  const riskBg = riskIndex >= 2 ? 'bg-red-500/10' : riskIndex >= 1.2 ? 'bg-yellow-500/10' : 'bg-green-500/10';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <div className="flex items-center gap-2 mb-4 px-1">
        <ShieldAlert className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Intelligence Layer — Risk Signals</h3>
        <span className="text-[10px] text-muted-foreground italic">(Decision Support Only)</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Time Progress</span>
          </div>
          <p className="text-3xl font-display font-bold text-foreground mb-2">{timeProgress.toFixed(1)}%</p>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${timeProgress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">AY {academicYear} • Based on server timestamp</p>
        </div>

        <div className={`card-elevated p-5 ${riskBg}`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-qualifier-emerging" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Index</span>
          </div>
          <p className={`text-4xl font-display font-bold ${riskColor}`}>{riskIndex.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Scale: 0 (safe) – 3 (critical)</p>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: riskIndex >= 2 ? QUALIFIER_COLORS['Critical Risk'] : riskIndex >= 1.2 ? QUALIFIER_COLORS['Emerging Risk'] : QUALIFIER_COLORS['On Track'] }} initial={{ width: 0 }} animate={{ width: `${(riskIndex / 3) * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
          </div>
        </div>

        <div className="card-elevated p-5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-3">Qualifier Breakdown</span>
          <div className="space-y-2">
            {qualDist.map(q => (
              <div key={q.qualifier} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: q.color }} />
                <span className="text-xs text-foreground flex-1 truncate">{q.qualifier}</span>
                <span className="text-xs font-semibold text-foreground">{q.count}</span>
                <span className="text-xs text-muted-foreground w-9 text-right">{q.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-elevated p-5 mt-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-3">Qualifier Distribution (Applicable Items)</span>
        <div className="h-6 rounded-full overflow-hidden flex bg-muted">
          {qualDist.filter(q => q.count > 0).map(q => (
            <motion.div key={q.qualifier} className="h-full" style={{ backgroundColor: q.color }} initial={{ width: 0 }} animate={{ width: `${q.percent}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} title={`${q.qualifier}: ${q.percent}%`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {qualDist.filter(q => q.count > 0).map(q => (
            <div key={q.qualifier} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: q.color }} />
              <span className="text-[10px] text-muted-foreground">{q.qualifier} ({q.percent}%)</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
