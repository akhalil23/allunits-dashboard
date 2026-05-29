import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download } from 'lucide-react';
import { HEALTHCARE_GOALS } from '@/lib/healthcare/sample-data';

export default function HealthcareAnalysisReport() {
  const navigate = useNavigate();
  const totalActions = HEALTHCARE_GOALS.reduce((s, g) => s + g.actions.length, 0);
  const totalSteps = HEALTHCARE_GOALS.reduce((s, g) => s + g.actions.reduce((a, ac) => a + ac.steps.length, 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-1" />Admin
          </Button>
          <div>
            <h1 className="text-lg font-display font-semibold text-foreground">Healthcare SP — Analysis Report</h1>
            <p className="text-xs text-muted-foreground">Stakeholder review · Phase 1 architecture deliverable</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Download className="w-4 h-4 mr-1.5" />Print / Save as PDF
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6 print:space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source Document</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p><span className="text-foreground font-medium">File:</span> LAU-HS SP Complete Working file Q2 2026.xlsx</p>
            <p><span className="text-foreground font-medium">Sheets:</span> 7 — one per Strategic Goal</p>
            <p><span className="text-foreground font-medium">Detected:</span> {HEALTHCARE_GOALS.length} goals · {totalActions} actions · {totalSteps} action steps</p>
            <p className="italic text-xs">This report is generated from a structural read of the source file. No live ingestion is connected.</p>
          </CardContent>
        </Card>

        <Section letter="A" title="Strategic Goals">
          <ul className="space-y-1.5 text-sm">
            {HEALTHCARE_GOALS.map(g => (
              <li key={g.code}>
                <span className="font-mono text-emerald-400 mr-2">G{g.code}</span>
                <span className="text-foreground">{g.title}</span>
                <span className="text-muted-foreground"> — Champion: {g.champion}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-2">All goals follow the same internal structure: Champion → Goal title → Action(s) → goal-level KPIs → Action Steps.</p>
        </Section>

        <Section letter="B" title="Action Structure">
          <p>Each goal contains one or more <span className="text-foreground">Actions</span> (numbered <code>G.A</code>, e.g. 1.1, 1.2).</p>
          <p>Each Action contains <span className="text-foreground">Action Steps</span> (numbered <code>G.A.S</code>, e.g. 1.1.1).</p>
          <p>Parent → child hierarchy is preserved through numeric prefixes; downstream parser must forward-fill blank parent rows.</p>
          <table className="w-full text-xs mt-3 border border-border/50">
            <thead className="bg-card/60"><tr><th className="p-2 text-left">Goal</th><th className="p-2 text-right">Actions</th><th className="p-2 text-right">Steps</th></tr></thead>
            <tbody>
              {HEALTHCARE_GOALS.map(g => (
                <tr key={g.code} className="border-t border-border/40">
                  <td className="p-2">G{g.code} — {g.title}</td>
                  <td className="p-2 text-right tabular-nums">{g.actions.length}</td>
                  <td className="p-2 text-right tabular-nums">{g.actions.reduce((s, a) => s + a.steps.length, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section letter="C" title="KPI Structure">
          <p><span className="text-foreground">Goal-level KPIs</span> — quantified targets attached to each Action header (e.g. “10% increase in international patient volume by 2027”).</p>
          <p><span className="text-foreground">Step-level KPIs</span> — milestones with deadlines (e.g. “Committee charter approved by Q1 2026”).</p>
          <p><span className="text-foreground">Operational indicators</span> — implicit in quarterly status updates (Q1 2026 → Q1 2027).</p>
          <p><span className="text-foreground">Milestone indicators</span> — accreditation events (ACCME, ACPE, ANCC, JCI).</p>
        </Section>

        <Section letter="D" title="Ownership Structure (RACI)">
          <p>Each Action Step carries a structured RACI: <span className="text-foreground">Responsible</span>, <span className="text-foreground">Accountable</span>, <span className="text-foreground">Consulted</span>, <span className="text-foreground">Informed</span>.</p>
          <p>Champions are declared at the Goal level (row 1 of each sheet) and may also be carried per Action Step.</p>
          <p>Governance includes EVP Health office, C-Suite, Medical Board, school deans (SOM/SON/SOP), HR, Quality, OFAD.</p>
        </Section>

        <Section letter="E" title="Budget Structure">
          <p>Budget is captured per Action Step over a five-year horizon (Year 1 → Year 5), each year split into an <span className="text-foreground">amount</span> column and a <span className="text-foreground">note</span> column.</p>
          <p>Funding-source classification is not yet uniformly tagged in the source file — prototype anticipates: Operational, Capital, Grant, Philanthropy.</p>
          <p>Multi-year budgets default to a one-time placeholder when only Year 1 is filled.</p>
        </Section>

        <Section letter="F" title="Reporting Structure">
          <p>Status & Notes columns are organized by reporting period: <span className="text-foreground">Q1 2026, Q2 2026, Q3 2026, Q4 2026, Q1 2027</span>.</p>
          <p>Status values observed include: <Badge variant="outline" className="mr-1">Done</Badge><Badge variant="outline" className="mr-1">In Progress</Badge><Badge variant="outline" className="mr-1">Below Target</Badge><Badge variant="outline" className="mr-1">Not Started</Badge><Badge variant="outline">N/A</Badge>.</p>
          <p>Quarterly notes contain qualitative commentary that should be normalized before AI summarization.</p>
        </Section>

        <Section letter="G" title="Similarities With the University Dashboard">
          <ul className="list-disc pl-5 space-y-1">
            <li>Hierarchy of Goal → Action → Action Step mirrors the University Goal → Action → Step model.</li>
            <li>RACI ownership matches the existing governance taxonomy.</li>
            <li>Status semantics align with the four-category risk model used university-wide.</li>
            <li>Multi-year budget and quarterly reporting cadence are compatible with existing executive widgets.</li>
            <li>Champions concept maps directly to Pillar Champions.</li>
          </ul>
        </Section>

        <Section letter="H" title="Differences From the University Dashboard">
          <ul className="list-disc pl-5 space-y-1">
            <li>No five-pillar model — Healthcare uses seven thematic goals instead.</li>
            <li>Funding sources are richer (Operational / Capital / Grant / Philanthropy) and need explicit tagging.</li>
            <li>Healthcare KPIs include accreditation events that require milestone tracking, not just percentage progress.</li>
            <li>Patient-volume and clinical-quality indicators introduce a new metric family absent from the University dashboard.</li>
            <li>Reporting horizon currently spans Q1 2026 → Q1 2027 (rolling), not the academic-year cycle.</li>
          </ul>
        </Section>

        <Section letter="I" title="Data Quality Observations">
          <ul className="list-disc pl-5 space-y-1">
            <li>Several rows have blank Champion, Responsible or Accountable fields — must be enforced at ingestion.</li>
            <li>Status & notes columns sometimes merge multiple statuses into free text; normalization required.</li>
            <li>Budget cells mix numeric values, dashes ("-"), and qualitative notes ("Once") — needs a typed schema.</li>
            <li>Some KPI text contains embedded line breaks and trailing whitespace.</li>
            <li>Goal sheets are not uniformly named (e.g. "Goal 5 UPDATED") — adopt a canonical sheet-resolver.</li>
            <li>Year columns (Y1–Y5) lack explicit calendar mapping — must be derived from a master config.</li>
          </ul>
        </Section>

        <Section letter="J" title="Proposed Future Data Model (recommendation only)">
          <p>Recommended normalized schema (no tables created at this phase):</p>
          <pre className="text-xs bg-card/60 border border-border/50 rounded-md p-3 overflow-x-auto">{`hc_goals          (id, code, title, champion)
hc_actions        (id, goal_id, code, title)
hc_action_kpis    (id, action_id, text)
hc_steps          (id, action_id, code, title, intent, priority, status)
hc_step_raci      (step_id, responsible, accountable, consulted, informed)
hc_step_status    (step_id, period, status, note)
hc_step_budget    (step_id, year, amount, source, note)
hc_step_kpis      (id, step_id, text, due_period)`}</pre>
          <p className="text-xs text-muted-foreground mt-2">Ingestion (Excel → OneDrive → Microsoft Graph → Supabase) is explicitly out of scope for Phase 1.</p>
        </Section>

        <Card className="border-emerald-500/30 bg-emerald-500/5 print:hidden">
          <CardContent className="p-4 text-sm text-foreground">
            <strong>Next phase:</strong> Stakeholder approval of this report → build OneDrive/Graph ingestion → Supabase data layer → live AI advisor over Healthcare SP.
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Section({ letter, title, children }: { letter: string; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-center">{letter}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">{children}</CardContent>
    </Card>
  );
}
