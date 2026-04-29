/**
 * Export helpers for "My Sessions" — single snapshot or 2-snapshot comparison.
 * Outputs PDF (priority) and CSV.
 */

import type { MySessionSnapshot } from '@/hooks/use-my-sessions';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function fmtPct(v: unknown): string {
  if (typeof v !== 'number' || Number.isNaN(v)) return '—';
  return `${v.toFixed(1)}%`;
}

function fmtNum(v: unknown): string {
  if (typeof v !== 'number' || Number.isNaN(v)) return '—';
  return v.toLocaleString();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!));
}

function escapeCsv(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const COMMON_HEAD = `
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; padding: 32px; max-width: 900px; margin: auto; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #006751; }
  h2 { font-size: 14px; margin: 24px 0 8px; color: #006751; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; color: #475569; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0 16px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
  .kpi .l { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; font-weight: 600; }
  .kpi .v { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-top: 2px; }
  .delta-pos { color: #16a34a; font-weight: 600; }
  .delta-neg { color: #ef4444; font-weight: 600; }
  .delta-zero { color: #94a3b8; }
  .notes { background: #f8fafc; border-left: 3px solid #006751; padding: 8px 12px; font-size: 12px; margin: 12px 0; color: #334155; }
  @media print { body { padding: 16px; } }
</style>
`;

function snapshotMetaTable(s: MySessionSnapshot): string {
  const f = s.filters as Record<string, unknown>;
  return `
    <table>
      <tr><th>Captured</th><td>${fmtDate(s.created_at)}</td></tr>
      <tr><th>Tab / Page</th><td>${escapeHtml(String(f?.activeTab ?? '—'))}</td></tr>
      <tr><th>Academic Year</th><td>${escapeHtml(s.academic_year)}</td></tr>
      <tr><th>Reporting Period</th><td>${escapeHtml(s.term === 'mid' ? 'Mid-Year' : 'End-of-Year')}</td></tr>
      <tr><th>View</th><td>${escapeHtml(s.view_type === 'cumulative' ? 'Cumulative (SP)' : 'Yearly')}</td></tr>
      <tr><th>Selected Pillar</th><td>${escapeHtml(String(f?.selectedPillar ?? 'All'))}</td></tr>
      <tr><th>Selected Unit</th><td>${escapeHtml(String(f?.selectedUnit ?? '—'))}</td></tr>
    </table>
  `;
}

function kpiGrid(s: MySessionSnapshot): string {
  return `
    <div class="kpi-grid">
      <div class="kpi"><div class="l">Completion</div><div class="v">${fmtPct(s.completion_pct)}</div></div>
      <div class="kpi"><div class="l">On Track</div><div class="v">${fmtPct(s.on_track_pct)}</div></div>
      <div class="kpi"><div class="l">Below Target</div><div class="v">${fmtPct(s.below_target_pct)}</div></div>
      <div class="kpi"><div class="l">Risk Index</div><div class="v">${typeof s.risk_index === 'number' ? s.risk_index.toFixed(2) : '—'}</div></div>
      <div class="kpi"><div class="l">Total Items</div><div class="v">${fmtNum(s.total_items)}</div></div>
      <div class="kpi"><div class="l">Applicable</div><div class="v">${fmtNum(s.applicable_items)}</div></div>
      <div class="kpi"><div class="l">Budget Util.</div><div class="v">${fmtPct(s.budget_utilization)}</div></div>
      <div class="kpi"><div class="l">Loaded Units</div><div class="v">${fmtNum((s.metrics as Record<string, unknown>)?.loadedUnits)} / ${fmtNum((s.metrics as Record<string, unknown>)?.totalUnits)}</div></div>
    </div>
  `;
}

function unitTable(s: MySessionSnapshot): string {
  const units = Array.isArray(s.unit_data) ? (s.unit_data as Array<Record<string, unknown>>) : [];
  if (units.length === 0) return '<p style="color:#94a3b8;font-size:11px;">No unit-level data captured.</p>';
  const rows = units.map(u => `
    <tr>
      <td>${escapeHtml(String(u.unitId ?? '—'))}</td>
      <td>${escapeHtml(String(u.unitName ?? '—'))}</td>
      <td>${fmtNum(u.totalItems)}</td>
      <td>${fmtNum(u.applicableItems)}</td>
      <td>${fmtPct(u.completionPct)}</td>
      <td>${fmtPct(u.onTrackPct)}</td>
      <td>${typeof u.riskIndex === 'number' ? (u.riskIndex as number).toFixed(2) : '—'}</td>
    </tr>
  `).join('');
  return `
    <table>
      <thead><tr><th>Unit</th><th>Name</th><th>Total</th><th>Applicable</th><th>Completion</th><th>On Track</th><th>Risk Idx</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function openPrintWindow(html: string, title: string) {
  const w = window.open('', '_blank', 'width=1024,height=720');
  if (!w) {
    throw new Error('Pop-up blocked. Please allow pop-ups to download.');
  }
  w.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title>${COMMON_HEAD}</head><body>${html}<script>window.onload=()=>{setTimeout(()=>window.print(),200);};</script></body></html>`);
  w.document.close();
}

