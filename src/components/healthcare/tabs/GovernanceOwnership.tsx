import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HEALTHCARE_GOALS, allSteps } from '@/lib/healthcare/sample-data';
import { Users, ShieldCheck, AlertTriangle, UserCheck } from 'lucide-react';

export default function GovernanceOwnership() {
  const items = allSteps();
  const championCounts: Record<string, number> = {};
  const respCounts: Record<string, number> = {};
  const accCounts: Record<string, number> = {};
  items.forEach(({ goal, step }) => {
    championCounts[goal.champion] = (championCounts[goal.champion] || 0) + 1;
    if (step.responsible) respCounts[step.responsible] = (respCounts[step.responsible] || 0) + 1;
    if (step.accountable) accCounts[step.accountable] = (accCounts[step.accountable] || 0) + 1;
  });
  const missing = items.filter(i => !i.step.responsible || !i.step.accountable || !i.step.consulted || !i.step.informed);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GovStat icon={Users} label="Champions" value={Object.keys(championCounts).length} />
        <GovStat icon={UserCheck} label="Responsible parties" value={Object.keys(respCounts).length} />
        <GovStat icon={ShieldCheck} label="Accountable parties" value={Object.keys(accCounts).length} />
        <GovStat icon={AlertTriangle} label="Items missing RACI" value={missing.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader><CardTitle className="text-sm">Strategic Champions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {HEALTHCARE_GOALS.map(g => (
              <div key={g.code} className="flex items-start gap-2 text-xs border-b border-border/40 pb-2">
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/5 shrink-0">G{g.code}</Badge>
                <div className="min-w-0">
                  <div className="text-foreground">{g.champion}</div>
                  <div className="text-muted-foreground truncate">{g.title}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Responsible Distribution</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-96 overflow-y-auto">
            {Object.entries(respCounts).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
              <div key={r} className="flex items-center justify-between text-xs border-b border-border/30 py-1">
                <span className="text-foreground truncate pr-2">{r}</span>
                <Badge variant="outline" className="shrink-0">{n}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Accountable Distribution</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-96 overflow-y-auto">
            {Object.entries(accCounts).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
              <div key={r} className="flex items-center justify-between text-xs border-b border-border/30 py-1">
                <span className="text-foreground truncate pr-2">{r}</span>
                <Badge variant="outline" className="shrink-0">{n}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" />Governance Risks</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• <span className="text-foreground">Concentration risk:</span> EVP Health office appears as accountable on a high share of items — consider redistributing decision rights.</p>
          <p>• <span className="text-foreground">RACI completeness:</span> {missing.length} steps are missing at least one R/A/C/I role assignment.</p>
          <p>• <span className="text-foreground">Champion bandwidth:</span> several champions own multiple goals across schools and hospitals — formalize delegated leads.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function GovStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300"><Icon className="w-4 h-4" /></div>
      <div>
        <div className="text-xl font-semibold text-foreground tabular-nums">{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </CardContent></Card>
  );
}
