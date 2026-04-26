/**
 * Export helpers for the Dashboard Guide.
 * Two variants:
 *  - Brief: 1-page executive cheat sheet (key metrics, tabs, what's new).
 *  - Comprehensive: full reference (all sections, formulas, FAQ, glossary).
 */

import { UNIT_IDS } from '@/lib/unit-config';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!));
}

const COMMON_HEAD = `
<style>
  * { box-sizing: border-box; }
  @page { size: A4; margin: 14mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; padding: 16px; max-width: 980px; margin: auto; line-height: 1.45; }
  header { border-bottom: 2px solid #006751; padding-bottom: 10px; margin-bottom: 14px; }
  h1 { font-size: 22px; margin: 0; color: #006751; letter-spacing: -0.01em; }
  .sub { color: #64748b; font-size: 11px; margin-top: 4px; }
  h2 { font-size: 14px; margin: 18px 0 6px; color: #006751; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; text-transform: uppercase; letter-spacing: 0.04em; }
  h3 { font-size: 12px; margin: 10px 0 4px; color: #1a1a2e; }
  p, li { font-size: 11px; color: #334155; }
  ul { padding-left: 18px; margin: 4px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 6px 0 10px; }
  th, td { border: 1px solid #e2e8f0; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; font-weight: 600; color: #475569; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .pill { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 9.5px; font-weight: 600; margin-right: 4px; }
  .new { background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #fafbfc; }
  .pillar-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .pillar-chip { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; text-align: center; }
  .pillar-dot { width: 12px; height: 12px; border-radius: 999px; margin: 0 auto 3px; }
  .muted { color: #64748b; font-size: 10px; }
  .formula { font-family: 'SF Mono', Menlo, monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10.5px; }
  .section-break { page-break-before: always; }
  @media print { body { padding: 0; } a { color: inherit; text-decoration: none; } }
</style>
`;

