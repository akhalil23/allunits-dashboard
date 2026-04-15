/**
 * Executive Summary Section — Shared component for University & Pillar dashboards.
 * Renders pillar executive summaries (Achievements, Challenges, Priorities)
 * fetched dynamically from Google Sheets.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Award, AlertTriangle, Target, FileText } from 'lucide-react';
import { useExecutiveSummaries, type ExecutiveSummary } from '@/hooks/use-executive-summaries';
import { PILLAR_COLORS } from '@/lib/pillar-colors';
import { PILLAR_SHORT } from '@/lib/pillar-labels';
import type { PillarId, AcademicYear, Term } from '@/lib/types';

interface Props {
  academicYear: AcademicYear;
  term: Term;
  pillarFilter?: 'all' | PillarId;
  title?: string;
}

const PILLAR_IDS: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

const PERIOD_MAP: Record<Term, string> = {
  mid: 'Mid-Year',
  end: 'End-of-Year',
};

export default function ExecutiveSummarySection({
  academicYear,
  term,
  pillarFilter = 'all',
  title = 'Strategic Executive Summaries by Pillar',
}: Props) {
  const { data: summaries = [], isLoading } = useExecutiveSummaries();

  const filtered = useMemo(() => {
    const period = PERIOD_MAP[term];
    const pillarsToShow = pillarFilter === 'all' ? PILLAR_IDS : [pillarFilter];

    // Normalize academic year for matching (e.g. "2025-2026" → "2025-26")
    const shortYear = academicYear.replace(/^(\d{4})-\d{2}(\d{2})$/, '$1-$2');

    return pillarsToShow.map(pillarId => {
      const match = summaries.find(
        s =>
          (s.academicYear === academicYear || s.academicYear === shortYear) &&
          s.period === period &&
          s.pillar === pillarId
      );
      return { pillarId, summary: match || null };
    });
  }, [summaries, academicYear, term, pillarFilter]);

  if (isLoading) return null;

  const hasAny = filtered.some(f => f.summary);

  if (!hasAny) {
    return (
      <section className="space-y-3">
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4" /> {title}
        </h3>
        <div className="rounded-2xl border border-border/40 bg-card/50 py-8 text-center">
          <p className="text-xs text-muted-foreground">
            No executive summary available for selected filters.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <FileText className="w-4 h-4" /> {title}
      </h3>
      <div
        className={`grid gap-4 ${
          pillarFilter === 'all'
            ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
            : 'grid-cols-1 max-w-2xl'
        }`}
      >
        {filtered.map(({ pillarId, summary }, i) => (
          <PillarSummaryCard
            key={pillarId}
            pillarId={pillarId}
            summary={summary}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}

function PillarSummaryCard({
  pillarId,
  summary,
  index,
}: {
  pillarId: PillarId;
  summary: ExecutiveSummary | null;
  index: number;
}) {
  const color = PILLAR_COLORS[pillarId];

  if (!summary) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="rounded-2xl border border-border/40 bg-card/50 p-5 opacity-60"
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: `${color}15`,
              border: `1px solid ${color}25`,
            }}
          >
            <span className="text-xs font-bold" style={{ color }}>
              {pillarId}
            </span>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {PILLAR_SHORT[pillarId]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground italic">
          No summary available.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}66)`,
        }}
      />
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: `${color}15`,
              border: `1px solid ${color}25`,
            }}
          >
            <span className="text-xs font-bold" style={{ color }}>
              {pillarId}
            </span>
          </div>
          <span className="text-sm font-semibold text-foreground">
            {PILLAR_SHORT[pillarId]}
          </span>
        </div>

        <div className="space-y-3">
          <SummaryBlock
            icon={Award}
            label="Achievements"
            text={summary.achievements}
            color="#059669"
          />
          <SummaryBlock
            icon={AlertTriangle}
            label="Challenges"
            text={summary.challenges}
            color="#D97706"
          />
          <SummaryBlock
            icon={Target}
            label="Priorities"
            text={summary.priorities}
            color={color}
          />
        </div>
      </div>
    </motion.div>
  );
}

function SummaryBlock({
  icon: Icon,
  label,
  text,
  color,
}: {
  icon: React.ElementType;
  label: string;
  text: string;
  color: string;
}) {
  if (!text) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color }}
        >
          {label}
        </span>
      </div>
      <p className="text-xs text-foreground/85 leading-relaxed pl-5">{text}</p>
    </div>
  );
}
