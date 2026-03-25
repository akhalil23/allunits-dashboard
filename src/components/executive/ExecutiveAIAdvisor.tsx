/**
 * Executive AI Advisor — Persistent floating chat panel
 * Data-grounded strategic assistant for the Executive Command Center.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  X, Send, Trash2, Copy, Check, Sparkles, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useExecutiveAdvisor, type DashboardContextPayload } from '@/hooks/use-executive-advisor';
import type { UniversityAggregation } from '@/lib/university-aggregation';
import { useDashboard } from '@/contexts/DashboardContext';
import { cn } from '@/lib/utils';

interface Props {
  aggregation: UniversityAggregation;
}

const SUGGESTED_QUESTIONS = [
  'Give me the overall status',
  'What requires urgent attention?',
  'Which units are at highest risk?',
  'Summarize performance by pillar',
  'Explain the Risk Index',
  'How is SEEI calculated?',
  'Show top performing units',
  'Prepare a briefing summary',
];

export default function ExecutiveAIAdvisor({ aggregation }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isLoading, sendMessage, clearMessages } = useExecutiveAdvisor();
  const { viewType, academicYear, term, selectedPillar } = useDashboard();

  const dashboardContext = useMemo<DashboardContextPayload>(() => ({
    filters: {
      academicYear,
      term: term === 'mid' ? 'Mid-Year' : 'End-of-Year',
      viewType: viewType === 'cumulative' ? 'Cumulative (SP)' : 'Yearly',
      selectedPillar: selectedPillar === 'all' ? 'All Pillars' : `Pillar ${selectedPillar}`,
    },
    universityMetrics: {
      totalUnits: aggregation.totalUnits,
      loadedUnits: aggregation.loadedUnits,
      totalItems: aggregation.totalItems,
      applicableItems: aggregation.applicableItems,
      naCount: aggregation.naCount,
      completionPct: aggregation.completionPct,
      onTrackPct: aggregation.onTrackPct,
      belowTargetPct: aggregation.belowTargetPct,
      riskIndex: aggregation.riskIndex,
      cotCount: aggregation.cotCount,
      cbtCount: aggregation.cbtCount,
      inProgressCount: aggregation.inProgressCount,
      notStartedCount: aggregation.notStartedCount,
      riskCounts: {
        noRisk: aggregation.riskCounts.noRisk,
        emerging: aggregation.riskCounts.emerging,
        critical: aggregation.riskCounts.critical,
        realized: aggregation.riskCounts.realized,
      },
    },
    unitRankings: aggregation.unitAggregations
      .map(u => ({
        unitName: u.unitName,
        completionPct: u.completionPct,
        riskIndex: u.riskIndex,
        applicableItems: u.applicableItems,
      }))
      .sort((a, b) => b.riskIndex - a.riskIndex),
    topRiskUnits: aggregation.topRiskiestUnits.map(u => u.unitName),
    failedUnits: aggregation.failedUnits,
  }), [aggregation, viewType, academicYear, term, selectedPillar]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage(text, dashboardContext);
  };

  const handleSuggestion = (q: string) => {
    if (isLoading) return;
    sendMessage(q, dashboardContext);
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow group"
            title="Executive AI Advisor"
          >
            <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-48px)] sm:h-[600px] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-5 py-4 border-b border-border bg-gradient-to-r from-primary/8 to-transparent shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Sparkles className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold text-foreground">Executive AI Advisor</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Ask about performance, risks, budget, or metrics.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live data
                  </span>
                  <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  {/* Welcome */}
                  <div className="text-center py-4">
                    <Sparkles className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                      Ask me anything about the Strategic Plan execution, risks, budget, or performance.
                      You can request explanations, comparisons, or executive summaries.
                    </p>
                  </div>
                  {/* Suggested questions */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Suggested Questions</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {SUGGESTED_QUESTIONS.map(q => (
                        <button
                          key={q}
                          onClick={() => handleSuggestion(q)}
                          className="text-left px-3 py-2 rounded-lg border border-border/60 bg-muted/20 text-xs text-foreground hover:bg-muted/40 hover:border-primary/30 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted/40 text-foreground border border-border/40 rounded-bl-sm'
                      )}>
                        {msg.role === 'assistant' ? (
                          <div className="space-y-1">
                            <div className="prose prose-xs prose-neutral dark:prose-invert max-w-none [&_p]:mb-1.5 [&_ul]:mb-1.5 [&_li]:mb-0.5 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_strong]:text-foreground">
                              <ReactMarkdown>{msg.content || '…'}</ReactMarkdown>
                            </div>
                            {msg.content && !isLoading && (
                              <div className="flex justify-end mt-1.5">
                                <button
                                  onClick={() => handleCopy(msg.id, msg.content)}
                                  className="p-1 rounded hover:bg-muted/60 transition-colors"
                                  title="Copy response"
                                >
                                  {copiedId === msg.id
                                    ? <Check className="w-3 h-3 text-emerald-500" />
                                    : <Copy className="w-3 h-3 text-muted-foreground" />
                                  }
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span>{msg.content}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
                    <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span>Analyzing dashboard data…</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input area */}
            <div className="shrink-0 border-t border-border px-4 py-3 bg-card">
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={clearMessages}
                    className="p-2 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
                    title="Clear conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                <div className="flex-1 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 focus-within:border-primary/40 transition-colors">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Ask about strategy, risks, budget…"
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
