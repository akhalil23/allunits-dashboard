/**
 * Cross-Tab Pillar View Selector
 * Used in Tabs 1, 2, 3 for All Pillars / Single Pillar selection.
 * State is independent per tab (managed by parent).
 */

import { motion } from 'framer-motion';
import { PILLAR_COLORS } from '@/lib/pillar-colors';
import { PILLAR_SHORT } from '@/lib/pillar-labels';
import type { PillarId } from '@/lib/types';

export type PillarViewMode = 'all' | PillarId;

interface Props {
  value: PillarViewMode;
  onChange: (v: PillarViewMode) => void;
}

const PILLARS: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

export default function PillarViewSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 p-1">
      <button
        onClick={() => onChange('all')}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
          value === 'all'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        All Pillars
      </button>
      <span className="w-px h-5 bg-border/60" />
      {PILLARS.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
            value === p
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: PILLAR_COLORS[p] }}
          />
          <span className="hidden sm:inline">P{p}</span>
          <span className="sm:hidden">{p}</span>
        </button>
      ))}
    </div>
  );
}
