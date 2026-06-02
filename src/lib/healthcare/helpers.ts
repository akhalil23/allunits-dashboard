// Healthcare-native derivations. Source of truth for the dashboard.
import type { HCGoal, HCAction, HCStep, HCStatus, HCRiskFlag } from './types';
import { HEALTHCARE_GOALS } from './sample-data';

export type HC4State = 'Not Started' | 'In Progress' | 'Done' | 'Blocked';

const LEGACY_MAP: Record<HCStatus, HC4State> = {
  'Not Started': 'Not Started',
  'In Progress': 'In Progress',
  'Done': 'Done',
  'Blocked': 'Blocked',
  'On Target': 'In Progress',
  'Below Target': 'In Progress',
  'N/A': 'Not Started',
};

/** Authoritative 4-state status for the step (latest non-empty quarterly + blocker override). */
export function effectiveStatus(s: HCStep): HC4State {
  if (s.blocker) return 'Blocked';
  const last = [...s.quarterly].reverse().find(q => q.status && q.status !== 'N/A');
  if (!last) return 'Not Started';
  return LEGACY_MAP[last.status];
}

export function allSteps(goals: HCGoal[] = HEALTHCARE_GOALS) {
  return goals.flatMap(g => g.actions.flatMap(a => a.steps.map(step => ({ goal: g, action: a, step }))));
}

export function statusDistribution4(goals: HCGoal[] = HEALTHCARE_GOALS) {
  const out: Record<HC4State, number> = { 'Not Started': 0, 'In Progress': 0, 'Done': 0, 'Blocked': 0 };
  for (const { step } of allSteps(goals)) out[effectiveStatus(step)]++;
  return out;
}

// ──────────────────────────────────────────────────────────────────────────
// Completion methodology (v2 — prototype, pending stakeholder validation)
// Blocked → excluded from denominator and reported separately.
// ──────────────────────────────────────────────────────────────────────────
export const COMPLETION_WEIGHTS: Record<Exclude<HC4State, 'Blocked'>, number> = {
  'Not Started': 0,
  'In Progress': 50,
  'Done': 100,
};

export function stepCompletion(s: HCStep): { value: number | null; excluded: boolean } {
  const st = effectiveStatus(s);
  if (st === 'Blocked') return { value: null, excluded: true };
  return { value: COMPLETION_WEIGHTS[st], excluded: false };
}

function meanCompletion(steps: HCStep[]) {
  const vals = steps.map(stepCompletion);
  const counted = vals.filter(v => v.value !== null).map(v => v.value as number);
  const blocked = vals.filter(v => v.excluded).length;
  if (!counted.length) return { value: 0, blocked, total: steps.length };
  return {
    value: Math.round(counted.reduce((a, b) => a + b, 0) / counted.length),
    blocked,
    total: steps.length,
  };
}

export function actionCompletion(a: HCAction) { return meanCompletion(a.steps); }
export function goalCompletion(g: HCGoal) { return meanCompletion(g.actions.flatMap(a => a.steps)); }
export function portfolioCompletion(goals: HCGoal[] = HEALTHCARE_GOALS) {
  return meanCompletion(goals.flatMap(g => g.actions.flatMap(a => a.steps)));
}

/** Legacy compatibility — returns just the % value (blocked excluded). */
export function goalProgress(g: HCGoal) { return goalCompletion(g).value; }

export function goalBudget(g: HCGoal) {
  return g.actions.flatMap(a => a.steps).reduce(
    (sum, s) => sum + s.budget.reduce((b, y) => b + (y.amount || 0), 0), 0
  );
}

export function goalRiskFlag(g: HCGoal): HCRiskFlag {
  const order: Record<HCRiskFlag, number> = { 'None': 0, 'Low': 1, 'Medium': 2, 'High': 3 };
  return g.actions.flatMap(a => a.steps).reduce<HCRiskFlag>(
    (acc, s) => order[s.riskFlag] > order[acc] ? s.riskFlag : acc, 'None'
  );
}

export function blockedItems(goals: HCGoal[] = HEALTHCARE_GOALS) {
  return allSteps(goals).filter(x => effectiveStatus(x.step) === 'Blocked');
}

// ──────────────────────────────────────────────────────────────────────────
// Risk Index (v2) — 4 equally-weighted binary signals → 0..100
// ──────────────────────────────────────────────────────────────────────────
export const CURRENT_QUARTER = 'Q2 2026';
export const RISK_SIGNAL_WEIGHT = 25;

