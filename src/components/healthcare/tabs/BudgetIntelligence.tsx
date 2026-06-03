import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HEALTHCARE_GOALS } from '@/lib/healthcare/sample-data';
import {
  allSteps, goalBudget, goalCompletion, budgetByYear, budgetBySource, fmtCurrency, blockedItems,
} from '@/lib/healthcare/helpers';
import { DollarSign, TrendingUp, AlertTriangle, PiggyBank, Info } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';

const SRC_COLOR: Record<string, string> = {
  Operational: 'bg-blue-500',
  Capital: 'bg-purple-500',
  Grant: 'bg-emerald-500',
  Philanthropy: 'bg-amber-500',
};

const DERIVED_BADGE = (
  <Badge variant="outline" className="border-amber-500/40 text-amber-200 bg-amber-500/5 text-[10px] gap-1">
    <Info className="w-2.5 h-2.5" /> Derived
  </Badge>
);

export default function BudgetIntelligence() {
  const total = HEALTHCARE_GOALS.reduce((s, g) => s + goalBudget(g), 0);
  const byYear = budgetByYear();
  const bySource = budgetBySource();
  const maxYear = Math.max(...byYear.map(y => y.amount), 1);
  const blockedByGoal = useMemo(() => {
    const m: Record<number, number> = {};
    for (const b of blockedItems()) m[b.goal.code] = (m[b.goal.code] || 0) + 1;
    return m;
  }, []);

  const topSteps = useMemo(() => {
    return allSteps()
      .map(({ goal, step }) => ({ goal, step, total: step.budget.reduce((s, y) => s + (y.amount || 0), 0) }))
      .sort((a, b) => b.total - a.total).slice(0, 10);
  }, []);

  const goalShare = HEALTHCARE_GOALS.map(g => ({ g, b: goalBudget(g), c: goalCompletion(g) }))
    .sort((a, b) => b.b - a.b);
  const top2 = goalShare.slice(0, 2).reduce((s, x) => s + x.b, 0);
  const concentrationPct = total ? Math.round((top2 / total) * 100) : 0;

  // Herfindahl-Hirschman style index for funding-source concentration (0–10000)
  const hhi = total
    ? Math.round(bySource.reduce((s, x) => s + Math.pow((x.amount / total) * 100, 2), 0))
    : 0;

  const scatterData = HEALTHCARE_GOALS.map(g => ({
    code: `G${g.code}`,
    title: g.title,
    completion: goalCompletion(g).value,
    budget: goalBudget(g),
    blocked: blockedByGoal[g.code] || 0,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="5-year envelope" value={fmtCurrency(total)} icon={DollarSign} />
        <KPI label="Year 1 commit" value={fmtCurrency(byYear[0].amount)} icon={TrendingUp} />
        <KPI label="Top-2 goals share" value={`${concentrationPct}%`} sub="Concentration risk" icon={AlertTriangle} danger={concentrationPct > 55} />
        <KPI label="Source HHI" value={String(hhi)} sub={`${bySource.length} sources · ${hhi > 2500 ? 'concentrated' : 'diversified'}`} icon={PiggyBank} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
            <p className="text-[10px] text-muted-foreground/80 pt-2 border-t border-border/40 mt-2">
              HHI &gt; 2,500 indicates a concentrated funding base.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Derived Completion scatter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Budget vs Derived Completion (by goal)</CardTitle>
            {DERIVED_BADGE}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 12, bottom: 30, left: 8 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="completion" type="number" name="Completion" unit="%" domain={[0, 100]}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Derived completion %', position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <YAxis dataKey="budget" type="number" name="Budget"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => fmtCurrency(v)} />
                <ZAxis dataKey="blocked" range={[60, 280]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }}
                  formatter={(value: number | string, name: string) => {
                    if (name === 'Budget') return [fmtCurrency(value as number), 'Budget'];
                    if (name === 'Completion') return [`${value}%`, 'Derived %'];
                    return [value, name];
                  }}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as { code?: string; title?: string } | undefined;
                    return p ? `${p.code} — ${p.title}` : '';
                  }}
                />
                <Scatter data={scatterData} fill="hsl(160 84% 45%)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground/80 pt-2 border-t border-border/40 mt-2">
            Bubble size = blocked-step count. Derived completion uses prototype rules — see Dashboard Guide.
          </p>
        </CardContent>
      </Card>

      {/* Per-goal budget table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Budget by Strategic Goal</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border/40">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Goal</th>
                <th className="px-2 py-2 font-medium text-right">Budget</th>
                <th className="px-2 py-2 font-medium text-right">Share</th>
                <th className="px-2 py-2 font-medium text-right">Derived %</th>
                <th className="px-2 py-2 font-medium text-right">Blocked</th>
              </tr>
            </thead>
            <tbody>
              {goalShare.map(({ g, b, c }) => {
                const pct = total ? Math.round((b / total) * 100) : 0;
                const blk = blockedByGoal[g.code] || 0;
                return (
                  <tr key={g.code} className="border-b border-border/30">
                    <td className="px-3 py-2 max-w-[360px]">
                      <span className="font-mono text-emerald-400/80 mr-1">G{g.code}</span>
                      <span className="text-foreground">{g.title}</span>
                    </td>
                    <td className="px-2 py-2 text-right text-foreground tabular-nums">{fmtCurrency(b)}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground tabular-nums">{pct}%</td>
                    <td className="px-2 py-2 text-right text-foreground tabular-nums">{c.value}%</td>
                    <td className="px-2 py-2 text-right">
                      {blk > 0
                        ? <span className="text-red-300 tabular-nums">{blk}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

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
