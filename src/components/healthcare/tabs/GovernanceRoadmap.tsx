import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

const ASSUMPTIONS = [
  { id: 1, text: '4-state status model (Not Started / In Progress / Done / Blocked) replaces Healthcare\'s free-text quarterly notes.' },
  { id: 2, text: 'Blocker keywords ("no budget", "needs further discussion", "may be dropped") are auto-classified into 7 blocker types.' },
  { id: 3, text: 'Champion-rated Risk Flag (None / Low / Medium / High) is captured separately from execution status.' },
  { id: 4, text: 'Champion Cockpit is visible to the named goal champion and to executive viewers only.' },
  { id: 5, text: 'Reporting calendar uses calendar quarters (Q1 2026 = Jan–Mar) — confirm vs. fiscal year.' },
  { id: 6, text: 'Year 1–5 budget totals are committed envelopes, not yearly actuals.' },
  { id: 7, text: 'Per-step % completion is NOT computed — Healthcare model is state-based, not percentage-based.' },
];

const PHASES = [
  {
    phase: 'Phase 1 — Prototype (current)',
    color: 'emerald',
    items: [
      'Healthcare-native 8-tab dashboard with static seed data',
      'Decisions & Blockers Board, RACI Cockpit, Quarterly Timeline',
      'Roles isolated from University SP (healthcare_executive / viewer / admin)',
      'Admin-only Healthcare SP Analysis Report',
    ],
  },
  {
    phase: 'Phase 2 — Healthcare data layer',
    color: 'blue',
    items: [
      'Excel ingestion from LAU-HS SP working file (Graph / OneDrive)',
      'Champion-facing edit surface for Status, Risk Flag, Blocker reason',
      'Quarterly snapshot history + change log',
      'AI Executive Advisor scoped to Healthcare context',
    ],
  },
  {
    phase: 'Phase 3 — Integrated executive layer',
    color: 'purple',
    items: [
      'Unified President\'s Snapshot covering University + Healthcare',
      'Cross-SP risk and budget consolidation',
      'Shared design system + shared auth, separate data stores',
      'Joint board-level reporting export',
    ],
  },
];

const SHARED = [
  { label: 'Authentication & roles', status: 'shared' },
  { label: 'Design system & navigation', status: 'shared' },
  { label: 'PDF / CSV export pipeline', status: 'shared' },
  { label: 'AI Advisor framework (scoped per SP)', status: 'shared' },
  { label: 'Status model', status: 'isolated', note: 'Healthcare = 4-state, University = On/Below Target' },
  { label: 'Completion % / RI / SSI logic', status: 'isolated', note: 'University-only, not applicable to Healthcare' },
  { label: 'Cumulative vs Yearly toggle', status: 'isolated', note: 'University-only' },
];

export default function GovernanceRoadmap() {
  return (
    <div className="space-y-6">
      {/* Stakeholder assumptions */}
      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-300" />
            Open assumptions requiring stakeholder sign-off
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ASSUMPTIONS.map(a => (
            <div key={a.id} className="flex items-start gap-3 text-sm">
              <span className="text-[10px] font-mono text-amber-300 mt-1 shrink-0">A{a.id}</span>
              <span className="text-foreground/90">{a.text}</span>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/40 mt-2 italic">
            Phase 2 implementation should not proceed until these are confirmed by the Healthcare leadership.
          </p>
        </CardContent>
      </Card>

      {/* Integration phases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PHASES.map((p, i) => {
          const color = { emerald: 'border-emerald-500/40', blue: 'border-blue-500/40', purple: 'border-purple-500/40' }[p.color]!;
          return (
            <Card key={p.phase} className={color}>
              <CardHeader><CardTitle className="text-sm">{p.phase}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {p.items.map((it, j) => (
                  <div key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${i === 0 ? 'text-emerald-400' : 'text-muted-foreground/50'}`} />
                    <span className={i === 0 ? 'text-foreground' : ''}>{it}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* University ↔ Healthcare boundary */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Network className="w-4 h-4 text-emerald-300" />University SP ↔ Healthcare SP — integration boundary</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {SHARED.map(s => (
            <div key={s.label} className="flex items-center gap-3 text-xs border-b border-border/30 pb-2">
              <Badge variant="outline" className={`text-[10px] shrink-0 ${s.status === 'shared'
                ? 'border-emerald-500/40 text-emerald-200 bg-emerald-500/10'
                : 'border-amber-500/40 text-amber-200 bg-amber-500/10'}`}>
                {s.status === 'shared' ? 'Shared' : 'Isolated'}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="text-foreground">{s.label}</div>
                {s.note && <div className="text-[10px] text-muted-foreground">{s.note}</div>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-emerald-500/30 bg-emerald-500/[0.02]">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-300" />Executive recommendation</CardTitle></CardHeader>
        <CardContent className="text-sm text-foreground/90 space-y-2">
          <p>This v2 dashboard is driven by the Healthcare SP structure itself — RACI, Priority, quarterly narrative and 5-year budget — rather than a University-style status / completion / RI engine.</p>
          <p>The Decisions &amp; Blockers Board surfaces the most operationally important pattern in the source file: items stuck on funding, decisions or capacity. Resolving these is the single highest-leverage executive action in 2026.</p>
        </CardContent>
      </Card>
    </div>
  );
}
