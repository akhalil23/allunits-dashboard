/**
 * Healthcare — Budget Intelligence (visual-aligned with University SP)
 * Premium KPI cards, stacked financial structure bar, per-goal cards with composition donuts,
 * funding-source mix, and 5-year phasing chart.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InfoTip } from '@/components/ui/info-tip';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HEALTHCARE_GOALS } from '@/lib/healthcare/sample-data';
import {
  allSteps, goalBudget, goalCompletion, budgetByYear, budgetBySource, fmtCurrency, blockedItems,
} from '@/lib/healthcare/helpers';
import { DollarSign, BarChart3, Lightbulb, AlertTriangle, PiggyBank, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, PieChart, Pie, LabelList,
} from 'recharts';

const SRC_COLOR_HEX: Record<string, string> = {
  Operational:  '#3B82F6',
  Capital:      '#8B5CF6',
  Grant:        '#10B981',
  Philanthropy: '#F59E0B',
};

const BRAND = 'hsl(161 100% 30%)';

function DerivedBadge() {
  return (
    <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/5 text-[10px]">
      Derived · pending validation
    </Badge>
  );
}

export default function BudgetIntelligence() {
  const total = HEALTHCARE_GOALS.reduce((s, g) => s + goalBudget(g), 0);
  const byYear = budgetByYear();
  const bySource = budgetBySource();

  const blockedByGoal = useMemo(() => {
    const m: Record<number, number> = {};
    for (const b of blockedItems()) m[b.goal.code] = (m[b.goal.code] || 0) + 1;
    return m;
  }, []);

  const topSteps = useMemo(() =>
    allSteps()
      .map(({ goal, step }) => ({ goal, step, total: step.budget.reduce((s, y) => s + (y.amount || 0), 0) }))
      .sort((a, b) => b.total - a.total).slice(0, 10),
    []);

  const goalRows = HEALTHCARE_GOALS.map(g => ({
    g,
    budget: goalBudget(g),
    completion: goalCompletion(g).value,
    blocked: blockedByGoal[g.code] || 0,
  })).sort((a, b) => b.budget - a.budget);

  const top2 = goalRows.slice(0, 2).reduce((s, x) => s + x.budget, 0);
  const concentrationPct = total ? Math.round((top2 / total) * 100) : 0;
  const hhi = total
    ? Math.round(bySource.reduce((s, x) => s + Math.pow((x.amount / total) * 100, 2), 0))
    : 0;
  const year1 = byYear[0]?.amount ?? 0;

  // Effectiveness narrative
  const effectiveness: string[] = [];
  effectiveness.push(`Total committed envelope of ${fmtCurrency(total)} spread across ${HEALTHCARE_GOALS.length} strategic goals over 5 years.`);
  if (concentrationPct > 55) effectiveness.push(`Top-2 goals concentrate ${concentrationPct}% of the envelope — consider portfolio-balance review.`);
  else effectiveness.push(`Top-2 goals hold ${concentrationPct}% of the envelope — concentration within acceptable bounds.`);
  if (hhi > 2500) effectiveness.push(`Funding-source HHI of ${hhi} indicates a concentrated funding base; diversification advisable.`);
  else effectiveness.push(`Funding-source HHI of ${hhi} reflects a diversified funding base across ${bySource.length} sources.`);
  const blockedGoals = goalRows.filter(r => r.blocked > 0).length;
  if (blockedGoals > 0) effectiveness.push(`${blockedGoals} goal${blockedGoals === 1 ? '' : 's'} carry blocked steps — review before next funding tranche release.`);

  return (
    <div className="space-y-8">
      {/* KPI Row */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPICard
            label="5-Year Envelope"
            value={fmtCurrency(total)}
            color={BRAND}
            subtitle="Total committed"
            tooltip="Sum of committed amounts across Years 1–5 for all Healthcare strategic goals."
          />
          <KPICard
            label="Year 1 Commitment"
            value={fmtCurrency(year1)}
            color="#3B82F6"
            subtitle={`${total ? Math.round((year1 / total) * 100) : 0}% of envelope`}
            tooltip="Funds committed in Year 1 of the Healthcare Strategic Plan."
          />
          <KPICard
            label="Top-2 Goals Share"
            value={`${concentrationPct}%`}
            color={concentrationPct > 55 ? '#DC2626' : '#16A34A'}
            subtitle={concentrationPct > 55 ? 'Concentration risk' : 'Balanced portfolio'}
            tooltip="Share of the 5-year envelope held by the two highest-budget goals."
          />
          <KPICard
            label="Source HHI"
            value={String(hhi)}
            color={hhi > 2500 ? '#F59E0B' : '#16A34A'}
            subtitle={`${bySource.length} sources · ${hhi > 2500 ? 'concentrated' : 'diversified'}`}
            tooltip="Herfindahl-Hirschman Index of funding-source shares (0–10,000). >2,500 = concentrated, <1,500 = diversified."
          />
        </div>
      </section>

      {/* Budget Effectiveness Overview */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4" style={{ color: BRAND }} />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Budget Effectiveness Overview</span>
          </div>
          <div className="space-y-2">
            {effectiveness.map((insight, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: BRAND }} />
                <p className="text-xs text-foreground leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* 5-Year Phasing + Funding Mix */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: BRAND }} />
                Multi-Year Budget Phasing (Y1 → Y5)
                <InfoTip text="Distribution of committed dollars across the 5-year Healthcare SP horizon." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byYear} margin={{ top: 20, right: 10, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => fmtCurrency(v)} />
                    <ReTooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }}
                      formatter={(v: number) => [fmtCurrency(v), 'Committed']}
                    />
                    <Bar dataKey="amount" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={48}>
                      <LabelList dataKey="amount" position="top" formatter={(v: number) => fmtCurrency(v)} style={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--foreground))' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground/80 pt-3 border-t border-border/40 mt-2">
                Years 3–5 commonly appear light because Champions defer multi-year commitments — flag for stakeholder review.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <PiggyBank className="w-4 h-4" style={{ color: BRAND }} />
                Funding Source Mix
                <InfoTip text="Composition of the 5-year envelope by funding source." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 shrink-0 relative">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={bySource} dataKey="amount" nameKey="source" innerRadius="58%" outerRadius="92%" strokeWidth={0}>
                        {bySource.map((s, i) => (
                          <Cell key={i} fill={SRC_COLOR_HEX[s.source] || '#71717A'} />
                        ))}
                      </Pie>
                      <ReTooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }}
                        formatter={(v: number, n) => [`${fmtCurrency(v)} · ${Math.round((v / total) * 100)}%`, n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {bySource.sort((a, b) => b.amount - a.amount).map(s => {
                    const pct = total ? Math.round((s.amount / total) * 100) : 0;
                    return (
                      <div key={s.source} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SRC_COLOR_HEX[s.source] || '#71717A' }} />
                        <span className="text-foreground font-medium flex-1">{s.source}</span>
                        <span className="text-muted-foreground tabular-nums">{fmtCurrency(s.amount)}</span>
                        <span className="text-foreground font-semibold tabular-nums w-9 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/80 pt-3 border-t border-border/40 mt-3">
                HHI &gt; 2,500 indicates a concentrated funding base. Current HHI = <span className="font-semibold text-foreground">{hhi}</span>.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Strategic Area Budget Analytics */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Per-Goal Budget Analytics</span>
            <InfoTip text="Executive view of budget share, derived completion, and blocked-step exposure for each Healthcare strategic goal." />
            <DerivedBadge />
          </div>
          <p className="text-[10px] text-muted-foreground mb-5">Each goal card shows budget composition, share-of-envelope, derived completion, and blocked-step exposure.</p>

          <div className="space-y-4">
            {goalRows.map((row, idx) => (
              <GoalBudgetCard key={row.g.code} row={row} idx={idx} total={total} />
            ))}
          </div>
        </motion.div>
      </section>

      {/* Top-funded steps */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: BRAND }} />
                Top 10 Funded Action Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {topSteps.map(({ goal, step, total }) => (
                <div key={step.code} className="flex items-center gap-3 text-xs border-b border-border/30 pb-1.5">
                  <span className="font-mono shrink-0 w-14" style={{ color: BRAND }}>{step.code}</span>
                  <span className="flex-1 truncate text-foreground" title={step.title}>{step.title}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">G{goal.code}</Badge>
                  <span className="text-foreground font-semibold tabular-nums shrink-0 w-16 text-right">{fmtCurrency(total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </div>
  );
}

/* ─── Goal Budget Card ─────────────────────────────────────────────── */

function GoalBudgetCard({ row, idx, total }: { row: { g: typeof HEALTHCARE_GOALS[number]; budget: number; completion: number; blocked: number }; idx: number; total: number }) {
  const { g, budget, completion, blocked } = row;
  const share = total ? (budget / total) * 100 : 0;
  const shareLabel = share.toFixed(1);
  const completionColor = completion >= 70 ? '#16A34A' : completion >= 40 ? '#F59E0B' : '#DC2626';
  const shareColor = share >= 25 ? '#DC2626' : share >= 15 ? '#F59E0B' : BRAND;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 + idx * 0.03 }}
      className="rounded-2xl border border-border/50 bg-card/80 hover:shadow-lg hover:border-border/70 transition-all duration-300 overflow-hidden"
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${BRAND}, ${BRAND}66)` }} />
      <div className="p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          {/* Goal identity */}
          <div className="flex items-center gap-3 md:w-[200px] shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${BRAND}18`, border: `1px solid ${BRAND}30` }}>
              <span className="text-xs font-bold" style={{ color: BRAND }}>G{g.code}</span>
            </div>
            <div className="min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm font-semibold text-foreground truncate cursor-help">{g.title}</p>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs max-w-xs">{g.title}</p></TooltipContent>
              </Tooltip>
              <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{fmtCurrency(budget)} · {shareLabel}% of envelope</p>
            </div>
          </div>

          {/* Budget share track */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-foreground font-medium">Budget Share</span>
                <span className="font-bold tabular-nums" style={{ color: shareColor }}>{shareLabel}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, share)}%` }} transition={{ delay: 0.2, duration: 0.5 }} className="h-full rounded-full" style={{ backgroundColor: shareColor }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-foreground font-medium">Derived Completion</span>
                <span className="font-bold tabular-nums" style={{ color: completionColor }}>{completion}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, completion)}%` }} transition={{ delay: 0.25, duration: 0.5 }} className="h-full rounded-full" style={{ backgroundColor: completionColor }} />
              </div>
            </div>
          </div>

          {/* Exposure metrics */}
          <div className="md:w-[170px] shrink-0 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-bold text-foreground tabular-nums">{fmtCurrency(budget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Blocked steps</span>
              {blocked > 0
                ? <span className="font-bold text-red-500 tabular-nums">{blocked}</span>
                : <span className="text-muted-foreground">—</span>}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-bold" style={{ color: completionColor }}>
                {completion >= 70 ? 'On Track' : completion >= 40 ? 'Monitor' : 'Behind Plan'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── KPI Card (shared aesthetic with University SP) ───────────────── */

function KPICard({ label, value, color, subtitle, tooltip }: {
  label: string; value: string; color: string; subtitle?: string; tooltip?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none" style={{ backgroundColor: color }} />
      <div className="relative p-4 sm:p-5">
        <div className="flex items-center gap-1">
          <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-tight">{label}</p>
          {tooltip && <InfoTip text={tooltip} />}
        </div>
        <p className="text-xl sm:text-2xl font-extrabold mt-1.5 tracking-tight tabular-nums" style={{ color }}>{value}</p>
        {subtitle && <p className="text-[10px] sm:text-[11px] font-semibold mt-0.5" style={{ color }}>{subtitle}</p>}
      </div>
    </motion.div>
  );
}
