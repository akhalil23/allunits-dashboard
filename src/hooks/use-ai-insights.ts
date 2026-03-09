import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIInsight {
  type: 'strength' | 'risk' | 'opportunity';
  title: string;
  detail: string;
}

interface AIInsightsResult {
  headline: string;
  insights: AIInsight[];
  recommendation: string;
}

interface InsightSummary {
  totalItems: number;
  applicableItems: number;
  statusDistribution: Record<string, number>;
  qualifierDistribution: Record<string, { count: number; percent: number }>;
  riskIndex: number;
  riskIndexBand?: string;
  riskIndexInsight?: string;
  timeProgress: number;
  pillarCompletion: Record<string, number>;
  filters: {
    academicYear: string;
    term: string;
    viewType: string;
    selectedPillar: string;
  };
}

export function useAIInsights() {
  const [data, setData] = useState<AIInsightsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (summary: InsightSummary) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('ai-insights', {
        body: { summary },
      });

      if (fnError) throw new Error(fnError.message);
      if (result?.error) {
        if (result.error.includes('Rate limit')) {
          toast.error('AI rate limit reached. Please wait a moment and try again.');
        } else if (result.error.includes('usage limit') || result.error.includes('credits')) {
          toast.error('AI usage limit reached. Please add credits to continue.');
        }
        throw new Error(result.error);
      }

      setData(result as AIInsightsResult);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to generate insights';
      setError(msg);
      console.error('AI insights error:', msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, generate };
}

export type { AIInsightsResult, AIInsight, InsightSummary };
