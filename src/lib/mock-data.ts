import type { ActionItem, FetchResult, DataQuality, PillarId, Status, TermData, TermWindowKey } from './types';

const statuses: Status[] = [
  'Not Applicable', 'Not Started', 'In Progress',
  'Completed – On Target', 'Completed – Below Target',
];

function r(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genTermData(status?: Status): TermData {
  const s = status || statuses[r(0, 4)];
  return {
    spStatus: s,
    spCompletion: s === 'Not Applicable' ? 0
      : s === 'Completed – On Target' ? 100
      : s === 'Completed – Below Target' ? r(50, 80)
      : s === 'Not Started' ? 0
      : r(10, 85),
    spTarget: '',
    yearlyStatus: statuses[r(0, 4)],
    yearlyCompletion: r(0, 100),
    yearlyTarget: '',
    supportingDoc: '',
  };
}

function genItems(pillar: PillarId, count: number, startRow: number): ActionItem[] {
  const items: ActionItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: `${pillar}-${i + 1}`,
      pillar,
      goal: `Goal ${pillar}.${Math.ceil((i + 1) / 3)}`,
      objective: `Objective ${pillar}.${Math.ceil((i + 1) / 2)}`,
      actionStep: `Action Step ${pillar}.${i + 1}`,
      owner: ['Dean', 'Associate Dean', 'Director', 'Coordinator', 'Faculty'][r(0, 4)],
      terms: {
        'mid-2025-2026': genTermData(),
        'end-2025-2026': genTermData(),
        'mid-2026-2027': genTermData(),
        'end-2026-2027': genTermData(),
      },
      sheetRow: startRow + i,
    });
  }
  return items;
}

const mockItems: ActionItem[] = [
  ...genItems('I', 12, 5),
  ...genItems('II', 14, 5),
  ...genItems('III', 16, 5),
  ...genItems('IV', 20, 5),
  ...genItems('V', 13, 5),
];

const mockQuality: DataQuality = {
  invalidStatuses: 1,
  invalidCompletions: 0,
  missingBlocks: 0,
  totalItems: mockItems.length,
};

export const mockFetchResult: FetchResult = {
  data: mockItems,
  observedAt: new Date().toISOString(),
  dataQuality: mockQuality,
};
