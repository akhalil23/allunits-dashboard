## Plan

1. **Reproduce the mismatch in code**
   - Add a focused regression case for `Pillar II → Goal 1 → Action 5 → Action Step 5` for `Cumulative (SP) • AY 2025-2026 • Mid-Year`.
   - Assert it appears in `Absolute Not Applicable`, not only in `Majority Not Applicable`.

2. **Fix the aggregation key collision**
   - Update `StrategicCoverageGaps` so cross-unit matching does **not** let a broad step-only alias merge this transcript item with unrelated rows or sustainability/R-goal items.
   - Keep the prior row-shift fix intact: do not use raw sheet row as the primary cross-unit key.
   - Prefer the strongest semantic key: pillar + normalized goal + normalized action + normalized action step.

3. **Add a targeted runtime guard**
   - For Mid-Year 2025-2026, log a clear diagnostic if the transcript item is present in all 25 unit payloads as NA but absent from `Absolute Not Applicable`.
   - Include counts by classification so future regressions show the blocking reason immediately.

4. **Verify in preview**
   - Open University dashboard → Strategic Risk & Priority → Mid-Year 2025-2026 → Absolute Not Applicable.
   - Confirm Pillar II expands beyond the current R1-only group and includes:
     `GOAL 1: Educate for Impact → Action 5 → 5. Produce a template for an optional co-curricular transcript`.

## Technical focus

The database confirms the item is NA in all 25 units for the latest `2026-06` snapshot. The live UI still shows only **43 Absolute NA** items and Pillar II only has R1 items, so the issue is in the client-side `StrategicCoverageGaps` alias/canonicalization pipeline rather than source data.