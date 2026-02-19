import { useTheme } from '@/hooks/use-theme';
import { useDashboard } from '@/contexts/DashboardContext';
import { getDataIntegrityLevel } from '@/lib/intelligence';
import type { DataQuality } from '@/lib/types';
import { Moon, Sun, RefreshCw, Shield, Sparkles, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useCallback } from 'react';
import type { ActionItem, Term, AcademicYear, ViewType } from '@/lib/types';
import { getTermWindowKey } from '@/lib/types';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportPDF } from '@/lib/export-pdf';


interface HeaderProps {
  observedAt: string;
  dataQuality: DataQuality;
  onRefresh: () => void;
  isRefreshing?: boolean;
  items?: ActionItem[];
  term?: Term;
  academicYear?: AcademicYear;
  viewType?: ViewType;
}

export default function Header({ observedAt, dataQuality, onRefresh, isRefreshing, items, term, academicYear, viewType }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { viewMode, setViewMode } = useDashboard();
  const integrity = getDataIntegrityLevel(dataQuality);
  const headerRef = useRef<HTMLElement>(null);

  const getExportRows = useCallback(() => {
    if (!items?.length || !term || !academicYear) return null;
    const twk = getTermWindowKey(term, academicYear);
    const vt = viewType || 'cumulative';
    const headers = ['Pillar', 'Goal', 'Objective', 'Action Step', 'Owner', 'Status', 'Completion %', 'Target'];
    const rows = items.map(item => {
      const td = item.terms[twk];
      if (!td) return [item.pillar, item.goal, item.objective, item.actionStep, item.owner, '—', '—', '—'];
      const status = vt === 'cumulative' ? td.spStatus : td.yearlyStatus;
      const completion = vt === 'cumulative' ? td.spCompletion : td.yearlyCompletion;
      const target = vt === 'cumulative' ? td.spTarget : td.yearlyTarget;
      return [item.pillar, item.goal, item.objective, item.actionStep, item.owner, status, `${completion}%`, target];
    });
    return { headers, rows };
  }, [items, term, academicYear, viewType]);

  const handleExportCSV = useCallback(() => {
    const data = getExportRows();
    if (!data) return;
    const csvContent = [data.headers, ...data.rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSR_Report_${academicYear}_${term}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getExportRows, academicYear, term]);

  const handleExportPDF = useCallback(() => {
    if (!items?.length || !term || !academicYear) return;
    exportPDF({ items, term, academicYear, viewType: viewType || 'cumulative' });
  }, [items, term, academicYear, viewType]);
  const integrityConfig = integrity === 'Good'
    ? { bg: 'bg-emerald-400/15', text: 'text-emerald-300', border: 'border-emerald-400/25', dot: 'bg-emerald-400' }
    : integrity === 'Moderate'
    ? { bg: 'bg-amber-400/15', text: 'text-amber-300', border: 'border-amber-400/25', dot: 'bg-amber-400' }
    : { bg: 'bg-red-400/15', text: 'text-red-300', border: 'border-red-400/25', dot: 'bg-red-400' };

  return (
    <header ref={headerRef} className="relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 header-gradient-animated" />

      {/* Subtle mesh overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '60px 60px, 80px 80px',
        }}
      />

      {/* Glow accent */}
      <motion.div
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, hsl(152 100% 50%) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.14, 0.08] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-16 left-1/3 w-56 h-56 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, hsl(152 80% 45%) 0%, transparent 70%)' }}
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 px-6 py-5">
        <div className="flex items-start justify-between">
          {/* Left */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-1.5">
                <motion.span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 backdrop-blur-sm text-white/90 text-[11px] font-bold tracking-[0.15em] uppercase border border-white/10"
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.15)' }}
                  transition={{ duration: 0.2 }}
                >
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  GSR
                </motion.span>
                <h1 className="text-white font-display text-xl font-bold tracking-tight">
                  Graduate Studies & Research
                </h1>
              </div>
              <motion.p
                className="text-white/50 text-sm font-medium tracking-wide"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                Strategic Plan IV — Intelligence Dashboard
              </motion.p>
            </div>
          </motion.div>

          {/* Right */}
          <motion.div
            className="flex items-center gap-2.5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Data Integrity Badge */}
            <motion.div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm text-[11px] font-semibold ${integrityConfig.bg} ${integrityConfig.text} ${integrityConfig.border}`}
              whileHover={{ scale: 1.03 }}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${integrityConfig.dot} opacity-50`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${integrityConfig.dot}`} />
              </span>
              <Shield className="w-3 h-3" />
              Data: {integrity}
            </motion.div>

            {/* View Mode Toggle */}
            <div className="flex rounded-full bg-white/8 p-0.5 border border-white/10 backdrop-blur-sm">
              {(['basic', 'intelligence'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300"
                >
                  {viewMode === mode && (
                    <motion.div
                      layoutId="viewModeIndicator"
                      className="absolute inset-0 bg-white rounded-full shadow-lg"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 ${viewMode === mode ? 'text-primary' : 'text-white/60 hover:text-white/90'}`}>
                    {mode === 'basic' ? 'Basic' : 'Intelligence'}
                  </span>
                </button>
              ))}
            </div>

            {/* Export Dropdown */}
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <motion.button
                        disabled={!items?.length}
                        className="p-2 rounded-lg bg-white/8 text-white/70 hover:bg-white/15 hover:text-white transition-colors duration-200 border border-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Download className="w-4 h-4" />
                      </motion.button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Export report</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh */}
            <motion.button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-white/8 text-white/70 hover:bg-white/15 hover:text-white transition-colors duration-200 border border-white/5"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </motion.button>

            {/* Theme toggle */}
            <motion.button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white/8 text-white/70 hover:bg-white/15 hover:text-white transition-colors duration-200 border border-white/5"
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
          </motion.div>
        </div>

        {/* Timestamp */}
        <motion.div
          className="mt-3 flex items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <p className="text-white/40 text-xs font-medium">
            Last refreshed: {observedAt ? new Date(observedAt).toLocaleString() : '—'}
          </p>
          {!observedAt && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-400/15 text-red-300 border border-red-400/20">
              ⚠ Timestamp missing — Intelligence disabled
            </span>
          )}
        </motion.div>
      </div>
    </header>
  );
}
