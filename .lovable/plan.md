## Diagnostic Report

**Verdict: TRUE bug.** Real inconsistency between Pillar Champions → Action Explorer and University → Items Requiring Immediate Attention → Absolute NA. The aggregation math is correct in isolation; the two views just disagree on what counts as "Not Applicable".

### Root cause

Two different status classifiers run on the same `ActionItem.terms[mid-2025-2026]`:

**Pillar Champion → Action Explorer** (`src/components/pillar-champions/ActionExplorer.tsx:117–120`)
- Reads `getItemStatus(item, …)` → returns the typed `td.spStatus` (`src/lib/intelligence.ts:92–95`).
- Uses `isNotApplicableStatus(status)` (`src/lib/types.ts:105–110`), which treats `null`, `undefined`, empty string, `-`, `—`, `NA`, `N/A`, and any case of `"Not Applicable"` as Not Applicable.
- Net effect: a cell the spreadsheet **left blank** is still rendered as "NA" in the per-unit list, because `spStatus` defaults to `'Not Applicable'` when the cell is empty.

**University → StrategicCoverageGaps** (`src/components/executive/StrategicCoverageGaps.tsx:596–610`)
- Uses `classifyCoverageUnitStatus`, which:
  1. Returns `'blank'` whenever `spStatusProvided === false` (cell was empty / merged / default-filled), even if `spStatus === 'Not Applicable'`.
  2. Returns `'blank'` if the raw `spStatus` string is anything other than the five exact values in `VALID_STATUSES` (line 102–108). So `"NA"`, `"N/A"`, `"not applicable"`, or a trailing-whitespace variant ends up as `blank` even though `isNotApplicableStatus()` would say NA.
- Absolute NA only fires when `naCount === 24 && blankCount === 0 && missingCount === 0` (line 937).

For **Pillar II → Goal 1 → Action 5 → Action Step 5 ("Produce a template for an optional co-curricular transcript")**, at least one of the 24 unit sheets leaves the mid-year cell empty (or types `"NA"` instead of `"Not Applicable"`). Action Explorer silently coerces that to NA and shows 24/24. Strategic Coverage Gaps correctly labels it `blank` and excludes the item from Absolute NA. Both views are internally consistent; they answer slightly different questions.

### Scope

- **Affected:** University → Items Requiring Immediate Attention → **Absolute NA** and **Majority NA** (both gated on `blankCount === 0` implicitly through the strict path and the cleaned `naCount`).
- **Not affected:** KPI cards, Risk Index, Completion %, Pillar Health Grid, Risk Distribution, Unit Heat Map, AI Insights — `src/lib/university-aggregation.ts` (`countStatuses`, lines ~109–161) already uses `isNotApplicableStatus()` and excludes blanks from both numerator and denominator. So percentages are unaffected; only the **Items Requiring Immediate Attention** panel under-reports.
- **Likely additional cases:** Any action step that is "Not Applicable" in most units but typed as `NA`/`N/A`/blank in one or two sheets will exhibit the same symptom. Pillar II is one example; the same can appear in any pillar.

### Recommended fix (single source of truth)

Make the University view use the **same NA semantics** as the rest of the codebase (`isNotApplicableStatus`) so the two dashboards agree.

In `src/components/executive/StrategicCoverageGaps.tsx`, change `classifyCoverageUnitStatus` (~lines 596–610):

```text
1. Drop the VALID_STATUSES gate. Anything matching isNotApplicableStatus()
   → 'na', regardless of spStatusProvided or surface variants ("NA", "N/A",
   "not applicable", "-", "—", blank).
2. Only classify as 'non-na' when status is one of the 4 non-NA canonical
   values (Not Started / In Progress / Completed – On Target /
   Completed – Below Target).
3. Reserve 'blank' strictly for unrecognized typed text (typos), not for
   empty cells.
```

Effect:
- `Goal 1 → Action 5 → Action Step 5` (and any peers) will now appear under Absolute NA whenever all 24 units are NA in any of those equivalent forms — matching what the Pillar Champion Action Explorer already shows.
- "Items typed something invalid" still surface as `blank` and stay out (data-quality protection preserved).
- KPI math is untouched (it lives in `university-aggregation.ts` and already uses `isNotApplicableStatus`).

### Validation

- Update `src/test/strategic-coverage-gaps.test.ts`: add a case where 23 units have explicit `"Not Applicable"` and 1 unit leaves the cell blank — must now appear in Absolute NA.
- Add a case with one unit typed `"NA"` — must also appear in Absolute NA.
- Existing tests (non-NA blocker, failed-unit, alias merging) should continue to pass: a unit with a real non-NA status still blocks inclusion.
- Manual check after deploy: Pillar II → Goal 1 → Action 5 → Action Step 5 visible in **Absolute NA** mid-year.

### Impact summary

| Area | Affected? |
|---|---|
| Absolute NA / Majority NA visibility | Yes — fixed |
| KPI percentages (Progress, Completion, Risk Index) | No |
| Pillar Health Grid, Risk Distribution, Unit Heat Map | No |
| Pillar Champions dashboard | No |
| Monthly snapshot / cache / refresh logic | No |

Scope is a single-file logic change plus test additions.
