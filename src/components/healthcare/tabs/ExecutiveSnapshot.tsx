/**
 * Healthcare — Executive Snapshot (Goal 3 pilot, real data).
 * Every figure comes from imported source cells. Missing structured values render
 * as "Not reported"; nothing is inferred from narrative comments.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import KPICard from '@/components/healthcare/KPICard';
import { useHealthcareData } from '@/lib/healthcare/HealthcareDataProvider';
import {
  flattenSteps, portfolioProgress, goalProgressAgg, statusDistribution, reportingCoverage,
  structuredFieldCoverage, atRiskSignals, budgetTotal, budgetByYear, fmtCurrency, evaluateKpi,
} from '@/lib/healthcare/metrics';
import type { HCTab } from '@/components/healthcare/HealthcareSidebar';
import { ArrowRight, AlertOctagon, ClipboardCheck, ShieldAlert, Info } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

const STATUS_COLOR: Record<string, string> = {
  'Completed': '#16A34A',
  'In Progress': '#F59E0B',
  'Not Started': '#6B7280',
  'Blocked': '#DC2626',
  'Not reported': '#475569',
};

export default function ExecutiveSnapshot({ onJumpTo }: { onJumpTo?: (t: HCTab) => void }) {
  const { data } = useHealthcareData();
  const { goals, config, currentPeriod, batch, issues } = data;
  const steps = flattenSteps(goals);
  const progress = portfolioProgress(goals);
  const dist = statusDistribution(goals);
  const coverage = reportingCoverage(goals, currentPeriod);
  const fields = structuredFieldCoverage(goals, currentPeriod);
  const budget = budgetTotal(steps.map(s => s.step));
  const years = budgetByYear(goals);

  const atRisk = steps.filter(({ step }) => atRiskSignals(step, config, currentPeriod).length > 0);
  const blockers = steps.filter(({ step }) => {
    const u = step.updates.find(x => x.period === currentPeriod);
    return u?.blockerFlag?.toLowerCase() === 'yes';
  });
  const measurableKpis = steps.filter(({ step }) => step.kpi?.targetValue !== null && step.kpi?.targetValue !== undefined);
  const kpiEvaluated = measurableKpis.filter(({ step }) => evaluateKpi(step, config, currentPeriod).achievementPct !== null);

  const donut = Object.entries(dist)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, fill: STATUS_COLOR[name] }));

  const goalBars = goals.map(g => {
    const p = goalProgressAgg(g);
    return { code: `G${g.code}`, title: g.title, value: p.value ?? 0, reported: p.value !== null, notReported: p.notReported, total: p.total };
  });

  return (
    <div className="space-y-8">
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Goal 3 pilot — real data.</span>{' '}
            Source: {batch ? `${batch.filename} · sheet "${batch.sourceSheet}"` : 'no import batch'} ·
            current period {currentPeriod ?? 'n/a'} · {issues.length} validation warning{issues.length === 1 ? '' : 's'}.
            Expected Progress, On/Below Target and Schedule Variance are <span className="text-foreground">disabled</span> pending stakeholder validation.
            Structured fields left blank in the source are shown as “Not reported”.
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <KPICard
          index={0}
          label="Goal Progress"
          value={progress.value === null ? 'Not reported' : `${progress.value}%`}
          color="#16A34A"
          subtitle={`${progress.counted} of ${progress.total} steps with a usable value`}
          tooltip="Mean of reported Execution Progress %. Blank In Progress / Blocked steps are excluded — never inferred."
          derived
        />
        <KPICard
          index={1}
          label="Reporting Coverage"
          value={coverage.value === null ? 'Not reported' : `${coverage.value}%`}
          color={(coverage.value ?? 0) >= 75 ? '#16A34A' : (coverage.value ?? 0) >= 50 ? '#F59E0B' : '#DC2626'}
          subtitle={`${coverage.reported} updated · ${coverage.missing} missing (${currentPeriod ?? 'n/a'})`}
          tooltip="Action steps with a valid current-period update ÷ all applicable Goal 3 action steps."
          derived
        />
        <KPICard
          index={2}
          label="At-Risk Steps"
          value={`${atRisk.length} / ${steps.length}`}
          color="#F59E0B"
          subtitle="Signal-based, each with a stated reason"
          tooltip="A step is At Risk when at least one signal fires: Blocked status, blocker raised, missing current update, or overdue milestone."
          derived
        />
        <KPICard
          index={3}
          label="Active Blockers"
          value={`${blockers.length}`}
          color="#DC2626"
          subtitle={blockers.length ? 'Reported in source' : 'None reported in source'}
          tooltip="Steps where the current-period Blocker? field is Yes."
        />
        <KPICard
          index={4}
          label="On-Target Rate"
          value="Not reported"
          subtitle="Pending expected-progress methodology"
          tooltip="Requires an approved Expected Progress rule and validated KPI directions. Disabled by configuration."
        />
        <KPICard
          index={5}
          label="Planned Budget"
          value={fmtCurrency(budget.total)}
          color="#3B82F6"
          subtitle={budget.unquantified ? `${budget.unquantified} non-numeric entries excluded` : 'All entries numeric'}
          tooltip="Sum of numeric planned budget cells across Years 1–5. Text ranges in the source are excluded from the total and listed in Budget Intelligence."
          derived
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reported Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {donut.map(d => <Cell key={d.name} fill={d.fill} />)}
                </Pie>
                <ReTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-muted-foreground text-center -mt-4">
              Status is taken verbatim from the source; blank cells are counted as “Not reported”.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Structured Field Completeness — {currentPeriod ?? 'n/a'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              ['Progress Update / Comments', fields.comments],
              ['Status', fields.status],
              ['Execution Progress %', fields.progress],
              ['KPI Actual Value', fields.kpiActual],
              ['Blocker?', fields.blocker],
              ['Next Milestone', fields.milestone],
            ].map(([label, count]) => (
              <div key={label as string} className="flex items-center gap-3">
                <span className="w-52 shrink-0 text-xs text-muted-foreground">{label}</span>
                <div className="flex-1 h-2 rounded bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded bg-primary"
                    style={{ width: `${fields.total ? ((count as number) / fields.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-16 text-right text-xs tabular-nums">{count as number}/{fields.total}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Progress by Goal</CardTitle></CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={goalBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <ReTooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, _n, p) => [p.payload.reported ? `${v}%` : 'Not reported', p.payload.title]}
                />
                <Bar dataKey="value" fill="hsl(161 100% 30%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Planned Budget by Year</CardTitle></CardHeader>
          <CardContent className="h-[240px]">
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
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="border-border/60 bg-card/70 lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-400" /> At-Risk Steps & Reasons</CardTitle>
            {onJumpTo && (
              <button className="text-xs text-primary flex items-center gap-1" onClick={() => onJumpTo('blockers')}>
                Open board <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </CardHeader>
          <CardContent className="space-y-2 max-h-[320px] overflow-y-auto">
            {atRisk.length === 0 && <p className="text-xs text-muted-foreground">No signals fired.</p>}
            {atRisk.map(({ step, action }) => (
              <div key={step.id} className="rounded-md border border-border/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{action.code} · {step.code}</div>
                    <div className="text-sm truncate">{step.title}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">At Risk</Badge>
                </div>
                <ul className="mt-2 space-y-1">
                  {atRiskSignals(step, config, currentPeriod).map(s => (
                    <li key={s.key} className="text-[11px] text-muted-foreground flex gap-2">
                      <AlertOctagon className="h-3 w-3 mt-0.5 text-amber-400 shrink-0" />
                      <span><span className="text-foreground">{s.label}</span> — {s.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> KPI Readiness</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <Row label="Action steps" value={`${steps.length}`} />
            <Row label="With numeric KPI target" value={`${measurableKpis.length}`} />
            <Row label="With computable achievement" value={`${kpiEvaluated.length}`} />
            <Row label="KPI direction validated" value="0" />
            <p className="pt-2 leading-relaxed">
              Achievement % stays “Not Yet Measurable” until both a numeric actual value and a validated KPI direction exist in the source.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="text-foreground tabular-nums">{value}</span>
    </div>
  );
}
