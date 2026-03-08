import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import type { ActionItem, ViewType, Status, Term, AcademicYear } from '@/lib/types';
import { isNotApplicableStatus } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/constants';
import { getItemStatus, getItemCompletion, getApplicableItems, computeInProgressAvgCompletion } from '@/lib/intelligence';
import { motion } from 'framer-motion';
import { Info, TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  items: ActionItem[];
  viewType: ViewType;
  term: Term;
  academicYear: AcademicYear;
}

export default function StatusOverview({ items, viewType, term, academicYear }: Props) {
  const { applicableCount, naCount, statusDist, inProgressAvg } = useMemo(() => {
    let naCount = 0;
    const counts: Record<Status, number> = {
      'Not Applicable': 0,
      'Not Started': 0,
      'In Progress': 0,
      'Completed – On Target': 0,
      'Completed – Below Target': 0,
    };

    items.forEach(item => {
      const s = getItemStatus(item, viewType, term, academicYear) as Status;
      if (isNotApplicableStatus(s)) {
        naCount++;
        counts['Not Applicable']++;
      } else {
        counts[s] = (counts[s] || 0) + 1;
      }
    });

    const applicableCount = items.length - naCount;
    const statusDist = (Object.entries(counts) as [Status, number][])
      .filter(([s]) => s !== 'Not Applicable')
      .map(([status, count]) => ({
        status,
        count,
        percent: applicableCount > 0 ? Math.round((count / applicableCount) * 100) : 0,
        color: STATUS_COLORS[status],
      }));

    const inProgressAvg = computeInProgressAvgCompletion(items, viewType, term, academicYear);

    return { applicableCount, naCount, statusDist, inProgressAvg };
  }, [items, viewType, term, academicYear]);

  const applicabilityData = [
    { name: 'Applicable', value: applicableCount, color: '#00843D' },
    { name: 'Not Applicable', value: naCount, color: '#B0B7C3' },
  ];

  // Handle zero applicable items
  if (applicableCount === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">No Applicable Items for Selected Context</p>
        <p className="text-xs text-muted-foreground/70 mt-1">All {items.length} item(s) are marked as Not Applicable for the current view.</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Applicability */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Item Applicability</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
                <p>Shows how many action items are <strong>applicable</strong> vs <strong>not applicable</strong> for the selected filters. Only applicable items are used in progress calculations.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={applicabilityData} innerRadius="60%" outerRadius="85%" dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                  {applicabilityData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Total Items</span>
              <span className="text-2xl font-display font-bold text-foreground">{items.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Applicable</span>
              <span className="text-lg font-semibold text-primary">{applicableCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Not Applicable</span>
              <span className="text-lg font-semibold text-muted-foreground">{naCount}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
              Progress metrics use {viewType === 'cumulative' ? 'SP' : 'Yearly'} Applicable items only.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Progress Distribution */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-elevated p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Progress Distribution</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
                <p>Breaks down applicable items by status. Only items with a recognized status in the selected term window are included.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusDist} innerRadius="60%" outerRadius="85%" dataKey="count" startAngle={90} endAngle={-270} strokeWidth={0}>
                  {statusDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            {statusDist.map(d => (
              <div key={d.status} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-foreground flex-1 truncate">{d.status}</span>
                <span className="text-xs font-semibold text-foreground">{d.count}</span>
                <span className="text-xs text-muted-foreground w-8 text-right">{d.percent}%</span>
              </div>
            ))}
            {/* In-Progress Average Completion */}
            {inProgressAvg && (
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-[11px] text-muted-foreground">Avg Completion (In Progress):</span>
                <span className="text-[11px] font-semibold text-foreground">{inProgressAvg.avgCompletion}%</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
