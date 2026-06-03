import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HEALTHCARE_GOALS } from '@/lib/healthcare/sample-data';
import { allSteps, effectiveStatus, STATUS4_COLOR, CURRENT_QUARTER } from '@/lib/healthcare/helpers';
import { ChevronDown, CalendarClock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const QUARTERS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027'];

const norm = (raw?: string) => {
  if (!raw) return 'Not Started';
  if (raw === 'Done') return 'Done';
  if (raw === 'Blocked') return 'Blocked';
  if (raw === 'Not Started' || raw === 'N/A') return 'Not Started';
  return 'In Progress';
};

export default function QuarterlyExecution() {
  const rows = useMemo(() => allSteps(), []);

  // 1. Activity Heatmap (goal x quarter)
  const heat = useMemo(() => {
    return HEALTHCARE_GOALS.map(g => {
      const cells = QUARTERS.map(period => {
        let updates = 0;
        for (const a of g.actions) for (const s of a.steps) {
          const q = s.quarterly.find(x => x.period === period);
          if (q && (q.note || (q.status && q.status !== 'N/A'))) updates++;
        }
        return { period, updates };
      });
      const total = cells.reduce((sum, c) => sum + c.updates, 0);
      return { goal: g, cells, total };
    });
  }, []);
  const maxCell = Math.max(1, ...heat.flatMap(h => h.cells.map(c => c.updates)));

  // 2. Updates by quarter (real)
  const updatesByQuarter = QUARTERS.map(period => {
    let n = 0;
    for (const { step } of rows) {
      const q = step.quarterly.find(x => x.period === period);
      if (q && (q.note || (q.status && q.status !== 'N/A'))) n++;
    }
    return { period, updates: n };
  });

  return (
    <div className="space-y-5">
      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-emerald-300" />
            Reporting activity — Goals × Quarters
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left px-2 py-2 font-medium text-muted-foreground">Goal</th>
                {QUARTERS.map(q => <th key={q} className="text-center px-2 py-2 font-medium text-muted-foreground whitespace-nowrap">{q}</th>)}
                <th className="text-right px-2 py-2 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {heat.map(({ goal, cells, total }) => (
                <tr key={goal.code} className="border-t border-border/30">
                  <td className="px-2 py-2 max-w-[260px]">
                    <span className="font-mono text-emerald-400/80 mr-1">G{goal.code}</span>
                    <span className="text-foreground">{goal.title}</span>
                  </td>
                  {cells.map(c => {
                    const intensity = c.updates / maxCell;
                    return (
                      <td key={c.period} className="px-2 py-2 text-center">
                        <div
                          className="inline-flex items-center justify-center w-9 h-7 rounded text-[10px] font-medium tabular-nums"
                          style={{
                            backgroundColor: c.updates ? `hsl(160 84% ${55 - intensity * 25}% / ${0.15 + intensity * 0.65})` : 'hsl(var(--card))',
                            color: c.updates > maxCell * 0.5 ? 'white' : 'hsl(var(--muted-foreground))',
                            border: '1px solid hsl(var(--border) / 0.4)',
                          }}
                          title={`${c.updates} updates`}
                        >
                          {c.updates || '·'}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-right text-foreground tabular-nums">{total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Updates by quarter */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Updates recorded by quarter</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={updatesByQuarter} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }} />
                  <Bar dataKey="updates" fill="hsl(160 84% 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground/80 pt-2 border-t border-border/40">
              Real reporting cadence — count of action steps with a note or status entered for each quarter.
            </p>
          </CardContent>
        </Card>

        {/* Status evolution strip per goal */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Status evolution by goal</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {HEALTHCARE_GOALS.map(g => {
              const counts = QUARTERS.map(period => {
                const buckets: Record<string, number> = { 'Done': 0, 'In Progress': 0, 'Blocked': 0, 'Not Started': 0 };
                for (const a of g.actions) for (const s of a.steps) {
                  const q = s.quarterly.find(x => x.period === period);
                  buckets[norm(q?.status)]++;
                }
                const total = Object.values(buckets).reduce((a, b) => a + b, 0);
                return { period, buckets, total };
              });
              return (
                <div key={g.code}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-foreground"><span className="font-mono text-emerald-400/80 mr-1">G{g.code}</span>{g.title}</span>
                  </div>
                  <div className="flex gap-1">
                    {counts.map(c => (
                      <div key={c.period} className="flex-1" title={`${c.period}: ${c.buckets['Done']} done · ${c.buckets['In Progress']} active · ${c.buckets['Blocked']} blocked`}>
                        <div className="h-2 flex rounded overflow-hidden bg-zinc-700/30">
                          <div className="bg-emerald-500" style={{ width: `${c.total ? (c.buckets['Done'] / c.total) * 100 : 0}%` }} />
                          <div className="bg-blue-500" style={{ width: `${c.total ? (c.buckets['In Progress'] / c.total) * 100 : 0}%` }} />
                          <div className="bg-red-500" style={{ width: `${c.total ? (c.buckets['Blocked'] / c.total) * 100 : 0}%` }} />
                        </div>
                        <div className="text-[9px] text-muted-foreground text-center mt-0.5 tabular-nums">{c.period.split(' ')[0]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-2 border-t border-border/40">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Done</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> In Progress</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Blocked</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500" /> Not Started</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest quarter narratives */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-emerald-300" />
            {CURRENT_QUARTER} — Action-step narratives
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {HEALTHCARE_GOALS.map(g => <GoalNarrativeBlock key={g.code} goal={g} />)}
        </CardContent>
      </Card>
    </div>
  );
}

function GoalNarrativeBlock({ goal }: { goal: typeof HEALTHCARE_GOALS[number] }) {
  const [open, setOpen] = useState(goal.code === 1);
  const steps = goal.actions.flatMap(a => a.steps);
  const missing = steps.filter(s => {
    const q = s.quarterly.find(x => x.period === CURRENT_QUARTER);
    return !q || (!q.note && (!q.status || q.status === 'N/A'));
  }).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-border/60 rounded-lg bg-card/40">
      <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 hover:bg-card/60 transition-colors">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <span className="font-mono text-emerald-400/80">G{goal.code}</span>
          <span>{goal.title}</span>
          {missing > 0 && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-200 bg-amber-500/5 text-[10px] gap-1">
              <AlertTriangle className="w-2.5 h-2.5" /> {missing} missing update{missing > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 pt-1 space-y-2">
        {steps.map(s => {
          const q = s.quarterly.find(x => x.period === CURRENT_QUARTER);
          const status = norm(q?.status);
          const note = q?.note;
          const hasUpdate = !!(q && (q.note || (q.status && q.status !== 'N/A')));
          return (
            <div key={s.code} className="border-t border-border/30 pt-2 first:border-0 first:pt-0">
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${STATUS4_COLOR[effectiveStatus(s)]}`} />
                <span className="font-mono text-emerald-400/70 text-[10px]">{s.code}</span>
                <span className="text-foreground flex-1 truncate">{s.title}</span>
                {!hasUpdate && (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-200 bg-amber-500/5 text-[9px]">
                    no update
                  </Badge>
                )}
              </div>
              {note && <p className="text-[11px] text-muted-foreground mt-1 pl-4 italic">"{note}"</p>}
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
