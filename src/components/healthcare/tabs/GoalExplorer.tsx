/** Healthcare — Goal Explorer (Goal 3 pilot, real data). Full drill-down with "Not reported" states. */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHealthcareData } from '@/lib/healthcare/HealthcareDataProvider';
import {
  actionProgress, goalProgressAgg, stepProgress, latestStatus, updateFor, evaluateKpi,
  atRiskSignals, budgetTotal, fmtCurrency, textOr,
} from '@/lib/healthcare/metrics';
import type { HCStepRecord } from '@/lib/healthcare/model';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function GoalExplorer({ initialGoal }: { initialGoal?: number }) {
  const { data } = useHealthcareData();
  const { goals, config, currentPeriod } = data;
  const goal = goals.find(g => g.code === initialGoal) ?? goals[0];
  const [open, setOpen] = useState<string | null>(null);

  if (!goal) return <p className="text-sm text-muted-foreground">No Healthcare goal data imported yet.</p>;

  const gp = goalProgressAgg(goal);

  return (
    <div className="space-y-5">
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm leading-snug">Goal {goal.code} — {goal.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
          <span>Champion: <span className="text-foreground">{textOr(goal.champion)}</span></span>
          <span>Progress: <span className="text-foreground">{gp.value === null ? 'Not reported' : `${gp.value}%`}</span></span>
          <span>Steps: <span className="text-foreground">{gp.total}</span></span>
          <span>Current period: <span className="text-foreground">{currentPeriod ?? 'n/a'}</span></span>
        </CardContent>
      </Card>

      {goal.actions.map(a => {
        const ap = actionProgress(a);
        const ab = budgetTotal(a.steps);
        return (
          <Card key={a.id} className="border-border/60 bg-card/70">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-sm leading-snug">Action {a.code} — {a.title}</CardTitle>
                <div className="flex gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px]">{ap.value === null ? 'Progress not reported' : `${ap.value}%`}</Badge>
                  <Badge variant="outline" className="text-[10px]">{fmtCurrency(ab.total)}</Badge>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground pt-1">
                SPOC: {textOr(a.spoc)} · Action KPI: {a.actionKpiText ? <span className="whitespace-pre-line">{a.actionKpiText}</span> : 'Not reported'}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {a.steps.map(s => (
                <StepRow
                  key={s.id}
                  step={s}
                  expanded={open === s.id}
                  onToggle={() => setOpen(open === s.id ? null : s.id)}
                  currentPeriod={currentPeriod}
                  config={config}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StepRow({
  step, expanded, onToggle, currentPeriod, config,
}: {
  step: HCStepRecord; expanded: boolean; onToggle: () => void;
  currentPeriod: string | null; config: ReturnType<typeof useHealthcareData>['data']['config'];
}) {
  const p = stepProgress(step);
  const { status } = latestStatus(step);
  const cur = updateFor(step, currentPeriod);
  const kpi = evaluateKpi(step, config, currentPeriod);
  const signals = atRiskSignals(step, config, currentPeriod);
  const budget = budgetTotal([step]);

  return (
    <div className="rounded-md border border-border/60">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left">
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <span className="text-xs text-muted-foreground shrink-0">{step.code}</span>
        <span className="text-sm flex-1 min-w-0 truncate">{step.title}</span>
        <Badge variant="outline" className="text-[10px] shrink-0">{status ?? 'Status not reported'}</Badge>
        <span className="text-xs tabular-nums w-28 text-right shrink-0">
          {p.value === null ? <span className="italic text-muted-foreground">Progress N/R</span> : `${p.value}%`}
        </span>
        {signals.length > 0 && <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-300 shrink-0">At Risk</Badge>}
      </button>

      {expanded && (
        <div className="border-t border-border/60 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <Field label="Intent" value={textOr(step.intent)} />
            <Field label="Owner" value={textOr(step.owner)} />
            <Field label="Priority" value={step.priority !== null ? String(step.priority) : 'Not reported'} />
            <Field label="Responsible (R)" value={textOr(step.responsible)} />
            <Field label="Accountable (A)" value={textOr(step.accountable)} />
            <Field label="Consulted (C)" value={textOr(step.consulted)} />
            <Field label="Informed (I)" value={textOr(step.informed)} />
            <Field label="Planned budget" value={fmtCurrency(budget.total)} />
            {step.budget.map(b => (
              <Field key={b.year} label={b.year} value={
                b.amount !== null ? `${fmtCurrency(b.amount)}${b.note ? ` — ${b.note}` : ''}`
                  : b.amountRaw ? `${b.amountRaw} (non-numeric)${b.note ? ` — ${b.note}` : ''}` : 'Not reported'
              } />
            ))}
          </div>

          <div className="space-y-1.5">
            <Field label="KPI (source wording)" value={textOr(step.kpi?.originalText ?? null)} />
            <Field label="KPI type" value={textOr(step.kpi?.kpiType ?? null)} />
            <Field label="KPI target" value={
              step.kpi?.targetValue !== null && step.kpi?.targetValue !== undefined
                ? `${step.kpi.targetValue}${step.kpi.targetUnit ? ` ${step.kpi.targetUnit}` : ''}`
                : textOr(step.kpi?.targetValueRaw ?? null)
            } />
            <Field label="KPI target date" value={textOr(step.kpi?.targetDate ?? null)} />
            <Field label="KPI actual" value={kpi.actual !== null ? String(kpi.actual) : 'Not reported'} />
            <Field label="Achievement %" value={kpi.achievementPct !== null ? `${kpi.achievementPct}%` : `Not Yet Measurable — ${kpi.reason}`} />
            <Field label="Performance vs target" value={config.onBelowTargetEnabled ? kpi.verdict : 'Disabled pending methodology'} />
            <Field label="Expected progress" value="Not defined (pending stakeholder validation)" />
            <Field label="Blocker?" value={textOr(cur?.blockerFlag ?? null)} />
            <Field label="Blocker category" value={textOr(cur?.blockerCategory ?? null)} />
            <Field label="Blocker details" value={textOr(cur?.blockerDetails ?? null)} />
            <Field label="Next milestone" value={textOr(cur?.nextMilestone ?? null)} />
            <Field label="Expected milestone date" value={textOr(cur?.expectedMilestoneDate ?? null)} />
            <Field label="Supporting evidence" value={textOr(cur?.evidence ?? null)} />
          </div>

          <div className="lg:col-span-2 space-y-2">
            {signals.length > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                <div className="text-[11px] uppercase tracking-wide text-amber-300 mb-1">At-risk reasons</div>
                <ul className="space-y-1">
                  {signals.map(s => <li key={s.key} className="text-[11px] text-muted-foreground">• <span className="text-foreground">{s.label}</span> — {s.reason}</li>)}
                </ul>
              </div>
            )}
            <div className="rounded-md border border-border/60 p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Quarterly reporting</div>
              <div className="space-y-2">
                {step.updates.map(u => (
                  <div key={u.period} className="grid grid-cols-[90px_1fr] gap-3">
                    <span className="text-[11px] text-muted-foreground">{u.period}</span>
                    <div>
                      <div className="text-[11px]">
                        <span className="text-muted-foreground">Status: </span>{u.status ?? 'Not reported'}
                        <span className="text-muted-foreground"> · Progress: </span>{u.executionProgressPct !== null ? `${u.executionProgressPct}%` : 'Not reported'}
                      </div>
                      <p className="text-[11px] text-muted-foreground whitespace-pre-line mt-0.5">{u.comments ?? 'No narrative update reported'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const missing = value.startsWith('Not reported') || value.startsWith('Not defined') || value.startsWith('Not Yet Measurable') || value.startsWith('Disabled');
  return (
    <div className="grid grid-cols-[150px_1fr] gap-2">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={`text-[12px] whitespace-pre-line ${missing ? 'italic text-muted-foreground' : ''}`}>{value}</span>
    </div>
  );
}
