import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Target, Compass, Activity, DollarSign, Users, Network,
  ChevronRight, Menu, X, Shield, LogOut, Stethoscope,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import lauLogo from '@/assets/lau-logo-white.png';
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/use-user-role';

export type HCTab =
  | 'snapshot' | 'goals' | 'explorer' | 'execution'
  | 'budget' | 'governance' | 'future';

interface Props { activeTab: HCTab; onTabChange: (t: HCTab) => void; }

const tabs: { id: HCTab; label: string; icon: React.ElementType }[] = [
  { id: 'snapshot', label: 'Executive Snapshot', icon: LayoutDashboard },
  { id: 'goals', label: 'Strategic Goals Overview', icon: Target },
  { id: 'explorer', label: 'Goal Explorer', icon: Compass },
  { id: 'execution', label: 'Execution Intelligence', icon: Activity },
  { id: 'budget', label: 'Budget Intelligence', icon: DollarSign },
  { id: 'governance', label: 'Governance & Ownership', icon: Users },
  { id: 'future', label: 'Future Integration Vision', icon: Network },
];

export default function HealthcareSidebar({ activeTab, onTabChange }: Props) {
  const navigate = useNavigate();
  const { data: userRole } = useUserRole();
  const isAdmin = userRole?.role === 'admin';
  const isMobile = useIsMobile();
  const [isTablet, setIsTablet] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const touch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
      setIsTablet(touch && w >= 768 && w < 1280);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const navItems = [
    ...tabs.map(t => ({ ...t, active: activeTab === t.id, onClick: () => onTabChange(t.id) })),
    ...(isAdmin ? [{
      id: 'admin' as const, label: 'Admin Panel', icon: Shield,
      active: false, onClick: () => navigate('/admin'),
    }] : []),
  ];

  const Brand = ({ compact = false }: { compact?: boolean }) => (
    <div className={compact ? 'flex items-center gap-2' : 'flex flex-col items-center gap-3 px-3 py-4'}>
      <img src={lauLogo} alt="LAU Logo" className={compact ? 'h-10 w-auto object-contain' : 'h-20 w-auto object-contain'} />
      <div className={compact ? '' : 'text-center'}>
        <h1 className="text-white font-display font-bold text-sm leading-tight tracking-wider flex items-center gap-1.5 justify-center">
          <Stethoscope className="w-3.5 h-3.5 text-emerald-300" />
          Healthcare
        </h1>
        <p className="text-white/50 text-[10px] tracking-widest uppercase">Strategic Plan</p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button onClick={() => setDrawerOpen(true)}
          className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-card border border-border shadow-md text-foreground"
          aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50" onClick={() => setDrawerOpen(false)} />
              <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-0 left-0 bottom-0 z-50 w-72 sidebar-gradient flex flex-col">
                <div className="flex items-center justify-between px-4 pt-4">
                  <Brand compact />
                  <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="h-px bg-white/10 mx-4 mt-3" />
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                  {navItems.map(item => (
                    <button key={item.id} onClick={item.onClick}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative
                        ${item.active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/[0.08]'}`}>
                      {item.active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-300" />}
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.active && <ChevronRight className="w-3 h-3 text-white/50" />}
                    </button>
                  ))}
                </nav>
                <div className="px-4 pb-4">
                  <button onClick={() => navigate('/logout')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-sm">
                    <LogOut className="w-4 h-4" /><span>Sign out</span>
                  </button>
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
            <button key={item.id} onClick={item.onClick} title={item.label}
              className={`w-full flex items-center justify-center p-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative
                ${item.active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/[0.08]'}`}>
              {item.active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-300" />}
              <item.icon className="w-4 h-4" />
            </button>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="sidebar-gradient w-64 min-w-[16rem] h-screen flex flex-col shrink-0 min-h-0">
      <div className="px-4 pt-5 pb-4"><Brand /></div>
      <div className="h-px bg-white/10 mx-4" />
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => (
          <motion.button key={item.id} onClick={item.onClick}
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative
              ${item.active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/[0.08]'}`}>
            {item.active && (
              <motion.div layoutId="hc-sidebar-active"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-300"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
            )}
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="truncate flex-1 text-left">{item.label}</span>
            {item.active && <ChevronRight className="w-3 h-3 text-white/50" />}
          </motion.button>
        ))}
      </nav>
      <div className="px-4 pb-4">
        <button onClick={() => navigate('/logout')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-sm mb-2">
          <LogOut className="w-4 h-4" /><span>Sign out</span>
        </button>
        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/40 leading-tight">
            Healthcare Strategic Plan<br />
            Executive Prototype<br />
            Lebanese American University
          </p>
        </div>
      </div>
    </aside>
  );
}
