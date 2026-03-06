/**
 * Tab 2 — Risk & Exceptions
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, AlertTriangle, Flag } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import {
  aggregateByPillar, aggregateUnitByPillar, getExceptionFlags, getRiskBandColor, RISK_BAND_COLORS,
  type UniversityAggregation, type UnitPillarCell, type ExceptionFlag, type PillarAggregation,
} from '@/lib/university-aggregation';
import { RISK_SIGNAL_COLORS, RISK_SIGNAL_ORDER } from '@/lib/risk-signals';
import type { PillarId } from '@/lib/types';

const PILLAR_LABELS: Record<PillarId, string> = { I: 'Pillar I', II: 'Pillar II', III: 'Pillar III', IV: 'Pillar IV', V: 'Pillar V' };

interface Props { aggregation: UniversityAggregation; }

export default function RiskExceptions({ aggregation }: Props) {
  const { viewType, academicYear, term } = useDashboard();
  const { data: unitResults } = useUniversityData();

  const flags = useMemo(() => unitResults ? getExceptionFlags(unitResults, viewType, term, academicYear, 10) : [], [unitResults, viewType, term, academicYear]);
  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);
  const heatCells = useMemo(() => unitResults ? aggregateUnitByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);
  const loadedUnits = useMemo(() => aggregation.unitAggregations.sort((a, b) => b.riskIndex - a.riskIndex).map(u => ({ unitId: u.unitId, unitName: u.unitName })), [aggregation]);

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground italic px-1">Risk signals are derived exclusively from execution status and do not incorporate time progression.</p>
      <StrategicFlags flags={flags} />
      <PillarRiskDistribution pillarAgg={pillarAgg} />
      <UnitPillarHeatMap loadedUnits={loadedUnits} heatCells={heatCells} />
    </div>
  );
}

function StrategicFlags({ flags }: { flags: ExceptionFlag[] }) {
  if (flags.length === 0) {
    return (<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-6 text-center"><Flag className="w-6 h-6 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No critical or realized risk flags detected.</p></motion.div>);
  }
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-4 h-4 text-destructive" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top 10 Strategic Flags</span>
        <span className="text-xs text-muted-foreground ml-auto">{flags.length} exception{flags.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4 px-2">Items with Critical or Realized risk signals requiring immediate executive attention.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground w-8">#</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Risk</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Unit</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Pillar</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden sm:table-cell">Action Step</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Status</th>
            <th className="text-right py-2 px-2 font-medium text-muted-foreground">%</th>
          </tr></thead>
          <tbody>
            {flags.map((flag, idx) => {
              const color = RISK_SIGNAL_COLORS[flag.riskSignal];
              return (
                <tr key={`${flag.unitId}-${flag.sheetRow}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-2 text-muted-foreground font-medium">{idx + 1}</td>
                  <td className="py-2 px-2"><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} /><span className="text-xs font-medium" style={{ color }}>{flag.riskSignal.includes('Realized') ? 'Realized' : 'Critical'}</span></span></td>
                  <td className="py-2 px-2 font-medium text-foreground truncate max-w-[120px]">{flag.unitId} — {flag.unitName}</td>
                  <td className="py-2 px-2 text-muted-foreground">{flag.pillar}</td>
                  <td className="py-2 px-2 text-muted-foreground truncate max-w-[200px] hidden sm:table-cell">{flag.actionStep}</td>
                  <td className="py-2 px-2 text-muted-foreground truncate max-w-[120px]">{flag.status}</td>
                  <td className="py-2 px-2 text-right font-medium text-foreground">{flag.completion}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function PillarRiskDistribution({ pillarAgg }: { pillarAgg: PillarAggregation[] }) {
  const chartData = pillarAgg.map(p => ({ name: PILLAR_LABELS[p.pillar], pillar: p.pillar, noRisk: p.riskCounts.noRisk, emerging: p.riskCounts.emerging, critical: p.riskCounts.critical, realized: p.riskCounts.realized, riskIndex: p.riskIndex, applicable: p.applicableItems }));
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4"><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Distribution by Pillar</span></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" barSize={20}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 10 }} />
              <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }} formatter={(value: number, name: string) => { const labels: Record<string,string> = { noRisk:'No Risk', emerging:'Emerging', critical:'Critical', realized:'Realized' }; return [value, labels[name]||name]; }} />
              <Bar dataKey="noRisk" stackId="a" fill={RISK_SIGNAL_COLORS['No Risk (On Track)']} />
              <Bar dataKey="emerging" stackId="a" fill={RISK_SIGNAL_COLORS['Emerging Risk (Needs Attention)']} />
              <Bar dataKey="critical" stackId="a" fill={RISK_SIGNAL_COLORS['Critical Risk (Needs Close Attention)']} />
              <Bar dataKey="realized" stackId="a" fill={RISK_SIGNAL_COLORS['Realized Risk (Needs Mitigation Strategy)']} radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {pillarAgg.map(p => {
            const color = getRiskBandColor(p.riskIndex);
            const pct = Math.min(100, (p.riskIndex / 3) * 100);
            return (
              <div key={p.pillar} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <span className="text-xs font-semibold text-foreground w-14">{PILLAR_LABELS[p.pillar]}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} /></div>
                <span className="text-xs font-bold w-10 text-right" style={{ color }}>{p.riskIndex.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground w-8 text-right">{p.applicableItems}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function UnitPillarHeatMap({ loadedUnits, heatCells }: { loadedUnits: { unitId: string; unitName: string }[]; heatCells: UnitPillarCell[] }) {
  const pillars: PillarId[] = ['I','II','III','IV','V'];
  const getCell = (unitId: string, pillar: PillarId) => heatCells.find(c => c.unitId === unitId && c.pillar === pillar);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-elevated p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit × Pillar Heat Map</span></div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead><tr>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground border-b border-border sticky left-0 bg-card z-10 min-w-[140px]">Unit</th>
            {pillars.map(p => (<th key={p} className="text-center py-2 px-2 font-medium text-muted-foreground border-b border-border w-20">{PILLAR_LABELS[p]}</th>))}
          </tr></thead>
          <tbody>
            {loadedUnits.map(unit => (
              <tr key={unit.unitId} className="border-b border-border/30">
                <td className="py-1.5 px-2 font-medium text-foreground truncate max-w-[160px] sticky left-0 bg-card z-10">{unit.unitId} — {unit.unitName}</td>
                {pillars.map(pillar => {
                  const cell = getCell(unit.unitId, pillar);
                  if (!cell || cell.applicableItems === 0) return (<td key={pillar} className="text-center py-1.5 px-2"><span className="text-[10px] text-muted-foreground/50">—</span></td>);
                  const color = getRiskBandColor(cell.riskIndex);
                  const opacity = Math.max(0.15, Math.min(0.85, cell.riskIndex / 3));
                  return (
                    <td key={pillar} className="text-center py-1.5 px-1" title={`${unit.unitName} — ${PILLAR_LABELS[pillar]}: RI ${cell.riskIndex.toFixed(2)}, ${cell.applicableItems} items`}>
                      <div className="rounded-md py-1 px-1 mx-auto w-14" style={{ backgroundColor: `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` }}>
                        <span className="text-xs font-bold" style={{ color }}>{cell.riskIndex.toFixed(2)}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">Risk Band:</span>
        {(['green','amber','orange','red'] as const).map(band => (
          <span key={band} className="text-[10px] px-2 py-0.5 rounded-full" style={{ borderColor: `${RISK_BAND_COLORS[band]}40`, color: RISK_BAND_COLORS[band], backgroundColor: `${RISK_BAND_COLORS[band]}10`, border: `1px solid ${RISK_BAND_COLORS[band]}40` }}>
            {band === 'green' ? '0–0.75' : band === 'amber' ? '0.76–1.50' : band === 'orange' ? '1.51–2.25' : '2.26–3.00'}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
