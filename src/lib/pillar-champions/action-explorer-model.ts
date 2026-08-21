/**
 * Shared Action Explorer model — single source of truth for the pillar-champions
 * hierarchy (Pillar → Goal → Action → Action Step → Unit) and its completion
 * values. Extracted verbatim from ActionExplorer so other sections (e.g. Budget
 * Intelligence) reuse the exact same calculation, filters and N/A handling.
 */
import { getItemStatus, getItemCompletion, computeExpectedProgress } from '@/lib/intelligence';
import { mapItemToRiskSignal, RISK_SIGNAL_COLORS } from '@/lib/risk-signals';
import { isNotApplicableStatus } from '@/lib/types';
import { getUnitDisplayName } from '@/lib/unit-config';
import { normalizeHierarchyGroupKey, normalizeHierarchyMatchKey, normalizeHierarchyText } from '@/lib/strategic-item-keys';
import type { UnitFetchResult } from '@/lib/university-aggregation';
import type { PillarId, ViewType, Term, AcademicYear } from '@/lib/types';

export function isSyntheticActionHeaderStep(objective: string, actionStep: string): boolean {
  const objectiveKey = normalizeHierarchyGroupKey(objective).replace(/[^a-z0-9]+/g, '');
  const stepKey = normalizeHierarchyGroupKey(actionStep).replace(/[^a-z0-9]+/g, '');
  return objectiveKey.length > 0 && objectiveKey === stepKey;
}

function buildExplorerStepKey(
  pillar: PillarId,
  goal: string,
  objectiveOrdinal: number,
  actionStep: string,
): string {
  const goalKey = normalizeHierarchyMatchKey(goal);
  const stepKey = normalizeHierarchyMatchKey(actionStep);
  const ordKey = `act#${objectiveOrdinal}`;

  if (goalKey && stepKey) {
    return `${pillar}|goalmatch:${goalKey}|${ordKey}|stepmatch:${stepKey}`;
  }
  if (stepKey) {
    return `${pillar}|${ordKey}|stepmatch:${stepKey}`;
  }
  return `${pillar}|goalmatch:${goalKey}|${ordKey}|step#${actionStep}`;
}

export interface ActionExplorerModelParams {
  unitResults: UnitFetchResult[];
  viewType: ViewType;
  term: Term;
  academicYear: AcademicYear;
  selectedPillar: 'all' | PillarId;
  selectedUnits: string[];
}

export interface UnitEntry {
  unit: string;
  unitId: string;
  status: string;
  completion: number;
  riskSignal: string;
  riskColor: string;
  executionGap: number;
}

export interface ActionStepNode {
  sourceKey: string;
  actionStep: string;
  sheetRow: number;
  units: UnitEntry[];
}

export interface ObjectiveNode {
  objective: string;
  firstRow: number;
  actionSteps: ActionStepNode[];
}

export interface GoalNode {
  goal: string;
  pillar: PillarId;
  firstRow: number;
  objectives: ObjectiveNode[];
  totalActionSteps: number;
  atRiskCount: number;
}

