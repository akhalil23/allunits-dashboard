import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { HEALTHCARE_GOALS } from '@/lib/healthcare/sample-data';
import { goalProgress, goalBudget, goalRiskFlag, fmtCurrency, RISK_COLOR, blockedItems } from '@/lib/healthcare/helpers';
import { User, Target as TargetIcon, DollarSign, AlertOctagon, Search } from 'lucide-react';

export default function StrategicGoalsOverview({ onOpenGoal }: { onOpenGoal: (code: number) => void }) {
  const [q, setQ] = useState('');
  const blockersByGoal = useMemo(() => {
    const m: Record<number, number> = {};
    for (const b of blockedItems()) m[b.goal.code] = (m[b.goal.code] || 0) + 1;
    return m;
  }, []);
  const goals = HEALTHCARE_GOALS.filter(g =>
    !q || g.title.toLowerCase().includes(q.toLowerCase()) || g.champion.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search goals or champions…" className="pl-9 h-9 text-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {goals.map(g => {
          const p = goalProgress(g);
          const b = goalBudget(g);
          const rf = goalRiskFlag(g);
          const steps = g.actions.reduce((s, a) => s + a.steps.length, 0);
          const blk = blockersByGoal[g.code] || 0;
          return (
            <Card key={g.code} className="cursor-pointer hover:border-emerald-500/40 transition-colors" onClick={() => onOpenGoal(g.code)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">Goal {g.code}</span>
                  <Badge variant="outline" className={`text-[10px] ${RISK_COLOR[rf]}`}>{rf} risk</Badge>
                </div>
                <h3 className="text-sm font-semibold text-foreground leading-snug min-h-[2.5rem]">{g.title}</h3>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3 h-3" /><span className="truncate">{g.champion}</span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground tabular-nums">{p}%</span>
                  </div>
                  <Progress value={p} className="h-1.5" />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Metric icon={TargetIcon} label={`${g.actions.length}A · ${steps}S`} />
                  <Metric icon={DollarSign} label={fmtCurrency(b)} />
                  <Metric icon={AlertOctagon} label={blk ? `${blk} blocked` : '—'} danger={blk > 0} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, danger }: { icon: React.ElementType; label: string; danger?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] ${danger ? 'text-red-300' : 'text-muted-foreground'}`}>
      <Icon className="w-3 h-3 shrink-0" /><span className="truncate">{label}</span>
    </div>
  );
}
