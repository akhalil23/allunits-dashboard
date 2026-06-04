import { useState } from 'react';
import { Stethoscope, BookOpen, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/use-theme';
import DashboardGuideDrawer from './DashboardGuideDrawer';

export default function HealthcareHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const [guideOpen, setGuideOpen] = useState(false);
  return (
    <header className="border-b border-border bg-card/40 backdrop-blur px-6 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <Stethoscope className="w-4 h-4 text-emerald-300" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-display font-semibold text-foreground truncate">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setGuideOpen(true)}
          className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-200 hover:text-emerald-100 hover:bg-emerald-500/10"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Dashboard Guide
        </Button>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/5 hidden sm:inline-flex">
          Phase 1 · Prototype
        </Badge>
      </div>
      <DashboardGuideDrawer open={guideOpen} onOpenChange={setGuideOpen} />
    </header>
  );
}
