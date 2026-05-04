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
  AlertTriangle,
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
import {
  CONTEXT_LABELS,
  buildContextKpiRowsMulti,
  computeMomentum,
  getSessionContext,
  isKpiComparableContext,
  type KpiRowMulti,
  type Momentum,
  type SessionContext,
} from '@/lib/session-context-kpis';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Activity, Lightbulb, Sparkle } from 'lucide-react';
import { toast } from 'sonner';
import {
  buildKpiNarrative,
  buildMetadataNarrative,
  type NarrativeBundle,
  type NarrativeInsight,
  type NarrativeTone,
} from '@/lib/my-sessions-narrative';

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

const MAX_COMPARE = 5;

type View =
  | { kind: 'list' }
  | { kind: 'detail'; id: string }
  | { kind: 'compare'; ids: string[] };

export default function MySessionsTab({ aggregation, onRestore, onSaveCurrent }: Props) {
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const { viewType, academicYear, term } = useDashboard();
  const { data: sessions, isLoading } = useMySessions();
  const deleteMutation = useDeleteMySession();

  const [view, setView] = useState<View>({ kind: 'list' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // up to MAX_COMPARE for compare

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
      if (prev.length >= MAX_COMPARE) {
        toast.info(`You can compare up to ${MAX_COMPARE} sessions at once.`);
        return prev;
      }
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
    const snapshots = view.ids
      .map(id => sessionMap.get(id))
      .filter((s): s is MySessionSnapshot => !!s);
    if (snapshots.length < 2) {
      setView({ kind: 'list' });
      return null;
    }
    return <CompareView snapshots={snapshots} onBack={() => setView({ kind: 'list' })} />;
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
              <strong>{selectedIds.length}</strong> of {MAX_COMPARE} selected for comparison
              {selectedIds.length < 2 ? ' — pick at least one more' : ''}
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
                disabled={selectedIds.length < 2}
                onClick={() =>
                  setView({ kind: 'compare', ids: [...selectedIds] })
                }
              >
                <GitCompare className="w-3 h-3" />
                Compare ({selectedIds.length})
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
              Your private saved views — newest first. Select 2 to {MAX_COMPARE} to compare.
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {CONTEXT_LABELS[getSessionContext(s)]}
                        </span>
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
const SNAPSHOT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function CompareView({
  snapshots: rawSnapshots,
  onBack,
}: {
  snapshots: MySessionSnapshot[];
  onBack: () => void;
}) {
  // Sort snapshots chronologically (oldest → newest) so trendlines and Δ
  // calculations always reflect time progression, regardless of selection order.
  const snapshots = useMemo(
    () =>
      [...rawSnapshots].sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        if (ta !== tb) return ta - tb;
        return a.id.localeCompare(b.id);
      }),
    [rawSnapshots],
  );

  const contexts = snapshots.map(getSessionContext);
  const baseCtx = contexts[0];
  const sameContext = contexts.every(c => c === baseCtx);
  const kpiComparable = sameContext && isKpiComparableContext(baseCtx);

  const rows = useMemo(
    () => (kpiComparable ? buildContextKpiRowsMulti(baseCtx, snapshots) : []),
    [kpiComparable, baseCtx, snapshots],
  );

  // Chronological labels for the trendline X-axis.
  const trendPoints = useMemo(
    () =>
      snapshots.map((s, i) => ({
        idx: i,
        key: SNAPSHOT_LETTERS[i] ?? `S${i + 1}`,
        date: new Date(s.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
      })),
    [snapshots],
  );

  const filterRows = useMemo(() => {
    const baseKeys = ['academic_year', 'term', 'view_type', 'activeTab', 'selectedPillar', 'selectedUnit'];
    return baseKeys.map(k => {
      const values = snapshots.map(s => {
        const fm = (s.filters ?? {}) as Record<string, unknown>;
        if (k === 'academic_year') return s.academic_year;
        if (k === 'term') return s.term;
        if (k === 'view_type') return s.view_type;
        return fm?.[k];
      });
      const baseSer = JSON.stringify(values[0] ?? null);
      const allSame = values.every(v => JSON.stringify(v ?? null) === baseSer);
      return { k, values, allSame };
    });
  }, [snapshots]);

  const labelLine =
    snapshots.length <= 3
      ? snapshots.map(s => s.label).join(' vs ')
      : `${snapshots[0].label} + ${snapshots.length - 1} others`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-base text-foreground truncate">
            Compare ({snapshots.length}): {labelLine}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {sameContext ? (
              <>Context: <span className="text-foreground font-medium">{CONTEXT_LABELS[baseCtx]}</span></>
            ) : (
              <>
                Mixed contexts:{' '}
                {Array.from(new Set(contexts))
                  .map(c => CONTEXT_LABELS[c])
                  .join(' · ')}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => exportComparisonPDF(snapshots)}>
            <FileDown className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => exportComparisonCSV(snapshots)}
          >
            <FileText className="w-3.5 h-3.5" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {snapshots.map((s, i) => (
          <SnapshotMiniCard
            key={s.id}
            label={SNAPSHOT_LETTERS[i] ?? `S${i + 1}`}
            snapshot={s}
            context={contexts[i]}
          />
        ))}
      </div>

      {!sameContext && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Limited comparability</p>
            <p className="text-xs text-foreground/75 leading-relaxed">
              The selected snapshots come from <strong>different dashboard contexts</strong>{' '}
              ({Array.from(new Set(contexts)).map(c => CONTEXT_LABELS[c]).join(' / ')}).
              Their KPIs are not directly comparable, so KPI tables are hidden. Only metadata
              and filters are compared below.
            </p>
            <p className="text-[11px] text-muted-foreground pt-1">
              Tip: to compare KPIs side-by-side, save all snapshots from the same tab.
            </p>
          </div>
        </div>
      )}

      {sameContext && !isKpiComparableContext(baseCtx) && (
        <div className="rounded-2xl border border-border bg-muted/30 p-5 text-xs text-muted-foreground">
          The <strong className="text-foreground">{CONTEXT_LABELS[baseCtx]}</strong> tab does not expose
          numerical KPIs suitable for side-by-side comparison. Showing metadata only.
        </div>
      )}

      {kpiComparable && rows.length > 0 && (
        <TrajectorySection
          contextLabel={CONTEXT_LABELS[baseCtx]}
          rows={rows}
          points={trendPoints}
        />
      )}

      {kpiComparable && rows.length > 0 && (
        <section className="rounded-2xl bg-card border border-border p-5">
          <h4 className="font-display font-semibold text-sm text-foreground mb-1">
            {CONTEXT_LABELS[baseCtx]} — KPI Differences
          </h4>
          <p className="text-[11px] text-muted-foreground mb-3">
            KPIs adapted to the snapshot's source context. Δ columns are relative to A.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2">Metric</th>
                  {snapshots.map((_, i) => (
                    <th key={`v-${i}`} className="text-right py-2 px-2">
                      {SNAPSHOT_LETTERS[i] ?? `S${i + 1}`}
                    </th>
                  ))}
                  {snapshots.slice(1).map((_, i) => (
                    <th key={`d-${i}`} className="text-right py-2 px-2">
                      Δ ({SNAPSHOT_LETTERS[i + 1] ?? `S${i + 2}`} − A)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const fmt = (n: number) =>
                    r.isPct ? `${n.toFixed(1)}%` : r.isCount ? n.toLocaleString() : n.toFixed(2);
                  const base = r.values[0];
                  return (
                    <tr key={r.label} className="border-b border-border/50">
                      <td className="py-2 text-foreground">{r.label}</td>
                      {r.values.map((v, i) => (
                        <td key={`v-${i}`} className="py-2 px-2 text-right text-foreground">
                          {fmt(v)}
                        </td>
                      ))}
                      {r.values.slice(1).map((v, i) => {
                        const d = v - base;
                        const cls =
                          Math.abs(d) < 0.01
                            ? 'text-muted-foreground'
                            : d > 0
                            ? 'text-emerald-500'
                            : 'text-red-500';
                        return (
                          <td
                            key={`d-${i}`}
                            className={`py-2 px-2 text-right font-semibold ${cls}`}
                          >
                            {d > 0 ? '+' : ''}
                            {r.isCount ? Math.round(d).toLocaleString() : d.toFixed(2)}
                            {r.suffix ?? ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-card border border-border p-5">
        <h4 className="font-display font-semibold text-sm text-foreground mb-3">
          Filter / Context Differences
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2">Filter</th>
                {snapshots.map((_, i) => (
                  <th key={`fh-${i}`} className="text-left py-2 px-2">
                    {SNAPSHOT_LETTERS[i] ?? `S${i + 1}`}
                  </th>
                ))}
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filterRows.map(r => (
                <tr key={r.k} className="border-b border-border/50">
                  <td className="py-2 text-foreground font-medium">{r.k}</td>
                  {r.values.map((v, i) => (
                    <td key={`fv-${i}`} className="py-2 px-2 text-muted-foreground">
                      {String(v ?? '—')}
                    </td>
                  ))}
                  <td className="py-2">
                    {r.allSame ? (
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

function SnapshotMiniCard({
  label,
  snapshot,
  context,
}: {
  label: string;
  snapshot: MySessionSnapshot;
  context: SessionContext;
}) {
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
      <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
        {CONTEXT_LABELS[context]}
      </span>
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

// ─── Trajectory Trendline ────────────────────────────────────────────
interface TrendPoint {
  idx: number;
  key: string;
  date: string;
}



function TrajectorySection({
  contextLabel,
  rows,
  points,
}: {
  contextLabel: string;
  rows: KpiRowMulti[];
  points: TrendPoint[];
}) {
  return (
    <section className="rounded-2xl bg-card border border-border p-5">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-4 h-4 text-primary" />
        <h4 className="font-display font-semibold text-sm text-foreground">
          Trajectory — {contextLabel}
        </h4>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">
        Snapshots ordered chronologically (oldest → newest). Dashed line marks the baseline
        (first snapshot). Momentum reflects the overall direction across the series.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map(r => (
          <MiniTrendChart key={r.label} row={r} points={points} />
        ))}
      </div>
    </section>
  );
}

function MiniTrendChart({ row, points }: { row: KpiRowMulti; points: TrendPoint[] }) {
  const momentum = useMemo(
    () => computeMomentum(row.values, { higherIsBetter: row.higherIsBetter ?? true }),
    [row.values, row.higherIsBetter],
  );

  const data = points.map((p, i) => ({
    key: p.key,
    label: `${p.key} · ${p.date}`,
    value: row.values[i],
  }));

  const baseline = row.values[0];
  const fmt = (v: number) =>
    row.isPct ? `${v.toFixed(1)}%` : row.isCount ? Math.round(v).toLocaleString() : v.toFixed(2);

  // Y-axis domain with light padding
  const min = Math.min(...row.values);
  const max = Math.max(...row.values);
  const pad = Math.max((max - min) * 0.15, row.isPct ? 2 : 0.1);
  const domain: [number, number] = [Math.max(0, min - pad), max + pad];

  const stroke = momentumStroke(momentum);

  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-foreground truncate">{row.label}</p>
        <MomentumPill momentum={momentum} />
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="key"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              domain={domain}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v: number) => (row.isPct ? `${Math.round(v)}` : Math.round(v).toString())}
            />
            <ReTooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 11,
              }}
              formatter={(v: number) => [fmt(v), row.label]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
            />
            <ReferenceLine
              y={baseline}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={2}
              dot={{ r: 3, fill: stroke }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
        <span>
          Baseline <span className="text-foreground font-semibold">{fmt(baseline)}</span>
        </span>
        <span>
          Latest{' '}
          <span className="text-foreground font-semibold">
            {fmt(row.values[row.values.length - 1])}
          </span>
        </span>
      </div>
    </div>
  );
}

function MomentumPill({ momentum }: { momentum: Momentum }) {
  const cfg = momentumConfig(momentum);
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.cls}`}
    >
      <Icon className="w-3 h-3" />
      {momentum}
    </span>
  );
}

function momentumStroke(m: Momentum): string {
  switch (m) {
    case 'Improving':
      return '#10B981'; // emerald-500
    case 'Declining':
      return '#EF4444'; // red-500
    case 'Volatile':
      return '#F59E0B'; // amber-500
    case 'Stable':
    default:
      return 'hsl(var(--muted-foreground))';
  }
}

function momentumConfig(m: Momentum): { cls: string; icon: typeof TrendingUp } {
  switch (m) {
    case 'Improving':
      return { cls: 'bg-emerald-500/15 text-emerald-500', icon: TrendingUp };
    case 'Declining':
      return { cls: 'bg-red-500/15 text-red-500', icon: TrendingDown };
    case 'Volatile':
      return { cls: 'bg-amber-500/15 text-amber-500', icon: Activity };
    case 'Stable':
    default:
      return { cls: 'bg-muted text-muted-foreground', icon: Minus };
  }
}
