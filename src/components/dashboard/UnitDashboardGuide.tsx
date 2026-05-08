/**
 * Unit Dashboard Guide — Comprehensive help center for individual unit/school dashboards.
 * Mirrors the premium design of the Executive Dashboard Guide.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ChevronDown, ChevronUp, Info, ArrowRight,
  LayoutDashboard, ShieldAlert, Target, FlaskConical,
  HelpCircle, Lightbulb, FileDown, Moon, AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export default function UnitDashboardGuide() {
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
              The dashboard operates on <span className="font-semibold text-foreground">controlled automated monthly reporting snapshots</span>. Source data is fetched, validated, and atomically published once per cycle — never queried live.
            </p>
            <p>
              Refreshes are <span className="font-semibold text-foreground">automatically scheduled on the 1st of each month at 02:00 UTC</span>. If a refresh fails validation, the previous validated monthly snapshot remains active and the system retries automatically.
            </p>
            <p>
              The timestamp displayed at the top of every tab reflects the <span className="font-semibold text-foreground">last successful validated monthly refresh</span>. There is no manual refresh button.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Section A: Dashboard Overview */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Dashboard Overview</span>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              The <span className="font-semibold text-foreground">Unit Dashboard</span> is a strategic monitoring tool for tracking
              performance against the Lebanese American University's <span className="font-semibold text-foreground">Strategic Plan IV (2025–2027)</span> at the individual unit/school level.
            </p>
            <p>
              It provides unit heads, directors, and coordinators with a focused view of their unit's
              strategic performance across the five strategic pillars, including progress tracking, risk signals, and pillar-level breakdowns.
            </p>
          </div>

          {/* Visual Flow */}
          <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Data Flow</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <FlowNode label="Unit Reporting Sheet" sublabel="Source data" />
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <FlowNode label="5 Strategic Pillars" sublabel="Pillar breakdown" />
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <FlowNode label="Unit Metrics" sublabel="Performance insight" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section B: Main Sections Explained */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <LayoutDashboard className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Main Sections & Visuals</span>
          </div>
          <div className="space-y-3">
            <TabGuide icon={LayoutDashboard} title="Pillar Performance Overview" description="Displays KPI cards (Risk Index, Completion %, On-Track %, Below Target %) and a status donut chart summarizing the distribution of all strategic action items. The Pillar Health Grid shows each pillar's risk level, completion progress, and item counts." />
            <TabGuide icon={ShieldAlert} title="Risk Signals Overview" description="Highlights items flagged with elevated risk. Includes a risk distribution chart, pillar-level risk breakdown, and a detailed table of critical strategic items (items that are Not Started or Completed Below Target)." />
            <TabGuide icon={Target} title="Pillar Filters" description="Use the sidebar pillar filters (PI–PV) to drill down into a specific pillar's action items. Selecting a pillar narrows all dashboard views to only that pillar's data." />
            <TabGuide icon={FlaskConical} title="Evolution Lab" description="A comparative analysis tool that lets you view how your unit's metrics have changed across different time periods, terms, and view types. Use the axis selectors and delta strips to identify trends." />
          </div>
        </motion.div>
      </section>

      {/* Section C: Key Metrics Explained */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
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
              title="Progress Status Mapping"
              definition="Each strategic action item is assigned a status that maps to a risk signal."
              calculation="Completed – On Target → No Risk (RI 0%) | In Progress → Emergent Risk (RI 33%) | Not Started → Critical Risk (RI 67%) | Completed – Below Target → Realized Risk (RI 100%)"
              interpretation="'Completed – Below Target' items count as 0% completion because the outcome was not met, but they register as Realized Risk (highest risk weight)."
            />
            <MetricExplainer
              title="Cumulative (SP) vs Yearly View"
              definition="Two independent lenses for viewing strategic performance."
              calculation="Cumulative (SP): Reads SP Status and SP % Completion fields. Yearly: Reads Yearly Status and Yearly % Completion fields."
              interpretation="Always compare within the same view. Cumulative tracks full strategic plan progress; Yearly tracks current academic year progress. These are independent datasets — never mix them."
            />
          </div>
        </motion.div>
      </section>

      {/* Section D: Interpreting Results */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">How to Interpret Results & Signals</span>
          </div>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30 space-y-2">
              <p className="text-xs font-semibold text-foreground">Risk Signal Colors</p>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" /> <span><span className="font-semibold text-foreground">No Risk</span> — Completed on target. Fully achieved.</span></li>
                <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" /> <span><span className="font-semibold text-foreground">Emergent Risk</span> — In progress. Work underway but not yet completed.</span></li>
                <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" /> <span><span className="font-semibold text-foreground">Critical Risk</span> — Not started. No progress recorded.</span></li>
                <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 shrink-0" /> <span><span className="font-semibold text-foreground">Realized Risk</span> — Completed below target. Outcome fell short of expectations.</span></li>
              </ul>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30 space-y-2">
              <p className="text-xs font-semibold text-foreground">Reading the Pillar Health Grid</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Each card represents one of the five strategic pillars</li>
                <li>The colored accent bar indicates overall pillar risk level</li>
                <li>Check item counts to understand the scope of each pillar</li>
                <li>Compare Completion % with RI to distinguish quality from quantity</li>
              </ul>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30 space-y-2">
              <p className="text-xs font-semibold text-foreground">Critical Strategic Items</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Items with "Not Started" or "Completed – Below Target" status are flagged</li>
                <li>These represent the highest-priority items requiring immediate attention</li>
                <li>Review the detailed items table in the Risk Signals section</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Section E: Export & Reporting */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
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
                <li>Unit-specific titles (e.g., "HR — Human Resources")</li>
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

      {/* Section F: Dark Mode */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
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

      {/* Section G: FAQ */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
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
              question="Why does 'Completed – Below Target' count as 100% completion?"
              answer="Completion % reflects whether a strategic action has been completed, regardless of target achievement. Both 'Completed – On Target' and 'Completed – Below Target' count as 100% because the work was executed. Quality of completion is assessed separately via the On-Track %, Below Target %, and Risk Index metrics."
            />
            <FAQItem
              question="What is the difference between Cumulative (SP) and Yearly views?"
              answer="Cumulative (SP) tracks progress across the entire Strategic Plan period using SP Status and SP % Completion fields. Yearly tracks performance within a single academic year using Yearly Status and Yearly % Completion. These are independent datasets — they should never be compared directly."
            />
            <FAQItem
              question="Why can an initiative have high completion but still show risk?"
              answer="An initiative can be 'Completed – Below Target', which counts toward completion but also registers as a Realized Risk signal. This means the work was done but didn't meet expectations, contributing to both completion and risk metrics simultaneously."
            />
            <FAQItem
              question="How often is the dashboard updated?"
              answer="The dashboard reads the official online reporting sheets live whenever it loads or refetches. Source-sheet edits should appear on the next live refresh. If the source is temporarily rate-limited or unavailable, the dashboard may briefly fall back to a clearly marked cached snapshot."
            />
            <FAQItem
              question="How do I export a report?"
              answer="Click the download icon in the header to open the export dropdown. Select PDF for a presentation-ready A4 landscape report with charts and branding, or CSV for raw data. Both formats reflect the currently selected filters (Academic Year, Term, View Type)."
            />
            <FAQItem
              question="What is the Evolution Lab?"
              answer="The Evolution Lab is a comparative analysis tool that allows you to view how your unit's metrics have changed across different time periods, terms, and view types. It helps identify trends, improvements, and areas of concern over time."
            />
          </div>
        </motion.div>
      </section>

      {/* Section H: Reading Tips */}
      <section>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Reading Tips</span>
          </div>
          <div className="space-y-4">
            <TipStep step={1} title="Start with the Dashboard Overview" description="Review the KPI banner and status donut chart for a quick snapshot of your unit's strategic performance." />
            <TipStep step={2} title="Check Pillar Health" description="Examine each pillar's risk level, completion, and item distribution. Identify which pillars need the most attention." />
            <TipStep step={3} title="Review Risk Signals" description="Focus on critical strategic items — items that are Not Started or Completed Below Target. These require immediate attention." />
            <TipStep step={4} title="Drill Down by Pillar" description="Use the sidebar pillar filters to isolate and analyze individual pillars in detail." />
            <TipStep step={5} title="Compare Across Time" description="Use the Evolution Lab to track how your unit's metrics have changed between reporting cycles." />
            <TipStep step={6} title="Export for Meetings" description="Generate a PDF report before presentations. The exported report includes branded visualizations and reflects your current filter selections." />
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
