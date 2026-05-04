/**
 * my-sessions-narrative — generates short, descriptive analytics
 * for the My Sessions comparison view.
 *
 * The narrative is fully derived from the snapshots already in memory —
 * no extra fetch, no AI call. Designed to feel like a quick analyst note
 * sitting on top of the numerical comparison.
 */

import type { MySessionSnapshot } from '@/hooks/use-my-sessions';
import {
  computeMomentum,
  type KpiRowMulti,
  type Momentum,
} from '@/lib/session-context-kpis';

export type NarrativeTone = 'positive' | 'negative' | 'neutral' | 'mixed';

export interface NarrativeInsight {
  title: string;
  body: string;
  tone: NarrativeTone;
}

export interface NarrativeBundle {
  /** One-line executive headline for the comparison. */
  headline: string;
  /** Time span between first and last snapshot (already chronologically sorted). */
  timeSpan: string;
  /** Distribution of momentum verdicts across all KPIs. */
  momentumMix: Record<Momentum, number>;
  /** Bullet-style insights, ordered by importance. */
  insights: NarrativeInsight[];
}

function fmt(n: number, row: Pick<KpiRowMulti, 'isPct' | 'isCount'>): string {
  if (row.isPct) return `${n.toFixed(1)}%`;
  if (row.isCount) return Math.round(n).toLocaleString();
  return n.toFixed(2);
}

function fmtDelta(d: number, row: Pick<KpiRowMulti, 'isPct' | 'isCount' | 'suffix'>): string {
  const sign = d > 0 ? '+' : '';
  if (row.isCount) return `${sign}${Math.round(d).toLocaleString()}`;
  return `${sign}${d.toFixed(2)}${row.suffix ?? ''}`;
}

function humanSpan(days: number): string {
  if (days <= 0) return 'same day';
  if (days === 1) return '1 day';
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  const years = (days / 365).toFixed(days < 730 ? 1 : 0);
  return `${years} year${years === '1' || years === '1.0' ? '' : 's'}`;
}

/**
 * Build a narrative for KPI-comparable contexts (rows present).
 */