function openPrintWindow(html: string, title: string) {
  const w = window.open('', '_blank', 'width=1024,height=720');
  if (!w) {
    throw new Error('Pop-up blocked. Please allow pop-ups to download.');
  }
  w.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title>${COMMON_HEAD}</head><body>${html}<script>window.onload=()=>{setTimeout(()=>window.print(),250);};</script></body></html>`);
  w.document.close();
}

const PILLARS = [
  { id: 'I', label: 'PI', color: '#3B82F6', name: 'Blue', full: 'Enhance Scholarly Footprint and Visibility' },
  { id: 'II', label: 'PII', color: '#06B6D4', name: 'Cyan', full: 'Educate for Impact & Innovate' },
  { id: 'III', label: 'PIII', color: '#8B5CF6', name: 'Violet', full: 'Innovate to Inspire' },
  { id: 'IV', label: 'PIV', color: '#EC4899', name: 'Pink', full: 'Advance & Educate Beyond Boundaries' },
  { id: 'V', label: 'PV', color: '#6366F1', name: 'Indigo', full: 'Strategic Accelerator: Empower with Purpose, Agility, and Sustainability' },
];

function pillarRow(): string {
  return `<div class="pillar-row">${PILLARS.map(p => `
    <div class="pillar-chip">
      <div class="pillar-dot" style="background:${p.color}"></div>
      <div style="font-weight:700;font-size:10.5px">${p.label}</div>
      <div class="muted">${p.name}</div>
    </div>
  `).join('')}</div>`;
}

/* ============================================================
 * BRIEF VERSION — 1–2 pages, executive cheat sheet
 * ============================================================ */
export function exportDashboardGuideBrief() {
  const html = `
    <header>
      <h1>Executive Command Center — Quick Reference</h1>
      <div class="sub">Strategic Plan IV (2025–2027) · ${UNIT_IDS.length} Units · 5 Pillars · Generated ${new Date().toLocaleDateString()}</div>
    </header>

    <h2>What's New</h2>
    <div class="card">
      <ul>
        <li><span class="pill new">NEW</span><b>ADM</b> — Administration unit added (now ${UNIT_IDS.length} reporting units, including ADM).</li>
        <li><span class="pill new">NEW</span><b>Personalized accounts</b> — 39 named board-member logins (e.g. <span class="formula">m.ahmar</span>, <span class="formula">f.nader</span>) with welcome banner.</li>
        <li><span class="pill new">NEW</span><b>My Sessions</b> — User-controlled "Saved Views": save current dashboard state, restore later, compare two snapshots, export PDF/CSV.</li>
        <li><span class="pill new">NEW</span><b>Welcome Banner</b> — Personal greeting on login (hidden for shared <span class="formula">sp4</span> account).</li>
      </ul>
    </div>

    <h2>Tabs at a Glance</h2>
    <table>
      <tr><th style="width:32%">Tab</th><th>Purpose</th></tr>
      <tr><td>1 · Executive Snapshot</td><td>SSI, KPI cards, alignment chart with Focus Mode, per-pillar diagnostics.</td></tr>
      <tr><td>2 · Strategic Risk &amp; Priority</td><td>Risk exposure, execution-gap rankings, heatmap, coverage gaps.</td></tr>
      <tr><td>3 · Budget Intelligence</td><td>Allocation, Commitment Ratio, Spending Ratio, per-pillar finance.</td></tr>
      <tr><td>4 · Unit Comparison</td><td>Side-by-side multi-unit comparison.</td></tr>
      <tr><td>5 · AI Executive Insights</td><td>AI-generated strategic interpretation of current view.</td></tr>
      <tr><td>6 · Reports</td><td>PDF report library by scope (University, Pillar, Unit).</td></tr>
      <tr><td>My Sessions <span class="pill new">NEW</span></td><td>Save, restore, compare and export your private dashboard views.</td></tr>
      <tr><td>Dashboard Guide</td><td>This reference. Downloadable in Brief or Comprehensive form.</td></tr>
    </table>

    <h2>Pillar Color Identity</h2>
    ${pillarRow()}
    <p class="muted" style="margin-top:4px">Colors are identity, not performance. Risk is conveyed through separate semantic colors.</p>

    <h2>Key Metrics — At a Glance</h2>
    <table>
      <tr><th>Metric</th><th>Formula / Bands</th></tr>
      <tr><td><b>SSI</b> Strategic Stability Index</td><td><span class="formula">0.4·Progress + 0.3·(100−|Progress−Commitment|) + 0.3·(100−RI%)</span><br/>85+ Highly Stable · 70–84 Stable · 50–69 Watch · &lt;50 Unstable</td></tr>
      <tr><td><b>Commitment Ratio</b></td><td>Committed ÷ Allocated · 0–10 None · 10–30 Light · 30–60 Mild · 60–80 Healthy · ≥80 Strong</td></tr>
      <tr><td><b>Spending Ratio</b></td><td>Spent ÷ Allocated · 0 None · &lt;20 Light · 20–50 Mild · 50–75 Healthy · ≥75 Strong</td></tr>
      <tr><td><b>Risk Index (RI)</b></td><td><span class="formula">(0·NoRisk + 1·Emerging + 2·Critical + 3·Realized) ÷ Applicable</span> · 0–25 Low · 26–50 Moderate · 51–75 High · 76–100 Severe</td></tr>
      <tr><td><b>Execution Gap</b></td><td>Actual Progress − Expected Progress (negative = behind schedule)</td></tr>
      <tr><td><b>Completion %</b></td><td>Weighted: COT=100, CBT=100, In Progress=actual, Not Started=0</td></tr>
    </table>

    <h2>My Sessions — How to Use</h2>
    <ol>
      <li>Click <b>Save to My Sessions</b> in the dashboard header to capture the current view (tab, AY, term, filters, KPIs).</li>
      <li>Open the <b>My Sessions</b> tab to see your private list.</li>
      <li>Click any session to <b>Restore</b> it, view <b>Detail</b>, or pick two for side-by-side <b>Compare</b>.</li>
      <li>Export individual sessions or comparisons as PDF / CSV.</li>
      <li>Sessions are private — strict per-user access (RLS).</li>
    </ol>

    <h2>Data Refresh</h2>
    <p>Live read from official online reporting sheets on every load/refetch. A clearly marked cached snapshot may briefly appear if the source is rate-limited.</p>
  `;
  openPrintWindow(html, 'Dashboard Guide — Brief');
}

/* ============================================================
 * COMPREHENSIVE VERSION — full reference manual
 * ============================================================ */
export function exportDashboardGuideComprehensive() {
  const html = `
    <header>
      <h1>Executive Command Center — Comprehensive Guide</h1>
      <div class="sub">Strategic Plan IV (2025–2027) · ${UNIT_IDS.length} Units · 5 Pillars · Generated ${new Date().toLocaleDateString()}</div>
    </header>

    <h2>1. Recent Amendments</h2>
    <table>
      <tr><th style="width:24%">Update</th><th>Description</th></tr>
      <tr><td>ADM unit added</td><td>Administration (<span class="formula">adm</span> / <span class="formula">adm</span>) is the ${UNIT_IDS.length}th unit. Fully integrated into routing, authentication, data ingestion, filters, comparisons, and university aggregations.</td></tr>
      <tr><td>Named board-member accounts</td><td>39 personal accounts created (e.g. <span class="formula">m.ahmar</span>, <span class="formula">f.nader</span>, <span class="formula">g.doumet</span>) with role <i>board_member</i> and <i>display_name</i> stored on profile.</td></tr>
      <tr><td>Welcome Banner</td><td>Personal greeting at top of Executive Dashboard. Hidden for shared <span class="formula">sp4</span> account.</td></tr>
      <tr><td>My Sessions (Saved Views)</td><td>User-controlled snapshot system replacing automatic tracking — see Section 9.</td></tr>
      <tr><td>Per-user data isolation</td><td>RLS on <span class="formula">user_session_snapshots</span> enforces <span class="formula">user_id = auth.uid()</span>. No cross-user visibility.</td></tr>
    </table>

    <h2>2. Dashboard Overview</h2>
    <p>The University Executive Command Center monitors Strategic Plan IV across <b>${UNIT_IDS.length}</b> units and <b>5</b> pillars. Workspace is organized into 6 working tabs, plus the personal <b>My Sessions</b> tab and the <b>Dashboard Guide</b> reference.</p>

    <h2>3. Pillar Color System (Fixed)</h2>
    ${pillarRow()}
    <table style="margin-top:8px">
      ${PILLARS.map(p => `<tr><td style="width:8%"><div class="pillar-dot" style="background:${p.color};margin:0"></div></td><td style="width:12%"><b>${p.label}</b></td><td>${p.full}</td></tr>`).join('')}
    </table>

    <h2>4. Tabs — Detailed</h2>
    <h3>Tab 1 — Executive Snapshot</h3>
    <p>SSI, Progress KPI cards, dual <b>Commitment Ratio</b> + <b>Spending Ratio</b> bars (replaced single Budget Utilization). Alignment chart supports <b>Focus Mode</b> (Execution / Budget). Per-pillar Alignment Insights deliver neutral diagnostic sentences with Execution Gap as the highlighted signal.</p>
    <h3>Tab 2 — Strategic Risk &amp; Priority</h3>
    <p>Risk Exposure by Pillar (Low/Moderate/High/Critical). Execution Gap ranking surfaces units behind schedule. Risk heatmap (unit × pillar). Critical Strategic Items + Coverage Gaps using strict row-based matching against the exact selected AY/term/view columns. Blank or missing statuses are excluded from NA denominators.</p>
    <h3>Tab 3 — Budget Intelligence</h3>
    <p>Allocation, Commitment, Available, dual ratio bars. Per-pillar analytics combine progress, risk, execution gap, and funding status. Budget Health uses the No Commitment Yet → Strong Commitment scale.</p>
    <h3>Tab 4 — Unit Comparison</h3>
    <p>Up to 5 units side-by-side across execution, risk, delivery signals.</p>
    <h3>Tab 5 — AI Executive Insights</h3>
    <p>AI-generated strategic interpretation aligned to current filters and dashboard context, including ADM, named user identity, and saved-session awareness.</p>
    <h3>Tab 6 — Reports</h3>
    <p>PDF library — University / Pillars / Units. Filter by Academic Year, reporting period, report type. Open inline or download.</p>
    <h3>My Sessions <span class="pill new">NEW</span></h3>
    <p>Personal "Saved Views" tab — see Section 9.</p>

    <h2>5. Key Metrics — Definitions &amp; Formulas</h2>
    <table>
      <tr><th>Metric</th><th>Definition</th><th>Calculation</th><th>Bands / Interpretation</th></tr>
      <tr><td><b>SSI</b></td><td>Composite executive signal of strategic stability.</td><td><span class="formula">0.4·Progress + 0.3·(100−|Progress−CommitmentRatio|) + 0.3·(100−RI%)</span></td><td>85–100 Highly Stable · 70–84 Stable · 50–69 Watch · &lt;50 Unstable</td></tr>
      <tr><td><b>Commitment Ratio</b></td><td>Share of allocation formally committed.</td><td>Committed ÷ Allocated</td><td>0–10 None · 10–30 Light · 30–60 Mild · 60–80 Healthy · ≥80 Strong</td></tr>
      <tr><td><b>Spending Ratio</b></td><td>Share actually disbursed.</td><td>Spent ÷ Allocated</td><td>0 None · &lt;20 Light · 20–50 Mild · 50–75 Healthy · ≥75 Strong</td></tr>
      <tr><td><b>Risk Index (RI)</b></td><td>Weighted structural risk.</td><td><span class="formula">(0·NoRisk+1·Emerging+2·Critical+3·Realized) ÷ Applicable</span> · In-Progress: Gap&gt;50%→Critical, 20–50%→Emerging, &lt;20%→No Risk</td><td>0–25 Low · 26–50 Moderate · 51–75 High · 76–100 Severe</td></tr>
      <tr><td><b>Completion %</b></td><td>Weighted average across applicable items.</td><td>COT=100, CBT=100, In Progress=actual, Not Started=0</td><td>Higher = more execution; quality via On-Track + RI</td></tr>
      <tr><td><b>Expected Progress</b></td><td>Time-based benchmark.</td><td>Elapsed share of academic window (Sep–Aug)</td><td>Reference for Execution Gap</td></tr>
      <tr><td><b>Execution Gap</b></td><td>Schedule alignment.</td><td>Actual − Expected</td><td>Negative = behind schedule</td></tr>
      <tr><td><b>Alignment Insights</b></td><td>Per-pillar descriptive diagnostics.</td><td>Derived from Progress, Commitment, Spending, Expected</td><td>Neutral diagnostic sentence + contextual badges</td></tr>
    </table>

    <h2>6. Coverage Gap / NA Logic</h2>
    <ul>
      <li><b>Majority Not Applicable</b> = NA in ≥ 75% of reporting units for the selected AY/term/view.</li>
      <li><b>Absolute Not Applicable</b> = NA in 100% of configured units (now ${UNIT_IDS.length}, including ADM) for that exact column.</li>
      <li>Strict row-based matching across units; goal/action text is descriptive only.</li>
      <li>Reporting units = units with explicit status in the selected source column. Blanks are excluded.</li>
      <li>Any explicit non-NA status removes the item from Absolute NA.</li>
    </ul>

    <h2>7. Authentication &amp; Access</h2>
    <table>
      <tr><th style="width:22%">Role</th><th>Access</th><th>Examples</th></tr>
      <tr><td>admin</td><td>Unrestricted; user lifecycle management.</td><td>—</td></tr>
      <tr><td>university_viewer / sp4</td><td>Executive Dashboard. Welcome Banner suppressed for <span class="formula">sp4</span>.</td><td><span class="formula">sp4</span></td></tr>
      <tr><td>board_member <span class="pill new">NEW</span></td><td>Executive Dashboard with personalized welcome and private My Sessions.</td><td><span class="formula">m.ahmar</span>, <span class="formula">f.nader</span>, <span class="formula">g.doumet</span> … (39 accounts)</td></tr>
      <tr><td>pillar_champion</td><td>Pillar Champions Dashboard.</td><td><span class="formula">pillar_champion</span></td></tr>
      <tr><td>unit_user</td><td>Single unit dashboard at <span class="formula">/units/&lt;unitCode&gt;</span>.</td><td>e.g. <span class="formula">adm</span> for ADM</td></tr>
    </table>
    <p class="muted">Sessions expire 1 hour after authentication. Username-based login (Pattern B) is mapped internally to Supabase Auth users.</p>

    <h2>8. Personalization</h2>
    <ul>
      <li><b>Welcome Banner</b> — Greets each user by display name on the Executive Dashboard. Hidden for the shared <span class="formula">sp4</span> account.</li>
      <li><b>Display name</b> — Stored on the <span class="formula">profiles.display_name</span> column for board-member accounts.</li>
      <li><b>Personal labels</b> — My Sessions uses display_name as the account label.</li>
    </ul>

    <h2>9. My Sessions — Saved Views <span class="pill new">NEW</span></h2>
    <h3>Concept</h3>
    <p>A user-controlled "Saved Views" feature. No automatic tracking — users explicitly save meaningful dashboard moments.</p>
    <h3>Capture</h3>
    <p>The <b>Save to My Sessions</b> header button captures: active tab, academic year, term, view type (Cumulative / Yearly), selected pillar/unit, and KPI snapshot (Completion %, On-Track %, Below Target %, Risk Index, Total / Applicable items, Budget Utilization, loaded units).</p>
    <h3>Views</h3>
    <ul>
      <li><b>List</b> — sortable history of all your saved sessions.</li>
      <li><b>Detail</b> — deep dive into a single snapshot (KPIs, filters, unit-level data, notes).</li>
      <li><b>Compare</b> — side-by-side analysis of two sessions with Δ (B − A) deltas for each metric.</li>
    </ul>
    <h3>Restore</h3>
    <p>Re-applies AY, term, view type, pillar, and tab to the live dashboard.</p>
    <h3>Export</h3>
    <p>PDF and CSV available for individual snapshots and comparisons.</p>
    <h3>Privacy</h3>
    <p>Strict RLS isolation — each user only sees their own snapshots.</p>

    <h2>10. Focus Mode (Tab 1)</h2>
    <div class="grid-2">
      <div class="card"><b>Execution</b><p class="muted">Bar chart: progress vs expected progress per pillar.</p></div>
      <div class="card"><b>Budget</b><p class="muted">Bar chart: commitment and spending ratios per pillar.</p></div>
    </div>

    <h2>11. Export &amp; Reporting</h2>
    <ul>
      <li>Header download — <b>PDF</b> (A4 landscape, branded) or <b>CSV</b> of the current live view.</li>
      <li>Dashboard Guide — Brief or Comprehensive PDF (this document).</li>
      <li>Reports tab — uploaded PDF library, separate from live exports.</li>
      <li>My Sessions — per-snapshot PDF / CSV and side-by-side comparison PDF / CSV.</li>
    </ul>

    <h2>12. Data Refresh Policy</h2>
    <p>Data is read directly from official online reporting sheets on every load/refetch. Updates appear on the next live refresh — not on a monthly batch schedule. If the source is rate-limited, a clearly marked cached snapshot may briefly appear as a fallback.</p>

    <h2>13. FAQ</h2>
    <table>
      <tr><th style="width:32%">Question</th><th>Answer</th></tr>
      <tr><td>Why two budget ratios?</td><td>Commitment reflects engagement of funds; Spending reflects actual disbursement. Together they reveal whether commitments translate to outflows.</td></tr>
      <tr><td>What is the Reports tab?</td><td>The dashboard's PDF library, organized by scope (University / Pillar / Unit) with AY, period, and type filters.</td></tr>
      <tr><td>Why use Expected Progress as benchmark?</td><td>Time-based anchor (Sep–Aug elapsed share) — independent of budget or risk.</td></tr>
      <tr><td>How is alignment communicated?</td><td>Descriptive analytics — per-pillar diagnostic sentence with Execution Gap as the highlighted value.</td></tr>
      <tr><td>How are pillar colors assigned?</td><td>Fixed identity colors — PI Blue, PII Cyan, PIII Violet, PIV Pink, PV Indigo. Performance is conveyed by separate semantic colors.</td></tr>
      <tr><td>How does dynamic RI work?</td><td>For In-Progress items: Gap &gt; 50% → Critical; 20–50% → Emerging; &lt; 20% → No Risk. Where Gap = Expected − Actual.</td></tr>
      <tr><td>Where is ADM data fetched from?</td><td>The dedicated ADM Google Sheet, ingested by the same <span class="formula">fetch-gsr-data</span> pipeline as all other units.</td></tr>
      <tr><td>Can other users see my saved sessions?</td><td>No. RLS enforces strict per-user isolation on <span class="formula">user_session_snapshots</span>.</td></tr>
    </table>

    <h2>14. Reading Tips</h2>
    <ol>
      <li><b>Start with Executive Snapshot</b> — SSI, KPIs, alignment chart Focus Mode, Alignment Insights.</li>
      <li><b>Investigate in Strategic Risk</b> — execution gaps, heatmap, critical items, coverage gaps.</li>
      <li><b>Analyze Budget Intelligence</b> — commitment vs spending, per-pillar finance.</li>
      <li><b>Compare &amp; Track</b> — Unit Comparison for structural patterns; My Sessions for longitudinal tracking.</li>
    </ol>

    <p class="muted" style="margin-top:24px;text-align:center">— End of Comprehensive Guide —</p>
  `;
  openPrintWindow(html, 'Dashboard Guide — Comprehensive');
}
