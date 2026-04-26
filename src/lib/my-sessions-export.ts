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

function deltaCell(a: number | undefined, b: number | undefined, suffix = ''): string {
  if (typeof a !== 'number' || typeof b !== 'number') return '<td class="delta-zero">—</td>';
  const d = b - a;
  if (Math.abs(d) < 0.01) return `<td class="delta-zero">0${suffix}</td>`;
  const cls = d > 0 ? 'delta-pos' : 'delta-neg';
  const sign = d > 0 ? '+' : '';
  return `<td class="${cls}">${sign}${d.toFixed(2)}${suffix}</td>`;
}

function compareTable(a: MySessionSnapshot, b: MySessionSnapshot): string {
  const rows: { label: string; av: unknown; bv: unknown; suffix?: string; isPct?: boolean }[] = [
    { label: 'Completion %', av: a.completion_pct, bv: b.completion_pct, suffix: '%', isPct: true },
    { label: 'On Track %', av: a.on_track_pct, bv: b.on_track_pct, suffix: '%', isPct: true },
    { label: 'Below Target %', av: a.below_target_pct, bv: b.below_target_pct, suffix: '%', isPct: true },
    { label: 'Risk Index', av: a.risk_index, bv: b.risk_index, suffix: '', isPct: false },
    { label: 'Total Items', av: a.total_items, bv: b.total_items },
    { label: 'Applicable Items', av: a.applicable_items, bv: b.applicable_items },
  ];
  const body = rows.map(r => {
    const av = typeof r.av === 'number' ? (r.isPct ? fmtPct(r.av) : fmtNum(r.av)) : '—';
    const bv = typeof r.bv === 'number' ? (r.isPct ? fmtPct(r.bv) : fmtNum(r.bv)) : '—';
    const delta = typeof r.av === 'number' && typeof r.bv === 'number'
      ? deltaCell(r.av as number, r.bv as number, r.suffix ?? '')
      : '<td class="delta-zero">—</td>';
    return `<tr><td>${r.label}</td><td>${av}</td><td>${bv}</td>${delta}</tr>`;
  }).join('');
  return `
    <table>
      <thead><tr><th>Metric</th><th>A — ${escapeHtml(a.label)}</th><th>B — ${escapeHtml(b.label)}</th><th>Δ (B − A)</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function filterDiffTable(a: MySessionSnapshot, b: MySessionSnapshot): string {
  const fa = a.filters as Record<string, unknown>;
  const fb = b.filters as Record<string, unknown>;
  const keys = new Set([...Object.keys(fa ?? {}), ...Object.keys(fb ?? {}), 'academic_year', 'term', 'view_type']);
  const rows: string[] = [];
  for (const k of keys) {
    const av = k === 'academic_year' ? a.academic_year : k === 'term' ? a.term : k === 'view_type' ? a.view_type : fa?.[k];
    const bv = k === 'academic_year' ? b.academic_year : k === 'term' ? b.term : k === 'view_type' ? b.view_type : fb?.[k];
    const same = JSON.stringify(av ?? null) === JSON.stringify(bv ?? null);
    rows.push(`<tr>
      <td>${escapeHtml(k)}</td>
      <td>${escapeHtml(String(av ?? '—'))}</td>
      <td>${escapeHtml(String(bv ?? '—'))}</td>
      <td>${same ? '<span class="delta-zero">same</span>' : '<span class="delta-neg">changed</span>'}</td>
    </tr>`);
  }
  return `<table>
    <thead><tr><th>Filter</th><th>Snapshot A</th><th>Snapshot B</th><th>Status</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

export function exportComparisonPDF(a: MySessionSnapshot, b: MySessionSnapshot) {
  const html = `
    <h1>Snapshot Comparison</h1>
    <div class="meta">Generated ${new Date().toLocaleString()}</div>
    <h2>Sessions</h2>
    <table>
      <thead><tr><th></th><th>A — ${escapeHtml(a.label)}</th><th>B — ${escapeHtml(b.label)}</th></tr></thead>
      <tbody>
        <tr><th>Captured</th><td>${fmtDate(a.created_at)}</td><td>${fmtDate(b.created_at)}</td></tr>
        <tr><th>Reporting</th><td>${escapeHtml(a.reporting_cycle)}</td><td>${escapeHtml(b.reporting_cycle)}</td></tr>
      </tbody>
    </table>
    <h2>KPI Differences</h2>
    ${compareTable(a, b)}
    <h2>Filter / Context Differences</h2>
    ${filterDiffTable(a, b)}
  `;
  openPrintWindow(html, `Comparison · ${a.label} vs ${b.label}`);
}

export function exportComparisonCSV(a: MySessionSnapshot, b: MySessionSnapshot) {
  const lines: string[] = [];
  lines.push('Metric,A,B,Delta (B-A)');
  const rows: [string, number, number][] = [
    ['Completion %', a.completion_pct, b.completion_pct],
    ['On Track %', a.on_track_pct, b.on_track_pct],
    ['Below Target %', a.below_target_pct, b.below_target_pct],
    ['Risk Index', a.risk_index, b.risk_index],
    ['Total Items', a.total_items, b.total_items],
    ['Applicable Items', a.applicable_items, b.applicable_items],
  ];
  for (const [k, av, bv] of rows) {
    lines.push([escapeCsv(k), escapeCsv(av), escapeCsv(bv), escapeCsv(bv - av)].join(','));
  }
  downloadCsv(`comparison_${a.id.slice(0, 6)}_vs_${b.id.slice(0, 6)}.csv`, lines.join('\n'));
}
