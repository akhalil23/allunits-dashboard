/**
 * Reports Tab — Executive Command Center & Pillar Champions
 * Matrix layout: University section (table rows) + Pillars section (availability matrix).
 */

import { useState, useMemo } from 'react';
import { useReports, getReportFileUrl, type Report } from '@/hooks/use-reports';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Loader2, X, Filter } from 'lucide-react';

const PILLARS = ['PI', 'PII', 'PIII', 'PIV', 'PV'] as const;
const PILLAR_LABELS: Record<string, string> = { PI: 'Pillar 1', PII: 'Pillar 2', PIII: 'Pillar 3', PIV: 'Pillar 4', PV: 'Pillar 5' };
const PERIOD_LABELS: Record<string, string> = { mid_year: 'Mid-Year', end_of_year: 'End-of-Year' };
const TYPE_LABELS: Record<string, string> = { executive: 'Exec. Summary', full: 'Full Report' };
const ACADEMIC_YEARS = ['2025-2026', '2026-2027'];

interface Props {
  lockedPillar?: string;
  hiddenUniversityScope?: boolean;
}

export default function ReportsTab({ lockedPillar, hiddenUniversityScope }: Props) {
  const [academicYear, setAcademicYear] = useState<string>('all');
  const [period, setPeriod] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('all');
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  // Fetch all reports (we'll split them client-side into university / pillar)
  const { data: allReports = [], isLoading } = useReports(
    lockedPillar ? { pillar: lockedPillar, scope: 'per_pillar' } : undefined
  );

  // Client-side filtering
  const filtered = useMemo(() => {
    return allReports.filter(r => {
      if (academicYear !== 'all' && r.academic_year !== academicYear) return false;
      if (period !== 'all' && r.reporting_period !== period) return false;
      if (reportType !== 'all' && r.report_type !== reportType) return false;
      return true;
    });
  }, [allReports, academicYear, period, reportType]);

  const universityReports = useMemo(() => filtered.filter(r => r.scope === 'university'), [filtered]);
  const pillarReports = useMemo(() => filtered.filter(r => r.scope === 'per_pillar'), [filtered]);

  // Build pillar matrix rows: group by academic_year + period + report_type
  const pillarMatrix = useMemo(() => {
    const map = new Map<string, { academic_year: string; period: string; report_type: string; byPillar: Record<string, Report> }>();
    pillarReports.forEach(r => {
      const key = `${r.academic_year}|${r.reporting_period}|${r.report_type}`;
      if (!map.has(key)) {
        map.set(key, { academic_year: r.academic_year, period: r.reporting_period, report_type: r.report_type, byPillar: {} });
      }
      if (r.pillar) map.get(key)!.byPillar[r.pillar] = r;
    });
    // Sort by year desc, then period, then type
    return Array.from(map.values()).sort((a, b) => {
      if (a.academic_year !== b.academic_year) return b.academic_year.localeCompare(a.academic_year);
      if (a.period !== b.period) return a.period.localeCompare(b.period);
      return a.report_type.localeCompare(b.report_type);
    });
  }, [pillarReports]);

  const displayPillars = lockedPillar ? [lockedPillar] : [...PILLARS];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mr-1">
          <Filter className="w-3.5 h-3.5" /> Filters
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Academic Year</label>
          <Select value={academicYear} onValueChange={setAcademicYear}>
            <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {ACADEMIC_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Period</label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              <SelectItem value="mid_year">Mid-Year</SelectItem>
              <SelectItem value="end_of_year">End-of-Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Report Type</label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="executive">Exec. Summary</SelectItem>
              <SelectItem value="full">Full Report</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* ── University Section ── */}
          {!hiddenUniversityScope && (
            <section className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold tracking-tight">University</h2>
                <Badge variant="outline" className="text-[10px]">{universityReports.length} report{universityReports.length !== 1 ? 's' : ''}</Badge>
              </div>
              <div className="border rounded-lg overflow-hidden">
                {universityReports.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No university reports found.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Year</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scope</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uploaded On</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {universityReports.map(r => (
                        <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-medium">{r.academic_year}</td>
                          <td className="px-4 py-2.5">{PERIOD_LABELS[r.reporting_period]}</td>
                          <td className="px-4 py-2.5">{TYPE_LABELS[r.report_type]}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-medium">University</span>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">
                            {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            {' '}
                            <span className="text-muted-foreground/60">{new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <ReportAction report={r} onView={() => setViewingReport(r)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {/* ── Pillars Section ── */}
          <section className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold tracking-tight">Pillars</h2>
              <Badge variant="outline" className="text-[10px]">{pillarReports.length} report{pillarReports.length !== 1 ? 's' : ''}</Badge>
            </div>
            <div className="border rounded-lg overflow-x-auto">
              {pillarMatrix.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No pillar reports found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Year</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                      {displayPillars.map(p => (
                        <th key={p} className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[100px]">
                          {PILLAR_LABELS[p] || p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pillarMatrix.map((row, i) => (
                      <tr key={i} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{row.academic_year}</td>
                        <td className="px-4 py-2.5">{PERIOD_LABELS[row.period]}</td>
                        <td className="px-4 py-2.5">{TYPE_LABELS[row.report_type]}</td>
                        {displayPillars.map(p => {
                          const report = row.byPillar[p];
                          return (
                            <td key={p} className="px-3 py-2.5 text-center">
                              {report ? (
                                <ReportAction report={report} onView={() => setViewingReport(report)} compact />
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}

      {/* Embedded PDF Viewer Modal */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">{viewingReport.title}</h3>
                  <div className="flex gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">{viewingReport.academic_year}</Badge>
                    <Badge variant="outline" className="text-[10px]">{PERIOD_LABELS[viewingReport.reporting_period]}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[viewingReport.report_type]}</Badge>
                    {viewingReport.pillar && <Badge className="text-[10px]">{viewingReport.pillar}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={getReportFileUrl(viewingReport.file_path)} download target="_blank" rel="noopener noreferrer">
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </a>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setViewingReport(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1">
              <iframe
                src={getReportFileUrl(viewingReport.file_path)}
                className="w-full h-full border-0"
                title={viewingReport.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Inline action button for a report */
function ReportAction({ report, onView, compact }: { report: Report; onView: () => void; compact?: boolean }) {
  const url = getReportFileUrl(report.file_path);
  const isExecutive = report.report_type === 'executive';
  const size = compact ? 'h-7 text-[11px] px-2.5' : 'h-7 text-xs px-3';

  if (isExecutive) {
    return (
      <Button variant="default" className={`${size} gap-1`} onClick={onView}>
        <Eye className="w-3 h-3" /> View
      </Button>
    );
  }
  return (
    <Button variant="outline" className={`${size} gap-1`} asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Download className="w-3 h-3" /> {compact ? 'Open' : 'Open PDF'}
      </a>
    </Button>
  );
}
