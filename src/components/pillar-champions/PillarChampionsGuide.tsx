/**
 * Dashboard Guide — Comprehensive Help Center for the Pillar Champions Dashboard.
 * Mirrors the structure and visual style of the Executive Command Center guide,
 * adapted for pillar-based pages.
 */

import { useState } from 'react';
import { UNIT_IDS } from '@/lib/unit-config';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ChevronDown, ChevronUp, Info, ArrowRight,
  LayoutDashboard, ShieldAlert, DollarSign, Brain, Search,
  HelpCircle, Lightbulb, FileDown, Moon, RefreshCw, Eye, TrendingDown,
  Activity, BarChart3,
} from 'lucide-react';

export default function PillarChampionsGuide() {
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
            <p>The <span className="font-semibold text-foreground">Pillar Champions Command Center</span> provides a unified operational view of Strategic Plan IV (2025–2027) organized by the five strategic pillars across all {UNIT_IDS.length} units.</p>
            <p>The five main tabs form a coherent pillar-based analysis system:</p>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30">
              <p className="text-xs font-semibold text-foreground">Tab 1 — Pillar Overview</p>
              <p className="text-[10px] text-muted-foreground mt-1">Cross-pillar snapshot with SSI, progress, risk, and execution metrics aggregated across all selected units.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30">
              <p className="text-xs font-semibold text-foreground">Tab 2 — Performance Analysis</p>
              <p className="text-[10px] text-muted-foreground mt-1">Deep-dive into unit-by-unit execution within each pillar, with progress breakdowns and comparison charts.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30">
              <p className="text-xs font-semibold text-foreground">Tab 3 — Action Explorer</p>
              <p className="text-[10px] text-muted-foreground mt-1">Detailed Goal → Objective → Action → Step tracking across units with status filtering and drill-down.</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30">
              <p className="text-xs font-semibold text-foreground">Tab 4 — Budget Intelligence</p>
              <p className="text-[10px] text-muted-foreground mt-1">Financial governance with commitment/spending ratios, per-unit budget comparison, and pillar-level allocation analysis.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30">
              <p className="text-xs font-semibold text-foreground">Tab 5 — Risk & Attention</p>
              <p className="text-[10px] text-muted-foreground mt-1">Automated risk signals, critical items requiring attention, and cross-unit risk concentration analysis.</p>
            </div>
          </div>
          <div className="mt-5 p-4 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Data Flow</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <FlowNode label={`${UNIT_IDS.length} Units`} sublabel="Report progress" />
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <FlowNode label="5 Strategic Pillars" sublabel="Cross-unit aggregation" />
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <FlowNode label="Pillar Insights" sublabel="Champion-level analysis" />
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
            <MetricExplainer title="SSI (Strategic Stability Index)" definition="Executive signal combining progress, budget alignment, and risk exposure into a single 0–100% score." calculation="SSI = 0.4 × Progress + 0.3 × (100 − |Progress − Commitment Ratio|) + 0.3 × (100 − RI%). If any input is unavailable, displays N/A." interpretation="85–100 = Highly Stable. 70–84 = Stable. 50–69 = Watch. Below 50 = Unstable." />
            <MetricExplainer title="Commitment Ratio" definition="Proportion of planned budget that has been formally committed. Commitment reflects planning and engagement of budget." calculation="Commitment Ratio = Committed (Spent + Unspent) ÷ Allocated." interpretation="No Commitment Yet (0–10%), Light (10–30%), Mild (30–60%), Healthy (60–80%), Strong (≥80%)." />
            <MetricExplainer title="Spending Ratio" definition="Proportion of allocated budget that has been actually disbursed. Spending reflects actual execution." calculation="Spending Ratio = Spent ÷ Allocated." interpretation="No Spending Yet (0%), Light (0–20%), Mild (20–50%), Healthy (50–75%), Strong (≥75%). Both ratios should be interpreted together but are intentionally not combined." />
            <MetricExplainer title="Expected Progress" definition="Timeline-based benchmark representing how far execution should be at the current point in the academic year window (Sep–Aug)." calculation="Based on elapsed time within the academic reporting window." interpretation="Used as the reference for Execution Gap across all tabs." />
            <MetricExplainer title="Execution Gap" definition="Difference between actual progress and expected progress." calculation="Execution Gap = Actual Progress % − Expected Progress %. Negative values mean behind schedule." interpretation="The primary alignment signal. Only this value is color-highlighted in alignment cards." />
            <MetricExplainer title="Risk Index (RI)" definition="Weighted score measuring structural risk (0–3, displayed as 0–100%). In-Progress items use dynamic risk based on execution gap." calculation="RI = (0×NoRisk + 1×Emerging + 2×Critical + 3×Realized) ÷ Applicable Items. In-Progress: Gap >50%→Critical, 20–50%→Emerging, <20%→No Risk." interpretation="Below 25% = Low. 26–50% = Moderate. 51–75% = High. Above 75% = Critical." />
            <MetricExplainer title="Completion %" definition="Weighted average completion. COT → 100%, CBT → 100%, In Progress → actual %, Not Started → 0% (forced)." calculation="Weighted average across all applicable items." interpretation="Higher = more items executed. Quality assessed via On-Track % and Risk Index." />
            <MetricExplainer title="Budget Health" definition="Financial capacity based on Commitment Ratio." calculation="No Commitment Yet (0–10%), Light (10–30%), Mild (30–60%), Healthy (60–80%), Strong (≥80%)." interpretation="Strong Commitment signals most funds are formally engaged. Spending Health follows a parallel scale based on actual disbursement." />
          </div>
        </motion.div>
      </section>

      {/* How to Read Each Tab */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><LayoutDashboard className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">How to Read Each Tab</span></div>
          <div className="space-y-3">
            <TabGuide icon={LayoutDashboard} title="Tab 1 — Pillar Overview" description="Start with the KPI summary cards showing SSI, Progress, Completion, On-Track %, and Risk Index across all pillars or a selected pillar. The Pillar Health Grid provides a visual snapshot of each pillar's status. Use the pillar filter to drill into a specific pillar for focused metrics." />
            <TabGuide icon={BarChart3} title="Tab 2 — Performance Analysis" description="Examine unit-by-unit execution within each pillar. Progress bars, completion rates, and execution gap rankings help identify which units are leading or lagging for a given pillar. Switch between pillars to compare performance patterns." />
            <TabGuide icon={Search} title="Tab 3 — Action Explorer" description="Track the full Goal → Objective → Action → Step hierarchy across all units. Filter by pillar, status, or unit to locate specific items. Expand actions to see detailed step-level progress. This is the primary operational tracking tool for monthly reviews." />
            <TabGuide icon={DollarSign} title="Tab 4 — Budget Intelligence" description="Review financial allocation, commitment, and spending at the pillar level. Cross-unit budget comparisons reveal which units have committed or spent their pillar-specific budgets. Commitment and Spending Ratios are shown side-by-side for each unit." />
            <TabGuide icon={ShieldAlert} title="Tab 5 — Risk & Attention" description="Automated risk signals flag items that need immediate attention based on execution gaps, overdue timelines, and budget anomalies. Critical items are surfaced with severity levels. The risk concentration view shows where structural risks are clustering across units and pillars." />
            <TabGuide icon={BookOpen} title="Dashboard Guide" description="This reference page — explains metrics, tab functions, and reading strategies for the Pillar Champions Dashboard." />
          </div>
        </motion.div>
      </section>

      {/* Pillar Filtering */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><Eye className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Pillar & Unit Filtering</span></div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>The filter bar allows you to <span className="font-semibold text-foreground">isolate a single pillar</span> or view all five simultaneously. Selecting a pillar scopes all tabs to show only data relevant to that pillar.</p>
            <p>The <span className="font-semibold text-foreground">unit filter</span> lets you narrow analysis to specific units. When "All" is active, all {UNIT_IDS.length} units contribute to aggregations. Click individual unit pills to isolate or combine specific units.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                <p className="text-xs font-semibold text-foreground">Pillar Filter</p>
                <p className="text-[10px] text-muted-foreground mt-1">All Pillars view aggregates across PI–PV. Single pillar view shows focused diagnostics.</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                <p className="text-xs font-semibold text-foreground">Unit Filter</p>
                <p className="text-[10px] text-muted-foreground mt-1">Toggle individual units on/off for scoped analysis. Useful for comparing peer units within a pillar.</p>
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
            <FAQItem question="What is the difference between the Executive and Pillar Champions dashboards?" answer="The Executive Command Center provides a university-wide synthesis for senior leadership. The Pillar Champions Dashboard provides an operational, pillar-focused view designed for pillar champions and chairs who need to drill into cross-unit performance within their assigned pillar." />
            <FAQItem question="How does the Action Explorer work?" answer="The Action Explorer displays the full strategic hierarchy: Goal → Objective → Action → Step. You can filter by pillar, unit, and status. Expanding an action reveals its constituent steps with individual progress and status indicators. This is the primary tool for monthly operational reviews." />
            <FAQItem question="Why are there two budget ratios instead of one?" answer="The Commitment Ratio (Committed ÷ Allocated) reflects total financial obligation, while the Spending Ratio (Spent ÷ Allocated) shows actual disbursement. Together they reveal whether budget commitment translates to actual spending, and help identify contractual obligations not yet paid." />
            <FAQItem question="How does the pillar filter affect data?" answer="When a specific pillar is selected, all tabs (Overview, Performance, Actions, Budget, Risk) show only data related to that pillar. The 'All Pillars' view aggregates across all five pillars. The unit filter works independently — you can view a single pillar across all units or a single pillar for selected units." />
            <FAQItem question="How are risk signals generated?" answer="Risk signals are automatically generated based on execution gaps (actual vs expected progress), overdue timeline markers, budget anomalies (e.g., high commitment but zero spending), and items with critical or realized risk status. They surface items requiring immediate champion attention." />
            <FAQItem question="How does dynamic RI work for In-Progress items?" answer="Instead of a fixed risk mapping, In-Progress items are assigned risk dynamically: if the gap between expected and actual progress exceeds 50%, it's Critical Risk; between 20-50% it's Emerging Risk; below 20% it's No Risk." />
          </div>
        </motion.div>
      </section>

      {/* Reading Tips */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><Lightbulb className="w-4 h-4 text-primary" /><span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Reading Tips</span></div>
          <div className="space-y-4">
            <TipStep step={1} title="Start with Pillar Overview" description="Check SSI and progress KPIs for a quick health assessment. Review the Pillar Health Grid to spot which pillars need attention. Use the pillar filter to focus on your assigned pillar." />
            <TipStep step={2} title="Drill into Performance Analysis" description="Identify which units are leading or lagging within your pillar. Compare execution gaps across units to find outliers that need support or recognition." />
            <TipStep step={3} title="Review Actions in Detail" description="Use the Action Explorer for monthly operational tracking. Filter by your pillar and expand actions to verify step-level progress. Flag items with stalled or not-started status for follow-up." />
            <TipStep step={4} title="Check Budget & Risk" description="Review commitment and spending ratios in Budget Intelligence. Cross-reference with Risk & Attention to see if under-funded areas coincide with high-risk items. Prioritize items flagged with critical risk signals." />
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
