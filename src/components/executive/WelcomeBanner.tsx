/**
 * WelcomeBanner — Personalized greeting for the executive dashboard.
 * Shows "Welcome, [Display Name]" using the current user's profile.
 */

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useMyProfile } from '@/hooks/use-my-profile';

export default function WelcomeBanner() {
  const { data: profile, isLoading } = useMyProfile();

  if (isLoading || !profile) return null;

  // Hide the welcome banner for the generic 'sp4' account.
  if (profile.username?.toLowerCase() === 'sp4') return null;

  const name = profile.display_name?.trim() || profile.username;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="px-4 sm:px-6 lg:px-8 pt-4"
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary/[0.08] via-primary/[0.04] to-transparent border border-primary/15">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm sm:text-base font-display font-semibold text-foreground truncate">
            Welcome, {name}
          </p>
          <p className="text-[11px] text-muted-foreground/80 hidden sm:block">
            Your personalized executive workspace
          </p>
        </div>
      </div>
    </motion.div>
  );
}
