/**
 * Healthcare SP Assistant — deterministic context builder.
 *
 * The assistant NEVER recalculates business metrics. Every number below is
 * produced by the same governed calculation layer the dashboard renders
 * (src/lib/healthcare/metrics.ts). The LLM only explains these values.
 *
 * Each value is tagged as:
 *   source     — imported verbatim from the Healthcare SP working file
 *   derived    — computed by the deterministic Healthcare layer
 *   missing    — not reported (never inferred, never zero-filled)
 *   disabled   — methodology not yet approved
 */
import type { HCDataset, HCStepRecord } from './model';
import {
  flattenSteps, stepProgress, latestStatus, actionProgress, goalProgressAgg,
  portfolioProgress, statusDistribution, evaluateKpi, atRiskSignals,
  reportingCoverage, structuredFieldCoverage, budgetTotal, budgetByYear,
  parseMilestoneDate, updateFor,
} from './metrics';

export interface HCAssistantScope {
  /** Dashboard tab the assistant was opened from. */
  tab?: string;
  goalCode?: number | null;
  actionCode?: string | null;
  stepCode?: string | null;
}

const NR = null;

function stepPayload(step: HCStepRecord, ds: HCDataset, goalCode: number, actionCode: string) {
  const prog = stepProgress(step);
  const { status, period: statusPeriod } = latestStatus(step);
  const kpi = evaluateKpi(step, ds.config, ds.currentPeriod);
  const signals = atRiskSignals(step, ds.config, ds.currentPeriod);
  const cur = updateFor(step, ds.currentPeriod);
  const due = parseMilestoneDate(cur?.expectedMilestoneDate ?? null);

  return {
    goalCode,
    actionCode,
    stepCode: step.code,
    title: step.title,
    source: {
      intent: step.intent ?? NR,
      owner: step.owner ?? NR,
      raci: {
        responsible: step.responsible ?? NR,
        accountable: step.accountable ?? NR,
        consulted: step.consulted ?? NR,
        informed: step.informed ?? NR,
      },
      reportedStatus: status ?? NR,
      reportedStatusPeriod: statusPeriod ?? NR,
      reportedExecutionProgressPct:
        prog.source === 'reported' ? prog.value : NR,
      kpi: step.kpi
        ? {
            originalText: step.kpi.originalText ?? NR,
            kpiType: step.kpi.kpiType ?? NR,
            targetValue: step.kpi.targetValue ?? NR,
            targetValueRaw: step.kpi.targetValueRaw ?? NR,
            targetUnit: step.kpi.targetUnit ?? NR,
            targetDate: step.kpi.targetDate ?? NR,
            direction: step.kpi.direction,
          }
        : NR,
      plannedBudget: step.budget.map(b => ({
        year: b.year, amount: b.amount, amountRaw: b.amountRaw, note: b.note,
      })),
      updates: step.updates.map(u => ({
        period: u.period,
        status: u.status ?? NR,
        executionProgressPct: u.executionProgressPct,
        kpiActualValue: u.kpiActualValue,
        kpiActualRaw: u.kpiActualRaw ?? NR,
        blockerFlag: u.blockerFlag ?? NR,
        blockerCategory: u.blockerCategory ?? NR,
        blockerDetails: u.blockerDetails ?? NR,
        nextMilestone: u.nextMilestone ?? NR,
        expectedMilestoneDate: u.expectedMilestoneDate ?? NR,
        narrativeComments: u.comments ?? NR,
        evidence: u.evidence ?? NR,
      })),
    },
    derived: {
      progressPct: prog.value,
      progressSource: prog.source, // reported | status_fallback | not_reported
      progressPeriod: prog.period ?? NR,
      kpiAchievementPct: kpi.achievementPct,
      kpiVerdict: kpi.verdict,
      kpiReason: kpi.reason,
      atRisk: signals.length > 0,
      atRiskSignals: signals.map(s => ({ key: s.key, label: s.label, reason: s.reason })),
      milestoneOverdue: !!(due && due.getTime() < Date.now() && status !== 'Completed'),
      hasCurrentPeriodUpdate: signals.every(s => s.key !== 'missing_update'),
      plannedBudgetTotal: budgetTotal([step]).total,
    },
  };
}

