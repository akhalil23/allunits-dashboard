/**
 * Pillar Champions filter bar — pill-style filters matching Executive Command Center.
 */

import { useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { UNIT_IDS, UNIT_CONFIGS } from '@/lib/unit-config';
import { PILLAR_SHORT } from '@/lib/pillar-labels';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import type { PillarId, ViewType, AcademicYear, Term } from '@/lib/types';

interface Props {
  selectedPillar: 'all' | PillarId;
  onPillarChange: (p: 'all' | PillarId) => void;
  selectedUnits: string[];
  onUnitsChange: (units: string[]) => void;
}

const PILLAR_IDS: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

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

export default function PillarFilters({ selectedPillar, onPillarChange, selectedUnits, onUnitsChange }: Props) {
  const { viewType, setViewType, academicYear, setAcademicYear, term, setTerm } = useDashboard();
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const allUnitsSelected = selectedUnits.length === UNIT_IDS.length;

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

      {!isMobile && <div className="w-px h-6 bg-border" />}

      <FilterGroup label="Pillar">
        <Pill active={selectedPillar === 'all'} onClick={() => onPillarChange('all')}>
          All Pillars
        </Pill>
        {PILLAR_IDS.map(p => (
          <Pill key={p} active={selectedPillar === p} onClick={() => onPillarChange(p)}>
            P{p}
          </Pill>
        ))}
      </FilterGroup>

      {!isMobile && <div className="w-px h-6 bg-border" />}

      <FilterGroup label="Units">
        <Pill active={allUnitsSelected} onClick={() => onUnitsChange(UNIT_IDS)}>
          All ({UNIT_IDS.length})
        </Pill>
        {UNIT_IDS.map(id => (
          <Pill
            key={id}
            active={!allUnitsSelected && selectedUnits.includes(id)}
            onClick={() => {
              if (allUnitsSelected) {
                onUnitsChange([id]);
              } else if (selectedUnits.includes(id) && selectedUnits.length === 1) {
                onUnitsChange(UNIT_IDS);
              } else if (selectedUnits.includes(id)) {
                onUnitsChange(selectedUnits.filter(u => u !== id));
              } else {
                onUnitsChange([...selectedUnits, id]);
              }
            }}
          >
            {UNIT_CONFIGS[id].name}
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
              {academicYear} • {term === 'mid' ? 'Mid' : 'End'} • {viewType === 'cumulative' ? 'SP' : 'Yearly'} • {selectedPillar === 'all' ? 'All Pillars' : `P${selectedPillar}`}
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
