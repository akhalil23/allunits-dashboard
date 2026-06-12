/**
 * Offline audit harness: runs the REAL computeCategories/groupByPillar pipeline
 * against the live all-units snapshot (downloaded to /tmp/all-units.json) and
 * compares the output with an independently computed ground truth.
 *
 * Run: bun scripts/audit-coverage.ts [yearly|cumulative]
 */
import { readFileSync } from 'fs';
import { computeCategories, groupByPillar } from '@/components/executive/StrategicCoverageGaps';
import { UNIT_CONFIGS, UNIT_IDS } from '@/lib/unit-config';
import type { ActionItem, FetchResult, ViewType } from '@/lib/types';
import { isNotApplicableStatus, getTermWindowKey } from '@/lib/types';
import type { UnitFetchResult } from '@/lib/university-aggregation';

const viewType = (process.argv[2] === 'cumulative' ? 'cumulative' : 'yearly') as ViewType;
const term = 'mid' as const;
const ay = '2025-2026' as const;

const raw = JSON.parse(readFileSync('/tmp/all-units.json', 'utf8'));
const unitResults: UnitFetchResult[] = raw.units.map((u: { unitId: string; payload: FetchResult }) => ({
  unitId: u.unitId,
  unitName: UNIT_CONFIGS[u.unitId]?.fullName || u.unitId,
  result: u.payload,
  error: null,
}));

// ─── Ground truth (independent re-implementation) ───────────────────────────
const norm = (s: string | null | undefined) =>
  (s ?? '').replace(/\u00A0/g, ' ').replace(/[\t\r\n\f\v]/g, ' ').trim().replace(/\s+/g, ' ');
const mk = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, '');

interface TruthEntry {
  pillar: string; goal: string; action: string; step: string; minRow: number;
  statusByUnit: Map<string, string>;
}
const truth = new Map<string, TruthEntry>();

for (const ur of unitResults) {
  const byPillar = new Map<string, ActionItem[]>();
  for (const it of ur.result!.data) {
    if (!byPillar.has(it.pillar)) byPillar.set(it.pillar, []);
    byPillar.get(it.pillar)!.push(it);
  }
  byPillar.forEach(items => {
    const sorted = [...items].sort((a, b) => a.sheetRow - b.sheetRow);
    let g = '', a = '';
    for (const it of sorted) {
      if (norm(it.goal)) g = norm(it.goal);
      if (norm(it.objective)) a = norm(it.objective);
      const st = norm(it.actionStep);
      if (!st) continue;
      const td = it.terms?.[getTermWindowKey(term, ay)];
      const status = norm(viewType === 'cumulative' ? td?.spStatus : td?.yearlyStatus);
      const key = `${it.pillar}|${mk(g)}|${mk(a)}|${mk(st)}`;
      if (!truth.has(key)) {
        truth.set(key, { pillar: it.pillar, goal: g, action: a, step: st, minRow: it.sheetRow, statusByUnit: new Map() });
      }
      const e = truth.get(key)!;
      e.minRow = Math.min(e.minRow, it.sheetRow);
      const prev = e.statusByUnit.get(ur.unitId);
      // non-NA wins over NA when a unit duplicates the same row
      const isNa = isNotApplicableStatus(status);
      if (!prev || (isNotApplicableStatus(prev) && !isNa)) e.statusByUnit.set(ur.unitId, status || 'Not Applicable');
    }
  });
}

const truthAbsNA = [...truth.values()].filter(e =>
  UNIT_IDS.every(u => {
    const s = e.statusByUnit.get(u);
    return s === undefined || isNotApplicableStatus(s);
  }) && [...e.statusByUnit.values()].some(s => isNotApplicableStatus(s)),
);

// ─── Actual pipeline ─────────────────────────────────────────────────────────
const categories = computeCategories(unitResults, viewType, term, ay);
const absNA = categories.find(c => c.key === 'absolute-na')!;
const grouped = groupByPillar(absNA.items);

console.log(`\n=== viewType=${viewType} term=${term} ay=${ay} ===`);
console.log(`Ground-truth Absolute NA: ${truthAbsNA.length}`);
console.log(`Pipeline   Absolute NA: ${absNA.count} (items: ${absNA.items.length})`);

const truthByStep = new Map(truthAbsNA.map(e => [`${e.pillar}|${mk(e.goal)}|${mk(e.action)}|${mk(e.step)}`, e]));
const pipeKeys = new Set<string>();
const parentMismatches: string[] = [];
const falsePositives: string[] = [];

for (const pg of grouped) {
  for (const gg of pg.goals) {
    for (const ag of gg.actions) {
      for (const st of ag.steps) {
        const k = `${pg.pillar}|${mk(gg.goal)}|${mk(ag.action)}|${mk(st.actionStep)}`;
        pipeKeys.add(k);
        if (!truthByStep.has(k)) {
          // Is it a false positive, or just a parent mismatch?
          const sameStepElsewhere = [...truthByStep.keys()].find(tk => tk.startsWith(pg.pillar + '|') && tk.endsWith('|' + mk(st.actionStep)));
          if (sameStepElsewhere) {
            const t = truthByStep.get(sameStepElsewhere)!;
            parentMismatches.push(`[${pg.pillar}] step "${st.actionStep.slice(0, 60)}" rendered under goal="${gg.goal.slice(0, 40)}" action="${ag.action.slice(0, 40)}" but sheets say goal="${t.goal.slice(0, 40)}" action="${t.action.slice(0, 40)}"`);
          } else {
            falsePositives.push(`[${pg.pillar}] "${st.actionStep.slice(0, 70)}" under ${gg.goal.slice(0, 30)} / ${ag.action.slice(0, 30)}`);
          }
        }
      }
    }
  }
}
const missing = [...truthByStep.entries()].filter(([k]) => !pipeKeys.has(k));

console.log(`\nFalse positives (in UI, not truly absolute NA): ${falsePositives.length}`);
falsePositives.forEach(s => console.log('  FP:', s));
console.log(`\nParent mismatches (wrong Goal/Action): ${parentMismatches.length}`);
parentMismatches.forEach(s => console.log('  PM:', s));
console.log(`\nMissing from UI (truly absolute NA but absent): ${missing.length}`);
missing.forEach(([, e]) => console.log(`  MISS: [${e.pillar}] "${e.step.slice(0, 70)}" goal="${e.goal.slice(0, 40)}" action="${e.action.slice(0, 40)}"`));

// Per-pillar counts
const perPillar = new Map<string, number>();
truthAbsNA.forEach(e => perPillar.set(e.pillar, (perPillar.get(e.pillar) ?? 0) + 1));
const pipePerPillar = new Map<string, number>();
absNA.items.forEach(i => pipePerPillar.set(i.pillar, (pipePerPillar.get(i.pillar) ?? 0) + 1));
console.log('\nPer-pillar truth vs pipeline:');
['I', 'II', 'III', 'IV', 'V'].forEach(p => console.log(`  ${p}: truth=${perPillar.get(p) ?? 0} pipeline=${pipePerPillar.get(p) ?? 0}`));