export interface HCRiskSignals {
  blocked: boolean;
  missingUpdate: boolean;
  fundingGap: boolean;
  governanceGap: boolean;
}

export function riskSignals(s: HCStep): HCRiskSignals {
  const blocked = effectiveStatus(s) === 'Blocked';
  const cq = s.quarterly.find(q => q.period === CURRENT_QUARTER);
  const missingUpdate = !cq || (!cq.note && (!cq.status || cq.status === 'N/A'));
  const fundingGap = !s.budget.some(b => (b.amount || 0) > 0);
  const governanceGap = !s.responsible || !s.accountable;
  return { blocked, missingUpdate, fundingGap, governanceGap };
}

export function riskIndex(s: HCStep) {
  const sig = riskSignals(s);
  const fired = (Object.values(sig).filter(Boolean) as boolean[]).length;
  return { score: fired * RISK_SIGNAL_WEIGHT, signals: sig, fired };
}

export function riskBand(score: number): 'Low' | 'Moderate' | 'Elevated' | 'Severe' {
  if (score >= 75) return 'Severe';
  if (score >= 50) return 'Elevated';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

const meanRisk = (steps: HCStep[]) =>
  !steps.length ? 0 : Math.round(steps.reduce((a, s) => a + riskIndex(s).score, 0) / steps.length);

export function actionRiskIndex(a: HCAction) { return meanRisk(a.steps); }
export function goalRiskIndex(g: HCGoal) { return meanRisk(g.actions.flatMap(a => a.steps)); }
export function portfolioRiskIndex(goals: HCGoal[] = HEALTHCARE_GOALS) {
  return meanRisk(goals.flatMap(g => g.actions.flatMap(a => a.steps)));
}

// ──────────────────────────────────────────────────────────────────────────
// Reporting coverage — % of steps with a non-empty CURRENT_QUARTER update
// ──────────────────────────────────────────────────────────────────────────
export function reportingCoverage(goals: HCGoal[] = HEALTHCARE_GOALS) {
  const steps = allSteps(goals).map(x => x.step);
  if (!steps.length) return { value: 0, reported: 0, total: 0 };
  const reported = steps.filter(s => {
    const cq = s.quarterly.find(q => q.period === CURRENT_QUARTER);
    return !!cq && (!!cq.note || (!!cq.status && cq.status !== 'N/A'));
  }).length;
  return { value: Math.round((reported / steps.length) * 100), reported, total: steps.length };
}

export function budgetByYear(goals: HCGoal[] = HEALTHCARE_GOALS) {
  const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
  const map: Record<string, number> = Object.fromEntries(years.map(y => [y, 0]));
  for (const { step } of allSteps(goals)) {
    for (const y of step.budget) map[y.year] = (map[y.year] || 0) + (y.amount || 0);
  }
  return years.map(y => ({ year: y, amount: map[y] }));
}

export function budgetBySource(goals: HCGoal[] = HEALTHCARE_GOALS) {
  const map: Record<string, number> = {};
  for (const { step } of allSteps(goals)) {
    for (const y of step.budget) {
      const src = y.source || 'Operational';
      map[src] = (map[src] || 0) + (y.amount || 0);
    }
  }
  return Object.entries(map).map(([source, amount]) => ({ source, amount }));
}

/** Detect missing RACI roles per step. */
export function raciGaps(step: HCStep) {
  const gaps: string[] = [];
  if (!step.responsible) gaps.push('R');
  if (!step.accountable) gaps.push('A');
  if (!step.consulted) gaps.push('C');
  if (!step.informed) gaps.push('I');
  return gaps;
}

export function fmtCurrency(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

export const STATUS4_COLOR: Record<HC4State, string> = {
  'Done': 'bg-emerald-500',
  'In Progress': 'bg-blue-500',
  'Not Started': 'bg-zinc-500',
  'Blocked': 'bg-red-500',
};

export const RISK_COLOR: Record<HCRiskFlag, string> = {
  'None': 'text-emerald-300 border-emerald-500/40 bg-emerald-500/5',
  'Low': 'text-sky-300 border-sky-500/40 bg-sky-500/5',
  'Medium': 'text-amber-300 border-amber-500/40 bg-amber-500/5',
  'High': 'text-red-300 border-red-500/40 bg-red-500/5',
};
