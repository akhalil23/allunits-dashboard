/**
 * Items Requiring Immediate Attention — Coverage Analysis
 * Premium hybrid panel: 2×2 summary grid + single expandable detail panel.
 * 3-level hierarchy: Goal → Action → Action Step
 * Forward-fills blank Goal/Action cells from source sheets.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { isNotApplicableStatus, getTermWindowKey } from '@/lib/types';
import { getUnitDisplayName, UNIT_IDS } from '@/lib/unit-config';
import { PILLAR_FULL } from '@/lib/pillar-labels';
import { buildSourceRowKey, normalizeHierarchyGroupKey, normalizeHierarchyText } from '@/lib/strategic-item-keys';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { PillarId, ActionItem, ViewType, Term, AcademicYear } from '@/lib/types';
import type { UnitFetchResult } from '@/lib/university-aggregation';

// ─── Types ───────────────────────────────────────────────────────────────────

type CategoryKey = 'majority-ns' | 'absolute-ns' | 'majority-na' | 'absolute-na';

interface StepItem {
  sourceKey: string;
  sheetRow: number;
  actionStep: string;
  pillar: PillarId;
  goal: string;
  action: string;
  nsUnits: string[];
  naUnits: string[];
  totalUnits: number;
}

interface ActionGroup {
  action: string;
  firstRow: number;
  steps: StepItem[];
}

interface GoalGroup {
  goal: string;
  firstRow: number;
  actions: ActionGroup[];
}

interface PillarGroup {
  pillar: PillarId;
  goals: GoalGroup[];
}

interface CategoryData {
  key: CategoryKey;
  title: string;
  definition: string;
  count: number;
  accent: 'ns' | 'na';
  items: StepItem[];
}

interface CoverageAggregateEntry {
  sourceKey: string;
  sheetRow: number;
  actionStep: string;
  pillar: PillarId;
  goal: string;
  action: string;
  aliases: Set<string>;
  statusByUnit: Map<string, CoverageUnitStatus>;
}

type CoverageUnitClassification = 'na' | 'non-na' | 'blank';

interface CoverageUnitStatus {
  classification: CoverageUnitClassification;
  status: string;
}

interface CoverageAliasKey {
  key: string;
  rank: number;
}

interface CoverageDebugRow {
  itemKey: string;
  totalUnits: number;
  matchedUnitsCount: number;
  naCount: number;
  nonNaCount: number;
  blankCount: number;
  missingCount: number;
  included: boolean;
  exclusionReason: string;
}

const VALID_STATUSES = new Set([
  'Not Applicable',
  'Not Started',
  'In Progress',
  'Completed – On Target',
  'Completed – Below Target',
]);

// ─── Forward-fill logic ─────────────────────────────────────────────────────

/**
 * For a single unit's items within one pillar, sorted by sheetRow,
 * forward-fill blank goal and objective (action) cells.
 */