export function buildKpiNarrative(
  snapshots: MySessionSnapshot[],
  rows: KpiRowMulti[],
): NarrativeBundle {
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const days = Math.round(
    (new Date(last.created_at).getTime() - new Date(first.created_at).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  // Compute momentum + relative change for each row
  const enriched = rows.map(r => {
    const m = computeMomentum(r.values, { higherIsBetter: r.higherIsBetter ?? true });
    const base = r.values[0];
    const latest = r.values[r.values.length - 1];
    const delta = latest - base;
    const scale = Math.max(Math.abs(base), Math.abs(latest), 1);
    const relPct = (delta / scale) * 100;
    return { row: r, momentum: m, base, latest, delta, relPct };
  });

  const momentumMix: Record<Momentum, number> = {
    Improving: 0, Declining: 0, Stable: 0, Volatile: 0,
  };
  enriched.forEach(e => { momentumMix[e.momentum]++; });

  // Pick the most-improved (positive impact) and most-declined (negative impact)
  // "Impact" respects higherIsBetter — i.e. a drop in Risk Index is good.
  const impactSorted = [...enriched]
    .map(e => {
      const goodDirection = e.row.higherIsBetter ?? true;
      const goodness = goodDirection ? e.delta : -e.delta;
      return { ...e, goodness };
    })
    .sort((a, b) => b.goodness - a.goodness);

  const topGain = impactSorted[0];
  const topLoss = impactSorted[impactSorted.length - 1];
  const volatile = enriched.filter(e => e.momentum === 'Volatile');

  const insights: NarrativeInsight[] = [];

  // 1. Top gain
  if (topGain && topGain.goodness > 0 && Math.abs(topGain.relPct) >= 1) {
    insights.push({
      title: `${topGain.row.label} improved`,
      body: `${topGain.row.label} moved from ${fmt(topGain.base, topGain.row)} to ${fmt(topGain.latest, topGain.row)} (${fmtDelta(topGain.delta, topGain.row)}) — the strongest positive shift across the selected snapshots.`,
      tone: 'positive',
    });
  }

  // 2. Top loss (only if distinct from topGain and meaningful)
  if (
    topLoss &&
    topLoss.row.label !== topGain?.row.label &&
    topLoss.goodness < 0 &&
    Math.abs(topLoss.relPct) >= 1
  ) {
    insights.push({
      title: `${topLoss.row.label} weakened`,
      body: `${topLoss.row.label} moved from ${fmt(topLoss.base, topLoss.row)} to ${fmt(topLoss.latest, topLoss.row)} (${fmtDelta(topLoss.delta, topLoss.row)}). This is the metric most worth investigating in the next review.`,
      tone: 'negative',
    });
  }

  // 3. Volatility note
  if (volatile.length > 0) {
    insights.push({
      title: `${volatile.length} volatile metric${volatile.length > 1 ? 's' : ''}`,
      body: `${volatile.map(v => v.row.label).join(', ')} fluctuated direction across the series rather than trending steadily. Treat single-point readings with caution.`,
      tone: 'mixed',
    });
  }

  // 4. Stability note when nothing moved much
  const movers = enriched.filter(e => Math.abs(e.relPct) >= 1).length;
  if (movers === 0) {
    insights.push({
      title: 'Steady state',
      body: `No KPI moved by more than 1% across the ${snapshots.length} snapshots — performance has been broadly stable over ${humanSpan(days)}.`,
      tone: 'neutral',
    });
  }

  // 5. Headline — concise verdict
  const positives = momentumMix.Improving;
  const negatives = momentumMix.Declining;
  let headline: string;
  if (positives > negatives && negatives === 0) {
    headline = `Positive momentum: ${positives} of ${enriched.length} KPIs improved over ${humanSpan(days)}.`;
  } else if (negatives > positives && positives === 0) {
    headline = `Performance slipped: ${negatives} of ${enriched.length} KPIs declined over ${humanSpan(days)}.`;
  } else if (positives === 0 && negatives === 0) {
    headline = `Stable across ${enriched.length} KPIs over ${humanSpan(days)} — no meaningful movement detected.`;
  } else {
    headline = `Mixed picture over ${humanSpan(days)}: ${positives} improving, ${negatives} declining, ${momentumMix.Stable} stable, ${momentumMix.Volatile} volatile.`;
  }

  return {
    headline,
    timeSpan: humanSpan(days),
    momentumMix,
    insights,
  };
}

/**
 * Narrative for mixed-context comparisons — falls back to metadata-only insights.
 */
export function buildMetadataNarrative(snapshots: MySessionSnapshot[]): NarrativeBundle {
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const days = Math.round(
    (new Date(last.created_at).getTime() - new Date(first.created_at).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const years = new Set(snapshots.map(s => s.academic_year));
  const terms = new Set(snapshots.map(s => s.term));
  const views = new Set(snapshots.map(s => s.view_type));

  const insights: NarrativeInsight[] = [];

  if (years.size > 1) {
    insights.push({
      title: 'Spans multiple academic years',
      body: `Snapshots cover ${Array.from(years).join(', ')}. Cross-year comparison is informational only.`,
      tone: 'mixed',
    });
  }
  if (terms.size > 1) {
    insights.push({
      title: 'Mixed reporting cycles',
      body: `Snapshots include both ${Array.from(terms).map(t => (t === 'mid' ? 'Mid-Year' : 'End-of-Year')).join(' and ')} captures.`,
      tone: 'mixed',
    });
  }
  if (views.size > 1) {
    insights.push({
      title: 'Different view types',
      body: `Combines ${Array.from(views).map(v => (v === 'cumulative' ? 'Cumulative (SP)' : 'Yearly')).join(' and ')} views — totals are not directly additive.`,
      tone: 'mixed',
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: 'Aligned metadata',
      body: `All ${snapshots.length} snapshots share the same academic year, term, and view type — only the source dashboard tab differs.`,
      tone: 'neutral',
    });
  }

  return {
    headline: `Comparing ${snapshots.length} snapshots from different dashboard contexts over ${humanSpan(days)}.`,
    timeSpan: humanSpan(days),
    momentumMix: { Improving: 0, Declining: 0, Stable: 0, Volatile: 0 },
    insights,
  };
}
