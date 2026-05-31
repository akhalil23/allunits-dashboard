import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HEALTHCARE_GOALS } from '@/lib/healthcare/sample-data';
import {
  allSteps, goalProgress, goalBudget, statusDistribution4, blockedItems,
  fmtCurrency, STATUS4_COLOR, RISK_COLOR,
} from '@/lib/healthcare/helpers';
import type { HCTab } from '@/components/healthcare/HealthcareSidebar';
import { TrendingUp, AlertOctagon, DollarSign, Target, Flag, ArrowRight } from 'lucide-react';

export default function ExecutiveSnapshot({ onJumpTo }: { onJumpTo?: (t: HCTab) => void }) {
  const steps = allSteps();
  const dist = statusDistribution4();
  const totalSteps = Object.values(dist).reduce((a, b) => a + b, 0);
  const overallProgress = Math.round(
    HEALTHCARE_GOALS.reduce((s, g) => s + goalProgress(g), 0) / HEALTHCARE_GOALS.length
  );
  const totalBudget = HEALTHCARE_GOALS.reduce((s, g) => s + goalBudget(g), 0);
  const blockers = blockedItems();
  const highRisk = steps.filter(s => s.step.riskFlag === 'High').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Overall Progress" value={`${overallProgress}%`} sub={`${HEALTHCARE_GOALS.length} strategic goals`} icon={TrendingUp} accent="emerald" />
        <KPI label="Action Steps" value={String(totalSteps)} sub={`${dist['Done']} done · ${dist['In Progress']} in-flight`} icon={Target} accent="blue" />
        <KPI label="Active Blockers" value={String(blockers.length)} sub="Executive decision required" icon={AlertOctagon} accent="red" />
        <KPI label="5-Year Budget" value={fmtCurrency(totalBudget)} sub={`${highRisk} high-risk items`} icon={DollarSign} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <p className="text-[10px] text-muted-foreground/80 pt-2 border-t border-border/40 mt-2">
              Healthcare-native model — "On Target/Below Target" replaced by Champion Risk Flag.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-red-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><AlertOctagon className="w-4 h-4 text-red-400" />Decisions & Blockers</CardTitle>
              {onJumpTo && (
                <button onClick={() => onJumpTo('blockers')} className="text-[11px] text-emerald-300 hover:text-emerald-200 flex items-center gap-1">
                  Open board <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {blockers.slice(0, 5).map(({ step, goal }) => (
              <div key={step.code} className="text-xs border-b border-border/40 pb-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="border-red-500/40 text-red-300 bg-red-500/5 shrink-0 text-[10px]">{step.blocker?.type}</Badge>
                  <div className="min-w-0">
                    <div className="text-foreground font-medium">{step.code} · {step.title}</div>
                    <div className="text-muted-foreground">G{goal.code} · Owner: {step.blocker?.decisionOwner}</div>
                  </div>
                </div>
              </div>
            ))}
            {blockers.length === 0 && <p className="text-xs text-muted-foreground">No active blockers.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Flag className="w-4 h-4 text-amber-300" />Top Champion Risk Flags</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {steps.filter(s => s.step.riskFlag === 'High').slice(0, 6).map(({ step, goal }) => (
              <div key={step.code} className="flex items-start gap-2 text-xs border-b border-border/40 pb-2">
                <Badge variant="outline" className={`shrink-0 text-[10px] ${RISK_COLOR['High']}`}>High</Badge>
                <div className="min-w-0">
                  <div className="text-foreground font-medium">{step.code} · {step.title}</div>
                  <div className="text-muted-foreground">G{goal.code} · Champion: {step.champion}</div>
                </div>
              </div>
            ))}
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
