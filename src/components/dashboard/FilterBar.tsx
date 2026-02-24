import { useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import type { AcademicYear, Term, ViewType } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';

const FilterGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{label}</span>
    <div className="flex flex-wrap gap-1">{children}</div>
  </div>
);

const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`filter-pill ${active ? 'filter-pill-active' : ''}`}
  >
    {children}
  </button>
);

export default function FilterBar() {
  const { academicYear, setAcademicYear, term, setTerm, viewType, setViewType } = useDashboard();
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterContent = (
    <>
      <FilterGroup label="Academic Year">
        {(['2025-2026', '2026-2027'] as AcademicYear[]).map(y => (
          <Pill key={y} active={academicYear === y} onClick={() => setAcademicYear(y)}>
            {y}
          </Pill>
        ))}
      </FilterGroup>

      {!isMobile && <div className="w-px h-6 bg-border" />}

      <FilterGroup label="Term">
        {([['mid', 'Mid-Year'], ['end', 'End-of-Year']] as [Term, string][]).map(([t, l]) => (
          <Pill key={t} active={term === t} onClick={() => setTerm(t)}>
            {l}
          </Pill>
        ))}
      </FilterGroup>

      {!isMobile && <div className="w-px h-6 bg-border" />}

      <FilterGroup label="View">
        {([['cumulative', 'Cumulative (SP)'], ['yearly', 'Yearly']] as [ViewType, string][]).map(([v, l]) => (
          <Pill key={v} active={viewType === v} onClick={() => setViewType(v)}>
            {l}
          </Pill>
        ))}
      </FilterGroup>
    </>
  );

  if (isMobile) {
    return (
      <div className="bg-card border-b border-border">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-foreground"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <span>Filters</span>
            <span className="text-[10px] text-muted-foreground">
              {academicYear} • {term === 'mid' ? 'Mid' : 'End'} • {viewType === 'cumulative' ? 'SP' : 'Yearly'}
            </span>
          </div>
          {filtersOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {filtersOpen && (
          <div className="px-4 pb-3 space-y-2.5">
            {filterContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-card border-b border-border">
      {filterContent}
    </div>
  );
}
