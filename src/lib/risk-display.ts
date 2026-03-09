/**
 * Risk Index Display Utilities
 * ─────────────────────────────
 * Converts RI from 0–3 scale to 0–100% for display.
 * Provides band labels, colors, insight statements, and tooltip text.
 * The underlying RI calculation is UNCHANGED — only display is affected.
 */

export type RiskBandLabel = 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Severe Risk';

export interface RiskDisplayInfo {
  /** RI as percentage 0–100 */
  percent: number;
  /** Human-readable band label */
  band: RiskBandLabel;
  /** Short insight statement */
  insight: string;
  /** Color for the band */
  color: string;
}

/** Band thresholds on the 0–100% scale */
const BANDS: { max: number; label: RiskBandLabel; color: string; insight: string }[] = [
  { max: 25, label: 'Low Risk', color: '#16A34A', insight: 'Risk exposure is limited and execution remains broadly healthy.' },
  { max: 50, label: 'Moderate Risk', color: '#F59E0B', insight: 'Some structural risk is present and should be monitored.' },
  { max: 75, label: 'High Risk', color: '#F97316', insight: 'Significant structural risk is affecting delivery and requires attention.' },
  { max: 100, label: 'Severe Risk', color: '#EF4444', insight: 'Risk exposure is critical and requires immediate intervention.' },
];

/**
 * Convert a raw RI (0–3) to display percentage.
 * Formula: RI% = (RI / 3) × 100, rounded to nearest integer.
 */
export function riToPercent(ri: number): number {
  return Math.round((ri / 3) * 100);
}

/**
 * Get the full display info for a raw RI value (0–3 scale).
 */
export function getRiskDisplayInfo(ri: number): RiskDisplayInfo {
  const percent = riToPercent(ri);
  const band = BANDS.find(b => percent <= b.max) ?? BANDS[BANDS.length - 1];
  return {
    percent,
    band: band.label,
    insight: band.insight,
    color: band.color,
  };
}

/**
 * Format RI for display: "28%"
 */
export function formatRIPercent(ri: number): string {
  return `${riToPercent(ri)}%`;
}

/**
 * Format RI with band: "28% — Moderate Risk"
 */
export function formatRIWithBand(ri: number): string {
  const info = getRiskDisplayInfo(ri);
  return `${info.percent}% — ${info.band}`;
}

/**
 * Get the band color for a given raw RI (0–3).
 * Uses the percentage-based bands for consistency.
 */
export function getRIBandColor(ri: number): string {
  return getRiskDisplayInfo(ri).color;
}

/** Standard RI tooltip text */
export const RI_TOOLTIP = 'Risk Index (RI) is displayed as a percentage from 0% to 100%. It represents the weighted structural severity of risk signals across applicable strategic items. Lower percentages indicate lower structural risk. Bands: 0–25% Low · 26–50% Moderate · 51–75% High · 76–100% Severe.';

/** Band definitions for legends */
export const RI_BAND_LEGEND: { label: RiskBandLabel; range: string; color: string }[] = [
  { label: 'Low Risk', range: '0–25%', color: '#16A34A' },
  { label: 'Moderate Risk', range: '26–50%', color: '#F59E0B' },
  { label: 'High Risk', range: '51–75%', color: '#F97316' },
  { label: 'Severe Risk', range: '76–100%', color: '#EF4444' },
];
