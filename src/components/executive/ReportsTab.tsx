/**
 * Reports Tab — Executive Command Center
 * Displays reports from the backend with filters.
 * Executive reports use embedded PDF viewer; Full reports use download.
 */

import { useState } from 'react';
import { useReports, getReportFileUrl, type ReportFilters, type Report } from '@/hooks/use-reports';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Loader2, Filter, X } from 'lucide-react';

const PILLARS = ['PI', 'PII', 'PIII', 'PIV', 'PV'] as const;
const PERIOD_LABELS: Record<string, string> = { mid_year: 'Mid-Year', end_of_year: 'End-of-Year' };
const SCOPE_LABELS: Record<string, string> = { university: 'University', per_pillar: 'Per Pillar' };
const TYPE_LABELS: Record<string, string> = { executive: 'Executive', full: 'Full' };

interface Props {
  /** If set, lock the pillar filter to this value (for pillar champions) */
  lockedPillar?: string;
  /** If true, hide university-scope reports (for pillar champions) */
  hiddenUniversityScope?: boolean;
}

export default function ReportsTab({ lockedPillar, hiddenUniversityScope }: Props) {
  const [period, setPeriod] = useState<string>('all');
  const [scope, setScope] = useState<string>(hiddenUniversityScope ? 'per_pillar' : 'all');
  const [reportType, setReportType] = useState<string>('all');
  const [pillar, setPillar] = useState<string>(lockedPillar || 'all');
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  const filters: ReportFilters = {};
  if (period !== 'all') filters.period = period as any;
  if (scope !== 'all') filters.scope = scope as any;
  if (reportType !== 'all') filters.reportType = reportType as any;
  if (pillar !== 'all') filters.pillar = pillar;
  // For pillar champions, always filter by scope
  if (hiddenUniversityScope) filters.scope = 'per_pillar';
  if (lockedPillar) filters.pillar = lockedPillar;

  const { data: reports = [], isLoading } = useReports(filters);

  const pillarDisabled = scope === 'university' || !!lockedPillar;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Period</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  <SelectItem value="mid_year">Mid-Year</SelectItem>
                  <SelectItem value="end_of_year">End-of-Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!hiddenUniversityScope && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Scope</label>
                <Select value={scope} onValueChange={v => { setScope(v); if (v === 'university') setPillar('all'); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scopes</SelectItem>
                    <SelectItem value="university">University</SelectItem>
                    <SelectItem value="per_pillar">Per Pillar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Pillar</label>
              <Select value={pillar} onValueChange={setPillar} disabled={pillarDisabled}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pillars</SelectItem>
                  {PILLARS.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No reports found matching the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map(r => (
            <ReportCard key={r.id} report={r} onView={() => setViewingReport(r)} />
          ))}
        </div>
      )}

      {/* Embedded PDF Viewer for Executive Reports */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">{viewingReport.title}</h3>
                  <div className="flex gap-2 mt-0.5">
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

function ReportCard({ report, onView }: { report: Report; onView: () => void }) {
  const url = getReportFileUrl(report.file_path);
  const isExecutive = report.report_type === 'executive';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm leading-tight truncate">{report.title}</h3>
            {report.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px]">{PERIOD_LABELS[report.reporting_period]}</Badge>
          <Badge variant={report.scope === 'university' ? 'default' : 'secondary'} className="text-[10px]">{SCOPE_LABELS[report.scope]}</Badge>
          <Badge variant={isExecutive ? 'default' : 'outline'} className="text-[10px]">{TYPE_LABELS[report.report_type]}</Badge>
          {report.pillar && <Badge className="text-[10px]">{report.pillar}</Badge>}
        </div>

        <div className="flex items-center justify-between pt-1 border-t">
          <span className="text-[10px] text-muted-foreground">
            {new Date(report.created_at).toLocaleDateString()}
          </span>
          {isExecutive ? (
            <Button size="sm" variant="default" onClick={onView} className="h-7 text-xs gap-1.5">
              <Eye className="w-3.5 h-3.5" /> View
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1.5">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Download className="w-3.5 h-3.5" /> Open PDF
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
