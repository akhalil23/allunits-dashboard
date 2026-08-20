/** Healthcare — Decisions & Blockers (Goal 3 pilot, real data). Signal-driven, reasons always shown. */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHealthcareData } from '@/lib/healthcare/HealthcareDataProvider';
import { flattenSteps, atRiskSignals, updateFor, latestStatus, textOr } from '@/lib/healthcare/metrics';
import { AlertOctagon } from 'lucide-react';

export default function DecisionBlockersBoard() {
  const { data } = useHealthcareData();
  const { goals, config, currentPeriod } = data;
  const steps = flattenSteps(goals);

  const items = steps
    .map(x => ({ ...x, signals: atRiskSignals(x.step, config, currentPeriod) }))
    .filter(x => x.signals.length > 0);

  const declaredBlockers = steps.filter(({ step }) => updateFor(step, currentPeriod)?.blockerFlag?.toLowerCase() === 'yes');

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Blockers are shown only when the source reports them. Nothing is inferred from narrative comments,
        and a zero or missing planned budget is never treated as a funding gap.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat label="Declared blockers" value={`${declaredBlockers.length}`} />
        <Stat label="At-risk steps" value={`${items.length} / ${steps.length}`} />
        <Stat label="Current period" value={currentPeriod ?? 'n/a'} />
      </div>

      <Card className="border-border/60 bg-card/70">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Items requiring executive attention</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && <p className="text-xs text-muted-foreground">No signals fired for the current period.</p>}
          {items.map(({ step, action, signals }) => {
            const u = updateFor(step, currentPeriod);
            const { status } = latestStatus(step);
            return (
              <div key={step.id} className="rounded-md border border-border/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">{action.code} · {step.code}</div>
                    <div className="text-sm">{step.title}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{status ?? 'Status not reported'}</Badge>
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">At Risk</Badge>
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {signals.map(s => (
                    <li key={s.key} className="text-[11px] text-muted-foreground flex gap-2">
                      <AlertOctagon className="h-3 w-3 mt-0.5 text-amber-400 shrink-0" />
                      <span><span className="text-foreground">{s.label}</span> — {s.reason}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <span>Owner: <span className="text-foreground">{textOr(step.owner)}</span></span>
                  <span>Accountable: <span className="text-foreground">{textOr(step.accountable)}</span></span>
                  <span>Blocker category: <span className="text-foreground">{textOr(u?.blockerCategory ?? null)}</span></span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
