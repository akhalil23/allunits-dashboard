/**
 * Section 3: Action Explorer — detailed goal/action/step breakdown
 */

import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getItemStatus, getItemCompletion, computeExpectedProgress } from '@/lib/intelligence';
import { mapItemToRiskSignal, RISK_SIGNAL_COLORS } from '@/lib/risk-signals';
import { isNotApplicableStatus } from '@/lib/types';
import { PILLAR_COLORS } from '@/lib/pillar-colors';
import { PILLAR_ABBREV } from '@/lib/pillar-labels';
import { getUnitDisplayName } from '@/lib/unit-config';
import type { UnitFetchResult } from '@/lib/university-aggregation';
import type { PillarId, ViewType, Term, AcademicYear, ActionItem } from '@/lib/types';

interface Props {
  unitResults: UnitFetchResult[];
  viewType: ViewType;
  term: Term;
  academicYear: AcademicYear;
  selectedPillar: 'all' | PillarId;
  selectedUnits: string[];
}

interface GoalGroup {
  goal: string;
  pillar: PillarId;
  actions: {
    objective: string;
    actionStep: string;
    unit: string;
    unitId: string;
    status: string;
    completion: number;
    riskSignal: string;
    riskColor: string;
    executionGap: number;
  }[];
}

export default function ActionExplorer({ unitResults, viewType, term, academicYear, selectedPillar, selectedUnits }: Props) {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const expectedProgress = useMemo(() => computeExpectedProgress(viewType, academicYear), [viewType, academicYear]);

  const goalGroups = useMemo(() => {
    const filtered = unitResults.filter(u => selectedUnits.includes(u.unitId) && u.result);
    const groups = new Map<string, GoalGroup>();

    filtered.forEach(ur => {
      ur.result!.data.forEach(item => {
        if (selectedPillar !== 'all' && item.pillar !== selectedPillar) return;
        const status = getItemStatus(item, viewType, term, academicYear);
        const completion = getItemCompletion(item, viewType, term, academicYear);
        const completionValid = typeof completion === 'number' && completion >= 0 && completion <= 100;
        const signal = isNotApplicableStatus(status) ? 'Not Applicable' : mapItemToRiskSignal(status, completion, completionValid, expectedProgress);
        const gap = expectedProgress - completion;

        const key = `${item.pillar}-${item.goal}`;
        if (!groups.has(key)) {
          groups.set(key, { goal: item.goal, pillar: item.pillar, actions: [] });
        }
        groups.get(key)!.actions.push({
          objective: item.objective,
          actionStep: item.actionStep,
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

    return Array.from(groups.values()).sort((a, b) => {
      const pillarOrder = ['I', 'II', 'III', 'IV', 'V'];
      const pi = pillarOrder.indexOf(a.pillar) - pillarOrder.indexOf(b.pillar);
      if (pi !== 0) return pi;
      return a.goal.localeCompare(b.goal);
    });
  }, [unitResults, selectedUnits, selectedPillar, viewType, term, academicYear, expectedProgress]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return goalGroups;
    const q = searchTerm.toLowerCase();
    return goalGroups.filter(g =>
      g.goal.toLowerCase().includes(q) ||
      g.actions.some(a => a.actionStep.toLowerCase().includes(q) || a.unit.toLowerCase().includes(q) || a.objective.toLowerCase().includes(q))
    );
  }, [goalGroups, searchTerm]);

  const toggleGoal = (key: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalActions = filteredGroups.reduce((s, g) => s + g.actions.length, 0);

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
          <span>{filteredGroups.length} goals</span>
          <span>•</span>
          <span>{totalActions} action steps</span>
        </div>
      </div>

      {/* Goal Accordion */}
      <div className="space-y-2">
        {filteredGroups.map(g => {
          const key = `${g.pillar}-${g.goal}`;
          const isExpanded = expandedGoals.has(key);
          const atRiskCount = g.actions.filter(a => a.riskSignal.includes('Critical') || a.riskSignal.includes('Realized')).length;

          return (
            <div key={key} className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
              <button onClick={() => toggleGoal(key)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
                <span className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: PILLAR_COLORS[g.pillar] }}>
                  {PILLAR_ABBREV[g.pillar]}
                </span>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{g.goal}</p>
                  <p className="text-[10px] text-muted-foreground">{g.actions.length} action steps • {atRiskCount > 0 ? <span className="text-destructive font-semibold">{atRiskCount} at risk</span> : 'No risk alerts'}</p>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="border-t border-border/40">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/20">
                              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Action Step</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Unit</th>
                              <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Status</th>
                              <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Completion</th>
                              <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Gap</th>
                              <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Risk</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.actions.map((a, i) => (
                              <tr key={i} className="border-t border-border/20 hover:bg-muted/10">
                                <td className="px-4 py-2.5 max-w-[300px]">
                                  <p className="text-foreground truncate">{a.actionStep}</p>
                                  {a.objective && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{a.objective}</p>}
                                </td>
                                <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{a.unit}</td>
                                <td className="px-3 py-2.5 text-center">
                                  <StatusBadge status={a.status} />
                                </td>
                                <td className="px-3 py-2.5 text-center font-semibold text-foreground">{isNotApplicableStatus(a.status) ? '—' : `${a.completion}%`}</td>
                                <td className="px-3 py-2.5 text-center">
                                  {isNotApplicableStatus(a.status) ? '—' : (
                                    <span className="font-semibold" style={{ color: a.executionGap <= 0 ? '#16A34A' : a.executionGap > 20 ? '#DC2626' : '#D97706' }}>
                                      {a.executionGap <= 0 ? '' : '+'}{a.executionGap}%
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.riskColor }} title={a.riskSignal} />
                                </td>
                              </tr>
                            ))}
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

        {filteredGroups.length === 0 && (
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
