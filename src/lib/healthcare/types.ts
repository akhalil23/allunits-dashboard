// Healthcare SP — prototype types (no live integration)
// Healthcare-native model: 4-state status + Champion Risk Flag + Blocker reason.

export type HCStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Done'
  | 'Blocked'
  // legacy values kept for backward compat in old quarterly notes — mapped via effectiveStatus()
  | 'On Target'
  | 'Below Target'
  | 'N/A';

export type HCRiskFlag = 'None' | 'Low' | 'Medium' | 'High';
// legacy
export type HCRisk = 'No' | 'Emerging' | 'Critical' | 'Realized';

export type HCBlockerType =
  | 'No Budget'
  | 'Pending Decision'
  | 'External Dependency'
  | 'Capacity'
  | 'Awaiting Approval'
  | 'May Be Dropped'
  | 'Other';

export interface HCBlocker {
  type: HCBlockerType;
  reason: string;       // verbatim Champion note
  raisedQuarter: string; // e.g. 'Q2 2026'
  decisionOwner?: string;
}

export type HCPriority = 1 | 2 | 3;
export type HCFundingSource = 'Operational' | 'Capital' | 'Grant' | 'Philanthropy';

export interface HCStep {
  code: string;
  title: string;
  intent?: string;
  kpis?: string;
  champion?: string;
  priority?: HCPriority;
  responsible?: string;
  accountable?: string;
  consulted?: string;
  informed?: string;
  quarterly: { period: string; status: HCStatus; note?: string }[];
  budget: { year: string; amount: number; note?: string; source?: HCFundingSource }[];
  risk: HCRisk;          // legacy
  riskFlag: HCRiskFlag;  // Champion-rated
  blocker?: HCBlocker;   // present iff effective status = Blocked
  progress: number;
}

export interface HCAction {
  code: string;
  title: string;
  kpis?: string[];
  steps: HCStep[];
}

export interface HCGoal {
  code: number;
  title: string;
  champion: string;
  actions: HCAction[];
}
