import type { ActionItem, Qualifier, QualifierResult, QualifierDistributionItem, ViewType, AcademicYear, Term, TermData, DataQuality } from './types';
import { getTermWindowKey, isNotApplicableStatus } from './types';
import { AY_BOUNDARIES, QUALIFIER_COLORS, RISK_WEIGHTS } from './constants';

export function computeTimeProgress(observedAt: string, academicYear: AcademicYear): number {
  const t = new Date(observedAt).getTime();
  const { start, end } = AY_BOUNDARIES[academicYear];
  const s = start.getTime();
  const e = end.getTime();
  return Math.min(100, Math.max(0, ((t - s) / (e - s)) * 100));
}

export function computeItemQualifier(
  status: string,
  completion: number,
  timeProgress: number
): QualifierResult {
  const lagPercent = timeProgress - completion;

  if (isNotApplicableStatus(status)) {
    return { qualifier: 'Not Applicable', lagPercent: 0, timeProgressPercent: timeProgress };
  }
  if (status === 'Completed – On Target') {
    return { qualifier: 'Achieved', lagPercent, timeProgressPercent: timeProgress };
  }
  if (status === 'Completed – Below Target') {
    return { qualifier: 'Execution Shortfall', lagPercent, timeProgressPercent: timeProgress };
  }

  if (status === 'Not Started') {
    if (timeProgress >= 50) return { qualifier: 'Critical Risk', lagPercent, timeProgressPercent: timeProgress };
    if (timeProgress >= 30) return { qualifier: 'Emerging Risk', lagPercent, timeProgressPercent: timeProgress };
    return { qualifier: 'On Track', lagPercent, timeProgressPercent: timeProgress };
  }

  // In Progress
  if (lagPercent >= 50) return { qualifier: 'Critical Risk', lagPercent, timeProgressPercent: timeProgress };
  if (lagPercent >= 30) return { qualifier: 'Emerging Risk', lagPercent, timeProgressPercent: timeProgress };
  return { qualifier: 'On Track', lagPercent, timeProgressPercent: timeProgress };
}

const DEFAULT_TERM_DATA: TermData = {
  spStatus: 'Not Applicable',
  spCompletion: 0,
  spTarget: '',
  yearlyStatus: 'Not Applicable',
  yearlyCompletion: 0,
  yearlyTarget: '',
  supportingDoc: '',
};

export function getTermData(item: ActionItem, term: Term, academicYear: AcademicYear): TermData {
  const key = getTermWindowKey(term, academicYear);
  return item.terms?.[key] ?? DEFAULT_TERM_DATA;
}

export function getItemStatus(item: ActionItem, viewType: ViewType, term: Term, academicYear: AcademicYear): string {
  const td = getTermData(item, term, academicYear);
  return viewType === 'cumulative' ? td.spStatus : td.yearlyStatus;
}

export function getItemCompletion(item: ActionItem, viewType: ViewType, term: Term, academicYear: AcademicYear): number {
  const td = getTermData(item, term, academicYear);
  return viewType === 'cumulative' ? td.spCompletion : td.yearlyCompletion;
}

/** Check if an item is applicable for the selected view context */
export function isItemApplicable(item: ActionItem, viewType: ViewType, term: Term, academicYear: AcademicYear): boolean {
  const status = getItemStatus(item, viewType, term, academicYear);
  return !isNotApplicableStatus(status);
}

/** Get only applicable items from a list */
export function getApplicableItems(items: ActionItem[], viewType: ViewType, term: Term, academicYear: AcademicYear): ActionItem[] {
  return items.filter(i => isItemApplicable(i, viewType, term, academicYear));
}

