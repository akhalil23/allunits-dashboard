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
import { getItemStatus } from '@/lib/intelligence';
import { isNotApplicableStatus } from '@/lib/types';
import { getUnitDisplayName } from '@/lib/unit-config';
import { PILLAR_FULL } from '@/lib/pillar-labels';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { PillarId, ActionItem } from '@/lib/types';
import type { UnitFetchResult } from '@/lib/university-aggregation';

// ─── Types ───────────────────────────────────────────────────────────────────

type CategoryKey = 'majority-ns' | 'absolute-ns' | 'majority-na' | 'absolute-na';

interface StepItem {
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
  steps: StepItem[];
}

interface GoalGroup {
  goal: string;
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

const VALID_STATUSES = new Set([
  'Not Applicable',
  'Not Started',
  'In Progress',
  'Completed – On Target',
  'Completed – Below Target',
]);

// ─── Text cleaning ──────────────────────────────────────────────────────────

function cleanText(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/\u00A0/g, ' ')
    .replace(/[\t\r\n\f\v]/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

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
    const rawGoal = cleanText(item.goal);
    const rawAction = cleanText(item.objective);
    const rawStep = cleanText(item.actionStep);

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

// ─── Computation ─────────────────────────────────────────────────────────────

function computeCategories(
  unitResults: UnitFetchResult[],
  viewType: 'cumulative' | 'yearly',
  term: 'mid' | 'end',
  academicYear: '2025-2026' | '2026-2027'
): CategoryData[] {
  const loadedUnits = unitResults.filter(u => u.result && !u.error);

  // Build step map: unique key → aggregated units
  // Key = pillar|sheetRow (all forward-filled & cleaned)
  const stepMap = new Map<string, {
    actionStep: string;
    pillar: PillarId;
    goal: string;
    action: string;
    nsUnits: string[];
    naUnits: string[];
    activeUnits: string[]; // units with valid non-NA status (NS, IP, COT, CBT)
    validUnits: string[];  // units with any recognized status (including NA)
  }>();

  loadedUnits.forEach(ur => {
    const items = ur.result!.data;

    // Group by pillar for forward-fill within each pillar
    const byPillar = new Map<PillarId, ActionItem[]>();
    items.forEach(item => {
      if (!byPillar.has(item.pillar)) byPillar.set(item.pillar, []);
      byPillar.get(item.pillar)!.push(item);
    });

    // Forward-fill and process each pillar
    byPillar.forEach((pillarItems, _pillar) => {
      const filled = forwardFill(pillarItems);

      filled.forEach(({ goal, action, actionStep, pillar, item }) => {
        const rawStatus = (getItemStatus(item, viewType, term, academicYear) || '').trim();
        if (!VALID_STATUSES.has(rawStatus)) return;

        const key = `${pillar}|${item.sheetRow}`;

        if (!stepMap.has(key)) {
          stepMap.set(key, {
            actionStep,
            pillar,
            goal,
            action,
            nsUnits: [],
            naUnits: [],
            activeUnits: [],
            validUnits: [],
          });
        }

        const entry = stepMap.get(key)!;

        // Track all units with recognized status
        if (!entry.validUnits.includes(ur.unitId)) entry.validUnits.push(ur.unitId);

        if (isNotApplicableStatus(rawStatus)) {
          if (!entry.naUnits.includes(ur.unitId)) entry.naUnits.push(ur.unitId);
        } else {
          // Active = has a non-NA valid status
          if (!entry.activeUnits.includes(ur.unitId)) entry.activeUnits.push(ur.unitId);
          if (rawStatus === 'Not Started') {
            if (!entry.nsUnits.includes(ur.unitId)) entry.nsUnits.push(ur.unitId);
          }
        }
      });
    });
  });

  // Categorize using per-step denominators (excluding blanks, missing, NA)
  const majorityNS: StepItem[] = [];
  const absoluteNS: StepItem[] = [];
  const majorityNA: StepItem[] = [];
  const absoluteNA: StepItem[] = [];

  stepMap.forEach(entry => {
    const activeCount = entry.activeUnits.length; // non-NA units for this step
    const validCount = entry.validUnits.length;   // all units with recognized status

    // NS: denominator = active (non-NA) units for this specific step
    if (activeCount > 0) {
      const nsItem: StepItem = {
        actionStep: entry.actionStep,
        pillar: entry.pillar,
        goal: entry.goal,
        action: entry.action,
        nsUnits: entry.nsUnits,
        naUnits: entry.naUnits,
        totalUnits: activeCount,
      };
      if (entry.nsUnits.length === activeCount) absoluteNS.push(nsItem);
      if (entry.nsUnits.length >= Math.ceil(activeCount * 0.75)) majorityNS.push(nsItem);
    }

    // NA: denominator = all valid (reporting) units for this step
    if (validCount > 0) {
      const naItem: StepItem = {
        actionStep: entry.actionStep,
        pillar: entry.pillar,
        goal: entry.goal,
        action: entry.action,
        nsUnits: entry.nsUnits,
        naUnits: entry.naUnits,
        totalUnits: validCount,
      };
      if (entry.naUnits.length === validCount) absoluteNA.push(naItem);
      if (entry.naUnits.length >= Math.ceil(validCount * 0.75)) majorityNA.push(naItem);
    }
  });

  return [
    { key: 'majority-ns' as CategoryKey, title: 'Majority Not Started', definition: 'Not Started by ≥ 75% of active units (excluding blanks & N/A)', count: majorityNS.length, accent: 'ns' as const, items: majorityNS },
    { key: 'absolute-ns' as CategoryKey, title: 'Absolute Not Started', definition: 'Not Started by all active units (excluding blanks & N/A)', count: absoluteNS.length, accent: 'ns' as const, items: absoluteNS },
    { key: 'majority-na' as CategoryKey, title: 'Majority Not Applicable', definition: 'Not Applicable by ≥ 75% of reporting units', count: majorityNA.length, accent: 'na' as const, items: majorityNA },
    { key: 'absolute-na' as CategoryKey, title: 'Absolute Not Applicable', definition: 'Not Applicable by all reporting units', count: absoluteNA.length, accent: 'na' as const, items: absoluteNA },
  ];
}

// ─── Grouping: Pillar → Goal → Action → Steps ───────────────────────────────

function groupByPillar(items: StepItem[]): PillarGroup[] {
  const pillarMap = new Map<PillarId, Map<string, Map<string, StepItem[]>>>();

  items.forEach(item => {
    const goalLabel = item.goal || '(Unspecified Goal)';
    const actionLabel = item.action || '(Unspecified Action)';

    if (!pillarMap.has(item.pillar)) pillarMap.set(item.pillar, new Map());
    const goalMap = pillarMap.get(item.pillar)!;

    if (!goalMap.has(goalLabel)) goalMap.set(goalLabel, new Map());
    const actionMap = goalMap.get(goalLabel)!;

    if (!actionMap.has(actionLabel)) actionMap.set(actionLabel, []);
    actionMap.get(actionLabel)!.push(item);
  });

  const order: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

  return order
    .filter(p => pillarMap.has(p))
    .map(p => ({
      pillar: p,
      goals: Array.from(pillarMap.get(p)!.entries()).map(([goal, actionMap]) => ({
        goal,
        actions: Array.from(actionMap.entries()).map(([action, steps]) => ({
          action,
          steps,
        })),
      })),
    }))
    .filter(p => p.goals.length > 0);
}
