/**
 * University-Level Aggregation Engine
 * ────────────────────────────────────
 * Deterministic, count-based aggregation from raw unit data.
 * NEVER averages unit-level RiskIndex values.
 * All computations use APPLICABLE_ITEMS denominator.
 */

/** Largest-remainder (Hamilton) rounding: floors all values then distributes remainder to largest fractional parts. */
function largestRemainderRound(counts: number[], total: number, target: number): number[] {
  if (total <= 0) return counts.map(() => 0);
  const exact = counts.map(c => (c / total) * target);
  const floored = exact.map(Math.floor);
  let remainder = target - floored.reduce((a, b) => a + b, 0);
  const indices = exact.map((e, i) => ({ i, frac: e - floored[i] })).sort((a, b) => b.frac - a.frac);
  for (const { i } of indices) {
    if (remainder <= 0) break;
    floored[i]++;
    remainder--;
  }
  return floored;
}

import type { ActionItem, ViewType, Term, AcademicYear, PillarId } from './types';
import type { FetchResult } from './types';
import { getItemStatus, getItemCompletion, getApplicableItems } from './intelligence';
import { mapItemToRiskSignal, RISK_SIGNAL_WEIGHTS, RISK_SIGNAL_ORDER, RISK_SIGNAL_COLORS, type RiskSignal } from './risk-signals';
import { isNotApplicableStatus } from './types';

// ─── Core Types ──────────────────────────────────────────────────────────────

export interface UnitFetchResult {
  unitId: string;
  unitName: string;
  result: FetchResult | null;
  error: string | null;
}

export interface RiskCounts {
  noRisk: number;
  emerging: number;
  critical: number;
  realized: number;
  notApplicable: number;
}

export interface UnitAggregation {
  unitId: string;
  unitName: string;
  totalItems: number;
  naCount: number;
  applicableItems: number;
  cotCount: number;
  cbtCount: number;
  inProgressCount: number;
  notStartedCount: number;
  completionPct: number;
  onTrackPct: number;
  belowTargetPct: number;
  riskCounts: RiskCounts;
  riskIndex: number;
}

export interface UniversityAggregation {
  totalUnits: number;
  loadedUnits: number;
  failedUnits: string[];
  totalItems: number;
  naCount: number;
  applicableItems: number;
  cotCount: number;
  cbtCount: number;
  inProgressCount: number;
  notStartedCount: number;
  completionPct: number;
  onTrackPct: number;
  belowTargetPct: number;
  riskCounts: RiskCounts;
  riskIndex: number;
  unitAggregations: UnitAggregation[];
  riskDistribution: { signal: RiskSignal; count: number; percent: number; color: string }[];
  topRiskiestUnits: UnitAggregation[];
}

// ─── Risk Index Band ─────────────────────────────────────────────────────────

export type RiskBand = 'green' | 'amber' | 'orange' | 'red';

export function getRiskBand(riskIndex: number): RiskBand {
  if (riskIndex <= 0.75) return 'green';
  if (riskIndex <= 1.50) return 'amber';
  if (riskIndex <= 2.25) return 'orange';
  return 'red';
}

export const RISK_BAND_COLORS: Record<RiskBand, string> = {
  green: '#16A34A',
  amber: '#F59E0B',
  orange: '#F97316',
  red: '#EF4444',
};

export function getRiskBandColor(riskIndex: number): string {
  return RISK_BAND_COLORS[getRiskBand(riskIndex)];
}

// ─── Count Risk Signals for Items ────────────────────────────────────────────

