import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HEALTHCARE_GOALS } from '@/lib/healthcare/sample-data';
import { allSteps, goalBudget, budgetByYear, budgetBySource, fmtCurrency } from '@/lib/healthcare/helpers';
import { DollarSign, TrendingUp, AlertTriangle, PiggyBank } from 'lucide-react';

const SRC_COLOR: Record<string, string> = {
  Operational: 'bg-blue-500',
  Capital: 'bg-purple-500',
  Grant: 'bg-emerald-500',
  Philanthropy: 'bg-amber-500',
};

export default function BudgetIntelligence() {
  const total = HEALTHCARE_GOALS.reduce((s, g) => s + goalBudget(g), 0);
  const byYear = budgetByYear();
  const bySource = budgetBySource();
  const maxYear = Math.max(...byYear.map(y => y.amount), 1);

  // Top-funded steps
  const topSteps = useMemo(() => {
    return allSteps()
      .map(({ goal, step }) => ({ goal, step, total: step.budget.reduce((s, y) => s + (y.amount || 0), 0) }))
      .sort((a, b) => b.total - a.total).slice(0, 10);
  }, []);

  // Concentration
  const goalShare = HEALTHCARE_GOALS.map(g => ({ g, b: goalBudget(g) })).sort((a, b) => b.b - a.b);
  const top2 = goalShare.slice(0, 2).reduce((s, x) => s + x.b, 0);
  const concentrationPct = Math.round((top2 / total) * 100);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="5-year envelope" value={fmtCurrency(total)} icon={DollarSign} />
        <KPI label="Year 1 commit" value={fmtCurrency(byYear[0].amount)} icon={TrendingUp} />
        <KPI label="Top-2 goals share" value={`${concentrationPct}%`} sub="Concentration risk" icon={AlertTriangle} danger={concentrationPct > 55} />
        <KPI label="Funding sources" value={String(bySource.length)} sub={bySource.map(s => s.source).join(' · ')} icon={PiggyBank} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Year phasing */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Budget phasing (Y1 → Y5)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {byYear.map(y => {
              const pct = Math.round((y.amount / maxYear) * 100);
              return (
                <div key={y.year}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">{y.year}</span>
                    <span className="text-muted-foreground tabular-nums">{fmtCurrency(y.amount)}</span>
                  </div>
                  <div className="h-2 bg-card rounded overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">
              Years 3–5 typically light because Champions defer multi-year commitments — flag for stakeholder review.
            </p>
          </CardContent>
        </Card>

        {/* Source mix */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Funding source mix</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-3 rounded overflow-hidden mb-3">
              {bySource.map(s => (
                <div key={s.source} className={SRC_COLOR[s.source] || 'bg-zinc-500'} style={{ width: `${(s.amount / total) * 100}%` }} title={s.source} />
              ))}
            </div>
            <div className="space-y-1.5">
              {bySource.sort((a, b) => b.amount - a.amount).map(s => (
                <div key={s.source} className="flex items-center gap-2 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${SRC_COLOR[s.source] || 'bg-zinc-500'}`} />
                  <span className="flex-1 text-foreground">{s.source}</span>
                  <span className="text-muted-foreground tabular-nums">{fmtCurrency(s.amount)} · {Math.round((s.amount / total) * 100)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goal x budget */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Budget by Strategic Goal</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {goalShare.map(({ g, b }) => {
            const pct = Math.round((b / total) * 100);
            return (
              <div key={g.code}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground truncate pr-2">
                    <span className="font-mono text-emerald-400 mr-1">G{g.code}</span>{g.title}
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0">{fmtCurrency(b)} · {pct}%</span>
                </div>
                <div className="h-1.5 bg-card rounded overflow-hidden">
                  <div className="h-full bg-emerald-500/70" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Top funded */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Top 10 funded action steps</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {topSteps.map(({ goal, step, total }) => (
            <div key={step.code} className="flex items-center gap-3 text-xs border-b border-border/30 pb-1.5">
              <span className="font-mono text-emerald-400/80 shrink-0 w-12">{step.code}</span>
              <span className="flex-1 truncate text-foreground" title={step.title}>{step.title}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">G{goal.code}</Badge>
              <span className="text-muted-foreground tabular-nums shrink-0 w-16 text-right">{fmtCurrency(total)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ label, value, sub, icon: Icon, danger }: { label: string; value: string; sub?: string; icon: React.ElementType; danger?: boolean }) {
  return (
    <Card className={danger ? 'border-amber-500/40' : ''}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${danger ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'}`}>
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
