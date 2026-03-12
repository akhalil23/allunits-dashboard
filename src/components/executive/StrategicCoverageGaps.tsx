/**
 * Strategic Coverage Gaps Panel
 * Reveals SP action items marked Not Started or Not Applicable across units.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, AlertTriangle, Info, ArrowUpDown, Filter } from 'lucide-react';
import { InfoTip } from '@/components/ui/info-tip';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { getItemStatus } from '@/lib/intelligence';
import { isNotApplicableStatus } from '@/lib/types';
import { getUnitDisplayName } from '@/lib/unit-config';
import { PILLAR_FULL } from '@/lib/pillar-labels';
import type { PillarId, ActionItem } from '@/lib/types';
import type { UnitFetchResult } from '@/lib/university-aggregation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StepDetail {
  actionStep: string;
  pillar: PillarId;
  goal: string;
  nsUnits: string[];
  naUnits: string[];
  totalUnits: number;
  anyStarted: boolean;
}

interface GoalGroup {
  goal: string;
  steps: StepDetail[];
  nsTotal: number;
  naTotal: number;
}

interface PillarGroup {
  pillar: PillarId;
  goals: GoalGroup[];
  nsTotal: number;
  naTotal: number;
}

type SortKey = 'ns' | 'na' | 'pct';
type FilterMode = 'all' | 'university-ns' | 'majority-na';

// ─── Component ───────────────────────────────────────────────────────────────

export default function StrategicCoverageGaps() {
  const { viewType, academicYear, term } = useDashboard();
  const { data: unitResults } = useUniversityData();

  const [sortKey, setSortKey] = useState<SortKey>('ns');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showAccordion, setShowAccordion] = useState(false);

  const analysis = useMemo(() => {
    if (!unitResults) return null;
    return computeCoverageGaps(unitResults, viewType, term, academicYear);
  }, [unitResults, viewType, term, academicYear]);

  const pillarGroups = analysis?.pillarGroups ?? [];
  const totalNS = analysis?.totalNS ?? 0;
  const totalNA = analysis?.totalNA ?? 0;
  const universityWideNS = analysis?.universityWideNS ?? 0;
  const majorityNA = analysis?.majorityNA ?? 0;

  // Apply filter
  const filteredGroups = useMemo(() => {
    if (filterMode === 'all') return pillarGroups;
    return pillarGroups.map(pg => ({
      ...pg,
      goals: pg.goals.map(g => ({
        ...g,
        steps: g.steps.filter(s => {
          if (filterMode === 'university-ns') return s.nsUnits.length === s.totalUnits && s.nsUnits.length > 0;
          if (filterMode === 'majority-na') return s.naUnits.length >= s.totalUnits * 0.75 && s.naUnits.length > 0;
          return true;
        }),
      })).filter(g => g.steps.length > 0),
    })).filter(pg => pg.goals.length > 0);
  }, [pillarGroups, filterMode]);

  // Apply sort to steps within each goal
  const sortedGroups = useMemo(() => {
    return filteredGroups.map(pg => ({
      ...pg,
      goals: pg.goals.map(g => ({
        ...g,
        steps: [...g.steps].sort((a, b) => {
          if (sortKey === 'ns') return b.nsUnits.length - a.nsUnits.length;
          if (sortKey === 'na') return b.naUnits.length - a.naUnits.length;
          const pctA = ((a.nsUnits.length + a.naUnits.length) / a.totalUnits) * 100;
          const pctB = ((b.nsUnits.length + b.naUnits.length) / b.totalUnits) * 100;
          return pctB - pctA;
        }),
      })),
    }));
  }, [filteredGroups, sortKey]);

  const toggleSet = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  const highAttention = universityWideNS + majorityNA;

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Strategic Coverage Gaps
        </h3>
        <p className="text-xs text-muted-foreground">
          Items with no active implementation or deemed non-applicable across units
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total Not Started Items"
          value={totalNS}
          accent="amber"
          delay={0}
        />
        <KpiCard
          label="Total Not Applicable Items"
          value={totalNA}
          accent="grey"
          delay={0.05}
        />
        <KpiCard
          label="University-Wide Not Started"
          value={universityWideNS}
          accent="red"
          delay={0.1}
          tooltip="Items marked Not Started by ALL units — no activity anywhere"
        />
        <KpiCard
          label="Majority Not Applicable"
          value={majorityNA}
          accent="grey"
          delay={0.15}
          tooltip="Items marked Not Applicable by ≥ 75% of units"
          badge={highAttention > 0 ? `${highAttention} High Attention` : undefined}
        />
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          This panel highlights Strategic Plan items with no active implementation or deemed non-applicable across units. It supports identification of ownership gaps, misalignment, or priorities requiring reassessment.
        </p>
      </div>

      {/* Controls + Accordion Toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowAccordion(!showAccordion)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border/60 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAccordion ? 'rotate-90' : ''}`} />
          {showAccordion ? 'Hide' : 'Show'} Detailed Breakdown
        </button>

        {showAccordion && (
          <>
            <div className="flex items-center gap-1 ml-auto">
              <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground mr-1">Sort:</span>
              {(['ns', 'na', 'pct'] as SortKey[]).map(k => (
                <button
                  key={k}
                  onClick={() => setSortKey(k)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    sortKey === k
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {k === 'ns' ? 'NS Count' : k === 'na' ? 'NA Count' : '% Affected'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground mr-1">Filter:</span>
              {([
                ['all', 'All'],
                ['university-ns', 'University-Wide NS'],
                ['majority-na', 'Majority NA'],
              ] as [FilterMode, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilterMode(key)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    filterMode === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Accordion */}
      <AnimatePresence>
        {showAccordion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {sortedGroups.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No items match the current filter.</p>
            )}
            {sortedGroups.map(pg => {
              const pKey = pg.pillar;
              const pOpen = expandedPillars.has(pKey);
              return (
                <div key={pKey} className="rounded-xl border border-border/60 bg-card overflow-hidden">
                  <button
                    onClick={() => toggleSet(expandedPillars, pKey, setExpandedPillars)}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${pOpen ? 'rotate-90' : ''}`} />
                    <span className="text-sm font-semibold text-foreground flex-1">{PILLAR_FULL[pg.pillar]}</span>
                    <span className="text-xs font-medium text-amber-500">NS: {pg.nsTotal}</span>
                    <span className="text-xs font-medium text-muted-foreground ml-2">NA: {pg.naTotal}</span>
                  </button>

                  <AnimatePresence>
                    {pOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        {pg.goals.map(goal => {
                          const gKey = `${pKey}-${goal.goal}`;
                          const gOpen = expandedGoals.has(gKey);
                          return (
                            <div key={gKey} className="border-t border-border/40">
                              <button
                                onClick={() => toggleSet(expandedGoals, gKey, setExpandedGoals)}
                                className="w-full flex items-center gap-2 px-6 py-2.5 hover:bg-muted/20 transition-colors text-left"
                              >
                                <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${gOpen ? 'rotate-90' : ''}`} />
                                <span className="text-xs font-semibold text-foreground flex-1">{goal.goal}</span>
                                <span className="text-xs text-amber-500">NS: {goal.nsTotal}</span>
                                <span className="text-xs text-muted-foreground ml-2">NA: {goal.naTotal}</span>
                              </button>

                              <AnimatePresence>
                                {gOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    {goal.steps.map((step, si) => {
                                      const sKey = `${gKey}-${si}`;
                                      const sOpen = expandedSteps.has(sKey);
                                      const pctAffected = ((step.nsUnits.length + step.naUnits.length) / step.totalUnits * 100).toFixed(0);
                                      return (
                                        <div key={sKey} className="border-t border-border/20">
                                          <button
                                            onClick={() => toggleSet(expandedSteps, sKey, setExpandedSteps)}
                                            className="w-full flex items-center gap-2 px-8 py-2 hover:bg-muted/10 transition-colors text-left"
                                          >
                                            <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${sOpen ? 'rotate-90' : ''}`} />
                                            <span className="text-xs text-foreground flex-1 truncate">{step.actionStep}</span>
                                            <span className="text-xs font-medium text-amber-500 shrink-0">NS: {step.nsUnits.length}</span>
                                            <span className="text-xs font-medium text-muted-foreground shrink-0 ml-1">NA: {step.naUnits.length}</span>
                                          </button>

                                          <AnimatePresence>
                                            {sOpen && (
                                              <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="px-8 pb-3 overflow-hidden"
                                              >
                                                <div className="rounded-lg border border-border/40 bg-muted/20 overflow-hidden">
                                                  {/* Badges */}
                                                  <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-border/30">
                                                    <span className="text-xs text-muted-foreground">{pctAffected}% of units affected</span>
                                                    {!step.anyStarted && (
                                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-xs font-semibold">
                                                        <AlertTriangle className="w-3 h-3" /> No Active Implementation
                                                      </span>
                                                    )}
                                                    {step.naUnits.length >= step.totalUnits * 0.75 && step.naUnits.length > 0 && (
                                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold border border-border/40">
                                                        <AlertTriangle className="w-3 h-3" /> Requires Applicability Review
                                                      </span>
                                                    )}
                                                  </div>
                                                  {/* Detail table */}
                                                  <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                      <thead>
                                                        <tr className="border-b border-border/30">
                                                          <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Status</th>
                                                          <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Units</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody>
                                                        {step.nsUnits.length > 0 && (
                                                          <tr className="border-b border-border/20">
                                                            <td className="px-3 py-1.5 font-medium text-amber-500 whitespace-nowrap">Not Started</td>
                                                            <td className="px-3 py-1.5 text-foreground">
                                                              <div className="flex flex-wrap gap-1">
                                                                {step.nsUnits.map(u => (
                                                                  <span key={u} className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-xs">{getUnitDisplayName(u)}</span>
                                                                ))}
                                                              </div>
                                                            </td>
                                                          </tr>
                                                        )}
                                                        {step.naUnits.length > 0 && (
                                                          <tr>
                                                            <td className="px-3 py-1.5 font-medium text-muted-foreground whitespace-nowrap">Not Applicable</td>
                                                            <td className="px-3 py-1.5 text-foreground">
                                                              <div className="flex flex-wrap gap-1">
                                                                {step.naUnits.map(u => (
                                                                  <span key={u} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs">{getUnitDisplayName(u)}</span>
                                                                ))}
                                                              </div>
                                                            </td>
                                                          </tr>
                                                        )}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                </div>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, accent, delay, tooltip, badge }: {
  label: string;
  value: number;
  accent: 'amber' | 'grey' | 'red';
  delay: number;
  tooltip?: string;
  badge?: string;
}) {
  const accentStyles = {
    amber: 'from-amber-500/20 to-transparent border-amber-500/30',
    grey: 'from-muted/40 to-transparent border-border/60',
    red: 'from-destructive/15 to-transparent border-destructive/30',
  };
  const valueColors = {
    amber: 'text-amber-500',
    grey: 'text-foreground',
    red: 'text-destructive',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`relative rounded-xl border bg-gradient-to-b p-4 ${accentStyles[accent]}`}
    >
      <div className="min-h-[32px] flex items-start">
        <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider leading-tight">
          {label}
          {tooltip && <InfoTip text={tooltip} />}
        </span>
      </div>
      <p className={`text-xl sm:text-2xl font-bold mt-1 ${valueColors[accent]}`}>{value}</p>
      {badge && (
        <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold">
          <AlertTriangle className="w-3 h-3" /> {badge}
        </span>
      )}
    </motion.div>
  );
}

// ─── Computation ─────────────────────────────────────────────────────────────

function computeCoverageGaps(
  unitResults: UnitFetchResult[],
  viewType: 'cumulative' | 'yearly',
  term: 'mid' | 'end',
  academicYear: '2025-2026' | '2026-2027'
) {
  const loadedUnits = unitResults.filter(u => u.result && !u.error);
  const totalLoadedUnits = loadedUnits.length;

  // Build a map: actionStep → { pillar, goal, unitStatuses }
  const stepMap = new Map<string, {
    actionStep: string;
    pillar: PillarId;
    goal: string;
    nsUnits: string[];
    naUnits: string[];
    startedUnits: string[];
  }>();

  loadedUnits.forEach(ur => {
    ur.result!.data.forEach(item => {
      const status = getItemStatus(item, viewType, term, academicYear);
      const key = `${item.pillar}|${item.goal}|${item.actionStep}`;

      if (!stepMap.has(key)) {
        stepMap.set(key, {
          actionStep: item.actionStep,
          pillar: item.pillar,
          goal: item.goal,
          nsUnits: [],
          naUnits: [],
          startedUnits: [],
        });
      }

      const entry = stepMap.get(key)!;
      if (status === 'Not Started') {
        entry.nsUnits.push(ur.unitId);
      } else if (isNotApplicableStatus(status)) {
        entry.naUnits.push(ur.unitId);
      } else {
        entry.startedUnits.push(ur.unitId);
      }
    });
  });

  // Filter to only steps with NS or NA
  const relevantSteps: StepDetail[] = [];
  let totalNS = 0;
  let totalNA = 0;
  let universityWideNS = 0;
  let majorityNA = 0;

  stepMap.forEach(entry => {
    if (entry.nsUnits.length === 0 && entry.naUnits.length === 0) return;

    totalNS += entry.nsUnits.length;
    totalNA += entry.naUnits.length;

    const totalUnitsForStep = entry.nsUnits.length + entry.naUnits.length + entry.startedUnits.length;

    if (entry.nsUnits.length === totalUnitsForStep && entry.nsUnits.length > 0 && entry.startedUnits.length === 0) {
      universityWideNS++;
    }
    if (entry.naUnits.length >= totalUnitsForStep * 0.75 && entry.naUnits.length > 0) {
      majorityNA++;
    }

    relevantSteps.push({
      actionStep: entry.actionStep,
      pillar: entry.pillar,
      goal: entry.goal,
      nsUnits: entry.nsUnits,
      naUnits: entry.naUnits,
      totalUnits: totalUnitsForStep,
      anyStarted: entry.startedUnits.length > 0,
    });
  });

  // Group by pillar → goal
  const pillarMap = new Map<PillarId, Map<string, StepDetail[]>>();
  relevantSteps.forEach(step => {
    if (!pillarMap.has(step.pillar)) pillarMap.set(step.pillar, new Map());
    const goalMap = pillarMap.get(step.pillar)!;
    if (!goalMap.has(step.goal)) goalMap.set(step.goal, []);
    goalMap.get(step.goal)!.push(step);
  });

  const pillarOrder: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];
  const pillarGroups: PillarGroup[] = pillarOrder
    .filter(p => pillarMap.has(p))
    .map(p => {
      const goalMap = pillarMap.get(p)!;
      const goals: GoalGroup[] = Array.from(goalMap.entries()).map(([goal, steps]) => ({
        goal,
        steps,
        nsTotal: steps.reduce((s, st) => s + st.nsUnits.length, 0),
        naTotal: steps.reduce((s, st) => s + st.naUnits.length, 0),
      }));
      return {
        pillar: p,
        goals,
        nsTotal: goals.reduce((s, g) => s + g.nsTotal, 0),
        naTotal: goals.reduce((s, g) => s + g.naTotal, 0),
      };
    });

  return { pillarGroups, totalNS, totalNA, universityWideNS, majorityNA, totalLoadedUnits };
}
