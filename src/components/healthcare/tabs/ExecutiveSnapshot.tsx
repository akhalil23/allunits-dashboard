import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HEALTHCARE_GOALS } from '@/lib/healthcare/sample-data';
import {
  allSteps, goalCompletion, goalBudget, statusDistribution4, blockedItems,
  portfolioCompletion, reportingCoverage, riskSignals, riskIndex, riskBand,
  budgetBySource, fmtCurrency, STATUS4_COLOR,
} from '@/lib/healthcare/helpers';
import type { HCTab } from '@/components/healthcare/HealthcareSidebar';
import {
  TrendingUp, AlertOctagon, DollarSign, Target, ArrowRight, ClipboardCheck, ShieldAlert, Info,
} from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis,
} from 'recharts';

const DERIVED_BADGE = (
  <Badge variant="outline" className="border-amber-500/40 text-amber-200 bg-amber-500/5 text-[10px] gap-1">
    <Info className="w-2.5 h-2.5" /> Derived
  </Badge>
);

export default function ExecutiveSnapshot({ onJumpTo }: { onJumpTo?: (t: HCTab) => void }) {
  const steps = allSteps();
  const dist = statusDistribution4();
  const totalSteps = Object.values(dist).reduce((a, b) => a + b, 0);
  const portfolio = portfolioCompletion();
  const coverage = reportingCoverage();
  const totalBudget = HEALTHCARE_GOALS.reduce((s, g) => s + goalBudget(g), 0);
  const blockers = blockedItems();

  // Aggregate risk signals fired across portfolio
  const signalTotals = steps.reduce(
    (acc, { step }) => {
      const s = riskSignals(step);
      acc.blocked += s.blocked ? 1 : 0;
      acc.missingUpdate += s.missingUpdate ? 1 : 0;
      acc.fundingGap += s.fundingGap ? 1 : 0;
      acc.governanceGap += s.governanceGap ? 1 : 0;
      return acc;
    },
    { blocked: 0, missingUpdate: 0, fundingGap: 0, governanceGap: 0 },
  );
  const totalSignalsFired = signalTotals.blocked + signalTotals.missingUpdate + signalTotals.fundingGap + signalTotals.governanceGap;

  // Budget vs derived completion scatter
  const scatterData = HEALTHCARE_GOALS.map(g => {
    const c = goalCompletion(g);
    return {
      code: `G${g.code}`,
      title: g.title,
      completion: c.value,
      budget: goalBudget(g),
      blocked: c.blocked,
    };
  });

  const sources = budgetBySource();

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPI
          label="Portfolio Completion"
          value={`${portfolio.value}%`}
          sub={`${portfolio.blocked} blocked / ${portfolio.total} steps`}
          icon={TrendingUp}
          accent="emerald"
          derived
        />
        <KPI
          label="Reporting Coverage"
          value={`${coverage.value}%`}
          sub={`${coverage.reported} of ${coverage.total} reported Q2 2026`}
          icon={ClipboardCheck}
          accent="blue"
        />
        <KPI
          label="Risk Signals Fired"
          value={String(totalSignalsFired)}
          sub="Across 4 binary signals"
          icon={ShieldAlert}
          accent="amber"
        />
        <KPI
          label="Active Blockers"
          value={String(blockers.length)}
          sub="Executive decision required"
          icon={AlertOctagon}
          accent="red"
        />
        <KPI
          label="5-Year Budget"
          value={fmtCurrency(totalBudget)}
          sub={`${HEALTHCARE_GOALS.length} strategic goals`}
          icon={DollarSign}
          accent="emerald"
        />
      </div>

      {/* Progress by Goal + Status + Risk Signals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-300" />
                Progress by Strategic Goal
              </CardTitle>
              {DERIVED_BADGE}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {HEALTHCARE_GOALS.map(g => {
              const c = goalCompletion(g);
              return (
                <div key={g.code}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-foreground font-medium truncate pr-2">
                      <span className="text-emerald-400 font-mono">G{g.code}</span> · {g.title}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {c.blocked > 0 && (
                        <Badge variant="outline" className="border-red-500/40 text-red-300 bg-red-500/5 text-[10px]">
                          {c.blocked} blocked
                        </Badge>
                      )}
                      <span className="text-muted-foreground tabular-nums">{c.value}%</span>
                    </span>
                  </div>
                  <Progress value={c.value} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Status (4-state)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(Object.entries(dist) as [keyof typeof dist, number][]).map(([s, n]) => {
                const pct = totalSteps ? Math.round((n / totalSteps) * 100) : 0;
                return (
                  <div key={s} className="flex items-center gap-3 text-xs">
                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS4_COLOR[s]}`} />
                    <span className="flex-1 text-foreground">{s}</span>
                    <span className="text-muted-foreground tabular-nums">{n} · {pct}%</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-300" />
                Risk Signals (auditable)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <SignalRow label="Blocked steps" n={signalTotals.blocked} total={totalSteps} color="bg-red-500" />
              <SignalRow label="Missing Q2 update" n={signalTotals.missingUpdate} total={totalSteps} color="bg-amber-500" />
              <SignalRow label="Funding gap" n={signalTotals.fundingGap} total={totalSteps} color="bg-purple-500" />
              <SignalRow label="Governance gap" n={signalTotals.governanceGap} total={totalSteps} color="bg-blue-500" />
              <p className="text-[10px] text-muted-foreground/80 pt-2 border-t border-border/40">
                Each signal contributes 25 points to the per-step Risk Index. See Dashboard Guide.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Blockers + Budget vs Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-red-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-400" />Decisions & Blockers
              </CardTitle>
              {onJumpTo && (
                <button onClick={() => onJumpTo('blockers')} className="text-[11px] text-emerald-300 hover:text-emerald-200 flex items-center gap-1">
                  Open board <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {blockers.slice(0, 5).map(({ step, goal }) => {
              const ri = riskIndex(step);
              return (
                <div key={step.code} className="text-xs border-b border-border/40 pb-2">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="border-red-500/40 text-red-300 bg-red-500/5 shrink-0 text-[10px]">{step.blocker?.type}</Badge>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-200 bg-amber-500/5 shrink-0 text-[10px]">
                      RI {ri.score} · {riskBand(ri.score)}
                    </Badge>
                    <div className="min-w-0">
                      <div className="text-foreground font-medium">{step.code} · {step.title}</div>
                      <div className="text-muted-foreground">G{goal.code} · Owner: {step.blocker?.decisionOwner}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {blockers.length === 0 && <p className="text-xs text-muted-foreground">No active blockers.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-300" />
                Budget vs Derived Completion
              </CardTitle>
              {DERIVED_BADGE}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 12, bottom: 24, left: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="completion" type="number" name="Completion" unit="%" domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Derived completion %', position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                  <YAxis dataKey="budget" type="number" name="Budget"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => fmtCurrency(v)} />
                  <ZAxis dataKey="blocked" range={[60, 260]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }}
                    formatter={(value: number | string, name: string) => {
                      if (name === 'Budget') return [fmtCurrency(value as number), 'Budget'];
                      if (name === 'Completion') return [`${value}%`, 'Derived %'];
                      if (name === 'blocked') return [value, 'Blocked steps'];
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
      </div>

      {/* Funding mix bar */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Funding source mix (5-year envelope)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-3 rounded overflow-hidden mb-3">
            {sources.map(s => {
              const pct = totalBudget ? (s.amount / totalBudget) * 100 : 0;
              const color = SRC_COLOR[s.source] || 'bg-zinc-500';
              return <div key={s.source} className={color} style={{ width: `${pct}%` }} title={`${s.source}: ${fmtCurrency(s.amount)}`} />;
            })}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {sources.sort((a, b) => b.amount - a.amount).map(s => (
              <div key={s.source} className="flex items-center gap-2 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${SRC_COLOR[s.source] || 'bg-zinc-500'}`} />
                <span className="flex-1 text-foreground">{s.source}</span>
                <span className="text-muted-foreground tabular-nums">{Math.round((s.amount / totalBudget) * 100)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const SRC_COLOR: Record<string, string> = {
  Operational: 'bg-blue-500',
  Capital: 'bg-purple-500',
  Grant: 'bg-emerald-500',
  Philanthropy: 'bg-amber-500',
};

function SignalRow({ label, n, total, color }: { label: string; n: number; total: number; color: string }) {
  const pct = total ? Math.round((n / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">{n} · {pct}%</span>
      </div>
      <div className="h-1.5 bg-card rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KPI({ label, value, sub, icon: Icon, accent, derived }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent: string; derived?: boolean;
}) {
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{label}</div>
            {derived && <span className="text-[9px] text-amber-300/80 shrink-0">·derived</span>}
          </div>
          <div className="text-xl font-semibold text-foreground tabular-nums">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
