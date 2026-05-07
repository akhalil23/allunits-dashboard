/**
 * Section 5: Risk & Attention Signals for Pillar Champions
 */

import { useMemo } from 'react';
import { AlertTriangle, TrendingDown, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { PILLAR_COLORS } from '@/lib/pillar-colors';
import { PILLAR_ABBREV } from '@/lib/pillar-labels';
import { getRiskDisplayInfo } from '@/lib/risk-display';
import { getItemStatus, getItemCompletion, computeExpectedProgress } from '@/lib/intelligence';
import { isNotApplicableStatus } from '@/lib/types';
import { mapItemToRiskSignal, RISK_SIGNAL_COLORS, RISK_SIGNAL_ORDER, type RiskSignal } from '@/lib/risk-signals';
import { getUnitDisplayName } from '@/lib/unit-config';
import { getLivePillarBudget, formatCurrency, computeBudgetHealth, computeSpendingHealth } from '@/lib/budget-data';
import type { UnitFetchResult } from '@/lib/university-aggregation';
import type { PillarId, ViewType, Term, AcademicYear } from '@/lib/types';
import type { BudgetDataResult } from '@/hooks/use-budget-data';

interface Props {
  unitResults: UnitFetchResult[];
  budgetResult: BudgetDataResult | undefined;
  viewType: ViewType;
  term: Term;
  academicYear: AcademicYear;
  selectedPillar: 'all' | PillarId;
  selectedUnits: string[];
}

interface AttentionItem {
  unitId: string;
  unitName: string;
  pillar: PillarId;
  actionStep: string;
  status: string;
  completion: number;
  executionGap: number;
  riskSignal: RiskSignal;
}

export default function PillarRiskSignals({ unitResults, budgetResult, viewType, term, academicYear, selectedPillar, selectedUnits }: Props) {
  const filtered = useMemo(() => unitResults.filter(u => selectedUnits.includes(u.unitId) && u.result), [unitResults, selectedUnits]);
  const expectedProgress = useMemo(() => computeExpectedProgress(viewType, academicYear), [viewType, academicYear]);

  // Collect attention items (Critical + Realized)
  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = [];
    filtered.forEach(ur => {
      ur.result!.data.forEach(item => {
        if (selectedPillar !== 'all' && item.pillar !== selectedPillar) return;
        const status = getItemStatus(item, viewType, term, academicYear);
        if (isNotApplicableStatus(status)) return;
        const completion = getItemCompletion(item, viewType, term, academicYear);
        const completionValid = typeof completion === 'number' && completion >= 0 && completion <= 100;
        const signal = mapItemToRiskSignal(status, completion, completionValid, expectedProgress);
        if (signal === 'Critical Risk (Needs Close Attention)' || signal === 'Realized Risk (Needs Mitigation Strategy)') {
          items.push({
            unitId: ur.unitId,
            unitName: getUnitDisplayName(ur.unitId),
            pillar: item.pillar,
            actionStep: item.actionStep,
            status,
            completion,
            executionGap: parseFloat((completion - expectedProgress).toFixed(1)),
            riskSignal: signal,
          });
        }
      });
    });
    return items.sort((a, b) => {
      if (a.riskSignal !== b.riskSignal) return a.riskSignal.includes('Realized') ? -1 : 1;
      return a.executionGap - b.executionGap;
    });
  }, [filtered, selectedPillar, viewType, term, academicYear, expectedProgress]);

  // Units most behind (by risk index)
  const unitRiskRanking = useMemo(() => {
    const map = new Map<string, { unitId: string; name: string; applicable: number; noRisk: number; emerging: number; critical: number; realized: number }>();
    filtered.forEach(ur => {
      const entry = { unitId: ur.unitId, name: getUnitDisplayName(ur.unitId), applicable: 0, noRisk: 0, emerging: 0, critical: 0, realized: 0 };
      ur.result!.data.forEach(item => {
        if (selectedPillar !== 'all' && item.pillar !== selectedPillar) return;
        const status = getItemStatus(item, viewType, term, academicYear);
        if (isNotApplicableStatus(status)) return;
        entry.applicable++;
        const completion = getItemCompletion(item, viewType, term, academicYear);
        const signal = mapItemToRiskSignal(status, completion, typeof completion === 'number' && completion >= 0 && completion <= 100, expectedProgress);
        switch (signal) {
          case 'No Risk (On Track)': entry.noRisk++; break;
          case 'Emerging Risk (Needs Attention)': entry.emerging++; break;
          case 'Critical Risk (Needs Close Attention)': entry.critical++; break;
          case 'Realized Risk (Needs Mitigation Strategy)': entry.realized++; break;
        }
      });
      if (entry.applicable > 0) map.set(ur.unitId, entry);
    });
    return Array.from(map.values())
      .map(u => ({ ...u, ri: u.applicable > 0 ? parseFloat(((0 * u.noRisk + 1 * u.emerging + 2 * u.critical + 3 * u.realized) / u.applicable).toFixed(2)) : 0 }))
      .sort((a, b) => b.ri - a.ri)
      .slice(0, 10);
  }, [filtered, selectedPillar, viewType, term, academicYear, expectedProgress]);

  // Budget concerns
  const budgetConcerns = useMemo(() => {
    const pillars = selectedPillar === 'all' ? (['I', 'II', 'III', 'IV', 'V'] as PillarId[]) : [selectedPillar];
    return pillars.map(p => {
      const b = getLivePillarBudget(budgetResult?.pillars, p);
      const commitRatio = b.allocation > 0 ? b.committed / b.allocation : 0;
      const spendRatio = b.allocation > 0 ? b.spent / b.allocation : 0;
      const bHealth = computeBudgetHealth(b.available, b.allocation);
      return { pillar: p, commitRatio, spendRatio, health: bHealth.health, color: bHealth.color, allocation: b.allocation };
    }).filter(b => b.health === 'No Commitment Yet' || b.health === 'Light Commitment');
  }, [budgetResult, selectedPillar]);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SignalCard icon={ShieldAlert} title="Critical & Realized Items" value={attentionItems.length} color="#DC2626" subtitle="Items requiring immediate attention" />
        <SignalCard icon={TrendingDown} title="Units at Elevated Risk" value={unitRiskRanking.filter(u => u.ri > 0.75).length} color="#F97316" subtitle="Units with RI > 25%" />
        <SignalCard icon={AlertTriangle} title="Budget Concerns" value={budgetConcerns.length} color="#D97706" subtitle="Pillars with light or no commitment" />
      </div>

      {/* Top Risk Items Table */}
      {attentionItems.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border/30">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Items Requiring Attention</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/20">
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Pillar</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Unit</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Action Step</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Status</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Completion</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Gap</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Signal</th>
                </tr>
              </thead>
              <tbody>
                {attentionItems.slice(0, 20).map((item, i) => (
                  <tr key={i} className="border-t border-border/20 hover:bg-muted/10">
                    <td className="px-4 py-2.5">
                      <span className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: PILLAR_COLORS[item.pillar] }}>{PILLAR_ABBREV[item.pillar]}</span>
                    </td>
                    <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{item.unitName}</td>
                    <td className="px-3 py-2.5 text-foreground max-w-[250px] truncate">{item.actionStep}</td>
                    <td className="px-3 py-2.5 text-center text-muted-foreground">{item.status}</td>
                    <td className="px-3 py-2.5 text-center font-semibold text-foreground">{item.completion}%</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="font-semibold" style={{ color: item.executionGap >= 5 ? '#16A34A' : item.executionGap <= -5 ? '#DC2626' : '#D97706' }}>{item.executionGap > 0 ? '+' : ''}{item.executionGap}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: RISK_SIGNAL_COLORS[item.riskSignal] }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {attentionItems.length > 20 && (
            <div className="px-5 py-2 text-[10px] text-muted-foreground border-t border-border/30">
              Showing 20 of {attentionItems.length} items
            </div>
          )}
        </div>
      )}

      {/* Unit Risk Ranking */}
      {unitRiskRanking.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Unit Risk Ranking</h4>
          <div className="space-y-2">
            {unitRiskRanking.map(u => {
              const ri = getRiskDisplayInfo(u.ri);
              const pct = parseFloat(((u.ri / 3) * 100).toFixed(1));
              return (
                <div key={u.unitId} className="flex items-center gap-3">
                  <span className="text-xs text-foreground font-medium w-20 truncate">{u.name}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden bg-muted/30">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: ri.color }} />
                  </div>
                  <span className="text-[10px] font-bold w-12 text-right" style={{ color: ri.color }}>{ri.percent}%</span>
                  <span className="text-[10px] text-muted-foreground w-16">{ri.band}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Budget Concerns */}
      {budgetConcerns.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Budget Execution Concerns</h4>
          <div className="space-y-2">
            {budgetConcerns.map(b => (
              <div key={b.pillar} className="flex items-center gap-3 text-xs">
                <span className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: PILLAR_COLORS[b.pillar] }}>{PILLAR_ABBREV[b.pillar]}</span>
                <span className="text-foreground flex-1">{b.health}</span>
                <span className="text-muted-foreground">Commit: {(b.commitRatio * 100).toFixed(1)}%</span>
                <span className="text-muted-foreground">Spend: {(b.spendRatio * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {attentionItems.length === 0 && unitRiskRanking.every(u => u.ri <= 0.75) && budgetConcerns.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">No significant risk or attention signals detected for the selected scope.</div>
      )}
    </div>
  );
}

function SignalCard({ icon: Icon, title, value, color, subtitle }: { icon: React.ElementType; title: string; value: number; color: string; subtitle: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/60 bg-card shadow-sm p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-display font-extrabold" style={{ color }}>{value}</p>
        <p className="text-[10px] text-muted-foreground">{title}</p>
        <p className="text-[9px] text-muted-foreground/70">{subtitle}</p>
      </div>
    </motion.div>
  );
}
