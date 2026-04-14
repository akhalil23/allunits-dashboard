/**
 * Import Center — Admin report upload & management.
 */

import { useState, useRef } from 'react';
import { useReports, useUploadReport, useUpdateReport, useDeleteReport, getReportFileUrl, type Report } from '@/hooks/use-reports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2, Pencil, FileText, Upload, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const PILLARS = ['PI', 'PII', 'PIII', 'PIV', 'PV'] as const;
const ACADEMIC_YEARS = ['2025-2026', '2026-2027'];

const PERIOD_LABELS: Record<string, string> = { mid_year: 'Mid-Year', end_of_year: 'End-of-Year' };
const SCOPE_LABELS: Record<string, string> = { university: 'University', per_pillar: 'Per Pillar' };
const TYPE_LABELS: Record<string, string> = { executive: 'Executive', full: 'Full' };

export default function ImportCenter() {
  const { data: reports = [], isLoading } = useReports();
  const uploadMutation = useUploadReport();
  const updateMutation = useUpdateReport();
  const deleteMutation = useDeleteReport();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Report | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [academicYear, setAcademicYear] = useState<string>('2025-2026');
  const [period, setPeriod] = useState<'mid_year' | 'end_of_year'>('mid_year');
  const [scope, setScope] = useState<'university' | 'per_pillar'>('university');
  const [reportType, setReportType] = useState<'executive' | 'full'>('executive');
  const [pillar, setPillar] = useState<string>('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setTitle('');
    setAcademicYear('2025-2026');
    setPeriod('mid_year');
    setScope('university');
    setReportType('executive');
    setPillar('');
    setDescription('');
    setFile(null);
    setEditingReport(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(r: Report) {
    setEditingReport(r);
    setTitle(r.title);
    setAcademicYear(r.academic_year);
    setPeriod(r.reporting_period);
    setScope(r.scope);
    setReportType(r.report_type);
    setPillar(r.pillar || '');
    setDescription(r.description || '');
    setFile(null);
    setDialogOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && f.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted');
      e.target.value = '';
      return;
    }
    setFile(f || null);
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (scope === 'per_pillar' && !pillar) { toast.error('Pillar is required for Per Pillar scope'); return; }

    const effectivePillar = scope === 'university' ? null : pillar;

    if (editingReport) {
      try {
        await updateMutation.mutateAsync({
          id: editingReport.id,
          title: title.trim(),
          academic_year: academicYear,
          reporting_period: period,
          scope,
          report_type: reportType,
          pillar: effectivePillar,
          description: description.trim() || null,
          file: file || undefined,
          oldFilePath: file ? editingReport.file_path : undefined,
        });
        toast.success('Report updated');
        setDialogOpen(false);
        resetForm();
      } catch (err: any) {
        toast.error('Update failed: ' + err.message);
      }
    } else {
      if (!file) { toast.error('PDF file is required'); return; }
      try {
        await uploadMutation.mutateAsync({
          file,
          title: title.trim(),
          academic_year: academicYear,
          reporting_period: period,
          scope,
          report_type: reportType,
          pillar: effectivePillar,
          description: description.trim() || null,
        });
        toast.success('Report uploaded');
        setDialogOpen(false);
        resetForm();
      } catch (err: any) {
        toast.error('Upload failed: ' + err.message);
      }
    }
  }

  async function handleDelete() {
    if (!deleteDialog) return;
    try {
      await deleteMutation.mutateAsync(deleteDialog);
      toast.success('Report deleted');
      setDeleteDialog(null);
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    }
  }

  const isSubmitting = uploadMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Import Center — Reports
          </CardTitle>
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Upload Report
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No reports uploaded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pillar</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium max-w-[180px] truncate">{r.title}</TableCell>
                      <TableCell className="text-xs">{r.academic_year}</TableCell>
                      <TableCell><Badge variant="outline">{PERIOD_LABELS[r.reporting_period]}</Badge></TableCell>
                      <TableCell><Badge variant={r.scope === 'university' ? 'default' : 'secondary'}>{SCOPE_LABELS[r.scope]}</Badge></TableCell>
                      <TableCell><Badge variant={r.report_type === 'executive' ? 'default' : 'outline'}>{TYPE_LABELS[r.report_type]}</Badge></TableCell>
                      <TableCell>{r.pillar || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="outline" size="sm" asChild>
                          <a href={getReportFileUrl(r.file_path)} target="_blank" rel="noopener noreferrer" title="View PDF">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(r)} title="Edit">
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteDialog(r)} title="Delete">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingReport ? 'Edit Report' : 'Upload Report'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Report title" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={academicYear} onValueChange={setAcademicYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={period} onValueChange={v => setPeriod(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mid_year">Mid-Year</SelectItem>
                    <SelectItem value="end_of_year">End-of-Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={scope} onValueChange={v => { setScope(v as any); if (v === 'university') setPillar(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="university">University</SelectItem>
                    <SelectItem value="per_pillar">Per Pillar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={v => setReportType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {scope === 'per_pillar' && (
              <div className="space-y-2">
                <Label>Pillar</Label>
                <Select value={pillar} onValueChange={setPillar}>
                  <SelectTrigger><SelectValue placeholder="Select pillar" /></SelectTrigger>
                  <SelectContent>
                    {PILLARS.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>PDF File {editingReport ? '(leave empty to keep current)' : ''}</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingReport ? 'Save Changes' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteDialog} onOpenChange={open => { if (!open) setDeleteDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Report</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteDialog?.title}</strong>? This will also remove the PDF file.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
