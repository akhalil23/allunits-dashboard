import { useTheme } from '@/hooks/use-theme';
import { useDashboard } from '@/contexts/DashboardContext';
import { getDataIntegrityLevel } from '@/lib/intelligence';
import type { DataQuality } from '@/lib/types';
import { Moon, Sun, RefreshCw, Shield, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

interface HeaderProps {
  observedAt: string;
  dataQuality: DataQuality;
  onRefresh: () => void;
  isRefreshing?: boolean;
  scrollContainerRef?: React.RefObject<HTMLElement>;
}

export default function Header({ observedAt, dataQuality, onRefresh, isRefreshing, scrollContainerRef }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { viewMode, setViewMode } = useDashboard();
  const integrity = getDataIntegrityLevel(dataQuality);
  const headerRef = useRef<HTMLElement>(null);
  const [showMini, setShowMini] = useState(false);

  // Track scroll on the scroll container (main element)
  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return;
    const onScroll = () => {
      setShowMini(el.scrollTop > 100);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef]);

  const { scrollY } = useScroll({ container: scrollContainerRef as any });
  const bgY = useTransform(scrollY, [0, 300], [0, 60]);
  const contentY = useTransform(scrollY, [0, 300], [0, 15]);
  const headerOpacity = useTransform(scrollY, [0, 200], [1, 0.92]);
  const glowScale = useTransform(scrollY, [0, 300], [1, 1.4]);
  const glowOpacity = useTransform(scrollY, [0, 300], [0.1, 0.02]);
  const meshY = useTransform(scrollY, [0, 300], [0, 30]);
  const glow1Y = useTransform(scrollY, [0, 300], [0, 40]);
  const glow2Y = useTransform(scrollY, [0, 300], [0, 20]);

  const integrityConfig = integrity === 'Good'
    ? { bg: 'bg-emerald-400/15', text: 'text-emerald-300', border: 'border-emerald-400/25', dot: 'bg-emerald-400' }
    : integrity === 'Moderate'
    ? { bg: 'bg-amber-400/15', text: 'text-amber-300', border: 'border-amber-400/25', dot: 'bg-amber-400' }
    : { bg: 'bg-red-400/15', text: 'text-red-300', border: 'border-red-400/25', dot: 'bg-red-400' };

  return (
    <>
      {/* Sticky mini-header */}
      <AnimatePresence>
        {showMini && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed top-0 right-0 z-50 header-gradient-animated backdrop-blur-md border-b border-white/10"
            style={{ left: '16rem' }}
          >
            <div className="flex items-center justify-between px-5 py-2.5">
              {/* Left: GSR badge + title */}
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 text-white/90 text-[10px] font-bold tracking-[0.15em] uppercase border border-white/10">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-300" />
                  GSR
                </span>
                <span className="text-white/80 font-display text-sm font-semibold tracking-tight">
                  SP IV Dashboard
                </span>
              </div>

              {/* Right: key controls */}
              <div className="flex items-center gap-2">
                {/* Data Integrity */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold ${integrityConfig.bg} ${integrityConfig.text} ${integrityConfig.border}`}>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${integrityConfig.dot} opacity-50`} />
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${integrityConfig.dot}`} />
                  </span>
                  <Shield className="w-2.5 h-2.5" />
                  {integrity}
                </div>

                {/* View Toggle */}
                <div className="flex rounded-full bg-white/8 p-0.5 border border-white/10">
                  {(['basic', 'intelligence'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className="relative px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-200"
                    >
                      {viewMode === mode && (
                        <motion.div
                          layoutId="miniViewModeIndicator"
                          className="absolute inset-0 bg-white rounded-full shadow-sm"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 ${viewMode === mode ? 'text-primary' : 'text-white/60'}`}>
                        {mode === 'basic' ? 'Basic' : 'Intel'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Refresh */}
                <button
                  onClick={onRefresh}
                  className="p-1.5 rounded-md bg-white/8 text-white/70 hover:bg-white/15 hover:text-white transition-colors border border-white/5"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>

                {/* Theme */}
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-md bg-white/8 text-white/70 hover:bg-white/15 hover:text-white transition-colors border border-white/5"
                >
                  {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main header */}
      <header ref={headerRef} className="relative overflow-hidden">
        {/* Animated gradient background with parallax */}
        <motion.div className="absolute inset-0 header-gradient-animated" style={{ y: bgY }} />

        {/* Subtle mesh overlay */}
        <motion.div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '60px 60px, 80px 80px',
            y: meshY,
          }}
        />

        {/* Glow accent with parallax */}
        <motion.div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(152 100% 50%) 0%, transparent 70%)',
            scale: glowScale,
            opacity: glowOpacity,
            y: glow1Y,
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-16 left-1/3 w-56 h-56 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(152 80% 45%) 0%, transparent 70%)',
            opacity: glowOpacity,
            y: glow2Y,
          }}
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div className="relative z-10 px-6 py-5" style={{ y: contentY, opacity: headerOpacity }}>
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
        </motion.div>
      </header>
    </>
  );
}
