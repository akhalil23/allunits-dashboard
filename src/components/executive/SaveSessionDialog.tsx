/**
 * SaveSessionDialog — captures the current dashboard view as a personal snapshot.
 * Phase 1: title + optional description. Suggests an automatic title.
 */

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateMySession } from '@/hooks/use-my-sessions';
import { buildSnapshotInput, suggestSessionTitle, type CaptureContext } from '@/lib/my-sessions-snapshot';
import type { UniversityAggregation } from '@/lib/university-aggregation';

interface Props {
  open: boolean;
  onClose: () => void;
  context: CaptureContext;
  aggregation: UniversityAggregation;
  onSaved?: () => void;
}

export default function SaveSessionDialog({ open, onClose, context, aggregation, onSaved }: Props) {
  const create = useCreateMySession();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const suggested = suggestSessionTitle(context);

  useEffect(() => {
    if (open) {
      setTitle(suggested);
      setNotes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    const finalTitle = title.trim() || suggested;
    try {
      const input = buildSnapshotInput(context, aggregation, finalTitle, notes);
      await create.mutateAsync(input);
      toast.success('Session saved to My Sessions');
      onSaved?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save session';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-4 h-4 text-primary" />
            Save to My Sessions
          </DialogTitle>
          <DialogDescription>
            Capture the current dashboard view — filters, KPIs, and unit data — to your private session history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={suggested}
              maxLength={140}
            />
            <button
              type="button"
              onClick={() => setTitle(suggested)}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <Sparkles className="w-3 h-3" /> Use suggested title
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Description <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span>
            </label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Why are you saving this view? Any context worth remembering?"
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground space-y-1">
            <div><span className="font-semibold text-foreground">Tab:</span> {context.activeTab}</div>
            <div>
              <span className="font-semibold text-foreground">Context:</span>{' '}
              AY {context.academicYear} • {context.term === 'mid' ? 'Mid-Year' : 'End-of-Year'} •{' '}
              {context.viewType === 'cumulative' ? 'Cumulative (SP)' : 'Yearly'}
              {context.selectedPillar && context.selectedPillar !== 'all' ? ` • Pillar ${context.selectedPillar}` : ''}
            </div>
            <div>
              <span className="font-semibold text-foreground">KPIs captured:</span>{' '}
              Completion {aggregation.completionPct.toFixed(1)}% • On Track {aggregation.onTrackPct.toFixed(1)}% • RI {aggregation.riskIndex.toFixed(2)}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={create.isPending} className="gap-2">
            {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
