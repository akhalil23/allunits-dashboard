/**
 * Shared metric tooltip definitions for executive dashboard clarity.
 * Used across all executive dashboard components.
 */

export const METRIC_TOOLTIPS = {
  completion: "Percentage of applicable strategic actions marked as completed relative to the total strategic actions for the selected pillar or unit.",
  budgetUtilization: "Percentage of the allocated budget that has already been utilized during the selected reporting cycle.",
  onTrack: "Percentage of strategic actions currently progressing according to the planned schedule.",
  belowTarget: "Percentage of actions performing below expected progress levels.",
  riskIndex: "Risk Index (RI) is displayed as a percentage from 0% to 100%. It represents the weighted structural severity of risk signals across applicable strategic items. Lower percentages indicate lower structural risk. Bands: 0–25% Low · 26–50% Moderate · 51–75% High · 76–100% Severe.",
  applicableItems: "Total number of strategic action items that are applicable under the current filter settings (excluding 'Not Applicable' items).",
} as const;

export const RISK_SIGNAL_TOOLTIPS = {
  noRisk: "Strategic actions currently showing no risk indicators.",
  emerging: "Actions showing early warning signals that may affect delivery.",
  critical: "Actions with severe risk signals requiring immediate intervention.",
  realized: "Actions where the identified risk event has already occurred.",
} as const;

export const METRIC_LABELS = {
  completion: "Completion — Strategic Actions Completed (%)",
  completionShort: "Completion",
  budgetUtilization: "Budget Utilization — Budget Used (%)",
  budgetUtilizationShort: "Budget Utilization",
  onTrack: "On-Track — Actions Progressing as Planned (%)",
  onTrackShort: "On-Track",
  belowTarget: "Below Target — Actions Underperforming (%)",
  belowTargetShort: "Below Target",
  riskIndex: "RI (Risk Index %)",
} as const;
