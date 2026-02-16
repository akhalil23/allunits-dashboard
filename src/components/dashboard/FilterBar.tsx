import { useDashboard } from '@/contexts/DashboardContext';
import type { AcademicYear, Term, ViewType } from '@/lib/types';

const FilterGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{label}</span>
    <div className="flex gap-1">{children}</div>
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

  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-card border-b border-border">
      <FilterGroup label="Academic Year">
        {(['2025-2026', '2026-2027'] as AcademicYear[]).map(y => (
          <Pill key={y} active={academicYear === y} onClick={() => setAcademicYear(y)}>
            {y}
          </Pill>
        ))}
      </FilterGroup>

      <div className="w-px h-6 bg-border" />

      <FilterGroup label="Term">
        {([['mid', 'Mid-Year'], ['end', 'End-of-Year']] as [Term, string][]).map(([t, l]) => (
          <Pill key={t} active={term === t} onClick={() => setTerm(t)}>
            {l}
          </Pill>
        ))}
      </FilterGroup>

      <div className="w-px h-6 bg-border" />

      <FilterGroup label="View">
        {([['cumulative', 'Cumulative (SP)'], ['yearly', 'Yearly']] as [ViewType, string][]).map(([v, l]) => (
          <Pill key={v} active={viewType === v} onClick={() => setViewType(v)}>
            {l}
          </Pill>
        ))}
      </FilterGroup>
    </div>
  );
}
