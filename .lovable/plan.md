## Diagnostic

The previous fix made `classifyCoverageUnitStatus` accept blank cells and `NA`/`N/A` variants as Not Applicable. That works only when all 24 units' rows land in the **same canonical step entry** (`stepMap`). The new symptom — Absolute NA returning empty — is the next layer of the same problem: cross-unit step matching.

### Why Pillar II → Goal 1 → Action 5 → Step 5 still doesn't appear

`computeCategories` unions per-unit items via alias keys built from:

1. `pillar|goal:<g>|action:<a>|step:<s>`
2. `pillar|action:<a>|step:<s>`
3. `pillar|row-<n>` (sheet row)
4. `pillar|step:<s>` (text-only fallback)

Step text is normalized only by `normalizeHierarchyGroupKey`, which just trims whitespace and lowercases (`src/lib/strategic-item-keys.ts:3–16`). It does NOT collapse punctuation. So any of the following diverges the alias and lands the unit in a separate `stepMap` entry — at which point it is counted as **missing** and excluded by `missingUnitIds.length === 0` (line 942):

- non-breaking hyphen vs ASCII hyphen in "co-curricular"
- trailing period / colon / parentheses in some sheets
- smart quotes / curly apostrophes
- different sheet row across units (only the step-only fallback can save it, and only if step text matches byte-for-byte after lowercase+trim)

This is the same root family of bugs as before, on the matching axis instead of the classification axis.

KPI math is again unaffected (university-aggregation iterates per-unit, no cross-unit join).

## Proposed Fix

Single-file logic change in matching + a normalization helper, plus tests.

### 1. Add a strict step-matching key

In `src/lib/strategic-item-keys.ts`, add:

```ts
export function normalizeHierarchyMatchKey(raw): string
```

Lowercase, NFKC-normalize, replace any Unicode dash/quote/apostrophe with ASCII equivalent, strip all non-alphanumeric characters, collapse. Used **only for cross-unit matching**, not for display.

### 2. Use it in the step-only fallback alias

In `src/components/executive/StrategicCoverageGaps.tsx`, `buildCoverageAliasKeys`:

- Keep aliases 1–3 as-is (display-faithful).
- Replace the current step-only fallback (line 528) with:
  `${pillar}|stepmatch:${normalizeHierarchyMatchKey(actionStep)}` — punctuation/dash/quote insensitive.

Effect: rows that are semantically the same action step across units now union into one `stepMap` entry regardless of cosmetic punctuation differences or differing sheet rows.

### 3. Diagnostic logging

Extend the existing `[CoverageGaps][Absolute NA candidate]` DEV log to also emit, for any near-miss item (≥ 75% NA but excluded), the raw `actionStep` strings observed per unit + the alias keys produced. This makes the next regression instantly diagnosable from console.

### 4. Tests

Add to `src/test/strategic-coverage-gaps.test.ts`:

- 24 units, identical action step text **except** unit 0 uses a non-breaking hyphen — must appear in Absolute NA.
- 24 units, identical step text but unit 0's row is at a different `sheetRow` — must appear (already covered indirectly; add explicit case).
- 24 units, same step but unit 0 has a trailing "." — must appear.
- Negative: 24 units, unit 0's step text is genuinely different ("Produce a template for a co-curricular newsletter") — must NOT appear (still excluded as missing).

### Files

- `src/lib/strategic-item-keys.ts` — add `normalizeHierarchyMatchKey`
- `src/components/executive/StrategicCoverageGaps.tsx` — swap step-only fallback alias; extend DEV log
- `src/test/strategic-coverage-gaps.test.ts` — 4 new cases

### Impact

| Area | Affected? |
|---|---|
| Absolute NA / Majority NA visibility | Yes — fixed |
| KPI percentages | No |
| Pillar Health Grid, Risk Distribution, Unit Heat Map | No |
| Pillar Champions / Action Explorer | No |
| Snapshot / cache / refresh | No |

No semantic relaxation of "all 24 units must be NA" — only better matching of which row in each unit corresponds to the "same" action step.
