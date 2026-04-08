/**
 * Section 2: Per-Pillar Performance Analysis
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { PILLAR_COLORS } from '@/lib/pillar-colors';
import { PILLAR_SHORT, PILLAR_ABBREV } from '@/lib/pillar-labels';
import { getRiskDisplayInfo } from '@/lib/risk-display';
import { getItemStatus, getItemCompletion, computeExpectedProgress } from '@/lib/intelligence';
import { isNotApplicableStatus } from '@/lib/types';
import { mapItemToRiskSignal, RISK_SIGNAL_COLORS, RISK_SIGNAL_ORDER, type RiskSignal } from '@/lib/risk-signals';
import { getUnitDisplayName } from '@/lib/unit-config';
import type { UnitFetchResult } from '@/lib/university-aggregation';
import type { PillarId, ViewType, Term, AcademicYear } from '@/lib/types';

interface Props {
  unitResults: UnitFetchResult[];
  viewType: ViewType;
  term: Term;
  academicYear: AcademicYear;
  selectedPillar: 'all' | PillarId;
  selectedUnits: string[];
}

const PILLAR_IDS: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

export default function PillarPerformanceAnalysis({ unitResults, viewType, term, academicYear, selectedPillar, selectedUnits }: Props) {
  const filtered = useMemo(() => unitResults.filter(u => selectedUnits.includes(u.unitId) && u.result), [unitResults, selectedUnits]);
  const expectedProgress = useMemo(() => computeExpectedProgress(viewType, academicYear), [viewType, academicYear]);

  const pillarPerf = useMemo(() => {
    const pillarsToShow = selectedPillar === 'all' ? PILLAR_IDS : [selectedPillar];

    return pillarsToShow.map(pillar => {
      let totalItems = 0, naCount = 0, cotCount = 0, cbtCount = 0, ipCount = 0, nsCount = 0;
      const riskCounts: Record<string, number> = {};
      RISK_SIGNAL_ORDER.forEach(s => riskCounts[s] = 0);

      // Per-unit breakdown for single pillar
      const unitBreakdown: { unitId: string; unitName: string; applicable: number; completion: number; progress: number; riskIndex: number }[] = [];

      filtered.forEach(ur => {
        let uTotal = 0, uNa = 0, uCot = 0, uCbt = 0, uIp = 0, uNs = 0, uProgressSum = 0, uProgressCount = 0;
        let uNoRisk = 0, uEmerging = 0, uCritical = 0, uRealized = 0;

        ur.result!.data.forEach(item => {
          if (item.pillar !== pillar) return;
          totalItems++; uTotal++;
          const status = getItemStatus(item, viewType, term, academicYear);
          if (isNotApplicableStatus(status)) { naCount++; uNa++; return; }
          const completion = getItemCompletion(item, viewType, term, academicYear);
          const completionValid = typeof completion === 'number' && completion >= 0 && completion <= 100;
          const signal = mapItemToRiskSignal(status, completion, completionValid, expectedProgress);
          riskCounts[signal] = (riskCounts[signal] || 0) + 1;

          switch (signal) {
            case 'No Risk (On Track)': uNoRisk++; break;
            case 'Emerging Risk (Needs Attention)': uEmerging++; break;
            case 'Critical Risk (Needs Close Attention)': uCritical++; break;
            case 'Realized Risk (Needs Mitigation Strategy)': uRealized++; break;
          }

          switch (status) {
            case 'Completed – On Target': cotCount++; uCot++; break;
            case 'Completed – Below Target': cbtCount++; uCbt++; break;
            case 'In Progress': ipCount++; uIp++; uProgressSum += completion; uProgressCount++; break;
            case 'Not Started': nsCount++; uNs++; break;
          }
        });

        const uApplicable = uTotal - uNa;
        if (uApplicable > 0) {
          const uWeighted = (0 * uNoRisk + 1 * uEmerging + 2 * uCritical + 3 * uRealized);
          unitBreakdown.push({
            unitId: ur.unitId,
            unitName: getUnitDisplayName(ur.unitId),
            applicable: uApplicable,
            completion: parseFloat(((uCot + uCbt) / uApplicable * 100).toFixed(1)),
            progress: uProgressCount > 0 ? Math.round(uProgressSum / uProgressCount) : 0,
            riskIndex: parseFloat((uWeighted / uApplicable).toFixed(2)),
          });
        }
      });

      const applicableItems = totalItems - naCount;
      const ri = applicableItems > 0
        ? parseFloat(((0 * (riskCounts['No Risk (On Track)'] || 0) + 1 * (riskCounts['Emerging Risk (Needs Attention)'] || 0) + 2 * (riskCounts['Critical Risk (Needs Close Attention)'] || 0) + 3 * (riskCounts['Realized Risk (Needs Mitigation Strategy)'] || 0)) / applicableItems).toFixed(2))
        : 0;

      return {
        pillar, totalItems, naCount, applicableItems, cotCount, cbtCount, ipCount, nsCount,
        riskCounts, riskIndex: ri,
        unitBreakdown: unitBreakdown.sort((a, b) => b.riskIndex - a.riskIndex),
      };
    });
  }, [filtered, selectedPillar, viewType, term, academicYear, expectedProgress]);

  if (selectedPillar !== 'all' && pillarPerf[0]) {
    return <SinglePillarPerformance perf={pillarPerf[0]} expectedProgress={expectedProgress} />;
  }

  return (
    <div className="space-y-4">
      {pillarPerf.map(p => {
        const ri = getRiskDisplayInfo(p.riskIndex);
        const statusData = [
          { name: 'On Target', value: p.cotCount, color: '#16A34A' },
          { name: 'Below Target', value: p.cbtCount, color: '#7F1D1D' },
          { name: 'In Progress', value: p.ipCount, color: '#E6A23C' },
          { name: 'Not Started', value: p.nsCount, color: '#94A3B8' },
        ].filter(d => d.value > 0);

        return (
          <div key={p.pillar} className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="h-1" style={{ backgroundColor: PILLAR_COLORS[p.pillar] }} />
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">{PILLAR_SHORT[p.pillar]}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{p.applicableItems} applicable / {p.totalItems} total</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${ri.color}15`, color: ri.color }}>RI {ri.percent}%</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-[100px] h-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={42} paddingAngle={2}>
                        {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {statusData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-bold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SinglePillarPerformance({ perf, expectedProgress }: { perf: any; expectedProgress: number }) {
  const ri = getRiskDisplayInfo(perf.riskIndex);

  // Unit comparison chart data
  const chartData = perf.unitBreakdown.map((u: any) => ({
    name: u.unitName,
    progress: u.progress,
    completion: u.completion,
    ri: parseFloat(((u.riskIndex / 3) * 100).toFixed(1)),
  }));

  return (
    <div className="space-y-4">
      {/* Risk distribution */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Risk Signal Distribution</h4>
        <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-muted/30">
          {RISK_SIGNAL_ORDER.map(signal => {
            const count = perf.riskCounts[signal] || 0;
            if (count === 0 || perf.applicableItems === 0) return null;
            return (
              <div key={signal} style={{ width: `${count / perf.applicableItems * 100}%`, backgroundColor: RISK_SIGNAL_COLORS[signal] }} title={`${signal}: ${count}`} />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {RISK_SIGNAL_ORDER.map(signal => {
            const count = perf.riskCounts[signal] || 0;
            if (count === 0) return null;
            const shortLabel = signal.split('(')[0].trim();
            return (
              <div key={signal} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_SIGNAL_COLORS[signal] }} />
                <span className="text-muted-foreground">{shortLabel}</span>
                <span className="font-bold text-foreground">{count} ({perf.applicableItems > 0 ? (count / perf.applicableItems * 100).toFixed(0) : 0}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unit comparison bar chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Unit-Level Progress & Completion</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={60} />
                <ReTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="progress" name="Progress" fill="#E6A23C" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey="completion" name="Completion" fill="#16A34A" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
