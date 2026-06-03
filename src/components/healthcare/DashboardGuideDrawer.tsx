import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, BookOpen } from 'lucide-react';
import { useState } from 'react';

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const Section = ({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-border/60 rounded-lg bg-card/60">
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-card transition-colors">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-1 text-xs text-muted-foreground leading-relaxed space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <code className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground text-[11px]">{children}</code>
);

export default function DashboardGuideDrawer({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-background border-l border-border">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <BookOpen className="w-4 h-4" style={{ color: 'hsl(161 100% 30%)' }} />
            Dashboard Guide & Methodology Center
          </SheetTitle>
          <SheetDescription>
            Reference for stakeholders — purpose, KPIs, charts, definitions and the methodology behind every derived indicator on the Healthcare SP Dashboard.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2.5">
          <Section title="1. Dashboard purpose" defaultOpen>
            <p>The Healthcare SP Dashboard is the executive monitoring layer for the LAU Healthcare Strategic Plan. It supports:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Strategic monitoring</b> — single-screen view of portfolio health.</li>
              <li><b>Executive decision support</b> — surfaces blockers and decisions requiring leadership action.</li>
              <li><b>Budget visibility</b> — 5-year envelope, phasing, sources and concentration.</li>
              <li><b>Progress tracking</b> — derived completion at portfolio, goal, action and step level.</li>
              <li><b>Strategic execution monitoring</b> — quarterly reporting cadence, evolution and risk exposure.</li>
            </ul>
            <p>Audience: EVP Health, Deans, Hospital CEOs, Champions and the President's Cabinet.</p>
          </Section>

          <Section title="2. Executive Snapshot — KPIs & charts">
            <p>The Executive Snapshot is a six-card briefing followed by three insight cards and four analytical sections.</p>
            <p><b>KPIs:</b></p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Portfolio Completion</b> — mean derived completion across non-blocked steps. Pace label (On Track / Monitor / Behind Plan).</li>
              <li><b>Blocked Steps</b> — count of steps in Blocked state, excluded from the percentage above.</li>
              <li><b>Reporting Coverage</b> — share of steps with a valid current-quarter update (also drives the Missing Update risk signal).</li>
              <li><b>Risk Index</b> — portfolio mean of per-step RI (0–100), banded Low / Moderate / Elevated / Severe.</li>
              <li><b>Active Blockers</b> — steps with a documented blocker awaiting decision.</li>
              <li><b>5-Year Budget</b> — total committed envelope across the Healthcare SP.</li>
            </ul>
            <p><b>Charts:</b> Progress by Strategic Goal (pace-colored bars), Status Distribution donut, Risk Signals card, Budget Share vs Derived Completion grouped bar chart, Decisions & Blockers list, Funding Source Mix.</p>
          </Section>

          <Section title="3. Status definitions">
            <p>Healthcare uses a 4-state native model:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Not Started</b> — no quarterly entry yet, status field empty or N/A.</li>
              <li><b>In Progress</b> — execution is under way (interim weight = 50%).</li>
              <li><b>Done</b> — step has been completed.</li>
              <li><b>Blocked</b> — step is stalled pending a decision or external dependency.</li>
            </ul>
            <p>The University SP "On Target / Below Target" distinction does <b>not</b> exist in the Healthcare workbook and is intentionally not surfaced. Legacy values from older notes map to the four states above.</p>
          </Section>

          <Section title="4. Completion methodology">
            <p>Each action step is mapped to a numeric weight:</p>
            <ul className="list-disc pl-5">
              <li>Not Started — 0%</li>
              <li>In Progress — 50% (interim convention)</li>
              <li>Done — 100%</li>
              <li>Blocked — <b>excluded from the denominator</b> and reported separately</li>
            </ul>
            <p>Goal completion = mean of its non-blocked steps. Portfolio completion = mean of all non-blocked steps. Blocked steps appear as a side count so executives see headline number and parked items in one glance.</p>
            <p><b>Example.</b> A goal with 10 steps — 2 Done, 4 In Progress, 3 Not Started, 1 Blocked — yields completion = (2·100 + 4·50 + 3·0) / 9 = <b>44%</b>, with "1 blocked" surfaced separately.</p>
            <p className="text-amber-600">Assumption: equal weighting per step. The 50% mid-point is a prototype convention; the blocked-exclusion rule and weights are flagged for stakeholder calibration.</p>
          </Section>

          <Section title="5. Risk methodology">
            <p>Risk Index is computed per step from <b>4 equally-weighted binary signals</b> (25 points each, total 0–100):</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Blocked</b> — step is currently in Blocked state.</li>
              <li><b>Missing Update</b> — no quarterly note or status entered for the current quarter (drives, and is driven by, Reporting Coverage).</li>
              <li><b>Funding Gap</b> — no positive amount committed across Years 1–5.</li>
              <li><b>Governance Gap</b> — Responsible or Accountable owner not assigned.</li>
            </ul>
            <p><b>Bands:</b> 0–24 <span className="text-emerald-500 font-semibold">Low</span> · 25–49 <span className="text-amber-500 font-semibold">Moderate</span> · 50–74 <span className="text-red-500 font-semibold">Elevated</span> · 75–100 <span className="text-red-700 font-semibold">Severe</span>.</p>
            <p>Every risk surface lists the contributing signals so the number is fully auditable.</p>
          </Section>

          <Section title="6. Budget Intelligence">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>5-Year Envelope</b> — sum of committed amounts across Years 1–5.</li>
              <li><b>Multi-Year Phasing</b> — committed dollars per year (Y1 → Y5).</li>
              <li><b>Funding Source Mix</b> — Operational, Capital, Grant, Philanthropy.</li>
              <li><b>Top-2 Goals Share</b> — concentration KPI; &gt; 55% flags a portfolio-balance review.</li>
              <li><b>Source HHI</b> — Herfindahl-Hirschman Index of source shares (0–10,000). &gt; 2,500 = concentrated, &lt; 1,500 = diversified.</li>
              <li><b>Per-Goal Budget Card</b> — budget, share-of-envelope, derived completion and blocked exposure.</li>
              <li><b>Budget Share vs Derived Completion</b> — grouped bar chart pairing each goal's share of the envelope with its derived completion % (executive heuristic).</li>
            </ul>
            <p className="text-amber-600">Years 3–5 often appear light because Champions defer multi-year commitments — flag for stakeholder review.</p>
          </Section>

          <Section title="7. Decisions & Blockers">
            <p>The board surfaces every step with a documented blocker and an attached decision owner. Each row carries:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Blocker type</b> — categorical tag (e.g., Funding, Governance, External, Capacity).</li>
              <li><b>Decision owner</b> — the role expected to unblock the item.</li>
              <li><b>Risk Index chip</b> — auditable RI for the step.</li>
              <li><b>Goal context</b> — goal code so the executive can navigate to Goal Explorer.</li>
            </ul>
            <p>Filtering by blocker type and decision owner is available on the full board.</p>
          </Section>

          <Section title="8. Quarterly Execution">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Reporting Activity Heatmap</b> — Goals × Quarters intensity map of reported updates.</li>
              <li><b>Status Evolution Strip</b> — how the 4-state distribution shifted quarter over quarter.</li>
              <li><b>Latest Quarter Narratives</b> — newest notes with "Missing Update" badges where applicable.</li>
              <li><b>Update Monitoring</b> — direct tie-back to Reporting Coverage and the Missing Update risk signal.</li>
            </ul>
          </Section>

          <Section title="9. Methodology & assumptions">
            <p>This prototype relies on the following assumptions, all of which require stakeholder validation:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Weights for Not Started / In Progress / Done.</li>
              <li>Treatment of Blocked items (exclude vs. partial-weight).</li>
              <li>Four binary risk signals and their equal weighting.</li>
              <li>"Missing Update" defined against the current quarter only (<Kbd>Q2 2026</Kbd>).</li>
              <li>Funding-gap threshold = any positive amount across the 5 years.</li>
              <li>Governance-gap definition limited to Responsible + Accountable.</li>
              <li>Concentration risk threshold (top-2 share &gt; 55%, HHI &gt; 2,500).</li>
              <li>Pace bands (≥ 70% On Track, ≥ 40% Monitor, otherwise Behind Plan).</li>
            </ul>
            <p>Once the live Healthcare workbook is connected, refresh cadence will mirror the University pipeline (Google Sheets with cached fallback).</p>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/5">Prototype data</Badge>
          </Section>

          <Section title="10. Important disclaimer">
            <p>Some metrics on this dashboard are <b>derived through business rules</b> (Portfolio Completion, Goal Completion, Risk Index, Reporting Coverage, Budget Share vs Derived Completion). These rules are clearly marked with a <span className="text-amber-600 font-semibold">Derived · pending validation</span> badge.</p>
            <p>Numbers are expected to be refined following Healthcare stakeholder validation of the weights, signals and thresholds described in Section 9.</p>
          </Section>

          <Section title="11. Future phases">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>RACI & Champion Cockpit</b> — workload balancing across Champions and accountability heatmap.</li>
              <li><b>Governance & Integration Roadmap</b> — path to a unified executive view alongside the University SP.</li>
              <li><b>Live data ingestion</b> from the Healthcare SP workbook.</li>
              <li><b>AI Executive Advisor</b> scoped to Healthcare context.</li>
              <li><b>Snapshot Tracker</b> for cross-quarter evolution analysis.</li>
            </ul>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