export function exportSnapshotPDF(s: MySessionSnapshot) {
  const html = `
    <h1>${escapeHtml(s.label)}</h1>
    <div class="meta">Saved Session • Generated ${new Date().toLocaleString()}</div>
    ${s.notes ? `<div class="notes">${escapeHtml(s.notes)}</div>` : ''}
    <h2>Session Context</h2>
    ${snapshotMetaTable(s)}
    <h2>Key Performance Indicators</h2>
    ${kpiGrid(s)}
    <h2>Unit-Level Snapshot</h2>
    ${unitTable(s)}
  `;
  openPrintWindow(html, s.label);
}

export function exportSnapshotCSV(s: MySessionSnapshot) {
  const lines: string[] = [];
  lines.push('Field,Value');
  lines.push(`Title,${escapeCsv(s.label)}`);
  lines.push(`Captured,${escapeCsv(fmtDate(s.created_at))}`);
  lines.push(`Notes,${escapeCsv(s.notes ?? '')}`);
  lines.push(`Academic Year,${escapeCsv(s.academic_year)}`);
  lines.push(`Term,${escapeCsv(s.term)}`);
  lines.push(`View,${escapeCsv(s.view_type)}`);
  lines.push('');
  lines.push('Metric,Value');
  lines.push(`Completion %,${escapeCsv(s.completion_pct)}`);
  lines.push(`On Track %,${escapeCsv(s.on_track_pct)}`);
  lines.push(`Below Target %,${escapeCsv(s.below_target_pct)}`);
  lines.push(`Risk Index,${escapeCsv(s.risk_index)}`);
  lines.push(`Total Items,${escapeCsv(s.total_items)}`);
  lines.push(`Applicable Items,${escapeCsv(s.applicable_items)}`);
  lines.push('');
  lines.push('Unit,Name,Total,Applicable,Completion%,OnTrack%,RiskIndex');
  const units = Array.isArray(s.unit_data) ? (s.unit_data as Array<Record<string, unknown>>) : [];
  for (const u of units) {
    lines.push([
      escapeCsv(u.unitId), escapeCsv(u.unitName),
      escapeCsv(u.totalItems), escapeCsv(u.applicableItems),
      escapeCsv(u.completionPct), escapeCsv(u.onTrackPct), escapeCsv(u.riskIndex),
    ].join(','));
  }
  downloadCsv(`${s.label.replace(/[^\w-]+/g, '_')}.csv`, lines.join('\n'));
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function deltaCell(base: number | undefined, v: number | undefined, suffix = ''): string {
  if (typeof base !== 'number' || typeof v !== 'number') return '<td class="delta-zero">—</td>';
  const d = v - base;
  if (Math.abs(d) < 0.01) return `<td class="delta-zero">0${suffix}</td>`;
  const cls = d > 0 ? 'delta-pos' : 'delta-neg';
  const sign = d > 0 ? '+' : '';
  return `<td class="${cls}">${sign}${d.toFixed(2)}${suffix}</td>`;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface MetricRow {
  label: string;
  values: (number | undefined)[];
  suffix?: string;
  isPct?: boolean;
}

function buildMetricRows(snaps: MySessionSnapshot[]): MetricRow[] {
  return [
    { label: 'Completion %', values: snaps.map(s => s.completion_pct), suffix: '%', isPct: true },
    { label: 'On Track %', values: snaps.map(s => s.on_track_pct), suffix: '%', isPct: true },
    { label: 'Below Target %', values: snaps.map(s => s.below_target_pct), suffix: '%', isPct: true },
    { label: 'Risk Index', values: snaps.map(s => s.risk_index), suffix: '' },
    { label: 'Total Items', values: snaps.map(s => s.total_items) },
    { label: 'Applicable Items', values: snaps.map(s => s.applicable_items) },
  ];
}

function compareTable(snaps: MySessionSnapshot[]): string {
  const rows = buildMetricRows(snaps);
  const headerCells = snaps
    .map((s, i) => `<th>${LETTERS[i] ?? `S${i + 1}`} — ${escapeHtml(s.label)}</th>`)
    .join('');
  const deltaHeaders = snaps.length > 1
    ? snaps.slice(1).map((_, i) => `<th>Δ (${LETTERS[i + 1] ?? `S${i + 2}`} − A)</th>`).join('')
    : '';
  const body = rows.map(r => {
    const valueCells = r.values.map(v =>
      typeof v === 'number' ? `<td>${r.isPct ? fmtPct(v) : (r.suffix === '' ? v.toFixed(2) : fmtNum(v))}</td>` : '<td>—</td>',
    ).join('');
    const base = r.values[0];
    const deltaCells = r.values.slice(1).map(v => deltaCell(base, v, r.suffix ?? '')).join('');
    return `<tr><td>${r.label}</td>${valueCells}${deltaCells}</tr>`;
  }).join('');
  return `
    <table>
      <thead><tr><th>Metric</th>${headerCells}${deltaHeaders}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function filterDiffTable(snaps: MySessionSnapshot[]): string {
  const filterMaps = snaps.map(s => (s.filters ?? {}) as Record<string, unknown>);
  const keys = new Set<string>(['academic_year', 'term', 'view_type']);
  filterMaps.forEach(fm => Object.keys(fm).forEach(k => keys.add(k)));
  const headerCells = snaps
    .map((_, i) => `<th>${LETTERS[i] ?? `S${i + 1}`}</th>`)
    .join('');
  const rows: string[] = [];
  for (const k of keys) {
    const values = snaps.map((s, i) => {
      const fm = filterMaps[i];
      if (k === 'academic_year') return s.academic_year;
      if (k === 'term') return s.term;
      if (k === 'view_type') return s.view_type;
      return fm?.[k];
    });
    const base = JSON.stringify(values[0] ?? null);
    const allSame = values.every(v => JSON.stringify(v ?? null) === base);
    const valueCells = values.map(v => `<td>${escapeHtml(String(v ?? '—'))}</td>`).join('');
    rows.push(`<tr>
      <td>${escapeHtml(k)}</td>
      ${valueCells}
      <td>${allSame ? '<span class="delta-zero">same</span>' : '<span class="delta-neg">changed</span>'}</td>
    </tr>`);
  }
  return `<table>
    <thead><tr><th>Filter</th>${headerCells}<th>Status</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

export function exportComparisonPDF(snaps: MySessionSnapshot[]) {
  if (snaps.length < 2) throw new Error('Select at least 2 sessions to compare.');
  const sessionRows = `
    <tr><th>Captured</th>${snaps.map(s => `<td>${fmtDate(s.created_at)}</td>`).join('')}</tr>
    <tr><th>Reporting</th>${snaps.map(s => `<td>${escapeHtml(s.reporting_cycle)}</td>`).join('')}</tr>
  `;
  const sessionHeaders = snaps
    .map((s, i) => `<th>${LETTERS[i] ?? `S${i + 1}`} — ${escapeHtml(s.label)}</th>`)
    .join('');
  const html = `
    <h1>Snapshot Comparison (${snaps.length} sessions)</h1>
    <div class="meta">Generated ${new Date().toLocaleString()}</div>
    <h2>Sessions</h2>
    <table>
      <thead><tr><th></th>${sessionHeaders}</tr></thead>
      <tbody>${sessionRows}</tbody>
    </table>
    <h2>KPI Differences</h2>
    ${compareTable(snaps)}
    <h2>Filter / Context Differences</h2>
    ${filterDiffTable(snaps)}
  `;
  const title = `Comparison · ${snaps.map(s => s.label).join(' vs ')}`;
  openPrintWindow(html, title);
}

export function exportComparisonCSV(snaps: MySessionSnapshot[]) {
  if (snaps.length < 2) throw new Error('Select at least 2 sessions to compare.');
  const rows = buildMetricRows(snaps);
  const lines: string[] = [];
  const header = ['Metric', ...snaps.map((s, i) => `${LETTERS[i] ?? `S${i + 1}`} (${s.label})`)];
  for (let i = 1; i < snaps.length; i++) {
    header.push(`Delta ${LETTERS[i] ?? `S${i + 1}`}-A`);
  }
  lines.push(header.map(escapeCsv).join(','));
  for (const r of rows) {
    const cols: unknown[] = [r.label, ...r.values];
    const base = r.values[0];
    for (let i = 1; i < r.values.length; i++) {
      const v = r.values[i];
      cols.push(typeof base === 'number' && typeof v === 'number' ? v - base : '');
    }
    lines.push(cols.map(escapeCsv).join(','));
  }
  const idsuffix = snaps.map(s => s.id.slice(0, 4)).join('-');
  downloadCsv(`comparison_${idsuffix}.csv`, lines.join('\n'));
}
