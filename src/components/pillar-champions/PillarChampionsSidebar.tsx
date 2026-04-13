/**
 * Pillar Champions Sidebar — Navigation for the Pillar Champions Dashboard.
 */

import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, TableProperties, DollarSign,
  ShieldAlert, ChevronRight, Menu, X, LogOut, BookOpen, FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import lauLogo from '@/assets/lau-logo-white.png';
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export type PillarChampionTab = 'overview' | 'performance' | 'actions' | 'budget' | 'risk' | 'reports' | 'guide';

interface Props {
  activeTab: PillarChampionTab;
  onTabChange: (tab: PillarChampionTab) => void;
}

const tabs: { id: PillarChampionTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Pillar Overview', icon: LayoutDashboard },
  { id: 'performance', label: 'Performance Analysis', icon: BarChart3 },
  { id: 'actions', label: 'Action Explorer', icon: TableProperties },
  { id: 'budget', label: 'Budget Intelligence', icon: DollarSign },
  { id: 'risk', label: 'Risk & Attention', icon: ShieldAlert },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'guide', label: 'Dashboard Guide', icon: BookOpen },
];

export default function PillarChampionsSidebar({ activeTab, onTabChange }: Props) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isTablet, setIsTablet] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const isTouchLike = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
      setIsTablet(isTouchLike && w >= 768 && w < 1280);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const navItems = tabs.map(t => ({
    id: t.id,
    label: t.label,
    icon: t.icon,
    active: activeTab === t.id,
    onClick: () => { onTabChange(t.id); setDrawerOpen(false); },
  }));

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-card border border-border shadow-md text-foreground"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={() => setDrawerOpen(false)} />
              <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed top-0 left-0 bottom-0 z-50 w-72 sidebar-gradient flex flex-col">
                <div className="flex items-center justify-between px-4 pt-4">
                  <div className="flex items-center gap-2">
                    <img src={lauLogo} alt="LAU Logo" className="h-10 w-auto object-contain" />
                    <div>
                      <h1 className="text-white font-display font-bold text-xs tracking-wider">Pillar Champions</h1>
                      <p className="text-white/50 text-[9px] tracking-widest uppercase">Strategic Plan IV</p>
                    </div>
                  </div>
                  <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="h-px bg-white/10 mx-4 mt-3" />
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                  {navItems.map(item => (
                    <button key={item.id} onClick={item.onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 group relative ${item.active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/[0.08]'}`}>
                      {item.active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.active && <ChevronRight className="w-3 h-3 text-white/50" />}
                    </button>
                  ))}
                </nav>
                <div className="px-4 pb-4">
                  <button onClick={() => navigate('/logout')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-sm transition-colors">
                    <LogOut className="w-4 h-4" /><span>Sign out</span>
                  </button>
                  <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 mt-2">
                    <p className="text-[10px] text-white/40 leading-tight">Pillar Champions Dashboard<br />Lebanese American University</p>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  if (isTablet) {
    return (
      <aside className="sidebar-gradient w-16 h-screen flex flex-col shrink-0 min-h-0">
        <div className="px-2 pt-4 pb-3 flex justify-center">
          <img src={lauLogo} alt="LAU Logo" className="h-10 w-10 object-contain rounded" />
        </div>
        <div className="h-px bg-white/10 mx-2" />
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={item.onClick} title={item.label} className={`w-full flex items-center justify-center p-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative ${item.active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/[0.08]'}`}>
              {item.active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" />}
              <item.icon className="w-4 h-4" />
            </button>
          ))}
        </nav>
        <div className="px-2 pb-3"><div className="w-full h-px bg-white/10" /></div>
      </aside>
    );
  }

  return (
    <aside className="sidebar-gradient w-64 min-w-[16rem] h-screen flex flex-col shrink-0 min-h-0">
      <div className="px-4 pt-5 pb-4">
        <div className="flex flex-col items-center gap-3 px-3 py-4">
          <img src={lauLogo} alt="LAU Logo" className="h-20 w-auto object-contain" />
          <div className="text-center">
            <h1 className="text-white font-display font-bold text-sm leading-tight tracking-wider">Pillar Champions</h1>
            <p className="text-white/50 text-[10px] tracking-widest uppercase">Strategic Plan IV</p>
          </div>
        </div>
      </div>
      <div className="h-px bg-white/10 mx-4" />
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => (
          <motion.button key={item.id} onClick={item.onClick} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 group relative ${item.active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/[0.08]'}`}>
            {item.active && (
              <motion.div layoutId="pillar-sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
            )}
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="truncate flex-1 text-left">{item.label}</span>
            {item.active && <ChevronRight className="w-3 h-3 text-white/50" />}
          </motion.button>
        ))}
      </nav>
      <div className="px-4 pb-4">
        <button onClick={() => navigate('/logout')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-sm transition-colors mb-2">
          <LogOut className="w-4 h-4" /><span>Sign out</span>
        </button>
        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/40 leading-tight">Pillar Champions Dashboard<br />Lebanese American University</p>
        </div>
      </div>
    </aside>
  );
}
