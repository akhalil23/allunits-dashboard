/**
 * Dashboard Guide — Comprehensive Help Center for the Executive Command Center.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ChevronDown, ChevronUp, Info, ArrowRight,
  LayoutDashboard, ShieldAlert, Target, DollarSign, GitCompare, Brain, Camera,
  HelpCircle, Lightbulb, FileDown, Moon, Sun, RefreshCw,
} from 'lucide-react';

export default function DashboardGuide() {
  return (
    <div className="space-y-8">
      {/* Data Refresh Policy — Prominent */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-amber-500/40 bg-amber-500/5 shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-4 h-4 text-amber-500" />
            <span className="text-xs sm:text-sm font-medium text-amber-500 uppercase tracking-wider">Data Refresh Policy</span>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Dashboard data is refreshed from the official online reporting sheets on a <span className="font-semibold text-foreground">monthly schedule</span>.
            </p>
            <p>
              As a result, updates made to the source sheets will <span className="font-semibold text-foreground">not appear immediately</span> in the dashboard.
            </p>
            <p>
              Changes will be reflected only at the <span className="font-semibold text-foreground">beginning or end of each month</span>, depending on the reporting cycle.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Section A: Dashboard Overview */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Dashboard Overview</span>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              The <span className="font-semibold text-foreground">University Executive Command Center</span> is the central strategic monitoring tool for
              the Lebanese American University's <span className="font-semibold text-foreground">Strategic Plan IV (2025–2027)</span>.
            </p>
            <p>
              It provides the President, Board members, and senior leadership with a real-time, data-driven view of
              strategic performance across all 22 reporting units and five strategic pillars.
            </p>
          </div>

          {/* Visual Flow */}
          <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/50">
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

      {/* Section B: Key Metrics Explained */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Key Metrics Explained</span>
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
              definition="The weighted average completion across all applicable strategic items. Completed actions (both on target and below target) count as 100%. In Progress items use their actual percentage. Not Started items count as 0%."
              calculation="Weighted average: COT → 100%, CBT → 100%, In Progress → actual %, Not Started → 0%"
              interpretation="Higher completion indicates more items have been executed. Quality of completion is assessed via On-Track vs Below Target split and the Risk Index."
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
              title="Allocation (Total Planned)"
              definition="Total approved budget across all pillars for the strategic plan period."
              calculation="Sum of pillar-level allocations (Column V subtotals from Finance spreadsheet)."
              interpretation="Allocation reflects strategic investment priority. Compare with utilization to assess deployment efficiency."
            />
            <MetricExplainer
              title="Committed (Funds in Use)"
              definition="Funds formally committed to initiatives. This includes both Spent Commitment (funds already disbursed) and Unspent Commitment (contractual or approved obligations not yet paid)."
              calculation="Total Committed = Spent Commitment (Column Z) + Unspent Commitment (Column Y). Must satisfy: Committed + Available = Total Budget."
              interpretation="High commitment levels indicate active strategic deployment. Check the Spent vs Unspent split to assess disbursement progress."
            />
            <MetricExplainer
              title="Available (Remaining)"
              definition="Budget capacity not yet committed and still available for future initiatives."
              calculation="Available = Total Budget − Total Committed"
              interpretation="Low availability with high risk signals budget pressure. The percentage of allocation still free is shown alongside the value."
            />
            <MetricExplainer
              title="Budget Utilization"
              definition="Percentage of total budget that has been formally committed. Reflects financial commitment, not implementation progress."
              calculation="Total Committed ÷ Total Budget × 100"
              interpretation="High utilization (>80%) with elevated risk may indicate financial pressure. Low utilization may indicate underdeployment."
            />
            <MetricExplainer
              title="Budget Health"
              definition="Overall financial capacity based on commitment pressure relative to the approved budget."
              calculation="Derived from the Available-to-Allocation ratio. Healthy ≥ 30% available, Watch ≥ 15%, Critical < 15%."
              interpretation="Healthy = strong available capacity, commitments well within budget. Watch = moderate pressure, limited room for new initiatives. Critical = high saturation, little remaining flexibility."
            />
            <MetricExplainer
              title="Execution Pace"
              definition="Evaluates whether in-progress work within each strategic pillar is advancing fast enough relative to the reporting period. Uses only items with 'In Progress' status."
              calculation="Actual Progress = average completion % of in-progress items per pillar. Expected Progress = proportional time elapsed in the reporting window (Mid-Year: Jul–Dec, End-of-Year: Jul–Jun). Delay Gap = Expected − Actual."
              interpretation="Ahead of Schedule (gap ≤ −10%): work is advancing faster than required. On Schedule (−10% to 10%): progress aligns with expectations. Behind Schedule (10% to 25%): action needed to catch up. Significantly Behind (>25%): immediate intervention required."
            />
            <MetricExplainer
              title="Strategic Execution Efficiency Index (SEEI)"
              definition="Headline efficiency metric for executive situational awareness. Measures whether execution output is proportional to financial resource deployment."
              calculation="SEEI = Actual Progress % ÷ Budget Utilization %. Actual Progress = average completion of all in-progress items. Budget Utilization = Total Committed ÷ Total Budget × 100."
              interpretation="≥ 1.20 = Highly Efficient (execution exceeds resource consumption). 0.90–1.19 = Balanced Execution. 0.60–0.89 = Efficiency Concern (spending outpaces delivery). < 0.60 = Critical Inefficiency."
            />
            <MetricExplainer
              title="Progress Ratio"
              definition="Measures how actual execution compares to expected time-based progress within the reporting window."
              calculation="Progress Ratio = Actual Progress % ÷ Expected Progress %. Values > 1.0 mean work is ahead; < 1.0 means behind."
              interpretation="Used per pillar to assess delivery speed. A ratio below 1.0 signals that execution is not keeping pace with the timeline."
            />
            <MetricExplainer
              title="Intervention Priority Score (IPS)"
              definition="Composite metric combining schedule delay with financial exposure. Identifies pillars where delay coincides with high budget deployment."
              calculation="IPS = (1 − Progress Ratio) × Budget Utilization %. Classification: > 25 = Critical Priority, > 15 = High Priority, > 5 = Monitor, ≤ 5 = Stable."
              interpretation="Higher IPS values indicate pillars where financial resources are deployed but execution is lagging — requiring prioritized intervention."
            />
            <MetricExplainer
              title="Critical Strategic Items"
              definition="Strategic action items flagged with Critical or Realized risk signals, indicating they require immediate executive attention."
              calculation="Items are flagged when their risk signal is 'Critical Risk' (Not Started) or 'Realized Risk' (Completed Below Target)."
              interpretation="These items represent the highest-priority concerns. Critical items have not yet started despite time progression. Realized items were completed but fell short of target expectations."
            />
            <MetricExplainer
              title="Actual Progress % (In-Progress Items)"
              definition="Average completion percentage computed exclusively from items with 'In Progress' status. Completed items are excluded because they no longer reflect ongoing delivery performance."
              calculation="Simple arithmetic mean of completion percentages across all in-progress items within the selected scope (pillar, unit, or university)."
              interpretation="Provides a real-time measure of current execution velocity. Used in SEEI, Execution Pace, and Budget-Progress alignment charts."
            />
          </div>
        </motion.div>
      </section>

      {/* Section C: How to Read Each Tab */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <LayoutDashboard className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">How to Read Each Tab</span>
          </div>
          <div className="space-y-3">
            <TabGuide icon={LayoutDashboard} title="Executive Snapshot" description="SEEI-centric command view. The Strategic Execution Efficiency Index (SEEI) headline KPI measures execution efficiency relative to budget deployment. The Execution Pace bar chart evaluates whether in-progress work is advancing fast enough. The Budget Utilization vs Progress chart assesses resource-outcome alignment per pillar." />
            <TabGuide icon={ShieldAlert} title="Strategic Risk & Priority" description="Identifies initiatives with elevated risk signals. Use the heatmap to see which units and pillars need attention. Review Critical Strategic Items for items requiring immediate attention." />
            <TabGuide icon={DollarSign} title="Budget Intelligence" description="Deep diagnostic view of financial effectiveness. The Budget Utilization vs Execution Progress scatter chart maps spending against in-progress delivery outcomes per pillar, with quadrant classification and automated summary insights." />
            <TabGuide icon={Camera} title="Strategic Snapshot Tracker" description="Capture and compare performance snapshots across reporting cycles. Each snapshot is uniquely labeled with timestamp. Trend charts use sequential labels (S1, S2, S3…) on the x-axis — hover over data points to see the full reporting cycle and capture time." />
            <TabGuide icon={GitCompare} title="Unit Comparison" description="Allows side-by-side comparison of two units across all performance dimensions including pillar-level radar charts." />
            <TabGuide icon={Brain} title="AI Executive Insights" description="AI-generated strategic interpretation of aggregated metrics. Provides narrative analysis of strengths, risks, and opportunities." />
          </div>
        </motion.div>
      </section>

      {/* Section D: Export & Reporting */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileDown className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Export & Reporting</span>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              The header includes a <span className="font-semibold text-foreground">PDF/CSV export dropdown</span> (download icon) that generates
              presentation-ready reports reflecting the current filter state.
            </p>
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30 space-y-2">
              <p className="text-xs font-semibold text-foreground">PDF Export</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>A4 landscape layout optimized for board presentations</li>
                <li>Includes inline SVG visualizations — status donut charts and pillar completion bars</li>
                <li>Dynamically reflects the selected Academic Year, Term, and View Type</li>
                <li>Unit-specific titles (e.g., "HR — Human Resources") for unit dashboards</li>
                <li>Branded with LAU logo and official teal-green color palette</li>
              </ul>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30 space-y-2">
              <p className="text-xs font-semibold text-foreground">CSV Export</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Raw data export for custom analysis in Excel or Google Sheets</li>
                <li>Includes all strategic action items with their status and risk signals</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section E: Dark Mode */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Dark Mode</span>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Toggle between <span className="font-semibold text-foreground">Light</span> and <span className="font-semibold text-foreground">Dark</span> modes
              using the sun/moon icon in the header. Your preference is saved automatically.
            </p>
            <p>
              Dark mode is optimized for low-light environments with enhanced card contrast, brighter text, and adjusted chart colors for readability.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Section F: FAQ */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Frequently Asked Questions</span>
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
              answer="A snapshot captures the current state of all university-level metrics at a point in time. By comparing snapshots across reporting cycles, leadership can observe the trajectory of strategic execution and identify trends. Each snapshot is uniquely labeled with a timestamp to distinguish multiple captures within the same cycle."
            />
            <FAQItem
              question="How do I export a report?"
              answer="Click the download icon in the header to open the export dropdown. Select PDF for a presentation-ready A4 landscape report with charts and branding, or CSV for raw data. Both formats reflect the currently selected filters (Academic Year, Term, View Type)."
            />
            <FAQItem
              question="Does dark mode affect exported reports?"
              answer="No. PDF and CSV exports always use the standard light-mode branding with the official LAU teal-green palette, regardless of your display theme preference."
            />
          </div>
        </motion.div>
      </section>

      {/* Section G: Reading Tips */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Reading Tips for Executives</span>
          </div>
          <div className="space-y-4">
            <TipStep step={1} title="Start with Executive Snapshot" description="Get an instant overview of university-wide performance. Review the KPI banner and the Execution Pace chart to see how in-progress work compares to expected timelines." />
            <TipStep step={2} title="Check Strategic Risk & Priority" description="Identify critical issues using the risk heatmap and exceptions table. Focus on units and pillars with elevated risk signals." />
            <TipStep step={3} title="Review Budget Intelligence" description="Analyze financial pressure signals. Look for pillars where high budget utilization coincides with high risk index." />
            <TipStep step={4} title="Track Progress with Snapshots" description="Capture snapshots regularly and use the trajectory charts to understand whether strategic execution is improving over time." />
            <TipStep step={5} title="Compare Units" description="Use Unit Comparison to analyze structural differences. The radar chart reveals pillar-level strengths and weaknesses between units." />
            <TipStep step={6} title="Export for Board Meetings" description="Generate a PDF report before presentations. The exported report includes branded visualizations and reflects your current filter selections." />
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

function MetricExplainer({ title, definition, calculation, interpretation }: {
  title: string; definition: string; calculation: string; interpretation: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
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
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-left hover:bg-muted/20 px-2 rounded-lg transition-colors"
      >
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
