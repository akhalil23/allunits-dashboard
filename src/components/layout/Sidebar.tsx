import { useLocation, useNavigate } from 'react-router-dom';
import { useDashboard } from '@/contexts/DashboardContext';
import { PILLAR_LABELS } from '@/lib/constants';
import type { PillarId } from '@/lib/types';
import {
  LayoutDashboard, FlaskConical, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import lauLogo from '@/assets/lau-logo.png';

const pillars: PillarId[] = ['I', 'II', 'III', 'IV', 'V'];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedPillar, setSelectedPillar } = useDashboard();
  const isEvolutionLab = location.pathname === '/evolution-lab';

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: !isEvolutionLab && selectedPillar === 'all',
      onClick: () => { navigate('/'); setSelectedPillar('all'); },
    },
    ...pillars.map(p => ({
      id: `pillar-${p}`,
      label: `Pillar ${p}`,
      sublabel: PILLAR_LABELS[p],
      icon: null,
      active: !isEvolutionLab && selectedPillar === p,
      onClick: () => { navigate('/'); setSelectedPillar(p); },
    })),
    {
      id: 'evolution',
      label: 'Evolution Lab',
      icon: FlaskConical,
      active: isEvolutionLab,
      onClick: () => navigate('/evolution-lab'),
    },
  ];

  return (
    <aside className="sidebar-gradient w-64 min-h-screen flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex flex-col items-center gap-3 px-3 py-4">
          <img
            src={lauLogo}
            alt="LAU Logo"
            className="h-20 w-auto object-contain"
          />
          <div className="text-center">
            <h1 className="text-white font-display font-bold text-sm leading-tight tracking-wider">GSR</h1>
            <p className="text-white/50 text-[10px] tracking-widest uppercase">Strategic Plan IV</p>
          </div>
        </div>
      </div>

      <div className="h-px bg-white/10 mx-4" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => (
          <motion.button
            key={item.id}
            onClick={item.onClick}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-300 group relative
              ${item.active
                ? 'bg-white/15 text-white glow-left'
                : 'text-white/70 hover:text-white hover:bg-white/8'
              }
            `}
          >
            {item.active && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            {item.icon ? (
              <item.icon className="w-4 h-4 shrink-0" />
            ) : (
              <span className="w-4 h-4 shrink-0 rounded bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/80">
                {item.id.replace('pillar-', '')}
              </span>
            )}
            <div className="text-left flex-1 min-w-0">
              <div className="truncate">{item.label}</div>
              {'sublabel' in item && item.sublabel && (
                <div className="text-[10px] text-white/40 truncate">{item.sublabel}</div>
              )}
            </div>
            {item.active && <ChevronRight className="w-3 h-3 text-white/50" />}
          </motion.button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-4">
        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/40 leading-tight">
            Graduate Studies & Research<br />
            Lebanese American University
          </p>
        </div>
      </div>
    </aside>
  );
}
