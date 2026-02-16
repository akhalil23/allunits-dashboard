import { useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Loader2, RefreshCw, Zap } from 'lucide-react';
import type { ActionItem, ViewType, Term, AcademicYear, PillarId, Status } from '@/lib/types';
import { PILLAR_LABELS } from '@/lib/constants';
import { getItemStatus, computeQualifierDistribution, computeRiskIndex, computeTimeProgress } from '@/lib/intelligence';
import { useAIInsights, type InsightSummary } from '@/hooks/use-ai-insights';

interface Props {
  items: ActionItem[];
  viewType: ViewType;
  term: Term;
  academicYear: AcademicYear;
  observedAt: string;
  selectedPillar: 'all' | PillarId;
}

const pillars: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

const insightIcons = {
  strength: TrendingUp,
  risk: AlertTriangle,
  opportunity: Lightbulb,
};

const insightColors = {
  strength: 'text-green-500 bg-green-500/10 border-green-500/20',
  risk: 'text-red-500 bg-red-500/10 border-red-500/20',
  opportunity: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
};

export default function AIInsightCard({ items, viewType, term, academicYear, observedAt, selectedPillar }: Props) {
  const { data, isLoading, error, generate } = useAIInsights();

  const summary = useMemo((): InsightSummary => {
    const statusCounts: Record<string, number> = {};
    let naCount = 0;

    items.forEach(item => {
      const s = getItemStatus(item, viewType, term, academicYear);
      statusCounts[s] = (statusCounts[s] || 0) + 1;
      if (s === 'Not Applicable') naCount++;
    });

    const applicable = items.length - naCount;
    const qualDist = computeQualifierDistribution(items, viewType, term, observedAt, academicYear);
    const riskIndex = computeRiskIndex(items, viewType, term, observedAt, academicYear);
    const timeProgress = computeTimeProgress(observedAt, academicYear);

    const pillarCompletion: Record<string, number> = {};
    pillars.forEach(p => {
      const pi = items.filter(i => i.pillar === p);
      const pa = pi.filter(i => getItemStatus(i, viewType, term, academicYear) !== 'Not Applicable');
      const comp = pa.filter(i => getItemStatus(i, viewType, term, academicYear) === 'Completed – On Target').length;
      pillarCompletion[`${p} - ${PILLAR_LABELS[p]}`] = pa.length ? Math.round((comp / pa.length) * 100) : 0;
    });

    return {
      totalItems: items.length,
      applicableItems: applicable,
      statusDistribution: statusCounts,
      qualifierDistribution: Object.fromEntries(qualDist.map(q => [q.qualifier, { count: q.count, percent: q.percent }])),
      riskIndex,
      timeProgress,
      pillarCompletion,
      filters: {
        academicYear,
        term: term === 'mid' ? 'Mid-Year' : 'End-of-Year',
        viewType: viewType === 'cumulative' ? 'Cumulative (SP)' : 'Yearly',
        selectedPillar: selectedPillar === 'all' ? 'All Pillars' : `Pillar ${selectedPillar}`,
      },
    };
  }, [items, viewType, term, academicYear, observedAt, selectedPillar]);

  const handleGenerate = () => {
    generate(summary);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="card-elevated relative overflow-hidden border-l-4 border-l-primary"
    >
      <div className="absolute inset-0 bg-primary/[0.03] pointer-events-none" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI Strategic Insights</span>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : data ? (
              <RefreshCw className="w-3 h-3" />
            ) : (
              <Zap className="w-3 h-3" />
            )}
            {isLoading ? 'Analyzing…' : data ? 'Refresh' : 'Generate Insights'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* Empty state */}
          {!data && !isLoading && !error && (
            <motion.div key="empty" exit={{ opacity: 0 }} className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Click <strong>Generate Insights</strong> to get AI-powered analysis of your current strategic plan data.
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 italic">
                Analyzes {items.length} items • {viewType === 'cumulative' ? 'Cumulative' : 'Yearly'} • AY {academicYear} • {term === 'mid' ? 'Mid-Year' : 'End-of-Year'}
              </p>
            </motion.div>
          )}

          {/* Loading */}
          {isLoading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Analyzing qualifier patterns and risk signals…</p>
            </motion.div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-4">
              <p className="text-sm text-destructive">{error}</p>
              <button onClick={handleGenerate} className="mt-2 text-xs text-primary underline hover:no-underline">Try again</button>
            </motion.div>
          )}

          {/* Results */}
          {data && !isLoading && (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Headline */}
              <p className="text-base font-display font-semibold text-foreground">{data.headline}</p>

              {/* Insight cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.insights.map((insight, i) => {
                  const Icon = insightIcons[insight.type] || Lightbulb;
                  const colors = insightColors[insight.type] || insightColors.opportunity;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`rounded-lg border p-3 ${colors}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold uppercase tracking-wider">{insight.type}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">{insight.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{insight.detail}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Recommendation */}
              {data.recommendation && (
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Recommendation</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{data.recommendation}</p>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground italic border-t border-border pt-2">
                AI-generated insights — decision-support only. Based on {items.length} items, {selectedPillar === 'all' ? 'all pillars' : `Pillar ${selectedPillar}`}.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
