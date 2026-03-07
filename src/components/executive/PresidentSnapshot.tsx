/**
 * Tab 1 — Executive Snapshot
 */

import { motion } from 'framer-motion';
import { ShieldAlert, AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import type { UniversityAggregation } from '@/lib/university-aggregation';
import { getRiskBandColor, RISK_BAND_COLORS } from '@/lib/university-aggregation';
import { RISK_SIGNAL_ORDER, RISK_SIGNAL_COLORS } from '@/lib/risk-signals';
import { UNIT_CONFIGS } from '@/lib/unit-config';

interface Props {
  aggregation: UniversityAggregation;
}

function RiskGauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 3) * 100));
  const color = getRiskBandColor(value);

  return (
    <div className="relative h-3 rounded-full bg-muted overflow-hidden mt-3">
      <div className="absolute inset-0 flex">
        <div className="flex-1" style={{ background: `${RISK_BAND_COLORS.green}33` }} />
        <div className="flex-1" style={{ background: `${RISK_BAND_COLORS.amber}33` }} />
        <div className="flex-1" style={{ background: `${RISK_BAND_COLORS.orange}33` }} />
        <div className="flex-1" style={{ background: `${RISK_BAND_COLORS.red}33` }} />
      </div>
      <motion.div
        className="absolute top-0 h-full w-1 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ left: '0%' }}
        animate={{ left: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

function MetricCard({ label, value, subtitle, icon: Icon, color }: {
  label: string; value: string; subtitle?: string; icon: React.ElementType; color: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-4 sm:p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl sm:text-3xl font-display font-bold mt-1" style={{ color }}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-lg bg-muted/50">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
}

export default function PresidentSnapshot({ aggregation }: Props) {
  const {
    completionPct, onTrackPct, belowTargetPct,
    riskIndex, riskDistribution, applicableItems,
    totalItems, naCount, loadedUnits, totalUnits, failedUnits,
    topRiskiestUnits,
  } = aggregation;

  const riskColor = getRiskBandColor(riskIndex);
  const donutData = riskDistribution.filter(d => d.count > 0);

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground italic px-1">
        Risk signals are derived exclusively from execution status and do not incorporate time progression.
      </p>

      {(failedUnits.length > 0 || loadedUnits < totalUnits) && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-3 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-medium text-foreground">Coverage: {loadedUnits}/{totalUnits} units loaded</span>
          </div>
          {failedUnits.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              Missing: {failedUnits.map(id => UNIT_CONFIGS[id]?.name || id).join(', ')}
            </p>
          )}
        </motion.div>
      )}

      <p className="text-xs text-muted-foreground px-1">
        High-level execution metrics across all loaded units. Completion includes both on-target and below-target items.
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Completion" value={`${completionPct}%`} subtitle={`${aggregation.cotCount + aggregation.cbtCount} of ${applicableItems} applicable`} icon={CheckCircle2} color="hsl(var(--primary))" />
        <MetricCard label="On Track" value={`${onTrackPct}%`} subtitle={`${aggregation.cotCount} items on target`} icon={CheckCircle2} color="#16A34A" />
        <MetricCard label="Below Target" value={`${belowTargetPct}%`} subtitle={`${aggregation.cbtCount} items below target`} icon={AlertTriangle} color="#B23A48" />
        <MetricCard label="Coverage" value={`${loadedUnits}/${totalUnits}`} subtitle={`${totalItems} total items across units`} icon={Users} color="hsl(var(--primary))" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Risk Index Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent pointer-events-none" />
          <div className="relative">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">University Risk Index</span>
            <p className="text-xs text-muted-foreground mt-1">Weighted severity index across all applicable items. Lower is better.</p>
            <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
              <p className="text-[11px] text-muted-foreground">The Risk Index is a weighted indicator that summarizes overall risk exposure.</p>
              <p className="text-[11px] text-muted-foreground">Weights: <span className="font-medium text-foreground">No Risk = 0</span>, <span className="font-medium text-foreground">Emerging = 1</span>, <span className="font-medium text-foreground">Critical = 2</span>, <span className="font-medium text-foreground">Realized = 3</span></p>
              <p className="text-[11px] text-muted-foreground font-mono">RI = (0×NoRisk + 1×Emerging + 2×Critical + 3×Realized) / Applicable</p>
              <p className="text-[10px] text-muted-foreground/70 italic">Range: 0 (no structural risk) to 3 (maximum structural risk exposure).</p>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl sm:text-5xl font-display font-bold" style={{ color: riskColor }}>{riskIndex.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">/ 3.00</span>
            </div>
            <RiskGauge value={riskIndex} />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">0 (low) → 3 (high)</span>
              <span className="text-xs text-muted-foreground">{applicableItems} applicable items</span>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {(['green', 'amber', 'orange', 'red'] as const).map(band => (
                <span key={band} className="text-[10px] px-2 py-0.5 rounded-full border" style={{
                  borderColor: `${RISK_BAND_COLORS[band]}40`,
                  color: RISK_BAND_COLORS[band],
                  backgroundColor: `${RISK_BAND_COLORS[band]}10`,
                }}>
                  {band === 'green' ? '0–0.75' : band === 'amber' ? '0.76–1.50' : band === 'orange' ? '1.51–2.25' : '2.26–3.00'}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Risk Distribution Donut */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-elevated p-4 sm:p-6">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Distribution</span>
          <p className="text-xs text-muted-foreground mt-1">Breakdown of all applicable items by risk signal category.</p>
          <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1.5">
            <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">No Risk (On Track)</span> — The initiative has been completed on target.</p>
            <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Emerging Risk</span> — The initiative is in progress but shows signals that require monitoring.</p>
            <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Critical Risk</span> — The initiative has not started or is significantly delayed.</p>
            <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Realized Risk</span> — The initiative has been completed but below target.</p>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 mt-4">
            <div className="w-28 h-28 sm:w-36 sm:h-36 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donutData} innerRadius="60%" outerRadius="85%" dataKey="count" startAngle={90} endAngle={-270} strokeWidth={0}>
                    {donutData.map((d, i) => (<Cell key={i} fill={d.color} />))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number, name: string) => [`${value} items`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              {RISK_SIGNAL_ORDER.map(signal => {
                const item = riskDistribution.find(d => d.signal === signal);
                return (
                  <div key={signal} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: RISK_SIGNAL_COLORS[signal] }} />
                    <span className="text-xs text-foreground flex-1 truncate">{signal.split(' (')[0]}</span>
                    <span className="text-xs font-semibold text-foreground">{item?.count || 0}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{item?.percent || 0}%</span>
                  </div>
                );
              })}
              <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Not Applicable</span>
                <span className="text-xs font-semibold text-muted-foreground">{naCount}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {topRiskiestUnits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-elevated p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top 3 Highest Risk Units</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topRiskiestUnits.map((unit, idx) => {
              const unitColor = getRiskBandColor(unit.riskIndex);
              return (
                <div key={unit.unitId} className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">#{idx + 1} {getUnitDisplayLabel(unit.unitId)}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{
                      color: unitColor, backgroundColor: `${unitColor}15`, border: `1px solid ${unitColor}30`,
                    }}>{unit.riskIndex.toFixed(2)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Completion</span><span className="text-foreground font-medium">{unit.completionPct}%</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Applicable</span><span className="text-foreground font-medium">{unit.applicableItems}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Critical + Realized</span><span className="text-foreground font-medium">{unit.riskCounts.critical + unit.riskCounts.realized}</span></div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden flex">
                    {unit.riskCounts.noRisk > 0 && <div style={{ width: `${(unit.riskCounts.noRisk / unit.applicableItems) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['No Risk (On Track)'] }} />}
                    {unit.riskCounts.emerging > 0 && <div style={{ width: `${(unit.riskCounts.emerging / unit.applicableItems) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['Emerging Risk (Needs Attention)'] }} />}
                    {unit.riskCounts.critical > 0 && <div style={{ width: `${(unit.riskCounts.critical / unit.applicableItems) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['Critical Risk (Needs Close Attention)'] }} />}
                    {unit.riskCounts.realized > 0 && <div style={{ width: `${(unit.riskCounts.realized / unit.applicableItems) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['Realized Risk (Needs Mitigation Strategy)'] }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
