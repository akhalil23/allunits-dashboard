/** Healthcare — Quarterly Execution (Goal 3 pilot, real data). */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHealthcareData } from '@/lib/healthcare/HealthcareDataProvider';
import { flattenSteps, reportingCoverage, structuredFieldCoverage, textOr } from '@/lib/healthcare/metrics';

export default function QuarterlyExecution() {
  const { data } = useHealthcareData();
  const { goals, periods, currentPeriod } = data;
  const [period, setPeriod] = useState<string | null>(currentPeriod);
  const active = period ?? currentPeriod;
  const steps = flattenSteps(goals);
  const cov = reportingCoverage(goals, active);
  const fields = structuredFieldCoverage(goals, active);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {periods.map(p => (
          <button
            key={p.code}
            onClick={() => setPeriod(p.code)}
            className={`px-3 py-1.5 rounded-md border text-xs ${active === p.code ? 'border-primary text-primary bg-primary/10' : 'border-border/60 text-muted-foreground'}`}
          >
            {p.label}{p.isCurrent ? ' · current' : ''}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Reporting coverage" value={cov.value === null ? 'Not reported' : `${cov.value}%`} sub={`${cov.reported} of ${cov.total} steps`} />
        <Stat label="Status reported" value={`${fields.status}/${fields.total}`} />
        <Stat label="Execution progress reported" value={`${fields.progress}/${fields.total}`} />
        <Stat label="Narrative updates" value={`${fields.comments}/${fields.total}`} />
      </div>

      <Card className="border-border/60 bg-card/70">
        <CardHeader className="pb-2"><CardTitle className="text-sm">{active} — Action Step Reporting</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {steps.map(({ step, action }) => {
            const u = step.updates.find(x => x.period === active);
            const reported = !!u && (u.status !== null || u.executionProgressPct !== null || !!u.comments);
            return (
              <div key={step.id} className="rounded-md border border-border/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">{action.code} · {step.code}</div>
                    <div className="text-sm">{step.title}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{u?.status ?? 'Status not reported'}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {u?.executionProgressPct !== null && u?.executionProgressPct !== undefined ? `${u.executionProgressPct}%` : 'Progress not reported'}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${reported ? 'border-emerald-500/40 text-emerald-300' : 'border-amber-500/40 text-amber-300'}`}>
                      {reported ? 'Update on file' : 'No update'}
                    </Badge>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground whitespace-pre-line">{textOr(u?.comments ?? null, 'No narrative update reported')}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const missing = value === 'Not reported';
  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 tabular-nums ${missing ? 'italic text-muted-foreground text-base' : 'text-xl font-semibold'}`}>{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
