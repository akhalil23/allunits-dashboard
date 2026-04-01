/**
 * "How Metrics Work" for Unit Dashboards
 * Only includes: Progress, Risk, Mapping, Completion
 * Excludes: Alignment & Budget, Stability (SSI) — not used in unit dashboards
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BookOpen, CheckCircle2, AlertTriangle, ShieldAlert, Target,
  ArrowRight, Info, BarChart3,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Section = 'progress' | 'risk' | 'mapping' | 'completion';

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'risk', label: 'Risk', icon: ShieldAlert },
  { id: 'mapping', label: 'Mapping', icon: ArrowRight },
  { id: 'completion', label: 'Completion', icon: Target },
];

export default function UnitMetricsExplainer({ open, onClose }: Props) {
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
                  <p className="text-xs text-muted-foreground mt-0.5">Progress, Risk, Completion & Status Mapping</p>
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
    { label: 'Not Started', desc: 'No measurable progress recorded. Progress forced to 0%.', color: '#EF4444', icon: AlertTriangle },
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
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs text-muted-foreground"><span className="font-semibold text-primary">Progress % Calculation:</span> Includes In Progress, Completed – On Target, and Completed – Below Target items. Not Started items are forced to 0%.</p>
        <p className="text-xs text-muted-foreground mt-1"><span className="font-semibold text-primary">Completion % Calculation:</span> Uses ONLY completed items (Completed – On Target and Completed – Below Target). Other statuses are excluded.</p>
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
      <p className="text-xs text-muted-foreground">Risk is derived from progress status. In-Progress items use dynamic risk based on execution gap.</p>
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
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
        <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><Info className="w-3.5 h-3.5" />RI Formula</p>
        <p className="text-xs text-muted-foreground font-mono">RI = (0×No Risk + 1×Emergent + 2×Critical + 3×Realized) / Applicable Items</p>
        <p className="text-xs font-semibold text-primary mt-2">Dynamic RI for In-Progress Items</p>
        <p className="text-xs text-muted-foreground">For In-Progress items, risk is assigned dynamically based on progress gap:</p>
        <div className="ml-2 space-y-1 text-xs text-muted-foreground">
          <p>• Gap &gt; 50% → Critical Risk (weight 2)</p>
          <p>• Gap 20–50% → Emerging Risk (weight 1)</p>
          <p>• Gap &lt; 20% → No Risk (weight 0)</p>
        </div>
        <p className="text-xs text-muted-foreground">Where Gap = Expected Progress % − Actual Progress %</p>
      </div>
    </div>
  );
}

function MappingSection() {
  const mappings = [
    { progress: 'Completed on Target', risk: 'No Risk', ri: '0%', pc: '#16A34A', rc: '#16A34A' },
    { progress: 'In Progress', risk: 'Dynamic (see Risk tab)', ri: 'Varies', pc: '#F59E0B', rc: '#F59E0B' },
    { progress: 'Not Started', risk: 'Critical Risk', ri: '67%', pc: '#EF4444', rc: '#EF4444' },
    { progress: 'Completed below Target', risk: 'Realized Risk', ri: '100%', pc: '#7F1D1D', rc: '#7F1D1D' },
  ];
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><ArrowRight className="w-4 h-4 text-primary" />Progress → Risk → Risk Index</h3>
      <p className="text-xs text-muted-foreground">In-Progress items use dynamic risk assignment based on execution gap rather than a fixed mapping.</p>
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
    { status: 'Not Started', completion: '0% (forced)', color: '#EF4444' },
    { status: 'In Progress', completion: '1–99%', color: '#F59E0B' },
    { status: 'Completed on Target', completion: '100%', color: '#16A34A' },
    { status: 'Completed below Target', completion: '100%', color: '#7F1D1D' },
  ];
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Understanding Completion %</h3>
      <p className="text-xs text-muted-foreground">Both completed states count as 100% — the action was executed. Quality is assessed separately. Not Started items are forced to 0% regardless of entered values.</p>
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
