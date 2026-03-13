/**
 * Strategic Coverage Exceptions
 * Premium hybrid panel: 2×2 summary grid + single expandable detail panel.
 * Identifies cross-unit strategic items broadly not started or not applicable.
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
import type { PillarId } from '@/lib/types';
import type { UnitFetchResult } from '@/lib/university-aggregation';

// ─── Types ───────────────────────────────────────────────────────────────────

type CategoryKey = 'majority-ns' | 'absolute-ns' | 'majority-na' | 'absolute-na';

interface StepItem {
  actionStep: string;
  pillar: PillarId;
  goal: string;
  nsUnits: string[];
  naUnits: string[];
  totalUnits: number;
}

interface GoalGroup {
  goal: string;
  steps: StepItem[];
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

const TOTAL_UNITS = 21;

// ─── Component ───────────────────────────────────────────────────────────────

export default function StrategicCoverageGaps() {
  const { viewType, academicYear, term } = useDashboard();
  const { data: unitResults } = useUniversityData();
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

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

  return (
    <section className="space-y-5">
      {/* Title */}
      <div>
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Strategic Coverage Exceptions
        </h3>
        <p className="text-xs text-muted-foreground">
          Cross-unit strategic items requiring attention
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

      {/* Level 2: Detail Panel */}
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
                <p className="text-xs text-muted-foreground mt-0.5">{activeData.count} item{activeData.count !== 1 ? 's' : ''} · {activeData.definition}</p>
              </div>

              {/* Pillar → Goal → Step hierarchy */}
              <div className="divide-y divide-border/30">
                {grouped.map(pg => {
                  const pKey = pg.pillar;
                  const pOpen = expandedPillars.has(pKey);
                  return (
                    <div key={pKey}>
                      <button
                        onClick={() => toggle(expandedPillars, pKey, setExpandedPillars)}
                        className="w-full flex items-center gap-2.5 px-5 py-3.5 hover:bg-muted/20 transition-colors text-left"
                      >
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${pOpen ? 'rotate-90' : ''}`} />
                        <span className="text-xs sm:text-sm font-semibold text-foreground flex-1">{PILLAR_FULL[pg.pillar]}</span>
                        <span className="text-xs text-muted-foreground">{pg.goals.reduce((s, g) => s + g.steps.length, 0)} items</span>
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
                              const gKey = `${pKey}-${goal.goal}`;
                              const gOpen = expandedGoals.has(gKey);
                              return (
                                <div key={gKey} className="border-t border-border/20">
                                  <button
                                    onClick={() => toggle(expandedGoals, gKey, setExpandedGoals)}
                                    className="w-full flex items-center gap-2 pl-9 pr-5 py-2.5 hover:bg-muted/10 transition-colors text-left"
                                  >
                                    <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${gOpen ? 'rotate-90' : ''}`} />
                                    <span className="text-xs font-medium text-foreground flex-1">{goal.goal}</span>
                                    <span className="text-xs text-muted-foreground">{goal.steps.length}</span>
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
                                        {goal.steps.map((step, si) => (
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

// ─── Step Row ────────────────────────────────────────────────────────────────

function StepRow({ step, categoryKey }: { step: StepItem; categoryKey: CategoryKey }) {
  const isNS = categoryKey.includes('ns');
  const relevantUnits = isNS ? step.nsUnits : step.naUnits;
  const count = relevantUnits.length;
  const pct = Math.round((count / TOTAL_UNITS) * 100);
  const isAbsolute = categoryKey.startsWith('absolute');

  return (
    <div className="flex items-center gap-3 pl-14 pr-5 py-2.5 border-t border-border/10 hover:bg-muted/5 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground truncate">{step.actionStep}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Marked {isNS ? 'Not Started' : 'Not Applicable'} by {count} of {TOTAL_UNITS} units ({pct}%)
        </p>
      </div>

      {/* Coverage badge */}
      <span className={`
        shrink-0 inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold
        ${isAbsolute
          ? isNS
            ? 'bg-amber-500/20 text-amber-400'
            : 'bg-muted/60 text-muted-foreground'
          : isNS
            ? 'bg-amber-500/10 text-amber-500'
            : 'bg-muted/40 text-muted-foreground'
        }
      `}>
        {count}/{TOTAL_UNITS}
      </span>
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
  const totalLoadedUnits = loadedUnits.length;
  const threshold75 = Math.ceil(TOTAL_UNITS * 0.75); // 16

  // Build step map: actionStep key → { nsUnits, naUnits }
  const stepMap = new Map<string, {
    actionStep: string;
    pillar: PillarId;
    goal: string;
    nsUnits: string[];
    naUnits: string[];
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
        });
      }

      const entry = stepMap.get(key)!;
      if (status === 'Not Started') {
        entry.nsUnits.push(ur.unitId);
      } else if (isNotApplicableStatus(status)) {
        entry.naUnits.push(ur.unitId);
      }
    });
  });

  // Categorize
  const majorityNS: StepItem[] = [];
  const absoluteNS: StepItem[] = [];
  const majorityNA: StepItem[] = [];
  const absoluteNA: StepItem[] = [];

  stepMap.forEach(entry => {
    const item: StepItem = {
      actionStep: entry.actionStep,
      pillar: entry.pillar,
      goal: entry.goal,
      nsUnits: entry.nsUnits,
      naUnits: entry.naUnits,
      totalUnits: TOTAL_UNITS,
    };

    if (entry.nsUnits.length >= threshold75) {
      majorityNS.push(item);
    }
    if (entry.nsUnits.length === TOTAL_UNITS) {
      absoluteNS.push(item);
    }
    if (entry.naUnits.length >= threshold75) {
      majorityNA.push(item);
    }
    if (entry.naUnits.length === TOTAL_UNITS) {
      absoluteNA.push(item);
    }
  });

  return [
    {
      key: 'majority-ns',
      title: 'Majority Not Started',
      definition: 'Not Started by ≥ 75% of units (≥ 16)',
      count: majorityNS.length,
      accent: 'ns',
      items: majorityNS,
    },
    {
      key: 'absolute-ns',
      title: 'Absolute Not Started',
      definition: 'Not Started by all 21 units',
      count: absoluteNS.length,
      accent: 'ns',
      items: absoluteNS,
    },
    {
      key: 'majority-na',
      title: 'Majority Not Applicable',
      definition: 'Not Applicable by ≥ 75% of units (≥ 16)',
      count: majorityNA.length,
      accent: 'na',
      items: majorityNA,
    },
    {
      key: 'absolute-na',
      title: 'Absolute Not Applicable',
      definition: 'Not Applicable by all 21 units',
      count: absoluteNA.length,
      accent: 'na',
      items: absoluteNA,
    },
  ];
}

function groupByPillar(items: StepItem[]): PillarGroup[] {
  const pillarMap = new Map<PillarId, Map<string, StepItem[]>>();
  items.forEach(item => {
    if (!pillarMap.has(item.pillar)) pillarMap.set(item.pillar, new Map());
    const goalMap = pillarMap.get(item.pillar)!;
    if (!goalMap.has(item.goal)) goalMap.set(item.goal, []);
    goalMap.get(item.goal)!.push(item);
  });

  const order: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];
  return order
    .filter(p => pillarMap.has(p))
    .map(p => ({
      pillar: p,
      goals: Array.from(pillarMap.get(p)!.entries()).map(([goal, steps]) => ({ goal, steps })),
    }));
}
