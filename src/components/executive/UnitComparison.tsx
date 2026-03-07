/**
 * Tab 6 — Unit Comparison
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { ArrowUpDown, Search, BarChart3, GitCompareArrows } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateUnitByPillar, getRiskBandColor, RISK_BAND_COLORS, type UniversityAggregation, type UnitAggregation } from '@/lib/university-aggregation';
import { RISK_SIGNAL_COLORS } from '@/lib/risk-signals';
import { getUnitDisplayLabel, getUnitDisplayName } from '@/lib/unit-config';
import type { PillarId } from '@/lib/types';

const PILLAR_LABELS: Record<PillarId, string> = { I: 'Pillar I', II: 'Pillar II', III: 'Pillar III', IV: 'Pillar IV', V: 'Pillar V' };
type SortKey = 'unitName' | 'riskIndex' | 'completionPct' | 'applicableItems' | 'onTrackPct';
type SortDir = 'asc' | 'desc';

interface Props { aggregation: UniversityAggregation; }

export default function UnitComparison({ aggregation }: Props) {
  const { viewType, academicYear, term } = useDashboard();
  const { data: unitResults } = useUniversityData();
  const [sortKey, setSortKey] = useState<SortKey>('riskIndex');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  const heatCells = useMemo(() => unitResults ? aggregateUnitByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  const sortedUnits = useMemo(() => {
    let units = [...aggregation.unitAggregations];
    if (search.trim()) { const q = search.toLowerCase(); units = units.filter(u => u.unitName.toLowerCase().includes(q) || u.unitId.toLowerCase().includes(q)); }
    units.sort((a, b) => { const mul = sortDir === 'asc' ? 1 : -1; if (sortKey === 'unitName') return mul * a.unitName.localeCompare(b.unitName); return mul * ((a[sortKey] as number) - (b[sortKey] as number)); });
    return units;
  }, [aggregation.unitAggregations, sortKey, sortDir, search]);

  const toggleSort = (key: SortKey) => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir(key === 'unitName' ? 'asc' : 'desc'); } };

  const unitA = compareA ? aggregation.unitAggregations.find(u => u.unitId === compareA) : null;
  const unitB = compareB ? aggregation.unitAggregations.find(u => u.unitId === compareB) : null;

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground italic px-1">All metrics computed from raw counts. RiskIndex uses weighted sum of risk signal counts, not averaged unit values.</p>

      <div className="card-elevated p-4 sm:p-5 space-y-2">
        <p className="text-xs font-semibold text-foreground">How to compare units</p>
        <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1 pl-1">
          <li>Select the first unit from the ranking table below.</li>
          <li>Select the second unit to evaluate performance differences.</li>
        </ol>
      </div>

      {/* Ranking Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">All Units Ranking</span><span className="text-[10px] text-muted-foreground">({sortedUnits.length} units)</span></div>
          <div className="relative max-w-xs"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><input type="text" placeholder="Search units…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-medium text-muted-foreground w-8">#</th>
              <SortHeader label="Unit" sortKey="unitName" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
              <SortHeader label="Risk Index" sortKey="riskIndex" currentKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <SortHeader label="Completion %" sortKey="completionPct" currentKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <SortHeader label="On Track %" sortKey="onTrackPct" currentKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <SortHeader label="Applicable" sortKey="applicableItems" currentKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <th className="text-center py-2 px-2 font-medium text-muted-foreground">Risk Signal Bar</th>
              <th className="text-center py-2 px-2 font-medium text-muted-foreground w-16">Compare</th>
            </tr></thead>
            <tbody>
              {sortedUnits.map((unit, idx) => {
                const riColor = getRiskBandColor(unit.riskIndex);
                const isSelected = compareA === unit.unitId || compareB === unit.unitId;
                return (
                  <tr key={unit.unitId} className={`border-b border-border/30 hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                    <td className="py-2 px-2 text-muted-foreground font-medium">{idx + 1}</td>
                    <td className="py-2 px-2 font-medium text-foreground truncate max-w-[200px]">{getUnitDisplayLabel(unit.unitId)}</td>
                    <td className="py-2 px-2 text-right"><span className="font-bold" style={{ color: riColor }}>{unit.riskIndex.toFixed(2)}</span></td>
                    <td className="py-2 px-2 text-right font-medium text-foreground">{unit.completionPct}%</td>
                    <td className="py-2 px-2 text-right font-medium text-foreground">{unit.onTrackPct}%</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{unit.applicableItems}</td>
                    <td className="py-2 px-2"><MiniRiskBar unit={unit} /></td>
                    <td className="py-2 px-2 text-center">
                      <button onClick={() => {
                        if (compareA === unit.unitId) setCompareA(null);
                        else if (compareB === unit.unitId) setCompareB(null);
                        else if (!compareA) setCompareA(unit.unitId);
                        else if (!compareB) setCompareB(unit.unitId);
                        else { setCompareA(compareB); setCompareB(unit.unitId); }
                      }} className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                        {isSelected ? (compareA === unit.unitId ? 'A' : 'B') : 'Select'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Completion Bar Chart */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-4 sm:p-6">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completion % by Unit</span>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedUnits.map(u => ({ name: getUnitDisplayName(u.unitId), completion: u.completionPct, riskIndex: u.riskIndex }))} barSize={16}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-45} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }} formatter={(v: number) => [`${v}%`, 'Completion']} />
              <Bar dataKey="completion" radius={[3, 3, 0, 0]}>{sortedUnits.map((u, i) => (<Cell key={i} fill={getRiskBandColor(u.riskIndex)} />))}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Side-by-Side Comparison */}
      {unitA && unitB && <SideBySide unitA={unitA} unitB={unitB} heatCells={heatCells} universityAvg={aggregation} />}
      {(compareA || compareB) && (!unitA || !unitB) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-elevated p-6 text-center">
          <GitCompareArrows className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Select {!compareA ? 'a first' : 'a second'} unit from the table above to compare.</p>
        </motion.div>
      )}
    </div>
  );
}

