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

  it('treats a blank/unprovided cell as Not Applicable (matches Action Explorer semantics)', () => {
    const categories = computeCategories(
      UNIT_IDS.map((unitId, index) => {
        if (index === 0) {
          // Simulate a unit that left the cell blank — spStatus defaults to
          // 'Not Applicable' but spStatusProvided is false.
          const item = createActionItem('Not Applicable');
          Object.values(item.terms).forEach(td => {
            td.spStatusProvided = false;
            td.spStatusRaw = '';
            td.yearlyStatusProvided = false;
            td.yearlyStatusRaw = '';
          });
          return createUnitResult(unitId, { items: [item] });
        }
        return createUnitResult(unitId);
      }),
      'cumulative',
      'mid',
      '2025-2026',
    );

    const absoluteNa = categories.find(category => category.key === 'absolute-na');

    expect(absoluteNa?.items).toHaveLength(1);
    expect(absoluteNa?.items[0]?.totalUnits).toBe(UNIT_IDS.length);
  });

  it('treats raw "NA" / "N/A" variants as Not Applicable', () => {
    const categories = computeCategories(
      UNIT_IDS.map((unitId, index) => {
        const item = createActionItem('Not Applicable');
        if (index === 0 || index === 1) {
          Object.values(item.terms).forEach(td => {
            // Surface a non-canonical raw value that isNotApplicableStatus recognizes.
            td.spStatus = (index === 0 ? 'NA' : 'N/A') as Status;
            td.spStatusRaw = index === 0 ? 'NA' : 'N/A';
            td.yearlyStatus = (index === 0 ? 'NA' : 'N/A') as Status;
            td.yearlyStatusRaw = index === 0 ? 'NA' : 'N/A';
          });
        }
        return createUnitResult(unitId, { items: [item] });
      }),
      'cumulative',
      'mid',
      '2025-2026',
    );

    const absoluteNa = categories.find(category => category.key === 'absolute-na');

    expect(absoluteNa?.items).toHaveLength(1);
    expect(absoluteNa?.items[0]?.totalUnits).toBe(UNIT_IDS.length);
  });

  it('unifies action steps across units when one uses a non-breaking hyphen', () => {
    const baseStep = 'Produce a template for an optional co-curricular transcript';
    const nbspHyphenStep = 'Produce a template for an optional co\u2011curricular transcript';

    const categories = computeCategories(
      UNIT_IDS.map((unitId, index) => createUnitResult(unitId, {
        items: [createActionItem('Not Applicable', {
          actionStep: index === 0 ? nbspHyphenStep : baseStep,
          // Distinct sourceKey/sheetRow so they only merge via the step-match alias.
          sourceKey: index === 0 ? 'II|row-99' : 'II|row-5',
          sheetRow: index === 0 ? 99 : 5,
          pillar: 'II',
        })],
      })),
      'cumulative',
      'mid',
      '2025-2026',
    );

    const absoluteNa = categories.find(category => category.key === 'absolute-na');
    expect(absoluteNa?.items).toHaveLength(1);
    expect(absoluteNa?.items[0]?.totalUnits).toBe(UNIT_IDS.length);
  });

  it('unifies action steps across units when one has a trailing period', () => {
    const baseStep = 'Produce a template for an optional co-curricular transcript';
    const withPeriod = baseStep + '.';

    const categories = computeCategories(
      UNIT_IDS.map((unitId, index) => createUnitResult(unitId, {
        items: [createActionItem('Not Applicable', {
          actionStep: index === 0 ? withPeriod : baseStep,
          sourceKey: index === 0 ? 'II|row-99' : 'II|row-5',
          sheetRow: index === 0 ? 99 : 5,
          pillar: 'II',
        })],
      })),
      'cumulative',
      'mid',
      '2025-2026',
    );

    const absoluteNa = categories.find(category => category.key === 'absolute-na');
    expect(absoluteNa?.items).toHaveLength(1);
    expect(absoluteNa?.items[0]?.totalUnits).toBe(UNIT_IDS.length);
  });

  it('unifies action steps with smart-quote vs straight-quote variants', () => {
    const baseStep = "Publish the dean's annual report";
    const smartStep = 'Publish the dean\u2019s annual report';

    const categories = computeCategories(
      UNIT_IDS.map((unitId, index) => createUnitResult(unitId, {
        items: [createActionItem('Not Applicable', {
          actionStep: index === 0 ? smartStep : baseStep,
          sourceKey: index === 0 ? 'II|row-99' : 'II|row-5',
          sheetRow: index === 0 ? 99 : 5,
          pillar: 'II',
        })],
      })),
      'cumulative',
      'mid',
      '2025-2026',
    );

    const absoluteNa = categories.find(category => category.key === 'absolute-na');
    expect(absoluteNa?.items).toHaveLength(1);
    expect(absoluteNa?.items[0]?.totalUnits).toBe(UNIT_IDS.length);
  });

  it('does NOT merge genuinely different action steps (negative case)', () => {
    const baseStep = 'Produce a template for an optional co-curricular transcript';
    const differentStep = 'Produce a template for a co-curricular newsletter';

    const categories = computeCategories(
      UNIT_IDS.map((unitId, index) => createUnitResult(unitId, {
        items: [createActionItem('Not Applicable', {
          actionStep: index === 0 ? differentStep : baseStep,
          sourceKey: index === 0 ? 'II|row-99' : 'II|row-5',
          sheetRow: index === 0 ? 99 : 5,
          pillar: 'II',
        })],
      })),
      'cumulative',
      'mid',
      '2025-2026',
    );

    const absoluteNa = categories.find(category => category.key === 'absolute-na');
    // Two distinct steps → neither has 24/24 → both excluded.
    expect(absoluteNa?.items).toHaveLength(0);
  });
});
