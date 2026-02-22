import type { ActionItem, ViewType, AcademicYear, Term } from './types';
import { isNotApplicableStatus } from './types';
import { getItemStatus, getItemCompletion, getApplicableItems, getTermData } from './intelligence';

// ─── Risk Signal Types ───────────────────────────────────────────────────────

export type RiskSignal =
  | 'No Risk (On Track)'
  | 'Emerging Risk (Needs Attention)'
  | 'Critical Risk (Needs Close Attention)'
  | 'Realized Risk (Needs Mitigation Strategy)'
  | 'Not Applicable';

export const RISK_SIGNAL_COLORS: Record<RiskSignal, string> = {
  'No Risk (On Track)': '#16A34A',
  'Emerging Risk (Needs Attention)': '#F59E0B',
  'Critical Risk (Needs Close Attention)': '#EF4444',
  'Realized Risk (Needs Mitigation Strategy)': '#7F1D1D',
  'Not Applicable': '#9CA3AF',
};

export const RISK_SIGNAL_WEIGHTS: Record<RiskSignal, number> = {
  'No Risk (On Track)': 0,
  'Emerging Risk (Needs Attention)': 1,
  'Critical Risk (Needs Close Attention)': 2,
  'Realized Risk (Needs Mitigation Strategy)': 3,
  'Not Applicable': 0,
};

export const RISK_SIGNAL_ORDER: RiskSignal[] = [
  'No Risk (On Track)',
  'Emerging Risk (Needs Attention)',
  'Critical Risk (Needs Close Attention)',
  'Realized Risk (Needs Mitigation Strategy)',
];

// ─── Item-Level Mapping ──────────────────────────────────────────────────────

export function mapItemToRiskSignal(
  status: string,
  completion: number,
  completionValid: boolean
): RiskSignal {
  // 1) Not Applicable
  if (isNotApplicableStatus(status)) return 'Not Applicable';

  // 2) Completed – Below Target → Realized Risk
  if (status === 'Completed – Below Target') return 'Realized Risk (Needs Mitigation Strategy)';

  // 3) Completed – On Target → No Risk
  if (status === 'Completed – On Target') return 'No Risk (On Track)';

  // 4-7) In Progress / Not Started with completion overrides
  if (status === 'In Progress') {
    // Rule 7: In Progress but completion = 0 → Critical
    if (completionValid && completion === 0) return 'Critical Risk (Needs Close Attention)';
    return 'Emerging Risk (Needs Attention)';
  }

  if (status === 'Not Started') {
    // Rule 6: Not Started but completion > 0 → Emerging
    if (completionValid && completion > 0) return 'Emerging Risk (Needs Attention)';
    return 'Critical Risk (Needs Close Attention)';
  }

  // Fallback for unknown status → Critical
  return 'Critical Risk (Needs Close Attention)';
}

// ─── Distribution ────────────────────────────────────────────────────────────

export interface RiskSignalDistItem {
  signal: RiskSignal;
  count: number;
  percent: number;
  color: string;
}

export function computeRiskSignalDistribution(
  items: ActionItem[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): RiskSignalDistItem[] {
  const applicable = getApplicableItems(items, viewType, term, academicYear);

  const counts: Record<RiskSignal, number> = {
    'No Risk (On Track)': 0,
    'Emerging Risk (Needs Attention)': 0,
    'Critical Risk (Needs Close Attention)': 0,
    'Realized Risk (Needs Mitigation Strategy)': 0,
    'Not Applicable': 0,
  };

  applicable.forEach(item => {
    const status = getItemStatus(item, viewType, term, academicYear);
    const completion = getItemCompletion(item, viewType, term, academicYear);
    const completionValid = typeof completion === 'number' && completion >= 0 && completion <= 100;
    const signal = mapItemToRiskSignal(status, completion, completionValid);
    counts[signal]++;
  });

  const total = applicable.length || 1;

  return RISK_SIGNAL_ORDER.map(signal => ({
    signal,
    count: counts[signal],
    percent: Math.round((counts[signal] / total) * 100),
    color: RISK_SIGNAL_COLORS[signal],
  }));
}

// ─── Risk Index ──────────────────────────────────────────────────────────────

export function computeNewRiskIndex(
  items: ActionItem[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): number {
  const applicable = getApplicableItems(items, viewType, term, academicYear);
  if (applicable.length === 0) return 0;

  let weightedSum = 0;
  applicable.forEach(item => {
    const status = getItemStatus(item, viewType, term, academicYear);
    const completion = getItemCompletion(item, viewType, term, academicYear);
    const completionValid = typeof completion === 'number' && completion >= 0 && completion <= 100;
    const signal = mapItemToRiskSignal(status, completion, completionValid);
    weightedSum += RISK_SIGNAL_WEIGHTS[signal];
  });

  return parseFloat((weightedSum / applicable.length).toFixed(2));
}

// ─── Enriched Item for Drill-Down ────────────────────────────────────────────

export interface RiskSignalItem {
  id: string;
  actionStep: string;
  pillar: string;
  status: string;
  completion: number;
  riskSignal: RiskSignal;
  supportingDoc: string;
  sheetRow: number;
}

export function getEnrichedItems(
  items: ActionItem[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): RiskSignalItem[] {
  return items.map(item => {
    const status = getItemStatus(item, viewType, term, academicYear);
    const completion = getItemCompletion(item, viewType, term, academicYear);
    const completionValid = typeof completion === 'number' && completion >= 0 && completion <= 100;
    const td = getTermData(item, term, academicYear);

    return {
      id: item.id,
      actionStep: item.actionStep,
      pillar: item.pillar,
      status,
      completion,
      riskSignal: mapItemToRiskSignal(status, completion, completionValid),
      supportingDoc: td.supportingDoc || '',
      sheetRow: item.sheetRow,
    };
  }).filter(i => !isNotApplicableStatus(i.status));
}

// ─── Narrative Generation ────────────────────────────────────────────────────

export function generateNarrative(
  dist: RiskSignalDistItem[],
  riskIndex: number,
  applicableCount: number
): string {
  if (applicableCount === 0) return 'No applicable items for the selected context.';

  const level = riskIndex < 1 ? 'low' : riskIndex < 2 ? 'moderate' : 'high';

  const largest = [...dist].sort((a, b) => b.count - a.count)[0];
  const largestPct = largest.percent;

  const criticalCount = dist.find(d => d.signal === 'Critical Risk (Needs Close Attention)')?.count || 0;
  const realizedCount = dist.find(d => d.signal === 'Realized Risk (Needs Mitigation Strategy)')?.count || 0;
  const attentionPct = applicableCount > 0
    ? Math.round(((criticalCount + realizedCount) / applicableCount) * 100)
    : 0;

  let narrative = `Overall signal is ${level} based on Risk Index (${riskIndex.toFixed(2)}). `;
  narrative += `Largest share: ${largest.signal} (${largestPct}%). `;
  if (attentionPct > 0) {
    narrative += `Action focus: ${attentionPct}% of items require close attention or mitigation. `;
  }
  narrative += 'See the distribution bar chart for details.';

  return narrative;
}
