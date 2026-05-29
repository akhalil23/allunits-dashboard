import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HEALTHCARE_GOALS, allSteps, goalProgress, goalBudget, statusDistribution } from '@/lib/healthcare/sample-data';
import { TrendingUp, AlertTriangle, DollarSign, Target, Sparkles } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'Done': 'bg-emerald-500',
  'On Target': 'bg-green-500',
  'In Progress': 'bg-blue-500',
  'Below Target': 'bg-amber-500',
  'Not Started': 'bg-zinc-500',
  'N/A': 'bg-zinc-700',
};

export default function ExecutiveSnapshot() {
  const steps = allSteps();
  const overallProgress = Math.round(steps.reduce((s, x) => s + x.step.progress, 0) / steps.length);
  const totalBudget = HEALTHCARE_GOALS.reduce((s, g) => s + goalBudget(g), 0);
  const dist = statusDistribution();
  const totalSteps = Object.values(dist).reduce((a, b) => a + b, 0);
  const highRisk = steps.filter(s => s.step.risk === 'Critical' || s.step.risk === 'Realized').length;
  const highPriority = steps.filter(s => s.step.priority === 1).length;

  const fmt = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${(n / 1e3).toFixed(0)}K`;

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Overall Progress" value={`${overallProgress}%`} icon={TrendingUp} accent="emerald" />
        <KPI label="Strategic Items" value={String(totalSteps)} sub={`${HEALTHCARE_GOALS.length} goals`} icon={Target} accent="blue" />
        <KPI label="5-Year Budget" value={fmt(totalBudget)} sub="Committed prototype envelope" icon={DollarSign} accent="amber" />
        <KPI label="High-Priority Items" value={String(highPriority)} sub={`${highRisk} critical risks`} icon={AlertTriangle} accent="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goal progress */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Progress by Strategic Goal</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {HEALTHCARE_GOALS.map(g => {
              const p = goalProgress(g);
              return (
                <div key={g.code}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-foreground font-medium truncate pr-2">
                      <span className="text-emerald-400 font-mono">G{g.code}</span> · {g.title}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{p}%</span>
                  </div>
                  <Progress value={p} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Status Distribution</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(dist).map(([s, n]) => {
              const pct = totalSteps ? Math.round((n / totalSteps) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-3 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[s]}`} />
                  <span className="flex-1 text-foreground">{s}</span>
                  <span className="text-muted-foreground tabular-nums">{n} · {pct}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Top risks + executive insight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" />Top Strategic Risks</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {steps.filter(s => s.step.risk === 'Critical').slice(0, 6).map(s => (
              <div key={s.step.code} className="flex items-start gap-2 text-xs border-b border-border/40 pb-2">
                <Badge variant="outline" className="border-red-500/40 text-red-300 bg-red-500/5 shrink-0">Critical</Badge>
                <div className="min-w-0">
                  <div className="text-foreground font-medium">{s.step.code} · {s.step.title}</div>
                  <div className="text-muted-foreground">G{s.goal.code} · {s.action.title}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/[0.02]">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-300" />Executive Insight (prototype)</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Healthcare SP is in early execution with strong governance momentum but concentrated risk in <span className="text-foreground">Digital Health (G4)</span> and <span className="text-foreground">Outpatient Expansion (G6)</span>.</p>
            <p>The largest single budget block is the digital core modernization. Empathy & cultural-sensitivity training (3.1.1) is the most overdue clinical commitment.</p>
            <p className="text-xs italic">Insight is illustrative — generated AI reasoning will replace this in Phase 2.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub?: string; icon: React.ElementType; accent: string }) {
  const accentMap: Record<string, string> = {
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    blue: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    red: 'text-red-300 bg-red-500/10 border-red-500/30',
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${accentMap[accent]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold text-foreground tabular-nums">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