/** Compute average completion for In Progress items */
export function computeInProgressAvgCompletion(
  items: ActionItem[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): { count: number; avgCompletion: number } | null {
  const inProgressItems = items.filter(i => {
    const s = getItemStatus(i, viewType, term, academicYear);
    return s === 'In Progress';
  });

  if (inProgressItems.length === 0) return null;

  const totalCompletion = inProgressItems.reduce((sum, i) => sum + getItemCompletion(i, viewType, term, academicYear), 0);
  return {
    count: inProgressItems.length,
    avgCompletion: parseFloat((totalCompletion / inProgressItems.length).toFixed(1)),
  };
}

export function computeQualifierDistribution(
  items: ActionItem[],
  viewType: ViewType,
  term: Term,
  observedAt: string,
  academicYear: AcademicYear
): QualifierDistributionItem[] {
  const timeProgress = computeTimeProgress(observedAt, academicYear);
  const applicable = getApplicableItems(items, viewType, term, academicYear);

  const counts: Record<Qualifier, number> = {
    'Not Applicable': 0,
    'Achieved': 0,
    'Execution Shortfall': 0,
    'On Track': 0,
    'Emerging Risk': 0,
    'Critical Risk': 0,
  };

  applicable.forEach(item => {
    const { qualifier } = computeItemQualifier(
      getItemStatus(item, viewType, term, academicYear),
      getItemCompletion(item, viewType, term, academicYear),
      timeProgress
    );
    counts[qualifier]++;
  });

  const total = applicable.length || 1;
  const qualifiers: Qualifier[] = ['Achieved', 'On Track', 'Emerging Risk', 'Critical Risk', 'Execution Shortfall'];

  return qualifiers.map(q => ({
    qualifier: q,
    count: counts[q],
    percent: Math.round((counts[q] / total) * 100),
    color: QUALIFIER_COLORS[q],
  }));
}

export function computeRiskIndex(
  items: ActionItem[],
  viewType: ViewType,
  term: Term,
  observedAt: string,
  academicYear: AcademicYear
): number {
  const timeProgress = computeTimeProgress(observedAt, academicYear);
  const applicable = getApplicableItems(items, viewType, term, academicYear);
  if (applicable.length === 0) return 0;

  let weightedSum = 0;
  applicable.forEach(item => {
    const { qualifier } = computeItemQualifier(
      getItemStatus(item, viewType, term, academicYear),
      getItemCompletion(item, viewType, term, academicYear),
      timeProgress
    );
    weightedSum += RISK_WEIGHTS[qualifier];
  });

  return parseFloat((weightedSum / applicable.length).toFixed(2));
}

/** Perform data integrity audit before rendering */
export interface IntegrityAuditResult {
  level: 'Good' | 'Moderate' | 'Needs Review';
  totalItems: number;
  applicableItems: number;
  notApplicableItems: number;
  qualifierSum: number;
  riskDenominator: number;
  timeProgressValid: boolean;
  diagnosticMessages: string[];
}

export function runIntegrityAudit(
  items: ActionItem[],
  viewType: ViewType,
  term: Term,
  observedAt: string,
  academicYear: AcademicYear,
  dataQuality: DataQuality
): IntegrityAuditResult {
  const diagnosticMessages: string[] = [];

  // A) Validate observedAt
  const timeProgressValid = !!observedAt && !isNaN(new Date(observedAt).getTime());
  if (!timeProgressValid) {
    diagnosticMessages.push('Missing or invalid observed_at timestamp — Intelligence layer disabled.');
  }

  const timeProgress = timeProgressValid ? computeTimeProgress(observedAt, academicYear) : 0;
  if (timeProgressValid && (timeProgress < 0 || timeProgress > 100)) {
    diagnosticMessages.push(`Time progress out of range: ${timeProgress.toFixed(1)}%`);
  }

  // B) Count applicable vs not applicable
  const applicable = getApplicableItems(items, viewType, term, academicYear);
  const notApplicable = items.length - applicable.length;

  // Verify total = applicable + notApplicable
  if (applicable.length + notApplicable !== items.length) {
    diagnosticMessages.push('Applicability count mismatch: applicable + notApplicable ≠ total.');
  }

  // C) Qualifier counts sum check
  const qualDist = timeProgressValid
    ? computeQualifierDistribution(items, viewType, term, observedAt, academicYear)
    : [];
  const qualifierSum = qualDist.reduce((s, q) => s + q.count, 0);
  if (timeProgressValid && qualifierSum !== applicable.length) {
    diagnosticMessages.push(`Qualifier sum (${qualifierSum}) ≠ applicable items (${applicable.length}).`);
  }

  // D) Data quality anomalies from server
  if (dataQuality.anomalies) {
    if (dataQuality.anomalies.unexpectedStatusCount > 0) {
      diagnosticMessages.push(`${dataQuality.anomalies.unexpectedStatusCount} unexpected status value(s) detected.`);
    }
    if (dataQuality.anomalies.outOfRangeCompletionCount > 0) {
      diagnosticMessages.push(`${dataQuality.anomalies.outOfRangeCompletionCount} completion value(s) outside 0–100 range.`);
    }
    if (dataQuality.anomalies.missingTermColumnCount > 0) {
      diagnosticMessages.push(`${dataQuality.anomalies.missingTermColumnCount} row(s) with missing term window columns.`);
    }
  }

  if (dataQuality.missingBlocks > 0) {
    diagnosticMessages.push(`${dataQuality.missingBlocks} pillar data block(s) missing from source.`);
  }

  // Compute overall level
  const invalidPct = dataQuality.totalItems > 0
    ? ((dataQuality.invalidStatuses + dataQuality.invalidCompletions) / dataQuality.totalItems) * 100
    : 0;

  let level: 'Good' | 'Moderate' | 'Needs Review';
  if (invalidPct <= 1 && diagnosticMessages.length === 0) {
    level = 'Good';
  } else if (invalidPct <= 3 && diagnosticMessages.length <= 2) {
    level = 'Moderate';
  } else {
    level = 'Needs Review';
  }

  return {
    level,
    totalItems: items.length,
    applicableItems: applicable.length,
    notApplicableItems: notApplicable,
    qualifierSum,
    riskDenominator: applicable.length,
    timeProgressValid,
    diagnosticMessages,
  };
}

// Keep backward compat
export function getDataIntegrityLevel(quality: { invalidStatuses: number; invalidCompletions: number; totalItems: number }) {
  const invalidPct = quality.totalItems > 0
    ? ((quality.invalidStatuses + quality.invalidCompletions) / quality.totalItems) * 100
    : 0;
  if (invalidPct <= 1) return 'Good';
  if (invalidPct <= 3) return 'Moderate';
  return 'Needs Review';
}
