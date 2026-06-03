
# Healthcare SP Dashboard v2 — Remaining Implementation

`helpers.ts` (revised methodology) is already done. This plan covers the rest of v2.

## 1. Navigation simplification
**`HealthcareSidebar.tsx`** — Reduce `HCTab` union and `tabs[]` to 6 items: Executive Snapshot, Goals Overview, Goal Explorer, Quarterly Execution, Decisions & Blockers, Budget Intelligence. Remove `raci` and `roadmap` from nav (components kept on disk, referenced from Dashboard Guide as "future phases").

**`HealthcareDashboard.tsx`** — Drop `raci` and `roadmap` from `TITLES` and the render switch; keep file imports unused-safe by removing them.

## 2. Header + Dashboard Guide
**`HealthcareHeader.tsx`** — Add a "Dashboard Guide" button (BookOpen icon) next to the Phase 1 badge, opens `DashboardGuideDrawer`.

**`DashboardGuideDrawer.tsx` (new)** — Right-side sheet using existing `Sheet` component. 10 sections:
1. Purpose & audience
2. How to navigate (6 tabs)
3. Completion methodology (weights table, blocked exclusion rule)
4. Risk Index methodology (4 binary signals × 25, bands)
5. Reporting Coverage definition
6. Budget assumptions (5-year phasing, funding-source treatment)
7. Status taxonomy (4-state Healthcare-native model)
8. Data source & refresh cadence (prototype data note)
9. Assumptions requiring stakeholder validation
10. Future phases (RACI cockpit, Governance roadmap, integrated executive view)

Each section uses `Collapsible` for scannability. Premium executive tone, no jargon.

## 3. Executive Snapshot rebuild
**`ExecutiveSnapshot.tsx`** — Replace current layout with:
- **KPI row (5)**: Portfolio Completion % (excl. blocked, with "X steps blocked / Y" sub), Reporting Coverage % (Q2 2026), Risk Signals Fired, Active Blockers, 5-Year Budget.
- **Progress by Goal** card: derived completion %, blocked-count chip per goal.
- **Risk Signals card**: 4 signals listed with count fired and bar — no composite/decorative score, fully auditable.
- **Status donut** (4-state).
- **Decisions & Blockers preview** (top 5, jump link).
- **Budget vs Derived Completion** scatter (recharts) with prominent "Derived — based on prototype completion rules" badge and tooltip showing raw budget, derived %, blocked count.
- **Funding Source mix** stacked bar.

## 4. Quarterly Execution rebuild
**`QuarterlyExecution.tsx`** — Replace status-matrix with 4 visuals derived from `step.quarterly[]`:
1. **Activity Heatmap** — goals × quarters, cell intensity = count of updates recorded.
2. **Updates by Quarter** — bar chart of update counts (real data, not derived).
3. **Status Evolution Strip** — per-goal horizontal strip showing status transitions Q1 2026 → Q1 2027.
4. **Latest Quarter Narratives** — collapsible list with "Missing Q2 update" badges where applicable.

## 5. Budget Intelligence enhancements
**`BudgetIntelligence.tsx`** — Add:
- Budget vs Derived Completion scatter (with methodology badge).
- Funding source concentration (Herfindahl-style note in tooltip).
- Per-goal budget table with derived-completion column and blocked-steps column.
Keep existing 5-year phasing visual.

## 6. Decisions & Blockers enhancements
**`DecisionBlockersBoard.tsx`** — Add filters (by decision owner, blocker type), show risk-signals chips per blocker, and link each blocker to its goal in Goal Explorer.

## 7. Goal Explorer
**`GoalExplorer.tsx`** — Inline absorb of RACI strip (Responsible/Accountable/Consulted/Informed badges), Champion + Priority + Blocker chips, and risk-signal chips per step. No nav change required beyond surfacing.

## 8. Strategic Goals Overview
**`StrategicGoalsOverview.tsx`** — Switch progress numbers to derived completion (excl. blocked); add blocked-count chip and risk-signals-fired chip per goal card.

---

### Technical notes
- All percentages must come from `helpers.ts` v2 functions (`portfolioCompletion`, `goalCompletion`, `riskIndex`, `reportingCoverage`).
- Every derived metric surface must carry a small "Derived" badge or methodology tooltip linking to the Dashboard Guide.
- Components removed from nav (`RACIChampionCockpit.tsx`, `GovernanceRoadmap.tsx`) stay on disk and are referenced from the Guide's "Future phases" section.
- Premium dark aesthetic preserved (pure white text on medium-grey, emerald accent, no pastels).

### Build order
1. Sidebar + Dashboard page (nav reduction)
2. Header + Guide Drawer
3. Executive Snapshot
4. Quarterly Execution
5. Budget Intelligence
6. Decisions & Blockers
7. Goal Explorer + Goals Overview polish
