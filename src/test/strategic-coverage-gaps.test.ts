import { describe, expect, it } from 'vitest';

import { computeCategories } from '@/components/executive/StrategicCoverageGaps';
import { UNIT_IDS } from '@/lib/unit-config';
import type { ActionItem, FetchResult, Status, TermData } from '@/lib/types';
import type { UnitFetchResult } from '@/lib/university-aggregation';

function createTermData(status: Status): TermData {
  return {
    spStatus: status,
    spStatusRaw: status,
    spStatusProvided: true,
    spCompletion: 0,
    spTarget: '',
    yearlyStatus: status,
    yearlyStatusRaw: status,
    yearlyStatusProvided: true,
    yearlyCompletion: 0,
    yearlyTarget: '',
    supportingDoc: '',
  };
}

function createActionItem(status: Status, overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: 'I-1',
    pillar: 'I',
    goal: 'Goal 1',
    objective: 'Action 1',
    actionStep: 'Action Step 1',
    owner: 'Owner',
    sheetRow: 5,
    sourceKey: 'I|row-5',
    terms: {
      'mid-2025-2026': createTermData(status),
      'end-2025-2026': createTermData(status),
      'mid-2026-2027': createTermData(status),
      'end-2026-2027': createTermData(status),
    },
    ...overrides,
  };
}

function createFetchResult(items: ActionItem[]): FetchResult {
  return {
    data: items,
    observedAt: '2026-04-17T00:00:00.000Z',
    dataQuality: {
      invalidStatuses: 0,
      invalidCompletions: 0,
      missingBlocks: 0,
      totalItems: items.length,
    },
  };
}

function createUnitResult(unitId: string, options?: { items?: ActionItem[]; error?: string | null }): UnitFetchResult {
  const items = options?.items ?? [createActionItem('Not Applicable')];
  const error = options?.error ?? null;

  return {
    unitId,
    unitName: unitId,
    result: error ? null : createFetchResult(items),
    error,
  };
}

describe('computeCategories Absolute NA', () => {
  const UNIT_COUNT = UNIT_IDS.length;

  it('includes an item only when every loaded unit explicitly reports Not Applicable', () => {
    const categories = computeCategories(
      UNIT_IDS.map(unitId => createUnitResult(unitId)),
      'cumulative',
      'mid',
      '2025-2026',
    );

    const absoluteNa = categories.find(category => category.key === 'absolute-na');

    expect(absoluteNa?.items).toHaveLength(1);
    expect(absoluteNa?.items[0]?.totalUnits).toBe(UNIT_COUNT);
    expect(absoluteNa?.items[0]?.naUnits).toHaveLength(UNIT_COUNT);
  });

  it('matches the same logical item across units when a stable source key is present', () => {
    const categories = computeCategories(
      UNIT_IDS.map((unitId, index) => createUnitResult(unitId, {
        items: [createActionItem('Not Applicable', {
          id: `I-${index + 1}`,
          sheetRow: 5 + index,
          sourceKey: 'I|row-5',
        })],
      })),
      'cumulative',
      'mid',
      '2025-2026',
    );

    const absoluteNa = categories.find(category => category.key === 'absolute-na');

    expect(absoluteNa?.items).toHaveLength(1);
    expect(absoluteNa?.items[0]?.naUnits).toHaveLength(UNIT_COUNT);
    expect(absoluteNa?.items[0]?.totalUnits).toBe(UNIT_COUNT);
  });

  it('excludes the item when one unit has no matching row or explicit status', () => {
    const categories = computeCategories(
      UNIT_IDS.map((unitId, index) => createUnitResult(unitId, index === 0 ? { items: [] } : undefined)),
      'cumulative',
      'mid',
      '2025-2026',
    );

    const absoluteNa = categories.find(category => category.key === 'absolute-na');

    expect(absoluteNa?.items).toHaveLength(0);
  });

  it('excludes the item when one unit reports a non-NA status', () => {
    const categories = computeCategories(
      UNIT_IDS.map((unitId, index) => createUnitResult(unitId, {
        items: [createActionItem(index === 0 ? 'Not Started' : 'Not Applicable')],
      })),
      'cumulative',
      'mid',
      '2025-2026',
    );

    const absoluteNa = categories.find(category => category.key === 'absolute-na');

    expect(absoluteNa?.items).toHaveLength(0);
  });

  it('excludes the item when one unit fails to load', () => {
    const categories = computeCategories(
      UNIT_IDS.map((unitId, index) => createUnitResult(unitId, index === 0 ? { error: 'SERVICE_UNAVAILABLE' } : undefined)),
      'cumulative',
      'mid',
      '2025-2026',
    );

    const absoluteNa = categories.find(category => category.key === 'absolute-na');

    expect(absoluteNa?.items).toHaveLength(0);
  });

  it('merges alias-linked matches before applying the strict 24/24 NA rule', () => {
    const categories = computeCategories(
      UNIT_IDS.map((unitId, index) => {
        if (index < 8) {
          return createUnitResult(unitId, {
            items: [createActionItem('Not Applicable', {
              sourceKey: 'I|row-5',
              goal: 'Goal 1',
              objective: 'Action 1',
              actionStep: 'Action Step 1',
            })],
          });
        }

        if (index < 16) {
          return createUnitResult(unitId, {
            items: [createActionItem('Not Applicable', {
              sourceKey: 'I|row-5',
              goal: 'Goal 1',
              objective: 'Action One',
              actionStep: 'Action Step 1',
            })],
          });
        }

        return createUnitResult(unitId, {
          items: [createActionItem('Not Applicable', {
            sourceKey: 'I|row-9',
            goal: 'Goal 1',
            objective: 'Action One',
            actionStep: 'Action Step 1',
          })],
        });
      }),
      'cumulative',
      'mid',
      '2025-2026',
    );

    const absoluteNa = categories.find(category => category.key === 'absolute-na');

    expect(absoluteNa?.items).toHaveLength(1);
    expect(absoluteNa?.items[0]?.naUnits).toHaveLength(UNIT_COUNT);
    expect(absoluteNa?.items[0]?.totalUnits).toBe(UNIT_COUNT);
  });
});