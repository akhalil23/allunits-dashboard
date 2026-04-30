# Add a Trajectory Trendline to My Sessions Comparison

## The Idea (sophisticated yet simple)

When a user compares 2–5 snapshots from the **same context**, render a small **Trajectory Trendline** at the top of the comparison view — one mini line chart per context KPI — with the snapshots placed on the X-axis in **chronological order** (by `created_at`, regardless of selection order).

Around it, add two simple but high-signal touches inspired by the Snapshot Tracker and Unit Comparison tabs:

1. **Trajectory Trendline cards** — one compact `LineChart` per KPI defined by the active context (e.g. Completion / On Track / Risk Index for `snapshot`; Utilization / Commitment / Spending for `budget`).
2. **Momentum Verdict pill** per KPI — a single word derived from the slope between first and last point: `Improving`, `Declining`, `Stable`, `Volatile` (volatile if direction flips ≥2 times across the series). Colored using the existing risk palette logic.
3. **Reference baseline** — a dashed horizontal line at the value of the first (oldest) snapshot, so any later snapshot's distance from the baseline is visually instant.

Nothing new to capture, no schema changes, no new dependencies — just a new visual layer over data the snapshots already carry.

## Why this fits

- **Reuses what exists**: the Snapshot Tracker (`SnapshotTracker.tsx`) already uses `recharts` `LineChart` for trajectory; we lift the same pattern into `MySessionsTab` `CompareView`.
- **Reuses context-aware KPIs**: `buildContextKpiRowsMulti` in `src/lib/session-context-kpis.ts` already returns the right metrics per context. We feed the same rows into the trendline — so a `budget` comparison shows budget trendlines, a `risk-priority` comparison shows risk trendlines. No misleading cross-context metrics.
- **Honors the existing rule**: trendlines only render when `isKpiComparableContext(context)` is true and all selected snapshots share the same context. Mixed-context comparisons keep the existing "Limited comparability" behavior.
- **Chronology, not selection order**: the user picks any 2–5 snapshots in any order; the trendline always plots them oldest → newest, which is what makes the line meaningful.

## What the user sees

```text
┌─ Trajectory (3 snapshots, oldest → newest) ──────────┐
│  Completion %      [Improving ↑]                     │
│  ╭──────────── line chart ─────────────╮             │
│  │ 62 ─ ─ ─ ─ ─ ─ ─ ─ ─ baseline       │             │
│  │      ╲___                           │             │
│  │          ╲____                      │             │
│  │                ╲___ 71              │             │
│  ╰─────────────────────────────────────╯             │
│  S1 (Sep 12)   S2 (Nov 04)   S3 (Jan 21)             │
└──────────────────────────────────────────────────────┘
```

Followed by the existing KPI table and Filters table (unchanged).

## Technical Implementation

**Files touched:**

- `src/lib/session-context-kpis.ts` — add a small helper:
  - `computeMomentum(values: number[], { higherIsBetter: boolean }): 'Improving' | 'Declining' | 'Stable' | 'Volatile'`
  - For each KPI def, tag `higherIsBetter` (e.g. Completion = true, Risk Index = false, Below Target = false). Add this flag to the existing `MetricDef`.

- `src/components/executive/MySessionsTab.tsx` — inside `CompareView`:
  - Sort the selected snapshots by `created_at` ascending into `chronological`.
  - When `sameContext && isKpiComparableContext(ctx)` and `chronological.length >= 2`, render a new `<TrajectorySection>` above the KPI table.
  - Build series via `buildContextKpiRowsMulti(ctx, chronological)`; for each row, render a `<MiniTrendChart>` with X = snapshot label (`S1 … Sn` + short date), Y = value, plus a dashed `ReferenceLine` at `values[0]`.
  - Show the momentum pill next to each KPI title, colored:
    - `Improving` → `text-emerald-500`
    - `Declining` → `text-rose-500`
    - `Stable` → `text-muted-foreground`
    - `Volatile` → `text-amber-500`

- New tiny internal component `MiniTrendChart` (in the same file, no new file needed) using the same `recharts` imports already used by `SnapshotTracker`.

**No backend changes.** No migrations. No new dependencies.

## Edge cases handled

- Only 2 snapshots → trendline still renders (two-point line + baseline). Momentum is `Improving`/`Declining`/`Stable` — never `Volatile`.
- Same `created_at` collisions → stable secondary sort by `id`.
- Mixed contexts → trajectory section is hidden; existing limited-comparability notice stays.
- Non-comparable contexts (`ai-insights`, `reports`, `guide`) → hidden, same as today's KPI table.

## Out of scope (kept simple on purpose)

- No regression line, no forecast, no per-pillar drilldown inside the trendline.
- No new export changes in this step (PDF/CSV remain table-based). Easy follow-up if desired.
