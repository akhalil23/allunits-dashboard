import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HEALTHCARE_GOALS } from '@/lib/healthcare/sample-data';
import { allSteps, raciGaps, effectiveStatus, RISK_COLOR } from '@/lib/healthcare/helpers';
import { Users, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function RACIChampionCockpit() {
  const steps = useMemo(() => allSteps(), []);

  // Champion load
  const champions: Record<string, { steps: number; goals: Set<number>; blocked: number; highRisk: number }> = {};
  for (const { step, goal } of steps) {
    const c = step.champion || 'Unassigned';
    if (!champions[c]) champions[c] = { steps: 0, goals: new Set(), blocked: 0, highRisk: 0 };
    champions[c].steps++;
    champions[c].goals.add(goal.code);
    if (effectiveStatus(step) === 'Blocked') champions[c].blocked++;
    if (step.riskFlag === 'High') champions[c].highRisk++;
  }
  const championList = Object.entries(champions).sort((a, b) => b[1].steps - a[1].steps);

  // RACI coverage
  const totalSteps = steps.length;
  const cov = {
    R: steps.filter(s => s.step.responsible).length,
    A: steps.filter(s => s.step.accountable).length,
    C: steps.filter(s => s.step.consulted).length,
    I: steps.filter(s => s.step.informed).length,
  };
  const gaps = steps.map(s => ({ ...s, gaps: raciGaps(s.step) })).filter(s => s.gaps.length > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* RACI coverage */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-300" />RACI coverage</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(['R', 'A', 'C', 'I'] as const).map(k => {
              const n = cov[k];
              const pct = Math.round((n / totalSteps) * 100);
              const label = { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' }[k];
              return (
                <div key={k}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground">{label}</span>
                    <span className="text-muted-foreground tabular-nums">{n}/{totalSteps} · {pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">
              Accountable is the critical role — any gap is escalated to executive review.
            </p>
          </CardContent>
        </Card>

        {/* Champion load distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-emerald-300" />Champion load</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[320px] overflow-y-auto">
            {championList.map(([name, c]) => (
              <div key={name} className="flex items-center gap-3 text-xs border-b border-border/30 pb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-foreground font-medium truncate">{name}</div>
                  <div className="text-[10px] text-muted-foreground">{c.goals.size} goal{c.goals.size > 1 ? 's' : ''} · {c.steps} steps</div>
                </div>
                {c.highRisk > 0 && <Badge variant="outline" className={`text-[10px] ${RISK_COLOR['High']}`}>{c.highRisk} high</Badge>}
                {c.blocked > 0 && <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-300 bg-red-500/5">{c.blocked} blocked</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* RACI gaps list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-300" />
            Ownership gaps ({gaps.length} step{gaps.length !== 1 ? 's' : ''})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {gaps.slice(0, 30).map(({ step, goal, gaps }) => (
            <div key={step.code} className="flex items-start gap-3 text-xs border-b border-border/30 pb-2">
              <div className="flex gap-1 shrink-0">
                {gaps.map(g => <Badge key={g} variant="outline" className="text-[10px] border-amber-500/40 text-amber-200 bg-amber-500/10">{g}</Badge>)}
              </div>
              <div className="min-w-0">
                <div className="text-foreground font-medium">
                  <span className="font-mono text-emerald-400/80 mr-1">{step.code}</span>{step.title}
                </div>
                <div className="text-muted-foreground">G{goal.code} · Champion: {step.champion}</div>
              </div>
            </div>
          ))}
          {gaps.length === 0 && <p className="text-xs text-muted-foreground">Full RACI coverage across all steps.</p>}
        </CardContent>
      </Card>

      {/* Goal-level champions */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Goal-level champions</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {HEALTHCARE_GOALS.map(g => (
            <div key={g.code} className="flex items-center gap-3 text-xs border border-border/40 rounded-md px-3 py-2">
              <span className="font-mono text-emerald-400 shrink-0">G{g.code}</span>
              <div className="min-w-0 flex-1">
                <div className="text-foreground truncate">{g.title}</div>
                <div className="text-muted-foreground text-[10px]">{g.champion}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
