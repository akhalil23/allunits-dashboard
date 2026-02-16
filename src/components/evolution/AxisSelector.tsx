import type { AcademicYear, Term, ViewType } from '@/lib/types';

export interface AxisConfig {
  academicYear: AcademicYear;
  term: Term;
  viewType: ViewType;
}

interface Props {
  label: string;
  accent: string;
  config: AxisConfig;
  onChange: (config: AxisConfig) => void;
}

const years: AcademicYear[] = ['2025-2026', '2026-2027'];
const terms: [Term, string][] = [['mid', 'Mid-Year'], ['end', 'End-of-Year']];
const views: [ViewType, string][] = [['cumulative', 'Cumulative (SP)'], ['yearly', 'Yearly']];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:border-primary/40'
      }`}
    >
      {children}
    </button>
  );
}

export default function AxisSelector({ label, accent, config, onChange }: Props) {
  return (
    <div className="card-elevated p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${accent}`} />
        <span className="text-sm font-display font-semibold text-foreground">{label}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-8 shrink-0">AY</span>
          <div className="flex gap-1">
            {years.map(y => (
              <Chip key={y} active={config.academicYear === y} onClick={() => onChange({ ...config, academicYear: y })}>
                {y}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-8 shrink-0">Term</span>
          <div className="flex gap-1">
            {terms.map(([t, l]) => (
              <Chip key={t} active={config.term === t} onClick={() => onChange({ ...config, term: t })}>
                {l}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-8 shrink-0">View</span>
          <div className="flex gap-1">
            {views.map(([v, l]) => (
              <Chip key={v} active={config.viewType === v} onClick={() => onChange({ ...config, viewType: v })}>
                {l}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
