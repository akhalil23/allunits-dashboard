import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserRole } from '@/hooks/use-user-role';
import { getDataIntegrityLevel } from '@/lib/intelligence';
import type { IntegrityAuditResult } from '@/lib/intelligence';
import type { DataQuality } from '@/lib/types';
import { Moon, Sun, RefreshCw, Shield, Download, FileText, FileSpreadsheet, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useCallback } from 'react';
import type { ActionItem, Term, AcademicYear, ViewType } from '@/lib/types';
import { getTermWindowKey } from '@/lib/types';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportPDF } from '@/lib/export-pdf';
import { useIsMobile } from '@/hooks/use-mobile';
import { getUnitConfig, UNIT_CONFIGS } from '@/lib/unit-config';


interface HeaderProps {
  observedAt: string;
  dataQuality: DataQuality;
  onRefresh: () => void;
  isRefreshing?: boolean;
  items?: ActionItem[];
  term?: Term;
  academicYear?: AcademicYear;
  viewType?: ViewType;
  integrityAudit?: IntegrityAuditResult | null;
  sheetLastModified?: string;
  sheetLastModifiedBy?: string;
}

export default function Header({ observedAt, dataQuality, onRefresh, isRefreshing, items, term, academicYear, viewType, integrityAudit, sheetLastModified, sheetLastModifiedBy }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { unitCode } = useParams<{ unitCode: string }>();
  const unitId = unitCode;
  const { data: userRole } = useUserRole();
  const isMobile = useIsMobile();
  const unitConfig = getUnitConfig(unitId || 'GSR');
  
  const integrity = integrityAudit?.level ?? getDataIntegrityLevel(dataQuality);
  const headerRef = useRef<HTMLElement>(null);

  const isAdmin = userRole?.role === 'admin';

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
    a.download = `${unitId || 'GSR'}_Report_${academicYear}_${term}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getExportRows, academicYear, term, unitId]);

  const handleExportPDF = useCallback(() => {
    if (!items?.length || !term || !academicYear) return;
    const unitConfig = unitId ? getUnitConfig(unitId) : undefined;
    exportPDF({
      items, term, academicYear,
      viewType: viewType || 'cumulative',
      unitName: unitConfig?.name || unitId || 'GSR',
      unitFullName: unitConfig?.fullName || 'Graduate Studies & Research',
    });
  }, [items, term, academicYear, viewType, unitId]);

  const integrityConfig = integrity === 'Good'
    ? { bg: 'bg-emerald-400/15', text: 'text-emerald-300', border: 'border-emerald-400/25', dot: 'bg-emerald-400' }
    : integrity === 'Moderate'
    ? { bg: 'bg-amber-400/15', text: 'text-amber-300', border: 'border-amber-400/25', dot: 'bg-amber-400' }
    : { bg: 'bg-red-400/15', text: 'text-red-300', border: 'border-red-400/25', dot: 'bg-red-400' };

  return (
    <header ref={headerRef} className={`relative overflow-hidden ${isMobile ? 'sticky top-0 z-40' : ''}`}>
      {/* Solid LAU green background */}
      <div className="absolute inset-0 header-gradient-animated" />

      {/* Subtle mesh overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '60px 60px, 80px 80px',
        }}
      />

      <div className={`relative z-10 ${isMobile ? 'px-4 py-3 pl-14' : 'px-6 py-5'}`}>
        <div className="flex items-start justify-between gap-2">
          {/* Left */}
          <motion.div
            className="flex items-center gap-4 min-w-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="flex flex-col min-w-0">
              {/* Unit title with admin switcher */}
              <div className="flex items-center gap-2">
                <h1 className={`text-white font-display font-bold tracking-tight mb-0.5 ${isMobile ? 'text-base leading-tight' : 'text-2xl mb-1.5'}`}>
                  {unitConfig ? `${unitConfig.name} — ${unitConfig.fullName}` : 'Dashboard'}
                </h1>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors">
                        <ChevronDown className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto min-w-[240px]">
                      {Object.values(UNIT_CONFIGS).map(uc => (
                        <DropdownMenuItem
                          key={uc.id}
                          onClick={() => navigate(`/units/${uc.id}`)}
                          className={`cursor-pointer ${uc.id === unitId ? 'bg-accent font-medium' : ''}`}
                        >
                          <span className="font-medium mr-2">{uc.name}</span>
                          <span className="text-xs text-muted-foreground truncate">{uc.fullName}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {!isMobile && (
                <motion.p
                  className="text-white/50 text-sm font-medium tracking-wide"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  Strategic Plan IV — Intelligence Dashboard
                </motion.p>
              )}
            </div>
          </motion.div>

          {/* Right */}
          <motion.div
            className="flex items-center gap-1.5 sm:gap-2.5 shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Data Integrity Badge */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full border backdrop-blur-sm text-[11px] font-semibold ${integrityConfig.bg} ${integrityConfig.text} ${integrityConfig.border}`}
                    whileHover={{ scale: 1.03 }}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${integrityConfig.dot} opacity-50`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${integrityConfig.dot}`} />
                    </span>
                    <Shield className="w-3 h-3" />
                    <span className="hidden sm:inline">Data: {integrity}</span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
                  {integrityAudit ? (
                    <div className="space-y-1">
                      <p><strong>{integrityAudit.applicableItems}</strong> applicable / <strong>{integrityAudit.totalItems}</strong> total items</p>
                      {integrityAudit.diagnosticMessages.length > 0 ? (
                        <ul className="list-disc list-inside space-y-0.5">
                          {integrityAudit.diagnosticMessages.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                      ) : (
                        <p>All integrity checks passed.</p>
                      )}
                    </div>
                  ) : (
                    <p>Data integrity: {integrity}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

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

            {/* Logout */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="p-2 rounded-lg bg-white/8 text-white/70 hover:bg-white/15 hover:text-white transition-colors duration-200 border border-white/5"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <LogOut className="w-4 h-4" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Sign out</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

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

        {/* Timestamp & Snapshot Metadata */}
        {!isMobile && (
          <motion.div
            className="mt-3 flex items-center gap-4 flex-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <p className="text-white/40 text-xs font-medium">
              Data Retrieved: {observedAt ? new Date(observedAt).toLocaleString() : '—'}
            </p>
            {sheetLastModified && (
              <p className="text-white/40 text-xs font-medium">
                Sheet Last Updated: {new Date(sheetLastModified).toLocaleString()}
              </p>
            )}
            {sheetLastModifiedBy && (
              <p className="text-white/40 text-xs font-medium">
                Last Modified By: {sheetLastModifiedBy}
              </p>
            )}
            {!observedAt && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-400/15 text-red-300 border border-red-400/20">
                ⚠ Timestamp missing — Intelligence disabled
              </span>
            )}
          </motion.div>
        )}
      </div>
    </header>
  );
}
