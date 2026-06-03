/**
 * Healthcare — Executive Snapshot (visual-aligned with University SP)
 * Premium KPI cards, donut status distribution, grouped bar for Budget vs Derived Completion,
 * pillar-style Progress by Goal, auditable Risk Signals card, Reporting Coverage KPI.
 */

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InfoTip } from '@/components/ui/info-tip';
import { HEALTHCARE_GOALS } from '@/lib/healthcare/sample-data';
import {
  allSteps, goalCompletion, goalBudget, statusDistribution4, blockedItems,
  portfolioCompletion, reportingCoverage, riskSignals, riskIndex, riskBand,
  budgetBySource, portfolioRiskIndex, fmtCurrency,
} from '@/lib/healthcare/helpers';
import type { HCTab } from '@/components/healthcare/HealthcareSidebar';
import {
  TrendingUp, AlertOctagon, DollarSign, Target, ArrowRight, ClipboardCheck,
  ShieldAlert, Lightbulb, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, PieChart, Pie, LabelList,
} from 'recharts';

const STATUS_COLOR: Record<string, string> = {
  'Done':        '#16A34A',
  'In Progress': '#F59E0B',
  'Not Started': '#6B7280',
  'Blocked':     '#DC2626',
};

const SRC_COLOR_HEX: Record<string, string> = {
  Operational:  '#3B82F6',
  Capital:      '#8B5CF6',
  Grant:        '#10B981',
  Philanthropy: '#F59E0B',
};

const BRAND = 'hsl(161 100% 30%)';                  // healthcare emerald
const BRAND_SOFT = 'hsl(161 100% 30% / 0.88)';

function progressStatus(value: number): { label: string; color: string } {
  if (value >= 70) return { label: 'On Track',     color: '#16A34A' };
  if (value >= 40) return { label: 'Monitor',      color: '#F59E0B' };
  return                   { label: 'Behind Plan', color: '#DC2626' };
}

function riskColor(score: number) {
  if (score >= 75) return '#7F1D1D';
  if (score >= 50) return '#DC2626';
  if (score >= 25) return '#F59E0B';
  return '#16A34A';
}

