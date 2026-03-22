/**
 * Dashboard Guide — Comprehensive Help Center for the Executive Command Center.
 * Updated to reflect: SSI, SEEI (as %), Focus Mode, Pillar Colors, Execution Gap, Tab roles.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ChevronDown, ChevronUp, Info, ArrowRight,
  LayoutDashboard, ShieldAlert, Target, DollarSign, GitCompare, Brain, Camera,
  HelpCircle, Lightbulb, FileDown, Moon, RefreshCw, Activity, Eye, TrendingDown,
} from 'lucide-react';

export default function DashboardGuide() {
  return (
    <div className="space-y-8">
      {/* Data Refresh Policy */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-amber-500/40 bg-amber-500/5 shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><RefreshCw className="w-4 h-4 text-amber-500" /><span className="text-xs sm:text-sm font-medium text-amber-500 uppercase tracking-wider">Data Refresh Policy</span></div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>Dashboard data is refreshed from the official online reporting sheets on a <span className="font-semibold text-foreground">monthly schedule</span>.</p>
            <p>Updates made to the source sheets will <span className="font-semibold text-foreground">not appear immediately</span>.</p>
            <p>Changes will be reflected only at the <span className="font-semibold text-foreground">beginning or end of each month</span>.</p>
          </div>
        </motion.div>
      </section>

      {/* Overview */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><BookOpen className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Dashboard Overview</span></div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>The <span className="font-semibold text-foreground">University Executive Command Center</span> monitors Strategic Plan IV (2025–2027) across 22 units and five pillars.</p>
            <p>The three main tabs form a coherent executive system:</p>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30">
              <p className="text-xs font-semibold text-foreground">Tab 1 — Executive Snapshot</p>
              <p className="text-[10px] text-muted-foreground mt-1">What is happening overall. Strategic synthesis and executive interpretation.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30">
              <p className="text-xs font-semibold text-foreground">Tab 2 — Strategic Risk & Priority</p>
              <p className="text-[10px] text-muted-foreground mt-1">Where the risks and execution concerns are concentrated.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30">
              <p className="text-xs font-semibold text-foreground">Tab 3 — Budget Intelligence</p>
              <p className="text-[10px] text-muted-foreground mt-1">How funding patterns influence progress, efficiency, and stability.</p>
            </div>
          </div>
          <div className="mt-5 p-4 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Data Flow</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <FlowNode label="22 Units" sublabel="Report progress" />
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <FlowNode label="5 Strategic Pillars" sublabel="Aggregate performance" />
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <FlowNode label="University Metrics" sublabel="Executive insight" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Pillar Color System */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><Eye className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Fixed Pillar Color System</span></div>
          <p className="text-xs text-muted-foreground mb-3">Each strategic pillar has a fixed identity color used consistently across all charts, markers, legends, and badges. Pillar colors represent identity, NOT performance. Risk is conveyed through separate semantic colors.</p>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'PI', color: '#1D4ED8', name: 'Deep Blue' },
              { label: 'PII', color: '#047857', name: 'Emerald' },
              { label: 'PIII', color: '#D97706', name: 'Amber' },
              { label: 'PIV', color: '#DC2626', name: 'Red' },
              { label: 'PV', color: '#7C3AED', name: 'Purple' },
            ].map(p => (
              <div key={p.label} className="text-center p-2.5 rounded-lg border border-border/40">
                <div className="w-6 h-6 rounded-full mx-auto" style={{ backgroundColor: p.color }} />
                <p className="text-[11px] font-bold text-foreground mt-1.5">{p.label}</p>
                <p className="text-[10px] text-muted-foreground">{p.name}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Key Metrics */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><Info className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Key Metrics Explained</span></div>
          <div className="space-y-4">
            <MetricExplainer title="SEEI (Strategic Execution Efficiency Index)" definition="Headline efficiency metric expressed as 0–100% (capped at 100). Measures execution output relative to financial deployment." calculation="SEEI = (Actual Progress % ÷ Budget Utilization %) × 100, capped at 100%." interpretation="High SEEI means progress exceeds or matches resource consumption. Low SEEI signals spending outpacing delivery." />
            <MetricExplainer title="SSI (Strategic Stability Index)" definition="Executive signal combining progress, budget alignment, and risk exposure into a single 0–100% score." calculation="SSI = 0.4 × Progress + 0.3 × (100 − |Progress − Budget Util.|) + 0.3 × (100 − RI%). If any input is unavailable, displays N/A." interpretation="85–100 = Highly Stable. 70–84 = Stable. 50–69 = Watch. Below 50 = Unstable." />
            <MetricExplainer title="Expected Progress" definition="Timeline-based benchmark representing how far execution should be at the current point in the reporting window. Same value used across all tabs." calculation="Based on elapsed time within the academic reporting window (Mid-Year: Jul–Dec, End-of-Year: Jul–Jun)." interpretation="Used as the horizontal reference line in Tab 1 and as the benchmark for Execution Gap in Tab 2." />
            <MetricExplainer title="Execution Gap" definition="Difference between actual progress and expected progress for each unit." calculation="Execution Gap = Actual Progress % − Expected Progress %. Negative values mean behind schedule." interpretation="Units with the largest negative gaps need the most urgent attention." />
            <MetricExplainer title="Risk Index (RI)" definition="Weighted score measuring structural risk (0–3, displayed as 0–100%)." calculation="RI = (0×NoRisk + 1×Emerging + 2×Critical + 3×Realized) ÷ Applicable Items." interpretation="Below 25% = Low. 26–50% = Moderate. 51–75% = High. Above 75% = Critical." />
            <MetricExplainer title="Completion %" definition="Weighted average completion. COT → 100%, CBT → 100%, In Progress → actual %, Not Started → 0%." calculation="Weighted average across all applicable items." interpretation="Higher = more items executed. Quality assessed via On-Track % and Risk Index." />
            <MetricExplainer title="Allocation / Committed / Available" definition="Budget metrics from the live Finance spreadsheet. Allocation = total planned. Committed = spent + unspent obligations. Available = allocation − committed." calculation="Read from specific subtotal cells per pillar." interpretation="Compare utilization levels across pillars to assess deployment patterns." />
            <MetricExplainer title="Budget Health" definition="Overall financial capacity: Healthy (≥30% available), Watch (≥15%), Critical (<15%)." calculation="Derived from Available ÷ Allocation ratio." interpretation="Critical health signals that most funds are committed with limited flexibility." />
            <MetricExplainer title="Alignment Status" definition="Per-pillar label describing the relationship between progress, budget, and risk." calculation="Derived from progress-budget gap and risk index level." interpretation="Labels include: Efficient, Budget-Constrained, Cost-Heavy, High-Risk Delivery, Intervention Required." />
          </div>
        </motion.div>
      </section>

      {/* How to Read Each Tab */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><LayoutDashboard className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">How to Read Each Tab</span></div>
          <div className="space-y-3">
            <TabGuide icon={LayoutDashboard} title="Tab 1 — Executive Snapshot" description="Start with the Pillar Reference to understand the fixed color system. Review SEEI (execution efficiency) and SSI (strategic stability) KPI cards. The 'Execution & Budget Alignment by Pillar' scatter chart is the main strategic visual — use Focus Mode to inspect execution progress or budget utilization independently. The Pillar Execution Diagnostics panel explains why each pillar is positioned where it is." />
            <TabGuide icon={ShieldAlert} title="Tab 2 — Strategic Risk & Priority" description="Risk Exposure by Pillar shows severity bands (Low/Moderate/High/Critical). Risk Signal Distribution reveals concentration alerts. The Execution Gap panel ranks units by how far behind expected progress they are. The heatmap provides unit-by-pillar risk detail. Critical Strategic Items lists actions needing immediate attention. Coverage Gaps highlights items not being addressed." />
            <TabGuide icon={DollarSign} title="Tab 3 — Budget Intelligence" description="Budget KPI cards show allocation, commitment, availability, and health. The Budget Effectiveness Overview provides decision-oriented financial insights. Composition by Pillar uses fixed pillar colors. Per-Pillar Analytics now includes progress, risk, and funding status alongside budget figures. The Deployment Effectiveness scatter is a financial diagnostic view. Financial Contribution to SSI explains how funding supports stability." />
            <TabGuide icon={Camera} title="Strategic Snapshot Tracker" description="Capture and compare performance snapshots across reporting cycles." />
            <TabGuide icon={GitCompare} title="Unit Comparison" description="Side-by-side comparison of multiple units across performance dimensions." />
            <TabGuide icon={Brain} title="AI Executive Insights" description="AI-generated strategic interpretation aligned to each tab's role." />
          </div>
        </motion.div>
      </section>

      {/* Focus Mode */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><Eye className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Focus Mode (Tab 1)</span></div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>The master alignment chart in Tab 1 supports <span className="font-semibold text-foreground">Focus Mode</span> — a segmented control that isolates individual metrics for detailed inspection.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                <p className="text-xs font-semibold text-foreground">Combined</p>
                <p className="text-[10px] text-muted-foreground mt-1">Full quadrant scatter showing both budget and progress.</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                <p className="text-xs font-semibold text-foreground">Execution</p>
                <p className="text-[10px] text-muted-foreground mt-1">Bar chart showing progress vs expected progress per pillar.</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                <p className="text-xs font-semibold text-foreground">Budget</p>
                <p className="text-[10px] text-muted-foreground mt-1">Bar chart showing budget utilization vs average per pillar.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Export */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><FileDown className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Export & Reporting</span></div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>Use the download icon in the header for <span className="font-semibold text-foreground">PDF</span> (A4 landscape, branded) or <span className="font-semibold text-foreground">CSV</span> (raw data) exports.</p>
          </div>
        </motion.div>
      </section>

      {/* Dark Mode */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><Moon className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Dark Mode</span></div>
          <p className="text-sm text-muted-foreground">Toggle using the sun/moon icon in the header. Preference is saved automatically.</p>
        </motion.div>
      </section>

      {/* FAQ */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><HelpCircle className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">FAQ</span></div>
          <div className="space-y-1">
            <FAQItem question="What is the difference between SEEI and SSI?" answer="SEEI measures execution efficiency relative to budget deployment. SSI is a broader stability index combining progress, budget alignment, and risk. They complement each other: SEEI answers 'Are we efficient?' while SSI answers 'Are we stable?'" />
            <FAQItem question="Why use Expected Progress as a benchmark?" answer="Expected Progress represents the proportional time elapsed in the reporting window. It provides a time-based anchor to evaluate whether execution is on schedule, independent of budget or risk." />
            <FAQItem question="What does Focus Mode do?" answer="Focus Mode in Tab 1 lets you inspect execution progress or budget utilization independently, without the combined view's complexity. It shows one dimension at a time with clear reference lines." />
            <FAQItem question="How are pillar colors assigned?" answer="Each pillar has a fixed color (PI=Blue, PII=Green, PIII=Amber, PIV=Red, PV=Purple). These never change regardless of performance values. Risk is conveyed through separate semantic colors." />
            <FAQItem question="What is the Execution Gap?" answer="Execution Gap = Actual Progress − Expected Progress. A negative gap means the unit is behind schedule. This metric appears in Tab 2 to identify which units need urgent attention." />
            <FAQItem question="How does SSI use budget data?" answer="SSI includes a 30% weight for alignment (how close progress and budget utilization are). High alignment gaps reduce SSI. Tab 3's Financial Contribution panel explains this relationship." />
          </div>
        </motion.div>
      </section>

      {/* Reading Tips */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><Lightbulb className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Reading Tips</span></div>
          <div className="space-y-4">
            <TipStep step={1} title="Start with Executive Snapshot" description="Check SEEI and SSI for overall health. Use the master alignment chart and Focus Mode to understand pillar positioning. Review Pillar Execution Diagnostics for root causes." />
            <TipStep step={2} title="Investigate in Strategic Risk" description="Check execution gaps to identify units behind schedule. Review the risk heatmap and critical strategic items." />
            <TipStep step={3} title="Analyze Budget Intelligence" description="Review budget effectiveness insights. Check per-pillar analytics for progress, risk, and funding status. Use the Financial Contribution panel to understand SSI drivers." />
            <TipStep step={4} title="Track and Compare" description="Use snapshots for longitudinal tracking and unit comparison for structural analysis." />
          </div>
        </motion.div>
      </section>
    </div>
  );
}

function FlowNode({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <div className="text-center px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function MetricExplainer({ title, definition, calculation, interpretation }: { title: string; definition: string; calculation: string; interpretation: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-3 space-y-2 text-xs text-muted-foreground">
              <p><span className="font-semibold text-foreground">Definition:</span> {definition}</p>
              <p><span className="font-semibold text-foreground">Calculation:</span> {calculation}</p>
              <p><span className="font-semibold text-foreground">Interpretation:</span> {interpretation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabGuide({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/30">
      <div className="p-1.5 rounded-lg bg-primary/10 mt-0.5"><Icon className="w-3.5 h-3.5 text-primary" /></div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/30 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-3 text-left hover:bg-muted/20 px-2 rounded-lg transition-colors">
        <span className="text-sm font-semibold text-foreground">{question}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="text-xs text-muted-foreground px-2 pb-3 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TipStep({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-xs font-bold text-primary">{step}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
