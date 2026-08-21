import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { useHealthcareData } from '@/lib/healthcare/HealthcareDataProvider';
import { buildHealthcareAssistantContext, healthcareSuggestedPrompts, type HCAssistantScope } from '@/lib/healthcare/assistant-context';
import { useHealthcareAdvisor } from '@/hooks/use-healthcare-advisor';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scope?: HCAssistantScope;
}

export default function HealthcareAssistant({ open, onOpenChange, scope }: Props) {
  const { data, isLoading: dataLoading, error } = useHealthcareData();
  const { messages, isLoading, sendMessage, clearMessages } = useHealthcareAdvisor();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const context = useMemo(() => buildHealthcareAssistantContext(data, scope), [data, scope]);
  const prompts = useMemo(() => healthcareSuggestedPrompts(context), [context]);
  const hasData = data.goals.length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || isLoading || !hasData) return;
    setInput('');
    void sendMessage(t, context);
  };

  const contextLabel = [
    scope?.tab && `Tab: ${scope.tab}`,
    scope?.goalCode != null && `Goal ${scope.goalCode}`,
    scope?.actionCode && `Action ${scope.actionCode}`,
    scope?.stepCode && `Step ${scope.stepCode}`,
  ].filter(Boolean).join(' · ');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-background border-l border-border">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Healthcare SP Assistant
          </SheetTitle>
          <SheetDescription className="text-xs">
            Grounded in the governed Healthcare calculation layer. It explains reported and derived values, and states plainly when something is not reported.
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/5 text-[10px]">
              <ShieldCheck className="w-3 h-3 mr-1" /> Healthcare data only
            </Badge>
            {contextLabel && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">{contextLabel}</Badge>
            )}
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] ml-auto" onClick={clearMessages}>
                <RotateCcw className="w-3 h-3 mr-1" /> New chat
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {dataLoading && (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading Healthcare data…
            </p>
          )}
          {!dataLoading && error && (
            <p className="text-xs text-destructive">Healthcare data could not be loaded, so the assistant cannot answer reliably.</p>
          )}
          {!dataLoading && !error && !hasData && (
            <p className="text-xs text-muted-foreground">No Healthcare data is currently imported. The assistant will not answer performance questions without governed data.</p>
          )}

          {messages.length === 0 && hasData && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Suggested questions for the current pilot scope:</p>
              <div className="flex flex-col gap-1.5">
                {prompts.map(p => (
                  <button
                    key={p}
                    onClick={() => submit(p)}
                    className="text-left text-xs px-3 py-2 rounded-lg border border-border/70 bg-card/60 hover:bg-card hover:border-emerald-500/40 transition-colors text-foreground"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(m => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-lg px-3 py-2 text-xs bg-emerald-500/15 border border-emerald-500/30 text-foreground'
                    : 'max-w-[92%] rounded-lg px-3 py-2 text-xs bg-card/70 border border-border text-foreground'
                }
              >
                {m.role === 'assistant' ? (
                  m.content ? (
                    <div className="prose prose-invert prose-xs max-w-none text-xs leading-relaxed [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_ul]:my-1 [&_p]:my-1 [&_strong]:text-foreground">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing governed Healthcare data…
                    </span>
                  )
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3 shrink-0 bg-card/40">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input); }
              }}
              placeholder={hasData ? 'Ask about Goal 3 progress, blockers, KPIs, coverage or budget…' : 'No Healthcare data available'}
              disabled={!hasData || isLoading}
              className="min-h-[44px] max-h-32 text-xs resize-none bg-background"
            />
            <Button
              size="icon"
              onClick={() => submit(input)}
              disabled={!hasData || isLoading || !input.trim()}
              className="h-10 w-10 shrink-0 bg-emerald-600 hover:bg-emerald-500"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Expected Progress, Schedule Variance, On/Below Target and composite Risk Index are disabled pending methodology approval.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
