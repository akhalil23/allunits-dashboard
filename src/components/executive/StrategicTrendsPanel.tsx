/**
 * Strategic Delivery & Trajectory Explorer
 * Global analytical sliding panel accessible from all executive pages.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUniversityData } from '@/hooks/use-university-data';
import { aggregateByPillar, getRiskBandColor, type UniversityAggregation } from '@/lib/university-aggregation';
import { getUnitDisplayName } from '@/lib/unit-config';
import { PILLAR_LABELS, getPillarBudget } from '@/lib/budget-data';
import { PILLAR_SHORT, PILLAR_FULL } from '@/lib/pillar-labels';
import type { PillarId } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  aggregation: UniversityAggregation;
}

type Indicator = 'completion' | 'riskIndex' | 'budgetUtilization';
type Level = 'university' | 'pillar' | 'unit';

export default function StrategicTrendsPanel({ open, onClose, aggregation }: Props) {
  const [indicator, setIndicator] = useState<Indicator>('completion');
  const [level, setLevel] = useState<Level>('university');
  const [guideOpen, setGuideOpen] = useState(false);
  const { viewType, term, academicYear } = useDashboard();
  const { data: unitResults } = useUniversityData();

  const pillarAgg = useMemo(() => unitResults ? aggregateByPillar(unitResults, viewType, term, academicYear) : [], [unitResults, viewType, term, academicYear]);

  // Simulated trend data (current snapshot as single point + projected)
  const trendData = useMemo(() => {
    const points = [
      { period: 'Mid 25-26', value: null as number | null },
      { period: 'End 25-26', value: null as number | null },
      { period: 'Mid 26-27', value: null as number | null },
      { period: 'End 26-27', value: null as number | null },
    ];

    const currentIdx = term === 'mid' && academicYear === '2025-2026' ? 0
      : term === 'end' && academicYear === '2025-2026' ? 1
      : term === 'mid' && academicYear === '2026-2027' ? 2 : 3;

    if (level === 'university') {
      const val = indicator === 'completion' ? aggregation.completionPct
        : indicator === 'riskIndex' ? aggregation.riskIndex
        : 64.2; // mock budget utilization
      points[currentIdx] = { ...points[currentIdx], value: val };
    }

    return points;
  }, [indicator, level, aggregation, term, academicYear]);

  const currentValue = trendData.find(p => p.value !== null)?.value;

  // Momentum indicators per pillar
  const momentum = useMemo(() => {
    return pillarAgg.map(p => ({
      pillar: p.pillar,
      label: PILLAR_SHORT[p.pillar],
      fullLabel: PILLAR_FULL[p.pillar],
      completion: p.completionPct,
      riskIndex: p.riskIndex,
      // Mock deltas (in real app, compare with previous snapshot)
      completionDelta: Math.round((Math.random() - 0.4) * 10),
      riskDelta: parseFloat(((Math.random() - 0.5) * 0.4).toFixed(2)),
    }));
  }, [pillarAgg]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display font-bold text-base text-foreground">Strategic Delivery & Trajectory Explorer</h2>
                  <p className="text-xs text-muted-foreground mt-1">Analyze how strategic performance evolves across reporting cycles.</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="px-6 py-4 space-y-4 border-b border-border">
              <ControlGroup label="Indicator">
                <Pill active={indicator === 'completion'} onClick={() => setIndicator('completion')}>Completion</Pill>
                <Pill active={indicator === 'riskIndex'} onClick={() => setIndicator('riskIndex')}>RI (Risk Index)</Pill>
                <Pill active={indicator === 'budgetUtilization'} onClick={() => setIndicator('budgetUtilization')}>Budget Utilization</Pill>
              </ControlGroup>
              <ControlGroup label="Level">
                <Pill active={level === 'university'} onClick={() => setLevel('university')}>University</Pill>
                <Pill active={level === 'pillar'} onClick={() => setLevel('pillar')}>Pillar</Pill>
                <Pill active={level === 'unit'} onClick={() => setLevel('unit')}>Unit</Pill>
              </ControlGroup>
              <ControlGroup label="Timeframe">
                <span className="text-xs text-foreground font-medium px-2 py-1 rounded bg-muted">
                  {term === 'mid' ? 'Mid-Year' : 'End-Year'} • AY {academicYear}
                </span>
              </ControlGroup>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Trend Chart */}
              <div className="card-elevated p-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {indicator === 'completion' ? 'Completion' : indicator === 'riskIndex' ? 'RI (Risk Index)' : 'Budget Utilization'} Trend
                </span>
                {currentValue !== null && currentValue !== undefined && (
                  <p className="text-2xl font-display font-bold mt-1" style={{ color: indicator === 'riskIndex' ? getRiskBandColor(currentValue) : 'hsl(var(--primary))' }}>
                    {indicator === 'riskIndex' ? `RI ${currentValue.toFixed(2)}` : `${currentValue}%`}
                  </p>
                )}
                <div className="h-48 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData.filter(d => d.value !== null)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={indicator === 'riskIndex' ? [0, 3] : [0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <ReTooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(v: number) => [indicator === 'riskIndex' ? `RI ${v.toFixed(2)}` : `${v}%`, '']} />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 5, fill: 'hsl(var(--primary))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic">
                  Currently showing single-snapshot data. Multi-period comparison will be available when historical snapshots are captured.
                </p>
              </div>

              {/* Momentum Indicators */}
              <div className="card-elevated p-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">Momentum Indicators by Pillar</span>
                <div className="space-y-2">
                  {momentum.map(m => (
                    <div key={m.pillar} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs font-semibold text-foreground w-36 truncate cursor-help">{m.label}</span>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">{m.fullLabel}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="flex-1 flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">Completion</span>
                          <DeltaArrow value={m.completionDelta} suffix="%" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">RI</span>
                          <DeltaArrow value={m.riskDelta} invert />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interpretation Guide */}
              <div className="card-elevated p-4">
                <button
                  onClick={() => setGuideOpen(!guideOpen)}
                  className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  <span className="flex items-center gap-2"><Info className="w-3.5 h-3.5" /> Interpretation Guide</span>
                  {guideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <AnimatePresence>
                  {guideOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 space-y-2 text-xs text-muted-foreground">
                        <p><strong className="text-foreground">How trajectory analysis works:</strong> This tool tracks the evolution of key performance indicators across reporting cycles (Mid-Year and End-Year for each academic year).</p>
                        <p><strong className="text-foreground">Interpreting RI movement:</strong> A decreasing Risk Index alongside increasing Completion indicates healthy execution progress. If RI increases while Completion stagnates, it signals growing structural risk.</p>
                        <p><strong className="text-foreground">Budget Utilization trends:</strong> Rising utilization with flat completion may indicate cost overruns. Balanced growth in both metrics suggests efficient resource deployment.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground font-medium w-20 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border ${
        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

function DeltaArrow({ value, suffix = '', invert = false }: { value: number; suffix?: string; invert?: boolean }) {
  const isPositive = invert ? value < 0 : value > 0;
  const isNegative = invert ? value > 0 : value < 0;
  const color = isPositive ? '#16A34A' : isNegative ? '#EF4444' : 'hsl(var(--muted-foreground))';
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color }}>
      <Icon className="w-3 h-3" />
      {value > 0 ? '+' : ''}{value}{suffix}
    </span>
  );
}