function forwardFill(items: ActionItem[]): { goal: string; action: string; actionStep: string; pillar: PillarId; item: ActionItem }[] {
  // Sort by sheetRow to preserve sheet order
  const sorted = [...items].sort((a, b) => a.sheetRow - b.sheetRow);

  let lastGoal = '';
  let lastAction = '';

  return sorted.map(item => {
    const rawGoal = normalizeHierarchyText(item.goal);
    const rawAction = normalizeHierarchyText(item.objective);
    const rawStep = normalizeHierarchyText(item.actionStep);

    if (rawGoal) lastGoal = rawGoal;
    if (rawAction) lastAction = rawAction;

    return {
      goal: lastGoal,
      action: lastAction,
      actionStep: rawStep,
      pillar: item.pillar,
      item,
    };
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StrategicCoverageGaps() {
  const { viewType, academicYear, term } = useDashboard();
  const { data: unitResults } = useUniversityData();
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  const categories = useMemo(() => {
    if (!unitResults) return null;
    return computeCategories(unitResults, viewType, term, academicYear);
  }, [unitResults, viewType, term, academicYear]);

  // Auto-scroll detail panel into view on mobile
  useEffect(() => {
    if (activeCategory && detailRef.current && window.innerWidth < 768) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    }
  }, [activeCategory]);

  // Reset expanded state when switching category
  useEffect(() => {
    setExpandedPillars(new Set());
    setExpandedGoals(new Set());
    setExpandedActions(new Set());
  }, [activeCategory]);

  if (!categories) return null;

  const activeData = activeCategory ? categories.find(c => c.key === activeCategory) : null;
  const grouped = activeData ? groupByPillar(activeData.items) : [];

  const handleCardClick = (key: CategoryKey) => {
    setActiveCategory(prev => prev === key ? null : key);
  };

  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  /** Count all action steps in a goal group */
  const goalStepCount = (g: GoalGroup) => g.actions.reduce((s, a) => s + a.steps.length, 0);

  return (
    <section className="space-y-5">
      {/* Title */}
      <div>
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Items Requiring Immediate Attention
        </h3>
        <p className="text-xs text-muted-foreground">
          Cross-unit strategic items with critical coverage gaps
        </p>
      </div>

      {/* Level 1: Summary Grid 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat, i) => (
          <ExceptionCard
            key={cat.key}
            category={cat}
            isActive={activeCategory === cat.key}
            onClick={() => handleCardClick(cat.key)}
            delay={i * 0.05}
          />
        ))}
      </div>

      {/* Detail Panel */}
      <div ref={detailRef}>
        <AnimatePresence mode="wait">
          {activeCategory === null ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-border/40 bg-card/50 py-10 text-center"
            >
              <p className="text-xs text-muted-foreground">Select a category above to view details</p>
            </motion.div>
          ) : activeData && activeData.items.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-border/40 bg-card/50 py-10 text-center"
            >
              <p className="text-xs text-muted-foreground">No items in this category</p>
            </motion.div>
          ) : activeData ? (
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden"
            >
              {/* Detail header */}
              <div className="px-5 py-4 border-b border-border/40">
                <h4 className="text-sm font-semibold text-foreground">{activeData.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{activeData.count} action step{activeData.count !== 1 ? 's' : ''} · {activeData.definition}</p>
              </div>

              {/* Pillar → Goal → Action → Step hierarchy */}
              <div className="divide-y divide-border/30">
                {grouped.map(pg => {
                  const pKey = pg.pillar;
                  const pOpen = expandedPillars.has(pKey);
                  const pillarStepCount = pg.goals.reduce((s, g) => s + goalStepCount(g), 0);

                  return (
                    <div key={pKey}>
                      {/* ── Pillar row ── */}
                      <button
                        onClick={() => toggle(expandedPillars, pKey, setExpandedPillars)}
                        className="w-full flex items-center gap-2.5 px-5 py-3.5 hover:bg-muted/20 transition-colors text-left"
                      >
                        <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${pOpen ? 'rotate-90' : ''}`} />
                        <span className="text-xs sm:text-sm font-semibold text-foreground flex-1">{PILLAR_FULL[pg.pillar]}</span>
                        <span className="text-xs text-muted-foreground">{pillarStepCount} items</span>
                      </button>

                      <AnimatePresence>
                        {pOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            {pg.goals.map(goal => {
                              const gKey = `${pKey}::${goal.goal}`;
                              const gOpen = expandedGoals.has(gKey);

                              return (
                                <div key={gKey} className="border-t border-border/20">
                                  {/* ── Goal row ── */}
                                  <button
                                    onClick={() => toggle(expandedGoals, gKey, setExpandedGoals)}
                                    className="w-full flex items-center gap-2 pl-9 pr-5 py-2.5 hover:bg-muted/10 transition-colors text-left"
                                  >
                                    <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${gOpen ? 'rotate-90' : ''}`} />
                                    <span className="text-xs font-semibold text-foreground flex-1">{goal.goal}</span>
                                    <span className="text-xs text-muted-foreground">{goalStepCount(goal)}</span>
                                  </button>

                                  <AnimatePresence>
                                    {gOpen && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        {goal.actions.map(act => {
                                          const aKey = `${gKey}::${act.action}`;
                                          const aOpen = expandedActions.has(aKey);

                                          return (
                                            <div key={aKey} className="border-t border-border/10">
                                              {/* ── Action row ── */}
                                              <button
                                                onClick={() => toggle(expandedActions, aKey, setExpandedActions)}
                                                className="w-full flex items-center gap-2 pl-14 pr-5 py-2 hover:bg-muted/5 transition-colors text-left"
                                              >
                                                <ChevronRight className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform duration-200 ${aOpen ? 'rotate-90' : ''}`} />
                                                <span className="text-xs font-medium text-foreground/80 flex-1">{act.action}</span>
                                                <span className="text-[11px] text-muted-foreground">{act.steps.length}</span>
                                              </button>

                                              <AnimatePresence>
                                                {aOpen && (
                                                  <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                  >
                                                    {act.steps.map((step, si) => (
                                                      <StepRow
                                                        key={si}
                                                        step={step}
                                                        categoryKey={activeCategory!}
                                                      />
                                                    ))}
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
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ─── Exception Card ──────────────────────────────────────────────────────────

function ExceptionCard({ category, isActive, onClick, delay }: {
  category: CategoryData;
  isActive: boolean;
  onClick: () => void;
  delay: number;
}) {
  const isNS = category.accent === 'ns';

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={`
        relative text-left rounded-2xl border p-4 sm:p-5 transition-all duration-200
        ${isActive
          ? isNS
            ? 'border-amber-500/50 bg-amber-500/5 shadow-md ring-1 ring-amber-500/20'
            : 'border-muted-foreground/30 bg-muted/10 shadow-md ring-1 ring-muted-foreground/10'
          : 'border-border/60 bg-card hover:bg-muted/10 hover:shadow-sm'
        }
      `}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-4 right-4 h-[2px] rounded-full ${
        isNS ? 'bg-amber-500/40' : 'bg-muted-foreground/20'
      }`} />

      <span className="text-xs font-semibold text-foreground leading-tight block mt-1">{category.title}</span>
      <span className="text-[10px] text-muted-foreground leading-snug block mt-1.5">{category.definition}</span>

      <p className={`text-2xl font-bold mt-3 ${
        isNS ? 'text-amber-500' : 'text-muted-foreground'
      }`}>{category.count}</p>
    </motion.button>
  );
}

// ─── Step Row with Unit Popover ──────────────────────────────────────────────

function StepRow({ step, categoryKey }: { step: StepItem; categoryKey: CategoryKey }) {
  const isNS = categoryKey.includes('ns');
  const relevantUnits = isNS ? step.nsUnits : step.naUnits;
  const count = relevantUnits.length;
  const denominator = step.totalUnits > 0 ? step.totalUnits : 1;
  const pct = Math.round((count / denominator) * 100);
  const isAbsolute = categoryKey.startsWith('absolute');

  return (
    <div className="flex items-center gap-3 pl-[4.5rem] pr-5 py-2.5 border-t border-border/10 hover:bg-muted/5 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground">{step.actionStep || '(Unnamed Step)'}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {isNS ? 'Not Started' : 'Not Applicable'} by {count}/{step.totalUnits} units ({pct}%)
        </p>
      </div>

      {/* Coverage badge with unit list popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={`
              shrink-0 inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer
              transition-opacity hover:opacity-80
              ${isAbsolute
                ? isNS
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-muted/60 text-muted-foreground'
                : isNS
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-muted/40 text-muted-foreground'
              }
            `}
          >
            {count}/{step.totalUnits}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="left"
          align="center"
          className="w-auto max-w-[240px] p-3"
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Units ({count})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {relevantUnits.map(uid => (
              <span
                key={uid}
                className="inline-block px-2 py-0.5 rounded-md bg-muted/60 text-[11px] font-medium text-foreground"
              >
                {getUnitDisplayName(uid)}
              </span>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function getSelectedStatusMeta(item: ActionItem, viewType: ViewType, term: Term, academicYear: AcademicYear) {
  const termData = item.terms?.[getTermWindowKey(term, academicYear)];

  if (!termData) {
    return { status: '', isProvided: false };
  }

  const status = viewType === 'cumulative' ? termData.spStatus : termData.yearlyStatus;
  const rawStatus = viewType === 'cumulative' ? termData.spStatusRaw : termData.yearlyStatusRaw;
  const providedFlag = viewType === 'cumulative' ? termData.spStatusProvided : termData.yearlyStatusProvided;

  const isProvided = typeof providedFlag === 'boolean'
    ? providedFlag
    : typeof rawStatus === 'string'
      ? rawStatus.trim() !== ''
      : status.trim() !== '';

  return {
    status: status.trim(),
    isProvided,
  };
}

function sortUnitIds(unitIds: Iterable<string>, configuredUnitIds: readonly string[]): string[] {
  const unitOrder = new Map(configuredUnitIds.map((unitId, index) => [unitId, index]));

  return Array.from(new Set(unitIds)).sort((left, right) => {
    const leftOrder = unitOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = unitOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.localeCompare(right);
  });
}

function buildCoverageAliasKeys(
  pillar: PillarId,
  goal: string,
  action: string,
  actionStep: string,
  item: Pick<ActionItem, 'sheetRow' | 'sourceKey'>,
): CoverageAliasKey[] {
  const rowKey = item.sourceKey || buildSourceRowKey(pillar, item.sheetRow);
  const goalKey = normalizeHierarchyGroupKey(goal);
  const actionKey = normalizeHierarchyGroupKey(action);
  const stepKey = normalizeHierarchyGroupKey(actionStep);

  const aliases: CoverageAliasKey[] = [];

  if (goalKey && actionKey && stepKey) {
    aliases.push({ key: `${pillar}|goal:${goalKey}|action:${actionKey}|step:${stepKey}`, rank: 4 });
  }
  if (actionKey && stepKey) {
    aliases.push({ key: `${pillar}|action:${actionKey}|step:${stepKey}`, rank: 3 });
  }
  if (rowKey) {
    aliases.push({ key: rowKey, rank: 2 });
  }

  return Array.from(
    aliases.reduce((map, alias) => {
      const existing = map.get(alias.key);
      if (!existing || alias.rank > existing.rank) {
        map.set(alias.key, alias);
      }
      return map;
    }, new Map<string, CoverageAliasKey>()).values(),
  );
}

function buildCoverageAliasComponentMap(aliasGroups: CoverageAliasKey[][]): Map<string, string> {
  const parentByKey = new Map<string, string>();
  const weightByKey = new Map<string, number>();

  const ensure = (key: string) => {
    if (!parentByKey.has(key)) {
      parentByKey.set(key, key);
      weightByKey.set(key, 0);
    }
  };

  const find = (key: string): string => {
    ensure(key);
    const parent = parentByKey.get(key)!;
    if (parent === key) return key;
    const root = find(parent);
    parentByKey.set(key, root);
    return root;
  };

  const union = (left: string, right: string) => {
    const leftRoot = find(left);
    const rightRoot = find(right);

    if (leftRoot === rightRoot) return;

    const leftWeight = weightByKey.get(leftRoot) ?? 0;
    const rightWeight = weightByKey.get(rightRoot) ?? 0;

    if (leftWeight < rightWeight) {
      parentByKey.set(leftRoot, rightRoot);
      return;
    }

    if (leftWeight > rightWeight) {
      parentByKey.set(rightRoot, leftRoot);
      return;
    }

    parentByKey.set(rightRoot, leftRoot);
    weightByKey.set(leftRoot, leftWeight + 1);
  };

  aliasGroups.forEach(group => {
    if (group.length === 0) return;

    group.forEach(({ key }) => ensure(key));
    const [first, ...rest] = group;
    rest.forEach(({ key }) => union(first.key, key));
  });

  return new Map(Array.from(parentByKey.keys(), key => [key, find(key)]));
}

function classifyCoverageUnitStatus(item: ActionItem, viewType: ViewType, term: Term, academicYear: AcademicYear): CoverageUnitStatus {
  const { status, isProvided } = getSelectedStatusMeta(item, viewType, term, academicYear);

  if (!isProvided) {
    return { classification: 'blank', status: '(blank)' };
  }

  if (!VALID_STATUSES.has(status)) {
    return { classification: 'blank', status: status || '(blank)' };
  }

  return isNotApplicableStatus(status)
    ? { classification: 'na', status }
    : { classification: 'non-na', status };
}

function selectCanonicalCoverageKeyForComponent(
  componentAliases: Iterable<string>,
  aliasUsageByUnit: Map<string, Set<string>>,
  aliasRankByKey: Map<string, number>,
  totalConfiguredUnits: number,
): string {
  return Array.from(new Set(componentAliases))
    .sort((left, right) => {
      const leftCoverage = aliasUsageByUnit.get(left)?.size ?? 0;
      const rightCoverage = aliasUsageByUnit.get(right)?.size ?? 0;
      const leftIsAllUnits = leftCoverage === totalConfiguredUnits ? 1 : 0;
      const rightIsAllUnits = rightCoverage === totalConfiguredUnits ? 1 : 0;
      const leftRank = aliasRankByKey.get(left) ?? 0;
      const rightRank = aliasRankByKey.get(right) ?? 0;

      return rightIsAllUnits - leftIsAllUnits
        || rightCoverage - leftCoverage
        || rightRank - leftRank
        || left.localeCompare(right);
    })
    .at(0) ?? '';
}

function mergeCoverageUnitStatus(
  current: CoverageUnitStatus | undefined,
  incoming: CoverageUnitStatus,
): CoverageUnitStatus {
  if (!current) return incoming;

  const priority: Record<CoverageUnitClassification, number> = {
    'blank': 1,
    'na': 2,
    'non-na': 3,
  };

  if (priority[incoming.classification] > priority[current.classification]) {
    return incoming;
  }

  if (priority[incoming.classification] < priority[current.classification]) {
    return current;
  }

  if (
    current.classification === 'non-na'
    && current.status === 'Not Started'
    && incoming.status !== 'Not Started'
  ) {
    return incoming;
  }

  return current;
}

function buildCoverageDebugRows(
  stepMap: Map<string, CoverageAggregateEntry>,
  configuredUnitIds: readonly string[],
): CoverageDebugRow[] {
  return Array.from(stepMap.entries())
    .map(([itemKey, entry]) => {
      const totalUnits = configuredUnitIds.length;
      const matchedUnitsCount = configuredUnitIds.filter(unitId => entry.statusByUnit.has(unitId)).length;
      const naCount = configuredUnitIds.filter(unitId => entry.statusByUnit.get(unitId)?.classification === 'na').length;
      const nonNaCount = configuredUnitIds.filter(unitId => entry.statusByUnit.get(unitId)?.classification === 'non-na').length;
      const blankCount = configuredUnitIds.filter(unitId => entry.statusByUnit.get(unitId)?.classification === 'blank').length;
      const missingCount = configuredUnitIds.length - matchedUnitsCount;
      const included = naCount === totalUnits && nonNaCount === 0 && blankCount === 0 && missingCount === 0;

      return {
        itemKey,
        totalUnits,
        matchedUnitsCount,
        naCount,
        nonNaCount,
        blankCount,
        missingCount,
        included,
        exclusionReason: included
          ? 'included: explicit Not Applicable in all 24 configured units'
          : [
              nonNaCount > 0 ? `non-NA=${nonNaCount}` : null,
              blankCount > 0 ? `blank=${blankCount}` : null,
              missingCount > 0 ? `missing=${missingCount}` : null,
            ].filter(Boolean).join(', '),
      };
    })
    .sort((left, right) => right.naCount - left.naCount || left.itemKey.localeCompare(right.itemKey));
}

// ─── Computation ─────────────────────────────────────────────────────────────

export function computeCategories(
  unitResults: UnitFetchResult[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): CategoryData[] {
  const configuredUnitIds = [...UNIT_IDS];
  const totalConfiguredUnits = configuredUnitIds.length;
  const resultsByUnitId = new Map(unitResults.map(unitResult => [unitResult.unitId, unitResult]));
  const loadedUnits = configuredUnitIds
    .map(unitId => resultsByUnitId.get(unitId))
    .filter((unitResult): unitResult is UnitFetchResult => Boolean(unitResult?.result) && !unitResult?.error);
  const failedUnitIds = configuredUnitIds.filter(unitId => {
    const unitResult = resultsByUnitId.get(unitId);
    return !unitResult || !unitResult.result || Boolean(unitResult.error);
  });

  // Warn about units that failed to load (likely rate-limited)
  if (failedUnitIds.length > 0) {
    console.warn(`[CoverageGaps] ${failedUnitIds.length} unit(s) failed to load:`, failedUnitIds.join(', '));
  }

  const stepMap = new Map<string, CoverageAggregateEntry>();
  const aliasUsageByUnit = new Map<string, Set<string>>();
  const aliasGroups: CoverageAliasKey[][] = [];
  const aliasRankByKey = new Map<string, number>();

  loadedUnits.forEach(ur => {
    const items = ur.result!.data;
    const byPillar = new Map<PillarId, ActionItem[]>();

    items.forEach(item => {
      if (!byPillar.has(item.pillar)) byPillar.set(item.pillar, []);
      byPillar.get(item.pillar)!.push(item);
    });

    byPillar.forEach(pillarItems => {
      forwardFill(pillarItems).forEach(({ goal, action, actionStep, pillar, item }) => {
        const cleanedStep = normalizeHierarchyText(actionStep);
        if (!cleanedStep) return;

        const aliasKeys = buildCoverageAliasKeys(
          pillar,
          normalizeHierarchyText(goal),
          normalizeHierarchyText(action),
          cleanedStep,
          item,
        );

        aliasGroups.push(aliasKeys);
        aliasKeys.forEach(({ key, rank }) => {
          const existingRank = aliasRankByKey.get(key) ?? 0;
          if (rank > existingRank) {
            aliasRankByKey.set(key, rank);
          }
          if (!aliasUsageByUnit.has(key)) {
            aliasUsageByUnit.set(key, new Set());
          }
          aliasUsageByUnit.get(key)!.add(ur.unitId);
        });
      });
    });
  });

  const aliasComponentByKey = buildCoverageAliasComponentMap(aliasGroups);
  const componentAliases = new Map<string, Set<string>>();

  aliasComponentByKey.forEach((componentKey, aliasKey) => {
    if (!componentAliases.has(componentKey)) {
      componentAliases.set(componentKey, new Set());
    }
    componentAliases.get(componentKey)!.add(aliasKey);
  });

  loadedUnits.forEach(ur => {
    const items = ur.result!.data;

    // Group by pillar for forward-fill within each pillar
    const byPillar = new Map<PillarId, ActionItem[]>();
    items.forEach(item => {
      if (!byPillar.has(item.pillar)) byPillar.set(item.pillar, []);
      byPillar.get(item.pillar)!.push(item);
    });

    const unitProcessedKeys = new Set<string>();

    byPillar.forEach((pillarItems, _pillar) => {
      const filled = forwardFill(pillarItems);

      filled.forEach(({ goal, action, actionStep, pillar, item }) => {
        const cleanedStep = normalizeHierarchyText(actionStep);
        if (!cleanedStep) return;

        const normalizedGoal = normalizeHierarchyText(goal);
        const normalizedAction = normalizeHierarchyText(action);

        const statusMeta = classifyCoverageUnitStatus(item, viewType, term, academicYear);
        const aliasKeys = buildCoverageAliasKeys(pillar, normalizedGoal, normalizedAction, cleanedStep, item);
        const aliasIds = aliasKeys.map(({ key }) => key);
        const componentKey = aliasIds
          .map(key => aliasComponentByKey.get(key) ?? key)
          .sort((left, right) => left.localeCompare(right))
          .at(0);
        const canonicalKey = selectCanonicalCoverageKeyForComponent(
          componentKey ? (componentAliases.get(componentKey) ?? aliasIds) : aliasIds,
          aliasUsageByUnit,
          aliasRankByKey,
          totalConfiguredUnits,
        );

        if (!canonicalKey) return;

        if (!stepMap.has(canonicalKey)) {
          stepMap.set(canonicalKey, {
            sourceKey: canonicalKey,
            sheetRow: item.sheetRow,
            actionStep: cleanedStep,
            pillar,
            goal: normalizedGoal || '(Unspecified Goal)',
            action: normalizedAction || '(Unspecified Action)',
            aliases: new Set(),
            statusByUnit: new Map(),
          });
        }

        const entry = stepMap.get(canonicalKey)!;
        aliasKeys.forEach(({ key }) => {
          entry.aliases.add(key);
        });

        if (entry.goal === '(Unspecified Goal)') {
          entry.goal = normalizedGoal || entry.goal;
        }
        if (entry.action === '(Unspecified Action)') {
          entry.action = normalizedAction || entry.action;
        }
        entry.sheetRow = Math.min(entry.sheetRow, item.sheetRow);

        const dedupeKey = `${canonicalKey}::${ur.unitId}`;
        const currentStatus = entry.statusByUnit.get(ur.unitId);
        const nextStatus = mergeCoverageUnitStatus(currentStatus, statusMeta);
        entry.statusByUnit.set(ur.unitId, nextStatus);

        if (unitProcessedKeys.has(dedupeKey) && currentStatus?.classification === nextStatus.classification && currentStatus?.status === nextStatus.status) {
          return;
        }
        unitProcessedKeys.add(dedupeKey);
      });
    });
  });

  // Categorize using per-step denominators
  const majorityNS: StepItem[] = [];
  const absoluteNS: StepItem[] = [];
  const majorityNA: StepItem[] = [];
  const absoluteNA: StepItem[] = [];

  // Track near-miss Absolute NA candidates so we can surface the blocking unit(s)
  // in production logs (not just DEV) when the count comes up empty/low.
  const nearMissCandidates: Array<{
    sourceKey: string;
    pillar: PillarId;
    sheetRow: number;
    actionStep: string;
    naCount: number;
    nonNaUnits: string[];
    blankUnits: string[];
    missingUnits: string[];
  }> = [];

  // Deduplication check: track canonical keys to ensure no duplicate items
  const processedKeys = new Set<string>();

  stepMap.forEach((entry, key) => {
    // Skip if somehow duplicated (should not happen with Map, but safety check)
    if (processedKeys.has(key)) {
      console.warn('[CoverageGaps] Duplicate canonical key detected and skipped:', key);
      return;
    }
    processedKeys.add(key);

    const sortedNsUnits = sortUnitIds(
      configuredUnitIds.filter(unitId => entry.statusByUnit.get(unitId)?.classification === 'non-na' && entry.statusByUnit.get(unitId)?.status === 'Not Started'),
      configuredUnitIds,
    );
    const sortedNaUnits = sortUnitIds(
      configuredUnitIds.filter(unitId => entry.statusByUnit.get(unitId)?.classification === 'na'),
      configuredUnitIds,
    );
    const nonNaUnitIds = configuredUnitIds.filter(unitId => entry.statusByUnit.get(unitId)?.classification === 'non-na');
    const blankUnitIds = configuredUnitIds.filter(unitId => entry.statusByUnit.get(unitId)?.classification === 'blank');
    const activeCount = nonNaUnitIds.length;
    const reportingCount = configuredUnitIds.filter(unitId => entry.statusByUnit.has(unitId)).length;
    const nsCount = sortedNsUnits.length;
    const naCount = sortedNaUnits.length;
    const nonNaCount = nonNaUnitIds.length;
    const blankCount = blankUnitIds.length;

    if (activeCount > 0) {
      const nsItem: StepItem = {
        sourceKey: entry.sourceKey,
        sheetRow: entry.sheetRow,
        actionStep: entry.actionStep,
        pillar: entry.pillar,
        goal: entry.goal,
        action: entry.action,
        nsUnits: sortedNsUnits,
        naUnits: sortedNaUnits,
        totalUnits: activeCount,
      };
      if (nsCount === activeCount) absoluteNS.push(nsItem);
      if (nsCount >= Math.ceil(activeCount * 0.75)) majorityNS.push(nsItem);
    }

    if (reportingCount > 0) {
      const majorityNaItem: StepItem = {
        sourceKey: entry.sourceKey,
        sheetRow: entry.sheetRow,
        actionStep: entry.actionStep,
        pillar: entry.pillar,
        goal: entry.goal,
        action: entry.action,
        nsUnits: sortedNsUnits,
        naUnits: sortedNaUnits,
        totalUnits: reportingCount,
      };

      if (naCount >= Math.ceil(reportingCount * 0.75)) majorityNA.push(majorityNaItem);
    }

    const missingUnitIds = configuredUnitIds.filter(unitId => !entry.statusByUnit.has(unitId));
    const blockingUnitStatuses = configuredUnitIds
      .filter(unitId => entry.statusByUnit.get(unitId)?.classification === 'non-na')
      .map(unitId => `${getUnitDisplayName(unitId)}=${entry.statusByUnit.get(unitId)?.status}`);
    const isStrictAbsoluteNA = naCount === totalConfiguredUnits && nonNaCount === 0 && blankCount === 0 && missingUnitIds.length === 0;
    const inclusionReason = isStrictAbsoluteNA
      ? 'included: explicit Not Applicable in all 24 configured units'
      : nonNaCount > 0
        ? `excluded: ${nonNaCount} unit(s) are present but not Not Applicable`
        : blankCount > 0
          ? `excluded: blank status in ${blankCount} unit(s)`
      : missingUnitIds.length > 0
        ? `excluded: missing, blank, unmatched, or unloaded in ${missingUnitIds.length} unit(s)`
        : 'excluded: no item has NA_count = 24 out of 24 loaded units';

    if (import.meta.env.DEV) {
      console.info('[CoverageGaps][Absolute NA candidate]', {
        uniqueItemKey: entry.sourceKey,
        totalUnits: totalConfiguredUnits,
        matchedUnitsCount: reportingCount,
        naCount,
        nonNaCount,
        blankCount,
        missingCount: missingUnitIds.length,
        matchedUnits: sortedNaUnits.map(getUnitDisplayName),
        missingUnits: sortUnitIds(missingUnitIds, configuredUnitIds).map(getUnitDisplayName),
        ...(blockingUnitStatuses.length > 0 ? { blockingUnits: blockingUnitStatuses } : {}),
        finalReason: inclusionReason,
      });
    }

    if (isStrictAbsoluteNA) {
      absoluteNA.push({
        sourceKey: entry.sourceKey,
        sheetRow: entry.sheetRow,
        actionStep: entry.actionStep,
        pillar: entry.pillar,
        goal: entry.goal,
        action: entry.action,
        nsUnits: sortedNsUnits,
        naUnits: sortedNaUnits,
        totalUnits: totalConfiguredUnits,
      });
    }
  });

  const debugRows = buildCoverageDebugRows(stepMap, configuredUnitIds);

  const strictAbsoluteNA = absoluteNA.filter(item => {
    const isValid = item.naUnits.length === totalConfiguredUnits && item.totalUnits === totalConfiguredUnits;

    if (!isValid) {
      console.error('[CoverageGaps] Absolute NA item dropped by strict validator:', {
        uniqueItemKey: item.sourceKey,
        matchedUnitsCount: item.naUnits.length,
        totalUnits: item.totalUnits,
      });
    }

    return isValid;
  });

  // ─── Validation checks ─────────────────────────────────────────────────
  // Absolute must be a subset of Majority (absolute is stricter)
  if (strictAbsoluteNA.length > majorityNA.length) {
    console.error(`[CoverageGaps] VALIDATION FAIL: Absolute NA (${strictAbsoluteNA.length}) > Majority NA (${majorityNA.length})`);
  }
  if (absoluteNS.length > majorityNS.length) {
    console.error(`[CoverageGaps] VALIDATION FAIL: Absolute NS (${absoluteNS.length}) > Majority NS (${majorityNS.length})`);
  }

  // ─── Debug summary (dev only) ──────────────────────────────────────────
  if (import.meta.env.DEV) {
    const isMandatoryAbsoluteNaDebugFilter = viewType === 'cumulative' && term === 'mid' && academicYear === '2025-2026';
    const absoluteNAKeys = new Set(strictAbsoluteNA.map(i => i.sourceKey));
    const majorityOnlyNA = majorityNA.filter(i => !absoluteNAKeys.has(i.sourceKey));
    if (isMandatoryAbsoluteNaDebugFilter) {
      console.table(debugRows);
      if (strictAbsoluteNA.length === 0) {
        console.info('[CoverageGaps] No item has NA_count = 24 out of 24 loaded units.');
      }
    }
    if (majorityOnlyNA.length > 0) {
      console.info(`[CoverageGaps] ${majorityOnlyNA.length} items in Majority NA but NOT Absolute NA:`);
      majorityOnlyNA.forEach(item => {
        const entry = stepMap.get(item.sourceKey);
        if (entry) {
          const nonNAUnits = configuredUnitIds
            .filter(unitId => entry.statusByUnit.get(unitId)?.classification === 'non-na')
            .map(unitId => `${getUnitDisplayName(unitId)}=${entry.statusByUnit.get(unitId)?.status}`);
          const missingUnits = configuredUnitIds
            .filter(unitId => !entry.statusByUnit.has(unitId))
            .map(getUnitDisplayName);
          const blankUnits = configuredUnitIds
            .filter(unitId => entry.statusByUnit.get(unitId)?.classification === 'blank')
            .map(getUnitDisplayName);

          console.info(
            `  [${item.pillar}] row ${item.sheetRow} "${item.actionStep}" — NA: ${item.naUnits.length}/${totalConfiguredUnits}. Non-NA: [${nonNAUnits.join(', ')}]. Blank: [${blankUnits.join(', ')}]. Missing: [${missingUnits.join(', ')}]`
          );
        }
      });
    }
    console.info(`[CoverageGaps] Majority NA: ${majorityNA.length}, Absolute NA: ${strictAbsoluteNA.length}, Majority NS: ${majorityNS.length}, Absolute NS: ${absoluteNS.length}, Items: ${stepMap.size}, Loaded Units: ${loadedUnits.length}/${totalConfiguredUnits}`);
  }

  return [
    { key: 'majority-ns' as CategoryKey, title: 'Majority Not Started', definition: 'Not Started by ≥ 75% of active units (excluding blanks, missing rows, and N/A)', count: majorityNS.length, accent: 'ns' as const, items: majorityNS },
    { key: 'absolute-ns' as CategoryKey, title: 'Absolute Not Started', definition: 'Not Started by all active units (excluding blanks, missing rows, and N/A)', count: absoluteNS.length, accent: 'ns' as const, items: absoluteNS },
    { key: 'majority-na' as CategoryKey, title: 'Majority Not Applicable', definition: 'Explicitly marked Not Applicable by ≥ 75% of reporting units', count: majorityNA.length, accent: 'na' as const, items: majorityNA },
    { key: 'absolute-na' as CategoryKey, title: 'Absolute Not Applicable', definition: `Explicitly marked Not Applicable by all ${totalConfiguredUnits} configured units; any missing, blank, unmatched, or non-NA unit excludes the item`, count: strictAbsoluteNA.length, accent: 'na' as const, items: strictAbsoluteNA },
  ];
}

// ─── Grouping: Pillar → Goal → Action → Steps (deduplicated) ────────────────

function groupByPillar(items: StepItem[]): PillarGroup[] {
  const pillarMap = new Map<PillarId, Map<string, {
    goal: string;
    firstRow: number;
    actions: Map<string, {
      action: string;
      firstRow: number;
      steps: StepItem[];
    }>;
  }>>();
  const seenKeys = new Set<string>();

  items.forEach(item => {
    const goalLabel = item.goal || '(Unspecified Goal)';
    const actionLabel = item.action || '(Unspecified Action)';
    const goalKey = normalizeHierarchyGroupKey(goalLabel) || `goal-${item.sourceKey}`;
    const actionKey = normalizeHierarchyGroupKey(actionLabel) || `action-${item.sourceKey}`;

    // Skip duplicate items
    if (seenKeys.has(item.sourceKey)) {
      console.warn('[CoverageGaps] Duplicate item in groupByPillar skipped:', item.sourceKey);
      return;
    }
    seenKeys.add(item.sourceKey);

    if (!pillarMap.has(item.pillar)) pillarMap.set(item.pillar, new Map());
    const goalMap = pillarMap.get(item.pillar)!;

    if (!goalMap.has(goalKey)) {
      goalMap.set(goalKey, {
        goal: goalLabel,
        firstRow: item.sheetRow,
        actions: new Map(),
      });
    }
    const goalEntry = goalMap.get(goalKey)!;
    goalEntry.firstRow = Math.min(goalEntry.firstRow, item.sheetRow);

    if (!goalEntry.actions.has(actionKey)) {
      goalEntry.actions.set(actionKey, {
        action: actionLabel,
        firstRow: item.sheetRow,
        steps: [],
      });
    }
    const actionEntry = goalEntry.actions.get(actionKey)!;
    actionEntry.firstRow = Math.min(actionEntry.firstRow, item.sheetRow);
    actionEntry.steps.push(item);
  });

  const order: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

  return order
    .filter(p => pillarMap.has(p))
    .map(p => ({
      pillar: p,
      goals: Array.from(pillarMap.get(p)!.values())
        .sort((a, b) => a.firstRow - b.firstRow || a.goal.localeCompare(b.goal))
        .map(goalEntry => ({
          goal: goalEntry.goal,
          firstRow: goalEntry.firstRow,
          actions: Array.from(goalEntry.actions.values())
            .sort((a, b) => a.firstRow - b.firstRow || a.action.localeCompare(b.action))
            .map(actionEntry => ({
              action: actionEntry.action,
              firstRow: actionEntry.firstRow,
              steps: [...actionEntry.steps].sort((a, b) => a.sheetRow - b.sheetRow || a.actionStep.localeCompare(b.actionStep)),
            })),
        })),
    }))
    .filter(p => p.goals.length > 0);
}