function MiniRiskBar({ unit }: { unit: UnitAggregation }) {
  if (unit.applicableItems === 0) return <span className="text-[10px] text-muted-foreground/50">—</span>;
  const denom = unit.applicableItems;
  return (
    <div className="h-2 rounded-full overflow-hidden flex w-full min-w-[60px]">
      {unit.riskCounts.noRisk > 0 && <div style={{ width: `${(unit.riskCounts.noRisk / denom) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['No Risk (On Track)'] }} />}
      {unit.riskCounts.emerging > 0 && <div style={{ width: `${(unit.riskCounts.emerging / denom) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['Emerging Risk (Needs Attention)'] }} />}
      {unit.riskCounts.critical > 0 && <div style={{ width: `${(unit.riskCounts.critical / denom) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['Critical Risk (Needs Close Attention)'] }} />}
      {unit.riskCounts.realized > 0 && <div style={{ width: `${(unit.riskCounts.realized / denom) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['Realized Risk (Needs Mitigation Strategy)'] }} />}
    </div>
  );
}

function SortHeader({ label, sortKey, currentKey, dir, onSort, align = 'left' }: { label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir; onSort: (k: SortKey) => void; align?: 'left' | 'right' }) {
  const active = currentKey === sortKey;
  return (
    <th className={`py-2 px-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none ${align === 'right' ? 'text-right' : 'text-left'}`} onClick={() => onSort(sortKey)}>
      <span className="inline-flex items-center gap-1">{label}<ArrowUpDown className={`w-3 h-3 ${active ? 'text-foreground' : 'text-muted-foreground/40'}`} />{active && <span className="text-[8px]">{dir === 'asc' ? '↑' : '↓'}</span>}</span>
    </th>
  );
}

function SideBySide({ unitA, unitB, heatCells, universityAvg }: { unitA: UnitAggregation; unitB: UnitAggregation; heatCells: { unitId: string; pillar: PillarId; riskIndex: number; completionPct: number; applicableItems: number }[]; universityAvg: UniversityAggregation }) {
  const pillars: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];
  const radarData = pillars.map(p => {
    const cellA = heatCells.find(c => c.unitId === unitA.unitId && c.pillar === p);
    const cellB = heatCells.find(c => c.unitId === unitB.unitId && c.pillar === p);
    return { pillar: PILLAR_LABELS[p], [unitA.unitId]: cellA?.completionPct ?? 0, [unitB.unitId]: cellB?.completionPct ?? 0 };
  });

  const metrics: { label: string; a: string; b: string; better: 'a'|'b'|'tie' }[] = [
    { label: 'Risk Index', a: unitA.riskIndex.toFixed(2), b: unitB.riskIndex.toFixed(2), better: unitA.riskIndex < unitB.riskIndex ? 'a' : unitA.riskIndex > unitB.riskIndex ? 'b' : 'tie' },
    { label: 'Completion %', a: `${unitA.completionPct}%`, b: `${unitB.completionPct}%`, better: unitA.completionPct > unitB.completionPct ? 'a' : unitA.completionPct < unitB.completionPct ? 'b' : 'tie' },
    { label: 'On Track %', a: `${unitA.onTrackPct}%`, b: `${unitB.onTrackPct}%`, better: unitA.onTrackPct > unitB.onTrackPct ? 'a' : unitA.onTrackPct < unitB.onTrackPct ? 'b' : 'tie' },
    { label: 'Below Target %', a: `${unitA.belowTargetPct}%`, b: `${unitB.belowTargetPct}%`, better: unitA.belowTargetPct < unitB.belowTargetPct ? 'a' : unitA.belowTargetPct > unitB.belowTargetPct ? 'b' : 'tie' },
    { label: 'Applicable Items', a: `${unitA.applicableItems}`, b: `${unitB.applicableItems}`, better: 'tie' },
    { label: 'Critical + Realized', a: `${unitA.riskCounts.critical + unitA.riskCounts.realized}`, b: `${unitB.riskCounts.critical + unitB.riskCounts.realized}`, better: (unitA.riskCounts.critical+unitA.riskCounts.realized) < (unitB.riskCounts.critical+unitB.riskCounts.realized) ? 'a' : (unitA.riskCounts.critical+unitA.riskCounts.realized) > (unitB.riskCounts.critical+unitB.riskCounts.realized) ? 'b' : 'tie' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-elevated p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4"><GitCompareArrows className="w-4 h-4 text-primary" /><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{unitA.unitId} vs {unitB.unitId}</span></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_80px_80px] gap-1 mb-2">
            <span className="text-[10px] text-muted-foreground font-medium">Metric</span>
            <span className="text-[10px] text-muted-foreground font-medium text-center truncate">{unitA.unitId}</span>
            <span className="text-[10px] text-muted-foreground font-medium text-center truncate">{unitB.unitId}</span>
          </div>
          {metrics.map(m => (
            <div key={m.label} className="grid grid-cols-[1fr_80px_80px] gap-1 py-1.5 border-b border-border/30">
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <span className={`text-xs font-semibold text-center ${m.better === 'a' ? 'text-green-500' : 'text-foreground'}`}>{m.a} {m.better === 'a' && '✓'}</span>
              <span className={`text-xs font-semibold text-center ${m.better === 'b' ? 'text-green-500' : 'text-foreground'}`}>{m.b} {m.better === 'b' && '✓'}</span>
            </div>
          ))}
          <div className="mt-4 pt-3 border-t border-border">
            <span className="text-[10px] text-muted-foreground font-medium uppercase">vs University Average</span>
            <div className="grid grid-cols-[1fr_80px_80px] gap-1 mt-2">
              <span className="text-xs text-muted-foreground">Univ. Avg</span>
              <span className="text-[10px] text-center text-muted-foreground col-span-2">RI {universityAvg.riskIndex.toFixed(2)} • {universityAvg.completionPct}% completion</span>
            </div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
              <Radar name={unitA.unitName} dataKey={unitA.unitId} stroke={RISK_BAND_COLORS.green} fill={RISK_BAND_COLORS.green} fillOpacity={0.15} strokeWidth={2} />
              <Radar name={unitB.unitName} dataKey={unitB.unitId} stroke={RISK_BAND_COLORS.amber} fill={RISK_BAND_COLORS.amber} fillOpacity={0.15} strokeWidth={2} />
              <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }} formatter={(v: number) => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[10px]"><span className="w-3 h-0.5 rounded" style={{ backgroundColor: RISK_BAND_COLORS.green }} />{unitA.unitName}</span>
            <span className="flex items-center gap-1.5 text-[10px]"><span className="w-3 h-0.5 rounded" style={{ backgroundColor: RISK_BAND_COLORS.amber }} />{unitB.unitName}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
