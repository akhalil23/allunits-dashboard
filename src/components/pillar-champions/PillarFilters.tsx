/**
 * Pillar Champions filter bar — pillar, unit, and reporting filters.
 */

import { useDashboard } from '@/contexts/DashboardContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UNIT_IDS, UNIT_CONFIGS } from '@/lib/unit-config';
import { PILLAR_SHORT } from '@/lib/pillar-labels';
import type { PillarId, ViewType, AcademicYear, Term } from '@/lib/types';

interface Props {
  selectedPillar: 'all' | PillarId;
  onPillarChange: (p: 'all' | PillarId) => void;
  selectedUnits: string[];
  onUnitsChange: (units: string[]) => void;
}

const PILLAR_IDS: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

export default function PillarFilters({ selectedPillar, onPillarChange, selectedUnits, onUnitsChange }: Props) {
  const { viewType, setViewType, academicYear, setAcademicYear, term, setTerm } = useDashboard();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-border/40 bg-card/30 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Reporting Mode */}
        <Select value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cumulative">Cumulative (SP)</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>

        {/* Academic Year */}
        <Select value={academicYear} onValueChange={(v) => setAcademicYear(v as AcademicYear)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025-2026">AY 2025-2026</SelectItem>
            <SelectItem value="2026-2027">AY 2026-2027</SelectItem>
          </SelectContent>
        </Select>

        {/* Term */}
        <Select value={term} onValueChange={(v) => setTerm(v as Term)}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mid">Mid-Year</SelectItem>
            <SelectItem value="end">End-of-Year</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-border/40 hidden sm:block" />

        {/* Pillar Filter */}
        <Select value={selectedPillar} onValueChange={(v) => onPillarChange(v as 'all' | PillarId)}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="All Pillars" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pillars</SelectItem>
            {PILLAR_IDS.map(p => (
              <SelectItem key={p} value={p}>{PILLAR_SHORT[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Unit Filter */}
        <Select
          value={selectedUnits.length === UNIT_IDS.length ? 'all' : selectedUnits[0] || 'all'}
          onValueChange={(v) => {
            if (v === 'all') onUnitsChange(UNIT_IDS);
            else onUnitsChange([v]);
          }}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Units" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units ({UNIT_IDS.length})</SelectItem>
            {UNIT_IDS.map(id => (
              <SelectItem key={id} value={id}>{UNIT_CONFIGS[id].name} — {UNIT_CONFIGS[id].fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
