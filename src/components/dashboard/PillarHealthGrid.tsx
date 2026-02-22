import { useMemo } from 'react';
import type { ActionItem, ViewType, PillarId, Status, Term, AcademicYear } from '@/lib/types';
import { PILLAR_LABELS, STATUS_COLORS } from '@/lib/constants';
import { getItemStatus, getItemCompletion } from '@/lib/intelligence';
import { computeNewRiskIndex, RISK_SIGNAL_COLORS } from '@/lib/risk-signals';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

      // Risk index for this pillar
      const riskIndex = computeNewRiskIndex(pillarItems, viewType, term, academicYear);

      // Sparkline: mid & end completion for current AY
      const midApplicable = pillarItems.filter(i => getItemStatus(i, viewType, 'mid', academicYear) !== 'Not Applicable');
      const endApplicable = pillarItems.filter(i => getItemStatus(i, viewType, 'end', academicYear) !== 'Not Applicable');
      const midComp = midApplicable.length > 0
        ? Math.round(midApplicable.reduce((s, i) => s + getItemCompletion(i, viewType, 'mid', academicYear), 0) / midApplicable.length)
        : null;
      const endComp = endApplicable.length > 0
        ? Math.round(endApplicable.reduce((s, i) => s + getItemCompletion(i, viewType, 'end', academicYear), 0) / endApplicable.length)
        : null;

      return { pillar: p, label: PILLAR_LABELS[p], total: pillarItems.length, applicable: applicable.length, completedPercent, counts, riskIndex, midComp, endComp };
    });
  }, [items, viewType, term, academicYear]);

  const riskColor = (ri: number) =>
    ri < 1 ? RISK_SIGNAL_COLORS['No Risk (On Track)']
    : ri < 2 ? RISK_SIGNAL_COLORS['Emerging Risk (Needs Attention)']
    : RISK_SIGNAL_COLORS['Critical Risk (Needs Close Attention)'];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 px-1">
        <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pillar Performance Overview</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help transition-colors" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
              <p>Each pillar shows the percentage of action items that are <strong>On Target</strong>, the risk index (0–3), and a mid→end completion trend. Items marked "Not Applicable" are excluded.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {pillarData.map((pd, i) => (
          <motion.div key={pd.pillar} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="card-elevated p-5 hover:shadow-md transition-shadow duration-300 cursor-pointer">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{pd.pillar}</span>
              <span className="text-xs font-medium text-foreground truncate flex-1">{pd.label}</span>
              {/* Risk Index Badge */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white shrink-0"
                      style={{ backgroundColor: riskColor(pd.riskIndex) }}
                    >
                      {pd.riskIndex.toFixed(1)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p>Risk Index: {pd.riskIndex.toFixed(2)} / 3.00</p>
                    <p className="text-muted-foreground">{pd.applicable} applicable items</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {/* Status bar */}
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
            {/* Mini Sparkline: Mid → End */}
            {pd.midComp !== null && pd.endComp !== null && (
              <div className="mt-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">Avg Completion</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">{pd.midComp}%</span>
                    <MiniSparkline from={pd.midComp} to={pd.endComp} />
                    <span className="text-[10px] font-semibold text-foreground">{pd.endComp}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-0.5">
                  <span className="text-[8px] text-muted-foreground/60">Mid</span>
                  <span className="text-[8px] text-muted-foreground/60">→</span>
                  <span className="text-[8px] text-muted-foreground/60">End</span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MiniSparkline({ from, to }: { from: number; to: number }) {
  const w = 32;
  const h = 14;
  const pad = 2;
  const max = Math.max(from, to, 1);
  const y1 = h - pad - ((from / 100) * (h - pad * 2));
  const y2 = h - pad - ((to / 100) * (h - pad * 2));
  const color = to >= from ? '#16A34A' : '#EF4444';

  return (
    <svg width={w} height={h} className="shrink-0">
      <line x1={pad} y1={y1} x2={w - pad} y2={y2} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={pad} cy={y1} r={1.5} fill={color} />
      <circle cx={w - pad} cy={y2} r={1.5} fill={color} />
    </svg>
  );
}
