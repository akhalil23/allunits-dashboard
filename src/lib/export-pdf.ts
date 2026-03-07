import type { ActionItem, Term, AcademicYear, ViewType, PillarId, Status } from './types';
import { getTermWindowKey } from './types';
import { PILLAR_LABELS, STATUS_COLORS } from './constants';

interface ExportPDFOptions {
  items: ActionItem[];
  term: Term;
  academicYear: AcademicYear;
  viewType: ViewType;
  unitName?: string;
  unitFullName?: string;
}

function getStatusAndCompletion(item: ActionItem, twk: ReturnType<typeof getTermWindowKey>, vt: ViewType) {
  const td = item.terms[twk];
  if (!td) return { status: 'Not Applicable' as Status, completion: 0, target: '—' };
  return {
    status: (vt === 'cumulative' ? td.spStatus : td.yearlyStatus) as Status,
    completion: vt === 'cumulative' ? td.spCompletion : td.yearlyCompletion,
    target: vt === 'cumulative' ? td.spTarget : td.yearlyTarget,
  };
}

function buildDonutSVG(segments: { label: string; value: number; color: string }[], size = 180): string {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return '<p style="color:#94a3b8;font-size:12px;">No data</p>';

  const cx = size / 2, cy = size / 2, r = size * 0.35, strokeW = size * 0.12;
  let cumAngle = -90;
  const paths = segments.filter(s => s.value > 0).map(seg => {
    const angle = (seg.value / total) * 360;
    const startRad = (cumAngle * Math.PI) / 180;
    const endRad = ((cumAngle + angle) * Math.PI) / 180;
    cumAngle += angle;
    const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
    const large = angle > 180 ? 1 : 0;
    return `<path d="M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2}" fill="none" stroke="${seg.color}" stroke-width="${strokeW}" />`;
  });

  const legend = segments.filter(s => s.value > 0).map(s =>
    `<div style="display:flex;align-items:center;gap:6px;font-size:10px;color:#475569;">
      <span style="width:10px;height:10px;border-radius:2px;background:${s.color};display:inline-block;"></span>
      ${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)
    </div>`
  ).join('');

  return `
    <div style="display:flex;align-items:center;gap:24px;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${paths.join('')}
        <text x="${cx}" y="${cy}" text-anchor="middle" dy="0.35em" font-size="18" font-weight="700" fill="#1a1a2e">${total}</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="9" fill="#94a3b8">Total</text>
      </svg>
      <div style="display:flex;flex-direction:column;gap:4px;">${legend}</div>
    </div>`;
}

