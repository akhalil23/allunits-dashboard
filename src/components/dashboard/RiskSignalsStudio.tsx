import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Info, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { ActionItem, ViewType, Term, AcademicYear } from '@/lib/types';
import { getApplicableItems } from '@/lib/intelligence';
import {
  computeRiskSignalDistribution,
  computeNewRiskIndex,
  getEnrichedItems,
  generateNarrative,
  RISK_SIGNAL_COLORS,
  RISK_SIGNAL_ORDER,
  type RiskSignal,
  type RiskSignalDistItem,
} from '@/lib/risk-signals';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  items: ActionItem[];
  viewType: ViewType;
  term: Term;
  academicYear: AcademicYear;
}

// ─── Gauge Component ─────────────────────────────────────────────────────────

function RiskGauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 3) * 100));
  const color = value < 1 ? '#16A34A' : value < 2 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative h-3 rounded-full bg-muted overflow-hidden mt-3">
      {/* Color zones */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-[#16A34A]/20" />
        <div className="flex-1 bg-[#F59E0B]/20" />
        <div className="flex-1 bg-[#EF4444]/20" />
      </div>
      {/* Marker */}
      <motion.div
        className="absolute top-0 h-full w-1 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ left: '0%' }}
        animate={{ left: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

// ─── Stacked Bar Segment ─────────────────────────────────────────────────────

function StackedBar({
  dist,
  applicableCount,
  onSegmentClick,
  activeSignal,
}: {
  dist: RiskSignalDistItem[];
  applicableCount: number;
  onSegmentClick: (signal: RiskSignal | null) => void;
  activeSignal: RiskSignal | null;
}) {
  const segments = dist.filter(d => d.count > 0);

  if (applicableCount === 0) {
    return (
      <div className="h-10 rounded-lg bg-muted flex items-center justify-center">
        <span className="text-sm text-muted-foreground">No Applicable Items for Selected Context</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs font-medium text-muted-foreground">Applicable Items: {applicableCount}</span>
      </div>
      <div className="h-10 rounded-lg overflow-hidden flex cursor-pointer">
        {segments.map(seg => (
          <TooltipProvider key={seg.signal}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  className="h-full flex items-center justify-center transition-opacity"
                  style={{
                    backgroundColor: seg.color,
                    width: `${seg.percent}%`,
                    opacity: activeSignal && activeSignal !== seg.signal ? 0.4 : 1,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${seg.percent}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  onClick={() => onSegmentClick(activeSignal === seg.signal ? null : seg.signal)}
                >
                  {seg.percent >= 12 && (
                    <span className="text-[10px] font-bold text-white drop-shadow-sm">{seg.percent}%</span>
                  )}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-semibold">{seg.signal}</p>
                <p>{seg.count} item(s) — {seg.percent}%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {RISK_SIGNAL_ORDER.map(signal => {
          const item = dist.find(d => d.signal === signal);
          const count = item?.count || 0;
          return (
            <button
              key={signal}
              onClick={() => onSegmentClick(activeSignal === signal ? null : signal)}
              className="flex items-center gap-1.5 text-[11px] hover:opacity-80 transition-opacity"
              style={{ opacity: activeSignal && activeSignal !== signal ? 0.4 : 1 }}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: RISK_SIGNAL_COLORS[signal] }} />
              <span className="text-muted-foreground">{signal.split(' (')[0]}</span>
              <span className="font-semibold text-foreground">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RiskSignalsStudio({ items, viewType, term, academicYear }: Props) {
  const [activeSignal, setActiveSignal] = useState<RiskSignal | null>(null);
  const [tableOpen, setTableOpen] = useState(false);

  const applicableItems = useMemo(() => getApplicableItems(items, viewType, term, academicYear), [items, viewType, term, academicYear]);
  const dist = useMemo(() => computeRiskSignalDistribution(items, viewType, term, academicYear), [items, viewType, term, academicYear]);
  const riskIndex = useMemo(() => computeNewRiskIndex(items, viewType, term, academicYear), [items, viewType, term, academicYear]);
  const narrative = useMemo(() => generateNarrative(dist, riskIndex, applicableItems.length), [dist, riskIndex, applicableItems.length]);
  const enrichedItems = useMemo(() => getEnrichedItems(items, viewType, term, academicYear), [items, viewType, term, academicYear]);

  const filteredTableItems = useMemo(() => {
    if (!activeSignal) return enrichedItems;
    return enrichedItems.filter(i => i.riskSignal === activeSignal);
  }, [enrichedItems, activeSignal]);

  // Empty state
  if (applicableItems.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <SectionHeader />
        <div className="card-elevated p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">No Applicable Items for Selected Context</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Risk signals require at least one applicable action item.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-5">
      <SectionHeader />

      {/* Top Row: Risk Index + Narrative */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Risk Index Card */}
        <div className="card-elevated p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent pointer-events-none" />
          <div className="relative">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Index</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-5xl font-display font-bold ${riskIndex < 1 ? 'text-[#16A34A]' : riskIndex < 2 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                {riskIndex.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">/ 3.00</span>
            </div>
            <RiskGauge value={riskIndex} />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-muted-foreground">Scale: 0 (low) → 3 (high)</span>
              <span className="text-[10px] text-muted-foreground">{applicableItems.length} applicable items</span>
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-2 italic">Compact average measure. Use the distribution below for the full picture.</p>
          </div>
        </div>

        {/* Narrative Card */}
        <div className="card-elevated p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Executive Summary</span>
            <p className="text-sm text-foreground leading-relaxed mt-3">{narrative}</p>
          </div>
          {/* Distribution Notes */}
          <div className="mt-4 pt-3 border-t border-border space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Signal Definitions</span>
            <ul className="space-y-0.5 text-[10px] text-muted-foreground">
              <li>• <strong className="text-foreground">No Risk</strong> — on-target completion.</li>
              <li>• <strong className="text-foreground">Emerging Risk</strong> — active execution needing attention.</li>
              <li>• <strong className="text-foreground">Critical Risk</strong> — inactivity or stalled execution requiring close attention.</li>
              <li>• <strong className="text-foreground">Realized Risk</strong> — below-target completion requiring mitigation strategy.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stacked Bar Chart */}
      <div className="card-elevated p-6">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-4">Risk Signal Distribution</span>
        <StackedBar
          dist={dist}
          applicableCount={applicableItems.length}
          onSegmentClick={setActiveSignal}
          activeSignal={activeSignal}
        />
      </div>

      {/* Drill-Down Table */}
      <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
        <div className="card-elevated overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Items in {activeSignal ? activeSignal.split(' (')[0] : 'All Risk Signals'}
                </span>
                <span className="text-[10px] text-muted-foreground">({filteredTableItems.length} items)</span>
              </div>
              {tableOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="max-h-[420px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Action Step</TableHead>
                    <TableHead className="text-[10px] w-16">Pillar</TableHead>
                    <TableHead className="text-[10px]">Status</TableHead>
                    <TableHead className="text-[10px] w-16 text-right">%</TableHead>
                    <TableHead className="text-[10px]">Risk Signal</TableHead>
                    <TableHead className="text-[10px] w-16">Doc</TableHead>
                    <TableHead className="text-[10px] w-20">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTableItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                        No items match the selected filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTableItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="text-[11px] text-foreground max-w-[240px] truncate">{item.actionStep}</TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">{item.pillar}</TableCell>
                        <TableCell className="text-[11px] text-foreground">{item.status}</TableCell>
                        <TableCell className="text-[11px] text-right text-foreground">{item.completion}%</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RISK_SIGNAL_COLORS[item.riskSignal] }} />
                            <span className="text-[10px] text-foreground">{item.riskSignal.split(' (')[0]}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.supportingDoc ? (
                            <a href={item.supportingDoc} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">P{item.pillar}-R{item.sheetRow}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </motion.div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader() {
  return (
    <div className="space-y-1 px-1">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Risk Signals Overview</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help transition-colors" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
              <p>Decision-support view derived from execution status (read-only). Signals summarize status; validate with unit owners.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-[10px] text-muted-foreground italic">Decision-support only. Signals summarize execution status and should be validated with unit owners.</p>
    </div>
  );
}
