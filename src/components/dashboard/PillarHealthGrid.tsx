import { useMemo } from 'react';
import type { ActionItem, ViewType, PillarId, Status } from '@/lib/types';
import { PILLAR_LABELS, STATUS_COLORS } from '@/lib/constants';
import { getItemStatus } from '@/lib/intelligence';
import { motion } from 'framer-motion';

interface Props {
  items: ActionItem[];
  viewType: ViewType;
}

const pillars: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

export default function PillarHealthGrid({ items, viewType }: Props) {
  const pillarData = useMemo(() => {
    return pillars.map(p => {
      const pillarItems = items.filter(i => i.pillar === p);
      const applicable = pillarItems.filter(i => getItemStatus(i, viewType) !== 'Not Applicable');
      const counts: Partial<Record<Status, number>> = {};

      applicable.forEach(item => {
        const s = getItemStatus(item, viewType);
        counts[s] = (counts[s] || 0) + 1;
      });

      const total = applicable.length || 1;
      const completedOnTarget = counts['Completed – On Target'] || 0;
      const completedPercent = Math.round((completedOnTarget / total) * 100);

      return {
        pillar: p,
        label: PILLAR_LABELS[p],
        total: pillarItems.length,
        applicable: applicable.length,
        completedPercent,
        counts,
      };
    });
  }, [items, viewType]);

  return (
    <div>
      <h3 className="font-display text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider px-1">
        Pillar Health
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {pillarData.map((pd, i) => (
          <motion.div
            key={pd.pillar}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="card-elevated p-5 hover:shadow-md transition-shadow duration-300 group cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {pd.pillar}
              </span>
              <span className="text-xs font-medium text-foreground truncate">{pd.label}</span>
            </div>

            {/* Mini progress bar */}
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
              {(() => {
                const entries = Object.entries(pd.counts) as [Status, number][];
                let offset = 0;
                return entries.map(([status, count]) => {
                  const w = (count / (pd.applicable || 1)) * 100;
                  const el = (
                    <div
                      key={status}
                      className="h-full inline-block"
                      style={{
                        width: `${w}%`,
                        backgroundColor: STATUS_COLORS[status],
                      }}
                    />
                  );
                  offset += w;
                  return el;
                });
              })()}
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
