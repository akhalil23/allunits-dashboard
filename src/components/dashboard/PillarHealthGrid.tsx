import { useMemo } from 'react';
import type { ActionItem, ViewType, PillarId, Status, Term, AcademicYear } from '@/lib/types';
import { PILLAR_LABELS, STATUS_COLORS } from '@/lib/constants';
import { getItemStatus } from '@/lib/intelligence';
import { motion } from 'framer-motion';

interface Props {
  items: ActionItem[];
  viewType: ViewType;
  term: Term;
  academicYear: AcademicYear;
}

const pillars: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

export default function PillarHealthGrid({ items, viewType, term, academicYear }: Props) {
  const pillarData = useMemo(() => {
    return pillars.map(p => {
      const pillarItems = items.filter(i => i.pillar === p);
      const applicable = pillarItems.filter(i => getItemStatus(i, viewType, term, academicYear) !== 'Not Applicable');
      const counts: Partial<Record<Status, number>> = {};

      applicable.forEach(item => {
        const s = getItemStatus(item, viewType, term, academicYear) as Status;
        counts[s] = (counts[s] || 0) + 1;
      });

      const total = applicable.length || 1;
      const completedOnTarget = counts['Completed – On Target'] || 0;
      const completedPercent = Math.round((completedOnTarget / total) * 100);

      return { pillar: p, label: PILLAR_LABELS[p], total: pillarItems.length, applicable: applicable.length, completedPercent, counts };
    });
  }, [items, viewType, term, academicYear]);

  return (
    <div>
      <h3 className="font-display text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider px-1">Pillar Performance Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {pillarData.map((pd, i) => (
          <motion.div key={pd.pillar} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="card-elevated p-5 hover:shadow-md transition-shadow duration-300 cursor-pointer">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{pd.pillar}</span>
              <span className="text-xs font-medium text-foreground truncate">{pd.label}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-3 flex">
              {(Object.entries(pd.counts) as [Status, number][]).map(([status, count]) => (
                <div key={status} className="h-full" style={{ width: `${(count / (pd.applicable || 1)) * 100}%`, backgroundColor: STATUS_COLORS[status] }} />
              ))}
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{pd.completedPercent}%</p>
                <p className="text-[10px] text-muted-foreground">On Target</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{pd.applicable}</p>
                <p className="text-[10px] text-muted-foreground">Items</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
