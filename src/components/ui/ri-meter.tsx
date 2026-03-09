/**
 * RIMeter — Visual Risk Index scale component
 * Shows a segmented horizontal bar with a marker indicating position.
 */

import { motion } from 'framer-motion';
import { riToPercent, getRiskDisplayInfo, RI_BAND_LEGEND, type RiskBandLabel } from '@/lib/risk-display';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RIMeterProps {
  /** Raw RI value on 0–3 scale */
  ri: number;
  /** Show band label text beside meter */
  showLabel?: boolean;
  /** Compact mode for tight spaces */
  compact?: boolean;
}

export function RIMeter({ ri, showLabel = true, compact = false }: RIMeterProps) {
  const pct = riToPercent(ri);
  const info = getRiskDisplayInfo(ri);
  const h = compact ? 'h-2' : 'h-3';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help">
          <div className={`relative ${h} rounded-full overflow-hidden flex`}>
            {RI_BAND_LEGEND.map((band, i) => (
              <div
                key={band.label}
                className="flex-1"
                style={{ backgroundColor: `${band.color}25` }}
              />
            ))}
            {/* Marker */}
            <motion.div
              className={`absolute top-0 ${compact ? 'w-0.5' : 'w-1'} ${h} rounded-full`}
              style={{ backgroundColor: info.color }}
              initial={{ left: '0%' }}
              animate={{ left: `${Math.min(99, pct)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          {showLabel && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] text-muted-foreground">0%</span>
              <span className="text-[9px] font-semibold" style={{ color: info.color }}>{info.band}</span>
              <span className="text-[9px] text-muted-foreground">100%</span>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed z-[100]">
        <p className="font-semibold mb-1">RI {info.percent}% — {info.band}</p>
        <p>{info.insight}</p>
      </TooltipContent>
    </Tooltip>
  );
}
