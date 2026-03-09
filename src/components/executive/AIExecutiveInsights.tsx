/**
 * Tab 7 — AI Executive Insights
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, ShieldAlert, TrendingUp, Lightbulb, RefreshCw, AlertCircle } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateByPillar, type UniversityAggregation } from '@/lib/university-aggregation';
import { riToPercent, getRiskDisplayInfo } from '@/lib/risk-display';
import { useAIInsights, type AIInsightsResult, type InsightSummary } from '@/hooks/use-ai-insights';

interface Props { aggregation: UniversityAggregation; }

const INSIGHT_ICONS: Record<string, React.ElementType> = { strength: TrendingUp, risk: ShieldAlert, opportunity: Lightbulb };
const INSIGHT_COLORS: Record<string, string> = { strength: '#16A34A', risk: '#EF4444', opportunity: '#3B82F6' };

export default function AIExecutiveInsights({ aggregation }: Props) {
  const { viewType, academicYear, term } = useDashboard();
  const { data: unitResults } = useUniversityData();
  const { data: insights, isLoading, error, generate } = useAIInsights();
  const [hasGenerated, setHasGenerated] = useState(false);

  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  const buildSummary = useCallback((): InsightSummary => {
    const { applicableItems, totalItems, riskCounts, riskIndex } = aggregation;
    const statusDistribution: Record<string, number> = { 'Not Started': aggregation.notStartedCount, 'In Progress': aggregation.inProgressCount, 'Completed – On Target': aggregation.cotCount, 'Completed – Below Target': aggregation.cbtCount };
    const qualifierDistribution: Record<string, { count: number; percent: number }> = {
      'Achieved': { count: aggregation.cotCount, percent: applicableItems ? Math.round((aggregation.cotCount / applicableItems) * 100) : 0 },
      'On Track': { count: riskCounts.noRisk, percent: applicableItems ? Math.round((riskCounts.noRisk / applicableItems) * 100) : 0 },
      'Emerging Risk': { count: riskCounts.emerging, percent: applicableItems ? Math.round((riskCounts.emerging / applicableItems) * 100) : 0 },
      'Critical Risk': { count: riskCounts.critical, percent: applicableItems ? Math.round((riskCounts.critical / applicableItems) * 100) : 0 },
      'Execution Shortfall': { count: riskCounts.realized, percent: applicableItems ? Math.round((riskCounts.realized / applicableItems) * 100) : 0 },
    };
    const now = new Date();
    const yearStart = new Date(`${academicYear.split('-')[0]}-09-01`);
    const yearEnd = new Date(`${academicYear.split('-')[1]}-08-31`);
    const totalMs = yearEnd.getTime() - yearStart.getTime();
    const elapsedMs = Math.max(0, now.getTime() - yearStart.getTime());
    const timeProgress = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
    const pillarCompletion: Record<string, number> = {};
    pillarAgg.forEach(p => { pillarCompletion[`Pillar ${p.pillar}`] = p.completionPct; });
    const riPct = riToPercent(riskIndex);
    const riInfo = getRiskDisplayInfo(riskIndex);
    return { totalItems, applicableItems, statusDistribution, qualifierDistribution, riskIndex: riPct, riskIndexBand: riInfo.band, riskIndexInsight: riInfo.insight, timeProgress, pillarCompletion, filters: { academicYear: `AY ${academicYear}`, term: term === 'mid' ? 'Mid-Year' : 'End-of-Year', viewType: viewType === 'cumulative' ? 'Cumulative (SP)' : 'Yearly', selectedPillar: 'all' } };
  }, [aggregation, pillarAgg, academicYear, term, viewType]);

  const handleGenerate = useCallback(async () => { setHasGenerated(true); await generate(buildSummary()); }, [generate, buildSummary]);

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground italic px-1">AI insights are generated from aggregated computed metrics only — no raw spreadsheet data is sent to the AI model.</p>

      {!hasGenerated && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm p-8 sm:p-12 text-center space-y-4">
          <Brain className="w-10 h-10 text-primary mx-auto" />
          <h3 className="text-lg font-display font-semibold text-foreground">AI Executive Insights</h3>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">Generate AI-powered analysis of the current university strategic plan execution. The AI will analyze {aggregation.applicableItems} applicable items across {aggregation.loadedUnits} units.</p>
          <button onClick={handleGenerate} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"><Sparkles className="w-4 h-4" />Generate Insights</button>
        </motion.div>
      )}

      {isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm p-8 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-primary mx-auto animate-spin" />
          <p className="text-sm text-muted-foreground">Analyzing university data…</p>
        </motion.div>
      )}

      {error && hasGenerated && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Failed to generate insights</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <button onClick={handleGenerate} className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"><RefreshCw className="w-3 h-3" />Retry</button>
            </div>
          </div>
        </motion.div>
      )}

      {insights && !isLoading && (
        <AnimatePresence mode="wait">
          <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5 sm:p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent pointer-events-none" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Brain className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Executive Summary</span>
                    <p className="text-sm sm:text-base font-display font-semibold text-foreground mt-1">{insights.headline}</p>
                  </div>
                </div>
                <button onClick={handleGenerate} className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors shrink-0" title="Regenerate insights"><RefreshCw className="w-3.5 h-3.5 text-muted-foreground" /></button>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {insights.insights.map((insight, idx) => {
                const Icon = INSIGHT_ICONS[insight.type] || Lightbulb;
                const color = INSIGHT_COLORS[insight.type] || 'hsl(var(--primary))';
                return (
                  <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * (idx + 1) }} className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden p-5">
                    <div className="absolute top-0 left-0 w-1 h-full rounded-r" style={{ backgroundColor: color }} />
                    <div className="pl-3">
                      <div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4" style={{ color }} /><span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{insight.type}</span></div>
                      <p className="text-sm font-semibold text-foreground mb-1">{insight.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{insight.detail}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {insights.recommendation && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-primary font-semibold uppercase tracking-wider">Recommendation</span>
                    <p className="text-sm text-foreground mt-1 leading-relaxed">{insights.recommendation}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <p className="text-[10px] text-muted-foreground/60 text-center px-4">AI-generated insights are based on aggregated metrics and should be validated by domain experts before decision-making.</p>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
