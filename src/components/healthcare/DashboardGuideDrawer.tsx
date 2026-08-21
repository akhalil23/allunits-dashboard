import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, BookOpen, CheckCircle2, Clock, Ban } from 'lucide-react';
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

const Pill = ({ tone, children }: { tone: 'ok' | 'pending' | 'none'; children: React.ReactNode }) => {
  const cls = tone === 'ok'
    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5'
    : tone === 'pending'
      ? 'border-amber-500/40 text-amber-400 bg-amber-500/5'
      : 'border-border text-muted-foreground bg-muted/20';
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'pending' ? Clock : Ban;
  return (
    <Badge variant="outline" className={`${cls} text-[10px] font-medium`}>
      <Icon className="w-3 h-3 mr-1" />{children}
    </Badge>
  );
};

export default function DashboardGuideDrawer({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-background border-l border-border">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Healthcare Dashboard Guide
          </SheetTitle>
          <SheetDescription>
            What the Healthcare SP Dashboard shows, where each value comes from, which calculations are approved, and which remain pending. Current release is the <b>Goal 3 real-data pilot</b>.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2.5">
          <Section title="A. Purpose, users & hierarchy" defaultOpen>
            <p>The Healthcare SP Dashboard gives Healthcare leadership a governed, traceable view of strategic plan execution: what has been reported, what has not, and where management attention is warranted.</p>
            <p><b>Intended users:</b> Healthcare executives, strategic plan administrators, goal champions and action SPOCs.</p>
            <p><b>Hierarchy:</b> <Kbd>Goal</Kbd> → <Kbd>Action</Kbd> → <Kbd>Action Step</Kbd>. Reporting happens at Action Step level per quarter; Action and Goal figures are aggregated upward from the steps that carry a usable value.</p>
            <p><b>Pilot scope:</b> Goal 3 only.</p>
          </Section>

          <Section title="B. Data source">
            <p>All dashboard information originates from structured Healthcare SP reporting data. For this pilot the data is a <b>controlled Excel import of the Goal 3 sheet</b>, validated on load and stored with a batch reference.</p>
            <p>Other Healthcare Goals are <b>not yet part of the real-data pilot</b>. They are absent from the dashboard — they are <b>not</b> zero-performing Goals and must not be read as such.</p>
            <p>Nothing on the dashboard is inferred from narrative comments.</p>
          </Section>

          <Section title="C. Source inputs vs derived outputs">
            <p><b>Source inputs</b> (imported verbatim):</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Status · Execution Progress % · KPI Actual Value</li>
              <li>Blocker flag, category and details</li>
              <li>Next Milestone and Expected Milestone Date</li>
              <li>Quarterly comments · Evidence · RACI</li>
              <li>Planned budget by year · KPI target information</li>
            </ul>
            <p><b>Derived outputs</b> (calculated by the governed Healthcare layer):</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Action / Goal / portfolio progress</li>
              <li>KPI Achievement %</li>
              <li>Reporting Coverage</li>
              <li>At-Risk signals and their reasons</li>
              <li>Milestone intelligence (overdue / upcoming)</li>
              <li>Planned-budget analytics</li>
            </ul>
            <p>Anything with no reported value is shown as <Kbd>Not reported</Kbd> and never substituted with a guess.</p>
          </Section>

          <Section title="D. Status">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Not Started</b> · <b>In Progress</b> · <b>Completed</b> · <b>Blocked</b> — taken verbatim from the reported status field.</li>
              <li><b>Not reported</b> — the status cell is empty for that quarter.</li>
            </ul>
            <p>Status does not automatically determine progress, with two approved fallbacks only:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Not Started with no reported progress → <b>0%</b></li>
              <li>Completed with no reported progress → <b>100%</b></li>
              <li>In Progress / Blocked with no reported progress → <b>Not reported</b> (excluded from averages)</li>
            </ul>
          </Section>

          <Section title="E. Execution progress">
            <p><b>Execution Progress %</b> reported by the owner is the primary progress input. The most recent period carrying a value is used.</p>
            <p>Action, Goal and portfolio progress are the mean of the action steps that carry a usable percentage. Missing progress is <b>never</b> treated as zero — the count of unreported steps is always displayed next to the aggregate so the coverage caveat stays visible.</p>
          </Section>

          <Section title="F. KPI performance">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Original KPI</b> text, <b>KPI Type</b>, <b>Target</b>, <b>Unit</b> and <b>Target Date</b> are imported where present.</li>
              <li><b>Actual Value</b> comes from the quarterly update.</li>
              <li><b>Direction</b> (higher-is-better / lower-is-better) is applied only when unambiguous; otherwise it is stored as <Kbd>unvalidated</Kbd>.</li>
              <li><b>KPI Achievement %</b> is computed only when a numeric target, a numeric actual and a validated direction all exist. Otherwise the KPI reads <b>Not Yet Measurable</b> with the reason shown.</li>
            </ul>
          </Section>

          <Section title="G. Expected progress & On/Below Target — disabled">
            <div className="flex flex-wrap gap-1.5 mb-1">
              <Pill tone="pending">Expected Progress</Pill>
              <Pill tone="pending">Actual vs Expected</Pill>
              <Pill tone="pending">Schedule Variance</Pill>
              <Pill tone="pending">On / Below Target</Pill>
            </div>
            <p>These methodologies are <b>not approved</b> and are therefore switched off. Wherever they would appear the dashboard reads <Kbd>Pending methodology</Kbd> rather than showing an unvalidated number. Linear, milestone-based and manual strategies exist in the model but none is active.</p>
          </Section>

          <Section title="H. Reporting coverage">
            <p>Goal 3 pilot formula:</p>
            <p className="text-foreground">Action Steps with a valid current-period update ÷ all applicable Goal 3 Action Steps</p>
            <p>A step counts as <b>validly updated</b> for the period when at least one of the following is present: reported status, Execution Progress %, KPI actual value, next milestone, or a narrative comment.</p>
            <p>The "applicable" population is configurable and may be narrowed in later phases.</p>
          </Section>

          <Section title="I. At-Risk signals">
            <p>At-Risk is signal-based and fully transparent — every flagged step displays the reason it fired. Currently approved signals:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Reported status is <b>Blocked</b></li>
              <li>Blocker flag explicitly set to <b>Yes</b></li>
              <li>No valid update for the current reporting period</li>
              <li>Expected milestone date already in the past (step not Completed)</li>
            </ul>
            <p>Trajectory- and expected-progress-based signals remain <b>inactive</b> until the corresponding methodology is approved. No risk signal is produced from narrative text or from an absent budget.</p>
          </Section>

          <Section title="J. Risk index — not active">
            <div className="mb-1"><Pill tone="none">Composite Risk Index</Pill></div>
            <p>No composite Risk Index is active in Phase 1. The legacy prototype methodology (four equally weighted signals × 25) is retired inside Healthcare and is not used anywhere in this release. Risk is communicated only through the transparent signals in section I.</p>
          </Section>

          <Section title="K. Blockers & decisions">
            <p>Structured blocker fields — flag, category and details — feed the <b>Decisions & Blockers</b> board. Each entry shows the reported category, the detail text as written, and the reporting period it came from.</p>
            <p>Blockers are never inferred from narrative comments; only an explicit blocker flag or a Blocked status creates an entry.</p>
          </Section>

          <Section title="L. Milestones">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Next Milestone</b> — reported milestone text.</li>
              <li><b>Expected Milestone Date</b> — reported date or quarter (e.g. <Kbd>Q3 2026</Kbd>).</li>
              <li><b>Overdue</b> — expected date has passed and the step is not Completed.</li>
              <li><b>Upcoming</b> — expected date still in the future.</li>
              <li><b>Milestone adherence</b> is only summarised once enough dated milestones exist; otherwise it is omitted rather than approximated.</li>
            </ul>
          </Section>

          <Section title="M. Budget">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Planned budget</b> is imported per action step and phased by year.</li>
              <li>Views: budget by Action, by Goal, by Year, budget concentration, and planned budget alongside reported progress.</li>
              <li>Non-numeric budget cells (free-text notes) are excluded from totals and listed under data quality.</li>
              <li>Zero or missing planned budget is <b>not</b> a funding gap — it may legitimately mean no budget is required.</li>
            </ul>
            <p className="text-foreground">The current source contains <b>no actual expenditure, committed expenditure, forecast or financial variance</b>. Planned budget must never be read as spending.</p>
          </Section>

          <Section title="N. Visualizations by tab">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Executive Snapshot</b> — portfolio progress with unreported counts, status distribution, reporting coverage, at-risk count, planned budget total.</li>
              <li><b>Goals Overview</b> — imported goals with derived progress, coverage and risk signal counts.</li>
              <li><b>Goal Explorer</b> — Goal → Action → Action Step drill-down showing every source field verbatim plus derived values.</li>
              <li><b>Quarterly Execution</b> — reporting activity across imported quarters, highlighting which steps reported.</li>
              <li><b>Decisions & Blockers</b> — items with a blocker or Blocked status, each with its reason.</li>
              <li><b>Budget Intelligence</b> — planned budget phasing and concentration, with unquantified cells flagged.</li>
            </ul>
          </Section>

          <Section title="O. Methodology status" defaultOpen>
            <p className="text-foreground font-medium">Active / approved</p>
            <div className="flex flex-wrap gap-1.5">
              <Pill tone="ok">Reported Status</Pill>
              <Pill tone="ok">Execution Progress %</Pill>
              <Pill tone="ok">Status fallback 0 / 100</Pill>
              <Pill tone="ok">Reporting Coverage</Pill>
              <Pill tone="ok">Structured blockers</Pill>
              <Pill tone="ok">Milestone dates</Pill>
              <Pill tone="ok">Planned budget analytics</Pill>
              <Pill tone="ok">KPI Achievement (validated only)</Pill>
              <Pill tone="ok">Transparent At-Risk signals</Pill>
            </div>
            <p className="text-foreground font-medium pt-2">Pending / provisional</p>
            <div className="flex flex-wrap gap-1.5">
              <Pill tone="pending">Expected Progress</Pill>
              <Pill tone="pending">Schedule Variance</Pill>
              <Pill tone="pending">On / Below Target</Pill>
              <Pill tone="pending">On-Target Rate</Pill>
              <Pill tone="pending">Trajectory risk signals</Pill>
              <Pill tone="pending">Composite Risk Index</Pill>
              <Pill tone="pending">KPI direction for ambiguous indicators</Pill>
            </div>
            <p className="text-foreground font-medium pt-2">Not available from current source data</p>
            <div className="flex flex-wrap gap-1.5">
              <Pill tone="none">Actual expenditure</Pill>
              <Pill tone="none">Committed expenditure</Pill>
              <Pill tone="none">Financial forecast / variance</Pill>
              <Pill tone="none">Funding source breakdown</Pill>
              <Pill tone="none">Goals outside the pilot scope</Pill>
            </div>
          </Section>

          <Section title="P. Traceability & future phases">
            <ul className="list-disc pl-5 space-y-1">
              <li>Every goal, action, step, KPI, update and budget row carries its import batch reference, enabling quarterly comparison, audit history and rollback.</li>
              <li>Each batch records row counts, warnings and errors, reviewable under data quality.</li>
              <li>Planned next phases: remaining Healthcare Goals, live source ingestion, activation of trajectory metrics after methodology sign-off, and additional financial fields when they become available.</li>
            </ul>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
