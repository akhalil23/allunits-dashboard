import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, BookOpen } from 'lucide-react';
import { useState } from 'react';

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const Section = ({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-border/60 rounded-lg bg-card/40">
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-card/60 transition-colors">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-1 text-xs text-muted-foreground leading-relaxed space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default function DashboardGuideDrawer({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-background border-l border-border">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <BookOpen className="w-4 h-4 text-emerald-300" />
            Dashboard Guide & Methodology
          </SheetTitle>
          <SheetDescription>
            Reference for stakeholders — how to read every metric, chart and risk signal in this prototype.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2.5">
          <Section title="1. Purpose & audience" defaultOpen>
            <p>This dashboard provides Healthcare leadership with a consolidated executive view of the Healthcare Strategic Plan — goal-level progress, blockers requiring decisions, quarterly execution activity and 5-year budget commitments.</p>
            <p>Primary audience: EVP Health, Deans, Hospital CEOs, Champions and the President's Cabinet.</p>
          </Section>

          <Section title="2. How to navigate">
            <p>Six tabs in the sidebar:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Executive Snapshot</b> — single-screen briefing of portfolio health.</li>
              <li><b>Goals Overview</b> — all strategic goals as cards with progress + risk signals.</li>
              <li><b>Goal Explorer</b> — drill-down into Goal → Action → Action Step with RACI and quarterly narrative.</li>
              <li><b>Quarterly Execution</b> — reporting activity and status evolution across quarters.</li>
              <li><b>Decisions & Blockers</b> — items needing executive resolution.</li>
              <li><b>Budget Intelligence</b> — phasing, funding mix, concentration, derived budget-vs-completion view.</li>
            </ul>
          </Section>

          <Section title="3. Completion methodology">
            <p>Each action step is mapped to a numeric weight:</p>
            <ul className="list-disc pl-5">
              <li>Not Started — 0%</li>
              <li>In Progress — 50%</li>
              <li>Done — 100%</li>
              <li>Blocked — <b>excluded from the denominator</b> and reported separately</li>
            </ul>
            <p>Goal completion = mean of its non-blocked steps. Portfolio completion = mean of all non-blocked steps. Blocked steps appear as a side count (e.g., "62% complete · 4 steps blocked / 31") so executives see the headline number and the parked items in one glance.</p>
            <p className="text-amber-300/80">Assumption: equal weighting per step within an action/goal. The In-Progress mid-point (50%) is a prototype convention; a "blocked weight" override exists in code for future stakeholder calibration.</p>
          </Section>

          <Section title="4. Risk Index methodology">
            <p>Risk is computed per step from 4 equally-weighted binary signals (25 points each, total 0–100):</p>
            <ul className="list-disc pl-5">
              <li><b>Blocked</b> — the step is currently in a blocked state.</li>
              <li><b>Missing Q2 2026 update</b> — no quarterly note or status entered.</li>
              <li><b>Funding gap</b> — no positive budget recorded across the 5-year envelope.</li>
              <li><b>Governance gap</b> — Responsible or Accountable owner not assigned.</li>
            </ul>
            <p>Bands: 0–24 Low · 25–49 Moderate · 50–74 Elevated · 75–100 Severe. Every risk surface lists the contributing signals so the number is fully auditable.</p>
          </Section>

          <Section title="5. Reporting Coverage">
            <p>The share of action steps that recorded a Q2 2026 update (status entered or note written). This is a process-quality KPI — it tells leadership how reliable the rest of the dashboard is for the current quarter.</p>
          </Section>

          <Section title="6. Budget assumptions">
            <ul className="list-disc pl-5 space-y-1">
              <li>Budgets are committed amounts across Year 1 → Year 5.</li>
              <li>Funding sources tracked: Operational, Capital, Grant, Philanthropy.</li>
              <li>Concentration KPI = share of the 5-year envelope held by the top 2 goals.</li>
              <li>"Budget vs Derived Completion" is an executive heuristic, not an accounting metric — it pairs raw committed dollars with the prototype completion %.</li>
            </ul>
            <p className="text-amber-300/80">Years 3–5 often appear light because Champions defer multi-year commitments; flag for stakeholder review.</p>
          </Section>

          <Section title="7. Status taxonomy">
            <p>Healthcare-native 4-state model: Not Started · In Progress · Done · Blocked. The University SP "On Target / Below Target" distinction does not exist in the Healthcare workbook and is intentionally not surfaced. Legacy values from older notes are mapped into the 4-state model.</p>
          </Section>

          <Section title="8. Data source & refresh">
            <p>This is a Phase-1 prototype seeded with representative data inspired by the LAU-HS SP Q2 2026 working file. Once the live Healthcare workbook is connected, refresh cadence will mirror the University pipeline (Google Sheets with cached fallback).</p>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/5">Prototype data</Badge>
          </Section>

          <Section title="9. Assumptions requiring stakeholder validation">
            <ul className="list-disc pl-5 space-y-1">
              <li>Weights for Not Started / In Progress / Done.</li>
              <li>Treatment of Blocked items (exclude vs. partial-weight).</li>
              <li>The 4 binary risk signals and their equal weighting.</li>
              <li>"Missing update" defined against the current quarter only.</li>
              <li>Funding-gap threshold = any positive amount across the 5 years.</li>
              <li>Governance-gap definition limited to Responsible + Accountable.</li>
              <li>Concentration risk threshold (top-2 share &gt; 55%).</li>
            </ul>
          </Section>

          <Section title="10. Future phases">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>RACI & Champion Cockpit</b> — workload balancing across Champions and accountability heatmap.</li>
              <li><b>Governance & Integration Roadmap</b> — path to unified executive view alongside the University SP.</li>
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
