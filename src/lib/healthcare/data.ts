/**
 * Healthcare SP — data access (Goal 3 pilot).
 * Reads the latest active import batch from the hc_* tables. Nothing is inferred:
 * blank source cells arrive here as null and stay null.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_HC_CONFIG, EMPTY_HC_DATASET,
  type HCConfig, type HCDataset, type HCGoalRecord, type HCPeriod,
  type HCReportedStatus, type HCStepRecord,
} from './model';

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null;
const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\u00a0/g, ' ').trim();
  return s.length ? s : null;
};
const VALID_STATUS: HCReportedStatus[] = ['Not Started', 'In Progress', 'Completed', 'Blocked'];
const status = (v: unknown): HCReportedStatus | null => {
  const s = str(v);
  return s && (VALID_STATUS as string[]).includes(s) ? (s as HCReportedStatus) : null;
};

function parseConfig(rows: { key: string; value: unknown }[]): HCConfig {
  const get = (k: string) => rows.find(r => r.key === k)?.value as Record<string, unknown> | undefined;
  const ep = get('expected_progress_strategy');
  const pv = get('performance_verdicts_enabled');
  const fg = get('funding_gap_rule');
  const cov = get('reporting_coverage_rule');
  const cp = get('current_period');
  return {
    expectedProgressStrategy: (ep?.strategy as HCConfig['expectedProgressStrategy']) ?? DEFAULT_HC_CONFIG.expectedProgressStrategy,
    expectedProgressApproved: Boolean(ep?.approved ?? false),
    onBelowTargetEnabled: Boolean(pv?.on_below_target ?? false),
    scheduleVarianceEnabled: Boolean(pv?.schedule_variance ?? false),
    inferFundingGapFromZeroBudget: Boolean(fg?.infer_from_zero_budget ?? false),
    coveragePopulation: (cov?.population as string) ?? DEFAULT_HC_CONFIG.coveragePopulation,
    currentPeriod: (cp?.code as string) ?? null,
  };
}

export async function fetchHealthcareDataset(): Promise<HCDataset> {
  const [batchRes, periodRes, configRes, goalRes] = await Promise.all([
    supabase.from('hc_import_batches').select('*').eq('status', 'active').order('imported_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('hc_periods').select('*').order('sort_order'),
    supabase.from('hc_config').select('key, value'),
    supabase.from('hc_goals').select('*').order('display_order'),
  ]);

  if (goalRes.error) throw goalRes.error;
  const goalRows = goalRes.data ?? [];
  if (!goalRows.length) return EMPTY_HC_DATASET;

  const goalIds = goalRows.map(g => g.id);
  const { data: actionRows, error: actionErr } = await supabase
    .from('hc_actions').select('*').in('goal_id', goalIds).order('display_order');
  if (actionErr) throw actionErr;
  const actionIds = (actionRows ?? []).map(a => a.id);

  const { data: stepRows, error: stepErr } = actionIds.length
    ? await supabase.from('hc_action_steps').select('*').in('action_id', actionIds).order('display_order')
    : { data: [], error: null } as const;
  if (stepErr) throw stepErr;
  const stepIds = (stepRows ?? []).map(s => s.id);

  const [kpiRes, updateRes, budgetRes, issueRes] = await Promise.all([
    stepIds.length ? supabase.from('hc_kpis').select('*').in('step_id', stepIds) : Promise.resolve({ data: [], error: null } as never),
    stepIds.length ? supabase.from('hc_quarterly_updates').select('*').in('step_id', stepIds) : Promise.resolve({ data: [], error: null } as never),
    stepIds.length ? supabase.from('hc_budget_years').select('*').in('step_id', stepIds) : Promise.resolve({ data: [], error: null } as never),
    batchRes.data?.id
      ? supabase.from('hc_validation_issues').select('*').eq('batch_id', batchRes.data.id)
      : Promise.resolve({ data: [], error: null } as never),
  ]);

  const periods: HCPeriod[] = (periodRes.data ?? []).map(p => ({
    code: p.code, label: p.label, sortOrder: p.sort_order, isCurrent: p.is_current,
  }));
  const periodOrder = new Map(periods.map(p => [p.code, p.sortOrder]));
  const config = parseConfig((configRes.data ?? []) as { key: string; value: unknown }[]);
  const currentPeriod = config.currentPeriod ?? periods.find(p => p.isCurrent)?.code ?? periods[periods.length - 1]?.code ?? null;

  const kpiByStep = new Map((kpiRes.data ?? []).map((k: Record<string, unknown>) => [k.step_id as string, k]));
  const updatesByStep = new Map<string, Record<string, unknown>[]>();
  for (const u of (updateRes.data ?? []) as Record<string, unknown>[]) {
    const key = u.step_id as string;
    if (!updatesByStep.has(key)) updatesByStep.set(key, []);
    updatesByStep.get(key)!.push(u);
  }
  const budgetByStep = new Map<string, Record<string, unknown>[]>();
  for (const b of (budgetRes.data ?? []) as Record<string, unknown>[]) {
    const key = b.step_id as string;
    if (!budgetByStep.has(key)) budgetByStep.set(key, []);
    budgetByStep.get(key)!.push(b);
  }

  const steps: HCStepRecord[] = (stepRows ?? []).map(s => {
    const k = kpiByStep.get(s.id) as Record<string, unknown> | undefined;
    return {
      id: s.id,
      code: s.code,
      title: s.title,
      intent: str(s.intent),
      owner: str(s.owner),
      priority: s.priority ?? null,
      responsible: str(s.responsible),
      accountable: str(s.accountable),
      consulted: str(s.consulted),
      informed: str(s.informed),
      sourceRow: s.source_row ?? null,
      kpi: k
        ? {
            originalText: str(k.original_text),
            kpiType: str(k.kpi_type),
            targetValue: num(k.target_value),
            targetValueRaw: str(k.target_value_raw),
            targetUnit: str(k.target_unit),
            targetDate: str(k.target_date_raw),
            direction: (str(k.direction) as 'higher_is_better' | 'lower_is_better' | 'unvalidated') ?? 'unvalidated',
            measurable: Boolean(k.measurable),
          }
        : null,
      updates: (updatesByStep.get(s.id) ?? [])
        .map(u => ({
          period: String(u.period_code),
          status: status(u.status),
          executionProgressPct: num(u.execution_progress_pct),
          kpiActualValue: num(u.kpi_actual_value),
          kpiActualRaw: str(u.kpi_actual_raw),
          blockerFlag: str(u.blocker_flag),
          blockerCategory: str(u.blocker_category),
          blockerDetails: str(u.blocker_details),
          nextMilestone: str(u.next_milestone),
          expectedMilestoneDate: str(u.expected_milestone_date_raw),
          comments: str(u.comments),
          evidence: str(u.evidence),
        }))
        .sort((a, b) => (periodOrder.get(a.period) ?? 0) - (periodOrder.get(b.period) ?? 0)),
      budget: (budgetByStep.get(s.id) ?? [])
        .map(b => ({
          year: String(b.year_label),
          amount: num(b.amount),
          amountRaw: str(b.amount_raw),
          note: str(b.note),
        }))
        .sort((a, b) => a.year.localeCompare(b.year)),
    };
  });

  const stepsByAction = new Map<string, HCStepRecord[]>();
  (stepRows ?? []).forEach((row, i) => {
    const list = stepsByAction.get(row.action_id) ?? [];
    list.push(steps[i]);
    stepsByAction.set(row.action_id, list);
  });

  const goals: HCGoalRecord[] = goalRows.map(g => ({
    id: g.id,
    code: g.code,
    title: g.title,
    champion: str(g.champion),
    actions: (actionRows ?? [])
      .filter(a => a.goal_id === g.id)
      .map(a => ({
        id: a.id,
        code: a.code,
        title: a.title,
        actionKpiText: str(a.action_kpi_text),
        spoc: str(a.spoc),
        steps: stepsByAction.get(a.id) ?? [],
      })),
  }));

  return {
    goals,
    periods,
    currentPeriod,
    config,
    batch: batchRes.data
      ? {
          id: batchRes.data.id,
          filename: batchRes.data.filename,
          sourceSheet: batchRes.data.source_sheet,
          goalScope: batchRes.data.goal_scope,
          importedAt: batchRes.data.imported_at,
          status: batchRes.data.status,
          rowCount: batchRes.data.row_count,
          errorCount: batchRes.data.error_count,
          warningCount: batchRes.data.warning_count,
          notes: str(batchRes.data.notes),
        }
      : null,
    issues: ((issueRes as { data?: Record<string, unknown>[] }).data ?? []).map(i => ({
      severity: (String(i.severity) === 'error' ? 'error' : 'warning') as 'error' | 'warning',
      issueCode: String(i.issue_code),
      message: String(i.message),
      rowRef: str(i.row_ref),
      field: str(i.field),
    })),
  };
}
