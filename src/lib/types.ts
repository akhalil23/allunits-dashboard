export type Status =
  | 'Not Applicable'
  | 'Not Started'
  | 'In Progress'
  | 'Completed – On Target'
  | 'Completed – Below Target';

export type Qualifier =
  | 'Not Applicable'
  | 'Achieved'
  | 'Execution Shortfall'
  | 'On Track'
  | 'Emerging Risk'
  | 'Critical Risk';

export type ViewType = 'cumulative' | 'yearly';
export type ViewMode = 'basic' | 'intelligence';
export type AcademicYear = '2025-2026' | '2026-2027';
export type Term = 'mid' | 'end';
export type PillarId = 'I' | 'II' | 'III' | 'IV' | 'V';

export type TermWindowKey = 'mid-2025-2026' | 'end-2025-2026' | 'mid-2026-2027' | 'end-2026-2027';

export interface TermData {
  spStatus: Status;
  spCompletion: number;
  spTarget: string;
  yearlyStatus: Status;
  yearlyCompletion: number;
  yearlyTarget: string;
  supportingDoc: string;
}

export interface ActionItem {
  id: string;
  pillar: PillarId;
  goal: string;
  objective: string;
  actionStep: string;
  owner: string;
  terms: Record<TermWindowKey, TermData>;
  sheetRow: number;
}

export interface DashboardFilters {
  academicYear: AcademicYear;
  term: Term;
  viewType: ViewType;
  viewMode: ViewMode;
  selectedPillar: 'all' | PillarId;
}

export interface DataQuality {
  invalidStatuses: number;
  invalidCompletions: number;
  missingBlocks: number;
  totalItems: number;
}

export interface FetchResult {
  data: ActionItem[];
  observedAt: string;
  dataQuality: DataQuality;
}

export interface QualifierResult {
  qualifier: Qualifier;
  lagPercent: number;
  timeProgressPercent: number;
}

export interface StatusDistribution {
  status: Status;
  count: number;
  color: string;
}

export interface QualifierDistributionItem {
  qualifier: Qualifier;
  count: number;
  percent: number;
  color: string;
}

export function getTermWindowKey(term: Term, academicYear: AcademicYear): TermWindowKey {
  return `${term}-${academicYear}` as TermWindowKey;
}
