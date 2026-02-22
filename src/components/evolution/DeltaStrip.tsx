import { useMemo } from 'react';
import type { ActionItem, PillarId } from '@/lib/types';
import type { AxisConfig } from './AxisSelector';
import { PILLAR_LABELS } from '@/lib/constants';
import { getItemStatus } from '@/lib/intelligence';
import {
  computeNewRiskIndex,
  computeRiskSignalDistribution,
} from '@/lib/risk-signals';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface Props {
  items: ActionItem[];
  axisA: AxisConfig;
  axisB: AxisConfig;
  observedAt: string;
}

const pillars: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

function DeltaIndicator({ value, suffix = '', invert = false }: { value: number; suffix?: string; invert?: boolean }) {
  const isPositive = invert ? value < 0 : value > 0;
  const isNegative = invert ? value > 0 : value < 0;

  return (
    <div className={`flex items-center gap-1 text-sm font-semibold ${
      isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'
    }`}>
      {value > 0 ? <ArrowUp className="w-3.5 h-3.5" /> : value < 0 ? <ArrowDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
      <span>{value > 0 ? '+' : ''}{value.toFixed(value % 1 === 0 ? 0 : 2)}{suffix}</span>
    </div>
  );
}

export default function DeltaStrip({ items, axisA, axisB, observedAt }: Props) {
  const deltas = useMemo(() => {
    const riskA = computeNewRiskIndex(items, axisA.viewType, axisA.term, axisA.academicYear);
    const riskB = computeNewRiskIndex(items, axisB.viewType, axisB.term, axisB.academicYear);

    const distA = computeRiskSignalDistribution(items, axisA.viewType, axisA.term, axisA.academicYear);
    const distB = computeRiskSignalDistribution(items, axisB.viewType, axisB.term, axisB.academicYear);

    const noRiskA = distA.find(d => d.signal === 'No Risk (On Track)')?.percent ?? 0;
    const noRiskB = distB.find(d => d.signal === 'No Risk (On Track)')?.percent ?? 0;
    const criticalA = distA.find(d => d.signal === 'Critical Risk (Needs Close Attention)')?.percent ?? 0;
    const criticalB = distB.find(d => d.signal === 'Critical Risk (Needs Close Attention)')?.percent ?? 0;

    const pillarDeltas = pillars.map(p => {
      const pi = items.filter(i => i.pillar === p);
      const appA = pi.filter(i => getItemStatus(i, axisA.viewType, axisA.term, axisA.academicYear) !== 'Not Applicable');
      const appB = pi.filter(i => getItemStatus(i, axisB.viewType, axisB.term, axisB.academicYear) !== 'Not Applicable');
      const compA = appA.filter(i => getItemStatus(i, axisA.viewType, axisA.term, axisA.academicYear) === 'Completed – On Target').length;
      const compB = appB.filter(i => getItemStatus(i, axisB.viewType, axisB.term, axisB.academicYear) === 'Completed – On Target').length;
      const pctA = appA.length ? Math.round((compA / appA.length) * 100) : 0;
      const pctB = appB.length ? Math.round((compB / appB.length) * 100) : 0;
      return { pillar: p, label: PILLAR_LABELS[p], pctA, pctB, delta: pctB - pctA };
    });

    return {
      riskDelta: riskB - riskA,
      noRiskDelta: noRiskB - noRiskA,
      criticalDelta: criticalB - criticalA,
      riskA, riskB, noRiskA, noRiskB, criticalA, criticalB,
      pillarDeltas,
    };
  }, [items, axisA, axisB]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <h3 className="font-display text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider px-1">
        Delta Analysis — A → B
      </h3>

      {/* Summary deltas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="card-elevated p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk Index Δ</p>
            <p className="text-xs text-muted-foreground mt-1">{deltas.riskA.toFixed(2)} → {deltas.riskB.toFixed(2)}</p>
          </div>
          <DeltaIndicator value={deltas.riskDelta} invert />
        </div>
        <div className="card-elevated p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">No Risk Δ</p>
            <p className="text-xs text-muted-foreground mt-1">{deltas.noRiskA}% → {deltas.noRiskB}%</p>
          </div>
          <DeltaIndicator value={deltas.noRiskDelta} suffix="%" />
        </div>
        <div className="card-elevated p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Critical Risk Δ</p>
            <p className="text-xs text-muted-foreground mt-1">{deltas.criticalA}% → {deltas.criticalB}%</p>
          </div>
          <DeltaIndicator value={deltas.criticalDelta} suffix="%" invert />
        </div>
      </div>

      {/* Pillar deltas */}
      <div className="card-elevated p-4">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-3">Pillar Completion Shift</span>
        <div className="space-y-2.5">
          {deltas.pillarDeltas.map(pd => (
            <div key={pd.pillar} className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground w-6">{pd.pillar}</span>
              <span className="text-[10px] text-muted-foreground w-20 truncate">{pd.label}</span>
              <div className="flex-1 h-3 rounded-full bg-muted relative overflow-hidden">
                <div className="absolute left-0 top-0 h-full rounded-full bg-blue-400/60" style={{ width: `${pd.pctA}%` }} />
                <div className="absolute left-0 top-0 h-full rounded-full bg-primary/70" style={{ width: `${pd.pctB}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground w-8 text-right">{pd.pctA}%</span>
              <span className="text-[10px] text-foreground font-medium">→</span>
              <span className="text-[10px] text-foreground font-semibold w-8">{pd.pctB}%</span>
              <DeltaIndicator value={pd.delta} suffix="%" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
