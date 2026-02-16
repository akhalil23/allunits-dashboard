import type { ActionItem, Qualifier, QualifierResult, QualifierDistribution, ViewType, AcademicYear } from './types';
import { AY_BOUNDARIES, QUALIFIER_COLORS, RISK_WEIGHTS } from './constants';

export function computeTimeProgress(observedAt: string, academicYear: AcademicYear): number {
  const t = new Date(observedAt).getTime();
  const { start, end } = AY_BOUNDARIES[academicYear];
  const s = start.getTime();
  const e = end.getTime();
  return Math.min(1, Math.max(0, (t - s) / (e - s))) * 100;
}

export function computeItemQualifier(
  status: string,
  completion: number,
  timeProgress: number
): QualifierResult {
  const lagPercent = timeProgress - completion;

  if (status === 'Not Applicable') {
    return { qualifier: 'Not Applicable', lagPercent: 0, timeProgressPercent: timeProgress };
  }
  if (status === 'Completed – On Target') {
    return { qualifier: 'Achieved', lagPercent, timeProgressPercent: timeProgress };
  }
  if (status === 'Completed – Below Target') {
    return { qualifier: 'Execution Shortfall', lagPercent, timeProgressPercent: timeProgress };
  }

  // Not Started special rules
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

export function getItemStatus(item: ActionItem, viewType: ViewType) {
  return viewType === 'cumulative' ? item.spStatus : item.yearlyStatus;
}

export function getItemCompletion(item: ActionItem, viewType: ViewType) {
  return viewType === 'cumulative' ? item.spCompletion : item.yearlyCompletion;
}

export function computeQualifierDistribution(
  items: ActionItem[],
  viewType: ViewType,
  observedAt: string,
  academicYear: AcademicYear
): QualifierDistribution[] {
  const timeProgress = computeTimeProgress(observedAt, academicYear);
  const applicable = items.filter(i => getItemStatus(i, viewType) !== 'Not Applicable');

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
      getItemStatus(item, viewType),
      getItemCompletion(item, viewType),
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
  observedAt: string,
  academicYear: AcademicYear
): number {
  const timeProgress = computeTimeProgress(observedAt, academicYear);
  const applicable = items.filter(i => getItemStatus(i, viewType) !== 'Not Applicable');
  if (applicable.length === 0) return 0;

  let weightedSum = 0;
  applicable.forEach(item => {
    const { qualifier } = computeItemQualifier(
      getItemStatus(item, viewType),
      getItemCompletion(item, viewType),
      timeProgress
    );
    weightedSum += RISK_WEIGHTS[qualifier];
  });

  return parseFloat((weightedSum / applicable.length).toFixed(2));
}

export function getDataIntegrityLevel(quality: { invalidStatuses: number; invalidCompletions: number; totalItems: number }) {
  const invalidPct = ((quality.invalidStatuses + quality.invalidCompletions) / quality.totalItems) * 100;
  if (invalidPct <= 1) return 'Good';
  if (invalidPct <= 3) return 'Moderate';
  return 'Needs Review';
}
