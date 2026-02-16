import { useMemo } from 'react';
import type { ActionItem, PillarId, Status } from '@/lib/types';
import type { AxisConfig } from './AxisSelector';
import { PILLAR_LABELS } from '@/lib/constants';
import { getItemStatus, computeItemQualifier, computeTimeProgress } from '@/lib/intelligence';
import { motion } from 'framer-motion';
import { ArrowRight, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

interface Props {
  items: ActionItem[];
  axisA: AxisConfig;
  axisB: AxisConfig;
  observedAt: string;
}

interface ChangedItem {
  item: ActionItem;
  statusA: string;
  statusB: string;
  qualifierA: string;
  qualifierB: string;
}

export default function WhatChangedPanel({ items, axisA, axisB, observedAt }: Props) {
  const { improved, regressed, unchanged } = useMemo(() => {
    const improved: ChangedItem[] = [];
    const regressed: ChangedItem[] = [];
    let unchanged = 0;

    const tpA = computeTimeProgress(observedAt, axisA.academicYear);
    const tpB = computeTimeProgress(observedAt, axisB.academicYear);

    const statusRank: Record<string, number> = {
      'Not Applicable': 0,
      'Not Started': 1,
      'In Progress': 2,
      'Completed – Below Target': 3,
      'Completed – On Target': 4,
    };

    items.forEach(item => {
      const sA = getItemStatus(item, axisA.viewType, axisA.term, axisA.academicYear);
      const sB = getItemStatus(item, axisB.viewType, axisB.term, axisB.academicYear);

      if (sA === 'Not Applicable' && sB === 'Not Applicable') {
        unchanged++;
        return;
      }

      const qA = computeItemQualifier(sA, 0, tpA).qualifier;
      const qB = computeItemQualifier(sB, 0, tpB).qualifier;

      const rankA = statusRank[sA] ?? 0;
      const rankB = statusRank[sB] ?? 0;

      if (rankB > rankA) {
        improved.push({ item, statusA: sA, statusB: sB, qualifierA: qA, qualifierB: qB });
      } else if (rankB < rankA) {
        regressed.push({ item, statusA: sA, statusB: sB, qualifierA: qA, qualifierB: qB });
      } else {
        unchanged++;
      }
    });

    return { improved, regressed, unchanged };
  }, [items, axisA, axisB, observedAt]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <h3 className="font-display text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider px-1">
        What Changed — A → B
      </h3>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="card-elevated p-4 text-center">
          <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-display font-bold text-green-500">{improved.length}</p>
          <p className="text-[10px] text-muted-foreground">Improved</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-display font-bold text-red-500">{regressed.length}</p>
          <p className="text-[10px] text-muted-foreground">Regressed</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <TrendingUp className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-2xl font-display font-bold text-muted-foreground">{unchanged}</p>
          <p className="text-[10px] text-muted-foreground">Unchanged</p>
        </div>
      </div>

      {/* Improved list */}
      {improved.length > 0 && (
        <div className="card-elevated p-4 mb-4">
          <span className="text-[10px] text-green-500 uppercase tracking-wider font-semibold block mb-2">
            ↑ Improved ({improved.length})
          </span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {improved.slice(0, 20).map(c => (
              <div key={c.item.id} className="flex items-center gap-2 text-xs py-1 border-b border-border last:border-0">
                <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">{c.item.pillar}</span>
                <span className="text-foreground flex-1 truncate">{c.item.actionStep}</span>
                <span className="text-muted-foreground shrink-0 text-[10px]">{c.statusA}</span>
                <ArrowRight className="w-3 h-3 text-green-500 shrink-0" />
                <span className="text-green-600 font-medium shrink-0 text-[10px]">{c.statusB}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regressed list */}
      {regressed.length > 0 && (
        <div className="card-elevated p-4">
          <span className="text-[10px] text-red-500 uppercase tracking-wider font-semibold block mb-2">
            ↓ Regressed ({regressed.length})
          </span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {regressed.slice(0, 20).map(c => (
              <div key={c.item.id} className="flex items-center gap-2 text-xs py-1 border-b border-border last:border-0">
                <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">{c.item.pillar}</span>
                <span className="text-foreground flex-1 truncate">{c.item.actionStep}</span>
                <span className="text-muted-foreground shrink-0 text-[10px]">{c.statusA}</span>
                <ArrowRight className="w-3 h-3 text-red-500 shrink-0" />
                <span className="text-red-500 font-medium shrink-0 text-[10px]">{c.statusB}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {improved.length === 0 && regressed.length === 0 && (
        <div className="card-elevated p-6 text-center">
          <p className="text-sm text-muted-foreground">No status changes detected between Axis A and Axis B.</p>
          <p className="text-[10px] text-muted-foreground mt-1">Try selecting different term/year combinations to see evolution.</p>
        </div>
      )}
    </motion.div>
  );
}
