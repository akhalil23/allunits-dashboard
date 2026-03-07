/**
 * Tab 4 — Delivery & Trajectory (simplified — no DB snapshots)
 */

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Info, Camera } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateByPillar, getRiskBandColor, type UniversityAggregation } from '@/lib/university-aggregation';
import { getUnitDisplayLabel } from '@/lib/unit-config';
import type { PillarId } from '@/lib/types';

const PILLAR_LABELS: Record<PillarId, string> = { I: 'Pillar I', II: 'Pillar II', III: 'Pillar III', IV: 'Pillar IV', V: 'Pillar V' };

interface Props { aggregation: UniversityAggregation; }

export default function DeliveryTrajectory({ aggregation }: Props) {
  const { viewType, academicYear, term } = useDashboard();
  const { data: unitResults } = useUniversityData();

  const pillarAgg = useMemo(() => {
    if (!unitResults) return [];
    return aggregateByPillar(unitResults, viewType, term, academicYear);
  }, [unitResults, viewType, term, academicYear]);

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground italic px-1">
        Risk signals are derived exclusively from execution status and do not incorporate time progression.
      </p>

      {/* Current metrics */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'RiskIndex', value: aggregation.riskIndex.toFixed(2), color: getRiskBandColor(aggregation.riskIndex) },
            { label: 'Completion %', value: `${aggregation.completionPct}%`, color: 'hsl(var(--primary))' },
            { label: 'On Track %', value: `${aggregation.onTrackPct}%`, color: '#16A34A' },
            { label: 'Below Target %', value: `${aggregation.belowTargetPct}%`, color: '#B23A48' },
          ].map(d => (
            <div key={d.label} className="card-elevated p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
              <div className="relative">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{d.label}</p>
                <span className="text-xl font-display font-bold" style={{ color: d.color }}>{d.value}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pillar-Level Current State */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-4 sm:p-6">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pillar-Level Current State</span>
        <div className="space-y-3 mt-4">
          {pillarAgg.map(p => {
            const color = getRiskBandColor(p.riskIndex);
            return (
              <div key={p.pillar} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <span className="text-xs font-semibold text-foreground w-14">{PILLAR_LABELS[p.pillar]}</span>
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">RI:</span>
                    <span className="text-xs font-bold" style={{ color }}>{p.riskIndex.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Comp:</span>
                    <span className="text-xs font-bold text-foreground">{p.completionPct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Unit-Level Current State */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-elevated p-4 sm:p-6">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit-Level Current State</span>
        <p className="text-xs text-muted-foreground mt-1 mb-4">All units sorted by Risk Index (highest first)</p>
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {[...aggregation.unitAggregations]
            .filter(u => u.applicableItems > 0)
            .sort((a, b) => b.riskIndex - a.riskIndex)
            .map(m => {
              const color = getRiskBandColor(m.riskIndex);
              return (
                <div key={m.unitId} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <span className="text-xs font-medium text-foreground flex-1 truncate min-w-0">{getUnitDisplayLabel(m.unitId)}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">RI</span>
                      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{m.riskIndex.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Comp</span>
                      <span className="text-xs font-bold w-10 text-right">{m.completionPct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-elevated p-6 sm:p-8 text-center space-y-3 border-primary/20">
        <Info className="w-6 h-6 text-primary mx-auto" />
        <h3 className="text-sm font-display font-semibold text-foreground">Snapshot Comparison Coming Soon</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Snapshot save/compare functionality will be enabled in a future update, allowing you to track trajectory changes over time.
        </p>
      </motion.div>
    </div>
  );
}
