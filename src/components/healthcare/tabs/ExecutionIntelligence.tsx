import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HEALTHCARE_GOALS, allSteps } from '@/lib/healthcare/sample-data';
import { AlertTriangle, Clock, Flag, Users, XCircle, Activity } from 'lucide-react';

export default function ExecutionIntelligence() {
  const items = allSteps();
  const delayed = items.filter(i => i.step.quarterly[0]?.status === 'Below Target');
  const atRisk = items.filter(i => i.step.risk === 'Critical' || i.step.risk === 'Realized');
  const highPriority = items.filter(i => i.step.priority === 1);
  const govGaps = items.filter(i =>
    !i.step.responsible || !i.step.accountable || !i.step.consulted || !i.step.informed
  );
  const decisionsNeeded = items.filter(i => i.step.risk === 'Critical' && i.step.quarterly[0]?.status !== 'Done');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryStat icon={Clock} label="Delayed" value={delayed.length} accent="amber" />
        <SummaryStat icon={AlertTriangle} label="At Risk" value={atRisk.length} accent="red" />
        <SummaryStat icon={Flag} label="High Priority" value={highPriority.length} accent="emerald" />
        <SummaryStat icon={Users} label="Governance Gaps" value={govGaps.length} accent="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ListPanel title="Delayed Initiatives" icon={Clock} items={delayed} tone="amber" />
        <ListPanel title="At-Risk Initiatives" icon={AlertTriangle} items={atRisk} tone="red" />
        <ListPanel title="High-Priority Initiatives" icon={Flag} items={highPriority.slice(0, 8)} tone="emerald" />
        <ListPanel title="Leadership Decisions Required" icon={Activity} items={decisionsNeeded.slice(0, 8)} tone="red" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><XCircle className="w-4 h-4 text-amber-400" />Execution Bottlenecks (illustrative)</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• <span className="text-foreground">Digital Core (G4.1)</span> is the largest dependency chain — delays cascade into AI pilots, patient portal and clinical-trials office.</p>
          <p>• <span className="text-foreground">Outpatient master plan (G6.1)</span> requires capital approval before downstream operating-model standardization can begin.</p>
          <p>• <span className="text-foreground">Quality &amp; safety training (G3.1.1)</span> is overdue and risks JCI-readiness timeline.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent: string }) {
  const map: Record<string, string> = {
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    red: 'text-red-300 bg-red-500/10 border-red-500/30',
    blue: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
  };
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${map[accent]}`}><Icon className="w-4 h-4" /></div>
      <div>
        <div className="text-xl font-semibold text-foreground tabular-nums">{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </CardContent></Card>
  );
}

function ListPanel({ title, icon: Icon, items, tone }: { title: string; icon: React.ElementType; items: ReturnType<typeof allSteps>; tone: string }) {
  const toneMap: Record<string, string> = {
    emerald: 'text-emerald-300', amber: 'text-amber-300', red: 'text-red-300', blue: 'text-blue-300',
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Icon className={`w-4 h-4 ${toneMap[tone]}`} />{title} <Badge variant="outline" className="ml-auto">{items.length}</Badge></CardTitle></CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-y-auto">
        {items.length === 0
          ? <p className="text-xs text-muted-foreground italic">None detected.</p>
          : items.map(i => (
            <div key={`${i.goal.code}-${i.step.code}`} className="text-xs border-b border-border/40 pb-1.5">
              <div className="text-foreground font-medium">{i.step.code} · {i.step.title}</div>
              <div className="text-muted-foreground">G{i.goal.code} · {i.action.title}</div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
