/**
 * "How Metrics Work" — Premium informational modal
 * Updated: SSI, SEEI as %, Focus Mode, Pillar Colors, Execution Gap, Alignment Status.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BookOpen, CheckCircle2, AlertTriangle, ShieldAlert, Target,
  ArrowRight, Info, BarChart3, Gauge, Activity, Eye,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Section = 'progress' | 'risk' | 'mapping' | 'completion' | 'efficiency' | 'stability';

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'risk', label: 'Risk', icon: ShieldAlert },
  { id: 'mapping', label: 'Mapping', icon: ArrowRight },
  { id: 'completion', label: 'Completion', icon: Target },
  { id: 'efficiency', label: 'Efficiency', icon: Gauge },
  { id: 'stability', label: 'Stability & Alignment', icon: Activity },
];

export default function MetricsExplainer({ open, onClose }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('progress');
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="relative w-full max-w-3xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col" initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ duration: 0.25 }}>
            <div className="relative px-6 py-5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10"><BookOpen className="w-5 h-5 text-primary" /></div>
                <div>
                  <h2 className="text-lg font-display font-bold text-foreground">How Metrics Work</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Progress, Risk, Completion, Efficiency, and Stability</p>
                </div>
              </div>
              <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted/50 transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="flex border-b border-border px-4 overflow-x-auto">
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)} className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${activeSection === s.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  <s.icon className="w-3.5 h-3.5" />{s.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  {activeSection === 'progress' && <ProgressSection />}
                  {activeSection === 'risk' && <RiskSection />}
                  {activeSection === 'mapping' && <MappingSection />}
                  {activeSection === 'completion' && <CompletionSection />}
                  {activeSection === 'efficiency' && <EfficiencySection />}
                  {activeSection === 'stability' && <StabilitySection />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProgressSection() {
  const qualifiers = [
    { label: 'Not Started', desc: 'No measurable progress recorded.', color: '#EF4444', icon: AlertTriangle },
    { label: 'In Progress (%)', desc: 'Work is underway. Percentage reflects estimated completion.', color: '#F59E0B', icon: BarChart3 },
    { label: 'Completed on Target', desc: 'Completed and target achieved.', color: '#16A34A', icon: CheckCircle2 },
    { label: 'Completed below Target', desc: 'Completed but target not achieved.', color: '#7F1D1D', icon: ShieldAlert },
  ];
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Work Progress Classification</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {qualifiers.map(q => (
          <div key={q.label} className="rounded-xl p-4 border" style={{ backgroundColor: `${q.color}08`, borderColor: `${q.color}25` }}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${q.color}20` }}><q.icon className="w-3.5 h-3.5" style={{ color: q.color }} /></div>
              <span className="text-sm font-bold" style={{ color: q.color }}>{q.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{q.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskSection() {
  const risks = [
    { label: 'No Risk', desc: 'On track, targets met.', color: '#16A34A', weight: 0 },
    { label: 'Emergent Risk', desc: 'Minor issues or delays.', color: '#F59E0B', weight: 1 },
    { label: 'Critical Risk', desc: 'Significant issues threaten targets.', color: '#EF4444', weight: 2 },
    { label: 'Realized Risk', desc: 'Target not achieved.', color: '#7F1D1D', weight: 3 },
  ];
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-primary" />Strategic Risk Classification</h3>
      <p className="text-xs text-muted-foreground">Risk is derived from progress status, not completion % alone.</p>
      <div className="space-y-2.5">
        {risks.map(r => (
          <div key={r.label} className="flex items-center gap-4 rounded-xl border border-border/60 p-4 bg-card">
            <div className="flex items-center gap-2.5 min-w-[140px]">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
              <span className="text-sm font-bold text-foreground">{r.label}</span>
            </div>
            <p className="text-xs text-muted-foreground flex-1">{r.desc}</p>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-muted text-foreground shrink-0">Weight: {r.weight}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><Info className="w-3.5 h-3.5" />RI Formula</p>
        <p className="text-xs text-muted-foreground font-mono mt-1">RI = (0×No Risk + 1×Emergent + 2×Critical + 3×Realized) / Applicable Items</p>
      </div>
    </div>
  );
}

function MappingSection() {
  const mappings = [
    { progress: 'Completed on Target', risk: 'No Risk', ri: '0%', pc: '#16A34A', rc: '#16A34A' },
    { progress: 'In Progress', risk: 'Emergent Risk', ri: '33%', pc: '#F59E0B', rc: '#F59E0B' },
    { progress: 'Not Started', risk: 'Critical Risk', ri: '67%', pc: '#EF4444', rc: '#EF4444' },
    { progress: 'Completed below Target', risk: 'Realized Risk', ri: '100%', pc: '#7F1D1D', rc: '#7F1D1D' },
  ];
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><ArrowRight className="w-4 h-4 text-primary" />Progress → Risk → Risk Index</h3>
      <div className="space-y-2">
        {mappings.map(m => (
          <div key={m.progress} className="flex items-center gap-2 sm:gap-3 rounded-xl border border-border/60 bg-card p-3">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 text-white" style={{ backgroundColor: m.pc }}>{m.progress}</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 text-white" style={{ backgroundColor: m.rc }}>{m.risk}</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-muted text-foreground shrink-0">RI {m.ri}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompletionSection() {
  const rules = [
    { status: 'Not Started', completion: '0%', color: '#EF4444' },
    { status: 'In Progress', completion: '1–99%', color: '#F59E0B' },
    { status: 'Completed on Target', completion: '100%', color: '#16A34A' },
    { status: 'Completed below Target', completion: '100%', color: '#7F1D1D' },
  ];
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Understanding Completion %</h3>
      <p className="text-xs text-muted-foreground">Both completed states count as 100% — the action was executed. Quality is assessed separately.</p>
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="bg-muted/30"><th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th><th className="text-center py-3 px-4 font-semibold text-muted-foreground">Completion %</th></tr></thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.status} className="border-t border-border/30">
                <td className="py-3 px-4"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} /><span className="font-medium text-foreground">{r.status}</span></span></td>
                <td className="text-center py-3 px-4 font-bold text-foreground">{r.completion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EfficiencySection() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Gauge className="w-4 h-4 text-primary" />Efficiency & Execution Metrics</h3>

      <MetricCard label="SEEI (Strategic Execution Efficiency Index)" formula="SEEI = (Actual Progress % ÷ Budget Utilization %) × 100, capped at 100%" desc="Expressed as 0–100%. Measures execution output relative to financial deployment." color="#059669" bands={[
        { range: '≥ 120%', label: 'Highly Efficient', color: '#065F46' },
        { range: '90–119%', label: 'Balanced', color: '#16A34A' },
        { range: '60–89%', label: 'Concern', color: '#D97706' },
        { range: '< 60%', label: 'Critical', color: '#DC2626' },
      ]} />

      <MetricCard label="Actual Progress % (In-Progress Items)" formula="Average completion % of all in-progress items" desc="Completed items excluded — they no longer reflect ongoing delivery performance." color="#2563EB" bands={[]} />

      <MetricCard label="Expected Progress" formula="Proportional time elapsed within the reporting window" desc="Same timeline-based benchmark used across all tabs. Mid-Year: Jul–Dec. End-of-Year: Jul–Jun." color="#6B7280" bands={[]} />

      <MetricCard label="Progress Ratio" formula="Actual Progress % ÷ Expected Progress %" desc="> 1.0 = ahead, < 1.0 = behind schedule." color="#D97706" bands={[]} />

      <MetricCard label="IPS (Intervention Priority Score)" formula="IPS = (1 − Progress Ratio) × Budget Utilization %" desc="Identifies pillars where delay coincides with high spending." color="#DC2626" bands={[
        { range: '> 25', label: '🔴 Critical', color: '#DC2626' },
        { range: '> 15', label: '🟠 High', color: '#F97316' },
        { range: '> 5', label: '🟡 Monitor', color: '#D97706' },
        { range: '≤ 5', label: '🟢 Stable', color: '#16A34A' },
      ]} />

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs text-muted-foreground"><span className="font-semibold text-primary">Note:</span> Completed items are excluded from execution pace analysis because they no longer reflect ongoing delivery performance.</p>
      </div>
    </div>
  );
}

function StabilitySection() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Strategic Stability & Alignment</h3>

      <MetricCard label="SSI (Strategic Stability Index)" formula="SSI = 0.4 × Progress + 0.3 × (100 − |Progress − Budget Util.|) + 0.3 × (100 − RI%)" desc="One executive signal combining progress, budget alignment, and risk. Range 0–100%. Higher = more stable." color="#059669" bands={[
        { range: '85–100%', label: 'Highly Stable', color: '#065F46' },
        { range: '70–84%', label: 'Stable', color: '#16A34A' },
        { range: '50–69%', label: 'Watch', color: '#D97706' },
        { range: '< 50%', label: 'Unstable', color: '#DC2626' },
      ]} />

      <MetricCard label="Execution Gap" formula="Actual Progress % − Expected Progress %" desc="Negative values indicate units behind schedule. Ranked by largest negative gap first in Tab 2." color="#DC2626" bands={[]} />

      <MetricCard label="Alignment Status" formula="Derived from progress-budget gap and risk level" desc="Per-pillar label describing the relationship between progress, budget, and risk." color="#3B82F6" bands={[
        { range: 'Gap > +20', label: 'Efficient', color: '#065F46' },
        { range: 'Gap +10 to +20', label: 'Efficient but Monitor', color: '#16A34A' },
        { range: 'Gap −10 to +10', label: 'Balanced', color: '#3B82F6' },
        { range: 'Gap −10 to −20', label: 'Budget-Constrained', color: '#D97706' },
        { range: 'Gap < −20', label: 'Cost-Heavy', color: '#F97316' },
        { range: 'RI ≥ 50%', label: 'High-Risk / Intervention', color: '#DC2626' },
      ]} />

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2"><Eye className="w-3.5 h-3.5 text-primary" />Focus Mode (Tab 1)</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">The master alignment chart supports Focus Mode: Combined (full scatter), Execution (progress vs expected), and Budget (utilization vs average). Each view isolates one dimension for detailed inspection without noise from the other.</p>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h4 className="text-xs font-semibold text-foreground mb-2">Pillar Color System</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">Fixed colors: PI=Deep Blue, PII=Emerald, PIII=Amber, PIV=Red, PV=Purple. Colors represent pillar identity, NOT performance. Risk uses separate semantic colors.</p>
      </div>
    </div>
  );
}

function MetricCard({ label, formula, desc, color, bands }: {
  label: string; formula: string; desc: string; color: string;
  bands: { range: string; label: string; color: string }[];
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm font-bold text-foreground">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-2">{desc}</p>
      <div className="px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
        <p className="text-xs font-mono font-semibold text-foreground">{formula}</p>
      </div>
      {bands.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {bands.map(b => (
            <div key={b.range} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: `${b.color}10` }}>
              <span className="text-[11px] font-bold" style={{ color: b.color }}>{b.label}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{b.range}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { MetricsExplainer };
