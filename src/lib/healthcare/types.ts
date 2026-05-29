// Healthcare SP — prototype types (no live integration)
export type HCStatus = 'Not Started' | 'In Progress' | 'On Target' | 'Below Target' | 'Done' | 'N/A';
export type HCRisk = 'No' | 'Emerging' | 'Critical' | 'Realized';
export type HCPriority = 1 | 2 | 3;
export type HCFundingSource = 'Operational' | 'Capital' | 'Grant' | 'Philanthropy';

export interface HCStep {
  code: string;            // e.g. 1.1.1
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
  risk: HCRisk;
  progress: number;        // 0-100
}

export interface HCAction {
  code: string;            // e.g. 1.1
  title: string;
  kpis?: string[];
  steps: HCStep[];
}

export interface HCGoal {
  code: number;            // 1..7
  title: string;
  champion: string;
  actions: HCAction[];
}
