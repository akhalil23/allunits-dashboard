/**
 * "How Metrics Work" — Premium informational modal
 * Explains Progress, Risk, Completion, and mapping logic.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BookOpen, CheckCircle2, AlertTriangle, ShieldAlert, Target,
  ArrowRight, Info, BarChart3,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Section = 'progress' | 'risk' | 'mapping' | 'completion';

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'progress', label: 'Progress Qualifiers', icon: BarChart3 },
  { id: 'risk', label: 'Risk Qualifiers', icon: ShieldAlert },
  { id: 'mapping', label: 'Mapping Logic', icon: ArrowRight },
  { id: 'completion', label: 'Completion %', icon: Target },
];

export default function MetricsExplainer({ open, onClose }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('progress');

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-3xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold text-foreground">How Metrics Work</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Understanding Progress, Risk, and Completion in the Strategic Plan</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="flex border-b border-border px-4 overflow-x-auto">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
                    activeSection === s.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
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

/* ─── Progress Qualifiers ─────────────────────────────── */

function ProgressSection() {
  const qualifiers = [
    {
      label: 'Not Started',
      desc: 'The action has not yet begun and no measurable progress has been recorded.',
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.08)',
      border: 'rgba(239,68,68,0.25)',
      icon: AlertTriangle,
    },
    {
      label: 'In Progress (%)',
      desc: 'Work is underway. The percentage reflects the estimated completion level.',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.08)',
      border: 'rgba(245,158,11,0.25)',
      icon: BarChart3,
    },
    {
      label: 'Completed on Target',
      desc: 'The action has been completed and the expected target or deliverable has been achieved.',
      color: '#16A34A',
      bg: 'rgba(22,163,74,0.08)',
      border: 'rgba(22,163,74,0.25)',
      icon: CheckCircle2,
    },
    {
      label: 'Completed below Target',
      desc: 'The action has been completed but the expected target or performance level was not achieved.',
      color: '#7F1D1D',
      bg: 'rgba(127,29,29,0.08)',
      border: 'rgba(127,29,29,0.25)',
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Work Progress Classification</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Each strategic action is classified by its current execution status. These qualifiers determine how progress is measured and reported.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {qualifiers.map(q => (
          <motion.div
            key={q.label}
            className="rounded-xl p-4 border"
            style={{ backgroundColor: q.bg, borderColor: q.border }}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${q.color}20` }}>
                <q.icon className="w-3.5 h-3.5" style={{ color: q.color }} />
              </div>
              <span className="text-sm font-bold" style={{ color: q.color }}>{q.label}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{q.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Risk Qualifiers ─────────────────────────────────── */

function RiskSection() {
  const risks = [
    {
      label: 'No Risk',
      desc: 'Implementation is progressing as expected and targets are met.',
      color: '#16A34A',
      weight: 0,
    },
    {
      label: 'Emergent Risk',
      desc: 'Minor issues or delays may affect the achievement of targets.',
      color: '#F59E0B',
      weight: 1,
    },
    {
      label: 'Critical Risk',
      desc: 'Significant issues threaten the achievement of targets.',
      color: '#EF4444',
      weight: 2,
    },
    {
      label: 'Realized Risk',
      desc: 'The expected target has not been achieved.',
      color: '#7F1D1D',
      weight: 3,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Strategic Risk Classification</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Risk is derived from the progress status of each action, not from completion percentage alone. Progress status determines the structural risk level.
      </p>
      <div className="space-y-2.5">
        {risks.map(r => (
          <motion.div
            key={r.label}
            className="flex items-center gap-4 rounded-xl border border-border/60 p-4 bg-card"
            whileHover={{ x: 4 }}
          >
            <div className="flex items-center gap-2.5 min-w-[140px]">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
              <span className="text-sm font-bold text-foreground">{r.label}</span>
            </div>
            <p className="text-xs text-muted-foreground flex-1">{r.desc}</p>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-muted text-foreground shrink-0">
              Weight: {r.weight}
            </span>
          </motion.div>
        ))}
      </div>

      {/* RI Formula */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">Risk Index Formula</span>
        </div>
        <p className="text-xs text-muted-foreground font-mono leading-relaxed">
          RI = (0×No Risk + 1×Emergent + 2×Critical + 3×Realized) / Applicable Items
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          The result (0–3) is normalized to a 0–100% scale for display.
        </p>
      </div>
    </div>
  );
}

/* ─── Mapping Logic ───────────────────────────────────── */

function MappingSection() {
  const mappings = [
    { progress: 'Completed on Target', risk: 'No Risk', ri: 0, riPct: '0%', progressColor: '#16A34A', riskColor: '#16A34A' },
    { progress: 'In Progress', risk: 'Emergent Risk', ri: 1, riPct: '33%', progressColor: '#F59E0B', riskColor: '#F59E0B' },
    { progress: 'Not Started', risk: 'Critical Risk', ri: 2, riPct: '67%', progressColor: '#EF4444', riskColor: '#EF4444' },
    { progress: 'Completed below Target', risk: 'Realized Risk', ri: 3, riPct: '100%', progressColor: '#7F1D1D', riskColor: '#7F1D1D' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ArrowRight className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Progress → Risk → Risk Index</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Risk classification is always derived from the Progress Status, not from Completion % alone. Completion % is informational, while Progress Status determines the risk level.
      </p>

      {/* Visual mapping flow */}
      <div className="space-y-2">
        {mappings.map(m => (
          <motion.div
            key={m.progress}
            className="flex items-center gap-2 sm:gap-3 rounded-xl border border-border/60 bg-card p-3"
            whileHover={{ x: 4 }}
          >
            {/* Progress badge */}
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 text-white"
              style={{ backgroundColor: m.progressColor }}
            >
              {m.progress}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {/* Risk badge */}
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 text-white"
              style={{ backgroundColor: m.riskColor }}
            >
              {m.risk}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {/* RI value */}
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-muted text-foreground shrink-0">
              RI {m.riPct}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Important note */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mt-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Important</span>
            <p className="text-xs text-muted-foreground mt-1">
              Risk classification must always be derived from the Progress Status, not from Completion % alone.
              Completion % is informational, while Progress Status determines the risk level.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Completion % ────────────────────────────────────── */

function CompletionSection() {
  const completionRules = [
    { status: 'Not Started', completion: '0%', color: '#EF4444' },
    { status: 'In Progress', completion: '1–99%', color: '#F59E0B' },
    { status: 'Completed on Target', completion: '100%', color: '#16A34A' },
    { status: 'Completed below Target', completion: '0%', color: '#7F1D1D' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Understanding Completion %</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Completion % reflects the level of achievement of the planned target associated with each action.
      </p>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Progress Status</th>
              <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Completion %</th>
            </tr>
          </thead>
          <tbody>
            {completionRules.map(r => (
              <tr key={r.status} className="border-t border-border/30">
                <td className="py-3 px-4">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                    <span className="font-medium text-foreground">{r.status}</span>
                  </span>
                </td>
                <td className="text-center py-3 px-4 font-bold text-foreground">{r.completion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Clarification */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-primary">Clarification</span>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Completion % reflects target achievement rather than implementation effort.
              Actions completed below target are recorded as 0% because the expected outcome was not achieved.
            </p>
          </div>
        </div>
      </div>

      {/* Smart Tooltips reference */}
      <div className="rounded-xl border border-border/60 bg-card p-4 mt-2">
        <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground" />
          Smart Tooltip Reference
        </h4>
        <div className="space-y-2.5">
          {[
            { metric: 'Completion %', tip: 'Percentage of applicable strategic actions that have a completed status (on target or below target).' },
            { metric: 'Progress Status', tip: 'Current execution state of a strategic action: Not Started, In Progress, Completed on Target, or Completed below Target.' },
            { metric: 'Risk Index', tip: 'Weighted average of risk signals (0–100%). Lower values indicate lower structural risk.' },
            { metric: 'Risk Level', tip: 'Categorical risk band: Low (0–25%), Moderate (26–50%), High (51–75%), Severe (76–100%).' },
          ].map(t => (
            <div key={t.metric} className="flex items-start gap-3 py-2 px-3 rounded-lg bg-muted/20">
              <span className="text-xs font-bold text-foreground min-w-[100px] shrink-0">{t.metric}</span>
              <span className="text-xs text-muted-foreground">{t.tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { MetricsExplainer };
