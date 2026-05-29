import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { HEALTHCARE_GOALS, allSteps, goalBudget } from '@/lib/healthcare/sample-data';
import { DollarSign, PieChart, Calendar, AlertTriangle } from 'lucide-react';

export default function BudgetIntelligence() {
  const fmt = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`;
  const steps = allSteps();
  const total = HEALTHCARE_GOALS.reduce((s, g) => s + goalBudget(g), 0);

  const bySource: Record<string, number> = {};
  steps.forEach(({ step }) => step.budget.forEach(y => {
    const src = y.source ?? 'Operational';
    bySource[src] = (bySource[src] || 0) + (y.amount || 0);
  }));

  const byYear: Record<string, number> = {};
  steps.forEach(({ step }) => step.budget.forEach(y => {
    byYear[y.year] = (byYear[y.year] || 0) + (y.amount || 0);
  }));

  const concentration = HEALTHCARE_GOALS
    .map(g => ({ g, b: goalBudget(g) }))
    .sort((a, b) => b.b - a.b);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BudgetKpi icon={DollarSign} label="5-yr Total" value={fmt(total)} />
        <BudgetKpi icon={PieChart} label="Funding sources" value={String(Object.keys(bySource).length)} />
        <BudgetKpi icon={Calendar} label="Year horizon" value="5" sub="Y1 – Y5" />
        <BudgetKpi icon={AlertTriangle} label="Concentration top-3" value={`${Math.round((concentration.slice(0, 3).reduce((s, x) => s + x.b, 0) / total) * 100)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle className="text-sm">Budget by Strategic Goal</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {concentration.map(({ g, b }) => {
              const pct = total ? Math.round((b / total) * 100) : 0;
              return (
                <div key={g.code}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground truncate"><span className="text-emerald-400 font-mono">G{g.code}</span> · {g.title}</span>
                    <span className="text-muted-foreground tabular-nums">{fmt(b)} · {pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Budget by Funding Source</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(bySource).sort((a, b) => b[1] - a[1]).map(([src, amt]) => {
              const pct = total ? Math.round((amt / total) * 100) : 0;
              return (
                <div key={src}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground">{src}</span>
                    <span className="text-muted-foreground tabular-nums">{fmt(amt)} · {pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Budget by Year</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-5 gap-3">
          {Object.entries(byYear).map(([year, amt]) => (
            <div key={year} className="rounded-lg bg-card/60 border border-border/50 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{year}</div>
              <div className="text-lg font-semibold text-foreground tabular-nums mt-1">{fmt(amt)}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" />Budget Observations (prototype)</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Capital spend concentration is heavy in <span className="text-foreground">Digital Health (G4)</span> and <span className="text-foreground">Outpatient Expansion (G6)</span> — together &gt;55% of the 5-yr envelope.</p>
          <p>• Philanthropy and Grant funding is currently aspirational and not yet tied to confirmed pledges.</p>
          <p>• Year 1 carries the highest absolute load; cash-flow phasing should be revisited before final approval.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function BudgetKpi({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300"><Icon className="w-4 h-4" /></div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold text-foreground tabular-nums">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </CardContent></Card>
  );
}
