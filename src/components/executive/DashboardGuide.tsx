/**
 * Dashboard Guide — Comprehensive Help Center for the Executive Command Center.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ChevronDown, ChevronUp, Info, ArrowRight,
  LayoutDashboard, ShieldAlert, Target, DollarSign, GitCompare, Brain, Camera,
  HelpCircle, Lightbulb,
} from 'lucide-react';

export default function DashboardGuide() {
  return (
    <div className="space-y-8">
      {/* Section A: Dashboard Overview */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dashboard Overview</span>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              The <span className="font-semibold text-foreground">University Executive Command Center</span> is the central strategic monitoring tool for
              the Lebanese American University's <span className="font-semibold text-foreground">Strategic Plan IV (2025–2027)</span>.
            </p>
            <p>
              It provides the President, Board members, and senior leadership with a real-time, data-driven view of
              strategic performance across all 21 reporting units and five strategic pillars.
            </p>
          </div>

          {/* Visual Flow */}
          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Data Flow</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <FlowNode label="21 Units" sublabel="Report progress" />
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <FlowNode label="5 Strategic Pillars" sublabel="Aggregate performance" />
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <FlowNode label="University Metrics" sublabel="Executive insight" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section B: Key Metrics Explained */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Key Metrics Explained</span>
          </div>
          <div className="space-y-4">
            <MetricExplainer
              title="Risk Index (RI)"
              definition="A weighted score measuring the structural risk exposure of strategic initiatives."
              calculation="RI = (0×NoRisk + 1×Emerging + 2×Critical + 3×Realized) ÷ Applicable Items. Scale: 0 (no risk) to 3 (maximum risk)."
              interpretation="RI below 0.75 = healthy. 0.76–1.50 = moderate risk. 1.51–2.25 = elevated risk. Above 2.25 = critical."
            />
            <MetricExplainer
              title="Completion %"
              definition="The percentage of applicable strategic items that have reached completion status (on target or below target)."
              calculation="(Completed On Target + Completed Below Target) ÷ Applicable Items × 100"
              interpretation="Higher completion indicates more items have been executed. Check quality via On-Track vs Below Target split."
            />
            <MetricExplainer
              title="On-Track %"
              definition="The percentage of applicable items completed on target."
              calculation="Completed On Target ÷ Applicable Items × 100"
              interpretation="Measures quality of execution. High On-Track % means most completed items met their targets."
            />
            <MetricExplainer
              title="Below Target %"
              definition="The percentage of applicable items completed but falling short of target expectations."
              calculation="Completed Below Target ÷ Applicable Items × 100"
              interpretation="High Below Target % signals execution gaps even when completion looks strong."
            />
            <MetricExplainer
              title="Budget Utilization"
              definition="The percentage of total allocated budget (committed + available) that has been committed to active initiatives."
              calculation="Committed Budget ÷ (Committed + Available) × 100"
              interpretation="High utilization (>80%) with elevated risk may indicate financial pressure. Low utilization may indicate underdeployment."
            />
            <MetricExplainer
              title="Budget Allocation"
              definition="The total planned budget assigned to a pillar or unit for the strategic plan period."
              calculation="Sum of year-1 and year-2 allocations."
              interpretation="Allocation reflects strategic investment priority. Compare with utilization to assess deployment efficiency."
            />
          </div>
        </motion.div>
      </section>

      {/* Section C: How to Read Each Tab */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <LayoutDashboard className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">How to Read Each Tab</span>
          </div>
          <div className="space-y-3">
            <TabGuide icon={LayoutDashboard} title="Executive Snapshot" description="High-level overview of strategic performance across pillars. Start here for a quick situational understanding of completion, risk, and budget." />
            <TabGuide icon={ShieldAlert} title="Strategic Risk & Priority" description="Identifies initiatives with elevated risk signals. Use the heatmap to see which units and pillars need attention. Review strategic exceptions for critical items." />
            <TabGuide icon={DollarSign} title="Budget Intelligence" description="Displays financial allocation and utilization across pillars. Identifies budget pressure zones where high utilization meets high risk." />
            <TabGuide icon={Camera} title="Strategic Snapshot Tracker" description="Capture and compare performance snapshots across reporting cycles. Track trajectory of strategic execution over time with trend charts." />
            <TabGuide icon={GitCompare} title="Unit Comparison" description="Allows side-by-side comparison of two units across all performance dimensions including pillar-level radar charts." />
            <TabGuide icon={Brain} title="AI Executive Insights" description="AI-generated strategic interpretation of aggregated metrics. Provides narrative analysis of strengths, risks, and opportunities." />
          </div>
        </motion.div>
      </section>

      {/* Section D: FAQ */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Frequently Asked Questions</span>
          </div>
          <div className="space-y-1">
            <FAQItem
              question="What is the Risk Index?"
              answer="The Risk Index (RI) is a weighted score from 0 to 3 that quantifies strategic risk. It weights each applicable item by its risk signal: No Risk (0), Emerging (1), Critical (2), Realized (3), then divides by total applicable items. A lower RI means healthier execution."
            />
            <FAQItem
              question="How are completion percentages calculated?"
              answer="Completion % counts all items that have reached a 'Completed' status (both On Target and Below Target) divided by the total number of applicable items. Items marked 'Not Applicable' are excluded from the calculation."
            />
            <FAQItem
              question="Why can an initiative have high completion but still show risk?"
              answer="An initiative can be 'Completed – Below Target', which counts toward completion but also registers as a Realized Risk signal. This means the work was done but didn't meet expectations, contributing to both completion and risk metrics simultaneously."
            />
            <FAQItem
              question="How often is the dashboard updated?"
              answer="The dashboard pulls live data from unit reporting sheets each time you access it. Data freshness depends on when units last updated their reporting sheets. The 'Data Retrieved' timestamp in the header shows when data was last fetched."
            />
            <FAQItem
              question="What is a strategic snapshot?"
              answer="A snapshot captures the current state of all university-level metrics at a point in time. By comparing snapshots across reporting cycles, leadership can observe the trajectory of strategic execution and identify trends."
            />
          </div>
        </motion.div>
      </section>

      {/* Section E: Reading Tips */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-elevated p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reading Tips for Executives</span>
          </div>
          <div className="space-y-4">
            <TipStep step={1} title="Start with Executive Snapshot" description="Get an instant overview of university-wide performance. Review the KPI banner and the Strategic Performance Matrix." />
            <TipStep step={2} title="Check Strategic Risk & Priority" description="Identify critical issues using the risk heatmap and exceptions table. Focus on units and pillars with elevated risk signals." />
            <TipStep step={3} title="Review Budget Intelligence" description="Analyze financial pressure signals. Look for pillars where high budget utilization coincides with high risk index." />
            <TipStep step={4} title="Track Progress with Snapshots" description="Capture snapshots regularly and use the trajectory charts to understand whether strategic execution is improving over time." />
            <TipStep step={5} title="Compare Units" description="Use Unit Comparison to analyze structural differences. The radar chart reveals pillar-level strengths and weaknesses between units." />
          </div>
        </motion.div>
      </section>
    </div>
  );
}

function FlowNode({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <div className="text-center px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-[9px] text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function MetricExplainer({ title, definition, calculation, interpretation }: {
  title: string; definition: string; calculation: string; interpretation: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
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
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
      <div className="p-1.5 rounded-lg bg-primary/10 mt-0.5"><Icon className="w-3.5 h-3.5 text-primary" /></div>
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-left hover:bg-muted/20 px-2 rounded transition-colors"
      >
        <span className="text-xs font-semibold text-foreground">{question}</span>
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
      <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-primary">{step}</span>
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
