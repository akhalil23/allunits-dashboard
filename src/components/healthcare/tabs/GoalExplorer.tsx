import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HEALTHCARE_GOALS } from '@/lib/healthcare/sample-data';
import { goalProgress, effectiveStatus, RISK_COLOR, fmtCurrency } from '@/lib/healthcare/helpers';
import type { HCGoal, HCStep, HCAction } from '@/lib/healthcare/types';
import { ChevronRight, User, Target, AlertOctagon } from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  'Done': 'border-emerald-500/40 text-emerald-300 bg-emerald-500/5',
  'In Progress': 'border-blue-500/40 text-blue-300 bg-blue-500/5',
  'Not Started': 'border-zinc-500/40 text-zinc-300 bg-zinc-500/5',
  'Blocked': 'border-red-500/40 text-red-300 bg-red-500/5',
  'On Target': 'border-emerald-500/40 text-emerald-300 bg-emerald-500/5',
  'Below Target': 'border-amber-500/40 text-amber-300 bg-amber-500/5',
  'N/A': 'border-zinc-700/40 text-zinc-400 bg-zinc-700/5',
};

export default function GoalExplorer({ initialGoal }: { initialGoal?: number }) {
  const [selected, setSelected] = useState<number>(initialGoal ?? HEALTHCARE_GOALS[0].code);
  const goal = useMemo(() => HEALTHCARE_GOALS.find(g => g.code === selected) ?? HEALTHCARE_GOALS[0], [selected]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
      <Card className="h-fit lg:sticky lg:top-4">
        <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Strategic Goals</CardTitle></CardHeader>
        <CardContent className="space-y-1 p-2">
          {HEALTHCARE_GOALS.map(g => {
            const active = g.code === selected;
            return (
              <button key={g.code} onClick={() => setSelected(g.code)}
                className={`w-full text-left px-2.5 py-2 rounded-md text-xs flex items-start gap-2 transition-colors
                  ${active ? 'bg-emerald-500/10 border border-emerald-500/30 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-card/60'}`}>
                <span className="font-mono shrink-0">G{g.code}</span>
                <span className="leading-snug">{g.title}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="space-y-5">
        <GoalHeader goal={goal} />
        {goal.actions.map(a => <ActionBlock key={a.code} action={a} />)}
      </div>
    </div>
  );
}

function GoalHeader({ goal }: { goal: HCGoal }) {
  const p = goalProgress(goal);
  return (
    <Card className="border-emerald-500/30">
      <CardContent className="p-5 space-y-3">
        <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">Goal {goal.code}</div>
        <h3 className="text-lg font-display font-semibold text-foreground">{goal.title}</h3>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /><span className="text-foreground">{goal.champion}</span></div>
          <div className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /><span>{goal.actions.length} actions · {goal.actions.reduce((s, a) => s + a.steps.length, 0)} steps</span></div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Goal progress</span>
            <span className="text-foreground tabular-nums">{p}%</span>
          </div>
          <Progress value={p} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

function ActionBlock({ action }: { action: HCAction }) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">
            <span className="font-mono text-emerald-400 mr-2">{action.code}</span>{action.title}
          </CardTitle>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
        {action.kpis && action.kpis.length > 0 && (
          <ul className="mt-2 text-xs text-muted-foreground space-y-0.5 list-disc pl-4">
            {action.kpis.map((k, i) => <li key={i}>{k}</li>)}
          </ul>
        )}
      </CardHeader>
      {open && (
        <CardContent className="space-y-3 pt-2">
          {action.steps.map(s => <StepRow key={s.code} step={s} />)}
        </CardContent>
      )}
    </Card>
  );
}

function StepRow({ step }: { step: HCStep }) {
  const eff = effectiveStatus(step);
  const totalBudget = step.budget.reduce((s, y) => s + (y.amount || 0), 0);

  return (
    <div className={`rounded-lg border bg-card/40 p-3 space-y-2 ${step.blocker ? 'border-red-500/40' : 'border-border/60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">
            <span className="font-mono text-emerald-400/80 mr-2">{step.code}</span>{step.title}
          </div>
          {step.intent && <div className="text-xs text-muted-foreground mt-1">{step.intent}</div>}
          {step.kpis && <div className="text-xs text-emerald-300/80 mt-1">KPI: {step.kpis}</div>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className={STATUS_STYLE[eff]}>{eff}</Badge>
          <Badge variant="outline" className={`text-[10px] ${RISK_COLOR[step.riskFlag]}`}>{step.riskFlag} risk</Badge>
          <span className="text-[10px] text-muted-foreground">Priority {step.priority}</span>
        </div>
      </div>

      {step.blocker && (
        <div className="rounded-md border border-red-500/40 bg-red-500/5 p-2.5 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-300 font-medium">Blocker · {step.blocker.type}</span>
            <span className="text-muted-foreground ml-auto">Owner: {step.blocker.decisionOwner}</span>
          </div>
          <p className="text-foreground/90 italic">"{step.blocker.reason}"</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
        <RACI label="Responsible" value={step.responsible} />
        <RACI label="Accountable" value={step.accountable} />
        <RACI label="Consulted" value={step.consulted} />
        <RACI label="Informed" value={step.informed} />
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {step.quarterly.map(q => (
          <Badge key={q.period} variant="outline" className={`text-[10px] ${STATUS_STYLE[q.status]}`} title={q.note}>
            {q.period}: {q.status}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
        <span className="text-muted-foreground">5-yr budget</span>
        <span className="text-foreground tabular-nums font-medium">{fmtCurrency(totalBudget)}</span>
      </div>
    </div>
  );
}

function RACI({ label, value }: { label: string; value?: string }) {
  const missing = !value;
  return (
    <div className={`rounded-md px-2 py-1.5 ${missing ? 'bg-amber-500/5 border border-amber-500/30' : 'bg-card/60 border border-border/50'}`}>
      <div className={`text-[9px] uppercase tracking-wider ${missing ? 'text-amber-300' : 'text-muted-foreground'}`}>{label}</div>
      <div className={`truncate ${missing ? 'text-amber-200 italic' : 'text-foreground'}`} title={value}>{value || 'missing'}</div>
    </div>
  );
}
