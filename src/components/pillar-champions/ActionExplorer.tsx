/**
 * Section 3: Action Explorer — deduplicated hierarchy with budget per action step
 * Hierarchy: Pillar → Goal → Objective → Action Step → Unit breakdown
 */

import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getItemStatus, getItemCompletion, computeExpectedProgress } from '@/lib/intelligence';
import { mapItemToRiskSignal, RISK_SIGNAL_COLORS } from '@/lib/risk-signals';
import { isNotApplicableStatus } from '@/lib/types';
import { PILLAR_COLORS } from '@/lib/pillar-colors';
import { PILLAR_ABBREV } from '@/lib/pillar-labels';
import { getUnitDisplayName } from '@/lib/unit-config';
import { formatCurrency } from '@/lib/budget-data';
import { useBudgetData, type PillarBudgetLive } from '@/hooks/use-budget-data';
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

interface UnitEntry {
  unit: string;
  unitId: string;
  status: string;
  completion: number;
  riskSignal: string;
  riskColor: string;
  executionGap: number;
}

interface ActionStepNode {
  actionStep: string;
  units: UnitEntry[];
  /** Proportional budget allocation (pillar allocation / # of distinct action steps in pillar) */
  budgetAllocation: number;
  budgetCommitted: number;
  budgetSpent: number;
}

interface ObjectiveNode {
  objective: string;
  actionSteps: ActionStepNode[];
}

interface GoalNode {
  goal: string;
  pillar: PillarId;
  objectives: ObjectiveNode[];
  totalActionSteps: number;
  atRiskCount: number;
}

