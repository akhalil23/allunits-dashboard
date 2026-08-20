/**
 * Healthcare SP — derived metrics (Goal 3 pilot).
 *
 * Rules (approved architecture):
 *  - Execution Progress % reported in the source is the only progress source.
 *  - Fallback ONLY: Not Started -> 0, Completed -> 100. In Progress / Blocked stay null.
 *  - Nothing is inferred from narrative comments.
 *  - Expected Progress, On/Below Target and Schedule Variance are disabled until
 *    stakeholder validation (hc_config).
 *  - Funding Gap is never inferred from a zero / missing planned budget.
 */
import type {
  HCActionRecord, HCConfig, HCDataset, HCGoalRecord, HCReportedStatus, HCStepRecord,
} from './model';

export type ProgressSource = 'reported' | 'status_fallback' | 'not_reported';

export interface StepProgress {
  value: number | null;
  source: ProgressSource;
  period: string | null;
}

export interface AggregateProgress {
  value: number | null;
  counted: number;
  notReported: number;
  total: number;
}

export const flattenSteps = (goals: HCGoalRecord[]) =>
  goals.flatMap(g => g.actions.flatMap(a => a.steps.map(step => ({ goal: g, action: a, step }))));

export const actionSteps = (a: HCActionRecord) => a.steps;
export const goalSteps = (g: HCGoalRecord) => g.actions.flatMap(a => a.steps);

/** Update for a given period (or the latest one holding any structured value). */
export function updateFor(step: HCStepRecord, period: string | null) {
  if (!period) return step.updates[step.updates.length - 1] ?? null;
  return step.updates.find(u => u.period === period) ?? null;
}

/** Latest reported status across periods (chronological), or null. */
export function latestStatus(step: HCStepRecord): { status: HCReportedStatus | null; period: string | null } {
  for (let i = step.updates.length - 1; i >= 0; i--) {
    if (step.updates[i].status) return { status: step.updates[i].status, period: step.updates[i].period };
  }
  return { status: null, period: null };
}

export function stepProgress(step: HCStepRecord): StepProgress {
  for (let i = step.updates.length - 1; i >= 0; i--) {
    const u = step.updates[i];
    if (u.executionProgressPct !== null) {
      return { value: u.executionProgressPct, source: 'reported', period: u.period };
    }
  }
  const { status, period } = latestStatus(step);
  if (status === 'Not Started') return { value: 0, source: 'status_fallback', period };
  if (status === 'Completed') return { value: 100, source: 'status_fallback', period };
  return { value: null, source: 'not_reported', period: null };
}

function aggregate(steps: HCStepRecord[]): AggregateProgress {
  const values = steps.map(stepProgress);
  const counted = values.filter(v => v.value !== null).map(v => v.value as number);
  return {
    value: counted.length ? Math.round(counted.reduce((a, b) => a + b, 0) / counted.length) : null,
    counted: counted.length,
    notReported: values.length - counted.length,
    total: steps.length,
  };
}

export const actionProgress = (a: HCActionRecord) => aggregate(a.steps);
export const goalProgressAgg = (g: HCGoalRecord) => aggregate(goalSteps(g));
export const portfolioProgress = (goals: HCGoalRecord[]) => aggregate(goals.flatMap(goalSteps));

/** Status distribution — unreported statuses are counted separately, never inferred. */
export function statusDistribution(goals: HCGoalRecord[]) {
  const out: Record<HCReportedStatus | 'Not reported', number> = {
    'Not Started': 0, 'In Progress': 0, 'Completed': 0, 'Blocked': 0, 'Not reported': 0,
  };
  for (const { step } of flattenSteps(goals)) {
    const { status } = latestStatus(step);
    out[status ?? 'Not reported']++;
  }
  return out;
}

// ── KPI ────────────────────────────────────────────────────────────────────
export type KpiVerdict = 'Achieved' | 'On Target' | 'Below Target' | 'Not Yet Measurable' | 'Pending methodology';

export interface KpiEvaluation {
  achievementPct: number | null;
  verdict: KpiVerdict;
  actual: number | null;
  target: number | null;
  reason: string;
}

export function evaluateKpi(step: HCStepRecord, config: HCConfig, period: string | null): KpiEvaluation {
  const kpi = step.kpi;
  const base = { achievementPct: null, actual: null, target: kpi?.targetValue ?? null };
  if (!kpi || kpi.targetValue === null) {
    return { ...base, verdict: 'Not Yet Measurable', reason: 'No numeric KPI target in source' };
  }
  const actual = (() => {
    const u = updateFor(step, period);
    if (u?.kpiActualValue !== null && u?.kpiActualValue !== undefined) return u.kpiActualValue;
    for (let i = step.updates.length - 1; i >= 0; i--) {
      if (step.updates[i].kpiActualValue !== null) return step.updates[i].kpiActualValue;
    }
    return null;
  })();
  if (actual === null) {
    return { ...base, verdict: 'Not Yet Measurable', reason: 'KPI actual value not reported' };
  }
  if (kpi.direction === 'unvalidated') {
    return { ...base, actual, verdict: 'Not Yet Measurable', reason: 'KPI direction awaiting validation' };
  }
  const pct = kpi.direction === 'higher_is_better'
    ? (actual / kpi.targetValue) * 100
    : (kpi.targetValue / (actual || 1)) * 100;
  const achievementPct = Math.round(pct);
  if (achievementPct >= 100) {
    return { achievementPct, actual, target: kpi.targetValue, verdict: 'Achieved', reason: 'Actual meets or exceeds target' };
  }
  if (!config.onBelowTargetEnabled) {
    return { achievementPct, actual, target: kpi.targetValue, verdict: 'Pending methodology', reason: 'On/Below Target rule not yet approved' };
  }
  return { achievementPct, actual, target: kpi.targetValue, verdict: 'Below Target', reason: 'Below approved expected trajectory' };
}

