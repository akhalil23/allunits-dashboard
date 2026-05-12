/**
 * BoardMemberPasswordPrompt — Subtle, dismissible banner inviting board members
 * to set a private password. Shown only if user is board_member and
 * user_metadata.password_changed is not true. Dismissal persists via
 * sessionStorage so it doesn't nag within a session.
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { ShieldCheck, X } from 'lucide-react';
import ChangePasswordDialog from './ChangePasswordDialog';

const DISMISS_KEY = 'board-pwd-prompt-dismissed';

export default function BoardMemberPasswordPrompt() {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1');

  if (role?.role !== 'board_member') return null;
  if (user?.user_metadata?.password_changed === true) return null;
  if (dismissed) return null;

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 pt-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-foreground/80">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>
              For improved privacy and security, you may{' '}
              <button onClick={() => setDialogOpen(true)} className="font-semibold text-primary hover:underline">
                create your own private password
              </button>
              .
            </span>
          </div>
          <button
            onClick={() => { sessionStorage.setItem(DISMISS_KEY, '1'); setDismissed(true); }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <ChangePasswordDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
