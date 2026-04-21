/**
 * MySessionsTab — Phase 1 foundation.
 * Personal, isolated snapshot history for the logged-in user.
 *
 * Phase 1 scope (current):
 *  - Show "Current session" placeholder card
 *  - Show empty state for "Previous sessions" until automatic capture is enabled
 *  - List existing personal snapshots if any exist (read-only)
 *  - Delete a personal snapshot
 *
 * Future phases (NOT implemented yet):
 *  - Automatic snapshot capture per session
 *  - Compare current vs previous
 *  - Download / export
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  History,
  Sparkles,
  Camera,
  GitCompare,
  Download,
  Trash2,
  Loader2,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { useMySessions, useDeleteMySession } from '@/hooks/use-my-sessions';
import type { UniversityAggregation } from '@/lib/university-aggregation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  aggregation: UniversityAggregation;
}

export default function MySessionsTab({ aggregation }: Props) {
  const { user } = useAuth();
  const { viewType, academicYear, term } = useDashboard();
  const { data: sessions, isLoading } = useMySessions();
  const deleteMutation = useDeleteMySession();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const accountLabel = useMemo(() => {
    const email = user?.email ?? '';
    return email.split('@')[0] || 'Your account';
  }, [user?.email]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Session removed');
      setConfirmDeleteId(null);
    } catch (e) {
      toast.error('Failed to remove session');
    }
  };

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

      {/* Current session */}
      <section className="rounded-2xl bg-card border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-sm text-foreground">Current Session</h3>
            <p className="text-[11px] text-muted-foreground">
              Live view of the dashboard you are currently exploring
            </p>
          </div>
          <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold tracking-wide">
            LIVE
          </span>
        </header>

        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Academic Year" value={academicYear} />
          <Stat label="Term" value={term === 'mid' ? 'Mid-Year' : 'End-of-Year'} />
          <Stat label="View" value={viewType === 'cumulative' ? 'Cumulative (SP)' : 'Yearly'} />
          <Stat label="Loaded Units" value={`${aggregation.loadedUnits} / ${aggregation.totalUnits}`} />
        </div>

        <div className="px-5 pb-5 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled className="gap-2">
            <Camera className="w-3.5 h-3.5" />
            Capture session
            <span className="ml-1 text-[9px] uppercase tracking-wider opacity-60">soon</span>
          </Button>
          <Button size="sm" variant="outline" disabled className="gap-2">
            <GitCompare className="w-3.5 h-3.5" />
            Compare
            <span className="ml-1 text-[9px] uppercase tracking-wider opacity-60">soon</span>
          </Button>
          <Button size="sm" variant="outline" disabled className="gap-2">
            <Download className="w-3.5 h-3.5" />
            Export
            <span className="ml-1 text-[9px] uppercase tracking-wider opacity-60">soon</span>
          </Button>
        </div>
      </section>

      {/* Previous sessions */}
      <section className="rounded-2xl bg-card border border-border overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-sm text-foreground">My Snapshot History</h3>
            <p className="text-[11px] text-muted-foreground">
              Your personal record of saved sessions
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
              {sessions.map(s => (
                <li
                  key={s.id}
                  className="group rounded-xl border border-border bg-background/40 hover:bg-background/70 transition-colors p-4 flex items-start gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-foreground truncate">{s.label}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {s.view_type === 'cumulative' ? 'Cumulative' : 'Yearly'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      AY {s.academic_year} • {s.term === 'mid' ? 'Mid-Year' : 'End-of-Year'} •
                      {' '}
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                    {s.notes && (
                      <p className="text-xs text-foreground/70 mt-1.5 line-clamp-2">{s.notes}</p>
                    )}
                  </div>
                  {confirmDeleteId === s.id ? (
                    <div className="flex items-center gap-1 shrink-0">
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
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(s.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Roadmap note */}
      <section className="rounded-2xl bg-card/50 border border-dashed border-border p-5">
        <h4 className="font-display font-semibold text-sm text-foreground mb-2">What's next</h4>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
          <li>Automatic capture of each session you explore</li>
          <li>Side-by-side comparison between current and previous sessions</li>
          <li>Download and export of your saved sessions</li>
        </ul>
      </section>
    </div>
  );
}

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

function EmptyState() {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <History className="w-5 h-5 text-primary" />
      </div>
      <p className="text-sm font-medium text-foreground">No sessions yet</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
        Once automatic session capture is enabled, your past dashboard sessions will appear here —
        privately and only for you.
      </p>
    </div>
  );
}
