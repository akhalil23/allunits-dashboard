import type { ActionItem, ViewType, AcademicYear, Term, PillarId } from './types';
import { isNotApplicableStatus } from './types';
import { getItemStatus, getItemCompletion, getApplicableItems, getTermData } from './intelligence';
import { riToPercent, getRiskDisplayInfo } from './risk-display';

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
  'Realized Risk (Needs Mitigation Strategy)': '#DC2626',
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
  if (isNotApplicableStatus(status)) return 'Not Applicable';
  if (status === 'Completed – Below Target') return 'Realized Risk (Needs Mitigation Strategy)';
  if (status === 'Completed – On Target') return 'No Risk (On Track)';

  if (status === 'In Progress') {
    if (completionValid && completion === 0) return 'Critical Risk (Needs Close Attention)';
    return 'Emerging Risk (Needs Attention)';
  }

  if (status === 'Not Started') {
    if (completionValid && completion > 0) return 'Emerging Risk (Needs Attention)';
    return 'Critical Risk (Needs Close Attention)';
  }

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

// ─── Per-Pillar Risk Index ───────────────────────────────────────────────────

const PILLAR_IDS: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

export interface PillarRiskInfo {
  pillar: PillarId;
  riskIndex: number;
  applicableCount: number;
}

export function computePillarRiskIndices(
  items: ActionItem[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): PillarRiskInfo[] {
  return PILLAR_IDS.map(p => {
    const pillarItems = items.filter(i => i.pillar === p);
    const ri = computeNewRiskIndex(pillarItems, viewType, term, academicYear);
    const applicable = getApplicableItems(pillarItems, viewType, term, academicYear);
    return { pillar: p, riskIndex: ri, applicableCount: applicable.length };
  });
}

export function getWorstPillar(
  items: ActionItem[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): PillarRiskInfo | null {
  const indices = computePillarRiskIndices(items, viewType, term, academicYear)
    .filter(p => p.applicableCount > 0);
  if (indices.length === 0) return null;
  return indices.reduce((worst, p) => p.riskIndex > worst.riskIndex ? p : worst, indices[0]);
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
  applicableCount: number,
  worstPillar: PillarRiskInfo | null,
  pillarLabels: Record<PillarId, string>
): string {
  if (applicableCount === 0) return 'No applicable items for the selected context.';

  const { riToPercent, getRiskDisplayInfo } = require('./risk-display');
  const riPct = riToPercent(riskIndex);
  const riInfo = getRiskDisplayInfo(riskIndex);

  const largest = [...dist].sort((a, b) => b.count - a.count)[0];
  const largestPct = largest.percent;

  const criticalCount = dist.find(d => d.signal === 'Critical Risk (Needs Close Attention)')?.count || 0;
  const realizedCount = dist.find(d => d.signal === 'Realized Risk (Needs Mitigation Strategy)')?.count || 0;
  const attentionPct = applicableCount > 0
    ? Math.round(((criticalCount + realizedCount) / applicableCount) * 100)
    : 0;

  let narrative = `Overall signal is ${riInfo.band} based on Risk Index (RI ${riPct}%). `;
  narrative += `${riInfo.insight} `;
  narrative += `Largest share: ${largest.signal} (${largestPct}%). `;
  if (attentionPct > 0) {
    narrative += `Action focus: ${attentionPct}% of items require close attention or mitigation. `;
  }
  if (worstPillar && worstPillar.riskIndex > 0) {
    const wpPct = riToPercent(worstPillar.riskIndex);
    narrative += `Highest risk: Pillar ${worstPillar.pillar} — ${pillarLabels[worstPillar.pillar]} (RI ${wpPct}%). `;
  }
  narrative += 'See the distribution bar chart for details.';

  return narrative;
}
