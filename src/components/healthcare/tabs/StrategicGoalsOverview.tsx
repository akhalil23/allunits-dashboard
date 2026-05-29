import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HEALTHCARE_GOALS, goalProgress, goalBudget, goalRisk } from '@/lib/healthcare/sample-data';
import { User, Target, Layers, DollarSign, Search } from 'lucide-react';

const RISK_STYLE: Record<string, string> = {
  'No': 'border-emerald-500/40 text-emerald-300 bg-emerald-500/5',
  'Emerging': 'border-amber-500/40 text-amber-300 bg-amber-500/5',
  'Critical': 'border-red-500/40 text-red-300 bg-red-500/5',
  'Realized': 'border-red-700/40 text-red-400 bg-red-700/5',
};

export default function StrategicGoalsOverview({ onOpenGoal }: { onOpenGoal?: (code: number) => void }) {
  const [q, setQ] = useState('');
  const [risk, setRisk] = useState<string>('all');

  const goals = useMemo(() => {
    return HEALTHCARE_GOALS.filter(g => {
      const matchQ = !q || g.title.toLowerCase().includes(q.toLowerCase()) || g.champion.toLowerCase().includes(q.toLowerCase());
      const r = goalRisk(g);
      const matchR = risk === 'all' || r === risk;
      return matchQ && matchR;
    });
  }, [q, risk]);

  const fmt = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${(n / 1e3).toFixed(0)}K`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by goal title or champion…" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={risk} onValueChange={setRisk}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk levels</SelectItem>
            <SelectItem value="No">No risk</SelectItem>
            <SelectItem value="Emerging">Emerging</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {goals.map(g => {
          const p = goalProgress(g);
          const b = goalBudget(g);
          const r = goalRisk(g);
          const steps = g.actions.reduce((s, a) => s + a.steps.length, 0);
          return (
            <Card key={g.code} onClick={() => onOpenGoal?.(g.code)}
              className="cursor-pointer hover:border-emerald-500/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-emerald-400 tracking-wider">GOAL {g.code}</span>
                  <Badge variant="outline" className={RISK_STYLE[r]}>{r === 'No' ? 'No risk' : r}</Badge>
                </div>
                <CardTitle className="text-sm leading-snug pt-1">{g.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate">{g.champion}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground tabular-nums">{p}%</span>
                  </div>
                  <Progress value={p} className="h-1.5" />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                  <Stat icon={Target} label="Actions" value={g.actions.length} />
                  <Stat icon={Layers} label="Steps" value={steps} />
                  <Stat icon={DollarSign} label="Budget" value={fmt(b)} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {goals.length === 0 && (
        <Card><CardContent className="text-center py-12 text-sm text-muted-foreground">No goals match the current filters.</CardContent></Card>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 p-2 rounded-md bg-card/60 border border-border/50">
      <Icon className="w-3 h-3 text-muted-foreground" />
      <span className="text-foreground font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}
