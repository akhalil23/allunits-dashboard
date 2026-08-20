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
            Reference for stakeholders — what the Healthcare SP Dashboard shows, where each number comes from, and which rules are still pending validation. Current release is the <b>Goal 3 real-data pilot</b>.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2.5">
          <Section title="1. Scope of this release" defaultOpen>
            <p>The dashboard is now driven by <b>real imported data</b> from the LAU Healthcare SP working file, limited to <b>Goal 3</b>. Goals 1–2 and 4–7 are not imported in this pilot and do not appear.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Every displayed value is either reported in the source or explicitly marked <Kbd>Not reported</Kbd>.</li>
              <li>Nothing is inferred from narrative comments — no status, percentage, KPI actual, blocker or milestone is derived from free text.</li>
              <li>Each record is traceable to the import batch that created it.</li>
            </ul>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/5">Goal 3 real data</Badge>
          </Section>

          <Section title="2. Status definitions">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Not Started</b> · <b>In Progress</b> · <b>Completed</b> · <b>Blocked</b> — taken verbatim from the reported status field.</li>
              <li><b>Not reported</b> — the status cell is empty for that quarter. It is shown as-is and never replaced with a guess.</li>
            </ul>
            <p>The University SP "On Target / Below Target" model does not exist in the Healthcare workbook and is intentionally not surfaced.</p>
          </Section>

          <Section title="3. Progress methodology">
            <p>Execution progress uses the reported <b>Execution Progress %</b> as the single primary source.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Blank progress + status <b>Not Started</b> → 0%.</li>
              <li>Blank progress + status <b>Completed</b> → 100%.</li>
              <li>Blank progress + status <b>In Progress</b> or <b>Blocked</b> → <b>no percentage is inferred</b>; the step is excluded from averages and counted under "not reported".</li>
            </ul>
            <p>Action, goal and portfolio progress are the mean of the steps that carry a usable percentage; the count of unreported steps is always shown alongside.</p>
          </Section>

          <Section title="4. Expected progress, verdicts & variance — disabled">
            <p>Expected Progress is set to <b>not defined</b> pending stakeholder approval of a business rule. Linear, milestone-based and manual strategies are supported in the model but none is active.</p>
            <p>Consequently <b>On/Below Target verdicts</b> and <b>Schedule Variance</b> are switched off and will read <Kbd>Pending methodology</Kbd> rather than display an unvalidated number.</p>
          </Section>

          <Section title="5. KPI subsystem">
            <ul className="list-disc pl-5 space-y-1">
              <li>KPI type, target value and target date are imported where present.</li>
              <li><b>Direction</b> (higher-is-better / lower-is-better) is only applied when unambiguous. Otherwise it is stored as <Kbd>unvalidated</Kbd> and achievement is not computed.</li>
              <li>Achievement % requires a numeric target, a numeric actual and a validated direction. Missing any of these yields <b>Not Yet Measurable</b>.</li>
            </ul>
          </Section>

          <Section title="6. Reporting coverage">
            <p>Coverage = action steps with a valid current-period update ÷ all applicable Goal 3 action steps. A step counts as reported when at least one structured field or narrative update exists for that quarter.</p>
            <p>The "expected to report" rule is configurable and may be narrowed in later phases.</p>
          </Section>

          <Section title="7. At-risk signals">
            <p>Risk is signal-based rather than a scored index. A step is flagged when one or more of the following fire, and the reason is always displayed:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Reported status is <b>Blocked</b>.</li>
              <li>A blocker flag is explicitly set to <b>Yes</b>.</li>
              <li>No update exists for the current reporting period.</li>
              <li>A reported next milestone date is in the past.</li>
            </ul>
            <p>No risk signal is produced from narrative text or from an absent budget.</p>
          </Section>

          <Section title="8. Budget">
            <ul className="list-disc pl-5 space-y-1">
              <li>Five-year planned budget is imported per action step and shown as reported phasing.</li>
              <li>Non-numeric budget cells (e.g. free-text notes) are excluded from totals and listed under data quality.</li>
              <li><b>Actual spend is not reported</b> in the source and is therefore not displayed.</li>
              <li>A zero or missing planned budget is <b>not</b> treated as a funding gap — it may legitimately mean no budget is required.</li>
            </ul>
          </Section>

          <Section title="9. Data ingestion & traceability">
            <ul className="list-disc pl-5 space-y-1">
              <li>Ingestion is a manual, batch-based import of the Goal 3 sheet, validated on load.</li>
              <li>Each batch records counts, warnings and errors; every goal, action, step, KPI, update and budget row carries its batch reference.</li>
              <li>This enables quarterly comparison, audit history, rollback and validation review.</li>
            </ul>
          </Section>

          <Section title="10. Open items pending validation">
            <ul className="list-disc pl-5 space-y-1">
              <li>Expected Progress methodology (currently disabled).</li>
              <li>KPI direction for indicators flagged as ambiguous.</li>
              <li>Definition of "expected to report" for coverage.</li>
              <li>Whether any funding-gap rule should exist, and on what structured evidence.</li>
              <li>Weighting of action steps within an action or goal (currently equal).</li>
            </ul>
          </Section>

          <Section title="11. Future phases">
            <ul className="list-disc pl-5 space-y-1">
              <li>Extension to Goals 1–2 and 4–7 once the pilot is validated.</li>
              <li>Automated ingestion from the live Healthcare workbook.</li>
              <li>Activation of trajectory metrics after methodology sign-off.</li>
              <li>Healthcare-scoped AI Executive Advisor and cross-quarter snapshot tracking.</li>
            </ul>
          </Section>

        </div>
      </SheetContent>
    </Sheet>
  );
}