function countRiskSignals(
  items: ActionItem[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): RiskCounts {
  const counts: RiskCounts = { noRisk: 0, emerging: 0, critical: 0, realized: 0, notApplicable: 0 };

  items.forEach(item => {
    const status = getItemStatus(item, viewType, term, academicYear);
    if (isNotApplicableStatus(status)) {
      counts.notApplicable++;
      return;
    }
    const completion = getItemCompletion(item, viewType, term, academicYear);
    const completionValid = typeof completion === 'number' && completion >= 0 && completion <= 100;
    const signal = mapItemToRiskSignal(status, completion, completionValid);

    switch (signal) {
      case 'No Risk (On Track)': counts.noRisk++; break;
      case 'Emerging Risk (Needs Attention)': counts.emerging++; break;
      case 'Critical Risk (Needs Close Attention)': counts.critical++; break;
      case 'Realized Risk (Needs Mitigation Strategy)': counts.realized++; break;
      default: counts.notApplicable++;
    }
  });

  return counts;
}

function countStatuses(
  items: ActionItem[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): { cot: number; cbt: number; inProgress: number; notStarted: number; na: number } {
  let cot = 0, cbt = 0, inProgress = 0, notStarted = 0, na = 0;

  items.forEach(item => {
    const status = getItemStatus(item, viewType, term, academicYear);
    if (isNotApplicableStatus(status)) { na++; return; }
    switch (status) {
      case 'Completed – On Target': cot++; break;
      case 'Completed – Below Target': cbt++; break;
      case 'In Progress': inProgress++; break;
      case 'Not Started': notStarted++; break;
      default: na++;
    }
  });

  return { cot, cbt, inProgress, notStarted, na };
}

/**
 * Compute the average target-achievement completion across applicable items.
 * Rules:
 *   COT → 100%, CBT → 0%, In Progress → actual %, Not Started → 0%
 */
function computeAvgCompletion(
  items: ActionItem[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): number {
  let sum = 0;
  let applicable = 0;

  items.forEach(item => {
    const status = getItemStatus(item, viewType, term, academicYear);
    if (isNotApplicableStatus(status)) return;
    applicable++;
    switch (status) {
      case 'Completed – On Target':
        sum += 100;
        break;
      case 'Completed – Below Target':
        // Target not achieved → 0%
        sum += 0;
        break;
      case 'In Progress':
        sum += getItemCompletion(item, viewType, term, academicYear);
        break;
      case 'Not Started':
        sum += 0;
        break;
    }
  });

  if (applicable === 0) return 0;
  return parseFloat((sum / applicable).toFixed(1));
}

// ─── Compute RiskIndex from raw counts ───────────────────────────────────────

export function computeRiskIndexFromCounts(counts: RiskCounts): number {
  const applicable = counts.noRisk + counts.emerging + counts.critical + counts.realized;
  if (applicable === 0) return 0;
  const weighted = (0 * counts.noRisk) + (1 * counts.emerging) + (2 * counts.critical) + (3 * counts.realized);
  return parseFloat((weighted / applicable).toFixed(2));
}

// ─── Aggregate Single Unit ───────────────────────────────────────────────────

export function aggregateUnit(
  unitId: string,
  unitName: string,
  items: ActionItem[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): UnitAggregation {
  const statusCounts = countStatuses(items, viewType, term, academicYear);
  const riskCounts = countRiskSignals(items, viewType, term, academicYear);
  const applicableItems = items.length - statusCounts.na;
  const denom = applicableItems || 1;

  return {
    unitId,
    unitName,
    totalItems: items.length,
    naCount: statusCounts.na,
    applicableItems,
    cotCount: statusCounts.cot,
    cbtCount: statusCounts.cbt,
    inProgressCount: statusCounts.inProgress,
    notStartedCount: statusCounts.notStarted,
    completionPct: computeAvgCompletion(items, viewType, term, academicYear),
    onTrackPct: parseFloat((statusCounts.cot / denom * 100).toFixed(1)),
    belowTargetPct: parseFloat((statusCounts.cbt / denom * 100).toFixed(1)),
    riskCounts,
    riskIndex: computeRiskIndexFromCounts(riskCounts),
  };
}

// ─── Aggregate University (sum raw counts) ───────────────────────────────────

export function aggregateUniversity(
  unitResults: UnitFetchResult[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): UniversityAggregation {
  const unitAggregations: UnitAggregation[] = [];
  const failedUnits: string[] = [];
  let loadedUnits = 0;

  let totalItems = 0, totalNa = 0;
  let totalCot = 0, totalCbt = 0, totalInProgress = 0, totalNotStarted = 0;
  const totalRiskCounts: RiskCounts = { noRisk: 0, emerging: 0, critical: 0, realized: 0, notApplicable: 0 };

  unitResults.forEach(ur => {
    if (!ur.result || ur.error) {
      failedUnits.push(ur.unitId);
      return;
    }

    loadedUnits++;
    const agg = aggregateUnit(ur.unitId, ur.unitName, ur.result.data, viewType, term, academicYear);
    unitAggregations.push(agg);

    totalItems += agg.totalItems;
    totalNa += agg.naCount;
    totalCot += agg.cotCount;
    totalCbt += agg.cbtCount;
    totalInProgress += agg.inProgressCount;
    totalNotStarted += agg.notStartedCount;

    totalRiskCounts.noRisk += agg.riskCounts.noRisk;
    totalRiskCounts.emerging += agg.riskCounts.emerging;
    totalRiskCounts.critical += agg.riskCounts.critical;
    totalRiskCounts.realized += agg.riskCounts.realized;
    totalRiskCounts.notApplicable += agg.riskCounts.notApplicable;
  });

  const applicableItems = totalItems - totalNa;
  const denom = applicableItems || 1;
  const riskIndex = computeRiskIndexFromCounts(totalRiskCounts);

  // Largest-remainder rounding so percentages always sum to exactly 100%
  const rawCounts = RISK_SIGNAL_ORDER.map(signal => {
    switch (signal) {
      case 'No Risk (On Track)': return totalRiskCounts.noRisk;
      case 'Emerging Risk (Needs Attention)': return totalRiskCounts.emerging;
      case 'Critical Risk (Needs Close Attention)': return totalRiskCounts.critical;
      case 'Realized Risk (Needs Mitigation Strategy)': return totalRiskCounts.realized;
      default: return 0;
    }
  });

  const roundedPcts = largestRemainderRound(rawCounts, applicableItems, 100);

  const riskDistribution = RISK_SIGNAL_ORDER.map((signal, i) => ({
    signal,
    count: rawCounts[i],
    percent: roundedPcts[i],
    color: RISK_SIGNAL_COLORS[signal],
  }));

  const topRiskiestUnits = [...unitAggregations]
    .filter(u => u.applicableItems > 0)
    .sort((a, b) => b.riskIndex - a.riskIndex || a.unitName.localeCompare(b.unitName))
    .slice(0, 3);

  return {
    totalUnits: unitResults.length,
    loadedUnits,
    failedUnits,
    totalItems,
    naCount: totalNa,
    applicableItems,
    cotCount: totalCot,
    cbtCount: totalCbt,
    inProgressCount: totalInProgress,
    notStartedCount: totalNotStarted,
    completionPct: parseFloat(((totalCot + totalCbt) / denom * 100).toFixed(1)),
    onTrackPct: parseFloat((totalCot / denom * 100).toFixed(1)),
    belowTargetPct: parseFloat((totalCbt / denom * 100).toFixed(1)),
    riskCounts: totalRiskCounts,
    riskIndex,
    unitAggregations,
    riskDistribution,
    topRiskiestUnits,
  };
}

// ─── Per-Pillar Aggregation (across all units) ──────────────────────────────

export interface PillarAggregation {
  pillar: PillarId;
  riskCounts: RiskCounts;
  riskIndex: number;
  applicableItems: number;
  completionPct: number;
}

export function aggregateByPillar(
  unitResults: UnitFetchResult[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): PillarAggregation[] {
  const pillarIds: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

  return pillarIds.map(pillar => {
    const allPillarItems: ActionItem[] = [];
    unitResults.forEach(ur => {
      if (!ur.result) return;
      allPillarItems.push(...ur.result.data.filter(i => i.pillar === pillar));
    });

    const riskCounts = countRiskSignals(allPillarItems, viewType, term, academicYear);
    const statusCounts = countStatuses(allPillarItems, viewType, term, academicYear);
    const applicableItems = allPillarItems.length - statusCounts.na;
    const denom = applicableItems || 1;

    return {
      pillar,
      riskCounts,
      riskIndex: computeRiskIndexFromCounts(riskCounts),
      applicableItems,
      completionPct: parseFloat(((statusCounts.cot + statusCounts.cbt) / denom * 100).toFixed(1)),
    };
  });
}

// ─── Per-Unit-Per-Pillar Aggregation (for heat map) ─────────────────────────

export interface UnitPillarCell {
  unitId: string;
  unitName: string;
  pillar: PillarId;
  riskCounts: RiskCounts;
  riskIndex: number;
  applicableItems: number;
  completionPct: number;
}

export function aggregateUnitByPillar(
  unitResults: UnitFetchResult[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear
): UnitPillarCell[] {
  const pillarIds: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];
  const cells: UnitPillarCell[] = [];

  unitResults.forEach(ur => {
    if (!ur.result) return;
    pillarIds.forEach(pillar => {
      const items = ur.result!.data.filter(i => i.pillar === pillar);
      const riskCounts = countRiskSignals(items, viewType, term, academicYear);
      const statusCounts = countStatuses(items, viewType, term, academicYear);
      const applicableItems = items.length - statusCounts.na;
      const denom = applicableItems || 1;
      cells.push({
        unitId: ur.unitId,
        unitName: ur.unitName,
        pillar,
        riskCounts,
        riskIndex: computeRiskIndexFromCounts(riskCounts),
        applicableItems,
        completionPct: parseFloat(((statusCounts.cot + statusCounts.cbt) / denom * 100).toFixed(1)),
      });
    });
  });

  return cells;
}

// ─── Exception Flags (Critical + Realized items) ────────────────────────────

export interface ExceptionFlag {
  unitId: string;
  unitName: string;
  pillar: PillarId;
  actionStep: string;
  status: string;
  completion: number;
  riskSignal: RiskSignal;
  riskWeight: number;
  sheetRow: number;
}

export function getExceptionFlags(
  unitResults: UnitFetchResult[],
  viewType: ViewType,
  term: Term,
  academicYear: AcademicYear,
  limit: number = 10
): ExceptionFlag[] {
  const flags: ExceptionFlag[] = [];

  unitResults.forEach(ur => {
    if (!ur.result) return;
    ur.result.data.forEach(item => {
      const status = getItemStatus(item, viewType, term, academicYear);
      if (isNotApplicableStatus(status)) return;
      const completion = getItemCompletion(item, viewType, term, academicYear);
      const completionValid = typeof completion === 'number' && completion >= 0 && completion <= 100;
      const signal = mapItemToRiskSignal(status, completion, completionValid);

      if (signal === 'Critical Risk (Needs Close Attention)' || signal === 'Realized Risk (Needs Mitigation Strategy)') {
        flags.push({
          unitId: ur.unitId,
          unitName: ur.unitName,
          pillar: item.pillar,
          actionStep: item.actionStep,
          status,
          completion,
          riskSignal: signal,
          riskWeight: RISK_SIGNAL_WEIGHTS[signal],
          sheetRow: item.sheetRow,
        });
      }
    });
  });

  flags.sort((a, b) => {
    if (b.riskWeight !== a.riskWeight) return b.riskWeight - a.riskWeight;
    const nameCompare = a.unitName.localeCompare(b.unitName);
    if (nameCompare !== 0) return nameCompare;
    const pillarOrder: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];
    return pillarOrder.indexOf(a.pillar) - pillarOrder.indexOf(b.pillar);
  });

  return flags.slice(0, limit);
}
