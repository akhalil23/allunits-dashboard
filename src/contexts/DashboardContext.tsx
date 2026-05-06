import { createContext, useContext, useState, type ReactNode } from 'react';
import type { DashboardFilters, PillarId, ViewMode, ViewType, AcademicYear, Term } from '@/lib/types';

type PillarSelection = 'all' | PillarId | 'guide';

interface DashboardCtx extends Omit<DashboardFilters, 'selectedPillar'> {
  selectedPillar: PillarSelection;
  setViewMode: (m: ViewMode) => void;
  setViewType: (v: ViewType) => void;
  setAcademicYear: (y: AcademicYear) => void;
  setTerm: (t: Term) => void;
  setSelectedPillar: (p: PillarSelection) => void;
}

const DashboardContext = createContext<DashboardCtx | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('basic');
  const [viewType, setViewType] = useState<ViewType>('cumulative');
  const [academicYear, setAcademicYear] = useState<AcademicYear>('2025-2026');
  const [term, setTerm] = useState<Term>('end');
  const [selectedPillar, setSelectedPillar] = useState<'all' | PillarId | 'guide'>('all');

  return (
    <DashboardContext.Provider value={{
      viewMode, viewType, academicYear, term, selectedPillar,
      setViewMode, setViewType, setAcademicYear, setTerm, setSelectedPillar,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be within DashboardProvider');
  return ctx;
}
