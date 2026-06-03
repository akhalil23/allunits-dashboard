import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { blockedItems, RISK_COLOR, riskSignals, riskIndex, riskBand } from '@/lib/healthcare/helpers';
import type { HCBlockerType } from '@/lib/healthcare/types';
import { AlertOctagon, User, Calendar, DollarSign, ShieldAlert } from 'lucide-react';

const TYPE_COLOR: Record<HCBlockerType, string> = {
  'No Budget':            'border-amber-500/40 text-amber-200 bg-amber-500/10',
  'Pending Decision':     'border-blue-500/40 text-blue-200 bg-blue-500/10',
  'External Dependency':  'border-purple-500/40 text-purple-200 bg-purple-500/10',
  'Capacity':             'border-cyan-500/40 text-cyan-200 bg-cyan-500/10',
  'Awaiting Approval':    'border-indigo-500/40 text-indigo-200 bg-indigo-500/10',
  'May Be Dropped':       'border-red-500/40 text-red-200 bg-red-500/10',
  'Other':                'border-zinc-500/40 text-zinc-200 bg-zinc-500/10',
};

const TYPES: HCBlockerType[] = [
  'No Budget', 'Pending Decision', 'External Dependency',
  'Capacity', 'Awaiting Approval', 'May Be Dropped', 'Other',
];

export default function DecisionBlockersBoard() {
  const items = useMemo(() => blockedItems(), []);
  const [filter, setFilter] = useState<HCBlockerType | 'All'>('All');
  const [owner, setOwner] = useState<string>('All');

  const owners = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) if (i.step.blocker?.decisionOwner) set.add(i.step.blocker.decisionOwner);
    return ['All', ...Array.from(set).sort()];
  }, [items]);

  const filtered = items
    .filter(i => filter === 'All' || i.step.blocker?.type === filter)
    .filter(i => owner === 'All' || i.step.blocker?.decisionOwner === owner);

  const byType = TYPES.map(t => ({ type: t, n: items.filter(i => i.step.blocker?.type === t).length }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Active blockers</div>
          <div className="text-2xl font-semibold text-foreground">{items.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">No budget</div>
          <div className="text-2xl font-semibold text-amber-300">{byType.find(b => b.type === 'No Budget')?.n}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pending decision</div>
          <div className="text-2xl font-semibold text-blue-300">{byType.find(b => b.type === 'Pending Decision')?.n}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">May be dropped</div>
          <div className="text-2xl font-semibold text-red-300">{byType.find(b => b.type === 'May Be Dropped')?.n}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm flex items-center gap-2"><AlertOctagon className="w-4 h-4 text-red-400" />Blockers requiring resolution</CardTitle>
            <div className="ml-auto flex flex-wrap gap-1">
              <Button size="sm" variant={filter === 'All' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setFilter('All')}>All ({items.length})</Button>
              {TYPES.map(t => {
                const n = byType.find(b => b.type === t)?.n || 0;
                if (!n) return null;
                return (
                  <Button key={t} size="sm" variant={filter === t ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setFilter(t)}>{t} ({n})</Button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Decision owner:</span>
            {owners.map(o => (
              <Button key={o} size="sm" variant={owner === o ? 'default' : 'outline'} className="h-6 text-[11px] px-2" onClick={() => setOwner(o)}>
                {o}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.map(({ step, goal, action }) => {
            const totalBudget = step.budget.reduce((s, y) => s + (y.amount || 0), 0);
            const ri = riskIndex(step);
            const sig = riskSignals(step);
            const firedLabels = [
              sig.blocked && 'Blocked',
              sig.missingUpdate && 'Missing update',
              sig.fundingGap && 'Funding gap',
              sig.governanceGap && 'Governance gap',
            ].filter(Boolean) as string[];
            return (
              <div key={step.code} className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <Badge variant="outline" className={`text-[10px] ${TYPE_COLOR[step.blocker!.type]}`}>{step.blocker!.type}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${RISK_COLOR[step.riskFlag]}`}>{step.riskFlag} flag</Badge>
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-200 bg-amber-500/5 gap-1">
                        <ShieldAlert className="w-2.5 h-2.5" /> RI {ri.score} · {riskBand(ri.score)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">Priority {step.priority}</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      <span className="font-mono text-emerald-400/80 mr-2">{step.code}</span>{step.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      G{goal.code} · {action.title}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-foreground/90 italic border-l-2 border-red-500/40 pl-3">"{step.blocker!.reason}"</p>
                {firedLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {firedLabels.map(l => (
                      <Badge key={l} variant="outline" className="text-[10px] border-amber-500/30 text-amber-200/90 bg-amber-500/5">
                        {l}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                  <div className="flex items-center gap-1.5"><User className="w-3 h-3" />Decision owner: <span className="text-foreground">{step.blocker!.decisionOwner ?? '—'}</span></div>
                  <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />Raised: {step.blocker!.raisedQuarter}</div>
                  <div className="flex items-center gap-1.5"><DollarSign className="w-3 h-3" />Budget at stake: <span className="text-foreground">${(totalBudget / 1000).toFixed(0)}K</span></div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No items in this category.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