export function buildActionExplorerModel({
  unitResults, viewType, term, academicYear, selectedPillar, selectedUnits,
}: ActionExplorerModelParams): GoalNode[] {
  const expectedProgress = computeExpectedProgress(viewType, academicYear);
    const filtered = unitResults.filter(u => selectedUnits.includes(u.unitId) && u.result);

    // Step 1: Build a map keyed by stable source row → unit entries
    const stepMap = new Map<string, {
      sourceKey: string;
      sheetRow: number;
      pillar: PillarId;
      goal: string;
      objective: string;
      actionStep: string;
      units: UnitEntry[];
    }>();

    filtered.forEach(ur => {
      const processedKeys = new Set<string>();

      // Forward-fill blank Goal/Action cells per (unit × pillar) ordered by sheetRow.
      // Without this, the same Action Step shows up under "(Unspecified Goal)" for
      // units whose Goal cell is blank (merged) and under its true Goal for others,
      // causing duplicate entries with conflicting completion values.
      const unitItems = ur.result!.data;
      const byPillar = new Map<PillarId, typeof unitItems>();
      unitItems.forEach(item => {
        if (selectedPillar !== 'all' && item.pillar !== selectedPillar) return;
        if (!byPillar.has(item.pillar)) byPillar.set(item.pillar, []);
        byPillar.get(item.pillar)!.push(item);
      });

      const filledItems: { item: typeof unitItems[number]; goal: string; objective: string; actionStep: string; objectiveOrdinal: number }[] = [];
      byPillar.forEach(pillarItems => {
        const sorted = [...pillarItems].sort((a, b) => a.sheetRow - b.sheetRow);
        let lastGoal = '';
        let lastAction = '';
        // Per-goal ordinal counter so a renamed Action (e.g. Pillar III Goal 1
        // Action 2 changed mid-cycle) still merges with the original action
        // under the same goal across all units.
        const ordinalByGoal = new Map<string, number>();
        const seenObjectivePerGoal = new Map<string, Set<string>>();
        sorted.forEach(item => {
          const g = normalizeHierarchyText(item.goal);
          const a = normalizeHierarchyText(item.objective);
          const s = normalizeHierarchyText(item.actionStep);
          if (g) lastGoal = g;
          if (a) lastAction = a;
          const goalKey = normalizeHierarchyGroupKey(lastGoal) || '__nogoal__';
          const objKey = normalizeHierarchyGroupKey(lastAction);
          if (objKey) {
            if (!seenObjectivePerGoal.has(goalKey)) seenObjectivePerGoal.set(goalKey, new Set());
            const seen = seenObjectivePerGoal.get(goalKey)!;
            if (!seen.has(objKey)) {
              seen.add(objKey);
              ordinalByGoal.set(goalKey, (ordinalByGoal.get(goalKey) ?? 0) + 1);
            }
          }
          if (!s) return; // skip rows without an action step
          if (isSyntheticActionHeaderStep(lastAction, s)) return;
          const objectiveOrdinal = ordinalByGoal.get(goalKey) ?? 0;
          filledItems.push({ item, goal: lastGoal, objective: lastAction, actionStep: s, objectiveOrdinal });
        });
      });

      filledItems.forEach(({ item, goal, objective, actionStep, objectiveOrdinal }) => {
        const status = getItemStatus(item, viewType, term, academicYear);
        const completion = getItemCompletion(item, viewType, term, academicYear);
        const completionValid = typeof completion === 'number' && completion >= 0 && completion <= 100;
        const signal = isNotApplicableStatus(status) ? 'Not Applicable' : mapItemToRiskSignal(status, completion, completionValid, expectedProgress);
        const gap = completion - expectedProgress;

        // Position-based action key: identifies an action by its ordinal within
        // a goal rather than by its (possibly-renamed) title. Step text is
        // still used to disambiguate steps within an action.
        const stepKey = buildExplorerStepKey(item.pillar, goal, objectiveOrdinal, actionStep);
        if (processedKeys.has(stepKey)) return;
        processedKeys.add(stepKey);

        if (!stepMap.has(stepKey)) {
          stepMap.set(stepKey, {
            sourceKey: stepKey,
            sheetRow: item.sheetRow,
            pillar: item.pillar,
            goal: goal || '(Unspecified Goal)',
            objective: objective || '(Unspecified Action)',
            actionStep: actionStep || '(Unnamed Step)',
            units: [],
          });
        }

        const entry = stepMap.get(stepKey)!;
        if (entry.goal === '(Unspecified Goal)' && goal) entry.goal = goal;
        if (entry.objective === '(Unspecified Action)' && objective) entry.objective = objective;
        if (entry.actionStep === '(Unnamed Step)' && actionStep) entry.actionStep = actionStep;

        entry.units.push({
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

    // Step 2: Build goal → objective → actionStep hierarchy.
    // Action grouping key is "pillar|goalKey|act#N" (ordinal-based) so renamed
    // actions don't appear twice. The display label for each action is chosen
    // by majority vote across units, with a longest-label tiebreaker so the
    // latest/expanded title wins ties over short legacy titles.
    const goalMap = new Map<string, GoalNode>();
    const actionLabelVotes = new Map<string, Map<string, number>>();

    for (const entry of stepMap.values()) {
      const goalKey = `${entry.pillar}-${normalizeHierarchyGroupKey(entry.goal) || entry.sourceKey}`;
      if (!goalMap.has(goalKey)) {
        goalMap.set(goalKey, {
          goal: entry.goal,
          pillar: entry.pillar,
          firstRow: entry.sheetRow,
          objectives: [],
          totalActionSteps: 0,
          atRiskCount: 0,
        });
      }
      const goalNode = goalMap.get(goalKey)!;
      goalNode.firstRow = Math.min(goalNode.firstRow, entry.sheetRow);

      // Extract ordinal portion of the source key (e.g. "act#2") as the
      // objective grouping key so renamed actions collapse to a single node.
      const ordinalMatch = entry.sourceKey.match(/act#(\d+)/);
      const objectiveKey = ordinalMatch ? `${goalKey}|${ordinalMatch[0]}` : entry.sourceKey;

      let objNode = goalNode.objectives.find(o => (o as any).__key === objectiveKey);
      if (!objNode) {
        objNode = { objective: entry.objective, firstRow: entry.sheetRow, actionSteps: [] };
        (objNode as any).__key = objectiveKey;
        goalNode.objectives.push(objNode);
      }
      objNode.firstRow = Math.min(objNode.firstRow, entry.sheetRow);

      // Tally objective label votes (weighted by number of units reporting).
      const objNorm = normalizeHierarchyGroupKey(entry.objective);
      if (objNorm) {
        if (!actionLabelVotes.has(objectiveKey)) actionLabelVotes.set(objectiveKey, new Map());
        const votes = actionLabelVotes.get(objectiveKey)!;
        votes.set(entry.objective, (votes.get(entry.objective) ?? 0) + Math.max(1, entry.units.length));
      }

      objNode.actionSteps.push({
        sourceKey: entry.sourceKey,
        actionStep: entry.actionStep,
        sheetRow: entry.sheetRow,
        units: entry.units,
      });

      goalNode.totalActionSteps++;
      goalNode.atRiskCount += entry.units.filter(u => u.riskSignal.includes('Critical') || u.riskSignal.includes('Realized')).length;
    }

    // Resolve majority-vote labels for each objective node.
    for (const g of goalMap.values()) {
      g.objectives.forEach(o => {
        const key = (o as any).__key as string;
        const votes = actionLabelVotes.get(key);
        if (votes && votes.size > 0) {
          const ranked = Array.from(votes.entries()).sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return b[0].length - a[0].length; // tiebreak: longer (likely newer) wins
          });
          o.objective = ranked[0][0];
        }
      });
    }

    // Sort goals, objectives, and action steps by source row for deterministic traceability.
    for (const g of goalMap.values()) {
      g.objectives.sort((a, b) => a.firstRow - b.firstRow || a.objective.localeCompare(b.objective));
      g.objectives.forEach(o => o.actionSteps.sort((a, b) => a.sheetRow - b.sheetRow || a.actionStep.localeCompare(b.actionStep)));
    }

    return Array.from(goalMap.values()).sort((a, b) => {
      const pillarOrder = ['I', 'II', 'III', 'IV', 'V'];
      const pi = pillarOrder.indexOf(a.pillar) - pillarOrder.indexOf(b.pillar);
      if (pi !== 0) return pi;
      const rowDiff = a.firstRow - b.firstRow;
      if (rowDiff !== 0) return rowDiff;
      return a.goal.localeCompare(b.goal);
    });
}

/**
 * Average Completion % for an action step, using the exact per-unit completion
 * values from the Action Explorer model. Units whose status is Not Applicable
 * are excluded; when no valid completion exists the result is null (render N/A).
 */
export function stepAverageCompletion(step: ActionStepNode): number | null {
  const valid = step.units.filter(u => !isNotApplicableStatus(u.status) && typeof u.completion === 'number' && !Number.isNaN(u.completion));
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((s, u) => s + u.completion, 0) / valid.length);
}

/** Lookup of Average Completion % keyed by pillar + normalized step text (and goal). */
export function buildStepCompletionLookup(params: ActionExplorerModelParams): Map<string, number | null> {
  const map = new Map<string, number | null>();
  for (const g of buildActionExplorerModel(params)) {
    for (const o of g.objectives) {
      for (const s of o.actionSteps) {
        const avg = stepAverageCompletion(s);
        const stepKey = normalizeHierarchyMatchKey(s.actionStep);
        if (!stepKey) continue;
        const goalKey = normalizeHierarchyMatchKey(g.goal);
        const withGoal = `${g.pillar}|goal:${goalKey}|step:${stepKey}`;
        const withoutGoal = `${g.pillar}|step:${stepKey}`;
        if (!map.has(withGoal)) map.set(withGoal, avg);
        if (!map.has(withoutGoal)) map.set(withoutGoal, avg);
      }
    }
  }
  return map;
}

export function lookupStepAverageCompletion(
  lookup: Map<string, number | null>,
  pillar: string,
  goal: string,
  actionStep: string,
): number | null {
  const stepKey = normalizeHierarchyMatchKey(actionStep);
  if (!stepKey) return null;
  const goalKey = normalizeHierarchyMatchKey(goal);
  const withGoal = lookup.get(`${pillar}|goal:${goalKey}|step:${stepKey}`);
  if (withGoal !== undefined) return withGoal;
  const withoutGoal = lookup.get(`${pillar}|step:${stepKey}`);
  return withoutGoal === undefined ? null : withoutGoal;
}
