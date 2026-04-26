/**
 * MySessionsTab — Phase 1: User-controlled "Saved Views".
 *
 * Each user has a private space to:
 *  - Save the current dashboard view (handled by parent via onSaveCurrent)
 *  - List, view detail, and delete their saved sessions (newest first)
 *  - Restore the filters/tab from a saved session
 *  - Select two sessions to compare KPI/filter differences
 *  - Export a single snapshot or a comparison as PDF (priority) or CSV
 *
 * Strict isolation: each user only sees their own data (RLS-enforced).
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Sparkles,
  Bookmark,
  GitCompare,
  Trash2,
  Loader2,
  ShieldCheck,
  Clock,
  RotateCcw,
  Eye,
  ArrowLeft,
  FileDown,
  FileText,
  Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';
import {
  useMySessions,
  useDeleteMySession,
  type MySessionSnapshot,
} from '@/hooks/use-my-sessions';
import { useMyProfile } from '@/hooks/use-my-profile';
import type { UniversityAggregation } from '@/lib/university-aggregation';
import { Button } from '@/components/ui/button';
import {
  exportSnapshotPDF,
  exportSnapshotCSV,
  exportComparisonPDF,
  exportComparisonCSV,
} from '@/lib/my-sessions-export';
import { toast } from 'sonner';

interface RestoreInput {
  academic_year: string;
  term: string;
  view_type: string;
  filters: Record<string, unknown>;
}

interface Props {
  aggregation: UniversityAggregation;
  onRestore?: (s: RestoreInput) => void;
  onSaveCurrent?: () => void;
}

type View =
  | { kind: 'list' }
  | { kind: 'detail'; id: string }
  | { kind: 'compare'; aId: string; bId: string };

export default function MySessionsTab({ aggregation, onRestore, onSaveCurrent }: Props) {
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const { viewType, academicYear, term } = useDashboard();
  const { data: sessions, isLoading } = useMySessions();
  const deleteMutation = useDeleteMySession();

  const [view, setView] = useState<View>({ kind: 'list' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // up to 2 for compare

  const accountLabel = useMemo(() => {
    if (profile?.display_name?.trim()) return profile.display_name;
    if (profile?.username) return profile.username;
    const email = user?.email ?? '';
    return email.split('@')[0] || 'Your account';
  }, [profile?.display_name, profile?.username, user?.email]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Session removed');
      setConfirmDeleteId(null);
      setSelectedIds(prev => prev.filter(x => x !== id));
      if (view.kind === 'detail' && view.id === id) setView({ kind: 'list' });
    } catch {
      toast.error('Failed to remove session');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // keep most recent two
      return [...prev, id];
    });
  };

  const handleRestore = (s: MySessionSnapshot) => {
    if (!onRestore) {
      toast.info('Restore not available in this context');
      return;
    }
    onRestore({
      academic_year: s.academic_year,
      term: s.term,
      view_type: s.view_type,
      filters: s.filters,
    });
    toast.success(`Restored: ${s.label}`);
  };

  const sessionMap = useMemo(() => {
    const m = new Map<string, MySessionSnapshot>();
    sessions?.forEach(s => m.set(s.id, s));
    return m;
  }, [sessions]);

  // ─── Render ──────────────────────────────────────────────────────────
  if (view.kind === 'detail') {
    const s = sessionMap.get(view.id);
    if (!s) {
      setView({ kind: 'list' });
      return null;
    }
    return (
      <DetailView
        snapshot={s}
        onBack={() => setView({ kind: 'list' })}
        onRestore={() => handleRestore(s)}
        canRestore={!!onRestore}
      />
    );
  }

  if (view.kind === 'compare') {
    const a = sessionMap.get(view.aId);
    const b = sessionMap.get(view.bId);
    if (!a || !b) {
      setView({ kind: 'list' });
      return null;
    }
    return <CompareView a={a} b={b} onBack={() => setView({ kind: 'list' })} />;
  }

  return (
    <div className="space-y-6">
      {/* Privacy banner */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/[0.06] border border-primary/15"
      >
        <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-foreground/80 leading-relaxed">
          <span className="font-semibold text-foreground">Private to {accountLabel}.</span>{' '}
          Sessions saved here are isolated to your account and never visible to other users.
        </div>
      </motion.div>

      {/* Current session card */}
      <section className="rounded-2xl bg-card border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-sm text-foreground">Current Session</h3>
            <p className="text-[11px] text-muted-foreground">
              The view you're exploring right now — save it for later
            </p>
          </div>
          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tracking-wide">
            LIVE
          </span>
        </header>

        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Academic Year" value={academicYear} />
          <Stat label="Term" value={term === 'mid' ? 'Mid-Year' : 'End-of-Year'} />
          <Stat label="View" value={viewType === 'cumulative' ? 'Cumulative (SP)' : 'Yearly'} />
          <Stat
            label="Loaded Units"
            value={`${aggregation.loadedUnits} / ${aggregation.totalUnits}`}
          />
        </div>

        <div className="px-5 pb-5">
          <Button onClick={onSaveCurrent} className="gap-2">
            <Bookmark className="w-3.5 h-3.5" />
            Save current view to My Sessions
          </Button>
        </div>
      </section>

      {/* Compare bar — appears when sessions are selected */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl bg-primary/[0.08] border border-primary/20"
          >
            <span className="text-xs text-foreground/80">
              <strong>{selectedIds.length}</strong> selected for comparison
              {selectedIds.length === 1 ? ' — pick one more' : ''}
            </span>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setSelectedIds([])}
              >
                Clear
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5"
                disabled={selectedIds.length !== 2}
                onClick={() =>
                  setView({ kind: 'compare', aId: selectedIds[0], bId: selectedIds[1] })
                }
              >
                <GitCompare className="w-3 h-3" />
                Compare
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History list */}
      <section className="rounded-2xl bg-card border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-sm text-foreground">
              My Saved Sessions
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Your private saved views — newest first. Select up to 2 to compare.
            </p>
          </div>
        </header>

        <div className="p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-2">
              {sessions.map(s => {
                const isSelected = selectedIds.includes(s.id);
                return (
                  <li
                    key={s.id}
                    className={`group rounded-xl border p-4 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'border-primary/40 bg-primary/[0.05]'
                        : 'border-border bg-background/40 hover:bg-background/70'
                    }`}
                  >
                    <button
                      onClick={() => toggleSelect(s.id)}
                      className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50'
                      }`}
                      aria-label={isSelected ? 'Deselect for compare' : 'Select for compare'}
                      title="Select to compare"
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-foreground truncate">{s.label}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {s.view_type === 'cumulative' ? 'Cumulative' : 'Yearly'}
                        </span>
                        {s.filters?.activeTab && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {String(s.filters.activeTab)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        AY {s.academic_year} •{' '}
                        {s.term === 'mid' ? 'Mid-Year' : 'End-of-Year'} •{' '}
                        {new Date(s.created_at).toLocaleString()}
                      </p>
                      {s.notes && (
                        <p className="text-xs text-foreground/70 mt-1.5 line-clamp-2">
                          {s.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span>
                          Completion <strong className="text-foreground">{s.completion_pct.toFixed(1)}%</strong>
                        </span>
                        <span>
                          On Track <strong className="text-foreground">{s.on_track_pct.toFixed(1)}%</strong>
                        </span>
                        <span>
                          RI <strong className="text-foreground">{s.risk_index.toFixed(2)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {confirmDeleteId === s.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-[11px]"
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDelete(s.id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setView({ kind: 'detail', id: s.id })}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                            aria-label="Open session"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {onRestore && (
                            <button
                              onClick={() => handleRestore(s)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                              aria-label="Restore filters"
                              title="Restore view"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDeleteId(s.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            aria-label="Delete session"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────
function DetailView({
  snapshot,
  onBack,
  onRestore,
  canRestore,
}: {
  snapshot: MySessionSnapshot;
  onBack: () => void;
  onRestore: () => void;
  canRestore: boolean;
}) {
  const f = snapshot.filters as Record<string, unknown>;
  const units = Array.isArray(snapshot.unit_data)
    ? (snapshot.unit_data as Array<Record<string, unknown>>)
    : [];

  const handleExportPdf = () => {
    try {
      exportSnapshotPDF(snapshot);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-base text-foreground truncate">
            {snapshot.label}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Saved {new Date(snapshot.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          {canRestore && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onRestore}>
              <RotateCcw className="w-3.5 h-3.5" /> Restore View
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={handleExportPdf}>
            <FileDown className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => exportSnapshotCSV(snapshot)}
          >
            <FileText className="w-3.5 h-3.5" /> CSV
          </Button>
        </div>
      </div>

      {snapshot.notes && (
        <div className="rounded-xl border-l-4 border-primary bg-primary/[0.05] p-4 text-sm text-foreground/80">
          {snapshot.notes}
        </div>
      )}

      <section className="rounded-2xl bg-card border border-border p-5">
        <h4 className="font-display font-semibold text-sm text-foreground mb-3">Session Context</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Tab" value={String(f?.activeTab ?? '—')} />
          <Stat label="Academic Year" value={snapshot.academic_year} />
          <Stat label="Term" value={snapshot.term === 'mid' ? 'Mid-Year' : 'End-of-Year'} />
          <Stat
            label="View"
            value={snapshot.view_type === 'cumulative' ? 'Cumulative (SP)' : 'Yearly'}
          />
          <Stat label="Pillar" value={String(f?.selectedPillar ?? 'All')} />
          <Stat label="Unit" value={String(f?.selectedUnit ?? '—')} />
        </div>
      </section>

      <section className="rounded-2xl bg-card border border-border p-5">
        <h4 className="font-display font-semibold text-sm text-foreground mb-3">
          Captured KPIs
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiBox label="Completion" value={`${snapshot.completion_pct.toFixed(1)}%`} />
          <KpiBox label="On Track" value={`${snapshot.on_track_pct.toFixed(1)}%`} />
          <KpiBox label="Below Target" value={`${snapshot.below_target_pct.toFixed(1)}%`} />
          <KpiBox label="Risk Index" value={snapshot.risk_index.toFixed(2)} />
          <KpiBox label="Total Items" value={snapshot.total_items.toLocaleString()} />
          <KpiBox label="Applicable" value={snapshot.applicable_items.toLocaleString()} />
          <KpiBox label="Budget Util." value={`${snapshot.budget_utilization.toFixed(1)}%`} />
          <KpiBox
            label="Loaded Units"
            value={`${(snapshot.metrics as Record<string, unknown>)?.loadedUnits ?? '—'} / ${(snapshot.metrics as Record<string, unknown>)?.totalUnits ?? '—'}`}
          />
        </div>
      </section>

      {units.length > 0 && (
        <section className="rounded-2xl bg-card border border-border p-5">
          <h4 className="font-display font-semibold text-sm text-foreground mb-3">
            Unit-Level Snapshot ({units.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 pr-3">Unit</th>
                  <th className="text-right py-2 px-2">Total</th>
                  <th className="text-right py-2 px-2">Applicable</th>
                  <th className="text-right py-2 px-2">Completion</th>
                  <th className="text-right py-2 px-2">On Track</th>
                  <th className="text-right py-2 pl-2">RI</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-foreground">
                      {String(u.unitId ?? '—')}
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground">
                      {fmtNum(u.totalItems)}
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground">
                      {fmtNum(u.applicableItems)}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground">
                      {fmtPct(u.completionPct)}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground">
                      {fmtPct(u.onTrackPct)}
                    </td>
                    <td className="py-2 pl-2 text-right text-foreground">
                      {typeof u.riskIndex === 'number' ? u.riskIndex.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Compare View ─────────────────────────────────────────────────────
function CompareView({
  a,
  b,
  onBack,
}: {
  a: MySessionSnapshot;
  b: MySessionSnapshot;
  onBack: () => void;
}) {
  const rows: { label: string; av: number; bv: number; suffix?: string; isPct?: boolean }[] = [
    { label: 'Completion', av: a.completion_pct, bv: b.completion_pct, suffix: '%', isPct: true },
    { label: 'On Track', av: a.on_track_pct, bv: b.on_track_pct, suffix: '%', isPct: true },
    {
      label: 'Below Target',
      av: a.below_target_pct,
      bv: b.below_target_pct,
      suffix: '%',
      isPct: true,
    },
    { label: 'Risk Index', av: a.risk_index, bv: b.risk_index, suffix: '' },
    { label: 'Total Items', av: a.total_items, bv: b.total_items },
    { label: 'Applicable Items', av: a.applicable_items, bv: b.applicable_items },
  ];

  const filterRows = useMemo(() => {
    const fa = a.filters as Record<string, unknown>;
    const fb = b.filters as Record<string, unknown>;
    const baseKeys = ['academic_year', 'term', 'view_type', 'activeTab', 'selectedPillar', 'selectedUnit'];
    return baseKeys.map(k => {
      const av =
        k === 'academic_year'
          ? a.academic_year
          : k === 'term'
          ? a.term
          : k === 'view_type'
          ? a.view_type
          : (fa?.[k] as unknown);
      const bv =
        k === 'academic_year'
          ? b.academic_year
          : k === 'term'
          ? b.term
          : k === 'view_type'
          ? b.view_type
          : (fb?.[k] as unknown);
      return { k, av, bv, same: JSON.stringify(av ?? null) === JSON.stringify(bv ?? null) };
    });
  }, [a, b]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-base text-foreground truncate">
            Compare: {a.label} <span className="text-muted-foreground">vs</span> {b.label}
          </h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => exportComparisonPDF(a, b)}>
            <FileDown className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => exportComparisonCSV(a, b)}
          >
            <FileText className="w-3.5 h-3.5" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SnapshotMiniCard label="A" snapshot={a} />
        <SnapshotMiniCard label="B" snapshot={b} />
      </div>

      <section className="rounded-2xl bg-card border border-border p-5">
        <h4 className="font-display font-semibold text-sm text-foreground mb-3">
          KPI Differences
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2">Metric</th>
                <th className="text-right py-2">A</th>
                <th className="text-right py-2">B</th>
                <th className="text-right py-2">Δ (B − A)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const d = r.bv - r.av;
                const cls =
                  Math.abs(d) < 0.01
                    ? 'text-muted-foreground'
                    : d > 0
                    ? 'text-emerald-500'
                    : 'text-red-500';
                return (
                  <tr key={r.label} className="border-b border-border/50">
                    <td className="py-2 text-foreground">{r.label}</td>
                    <td className="py-2 text-right text-foreground">
                      {r.isPct ? `${r.av.toFixed(1)}%` : r.suffix === '' ? r.av.toFixed(2) : r.av.toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-foreground">
                      {r.isPct ? `${r.bv.toFixed(1)}%` : r.suffix === '' ? r.bv.toFixed(2) : r.bv.toLocaleString()}
                    </td>
                    <td className={`py-2 text-right font-semibold ${cls}`}>
                      {d > 0 ? '+' : ''}
                      {d.toFixed(2)}
                      {r.suffix ?? ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-card border border-border p-5">
        <h4 className="font-display font-semibold text-sm text-foreground mb-3">
          Filter / Context Differences
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2">Filter</th>
                <th className="text-left py-2">A</th>
                <th className="text-left py-2">B</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filterRows.map(r => (
                <tr key={r.k} className="border-b border-border/50">
                  <td className="py-2 text-foreground font-medium">{r.k}</td>
                  <td className="py-2 text-muted-foreground">{String(r.av ?? '—')}</td>
                  <td className="py-2 text-muted-foreground">{String(r.bv ?? '—')}</td>
                  <td className="py-2">
                    {r.same ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        same
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">
                        changed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SnapshotMiniCard({ label, snapshot }: { label: string; snapshot: MySessionSnapshot }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
          {label}
        </span>
        <p className="font-semibold text-sm text-foreground truncate">{snapshot.label}</p>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {new Date(snapshot.created_at).toLocaleString()}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{snapshot.reporting_cycle}</p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}

function KpiBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="text-base font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <Bookmark className="w-5 h-5 text-primary" />
      </div>
      <p className="text-sm font-medium text-foreground">No saved sessions yet</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
        Use the <strong>“Save to My Sessions”</strong> button at the top of any tab to capture
        the current view. It will appear here, privately, just for you.
      </p>
    </div>
  );
}

function fmtNum(v: unknown): string {
  if (typeof v !== 'number' || Number.isNaN(v)) return '—';
  return v.toLocaleString();
}
function fmtPct(v: unknown): string {
  if (typeof v !== 'number' || Number.isNaN(v)) return '—';
  return `${v.toFixed(1)}%`;
}
