/**
 * Dashboard Guide — Comprehensive Help Center for the Executive Command Center.
 * Updated: Removed SEEI. Reflects Commitment/Spending Ratios, Dynamic RI, Descriptive Alignment.
 */

import { useState } from 'react';
import { UNIT_IDS } from '@/lib/unit-config';
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
            <p>Dashboard data is read directly from the official online reporting sheets whenever the dashboard loads or refetches.</p>
            <p>Updates made to the source sheets should appear on the next live refresh — not on a monthly batch schedule.</p>
            <p>If the source is temporarily rate-limited or unavailable, the dashboard may briefly show a clearly marked cached snapshot as a fallback.</p>
          </div>
        </motion.div>
      </section>

      {/* Overview */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><BookOpen className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Dashboard Overview</span></div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>The <span className="font-semibold text-foreground">University Executive Command Center</span> monitors Strategic Plan IV (2025–2027) across {UNIT_IDS.length} units and five pillars.</p>
            <p>The three main tabs form a coherent executive system:</p>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30">
              <p className="text-xs font-semibold text-foreground">Tab 1 — Executive Snapshot</p>
              <p className="text-[10px] text-muted-foreground mt-1">Overall strategic synthesis with SSI, descriptive alignment insights, commitment/spending ratios, and pillar diagnostics.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30">
              <p className="text-xs font-semibold text-foreground">Tab 2 — Strategic Risk & Priority</p>
              <p className="text-[10px] text-muted-foreground mt-1">Where the risks and execution concerns are concentrated. Unit rankings and coverage gaps.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30">
              <p className="text-xs font-semibold text-foreground">Tab 3 — Budget Intelligence</p>
              <p className="text-[10px] text-muted-foreground mt-1">Financial governance with commitment/spending ratios, per-pillar analytics, and budget health.</p>
            </div>
          </div>
          <div className="mt-5 p-4 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Data Flow</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <FlowNode label={`${UNIT_IDS.length} Units`} sublabel="Report progress" />
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
              { label: 'PI', color: '#3B82F6', name: 'Blue' },
              { label: 'PII', color: '#06B6D4', name: 'Cyan' },
              { label: 'PIII', color: '#8B5CF6', name: 'Violet' },
              { label: 'PIV', color: '#EC4899', name: 'Pink' },
              { label: 'PV', color: '#6366F1', name: 'Indigo' },
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
            <MetricExplainer title="SSI (Strategic Stability Index)" definition="Executive signal combining progress, budget alignment, and risk exposure into a single 0–100% score." calculation="SSI = 0.4 × Progress + 0.3 × (100 − |Progress − Commitment Ratio|) + 0.3 × (100 − RI%). If any input is unavailable, displays N/A." interpretation="85–100 = Highly Stable. 70–84 = Stable. 50–69 = Watch. Below 50 = Unstable." />
            <MetricExplainer title="Commitment Ratio" definition="Proportion of planned budget that has been formally committed. Commitment reflects planning and engagement of budget." calculation="Commitment Ratio = Committed (Spent + Unspent) ÷ Allocated." interpretation="No Commitment Yet (0–10%), Light (10–30%), Mild (30–60%), Healthy (60–80%), Strong (≥80%)." />
            <MetricExplainer title="Spending Ratio" definition="Proportion of allocated budget that has been actually disbursed. Spending reflects actual execution." calculation="Spending Ratio = Spent ÷ Allocated." interpretation="No Spending Yet (0%), Light (0–20%), Mild (20–50%), Healthy (50–75%), Strong (≥75%). Both ratios should be interpreted together but are intentionally not combined." />
            <MetricExplainer title="Expected Progress" definition="Timeline-based benchmark representing how far execution should be at the current point in the academic year window (Sep–Aug)." calculation="Based on elapsed time within the academic reporting window." interpretation="Used as the reference for Execution Gap across all tabs." />
            <MetricExplainer title="Execution Gap" definition="Difference between actual progress and expected progress." calculation="Execution Gap = Actual Progress % − Expected Progress %. Negative values mean behind schedule." interpretation="The primary alignment signal. Only this value is color-highlighted in alignment cards." />
            <MetricExplainer title="Risk Index (RI)" definition="Weighted score measuring structural risk (0–3, displayed as 0–100%). In-Progress items use dynamic risk based on execution gap." calculation="RI = (0×NoRisk + 1×Emerging + 2×Critical + 3×Realized) ÷ Applicable Items. In-Progress: Gap >50%→Critical, 20–50%→Emerging, <20%→No Risk." interpretation="Below 25% = Low. 26–50% = Moderate. 51–75% = High. Above 75% = Critical." />
            <MetricExplainer title="Completion %" definition="Weighted average completion. COT → 100%, CBT → 100%, In Progress → actual %, Not Started → 0% (forced)." calculation="Weighted average across all applicable items." interpretation="Higher = more items executed. Quality assessed via On-Track % and Risk Index." />
            <MetricExplainer title="Budget Health" definition="Financial capacity based on Commitment Ratio." calculation="No Commitment Yet (0–10%), Light (10–30%), Mild (30–60%), Healthy (60–80%), Strong (≥80%)." interpretation="Strong Commitment signals most funds are formally engaged. Spending Health follows a parallel scale based on actual disbursement." />
            <MetricExplainer title="Alignment Insights" definition="Per-pillar descriptive interpretation of execution-budget relationship." calculation="Derived from Progress %, Commitment Ratio, Spending Ratio, and Expected Progress." interpretation="Each pillar receives a neutral diagnostic sentence (e.g., 'High execution with low spending') plus optional contextual badges." />
          </div>
        </motion.div>
      </section>

      {/* How to Read Each Tab */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><LayoutDashboard className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">How to Read Each Tab</span></div>
          <div className="space-y-3">
            <TabGuide icon={LayoutDashboard} title="Tab 1 — Executive Snapshot" description="Start with the Pillar Reference to understand the fixed color system. Review SSI (strategic stability) and Progress KPI cards. Commitment Ratio and Spending Ratio replace the single Budget Utilization metric. The Execution & Budget Alignment chart supports Focus Mode (Execution or Budget views). Alignment Insights provide per-pillar diagnostic sentences with execution gap as the primary signal. Pillar Execution Diagnostics explain why each pillar is positioned where it is." />
            <TabGuide icon={ShieldAlert} title="Tab 2 — Strategic Risk & Priority" description="Risk Exposure by Pillar shows severity bands (Low/Moderate/High/Critical). Risk Signal Distribution reveals concentration alerts. Ranking lists show ALL units even when filtering by pillar (units without data appear last). The Execution Gap panel ranks units by how far behind expected progress they are. The heatmap provides unit-by-pillar risk detail. Critical Strategic Items lists actions needing immediate attention. Coverage Gaps now uses strict row-based matching, exact selected year/term/view columns, and excludes blanks or missing statuses from NA denominators." />
            <TabGuide icon={DollarSign} title="Tab 3 — Budget Intelligence" description="Budget KPI cards show allocation, commitment, available, and dual Commitment/Spending ratio bars. Budget Health uses Commitment Ratio bands (Under-Deployed, Active, Advanced, Constrained). Per-Pillar Analytics includes progress, risk, execution gap, and funding status alongside budget figures. Tooltips explain each metric in context." />
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
            <p>The alignment chart in Tab 1 supports <span className="font-semibold text-foreground">Focus Mode</span> — a toggle that isolates individual metrics for detailed inspection.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                <p className="text-xs font-semibold text-foreground">Execution</p>
                <p className="text-[10px] text-muted-foreground mt-1">Bar chart showing progress vs expected progress per pillar.</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                <p className="text-xs font-semibold text-foreground">Budget</p>
                <p className="text-[10px] text-muted-foreground mt-1">Bar chart showing commitment and spending ratios per pillar.</p>
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
            <FAQItem question="Why are there two budget ratios instead of one?" answer="The Commitment Ratio (Committed ÷ Allocated) reflects total financial obligation, while the Spending Ratio (Spent ÷ Allocated) shows actual disbursement. Together they reveal whether budget commitment translates to actual spending, and help identify contractual obligations not yet paid." />
            <FAQItem question="Why use Expected Progress as a benchmark?" answer="Expected Progress represents the proportional time elapsed in the academic year window (Sep–Aug). It provides a time-based anchor to evaluate whether execution is on schedule, independent of budget or risk." />
            <FAQItem question="How is alignment communicated?" answer="Alignment is expressed through descriptive analytics — each pillar receives a neutral diagnostic sentence derived from Progress, Commitment Ratio, Spending Ratio, and Expected Progress. Only the Execution Gap value is color-highlighted. Optional contextual badges (e.g., 'Ahead of schedule', 'Resource constrained') provide additional context." />
            <FAQItem question="How are pillar colors assigned?" answer="Each pillar has a fixed color (PI=Blue, PII=Cyan, PIII=Violet, PIV=Pink, PV=Indigo). These never change regardless of performance values. Risk is conveyed through separate semantic colors." />
            <FAQItem question="What is the Execution Gap?" answer="Execution Gap = Actual Progress − Expected Progress. A negative gap means the unit is behind schedule. This metric appears across all tabs to identify where attention is needed." />
            <FAQItem question="How does dynamic RI work for In-Progress items?" answer="Instead of a fixed risk mapping, In-Progress items are assigned risk dynamically: if the gap between expected and actual progress exceeds 50%, it's Critical Risk; between 20-50% it's Emerging Risk; below 20% it's No Risk." />
          </div>
        </motion.div>
      </section>

      {/* Reading Tips */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><Lightbulb className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Reading Tips</span></div>
          <div className="space-y-4">
            <TipStep step={1} title="Start with Executive Snapshot" description="Check SSI for overall stability. Review Progress vs Expected and the Commitment/Spending Ratios. Use the alignment chart Focus Mode to inspect execution or budget independently. Read Alignment Insights for per-pillar diagnostics." />
            <TipStep step={2} title="Investigate in Strategic Risk" description="Check execution gaps to identify units behind schedule. Review the risk heatmap and critical strategic items. Note that ranking lists show ALL units even when filtering by pillar." />
            <TipStep step={3} title="Analyze Budget Intelligence" description="Review commitment and spending ratios. Check per-pillar analytics for progress, risk, execution gap, and funding status. Budget Health reflects commitment-based deployment levels." />
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
