/**
 * Healthcare SP — real-data model (Goal 3 pilot).
 * Mirrors the hc_* tables. Missing structured values are `null` and must be
 * rendered as "Not reported" — never inferred from narrative comments.
 */

export const NOT_REPORTED = 'Not reported' as const;

export type HCReportedStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Blocked';

export interface HCPeriod {
  code: string;
  label: string;
  sortOrder: number;
  isCurrent: boolean;
}

export interface HCQuarterlyUpdate {
  period: string;
  status: HCReportedStatus | null;
  executionProgressPct: number | null;
  kpiActualValue: number | null;
  kpiActualRaw: string | null;
  blockerFlag: string | null;
  blockerCategory: string | null;
  blockerDetails: string | null;
  nextMilestone: string | null;
  expectedMilestoneDate: string | null;
  comments: string | null;
  evidence: string | null;
}

export interface HCKpi {
  originalText: string | null;
  kpiType: string | null;
  targetValue: number | null;
  targetValueRaw: string | null;
  targetUnit: string | null;
  targetDate: string | null;
  /** 'unvalidated' until a stakeholder confirms higher/lower-is-better. */
  direction: 'higher_is_better' | 'lower_is_better' | 'unvalidated';
  measurable: boolean;
}

export interface HCBudgetYear {
  year: string;
  amount: number | null;
  amountRaw: string | null;
  note: string | null;
}

export interface HCStepRecord {
  id: string;
  code: string;
  title: string;
  intent: string | null;
  owner: string | null;
  priority: number | null;
  responsible: string | null;
  accountable: string | null;
  consulted: string | null;
  informed: string | null;
  sourceRow: number | null;
  kpi: HCKpi | null;
  updates: HCQuarterlyUpdate[];
  budget: HCBudgetYear[];
}

export interface HCActionRecord {
  id: string;
  code: string;
  title: string;
  actionKpiText: string | null;
  spoc: string | null;
  steps: HCStepRecord[];
}

export interface HCGoalRecord {
  id: string;
  code: number;
  title: string;
  champion: string | null;
  actions: HCActionRecord[];
}

export interface HCValidationIssue {
  severity: 'error' | 'warning';
  issueCode: string;
  message: string;
  rowRef: string | null;
  field: string | null;
}

export interface HCImportBatch {
  id: string;
  filename: string;
  sourceSheet: string;
  goalScope: string;
  importedAt: string;
  status: string;
  rowCount: number;
  errorCount: number;
  warningCount: number;
  notes: string | null;
}

export interface HCConfig {
  expectedProgressStrategy: 'linear' | 'milestone' | 'manual' | 'not_defined';
  expectedProgressApproved: boolean;
  onBelowTargetEnabled: boolean;
  scheduleVarianceEnabled: boolean;
  inferFundingGapFromZeroBudget: boolean;
  coveragePopulation: string;
  currentPeriod: string | null;
}

export const DEFAULT_HC_CONFIG: HCConfig = {
  expectedProgressStrategy: 'not_defined',
  expectedProgressApproved: false,
  onBelowTargetEnabled: false,
  scheduleVarianceEnabled: false,
  inferFundingGapFromZeroBudget: false,
  coveragePopulation: 'all_applicable_steps',
  currentPeriod: null,
};

export interface HCDataset {
  goals: HCGoalRecord[];
  periods: HCPeriod[];
  currentPeriod: string | null;
  config: HCConfig;
  batch: HCImportBatch | null;
  issues: HCValidationIssue[];
}

export const EMPTY_HC_DATASET: HCDataset = {
  goals: [],
  periods: [],
  currentPeriod: null,
  config: DEFAULT_HC_CONFIG,
  batch: null,
  issues: [],
};
