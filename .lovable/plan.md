# Healthcare Strategic Plan Dashboard — Phase 1 (Architecture + Prototype)

## Excel analysis (already completed)

Extracted from `LAU-HS SP Complete Working file Q2 2026.xlsx` — 7 sheets, one per Strategic Goal:

| Goal | Title | Champion(s) | Actions | Steps |
|---|---|---|---|---|
| 1 | Enhance National and Regional Healthcare Leadership and Visibility | Zeina Khoury-Stevens | 3 | 13 |
| 2 | Advance Academic-Clinical Integration and Collaborative Practice | Sola Bahous | 3 | 24 |
| 3 | Foster Integrative Quality Clinical Services and Patient-Centered Care | Karl Jallad, Stephanie Irani | 4 | 13 |
| 4 | Lead Digital Health Transformation and Innovation | Roy Majdalani, Camille Abou-Nasr, Christian Bejjani | 4 | 24 |
| 5 | Position LAU Health System as an Employer of Choice | HS-COO | 2 | 5 |
| 6 | Expand and Develop an Agile and Sustainable Integrated Academic Health System | Sami Rizk, Sally Al-Rabbaa, Christian Bejjani | 3 | 12 |
| 7 | Develop Community-Based Health Care Outreach and Education Programs | Naser Alsharif | 2 | 8 |

Common per-sheet structure: Champion (row 1) → Goal title → Action header → Goal-level KPIs → Action Steps table with columns:
`Action Step | Intent | KPIs | Champion(s) | Priority | Responsible (R) | Accountable (A) | Consulted (C) | Informed (I) | Status Q1 2026 | Q2 2026 | Q3 2026 | Q4 2026 | Q1 2027 | Budget Y1–Y5 (amount + note)`.

This will be packaged as the **Healthcare SP Analysis Report** (admin-only page) inside the app — covering all 10 sections (A–J) requested.

## Scope of this phase

Prototype only. **No** Excel ingestion, OneDrive/Graph, parsers, sync, or Healthcare DB tables. Static seed data inspired by the file. Architecture is laid out so a later phase can plug a real data layer in without UI rewrites.

## Architecture

### Roles (additive, non-breaking)

Extend `app_role` enum with three new values via migration:
- `healthcare_admin`
- `healthcare_executive`
- `healthcare_viewer`

Existing university roles are untouched. A future user can hold multiple rows in `user_roles` to access both dashboards.

### Routing

```text
/healthcare                    Healthcare Executive Dashboard (7 tabs)
/admin                         Admin Panel  ← gains "Dashboard Access" section
/admin/healthcare-analysis     Admin-only Healthcare SP Analysis Report
```

`ProtectedRoute` guards:
- healthcare_* roles → forced to `/healthcare`
- admin → access everywhere (incl. healthcare + analysis report)
- university roles → blocked from `/healthcare`

### Prototype Healthcare account

Edge function `seed-healthcare-user` creates `SP_Healthcare / SP_Healthcare` with role `healthcare_executive`. Username login already supports Pattern B via `dashboard-login`; we add the username→email mapping.

### Module layout (mirrors `/executive`)

```text
src/
  pages/HealthcareDashboard.tsx
  components/healthcare/
    HealthcareSidebar.tsx       (reuses ExecutiveSidebar styles)
    HealthcareHeader.tsx
    tabs/
      ExecutiveSnapshot.tsx
      StrategicGoalsOverview.tsx
      GoalExplorer.tsx
      ExecutionIntelligence.tsx
      BudgetIntelligence.tsx
      GovernanceOwnership.tsx
      FutureIntegrationVision.tsx
  lib/healthcare/
    sample-data.ts              (7 goals from Excel + realistic mock metrics)
    types.ts
  components/admin/
    DashboardAccessPanel.tsx    (assign University / Healthcare / Both)
    HealthcareAnalysisReport.tsx
```

All visual primitives — cards, KPI strip, RI-meter, FilterBar shell, tooltips, typography, pillar-style accent system — are **reused** from the University dashboard. Only one subtle healthcare cue: an emerald medical accent token `--hc-accent` layered over the existing dark palette.

## Tabs (prototype content)

1. **Executive Snapshot** — overall progress, status distribution donut, 7-goal progress bar chart, top risks, executive insights card.
2. **Strategic Goals Overview** — 7 goal cards (title, champion, progress, # actions, # steps, budget chip, risk chip), filter by champion / priority / risk.
3. **Goal Explorer** — left list of goals → detail panel with actions → action steps with intent, KPIs, RACI, quarterly status, budget Y1–Y5, quarterly notes.
4. **Execution Intelligence** — delayed initiatives, at-risk, high-priority, governance gaps (missing R/A/C/I), leadership decisions required, bottlenecks.
5. **Budget Intelligence** — budget by goal, by funding source (mock: Operational / Capital / Grant / Philanthropy), by year (Y1–Y5), funding risk, concentration, observations.
6. **Governance & Ownership** — Champions board, RACI distribution heatmap, missing-ownership list, governance risks.
7. **Future Integration Vision** — phased roadmap (Phase 1/2/3), executive architecture diagram, shared-metric catalogue.

## Admin enhancements

`AdminPanel` gains a **Dashboard Access** card per user:
- toggle University access
- toggle Healthcare access
- pick Healthcare role (admin / executive / viewer)
- reset Healthcare password (reuses existing `admin-reset-password`)

Backed by inserting/removing rows in `user_roles` — no schema change beyond the enum.

## Analysis Report page (admin-only)

`/admin/healthcare-analysis` — single scrollable page with the 10 sections (A Strategic Goals, B Actions, C KPIs, D Ownership/RACI, E Budget, F Reporting, G Similarities with University, H Differences, I Data Quality Observations, J Proposed Future Data Model). Printable / PDF-export ready using existing `export-pdf.ts` helper.

## Migrations

Single migration:
1. `ALTER TYPE app_role ADD VALUE 'healthcare_admin'` (+ executive, viewer)
2. No new tables (prototype is static).

Edge function: `seed-healthcare-user` (one-shot, admin-callable).

## Out of scope (explicitly deferred)

OneDrive, MS Graph, Excel import engine, sync, Supabase ingestion, automated refresh, Healthcare data-quality monitoring pages.

## Deliverables checklist

- [x] Excel analysis (done — embedded above and into the in-app report)
- [ ] Roles migration + seed function for `SP_Healthcare`
- [ ] Healthcare dashboard (7 tabs, sidebar, header) using University design system
- [ ] Admin → Dashboard Access management
- [ ] Admin → Healthcare SP Analysis Report
- [ ] Routing + `ProtectedRoute` updates
- [ ] Future integration roadmap (Tab 7)

Estimated footprint: ~15 new files, 4 edited files, 1 migration, 1 edge function. All static data — no live integration.

Approve and I'll build it end-to-end.
