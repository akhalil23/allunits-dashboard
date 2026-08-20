/** Healthcare — Strategic Goals Overview (Goal 3 pilot, real data). */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHealthcareData } from '@/lib/healthcare/HealthcareDataProvider';
import {
  goalProgressAgg, goalSteps, budgetTotal, fmtCurrency, atRiskSignals, reportingCoverage,
} from '@/lib/healthcare/metrics';
import { ArrowRight } from 'lucide-react';

export default function StrategicGoalsOverview({ onOpenGoal }: { onOpenGoal?: (code: number) => void }) {
  const { data } = useHealthcareData();
  const { goals, config, currentPeriod } = data;

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Pilot scope: Goal 3 only. Goals 1, 2 and 4–7 are not imported and are intentionally absent.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {goals.map(g => {
          const p = goalProgressAgg(g);
          const steps = goalSteps(g);
          const budget = budgetTotal(steps);
          const risk = steps.filter(s => atRiskSignals(s, config, currentPeriod).length > 0).length;
          const cov = reportingCoverage([g], currentPeriod);
          return (
            <Card key={g.id} className="border-border/60 bg-card/70">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-sm leading-snug">Goal {g.code} — {g.title}</CardTitle>
                  <Badge variant="outline" className="text-[10px] shrink-0">{g.champion ?? 'Champion not reported'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <Metric label="Progress" value={p.value === null ? 'Not reported' : `${p.value}%`} />
                  <Metric label="Coverage" value={cov.value === null ? 'Not reported' : `${cov.value}%`} />
                  <Metric label="At Risk" value={`${risk} / ${steps.length}`} />
                  <Metric label="Planned budget" value={fmtCurrency(budget.total)} />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {g.actions.length} actions · {steps.length} action steps · {p.notReported} step{p.notReported === 1 ? '' : 's'} without a usable progress value
                </div>
                {onOpenGoal && (
                  <button onClick={() => onOpenGoal(g.code)} className="text-xs text-primary flex items-center gap-1">
                    Open in Goal Explorer <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const missing = value === 'Not reported';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 tabular-nums ${missing ? 'italic text-muted-foreground' : 'text-foreground font-medium'}`}>{value}</div>
    </div>
  );
}
