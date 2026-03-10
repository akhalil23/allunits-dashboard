/**
 * Tab 4 — Multi-Unit Comparison (Enhanced)
 * Select up to 5 units, compare KPIs, pillar charts, and detailed table.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import {
  GitCompareArrows, X, Trash2, Trophy, ShieldAlert, Lightbulb,
  BarChart3, Table2, ChevronDown, Anchor, CheckCircle2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTip } from '@/components/ui/info-tip';
import { RIMeter } from '@/components/ui/ri-meter';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateUnitByPillar, type UniversityAggregation, type UnitAggregation } from '@/lib/university-aggregation';
import { RISK_SIGNAL_COLORS } from '@/lib/risk-signals';
import { formatRIPercent, getRiskDisplayInfo, RI_TOOLTIP } from '@/lib/risk-display';
import { getUnitDisplayLabel, getUnitDisplayName, UNIT_IDS } from '@/lib/unit-config';
import { PILLAR_SHORT, PILLAR_FULL, PILLAR_ABBREV } from '@/lib/pillar-labels';
import type { PillarId } from '@/lib/types';

const MAX_UNITS = 5;

const UNIT_COLORS = ['#3B82F6', '#16A34A', '#F59E0B', '#EF4444', '#8B5CF6'];

interface Props { aggregation: UniversityAggregation; }

type CompareMetric = 'completion' | 'risk' | 'budget';

export default function UnitComparison({ aggregation }: Props) {
  const { viewType, academicYear, term } = useDashboard();
  const { data: unitResults } = useUniversityData();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [anchorMode, setAnchorMode] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [compareMetric, setCompareMetric] = useState<CompareMetric>('completion');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const heatCells = useMemo(() => unitResults ? aggregateUnitByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  const allUnits = useMemo(() =>
    UNIT_IDS.map(id => ({
      unitId: id,
      label: getUnitDisplayLabel(id),
      name: getUnitDisplayName(id),
    })).sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  const filteredUnits = useMemo(() => {
    if (!searchQuery) return allUnits;
    const q = searchQuery.toLowerCase();
    return allUnits.filter(u => u.label.toLowerCase().includes(q));
  }, [allUnits, searchQuery]);

  const selectedUnits = useMemo(() =>
    selectedIds.map(id => aggregation.unitAggregations.find(u => u.unitId === id)).filter(Boolean) as UnitAggregation[],
    [selectedIds, aggregation]
  );

  const toggleUnit = useCallback((unitId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(unitId)) return prev.filter(id => id !== unitId);
      if (prev.length >= MAX_UNITS) return prev;
      return [...prev, unitId];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setAnchorId(null);
    setAnchorMode(false);
  }, []);

  const selectTopPerformers = useCallback(() => {
    const top = [...aggregation.unitAggregations]
      .sort((a, b) => b.completionPct - a.completionPct)
      .slice(0, MAX_UNITS)
      .map(u => u.unitId);
    setSelectedIds(top);
  }, [aggregation]);

  const selectHighRisk = useCallback(() => {
    const risky = [...aggregation.unitAggregations]
      .sort((a, b) => b.riskIndex - a.riskIndex)
      .slice(0, MAX_UNITS)
      .map(u => u.unitId);
    setSelectedIds(risky);
  }, [aggregation]);

  // Pillar data for selected units
  const pillarChartData = useMemo(() => {
    const pillars: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];
    return pillars.map(p => {
      const entry: Record<string, any> = { pillar: PILLAR_ABBREV[p], fullPillar: PILLAR_FULL[p] };
      selectedIds.forEach(id => {
        const cell = heatCells.find(c => c.unitId === id && c.pillar === p);
        if (compareMetric === 'completion') {
          entry[id] = cell?.completionPct ?? 0;
        } else if (compareMetric === 'risk') {
          entry[id] = cell ? getRiskDisplayInfo(cell.riskIndex).percent : 0;
        }
      });
      if (showBenchmark) {
        const allCells = heatCells.filter(c => c.pillar === p);
        if (compareMetric === 'completion') {
          const avg = allCells.length > 0 ? allCells.reduce((s, c) => s + c.completionPct, 0) / allCells.length : 0;
          entry['__avg'] = parseFloat(avg.toFixed(1));
        } else if (compareMetric === 'risk') {
          const avg = allCells.length > 0 ? allCells.reduce((s, c) => s + getRiskDisplayInfo(c.riskIndex).percent, 0) / allCells.length : 0;
          entry['__avg'] = parseFloat(avg.toFixed(1));
        }
      }
      return entry;
    });
  }, [selectedIds, heatCells, compareMetric, showBenchmark]);

  // Insight summary
  const insightSummary = useMemo(() => {
    if (selectedUnits.length < 2) return null;
    const pillars: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

    // Find strongest pillar across selected
    let bestPillar: PillarId = 'I', bestAvg = -1;
    let worstPillar: PillarId = 'I', worstAvg = 101;
    pillars.forEach(p => {
      const cells = selectedIds.map(id => heatCells.find(c => c.unitId === id && c.pillar === p)).filter(Boolean);
      const avg = cells.length > 0 ? cells.reduce((s, c) => s + c!.completionPct, 0) / cells.length : 0;
      if (avg > bestAvg) { bestAvg = avg; bestPillar = p; }
      if (avg < worstAvg) { worstAvg = avg; worstPillar = p; }
    });

    const highRiskUnits = selectedUnits.filter(u => getRiskDisplayInfo(u.riskIndex).percent > 50);

    let text = `Among the selected units, ${PILLAR_ABBREV[bestPillar]} shows the strongest average performance`;
    if (bestPillar !== worstPillar) {
      text += `, while ${PILLAR_ABBREV[worstPillar]} has the lowest average completion`;
    }
    text += '.';
    if (highRiskUnits.length > 0) {
      text += ` Risk concentration is elevated for ${highRiskUnits.map(u => getUnitDisplayName(u.unitId)).join(', ')}.`;
    }
    return text;
  }, [selectedUnits, selectedIds, heatCells]);

  // Find strongest/weakest pillar per unit
  const getUnitPillarExtremes = (unitId: string) => {
    const pillars: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];
    let strongest: PillarId = 'I', strongestVal = -1;
    let weakest: PillarId = 'I', weakestVal = 101;
    pillars.forEach(p => {
      const cell = heatCells.find(c => c.unitId === unitId && c.pillar === p);
      const val = cell?.completionPct ?? 0;
      const applicable = cell?.applicableItems ?? 0;
      if (applicable > 0) {
        if (val > strongestVal) { strongestVal = val; strongest = p; }
        if (val < weakestVal) { weakestVal = val; weakest = p; }
      }
    });
    return { strongest, weakest };
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Unit Selector */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <GitCompareArrows className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Select Units to Compare</span>
            <span className="text-xs text-muted-foreground ml-auto">{selectedIds.length}/{MAX_UNITS} selected</span>
          </div>

          {/* Multi-select Dropdown */}
          <div className="relative mb-4">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <span className="text-muted-foreground">{selectedIds.length === 0 ? 'Click to select units…' : `${selectedIds.length} unit${selectedIds.length !== 1 ? 's' : ''} selected`}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-30 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-64 overflow-hidden flex flex-col"
                >
                  <div className="p-2 border-b border-border">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search units…"
                      className="w-full px-3 py-2 rounded-lg bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto py-1">
                    {filteredUnits.map(u => {
                      const isSelected = selectedIds.includes(u.unitId);
                      const isDisabled = !isSelected && selectedIds.length >= MAX_UNITS;
                      return (
                        <button
                          key={u.unitId}
                          onClick={() => { toggleUnit(u.unitId); }}
                          disabled={isDisabled}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                            isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50'
                          } ${isSelected ? 'bg-primary/5' : ''}`}
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                          </span>
                          <span className="truncate">{u.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedIds.length >= MAX_UNITS && (
                    <div className="px-3 py-2 border-t border-border bg-amber-500/5">
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Maximum {MAX_UNITS} units. Deselect one to add another.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Selected Chips */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedIds.map((id, idx) => (
                <motion.span
                  key={id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: UNIT_COLORS[idx % UNIT_COLORS.length] }}
                >
                  {anchorMode && anchorId === id && <Anchor className="w-3 h-3" />}
                  {getUnitDisplayName(id)}
                  <button onClick={() => { toggleUnit(id); if (anchorId === id) setAnchorId(null); }} className="ml-0.5 hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </motion.span>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <QuickAction icon={Trash2} label="Clear" onClick={clearSelection} disabled={selectedIds.length === 0} />
            <QuickAction icon={Trophy} label="Top Performers" onClick={selectTopPerformers} />
            <QuickAction icon={ShieldAlert} label="High-Risk Units" onClick={selectHighRisk} />
            <div className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={anchorMode}
                  onChange={e => { setAnchorMode(e.target.checked); if (!e.target.checked) setAnchorId(null); }}
                  className="rounded border-border"
                />
                Anchor Mode
              </label>
              {anchorMode && selectedIds.length > 0 && (
                <select
                  value={anchorId || ''}
                  onChange={e => setAnchorId(e.target.value || null)}
                  className="px-2 py-1 rounded-lg bg-muted/50 border border-border text-xs text-foreground"
                >
                  <option value="">Select anchor…</option>
                  {selectedIds.map(id => (
                    <option key={id} value={id}>{getUnitDisplayName(id)}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {selectedUnits.length >= 2 ? (
        <>
          {/* Insight Summary */}
          {insightSummary && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary mb-1">Automated Insight</p>
                  <p className="text-sm text-foreground leading-relaxed">{insightSummary}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Section 2: Comparison KPI Cards */}
          <section>
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Executive Comparison Summary</h3>
            <div className={`grid gap-3 sm:gap-4 ${selectedUnits.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : selectedUnits.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-5'}`}>
              {selectedUnits.map((unit, idx) => {
                const riInfo = getRiskDisplayInfo(unit.riskIndex);
                const critRealized = unit.riskCounts.critical + unit.riskCounts.realized;
                const { strongest, weakest } = getUnitPillarExtremes(unit.unitId);
                const isAnchor = anchorMode && anchorId === unit.unitId;
                return (
                  <motion.div
                    key={unit.unitId}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -2 }}
                    className={`group relative rounded-2xl border bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden ${isAnchor ? 'border-primary ring-1 ring-primary/30' : 'border-border/60'}`}
                  >
                    <div className="h-1 w-full" style={{ backgroundColor: UNIT_COLORS[idx % UNIT_COLORS.length] }} />
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        {isAnchor && <Anchor className="w-3 h-3 text-primary shrink-0" />}
                        <p className="text-xs font-bold text-foreground truncate">{getUnitDisplayName(unit.unitId)}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{getUnitDisplayLabel(unit.unitId)}</p>

                      <div className="space-y-2.5 pt-1">
                        <MetricRow label="Completion %" value={`${unit.completionPct}%`} />
                        <MetricRow label="Risk Index" value={formatRIPercent(unit.riskIndex)} color={riInfo.color} subtitle={riInfo.band} />
                        <MetricRow label="Critical/Realized" value={`${critRealized}`} color={critRealized > 0 ? '#EF4444' : '#16A34A'} />
                        <MetricRow label="Strongest Pillar" value={PILLAR_ABBREV[strongest]} />
                        <MetricRow label="Weakest Pillar" value={PILLAR_ABBREV[weakest]} />
                      </div>

                      <div className="pt-2">
                        <RIMeter ri={unit.riskIndex} showLabel={false} compact />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Section 3: Pillar-by-Pillar Comparison (Grouped Bar Chart) */}
          <section>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Pillar-by-Pillar Comparison</span>
                  <InfoTip text="Grouped bar chart comparing selected units across all five pillars." />
                </div>
                <div className="flex items-center gap-2">
                  {/* Metric selector */}
                  <select
                    value={compareMetric}
                    onChange={e => setCompareMetric(e.target.value as CompareMetric)}
                    className="px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground focus:outline-none"
                  >
                    <option value="completion">Completion %</option>
                    <option value="risk">Risk Index %</option>
                  </select>
                  {/* Benchmark toggle */}
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBenchmark}
                      onChange={e => setShowBenchmark(e.target.checked)}
                      className="rounded border-border"
                    />
                    vs Average
                  </label>
                </div>
              </div>
              <div className="h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pillarChartData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="pillar" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <ReTooltip
                      content={({ payload, label }) => {
                        if (!payload?.length) return null;
                        const entry = payload[0]?.payload;
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                            <p className="font-semibold text-foreground">{entry?.fullPillar || label}</p>
                            {payload.map((p: any) => {
                              const unitName = p.dataKey === '__avg' ? 'University Avg' : getUnitDisplayName(p.dataKey);
                              return (
                                <p key={p.dataKey} className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill || p.color }} />
                                  <span className="text-muted-foreground">{unitName}:</span>
                                  <span className="font-bold text-foreground">{p.value}%</span>
                                </p>
                              );
                            })}
                          </div>
                        );
                      }}
                    />
                    {selectedIds.map((id, idx) => (
                      <Bar key={id} dataKey={id} fill={UNIT_COLORS[idx % UNIT_COLORS.length]} radius={[3, 3, 0, 0]} />
                    ))}
                    {showBenchmark && (
                      <Bar dataKey="__avg" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} fillOpacity={0.3} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t border-border">
                {selectedIds.map((id, idx) => (
                  <span key={id} className="flex items-center gap-1.5 text-xs text-foreground">
                    <span className="w-3 h-1.5 rounded" style={{ backgroundColor: UNIT_COLORS[idx % UNIT_COLORS.length] }} />
                    {getUnitDisplayName(id)}
                  </span>
                ))}
                {showBenchmark && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-3 h-1.5 rounded bg-muted-foreground/30" />
                    University Avg
                  </span>
                )}
              </div>
            </motion.div>
          </section>

          {/* Section 4: Detailed Comparison Table */}
          <section>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <Table2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Detailed Comparison</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground sticky left-0 bg-muted/30 z-10">Unit</th>
                      {(['I', 'II', 'III', 'IV', 'V'] as PillarId[]).map(p => (
                        <th key={p} className="text-center py-3 px-2 font-semibold text-muted-foreground">
                          <Tooltip>
                            <TooltipTrigger asChild><span className="cursor-help">{PILLAR_ABBREV[p]}</span></TooltipTrigger>
                            <TooltipContent><p className="text-xs">{PILLAR_FULL[p]}</p></TooltipContent>
                          </Tooltip>
                        </th>
                      ))}
                      <th className="text-center py-3 px-2 font-semibold text-muted-foreground">Completion</th>
                      <th className="text-center py-3 px-2 font-semibold text-muted-foreground">RI %</th>
                      <th className="text-center py-3 px-2 font-semibold text-muted-foreground">Strongest</th>
                      <th className="text-center py-3 px-2 font-semibold text-muted-foreground">Weakest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUnits.map((unit, idx) => {
                      const riInfo = getRiskDisplayInfo(unit.riskIndex);
                      const { strongest, weakest } = getUnitPillarExtremes(unit.unitId);
                      return (
                        <tr key={unit.unitId} className="border-t border-border/30">
                          <td className="py-3 px-3 font-medium text-foreground sticky left-0 bg-card z-10">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: UNIT_COLORS[idx % UNIT_COLORS.length] }} />
                              <span className="truncate max-w-[140px]">{getUnitDisplayLabel(unit.unitId)}</span>
                            </span>
                          </td>
                          {(['I', 'II', 'III', 'IV', 'V'] as PillarId[]).map(p => {
                            const cell = heatCells.find(c => c.unitId === unit.unitId && c.pillar === p);
                            return (
                              <td key={p} className="text-center py-3 px-2">
                                {cell && cell.applicableItems > 0 ? (
                                  <span className="font-medium text-foreground">{cell.completionPct}%</span>
                                ) : (
                                  <span className="text-muted-foreground/50">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="text-center py-3 px-2 font-bold text-foreground">{unit.completionPct}%</td>
                          <td className="text-center py-3 px-2">
                            <span className="font-bold" style={{ color: riInfo.color }}>{formatRIPercent(unit.riskIndex)}</span>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">{PILLAR_ABBREV[strongest]}</span>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">{PILLAR_ABBREV[weakest]}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {showBenchmark && (
                      <tr className="border-t-2 border-border bg-muted/10">
                        <td className="py-3 px-3 font-medium text-muted-foreground sticky left-0 bg-muted/10 z-10 italic">University Avg</td>
                        {(['I', 'II', 'III', 'IV', 'V'] as PillarId[]).map(p => {
                          const cells = heatCells.filter(c => c.pillar === p && c.applicableItems > 0);
                          const avg = cells.length > 0 ? cells.reduce((s, c) => s + c.completionPct, 0) / cells.length : 0;
                          return <td key={p} className="text-center py-3 px-2 text-muted-foreground italic">{avg.toFixed(1)}%</td>;
                        })}
                        <td className="text-center py-3 px-2 font-bold text-muted-foreground italic">{aggregation.completionPct}%</td>
                        <td className="text-center py-3 px-2 font-bold text-muted-foreground italic">{formatRIPercent(aggregation.riskIndex)}</td>
                        <td className="text-center py-3 px-2">—</td>
                        <td className="text-center py-3 px-2">—</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </section>

          {/* Section 5: Risk Signal Comparison */}
          <section>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 block">
                Risk Signal Comparison <InfoTip text="Color-coded bar showing the distribution of risk signals for each selected unit." />
              </span>
              <div className="space-y-5">
                {selectedUnits.map((unit, idx) => (
                  <RiskSignalBar key={unit.unitId} label={getUnitDisplayName(unit.unitId)} unit={unit} color={UNIT_COLORS[idx % UNIT_COLORS.length]} />
                ))}
              </div>
              <div className="flex flex-wrap gap-4 mt-5 pt-3 border-t border-border">
                {[
                  { label: 'No Risk', color: RISK_SIGNAL_COLORS['No Risk (On Track)'] },
                  { label: 'Emerging', color: RISK_SIGNAL_COLORS['Emerging Risk (Needs Attention)'] },
                  { label: 'Critical', color: RISK_SIGNAL_COLORS['Critical Risk (Needs Close Attention)'] },
                  { label: 'Realized', color: RISK_SIGNAL_COLORS['Realized Risk (Needs Mitigation Strategy)'] },
                ].map(s => (
                  <span key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </motion.div>
          </section>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm p-10 text-center">
          <GitCompareArrows className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Select at least 2 units above to begin comparison.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">You can select up to {MAX_UNITS} units for side-by-side analysis.</p>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────── */

function QuickAction({ icon: Icon, label, onClick, disabled }: { icon: React.ElementType; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
        disabled
          ? 'opacity-40 cursor-not-allowed bg-muted/30 border-border/30 text-muted-foreground'
          : 'bg-muted/50 border-border hover:bg-muted text-foreground'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </motion.button>
  );
}

function MetricRow({ label, value, color, subtitle }: { label: string; value: string; color?: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-xs font-bold" style={{ color }}>{value}</span>
        {subtitle && <span className="text-[10px] text-muted-foreground ml-1">({subtitle})</span>}
      </div>
    </div>
  );
}

function RiskSignalBar({ label, unit, color }: { label: string; unit: UnitAggregation; color: string }) {
  const denom = unit.applicableItems || 1;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          {label}
        </span>
        <span className="text-xs text-muted-foreground">{unit.applicableItems} items</span>
      </div>
      <div className="h-5 rounded-full overflow-hidden flex">
        {unit.riskCounts.noRisk > 0 && <div style={{ width: `${(unit.riskCounts.noRisk / denom) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['No Risk (On Track)'] }} />}
        {unit.riskCounts.emerging > 0 && <div style={{ width: `${(unit.riskCounts.emerging / denom) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['Emerging Risk (Needs Attention)'] }} />}
        {unit.riskCounts.critical > 0 && <div style={{ width: `${(unit.riskCounts.critical / denom) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['Critical Risk (Needs Close Attention)'] }} />}
        {unit.riskCounts.realized > 0 && <div style={{ width: `${(unit.riskCounts.realized / denom) * 100}%`, backgroundColor: RISK_SIGNAL_COLORS['Realized Risk (Needs Mitigation Strategy)'] }} />}
      </div>
      <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
        <span>{unit.riskCounts.noRisk} no risk</span>
        <span>{unit.riskCounts.emerging} emerging</span>
        <span>{unit.riskCounts.critical} critical</span>
        <span>{unit.riskCounts.realized} realized</span>
      </div>
    </div>
  );
}