export default function ActionExplorer({ unitResults, viewType, term, academicYear, selectedPillar, selectedUnits }: Props) {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const { data: budgetResult } = useBudgetData();

  const expectedProgress = useMemo(() => computeExpectedProgress(viewType, academicYear), [viewType, academicYear]);

  // Count distinct action steps per pillar for proportional budget
  const pillarStepCounts = useMemo(() => {
    const counts: Record<string, Set<string>> = {};
    const filtered = unitResults.filter(u => selectedUnits.includes(u.unitId) && u.result);
    filtered.forEach(ur => {
      ur.result!.data.forEach(item => {
        const key = item.pillar;
        if (!counts[key]) counts[key] = new Set();
        counts[key].add(`${item.goal}||${item.objective}||${item.actionStep}`);
      });
    });
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(counts)) result[k] = v.size;
    return result;
  }, [unitResults, selectedUnits]);

  const goalNodes = useMemo(() => {
    const filtered = unitResults.filter(u => selectedUnits.includes(u.unitId) && u.result);

    // Step 1: Build a map keyed by pillar+goal+objective+actionStep → unit entries
    const stepMap = new Map<string, {
      pillar: PillarId; goal: string; objective: string; actionStep: string; units: UnitEntry[];
    }>();

    filtered.forEach(ur => {
      ur.result!.data.forEach(item => {
        if (selectedPillar !== 'all' && item.pillar !== selectedPillar) return;
        const status = getItemStatus(item, viewType, term, academicYear);
        const completion = getItemCompletion(item, viewType, term, academicYear);
        const completionValid = typeof completion === 'number' && completion >= 0 && completion <= 100;
        const signal = isNotApplicableStatus(status) ? 'Not Applicable' : mapItemToRiskSignal(status, completion, completionValid, expectedProgress);
        const gap = expectedProgress - completion;

        const stepKey = `${item.pillar}||${item.goal}||${item.objective}||${item.actionStep}`;
        if (!stepMap.has(stepKey)) {
          stepMap.set(stepKey, {
            pillar: item.pillar,
            goal: item.goal,
            objective: item.objective,
            actionStep: item.actionStep,
            units: [],
          });
        }
        stepMap.get(stepKey)!.units.push({
          unit: getUnitDisplayName(ur.unitId),
          unitId: ur.unitId,
          status,
          completion,
          riskSignal: signal,
          riskColor: RISK_SIGNAL_COLORS[signal as keyof typeof RISK_SIGNAL_COLORS] || '#9CA3AF',
          executionGap: parseFloat(gap.toFixed(1)),
        });
      });
    });

    // Step 2: Build goal → objective → actionStep hierarchy
    const goalMap = new Map<string, GoalNode>();

    for (const entry of stepMap.values()) {
      const goalKey = `${entry.pillar}-${entry.goal}`;
      if (!goalMap.has(goalKey)) {
        goalMap.set(goalKey, { goal: entry.goal, pillar: entry.pillar, objectives: [], totalActionSteps: 0, atRiskCount: 0 });
      }
      const goalNode = goalMap.get(goalKey)!;

      let objNode = goalNode.objectives.find(o => o.objective === entry.objective);
      if (!objNode) {
        objNode = { objective: entry.objective, actionSteps: [] };
        goalNode.objectives.push(objNode);
      }

      // Budget: proportional allocation
      const pillarBudget = budgetResult?.pillars?.[entry.pillar] as PillarBudgetLive | undefined;
      const stepCount = pillarStepCounts[entry.pillar] || 1;
      const budgetAllocation = pillarBudget ? pillarBudget.allocation / stepCount : 0;
      const budgetCommitted = pillarBudget ? pillarBudget.committed / stepCount : 0;
      const budgetSpent = pillarBudget ? pillarBudget.spent / stepCount : 0;

      objNode.actionSteps.push({
        actionStep: entry.actionStep,
        units: entry.units,
        budgetAllocation,
        budgetCommitted,
        budgetSpent,
      });

      goalNode.totalActionSteps++;
      goalNode.atRiskCount += entry.units.filter(u => u.riskSignal.includes('Critical') || u.riskSignal.includes('Realized')).length;
    }

    // Sort objectives and action steps within each goal
    for (const g of goalMap.values()) {
      g.objectives.sort((a, b) => a.objective.localeCompare(b.objective));
      g.objectives.forEach(o => o.actionSteps.sort((a, b) => a.actionStep.localeCompare(b.actionStep)));
    }

    return Array.from(goalMap.values()).sort((a, b) => {
      const pillarOrder = ['I', 'II', 'III', 'IV', 'V'];
      const pi = pillarOrder.indexOf(a.pillar) - pillarOrder.indexOf(b.pillar);
      if (pi !== 0) return pi;
      return a.goal.localeCompare(b.goal);
    });
  }, [unitResults, selectedUnits, selectedPillar, viewType, term, academicYear, expectedProgress, budgetResult, pillarStepCounts]);

  const filteredGoals = useMemo(() => {
    if (!searchTerm.trim()) return goalNodes;
    const q = searchTerm.toLowerCase();
    return goalNodes.filter(g =>
      g.goal.toLowerCase().includes(q) ||
      g.objectives.some(o =>
        o.objective.toLowerCase().includes(q) ||
        o.actionSteps.some(s => s.actionStep.toLowerCase().includes(q) || s.units.some(u => u.unit.toLowerCase().includes(q)))
      )
    );
  }, [goalNodes, searchTerm]);

  const toggle = (set: Set<string>, key: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const totalDistinctSteps = filteredGoals.reduce((s, g) => s + g.totalActionSteps, 0);
  const hasBudget = !!budgetResult?.pillars;

  return (
    <div className="space-y-4">
      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search goals, actions, units..."
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-full sm:w-80"
        />
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{filteredGoals.length} goals</span>
          <span>•</span>
          <span>{totalDistinctSteps} action steps</span>
          {hasBudget && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />Budget enabled</span>
            </>
          )}
        </div>
      </div>

      {/* Goal Accordion */}
      <div className="space-y-2">
        {filteredGoals.map(g => {
          const goalKey = `${g.pillar}-${g.goal}`;
          const isExpanded = expandedGoals.has(goalKey);

          return (
            <div key={goalKey} className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
              {/* Goal header */}
              <button onClick={() => toggle(expandedGoals, goalKey, setExpandedGoals)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
                <span className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: PILLAR_COLORS[g.pillar] }}>
                  {PILLAR_ABBREV[g.pillar]}
                </span>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{g.goal}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {g.objectives.length} action{g.objectives.length !== 1 ? 's' : ''} • {g.totalActionSteps} action step{g.totalActionSteps !== 1 ? 's' : ''} • {g.atRiskCount > 0 ? <span className="text-destructive font-semibold">{g.atRiskCount} at risk</span> : 'No risk alerts'}
                  </p>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="border-t border-border/40 divide-y divide-border/30">
                      {g.objectives.map(obj => {
                        const objKey = `${goalKey}||${obj.objective}`;
                        const objExpanded = expandedObjectives.has(objKey);

                        return (
                          <div key={objKey}>
                            {/* Objective header */}
                            <button onClick={() => toggle(expandedObjectives, objKey, setExpandedObjectives)} className="w-full flex items-center gap-2 px-6 py-2.5 text-left hover:bg-muted/20 transition-colors">
                              {objExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{obj.objective}</p>
                                <p className="text-[10px] text-muted-foreground">{obj.actionSteps.length} action step{obj.actionSteps.length !== 1 ? 's' : ''}</p>
                              </div>
                            </button>

                            <AnimatePresence>
                              {objExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
                                  <div className="pl-8 pr-4 pb-3 space-y-2">
                                    {obj.actionSteps.map((step, si) => {
                                      const stepKey = `${objKey}||${step.actionStep}||${si}`;
                                      const stepExpanded = expandedSteps.has(stepKey);
                                      const multiUnit = step.units.length > 1;

                                      // Aggregate: worst risk across units for this step
                                      const worstRisk = step.units.reduce((worst, u) => {
                                        const order = ['Not Applicable', 'No Risk (On Track)', 'Emerging Risk (Needs Attention)', 'Critical Risk (Needs Close Attention)', 'Realized Risk (Needs Mitigation Strategy)'];
                                        return order.indexOf(u.riskSignal) > order.indexOf(worst.riskSignal) ? u : worst;
                                      }, step.units[0]);

                                      const avgCompletion = step.units.filter(u => !isNotApplicableStatus(u.status)).length > 0
                                        ? Math.round(step.units.filter(u => !isNotApplicableStatus(u.status)).reduce((s, u) => s + u.completion, 0) / step.units.filter(u => !isNotApplicableStatus(u.status)).length)
                                        : 0;

                                      return (
                                        <div key={stepKey} className="rounded-lg border border-border/40 bg-muted/10 overflow-hidden">
                                          {/* Action Step header */}
                                          <button
                                            onClick={() => multiUnit && toggle(expandedSteps, stepKey, setExpandedSteps)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-left ${multiUnit ? 'hover:bg-muted/20 cursor-pointer' : 'cursor-default'} transition-colors`}
                                          >
                                            {multiUnit ? (
                                              stepExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                            ) : (
                                              <span className="w-3 shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0 flex items-center gap-3">
                                              <p className="text-xs text-foreground truncate flex-1">{step.actionStep}</p>
                                              <div className="flex items-center gap-2 shrink-0">
                                                {/* Budget mini-tag */}
                                                {hasBudget && step.budgetAllocation > 0 && (
                                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium whitespace-nowrap">
                                                    {formatCurrency(step.budgetAllocation)}
                                                  </span>
                                                )}
                                                {!multiUnit && <StatusBadge status={step.units[0]?.status || ''} />}
                                                {!multiUnit && !isNotApplicableStatus(step.units[0]?.status) && (
                                                  <span className="text-[10px] font-semibold text-foreground">{step.units[0]?.completion}%</span>
                                                )}
                                                <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: worstRisk?.riskColor || '#9CA3AF' }} title={worstRisk?.riskSignal} />
                                                {multiUnit && <span className="text-[9px] text-muted-foreground whitespace-nowrap">{step.units.length} units</span>}
                                              </div>
                                            </div>
                                          </button>

                                          {/* Budget detail row */}
                                          {hasBudget && step.budgetAllocation > 0 && (stepExpanded || !multiUnit) && (
                                            <div className="px-3 pb-1.5 flex gap-3 text-[9px] text-muted-foreground">
                                              <span>Allocated: <span className="text-foreground font-medium">{formatCurrency(step.budgetAllocation)}</span></span>
                                              <span>Committed: <span className="text-foreground font-medium">{formatCurrency(step.budgetCommitted)}</span></span>
                                              <span>Spent: <span className="text-foreground font-medium">{formatCurrency(step.budgetSpent)}</span></span>
                                            </div>
                                          )}

                                          {/* Unit breakdown table (for multi-unit steps) */}
                                          <AnimatePresence>
                                            {multiUnit && stepExpanded && (
                                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
                                                <div className="border-t border-border/30 overflow-x-auto">
                                                  <table className="w-full text-xs">
                                                    <thead>
                                                      <tr className="bg-muted/20">
                                                        <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Unit</th>
                                                        <th className="text-center px-3 py-1.5 font-semibold text-muted-foreground">Status</th>
                                                        <th className="text-center px-3 py-1.5 font-semibold text-muted-foreground">Completion</th>
                                                        <th className="text-center px-3 py-1.5 font-semibold text-muted-foreground">Gap</th>
                                                        <th className="text-center px-3 py-1.5 font-semibold text-muted-foreground">Risk</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {step.units.map((u, ui) => (
                                                        <tr key={ui} className="border-t border-border/20 hover:bg-muted/10">
                                                          <td className="px-3 py-2 text-foreground whitespace-nowrap">{u.unit}</td>
                                                          <td className="px-3 py-2 text-center"><StatusBadge status={u.status} /></td>
                                                          <td className="px-3 py-2 text-center font-semibold text-foreground">{isNotApplicableStatus(u.status) ? '—' : `${u.completion}%`}</td>
                                                          <td className="px-3 py-2 text-center">
                                                            {isNotApplicableStatus(u.status) ? '—' : (
                                                              <span className="font-semibold" style={{ color: u.executionGap <= 0 ? '#16A34A' : u.executionGap > 20 ? '#DC2626' : '#D97706' }}>
                                                                {u.executionGap <= 0 ? '' : '+'}{u.executionGap}%
                                                              </span>
                                                            )}
                                                          </td>
                                                          <td className="px-3 py-2 text-center">
                                                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.riskColor }} title={u.riskSignal} />
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>

                                          {/* Single-unit: show unit name inline */}
                                          {!multiUnit && step.units[0] && (
                                            <div className="px-3 pb-1.5 text-[9px] text-muted-foreground">
                                              Unit: <span className="text-foreground">{step.units[0].unit}</span>
                                              {!isNotApplicableStatus(step.units[0].status) && (
                                                <span className="ml-2">
                                                  Gap: <span className="font-semibold" style={{ color: step.units[0].executionGap <= 0 ? '#16A34A' : step.units[0].executionGap > 20 ? '#DC2626' : '#D97706' }}>
                                                    {step.units[0].executionGap <= 0 ? '' : '+'}{step.units[0].executionGap}%
                                                  </span>
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filteredGoals.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">No action items match the current filters.</div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    'Completed – On Target': { bg: '#16A34A20', text: '#16A34A', label: 'On Target' },
    'Completed – Below Target': { bg: '#7F1D1D20', text: '#7F1D1D', label: 'Below Target' },
    'In Progress': { bg: '#E6A23C20', text: '#E6A23C', label: 'In Progress' },
    'Not Started': { bg: '#94A3B820', text: '#64748B', label: 'Not Started' },
  };
  const c = config[status] || { bg: '#9CA3AF20', text: '#9CA3AF', label: 'N/A' };
  return <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{ backgroundColor: c.bg, color: c.text }}>{c.label}</span>;
}
