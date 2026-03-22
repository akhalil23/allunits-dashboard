/**
 * Fixed Strategic Pillar Color System
 * These colors are FIXED and must NOT be dynamically reassigned.
 * Used consistently across all Executive Command Center visualizations.
 */

import type { PillarId } from './types';

/** Fixed pillar identity colors — strong, professional, high-contrast */
export const PILLAR_COLORS: Record<PillarId, string> = {
  I: '#1D4ED8',   // Deep Blue
  II: '#047857',  // Emerald Green
  III: '#D97706', // Amber / Orange
  IV: '#DC2626',  // Red
  V: '#7C3AED',   // Purple
};

/** Pillar color labels for reference panel */
export const PILLAR_COLOR_LABELS: Record<PillarId, string> = {
  I: 'Deep Blue',
  II: 'Emerald Green',
  III: 'Amber',
  IV: 'Red',
  V: 'Purple',
};

/**
 * Strategic Stability Index (SSI)
 * Combines progress, budget alignment, and risk exposure into a single 0–100% score.
 *
 * SSI = 0.4 × Progress + 0.3 × (100 − AlignmentGap) + 0.3 × (100 − RiskIndex%)
 * Where AlignmentGap = |Progress − BudgetUtilization|
 */
export function computeSSI(progress: number, budgetUtilization: number, riskIndexPercent: number): {
  value: number;
  label: string;
  color: string;
} {
  if (isNaN(progress) || isNaN(budgetUtilization) || isNaN(riskIndexPercent)) {
    return { value: 0, label: 'N/A', color: '#6B7280' };
  }

  const alignmentGap = Math.abs(progress - budgetUtilization);
  const raw = 0.4 * progress + 0.3 * (100 - Math.min(100, alignmentGap)) + 0.3 * (100 - Math.min(100, riskIndexPercent));
  const value = Math.max(0, Math.min(100, parseFloat(raw.toFixed(1))));

  let label: string, color: string;
  if (value >= 85) { label = 'Highly Stable'; color = '#065F46'; }
  else if (value >= 70) { label = 'Stable'; color = '#16A34A'; }
  else if (value >= 50) { label = 'Watch'; color = '#D97706'; }
  else { label = 'Unstable'; color = '#DC2626'; }

  return { value, label, color };
}

/** Get alignment status label */
export function getAlignmentStatus(progress: number, budgetUtil: number, riskIndex: number): string {
  const gap = progress - budgetUtil;
  const riPct = (riskIndex / 3) * 100;

  if (riPct >= 50 && gap < -10) return 'Intervention Required';
  if (riPct >= 50) return 'High-Risk Delivery';
  if (gap > 20) return 'Efficient';
  if (gap > 10) return 'Efficient but Monitor';
  if (gap < -20) return 'Cost-Heavy';
  if (gap < -10) return 'Budget-Constrained';
  return 'Balanced';
}

export function getAlignmentColor(status: string): string {
  switch (status) {
    case 'Efficient': return '#065F46';
    case 'Efficient but Monitor': return '#16A34A';
    case 'Balanced': return '#3B82F6';
    case 'Budget-Constrained': return '#D97706';
    case 'Cost-Heavy': return '#F97316';
    case 'High-Risk Delivery': return '#DC2626';
    case 'Intervention Required': return '#7F1D1D';
    default: return '#6B7280';
  }
}
