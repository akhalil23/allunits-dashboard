/**
 * Executive Header — University Command Center.
 * Includes "Explore Strategic Trends" button.
 */

import { useState } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, RefreshCw, LogOut, Camera, ArrowLeft, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/use-user-role';
import ChangePasswordDialog from '@/components/auth/ChangePasswordDialog';

interface ExecutiveHeaderProps {
  loadedUnits: number;
  totalUnits: number;
  onRefresh: () => void;
  isRefreshing?: boolean;
  observedAt?: string;
  onOpenSnapshotTracker?: () => void;
}

export default function ExecutiveHeader({ loadedUnits, totalUnits, onRefresh, isRefreshing, observedAt, onOpenSnapshotTracker }: ExecutiveHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: userRole } = useUserRole();
  const isAdmin = userRole?.role === 'admin';
  const isBoard = userRole?.role === 'board_member';
  const [pwdOpen, setPwdOpen] = useState(false);

  return (
    <header className={`relative overflow-hidden ${isMobile ? 'sticky top-0 z-40' : ''}`}>
      <div className="absolute inset-0 header-gradient-animated" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '60px 60px, 80px 80px',
        }}
      />

      <div className={`relative z-10 ${isMobile ? 'px-4 py-3 pl-14' : 'px-6 py-5'}`}>
        <div className="flex items-start justify-between gap-2">
          <motion.div
            className="flex items-center gap-4 min-w-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="flex flex-col min-w-0">
              <h1 className={`text-white font-display font-bold tracking-tight mb-0.5 ${isMobile ? 'text-base leading-tight' : 'text-2xl mb-1.5'}`}>
                University Executive Command Center
              </h1>
              {!isMobile && (
                <motion.p
                  className="text-white/50 text-sm font-medium tracking-wide"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  Strategic Plan IV — President & Board Edition
                </motion.p>
              )}
            </div>
          </motion.div>

          <motion.div
            className="flex items-center gap-1.5 sm:gap-2.5 shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Back to Admin */}
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() => navigate('/admin')}
                    className="p-2 rounded-lg bg-white/[0.08] text-white/70 hover:bg-white/15 hover:text-white transition-colors duration-200 border border-white/5"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Back to Admin Panel</p></TooltipContent>
              </Tooltip>
            )}

            {/* Strategic Snapshot Tracker Button */}
            {onOpenSnapshotTracker && (
              <motion.button
                onClick={onOpenSnapshotTracker}
                className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-white/[0.12] text-white/90 hover:bg-white/20 hover:text-white transition-colors duration-200 border border-white/10 text-[11px] font-semibold"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Strategic Snapshot Tracker</span>
              </motion.button>
            )}

            {/* Coverage Badge */}
            <motion.div
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full border backdrop-blur-sm text-[11px] font-semibold ${
                loadedUnits === totalUnits
                  ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25'
                  : 'bg-amber-400/15 text-amber-300 border-amber-400/25'
              }`}
              whileHover={{ scale: 1.03 }}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${loadedUnits === totalUnits ? 'bg-emerald-400' : 'bg-amber-400'} opacity-50`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${loadedUnits === totalUnits ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </span>
              <span className="hidden sm:inline">{loadedUnits}/{totalUnits} Units</span>
            </motion.div>

            {/* Manual refresh removed — dashboard now uses controlled monthly snapshots. */}

            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => navigate('/logout')}
                  className="p-2 rounded-lg bg-white/[0.08] text-white/70 hover:bg-white/15 hover:text-white transition-colors duration-200 border border-white/5"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Sign out</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-white/[0.08] text-white/70 hover:bg-white/15 hover:text-white transition-colors duration-200 border border-white/5"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={theme}
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </motion.div>
                  </AnimatePresence>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>{theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}</p></TooltipContent>
            </Tooltip>
          </motion.div>
        </div>

        {!isMobile && observedAt && (
          <motion.div
            className="mt-3 flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <p className="text-white/40 text-xs font-medium">
              Data Retrieved: {new Date(observedAt).toLocaleString()}
            </p>
          </motion.div>
        )}
      </div>
    </header>
  );
}
