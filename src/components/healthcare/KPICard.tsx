import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { InfoTip } from '@/components/ui/info-tip';

export interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
  tooltip?: string;
  derived?: boolean;
  index?: number;
}

/** Shared Healthcare KPI tile — value renders "Not reported" when data is missing. */
export default function KPICard({ label, value, subtitle, color, tooltip, derived, index = 0 }: KPICardProps) {
  const missing = value === 'Not reported';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
    >
      <Card className="border-border/60 bg-card/70 h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
            {tooltip && <InfoTip text={tooltip} />}
          </div>
          <div
            className={`mt-2 font-semibold tabular-nums ${missing ? 'text-base text-muted-foreground italic' : 'text-2xl'}`}
            style={missing ? undefined : { color }}
          >
            {value}
          </div>
          {subtitle && <div className="mt-1 text-[11px] text-muted-foreground leading-snug">{subtitle}</div>}
          {derived && <div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground/70">Derived</div>}
        </CardContent>
      </Card>
    </motion.div>
  );
}
