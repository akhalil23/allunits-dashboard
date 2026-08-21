import { useState } from 'react';
import { Stethoscope, BookOpen, Moon, Sun, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/use-theme';
import DashboardGuideDrawer from './DashboardGuideDrawer';
import HealthcareAssistant from './HealthcareAssistant';
import type { HCAssistantScope } from '@/lib/healthcare/assistant-context';

export default function HealthcareHeader({ title, subtitle, assistantScope }: { title: string; subtitle?: string; assistantScope?: HCAssistantScope }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
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
          size="sm"
          onClick={() => setAssistantOpen(true)}
          className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SP Assistant</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setGuideOpen(true)}
          className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-200 hover:text-emerald-100 hover:bg-emerald-500/10"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dashboard Guide</span>
        </Button>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/5 hidden lg:inline-flex">
          Goal 3 · Real Data
        </Badge>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border"
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
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>{theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}</p></TooltipContent>
        </Tooltip>
      </div>
      <DashboardGuideDrawer open={guideOpen} onOpenChange={setGuideOpen} />
    </header>
  );
}
