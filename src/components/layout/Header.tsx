import { useTheme } from '@/hooks/use-theme';
import { useDashboard } from '@/contexts/DashboardContext';
import { getDataIntegrityLevel } from '@/lib/intelligence';
import type { DataQuality } from '@/lib/types';
import { Moon, Sun, RefreshCw, Shield, Download } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  observedAt: string;
  dataQuality: DataQuality;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export default function Header({ observedAt, dataQuality, onRefresh, isRefreshing }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { viewMode, setViewMode } = useDashboard();
  const integrity = getDataIntegrityLevel(dataQuality);

  const integrityColor = integrity === 'Good'
    ? 'bg-green-400/20 text-green-200 border-green-400/30'
    : integrity === 'Moderate'
    ? 'bg-yellow-400/20 text-yellow-200 border-yellow-400/30'
    : 'bg-red-400/20 text-red-200 border-red-400/30';

  return (
    <header className="header-gradient px-6 py-5">
      <div className="flex items-start justify-between">
        {/* Left */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-white/15 text-white text-[11px] font-semibold tracking-wider uppercase">
                GSR
              </span>
              <h1 className="text-white font-display text-xl font-bold">
                Graduate Studies & Research
              </h1>
            </div>
            <p className="text-white/60 text-sm">
              Strategic Plan IV — Intelligence Dashboard
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Data Integrity Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-medium ${integrityColor}`}>
            <Shield className="w-3 h-3" />
            Data: {integrity}
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-full bg-white/10 p-0.5 border border-white/10">
            {(['basic', 'intelligence'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300
                  ${viewMode === mode
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-white/70 hover:text-white'
                  }
                `}
              >
                {mode === 'basic' ? 'Basic' : 'Intelligence'}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/15 hover:text-white transition-all duration-300"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/15 hover:text-white transition-all duration-300"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Timestamp */}
      <div className="mt-3 flex items-center gap-4">
        <p className="text-white/50 text-xs">
          Last refreshed: {observedAt ? new Date(observedAt).toLocaleString() : '—'}
        </p>
        {!observedAt && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-red-400/20 text-red-200">
            ⚠ Timestamp missing — Intelligence disabled
          </span>
        )}
      </div>
    </header>
  );
}
