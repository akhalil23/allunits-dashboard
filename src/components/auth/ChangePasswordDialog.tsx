/**
 * ChangePasswordDialog — Lightweight, secure password change flow for Board Members.
 * Verifies current password via signInWithPassword, then updates to new password
 * and marks user_metadata.password_changed = true.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function validatePassword(p: string): string | null {
  for (const r of PASSWORD_RULES) if (!r.test(p)) return r.label;
  return null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setShow(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    if (next !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    const ruleErr = validatePassword(next);
    if (ruleErr) {
      toast({ title: 'Password too weak', description: ruleErr, variant: 'destructive' });
      return;
    }
    if (next === current) {
      toast({ title: 'Choose a different password', description: 'New password must differ from current.', variant: 'destructive' });
      return;
    }

    setBusy(true);
    try {
      // Verify current password
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      });
      if (verifyErr) {
        toast({ title: 'Current password incorrect', variant: 'destructive' });
        setBusy(false);
        return;
      }

      // Update to new password and mark as changed
      const { error: updErr } = await supabase.auth.updateUser({
        password: next,
        data: { password_changed: true, password_changed_at: new Date().toISOString() },
      });
      if (updErr) {
        toast({ title: 'Could not update password', description: updErr.message, variant: 'destructive' });
        setBusy(false);
        return;
      }

      toast({ title: 'Password updated', description: 'Your private password is now active.' });
      reset();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Set a private password only you will know. We never display existing passwords.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cur">Current password</Label>
            <Input id="cur" type={show ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">New password</Label>
            <div className="relative">
              <Input id="new" type={show ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conf">Confirm new password</Label>
            <Input id="conf" type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
          </div>

          <ul className="text-xs space-y-1 rounded-md bg-muted/40 p-3 border border-border/50">
            {PASSWORD_RULES.map((r) => {
              const ok = r.test(next);
              return (
                <li key={r.label} className={ok ? 'text-emerald-500' : 'text-muted-foreground'}>
                  {ok ? '✓' : '•'} {r.label}
                </li>
              );
            })}
          </ul>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
