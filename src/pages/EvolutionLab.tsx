import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import { mockFetchResult } from '@/lib/mock-data';
import { FlaskConical } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EvolutionLab() {
  return (
    <DashboardLayout>
      <Header
        observedAt={mockFetchResult.observedAt}
        dataQuality={mockFetchResult.dataQuality}
        onRefresh={() => {}}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center h-[60vh] text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <FlaskConical className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Strategic Evolution Lab
          </h2>
          <p className="text-muted-foreground max-w-md">
            Compare data across academic years, terms, and pillars with advanced temporal analysis.
            This feature requires live data connection.
          </p>
          <span className="mt-4 text-xs text-muted-foreground italic">
            Coming soon — connect to Google Sheets to enable
          </span>
        </motion.div>
      </main>
    </DashboardLayout>
  );
}
