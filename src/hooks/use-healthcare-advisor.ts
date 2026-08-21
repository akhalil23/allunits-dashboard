import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { HCAssistantContext } from '@/lib/healthcare/assistant-context';

export interface HCChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/** Healthcare-only streaming assistant. Independent from the University advisor. */
export function useHealthcareAdvisor() {
  const [messages, setMessages] = useState<HCChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (userText: string, healthcareContext: HCAssistantContext) => {
    const userMsg: HCChatMessage = {
      id: crypto.randomUUID(), role: 'user', content: userText, timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    let assistantContent = '';
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

    const push = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, content: assistantContent } : m)));
    };

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const history = [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('You must be signed in to use the Healthcare SP Assistant.');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/healthcare-advisor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ messages: history, healthcareContext }),
          signal: controller.signal,
        },
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const fallback =
          resp.status === 429 ? 'Rate limit reached. Please wait a moment and try again.'
          : resp.status === 402 ? 'AI usage limit reached. Please add credits.'
          : resp.status === 403 ? 'Your account does not have Healthcare access.'
          : 'Failed to get a response.';
        throw new Error((errData as { error?: string }).error || fallback);
      }
      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;

      const consume = (line: string) => {
        let l = line;
        if (l.endsWith('\r')) l = l.slice(0, -1);
        if (!l.startsWith('data: ')) return true;
        const jsonStr = l.slice(6).trim();
        if (jsonStr === '[DONE]') { done = true; return true; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) push(content);
          return true;
        } catch {
          return false;
        }
      };

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx);
          const rest = buffer.slice(idx + 1);
          if (!consume(line)) break;
          buffer = rest;
          if (done) break;
        }
      }
      if (buffer.trim()) buffer.split('\n').forEach(l => l && consume(l));

      if (!assistantContent.trim()) {
        push('No response was returned. Please try asking again.');
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, content: `⚠️ ${msg}` } : m)));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages };
}
