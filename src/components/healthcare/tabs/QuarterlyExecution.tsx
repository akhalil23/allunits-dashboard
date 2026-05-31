import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { HEALTHCARE_GOALS } from '@/lib/healthcare/sample-data';
import { allSteps, effectiveStatus, STATUS4_COLOR } from '@/lib/healthcare/helpers';
import { Search } from 'lucide-react';

const QUARTERS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027'];

const QSTYLE: Record<string, string> = {
  'Done': 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  'In Progress': 'bg-blue-500/20 text-blue-200 border-blue-500/40',
  'Not Started': 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40',
  'Blocked': 'bg-red-500/20 text-red-200 border-red-500/40',
  'On Target': 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40',
  'Below Target': 'bg-amber-500/15 text-amber-200 border-amber-500/40',
  'N/A': 'bg-zinc-700/20 text-zinc-400 border-zinc-700/40',
};

export default function QuarterlyExecution() {
  const [q, setQ] = useState('');
  const rows = useMemo(() => allSteps(), []);
  const filtered = rows.filter(r =>
    !q || r.step.title.toLowerCase().includes(q.toLowerCase()) || r.step.code.includes(q) ||
    r.goal.title.toLowerCase().includes(q.toLowerCase())
  );

  // Aggregate per quarter (count by 4-state)
  type HeatRow = { period: string; Done: number; 'In Progress': number; 'Not Started': number; Blocked: number };
  const heat: HeatRow[] = QUARTERS.map(period => {
    const row: HeatRow = { period, Done: 0, 'In Progress': 0, 'Not Started': 0, Blocked: 0 };
    for (const { step } of rows) {
      const q = step.quarterly.find(x => x.period === period);
      const raw = q?.status ?? 'Not Started';
      const key: keyof Omit<HeatRow, 'period'> =
        raw === 'Done' ? 'Done'
        : raw === 'Blocked' ? 'Blocked'
        : raw === 'Not Started' || raw === 'N/A' ? 'Not Started'
        : 'In Progress';
      row[key]++;
    }
    return row;
  });

  return (
    <div className="space-y-5">
      {/* Quarter heat-map */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Quarterly status mix (all steps)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {heat.map(h => {
              const total = h.Done + h['In Progress'] + h['Not Started'] + h.Blocked;
              const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;
              return (
                <div key={h.period} className="rounded-lg border border-border/60 bg-card/40 p-3">
                  <div className="text-[11px] font-mono text-muted-foreground mb-2">{h.period}</div>
                  <div className="flex h-2 rounded overflow-hidden mb-2 bg-zinc-700/30">
                    <div className="bg-emerald-500" style={{ width: `${pct(h.Done)}%` }} />
                    <div className="bg-blue-500" style={{ width: `${pct(h['In Progress'])}%` }} />
                    <div className="bg-red-500" style={{ width: `${pct(h.Blocked)}%` }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <div>✓ {h.Done} done</div>
                    <div>● {h['In Progress']} active</div>
                    <div>⛔ {h.Blocked} blocked</div>
                    <div>○ {h['Not Started']} not started</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step × Quarter matrix */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Step-level execution timeline</CardTitle>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter…" className="pl-8 h-8 text-xs" />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-card/60 border-b border-border/40">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[40%]">Step</th>
                <th className="text-left px-2 py-2 font-medium text-muted-foreground">Current</th>
                {QUARTERS.map(q => (
                  <th key={q} className="text-left px-2 py-2 font-medium text-muted-foreground whitespace-nowrap">{q}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 80).map(({ step, goal }) => (
                <tr key={step.code} className="border-b border-border/30 hover:bg-card/40">
                  <td className="px-3 py-2">
                    <div className="font-mono text-emerald-400/80 text-[10px]">G{goal.code} · {step.code}</div>
                    <div className="text-foreground truncate max-w-[360px]" title={step.title}>{step.title}</div>
                  </td>
                  <td className="px-2 py-2">
                    <Badge variant="outline" className={`text-[10px] ${QSTYLE[effectiveStatus(step)]}`}>{effectiveStatus(step)}</Badge>
                  </td>
                  {QUARTERS.map(period => {
                    const qd = step.quarterly.find(x => x.period === period);
                    const st = qd?.status ?? 'Not Started';
                    return (
                      <td key={period} className="px-2 py-2" title={qd?.note ?? ''}>
                        <span className={`inline-block w-3 h-3 rounded-sm ${STATUS4_COLOR[
                          st === 'Done' ? 'Done' : st === 'Blocked' ? 'Blocked'
                          : (st === 'Not Started' || st === 'N/A') ? 'Not Started' : 'In Progress'
                        ]}`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 80 && (
            <div className="text-[11px] text-muted-foreground text-center py-2">Showing 80 of {filtered.length}. Use filter to narrow.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
