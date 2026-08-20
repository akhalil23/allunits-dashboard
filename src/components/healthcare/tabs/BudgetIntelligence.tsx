/** Healthcare — Budget Intelligence (Goal 3 pilot, real data). No funding source or spend is invented. */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHealthcareData } from '@/lib/healthcare/HealthcareDataProvider';
import { flattenSteps, budgetByYear, budgetTotal, fmtCurrency, goalProgressAgg, textOr } from '@/lib/healthcare/metrics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts';

export default function BudgetIntelligence() {
  const { data } = useHealthcareData();
  const { goals } = data;
  const steps = flattenSteps(goals);
  const years = budgetByYear(goals);
  const total = budgetTotal(steps.map(s => s.step));

  const byAction = goals.flatMap(g => g.actions.map(a => ({
    code: a.code,
    title: a.title,
    ...budgetTotal(a.steps),
  }))).sort((x, y) => y.total - x.total);

  const nonNumeric = steps.flatMap(({ step }) =>
    step.budget.filter(b => b.amount === null && b.amountRaw).map(b => ({ step, year: b.year, raw: b.amountRaw!, note: b.note })));

  const noBudget = steps.filter(({ step }) => step.budget.every(b => b.amount === null && !b.amountRaw));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total planned (numeric)" value={fmtCurrency(total.total)} />
        <Stat label="Non-numeric entries" value={`${nonNumeric.length}`} sub="Excluded from totals" />
        <Stat label="Steps without budget data" value={`${noBudget.length}`} sub="Not treated as a funding gap" />
        <Stat label="Actual spend" value="Not reported" sub="No spend column in source" />
      </div>

      <Card className="border-border/60 bg-card/70">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Planned Budget Phasing (Years 1–5)</CardTitle></CardHeader>
        <CardContent className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={years}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmtCurrency(v)} />
              <ReTooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => fmtCurrency(v)}
              />
              <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Budget by Action vs Progress</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byAction.map(a => {
              const goal = goals.find(g => g.actions.some(x => x.code === a.code));
              const gp = goal ? goalProgressAgg(goal) : null;
              return (
                <div key={a.code} className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3">
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">Action {a.code}</div>
                    <div className="text-sm truncate">{a.title}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{fmtCurrency(a.total)}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {gp?.value === null || gp === null ? 'Progress not reported' : `Goal ${gp.value}%`}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Data Quality — Budget Cells</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            {nonNumeric.length === 0 && <p className="text-muted-foreground">All budget cells are numeric.</p>}
            {nonNumeric.map((n, i) => (
              <div key={`${n.step.code}-${n.year}-${i}`} className="rounded-md border border-border/60 p-3">
                <div className="text-[11px] text-muted-foreground">{n.step.code} · {n.year}</div>
                <div className="whitespace-pre-line">{n.raw}</div>
                {n.note && <div className="text-[11px] text-muted-foreground mt-1">Note: {n.note}</div>}
              </div>
            ))}
            {noBudget.length > 0 && (
              <div className="rounded-md border border-border/60 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">No budget reported</div>
                {noBudget.map(({ step }) => (
                  <div key={step.id} className="text-[11px] text-muted-foreground">{step.code} — {step.title} · owner {textOr(step.owner)}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
