/**
 * Strategic Snapshot Tracker — Right-side sliding drawer.
 * Wraps the SnapshotTracker content in a panel opened from the header.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import SnapshotTracker from './SnapshotTracker';
import type { UniversityAggregation } from '@/lib/university-aggregation';

interface Props {
  open: boolean;
  onClose: () => void;
  aggregation: UniversityAggregation;
}

export default function SnapshotTrackerPanel({ open, onClose, aggregation }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-2xl bg-card border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-border shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display font-bold text-base text-foreground">Strategic Snapshot Tracker</h2>
                  <p className="text-xs text-muted-foreground mt-1">Capture and compare strategic performance across reporting cycles.</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <SnapshotTracker aggregation={aggregation} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
