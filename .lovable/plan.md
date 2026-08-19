# Healthcare SP — Target Real-Data Architecture (Goal 3 Pilot)

Architecture only. No code, no tables, no import, no OneDrive.

## 1. Actual Goal 3 sheet structure (verified)

Sheet `Goal 3 reviewed`: two header rows (row 1 = band labels, row 2 = column names), data rows 3–15 (13 Action Steps, 4 Actions). Goal/Action/Action KPI/SPOC cells are **merged vertically** (A3:A15, B3:B6, B7:B11, B12:B13, B14:B15) — parser must forward-fill.

Columns (SOURCE INPUT unless noted):

| Excel | Field | Notes |
|---|---|---|
| A | Goal title | merged; `GOAL 3 : ...`; champion in row 1 (`Champion: Karl Jallad`) |
| B | Action title | merged, code embedded (`Action 3.1: ...`) |
| C | Action KPI (free text, multi-line) | merged |
| D | Action SPOC | merged |
| E | Action Step (code + title, `3.1.1 ...`) | stable dotted ID |
| F | Intent |
| G | Action Step Owner |
| H | Priority | numeric 1–3 |
| I–L | Responsible / Accountable / Consulted / Informed | free text, may hold multiple names |
| M | KPIs (original wording) | traceability text |
| N | KPI Type | e.g. Percentage, Count |
| O | KPI Target Value | numeric (0.8 stored for 80%) |
| P | KPI Target Unit |
| Q | KPI Target Date | text quarter, e.g. `Q4 2026` |
| R–AA | **Q1 2026** block: Progress Update/Comments, Status, Execution Progress %, KPI Actual Value, Blocker?, Blocker Category, Blocker Details, Next Milestone, Expected Milestone Date, Supporting Evidence |
| AB–AK | Q2 2026 block (same 10 fields) |
| AL–AU | Q3 2026 block |
| AV–BE | Q4 2026 block |
| BF–BO | Q1 2027 block |
| BP,BR,BT,BV,BX | Budget Year 1–5 amount |
| BQ,BS,BU,BW,BY | Budget note per year (e.g. `4 FTE`, `Ambulances $300,000`) |

Validated dropdowns (authoritative enums):
- Status: `Not Started, In Progress, Completed, Blocked`
- Blocker?: `Yes, No`
- Blocker Category: `Funding, Recruitment, Approval, Capacity, External Dependency, Procurement, Technology, Other`

Current data reality: only Progress Update text is populated for some rows; Status, Execution Progress %, KPI Actual, Blocker and Milestone cells are **empty**. Target dates exist for 2 of 13 steps. There is **no funding-source column** and no actual/committed spend.

Empty cells frequently contain non-breaking spaces (`\xa0`) — normalization required.

## 2. Target data model

```text
hc_goal(id, code, title, champion, display_order)
 └ hc_action(id, goal_id, code, title, action_kpi_text, spoc, display_order)
    └ hc_action_step(id, action_id, code, title, intent, owner, priority,
                     responsible, accountable, consulted, informed, display_order)
       ├ hc_kpi(id, step_id, original_text, kpi_type, target_value, target_unit,
       │        target_date_raw, target_period, direction, measurable)
       ├ hc_quarterly_update(id, step_id, period, status, execution_progress_pct,
       │        kpi_actual_value, blocker_flag, blocker_category, blocker_details,
       │        next_milestone, expected_milestone_date, comments, evidence,
       │        updated_at, source_ref)
       └ hc_budget_year(id, step_id, year_label, amount, note, funding_source?)
hc_import_batch(id, filename, imported_by, imported_at, status, warnings)
hc_period(code, label, start_date, end_date, is_current)   -- config, kills CURRENT_QUARTER
```
Dotted codes (`3.1.1`) are the stable natural keys; `code + goal` is the import upsert key. Blockers and Milestones are **not** separate tables — they are fields on the quarterly update (matching Excel), surfaced as derived views.

**Import traceability:** every `hc_*` row carries `import_batch_id` (plus `first_seen_batch_id` on entities), and quarterly updates are stored append-only per batch rather than overwritten. This gives quarter-over-quarter comparison, audit history, rollback to a prior batch, and per-batch validation review. `hc_import_batch` records filename, uploader, timestamp, status, row counts, and the validation report.

`direction` (higher-is-better / lower-is-better) and `measurable` are **not auto-inferred unless unambiguous** (e.g. explicit "reduce"/"increase" wording or a clearly directional KPI type). Otherwise the KPI is stored as `direction = 'unvalidated'`, flagged in the validation report for manual confirmation, and remains configurable per KPI. Achievement % is not computed while direction is unvalidated.


## 3. Calculation layer (all DERIVED OUTPUT)