export function buildHealthcareAssistantContext(ds: HCDataset, scope: HCAssistantScope = {}) {
  const allSteps = flattenSteps(ds.goals);
  const coverage = reportingCoverage(ds.goals, ds.currentPeriod);
  const fieldCoverage = structuredFieldCoverage(ds.goals, ds.currentPeriod);
  const portfolio = portfolioProgress(ds.goals);
  const budget = budgetTotal(allSteps.map(x => x.step));

  const steps = allSteps.map(({ goal, action, step }) =>
    stepPayload(step, ds, goal.code, action.code));

  const goals = ds.goals.map(g => {
    const agg = goalProgressAgg(g);
    return {
      goalCode: g.code,
      title: g.title,
      champion: g.champion ?? NR,
      derived: {
        progressPct: agg.value,
        stepsCounted: agg.counted,
        stepsNotReported: agg.notReported,
        totalSteps: agg.total,
        plannedBudgetTotal: budgetTotal(g.actions.flatMap(a => a.steps)).total,
      },
      actions: g.actions.map(a => {
        const ap = actionProgress(a);
        return {
          actionCode: a.code,
          title: a.title,
          spoc: a.spoc ?? NR,
          actionKpiText: a.actionKpiText ?? NR,
          derived: {
            progressPct: ap.value,
            stepsCounted: ap.counted,
            stepsNotReported: ap.notReported,
            totalSteps: ap.total,
            plannedBudgetTotal: budgetTotal(a.steps).total,
          },
          stepCodes: a.steps.map(s => s.code),
        };
      }),
    };
  });

  const blockers = steps
    .filter(s => s.derived.atRiskSignals.some(x => x.key === 'blocked' || x.key === 'blocker'))
    .map(s => ({
      stepCode: s.stepCode, title: s.title, actionCode: s.actionCode,
      reasons: s.derived.atRiskSignals.map(x => x.reason),
    }));

  const milestones = steps.flatMap(s => {
    const latest = [...s.source.updates].reverse().find(u => u.nextMilestone || u.expectedMilestoneDate);
    if (!latest) return [];
    return [{
      stepCode: s.stepCode,
      nextMilestone: latest.nextMilestone,
      expectedMilestoneDate: latest.expectedMilestoneDate,
      overdue: s.derived.milestoneOverdue,
      period: latest.period,
    }];
  });

  return {
    scope: {
      module: 'Healthcare Strategic Plan',
      pilot: 'Goal 3 real-data pilot',
      importedGoalCodes: ds.goals.map(g => g.code),
      note: 'Healthcare Goals outside the imported list are NOT part of this pilot. They are not zero-performing — they simply have no data yet.',
      currentPeriod: ds.currentPeriod,
      periods: ds.periods.map(p => ({ code: p.code, label: p.label, isCurrent: p.isCurrent })),
      dashboardContext: {
        tab: scope.tab ?? null,
        goalCode: scope.goalCode ?? null,
        actionCode: scope.actionCode ?? null,
        stepCode: scope.stepCode ?? null,
      },
    },
    methodologyFlags: {
      enabled: [
        'Reported status',
        'Reported Execution Progress %',
        'Status fallback (Not Started → 0%, Completed → 100%)',
        'Reporting Coverage',
        'Structured blockers',
        'Milestone dates where reported',
        'Planned budget analytics',
        'KPI Achievement where target + actual + validated direction exist',
        'Transparent At-Risk signals (Blocked, blocker flag, missing current-period update, overdue milestone)',
      ],
      disabled: {
        expectedProgress: ds.config.expectedProgressApproved ? 'enabled' : 'disabled_pending_methodology',
        actualVsExpected: 'disabled_pending_methodology',
        scheduleVariance: ds.config.scheduleVarianceEnabled ? 'enabled' : 'disabled_pending_methodology',
        onBelowTarget: ds.config.onBelowTargetEnabled ? 'enabled' : 'disabled_pending_methodology',
        onTargetRate: 'disabled_pending_methodology',
        trajectoryRiskSignals: 'disabled_pending_methodology',
        compositeRiskIndex: 'not_active_in_phase_1',
      },
      notAvailableFromSource: [
        'Actual expenditure',
        'Committed expenditure',
        'Budget forecast / financial variance',
        'Funding source breakdown',
      ],
      inferFundingGapFromZeroBudget: ds.config.inferFundingGapFromZeroBudget,
      coveragePopulation: ds.config.coveragePopulation,
    },
    derivedPortfolio: {
      progressPct: portfolio.value,
      stepsCounted: portfolio.counted,
      stepsNotReported: portfolio.notReported,
      totalSteps: portfolio.total,
      statusDistribution: statusDistribution(ds.goals),
      reportingCoverage: coverage,
      structuredFieldCoverage: fieldCoverage,
      atRiskStepCount: steps.filter(s => s.derived.atRisk).length,
      plannedBudget: {
        total: budget.total,
        unquantifiedCells: budget.unquantified,
        byYear: budgetByYear(ds.goals),
        note: 'Planned budget only. No actual spend exists in the source.',
      },
    },
    goals,
    steps,
    blockers,
    milestones,
    dataQuality: {
      importBatch: ds.batch,
      validationIssues: ds.issues.slice(0, 60),
      issueCount: ds.issues.length,
    },
  };
}

export type HCAssistantContext = ReturnType<typeof buildHealthcareAssistantContext>;

/** Starter prompts — only for capabilities that are actually enabled. */
export function healthcareSuggestedPrompts(ctx: HCAssistantContext): string[] {
  const out: string[] = [];
  const goalCode = ctx.scope.dashboardContext.goalCode ?? ctx.scope.importedGoalCodes[0];
  if (goalCode) out.push(`Give me an executive summary of Goal ${goalCode}`);
  if (ctx.derivedPortfolio.reportingCoverage.missing > 0) out.push('Which action steps have not reported this period?');
  if (ctx.blockers.length > 0) out.push('What are the current blockers?');
  if (ctx.milestones.some(m => m.overdue)) out.push('Which milestones are overdue?');
  out.push('Which KPIs can currently be measured?');
  if (ctx.derivedPortfolio.plannedBudget.total > 0) out.push('Explain the planned budget');
  out.push('What information is currently missing?');
  return out.slice(0, 6);
}
