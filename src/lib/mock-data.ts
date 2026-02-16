import type { ActionItem, FetchResult, DataQuality, PillarId, Status } from './types';

const statuses: Status[] = [
  'Not Applicable', 'Not Started', 'In Progress',
  'Completed – On Target', 'Completed – Below Target',
];

function r(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genItems(pillar: PillarId, count: number, startRow: number): ActionItem[] {
  const items: ActionItem[] = [];
  for (let i = 0; i < count; i++) {
    const spStatus = statuses[r(0, 4)];
    const yearlyStatus = statuses[r(0, 4)];
    items.push({
      id: `${pillar}-${i + 1}`,
      pillar,
      goal: `Goal ${pillar}.${Math.ceil((i + 1) / 3)}`,
      objective: `Objective ${pillar}.${Math.ceil((i + 1) / 2)}`,
      actionStep: `Action Step ${pillar}.${i + 1}`,
      owner: ['Dean', 'Associate Dean', 'Director', 'Coordinator', 'Faculty'][r(0, 4)],
      spStatus,
      spCompletion: spStatus === 'Not Applicable' ? 0
        : spStatus === 'Completed – On Target' ? 100
        : spStatus === 'Completed – Below Target' ? r(50, 80)
        : spStatus === 'Not Started' ? 0
        : r(10, 85),
      spTarget: `Target ${i + 1}`,
      yearlyStatus,
      yearlyCompletion: yearlyStatus === 'Not Applicable' ? 0
        : yearlyStatus === 'Completed – On Target' ? 100
        : yearlyStatus === 'Completed – Below Target' ? r(50, 80)
        : yearlyStatus === 'Not Started' ? 0
        : r(10, 85),
      yearlyTarget: `Yearly Target ${i + 1}`,
      sheetRow: startRow + i,
    });
  }
  return items;
}

// Deterministic seed for consistent mock data
const seed = 42;
let _s = seed;
function seededR(min: number, max: number) {
  _s = (_s * 16807) % 2147483647;
  return min + (_s % (max - min + 1));
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