function buildBarChartSVG(bars: { label: string; value: number; color: string }[]): string {
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const barW = 40, gap = 16, chartH = 120;
  const svgW = bars.length * (barW + gap) + gap;

  const barsSvg = bars.map((b, i) => {
    const h = (b.value / maxVal) * (chartH - 20);
    const x = gap + i * (barW + gap);
    const y = chartH - h;
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="${b.color}" />
      <text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="10" font-weight="600" fill="#1a1a2e">${b.value}%</text>
      <text x="${x + barW / 2}" y="${chartH + 14}" text-anchor="middle" font-size="8" fill="#64748b">${b.label}</text>
    `;
  }).join('');

  return `<svg width="${svgW}" height="${chartH + 24}" viewBox="0 0 ${svgW} ${chartH + 24}">
    <line x1="0" y1="${chartH}" x2="${svgW}" y2="${chartH}" stroke="#e2e8f0" stroke-width="1" />
    ${barsSvg}
  </svg>`;
}

function buildProgressBar(label: string, value: number, color: string): string {
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
      <span style="width:28px;font-size:10px;font-weight:700;color:#475569;">${label}</span>
      <div style="flex:1;height:14px;background:#f1f5f9;border-radius:7px;overflow:hidden;position:relative;">
        <div style="width:${value}%;height:100%;background:${color};border-radius:7px;transition:width .3s;"></div>
      </div>
      <span style="width:36px;text-align:right;font-size:10px;font-weight:600;color:#1a1a2e;">${value}%</span>
    </div>`;
}

export function exportPDF({ items, term, academicYear, viewType, unitName, unitFullName }: ExportPDFOptions) {
  const twk = getTermWindowKey(term, academicYear);
  const vt = viewType || 'cumulative';
  const termLabel = term === 'mid' ? 'Mid-Year' : 'End-of-Year';
  const viewLabel = vt === 'cumulative' ? 'Cumulative (SP)' : 'Yearly';

  // Status distribution
  const statusCounts: Record<string, number> = {};
  items.forEach(item => {
    const { status } = getStatusAndCompletion(item, twk, vt);
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  const statusSegments = Object.entries(statusCounts).map(([label, value]) => ({
    label,
    value,
    color: STATUS_COLORS[label as Status] || '#94a3b8',
  }));

  // Pillar performance
  const pillarIds: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];
  const pillarColors = ['#00843D', '#2563eb', '#E6A23C', '#7c3aed', '#0891b2'];
  const pillarBars = pillarIds.map((pid, idx) => {
    const pillarItems = items.filter(i => i.pillar === pid);
    const applicable = pillarItems.filter(i => {
      const { status } = getStatusAndCompletion(i, twk, vt);
      return status !== 'Not Applicable';
    });
    if (applicable.length === 0) return { label: pid, value: 0, color: pillarColors[idx] };
    const avg = Math.round(applicable.reduce((s, i) => s + getStatusAndCompletion(i, twk, vt).completion, 0) / applicable.length);
    return { label: pid, value: avg, color: pillarColors[idx] };
  });

  // Pillar progress bars
  const pillarProgressBars = pillarIds.map((pid, idx) => {
    const pillarItems = items.filter(i => i.pillar === pid);
    const applicable = pillarItems.filter(i => {
      const { status } = getStatusAndCompletion(i, twk, vt);
      return status !== 'Not Applicable';
    });
    const onTarget = applicable.filter(i => {
      const { status } = getStatusAndCompletion(i, twk, vt);
      return status === 'Completed – On Target';
    }).length;
    const pct = applicable.length ? Math.round((onTarget / applicable.length) * 100) : 0;
    return buildProgressBar(`P${pid}`, pct, pillarColors[idx]);
  }).join('');

  // Table rows
  const headers = ['Pillar', 'Goal', 'Objective', 'Action Step', 'Owner', 'Status', '%', 'Target'];
  const rows = items.map(item => {
    const { status, completion, target } = getStatusAndCompletion(item, twk, vt);
    const statusColor = STATUS_COLORS[status] || '#94a3b8';
    return `<tr>
      <td style="font-weight:600;">${item.pillar}</td>
      <td>${item.goal}</td>
      <td>${item.objective}</td>
      <td>${item.actionStep}</td>
      <td>${item.owner}</td>
      <td><span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:${statusColor};display:inline-block;"></span>${status}</span></td>
      <td style="text-align:center;font-weight:600;">${completion}%</td>
      <td>${target}</td>
    </tr>`;
  });

  // Overall completion
  const applicableAll = items.filter(i => {
    const { status } = getStatusAndCompletion(i, twk, vt);
    return status !== 'Not Applicable';
  });
  const overallCompletion = applicableAll.length
    ? Math.round(applicableAll.reduce((s, i) => s + getStatusAndCompletion(i, twk, vt).completion, 0) / applicableAll.length)
    : 0;

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>GSR Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a2e; padding: 40px; max-width: 1100px; margin: 0 auto; }
  .header { margin-bottom: 28px; border-bottom: 3px solid #00843D; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
  .header-left h1 { font-size: 22px; font-weight: 800; color: #00843D; letter-spacing: -0.5px; }
  .header-left p { font-size: 12px; color: #64748b; margin-top: 4px; }
  .header-right { text-align: right; }
  .header-right .big { font-size: 36px; font-weight: 800; color: #00843D; line-height: 1; }
  .header-right .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; }
  .meta { display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
  .meta span { background: #f1f5f9; padding: 5px 12px; border-radius: 6px; font-size: 11px; color: #475569; font-weight: 500; }
  .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .chart-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
  .chart-card h3 { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
  .pillar-section { margin-bottom: 32px; }
  .pillar-section h3 { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 8px; }
  th { background: #00843D; color: white; padding: 8px 8px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
  th:first-child { border-radius: 6px 0 0 0; } th:last-child { border-radius: 0 6px 0 0; }
  td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 36px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { body { padding: 20px; } .charts { break-inside: avoid; } }
  @page { size: A4 landscape; margin: 15mm; }
</style>
</head><body>

<div class="header">
  <div class="header-left">
    <h1>GSR — Strategic Plan IV Report</h1>
    <p>Graduate Studies & Research Intelligence Dashboard</p>
  </div>
  <div class="header-right">
    <div class="big">${overallCompletion}%</div>
    <div class="lbl">Overall Completion</div>
  </div>
</div>

<div class="meta">
  <span>📅 Academic Year: ${academicYear}</span>
  <span>📊 Term: ${termLabel}</span>
  <span>🔍 View: ${viewLabel}</span>
  <span>📋 Items: ${items.length} (${applicableAll.length} applicable)</span>
  <span>🕐 Generated: ${new Date().toLocaleString()}</span>
</div>

<div class="charts">
  <div class="chart-card">
    <h3>Status Distribution</h3>
    ${buildDonutSVG(statusSegments)}
  </div>
  <div class="chart-card">
    <h3>Avg. Completion by Pillar</h3>
    ${buildBarChartSVG(pillarBars)}
  </div>
</div>

<div class="pillar-section">
  <div class="chart-card">
    <h3>On-Target Rate by Pillar</h3>
    ${pillarProgressBars}
  </div>
</div>

<h3 style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">Detailed Data</h3>
<table>
  <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.join('')}</tbody>
</table>

<div class="footer">GSR Strategic Plan IV — Auto-generated report • ${new Date().toLocaleString()}</div>
</body></html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}
