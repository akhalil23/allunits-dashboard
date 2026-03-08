/**
 * Tab 4 — Unit Comparison (Redesigned)
 * Unit selector showing ALL 21 units, KPI cards, risk signal comparison, radar chart.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip as RechartsTooltip,
} from 'recharts';
import { GitCompareArrows, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateUnitByPillar, getRiskBandColor, RISK_BAND_COLORS, type UniversityAggregation, type UnitAggregation } from '@/lib/university-aggregation';
import { RISK_SIGNAL_COLORS } from '@/lib/risk-signals';
import { getUnitDisplayLabel, getUnitDisplayName, UNIT_IDS } from '@/lib/unit-config';
import { PILLAR_LABELS } from '@/lib/budget-data';
import { PILLAR_SHORT, PILLAR_FULL } from '@/lib/pillar-labels';
import type { PillarId } from '@/lib/types';

interface Props { aggregation: UniversityAggregation; }

function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground/60 cursor-help inline ml-1" /></TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs"><p>{text}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function UnitComparison({ aggregation }: Props) {
  const { viewType, academicYear, term } = useDashboard();
  const { data: unitResults } = useUniversityData();
  const [unitAId, setUnitAId] = useState<string>('');
  const [unitBId, setUnitBId] = useState<string>('');

  const heatCells = useMemo(() => unitResults ? aggregateUnitByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  // Show ALL 21 units sorted by display name — no filtering by applicableItems
  const allUnits = useMemo(() =>
    UNIT_IDS.map(id => ({
      unitId: id,
      label: getUnitDisplayLabel(id),
    })).sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  const unitA = unitAId ? aggregation.unitAggregations.find(u => u.unitId === unitAId) : null;
  const unitB = unitBId ? aggregation.unitAggregations.find(u => u.unitId === unitBId) : null;

  return (
    <div className="space-y-8">
      {/* Section 1: Unit Selector */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <GitCompareArrows className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Units to Compare</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{allUnits.length} units available</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Unit A</label>
              <select
                value={unitAId}
                onChange={(e) => setUnitAId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select a unit…</option>
                {allUnits.map(u => (
                  <option key={u.unitId} value={u.unitId} disabled={u.unitId === unitBId}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Unit B</label>
              <select
                value={unitBId}
                onChange={(e) => setUnitBId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select a unit…</option>
                {allUnits.map(u => (
                  <option key={u.unitId} value={u.unitId} disabled={u.unitId === unitAId}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>
      </section>

      {unitA && unitB ? (
        <>
          {/* Section 2: Comparison KPI Cards */}
          <section>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <CompareKPI label="Completion — Actions Completed (%)" a={`${unitA.completionPct}%`} b={`${unitB.completionPct}%`} unitA={getUnitDisplayName(unitA.unitId)} unitB={getUnitDisplayName(unitB.unitId)} betterA={unitA.completionPct > unitB.completionPct} betterB={unitB.completionPct > unitA.completionPct} tooltip="Percentage of applicable strategic actions marked as completed." />
              <CompareKPI label="RI (Risk Index)" a={`RI ${unitA.riskIndex.toFixed(2)}`} b={`RI ${unitB.riskIndex.toFixed(2)}`} unitA={getUnitDisplayName(unitA.unitId)} unitB={getUnitDisplayName(unitB.unitId)} betterA={unitA.riskIndex < unitB.riskIndex} betterB={unitB.riskIndex < unitA.riskIndex} colorA={getRiskBandColor(unitA.riskIndex)} colorB={getRiskBandColor(unitB.riskIndex)} tooltip="Risk Index (RI) represents the aggregated severity of risk signals. Lower values indicate lower structural risk." />
              <CompareKPI label="Budget Utilization — Used (%)" a="—" b="—" unitA={getUnitDisplayName(unitA.unitId)} unitB={getUnitDisplayName(unitB.unitId)} tooltip="Percentage of the allocated budget that has already been utilized." />
              <CompareKPI label="Applicable Items" a={`${unitA.applicableItems}`} b={`${unitB.applicableItems}`} unitA={getUnitDisplayName(unitA.unitId)} unitB={getUnitDisplayName(unitB.unitId)} tooltip="Total number of strategic action items applicable under current filters." />
            </div>
          </section>

          {/* Section 3: Risk Signal Comparison */}
          <section>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-5 sm:p-6">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 block">
                Risk Signal Comparison <InfoTip text="Color-coded bar showing the distribution of risk signals for each unit." />
              </span>
              <div className="space-y-4">
                <RiskSignalBar label={getUnitDisplayName(unitA.unitId)} unit={unitA} color={RISK_BAND_COLORS.green} />
                <RiskSignalBar label={getUnitDisplayName(unitB.unitId)} unit={unitB} color={RISK_BAND_COLORS.amber} />
              </div>
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
                {[
                  { label: 'No Risk', color: RISK_SIGNAL_COLORS['No Risk (On Track)'] },
                  { label: 'Emerging', color: RISK_SIGNAL_COLORS['Emerging Risk (Needs Attention)'] },
                  { label: 'Critical', color: RISK_SIGNAL_COLORS['Critical Risk (Needs Close Attention)'] },
                  { label: 'Realized', color: RISK_SIGNAL_COLORS['Realized Risk (Needs Mitigation Strategy)'] },
                ].map(s => (
                  <span key={s.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </motion.div>
          </section>

          {/* Section 4: Radar Comparison */}
          <section>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-5 sm:p-6">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 block">
                Pillar Radar Comparison
              </span>
              <RadarComparison unitA={unitA} unitB={unitB} heatCells={heatCells} />
            </motion.div>
          </section>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-8 text-center">
          <GitCompareArrows className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Select two units above to begin comparison.</p>
        </motion.div>
      )}
    </div>
  );
}

function CompareKPI({ label, a, b, unitA, unitB, betterA, betterB, colorA, colorB, tooltip }: {
  label: string; a: string; b: string; unitA: string; unitB: string; betterA?: boolean; betterB?: boolean; colorA?: string; colorB?: string; tooltip?: string;
}) {
  return (
    <div className="card-elevated p-4">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center">
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </p>
      <div className="flex items-end justify-between gap-2">
        <div className="text-center flex-1">
          <p className="text-lg font-display font-bold" style={{ color: colorA || (betterA ? '#16A34A' : undefined) }}>{a}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{unitA}</p>
          {betterA && <span className="text-[8px] text-green-500 font-semibold">✓ better</span>}
        </div>
        <span className="text-xs text-muted-foreground/50 pb-2">vs</span>
        <div className="text-center flex-1">
          <p className="text-lg font-display font-bold" style={{ color: colorB || (betterB ? '#16A34A' : undefined) }}>{b}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{unitB}</p>
          {betterB && <span className="text-[8px] text-green-500 font-semibold">✓ better</span>}
        </div>
      </div>
    </div>
  );
}

function RiskSignalBar({ label, unit }: { label: string; unit: UnitAggregation; color: string }) {
  const denom = unit.applicableItems || 1;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground">{unit.applicableItems} applicable items</span>
      </div>
      <div className="h-4 rounded-full overflow-hidden flex">
        {unit.riskCounts.noRisk > 0 && <div style={{ width: `${(unit.riskCounts.noRisk / denom) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['No Risk (On Track)'] }} />}
        {unit.riskCounts.emerging > 0 && <div style={{ width: `${(unit.riskCounts.emerging / denom) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['Emerging Risk (Needs Attention)'] }} />}
        {unit.riskCounts.critical > 0 && <div style={{ width: `${(unit.riskCounts.critical / denom) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['Critical Risk (Needs Close Attention)'] }} />}
        {unit.riskCounts.realized > 0 && <div style={{ width: `${(unit.riskCounts.realized / denom) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['Realized Risk (Needs Mitigation Strategy)'] }} />}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
        <span>{unit.riskCounts.noRisk} no risk</span>
        <span>{unit.riskCounts.emerging} emerging</span>
        <span>{unit.riskCounts.critical} critical</span>
        <span>{unit.riskCounts.realized} realized</span>
      </div>
    </div>
  );
}

function RadarComparison({ unitA, unitB, heatCells }: { unitA: UnitAggregation; unitB: UnitAggregation; heatCells: { unitId: string; pillar: PillarId; completionPct: number }[] }) {
  const pillars: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];
  const radarData = pillars.map(p => {
    const cellA = heatCells.find(c => c.unitId === unitA.unitId && c.pillar === p);
    const cellB = heatCells.find(c => c.unitId === unitB.unitId && c.pillar === p);
    return { pillar: PILLAR_LABELS[p], fullName: PILLAR_FULL[p], [unitA.unitId]: cellA?.completionPct ?? 0, [unitB.unitId]: cellB?.completionPct ?? 0 };
  });

  return (
    <div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
            <Radar name={getUnitDisplayName(unitA.unitId)} dataKey={unitA.unitId} stroke={RISK_BAND_COLORS.green} fill={RISK_BAND_COLORS.green} fillOpacity={0.15} strokeWidth={2} />
            <Radar name={getUnitDisplayName(unitB.unitId)} dataKey={unitB.unitId} stroke={RISK_BAND_COLORS.amber} fill={RISK_BAND_COLORS.amber} fillOpacity={0.15} strokeWidth={2} />
            <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }} formatter={(v: number) => `Completion: ${v}%`} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-2">
        <span className="flex items-center gap-1.5 text-[11px] text-foreground"><span className="w-4 h-0.5 rounded" style={{ backgroundColor: RISK_BAND_COLORS.green }} />{getUnitDisplayName(unitA.unitId)}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-foreground"><span className="w-4 h-0.5 rounded" style={{ backgroundColor: RISK_BAND_COLORS.amber }} />{getUnitDisplayName(unitB.unitId)}</span>
      </div>
    </div>
  );
}
