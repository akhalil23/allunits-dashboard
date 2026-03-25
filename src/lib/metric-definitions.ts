/**
 * Shared metric tooltip definitions for executive dashboard clarity.
 * Updated: Removed SEEI. Added Commitment Ratio, Spending Ratio, dynamic RI.
 */

export const METRIC_TOOLTIPS = {
  completion: "Weighted average completion across applicable strategic actions. Completed items (on target or below target) count as 100%. In Progress items use their actual percentage. Not Started items count as 0%.",
  commitmentRatio: "Commitment Ratio = Committed ÷ Allocated. Reflects the proportion of budget that has been formally committed (spent + contractual obligations).",
  spendingRatio: "Spending Ratio = Spent ÷ Allocated. Reflects the proportion of budget that has been actually disbursed.",
  onTrack: "Percentage of strategic actions currently progressing according to the planned schedule.",
  belowTarget: "Percentage of actions performing below expected progress levels.",
  riskIndex: "Risk Index (RI) is displayed as a percentage from 0% to 100%. For In Progress items, risk is dynamically assigned based on the gap between Expected Progress and Actual Progress: >50% gap = Critical, 20–50% = Emerging, <20% = No Risk. Lower percentages indicate lower structural risk. Bands: 0–25% Low · 26–50% Moderate · 51–75% High · 76–100% Severe.",
  applicableItems: "Total number of strategic action items that are applicable under the current filter settings (excluding 'Not Applicable' items).",
  executionGap: "Execution Gap = Actual Progress − Expected Progress. Negative values indicate behind schedule. Only this value is color-coded in alignment insights.",
} as const;

export const RISK_SIGNAL_TOOLTIPS = {
  noRisk: "Strategic actions currently showing no risk indicators. For In Progress items, this means progress is within 20% of expected.",
  emerging: "Actions showing early warning signals. For In Progress items, this means progress is 20–50% below expected.",
  critical: "Actions with severe risk signals. For In Progress items, this means progress is >50% below expected. Not Started items are always Critical.",
  realized: "Actions where the identified risk event has already occurred (Completed Below Target).",
} as const;

export const METRIC_LABELS = {
  completion: "Completion — Strategic Actions Completed (%)",
  completionShort: "Completion",
  commitmentRatio: "Commitment Ratio — Committed ÷ Allocated (%)",
  commitmentRatioShort: "Commitment Ratio",
  spendingRatio: "Spending Ratio — Spent ÷ Allocated (%)",
  spendingRatioShort: "Spending Ratio",
  onTrack: "On-Track — Actions Progressing as Planned (%)",
  onTrackShort: "On-Track",
  belowTarget: "Below Target — Actions Underperforming (%)",
  belowTargetShort: "Below Target",
  riskIndex: "RI (Risk Index %)",
} as const;