export default function ExecutiveSnapshot({ onJumpTo }: { onJumpTo?: (t: HCTab) => void }) {
  const steps = allSteps();
  const dist = statusDistribution4();
  const totalSteps = Object.values(dist).reduce((a, b) => a + b, 0);
  const portfolio = portfolioCompletion();
  const coverage = reportingCoverage();
  const totalBudget = HEALTHCARE_GOALS.reduce((s, g) => s + goalBudget(g), 0);
  const blockers = blockedItems();
  const portfolioRI = portfolioRiskIndex();
  const portfolioRIBand = riskBand(portfolioRI);
  const portfolioRIColor = riskColor(portfolioRI);

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
  const totalSignalsFired =
    signalTotals.blocked + signalTotals.missingUpdate + signalTotals.fundingGap + signalTotals.governanceGap;

  const statusDonut = (Object.entries(dist) as [string, number][])
    .map(([name, value]) => ({ name, value, fill: STATUS_COLOR[name] }))
    .filter(d => d.value > 0);

  // Budget vs Derived Completion data — grouped bars per goal (share-of-portfolio %)
  const alignmentData = HEALTHCARE_GOALS.map(g => {
    const c = goalCompletion(g);
    const budget = goalBudget(g);
    const budgetShare = totalBudget ? Math.round((budget / totalBudget) * 100) : 0;
    return {
      code: `G${g.code}`,
      title: g.title,
      completion: c.value,
      budgetShare,
      budget,
      blocked: c.blocked,
    };
  });

  const sources = budgetBySource();
  const portfolioStatus = progressStatus(portfolio.value);

  const highlights = [
    {
      title: 'Execution Pace',
      insight: `Portfolio is ${portfolio.value}% complete (${portfolio.blocked} blocked of ${portfolio.total} steps). ${portfolioStatus.label}.`,
      icon: TrendingUp, color: portfolioStatus.color,
    },
    {
      title: 'Risk Concentration',
      insight: `Portfolio Risk Index at ${portfolioRI} (${portfolioRIBand}). ${totalSignalsFired} risk signal${totalSignalsFired === 1 ? '' : 's'} fired across the 4-signal model.`,
      icon: ShieldAlert, color: portfolioRIColor,
    },
    {
      title: 'Reporting Quality',
      insight: `Q2 2026 coverage at ${coverage.value}%. ${coverage.total - coverage.reported} step${coverage.total - coverage.reported === 1 ? '' : 's'} missing an update.`,
      icon: ClipboardCheck, color: coverage.value >= 75 ? '#16A34A' : coverage.value >= 50 ? '#F59E0B' : '#DC2626',
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          <KPICard
            label="Portfolio Completion"
            value={`${portfolio.value}%`}
            color={portfolioStatus.color}
            subtitle={portfolioStatus.label}
            tooltip="Mean derived completion across all non-blocked action steps. Blocked items are excluded from the denominator and reported separately."
            derived
          />
          <KPICard
            label="Blocked Steps"
            value={`${portfolio.blocked} / ${portfolio.total}`}
            color="#DC2626"
            subtitle="Excluded from completion"
            tooltip="Steps currently in Blocked state — surfaced separately so the headline percentage stays meaningful."
          />
          <KPICard
            label="Reporting Coverage"
            value={`${coverage.value}%`}
            color={coverage.value >= 75 ? '#16A34A' : coverage.value >= 50 ? '#F59E0B' : '#DC2626'}
            subtitle={`${coverage.reported} updated · ${coverage.total - coverage.reported} missing`}
            tooltip="Share of action steps with a valid Q2 2026 quarterly update (status entered or note written). Drives the Missing Update risk signal."
          />
          <KPICard
            label="Risk Index"
            value={`${portfolioRI}%`}
            color={portfolioRIColor}
            subtitle={portfolioRIBand}
            tooltip="Mean Risk Index across all steps. RI per step = sum of 4 binary signals × 25 points (Blocked, Missing Update, Funding Gap, Governance Gap)."
            derived
          />
          <KPICard
            label="Active Blockers"
            value={String(blockers.length)}
            color="#DC2626"
            subtitle="Executive decision required"
            tooltip="Steps flagged with a documented blocker requiring executive resolution."
          />
          <KPICard
            label="5-Year Budget"
            value={fmtCurrency(totalBudget)}
            color={BRAND}
            subtitle={`${HEALTHCARE_GOALS.length} strategic goals`}
            tooltip="Sum of committed amounts across Years 1–5 from the Healthcare Strategic Plan."
          />
        </div>
      </section>

      {/* Executive Highlights */}
      <section>
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" /> Executive Highlights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {highlights.map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm p-4 sm:p-5"
            >
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: h.color }} />
              <div className="flex items-start gap-3 pl-2">
                <div className="p-2 rounded-lg bg-muted/40 mt-0.5"><h.icon className="w-4 h-4" style={{ color: h.color }} /></div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{h.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{h.insight}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Progress by Goal + Status donut + Risk Signals */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" style={{ color: BRAND }} />
                  Progress by Strategic Goal
                  <InfoTip text="Derived completion per goal. Bar color reflects pace (≥70% On Track, ≥40% Monitor, otherwise Behind Plan). Blocked steps shown as a side count and excluded from the percentage." />
                </CardTitle>
                <DerivedBadge />
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {HEALTHCARE_GOALS.map(g => {
                const c = goalCompletion(g);
                const st = progressStatus(c.value);
                return (
                  <div key={g.code}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-foreground font-medium truncate pr-2">
                        <span className="font-mono mr-1" style={{ color: BRAND }}>G{g.code}</span>
                        {g.title}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        {c.blocked > 0 && (
                          <Badge variant="outline" className="border-red-500/40 text-red-500 bg-red-500/5 text-[10px]">
                            {c.blocked} blocked
                          </Badge>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${st.color}15`, color: st.color }}>
                          {st.label}
                        </span>
                        <span className="text-foreground font-semibold tabular-nums w-10 text-right">{c.value}%</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, c.value)}%` }}
                        transition={{ duration: 0.6 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: st.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-6">
          {/* Status donut */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  Status Distribution
                  <InfoTip text="Action steps grouped by 4-state Healthcare status. Blocked items count toward the chart but are excluded from completion math." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusDonut} dataKey="value" innerRadius="62%" outerRadius="92%" strokeWidth={0}>
                        {statusDonut.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <ReTooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }}
                        formatter={(v: number, n: string) => [`${v} step${v === 1 ? '' : 's'} · ${Math.round((v / totalSteps) * 100)}%`, n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total steps</span>
                    <span className="text-2xl font-bold text-foreground tabular-nums">{totalSteps}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3">
                  {(Object.entries(dist) as [string, number][]).map(([s, n]) => {
                    const pct = totalSteps ? Math.round((n / totalSteps) * 100) : 0;
                    return (
                      <div key={s} className="flex items-center gap-2 text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[s] }} />
                        <span className="text-foreground truncate">{s}</span>
                        <span className="text-muted-foreground tabular-nums ml-auto">{n} · {pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Risk Signals card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" style={{ color: portfolioRIColor }} />
                  Risk Signals
                  <InfoTip text="Each step fires up to 4 binary signals (Blocked, Missing Update, Funding Gap, Governance Gap). Each contributes 25 points to its per-step Risk Index." />
                  <DerivedBadge />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="flex items-baseline gap-2 pb-1">
                  <span className="text-2xl font-bold tabular-nums" style={{ color: portfolioRIColor }}>{portfolioRI}%</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: portfolioRIColor }}>{portfolioRIBand}</span>
                </div>
                <SignalRow label="Blocked" n={signalTotals.blocked} total={totalSteps} color="#DC2626" />
                <SignalRow label="Missing Q2 update" n={signalTotals.missingUpdate} total={totalSteps} color="#F59E0B" />
                <SignalRow label="Funding gap" n={signalTotals.fundingGap} total={totalSteps} color="#8B5CF6" />
                <SignalRow label="Governance gap" n={signalTotals.governanceGap} total={totalSteps} color="#3B82F6" />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Budget vs Derived Completion alignment chart */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Budget Share vs Derived Completion (by Goal)
              </span>
              <InfoTip text="Compares each goal's share of the 5-year budget envelope against its derived completion %. Use it to spot heavy-budget goals lagging on execution." />
            </div>
            <DerivedBadge />
          </div>

          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alignmentData} margin={{ top: 20, right: 20, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }} />
                <ReTooltip
                  content={({ payload }) => {
                    if (!payload?.[0]) return null;
                    const d = payload[0].payload as typeof alignmentData[number];
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1 max-w-xs">
                        <p className="font-semibold text-foreground">{d.code} · {d.title}</p>
                        <p className="text-muted-foreground">Budget share: <span className="text-foreground font-medium">{d.budgetShare}%</span> ({fmtCurrency(d.budget)})</p>
                        <p className="text-muted-foreground">Derived completion: <span className="text-foreground font-medium">{d.completion}%</span></p>
                        {d.blocked > 0 && <p className="text-red-500">Blocked steps: {d.blocked}</p>}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="budgetShare" name="Budget share %" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={32}>
                  <LabelList dataKey="budgetShare" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--foreground))' }} />
                </Bar>
                <Bar dataKey="completion" name="Derived completion %" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  <LabelList dataKey="completion" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--foreground))' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3">
            <LegendDot color={BRAND} label="Budget share %" />
            <LegendDot color="#F59E0B" label="Derived completion %" />
          </div>
          <p className="text-[10px] text-muted-foreground/80 pt-3 border-t border-border/40 mt-3">
            Derived completion uses prototype rules pending stakeholder validation — see the Dashboard Guide for methodology.
          </p>
        </motion.div>
      </section>

      {/* Blockers + Funding source mix */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl border-red-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-500" /> Decisions & Blockers
                </CardTitle>
                {onJumpTo && (
                  <button onClick={() => onJumpTo('blockers')} className="text-[11px] flex items-center gap-1 hover:underline" style={{ color: BRAND }}>
                    Open board <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {blockers.slice(0, 5).map(({ step, goal }) => {
                const ri = riskIndex(step);
                return (
                  <div key={step.code} className="text-xs border-b border-border/40 pb-2 last:border-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <Badge variant="outline" className="border-red-500/40 text-red-500 bg-red-500/5 shrink-0 text-[10px]">{step.blocker?.type}</Badge>
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/5 shrink-0 text-[10px]" style={{ color: riskColor(ri.score) }}>
                        RI {ri.score} · {riskBand(ri.score)}
                      </Badge>
                      <div className="min-w-0 flex-1">
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
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: BRAND }} />
                Funding Source Mix (5-Year Envelope)
                <InfoTip text="Distribution of total committed dollars across Operational, Capital, Grant, and Philanthropy sources." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-3 rounded-full overflow-hidden mb-4">
                {sources.map(s => {
                  const pct = totalBudget ? (s.amount / totalBudget) * 100 : 0;
                  return (
                    <div key={s.source} style={{ width: `${pct}%`, backgroundColor: SRC_COLOR_HEX[s.source] || '#71717A' }} title={`${s.source}: ${fmtCurrency(s.amount)}`} />
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {sources.sort((a, b) => b.amount - a.amount).map(s => {
                  const pct = totalBudget ? Math.round((s.amount / totalBudget) * 100) : 0;
                  return (
                    <div key={s.source} className="rounded-lg border border-border/40 p-2.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SRC_COLOR_HEX[s.source] || '#71717A' }} />
                        <span className="text-foreground font-medium">{s.source}</span>
                        <span className="text-muted-foreground tabular-nums ml-auto">{pct}%</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground tabular-nums mt-1">{fmtCurrency(s.amount)}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function DerivedBadge() {
  return (
    <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/5 text-[10px]">
      Derived · pending validation
    </Badge>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function SignalRow({ label, n, total, color }: { label: string; n: number; total: number; color: string }) {
  const pct = total ? Math.round((n / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">{n} · {pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
          className="h-full rounded-full" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}

function KPICard({ label, value, color, subtitle, tooltip, derived }: {
  label: string; value: string; color: string; subtitle?: string; tooltip?: string; derived?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] blur-2xl pointer-events-none" style={{ backgroundColor: color }} />
      <div className="relative p-4 sm:p-5 flex flex-col h-full">
        <div className="flex items-center gap-1 flex-wrap">
          <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-tight">{label}</p>
          {tooltip && <InfoTip text={tooltip} />}
          {derived && <span className="text-[9px] font-semibold text-amber-600 ml-0.5">·derived</span>}
        </div>
        <p className="text-xl sm:text-2xl font-extrabold mt-1.5 tracking-tight tabular-nums" style={{ color }}>{value}</p>
        {subtitle && <p className="text-[10px] sm:text-[11px] font-semibold mt-0.5" style={{ color }}>{subtitle}</p>}
      </div>
    </motion.div>
  );
}