- **Step progress** = latest non-null `execution_progress_pct` — the primary and preferred real-data source. When blank, a fallback applies **only** for: Not Started → 0%, Completed → 100%. **In Progress and Blocked receive no inferred percentage** — progress is `null` / "Not reported", excluded from averages, and counted in a "progress not reported" indicator. Every value carries `progress_source = 'reported' | 'status_fallback' | 'not_reported'` and the UI labels non-reported values.
- **Action / Goal progress** = unweighted mean over applicable steps with a usable value; steps with `not_reported` are excluded from the numerator and denominator and shown as a coverage caveat next to the figure. Weighting hook reserved for later.
- **Portfolio progress** = mean across goals, enabled only after Goals 1–7 migrate.
- **KPI Achievement %** = actual/target×100 for higher-is-better, target/actual×100 for lower-is-better; null when target, actual, or a validated direction is missing → `Not Yet Measurable`.
- **KPI classification**: Achieved (≥100%), On Target, Below Target, Not Yet Measurable. On/Below Target require a validated Expected Progress rule; until then measurable KPIs with no verdict report as `Pending methodology`.
- **On-Target Rate** = On-Target measurable KPIs ÷ total measurable KPIs (only shown once the methodology is approved).
- **Expected Progress** — strategies `linear | milestone | manual` are all supported, but the **default is `not_defined` (pending stakeholder validation)**. No trajectory is assumed and no Actual-vs-Expected, Schedule Variance, or trajectory-based verdict is computed until a rule is selected in configuration; the UI shows "Expected progress not defined" instead of a number.
- **At-Risk** — signal list, each returning a human reason: Blocked status / Blocker = Yes; overdue milestone; missing current-period update; progress or KPI materially below expected **(only active once an expected-progress rule is approved)**. An item is At Risk if ≥1 signal fires; reasons are always rendered. Zero planned budget is **not** a signal on its own.
- **Risk Index** — Phase 1: no composite score; signals + At-Risk only. Phase 2 optional weighted index with a documented, configurable weight set. The authored `riskFlag` is removed; one framework.
- **Reporting Coverage (Goal 3 pilot)** = action steps with a valid current-period update ÷ **all applicable Goal 3 action steps**. The "expected to report" population is a configurable rule for later phases. Reported overall and by goal, with a missing-update list including Owner/Responsible.
- **Milestones**: Overdue (expected date < today, status ≠ Completed), Upcoming (next 90 days), Adherence % = met ÷ due.
- **Budget**: planned by step/action/goal/year, top funded actions, concentration, budget vs progress. **A Funding Gap is never inferred from planned budget = 0** — zero may legitimately mean no budget is required. Funding Gap is derived only from explicit structured data (e.g. a required-vs-allocated field or a Funding blocker) once such data exists. No funding source, spend, variance, or forecast is invented.

## 4. Ingestion & validation

Pilot scope: **Goal 3 only.** The parser reads only the `Goal 3 reviewed` sheet; Goals 1, 2, 4–7 are neither migrated, populated, nor altered. The schema and parser are goal-agnostic so later sheets plug in unchanged.

Admin uploads the workbook → parser (two-row header, forward-fill merged Goal/Action, `\xa0` normalization, quarter blocks read from row 1 band labels so periods come from the file) → validation report → preview diff against the previous batch → approve → persist as a new `hc_import_batch`. Nothing silently coerced; every row links to its batch, and a batch can be rolled back.


Validations: goal/action/step code format and uniqueness; step code prefix matches its action; status in enum; progress 0–100 numeric; blocker category in enum when Blocker=Yes; target value numeric when KPI type is numeric; target/milestone dates parseable (quarter or date); budget numeric; required fields (code, title). Warnings vs errors separated; errors block the batch, warnings are shown and importable.

Future OneDrive: Power Automate / Graph pushes the same workbook to a Healthcare ingestion edge function that reuses the identical parse → validate → persist path. Dashboard and calculation layers unchanged.

## 5. UI targets (same six tabs)

- **Executive Snapshot**: Goal Progress %, On-Target Rate, At-Risk Steps, Active Blockers, Reporting Coverage %, Total Planned Budget; status donut, progress by goal, KPI performance, actual vs expected (when validated), at-risk summary, budget vs progress. University visual grammar reused, Healthcare formulas.
- **Goal Explorer**: each step exposes status, execution %, original KPI, type, target, actual, achievement %, performance vs target, target date, blocker + category/details, next milestone + date, at-risk reason list, quarterly comments, RACI, budget, evidence.
- **Quarterly Execution**, **Decisions & Blockers**, **Budget Intelligence**, **Guide** — same concepts, fully data-driven; guide documents every derived metric and flags provisional rules.

## 6. KEEP / ADAPT / REBUILD

- KEEP: `/healthcare` shell, roles/access, six-tab nav, drill-down concept, all four tab concepts, guide concept, visual language.
- ADAPT: `types.ts`, `helpers.ts` (take a dataset argument), progress/status logic, quarterly model, coverage, budget calcs, Goal Explorer, Executive Snapshot, guide text.
- REBUILD (Healthcare only): `sample-data.ts` as source of truth, ingestion, persistence, KPI/target subsystem, achievement + expected progress, on/below target derivation, real budget rows, dynamic periods, validation, mock generators, `riskFlag` duality.

## 7. Protected / untouched

`ProtectedRoute`, `AuthContext`, main login, `use-user-role`, Admin user lifecycle, University routes, `DashboardContext`, `university-aggregation.ts`, `unit-config.ts`, University edge functions and tables, Unit and Pillar Champion dashboards, domain/publish config. All Healthcare tables, functions, routes and role usage are strictly additive. Only additive touchpoint anticipated: new `/healthcare/admin` route entry and new `hc_*` tables with their own RLS + grants keyed to the existing healthcare roles — no enum or guard change needed.

## 8. Pilot sequence

1. Finalize Goal 3 workbook fields. 2. Persistence + controlled import. 3. Calculation layer. 4. Validate every Goal 3 output against Excel. 5. Refine progress / target alignment / at-risk. 6. Extend to Goals 1–7. 7. OneDrive via Power Automate/Graph. 8. Refresh logs, versioning, audit.

## 9. Open business rules for stakeholder validation

- Expected-progress methodology (linear vs milestone-based) and the variance threshold for "materially below".
- What to display when Execution Progress % is blank but a status exists (current sheet is fully blank on these columns).
- KPI direction per KPI (no column exists) and which KPIs are non-measurable by nature.
- Whether Action/Goal progress should stay unweighted or use priority weighting.
- Funding source and any actual-spend fields — not in the workbook today.
- Whether target dates stay quarter-granular (`Q4 2026`) or move to real dates.
- Which steps are "expected to report" each quarter (all, or only started ones).
