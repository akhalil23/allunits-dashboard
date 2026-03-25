import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DashboardContextPayload {
  filters: {
    academicYear: string;
    term: string;
    viewType: string;
    selectedPillar: string;
  };
  universityMetrics: {
    totalUnits: number;
    loadedUnits: number;
    totalItems: number;
    applicableItems: number;
    naCount: number;
    completionPct: number;
    onTrackPct: number;
    belowTargetPct: number;
    riskIndex: number;
    cotCount: number;
    cbtCount: number;
    inProgressCount: number;
    notStartedCount: number;
    riskCounts: {
      noRisk: number;
      emerging: number;
      critical: number;
      realized: number;
    };
  };
  unitRankings: {
    unitName: string;
    completionPct: number;
    riskIndex: number;
    applicableItems: number;
  }[];
  topRiskUnits: string[];
  failedUnits: string[];
}

export function useExecutiveAdvisor() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    userText: string,
    dashboardContext: DashboardContextPayload
  ) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    let assistantContent = '';

    // Add placeholder assistant message
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      // Build conversation history for AI (last 10 messages for context)
      const historyForAI = [...messages, userMsg]
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/executive-advisor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: historyForAI,
            dashboardContext,
          }),
          signal: controller.signal,
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error('Rate limit reached. Please wait a moment.');
        } else if (resp.status === 402) {
          toast.error('AI usage limit reached.');
        }
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get response');
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
              );
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setMessages(prev =>
        prev.map(m => m.id === assistantId
          ? { ...m, content: `Sorry, I encountered an error: ${msg}` }
          : m
        )
      );
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages };
}

export type { ChatMessage, DashboardContextPayload };
