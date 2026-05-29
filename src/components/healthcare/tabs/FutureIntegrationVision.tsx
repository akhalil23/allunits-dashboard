import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Stethoscope, Network, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function FutureIntegrationVision() {
  return (
    <div className="space-y-6">
      {/* Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Integration Roadmap</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Phase n={1} title="Healthcare SP Dashboard" status="active"
            bullets={['Executive prototype', 'Architecture validation', 'Role & access foundation']} />
          <Phase n={2} title="Cross-linked Executive Views" status="planned"
            bullets={['Deep-link from University Dashboard', 'Shared identity & roles', 'Consolidated reporting cycle']} />
          <Phase n={3} title="Integrated Strategic Dashboard" status="planned"
            bullets={['Single executive cockpit', 'Shared KPIs across LAU + Health', 'Unified governance reviews']} />
        </CardContent>
      </Card>

      {/* Architecture diagram */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Executive Architecture (target state)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
            <ArchNode icon={Building2} title="University SP Dashboard" sub="24 units · 5 pillars" tone="blue" />
            <div className="flex items-center justify-center text-muted-foreground">
              <ArrowRight className="w-5 h-5 hidden md:block" />
            </div>
            <ArchNode icon={Stethoscope} title="Healthcare SP Dashboard" sub="7 goals · 2 hospitals · outpatient network" tone="emerald" />
          </div>
          <div className="flex justify-center my-3 text-muted-foreground"><ArrowRight className="w-5 h-5 rotate-90" /></div>
          <ArchNode icon={Network} title="Integrated Executive Strategic Dashboard" sub="Shared KPIs · Cross-cutting risk · Unified executive reporting" tone="violet" wide />
        </CardContent>
      </Card>

      {/* Shared metrics */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Potential Shared Metrics</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            ['Strategic Progress', 'Composite across pillars and goals'],
            ['Execution Risk', 'Unified risk taxonomy across University & Health'],
            ['Budget Utilization', 'Commitment vs spending ratio'],
            ['Governance Effectiveness', 'RACI completeness & decision throughput'],
            ['Strategic Alignment', 'Cross-mapping between University pillars and Health goals'],
          ].map(([t, d]) => (
            <div key={t} className="flex items-start gap-2 rounded-md border border-border/50 bg-card/40 px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-foreground font-medium">{t}</div>
                <div className="text-xs text-muted-foreground">{d}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Phase({ n, title, status, bullets }: { n: number; title: string; status: 'active' | 'planned'; bullets: string[] }) {
  return (
    <div className={`rounded-lg p-4 border ${status === 'active' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/60 bg-card/40'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Phase {n}</span>
        <Badge variant="outline" className={status === 'active' ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/5' : ''}>
          {status === 'active' ? 'In progress' : 'Planned'}
        </Badge>
      </div>
      <div className="text-sm font-semibold text-foreground mb-2">{title}</div>
      <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
        {bullets.map(b => <li key={b}>{b}</li>)}
      </ul>
    </div>
  );
}

function ArchNode({ icon: Icon, title, sub, tone, wide }: { icon: React.ElementType; title: string; sub: string; tone: string; wide?: boolean }) {
  const map: Record<string, string> = {
    blue: 'border-blue-500/40 bg-blue-500/5 text-blue-300',
    emerald: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300',
    violet: 'border-violet-500/40 bg-violet-500/5 text-violet-300',
  };
  return (
    <div className={`rounded-lg border p-4 flex items-center gap-3 ${map[tone]} ${wide ? 'md:col-span-3' : ''}`}>
      <div className="w-10 h-10 rounded-md bg-background/40 border border-current/30 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-foreground font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
