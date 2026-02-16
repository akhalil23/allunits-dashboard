import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface Props {
  context: string;
}

export default function AIInsightCard({ context }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="card-elevated p-5 relative overflow-hidden border-l-4 border-l-primary"
    >
      {/* Tinted background */}
      <div className="absolute inset-0 bg-primary/[0.03] pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI Insight</span>
        </div>

        <p className="text-sm text-foreground leading-relaxed mb-3">
          {context || 'Select filters to generate AI-powered insights about your strategic plan execution.'}
        </p>

        <p className="text-[10px] text-muted-foreground italic border-t border-border pt-2">
          AI-generated insights and recommendations — decision-support only.
        </p>
      </div>
    </motion.div>
  );
}
