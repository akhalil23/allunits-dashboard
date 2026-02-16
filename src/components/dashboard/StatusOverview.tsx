import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { ActionItem, ViewType, Status, Term, AcademicYear } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/constants';
import { getItemStatus } from '@/lib/intelligence';
import { motion } from 'framer-motion';

interface Props {
  items: ActionItem[];
  viewType: ViewType;
  term: Term;
  academicYear: AcademicYear;
}

export default function StatusOverview({ items, viewType, term, academicYear }: Props) {
  const { applicableCount, naCount, statusDist } = useMemo(() => {
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
      counts[s] = (counts[s] || 0) + 1;
      if (s === 'Not Applicable') naCount++;
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

    return { applicableCount, naCount, statusDist };
  }, [items, viewType, term, academicYear]);

  const applicabilityData = [
    { name: 'Applicable', value: applicableCount, color: '#00843D' },
    { name: 'Not Applicable', value: naCount, color: '#B0B7C3' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Applicability */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-6">
        <h3 className="font-display text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Applicability Context</h3>
        <div className="flex items-center gap-6">
          <div className="w-32 h-32">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={applicabilityData} innerRadius={38} outerRadius={56} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                  {applicabilityData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3">
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
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">Progress metrics use Applicable items only.</p>
          </div>
        </div>
      </motion.div>

      {/* Progress Distribution */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-elevated p-6">
        <h3 className="font-display text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Progress Distribution</h3>
        <div className="flex items-center gap-6">
          <div className="w-32 h-32">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusDist} innerRadius={38} outerRadius={56} dataKey="count" startAngle={90} endAngle={-270} strokeWidth={0}>
                  {statusDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {statusDist.map(d => (
              <div key={d.status} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-foreground flex-1 truncate">{d.status}</span>
                <span className="text-xs font-semibold text-foreground">{d.count}</span>
                <span className="text-xs text-muted-foreground w-8 text-right">{d.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