// ── At-risk signals ────────────────────────────────────────────────────────
export interface RiskSignal { key: string; label: string; reason: string; }

export function atRiskSignals(step: HCStepRecord, config: HCConfig, currentPeriod: string | null): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const { status } = latestStatus(step);
  const cur = updateFor(step, currentPeriod);

  if (status === 'Blocked') signals.push({ key: 'blocked', label: 'Blocked', reason: 'Latest reported status is Blocked' });
  if (cur?.blockerFlag && cur.blockerFlag.toLowerCase() === 'yes') {
    signals.push({
      key: 'blocker',
      label: 'Blocker raised',
      reason: `Blocker reported${cur.blockerCategory ? ` (${cur.blockerCategory})` : ''}${cur.blockerDetails ? `: ${cur.blockerDetails}` : ''}`,
    });
  }
  const hasUpdate = !!cur && (
    cur.status !== null || cur.executionProgressPct !== null || !!cur.comments ||
    cur.kpiActualValue !== null || !!cur.nextMilestone
  );
  if (!hasUpdate) {
    signals.push({ key: 'missing_update', label: 'No current update', reason: `No ${currentPeriod ?? 'current period'} update reported` });
  }
  const due = parseMilestoneDate(cur?.expectedMilestoneDate ?? null);
  if (due && due.getTime() < Date.now() && status !== 'Completed') {
    signals.push({ key: 'overdue_milestone', label: 'Overdue milestone', reason: `Expected milestone date ${cur?.expectedMilestoneDate} has passed` });
  }
  // Trajectory signals stay dormant until an expected-progress rule is approved.
  if (config.expectedProgressApproved && config.expectedProgressStrategy !== 'not_defined') {
    // reserved — no rule approved yet
  }
  return signals;
}

export const isAtRisk = (step: HCStepRecord, config: HCConfig, period: string | null) =>
  atRiskSignals(step, config, period).length > 0;

export function parseMilestoneDate(raw: string | null): Date | null {
  if (!raw) return null;
  const q = raw.match(/^Q([1-4])\s*(\d{4})$/i);
  if (q) {
    const endMonth = Number(q[1]) * 3; // end of quarter
    return new Date(Number(q[2]), endMonth, 0);
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ── Reporting coverage ─────────────────────────────────────────────────────
export function reportingCoverage(goals: HCGoalRecord[], currentPeriod: string | null) {
  const steps = flattenSteps(goals).map(x => x.step);
  const reported = steps.filter(s => {
    const u = updateFor(s, currentPeriod);
    return !!u && (u.status !== null || u.executionProgressPct !== null || !!u.comments || u.kpiActualValue !== null || !!u.nextMilestone);
  }).length;
  return {
    value: steps.length ? Math.round((reported / steps.length) * 100) : null,
    reported,
    total: steps.length,
    missing: steps.length - reported,
  };
}

export function structuredFieldCoverage(goals: HCGoalRecord[], currentPeriod: string | null) {
  const steps = flattenSteps(goals).map(x => x.step);
  const count = (fn: (u: ReturnType<typeof updateFor>) => boolean) =>
    steps.filter(s => fn(updateFor(s, currentPeriod))).length;
  return {
    total: steps.length,
    status: count(u => !!u?.status),
    progress: count(u => u?.executionProgressPct !== null && u?.executionProgressPct !== undefined),
    kpiActual: count(u => u?.kpiActualValue !== null && u?.kpiActualValue !== undefined),
    blocker: count(u => !!u?.blockerFlag),
    milestone: count(u => !!u?.nextMilestone),
    comments: count(u => !!u?.comments),
  };
}

// ── Budget ─────────────────────────────────────────────────────────────────
export function budgetTotal(steps: HCStepRecord[]) {
  let total = 0;
  let unquantified = 0;
  for (const s of steps) {
    for (const b of s.budget) {
      if (b.amount !== null) total += b.amount;
      else if (b.amountRaw) unquantified++;
    }
  }
  return { total, unquantified };
}

export function budgetByYear(goals: HCGoalRecord[]) {
  const map = new Map<string, { amount: number; unquantified: number }>();
  for (const { step } of flattenSteps(goals)) {
    for (const b of step.budget) {
      const cur = map.get(b.year) ?? { amount: 0, unquantified: 0 };
      if (b.amount !== null) cur.amount += b.amount;
      else if (b.amountRaw) cur.unquantified += 1;
      map.set(b.year, cur);
    }
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, v]) => ({ year, ...v }));
}

export function fmtCurrency(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

export const pctLabel = (v: number | null) => (v === null ? 'Not reported' : `${v}%`);
export const textOr = (v: string | null | undefined, fallback = 'Not reported') => (v && v.length ? v : fallback);

export function datasetSummary(ds: HCDataset) {
  const steps = flattenSteps(ds.goals);
  return {
    goals: ds.goals.length,
    actions: ds.goals.reduce((a, g) => a + g.actions.length, 0),
    steps: steps.length,
    periods: ds.periods.length,
  };
}
