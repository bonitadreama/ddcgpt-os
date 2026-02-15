'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { captureClientError, trackEvent } from '@/lib/client-telemetry';
import { getAccessToken, getCurrentUser } from '@/lib/auth-client';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type ChatSession = {
  id: string;
  title: string;
  updated_at: string;
};

export function ChatBrowser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const restoreKey = useMemo(() => (userId ? `ddcgpt:last-session:${userId}` : null), [userId]);

  async function authHeader() {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : null;
  }

  async function loadSessions() {
    const headers = await authHeader();
    if (!headers) {
      setError('Please log in to load chat sessions.');
      return;
    }

    const response = await fetch('/api/chat/sessions', { headers });
    const json = (await response.json()) as { sessions?: ChatSession[]; error?: string };
    if (!response.ok) {
      setError(json.error ?? 'Failed to load sessions.');
      await captureClientError('chat_sessions_load_failed', json.error ?? 'unknown');
      return;
    }

    const loadedSessions = json.sessions ?? [];
    setSessions(loadedSessions);

    const restoredSessionId = restoreKey ? window.localStorage.getItem(restoreKey) : null;
    const chosenSession = loadedSessions.find((session) => session.id === restoredSessionId) ?? loadedSessions[0] ?? null;

    if (chosenSession?.id) {
      setSessionId(chosenSession.id);
      if (restoredSessionId === chosenSession.id) {
        trackEvent('session_resumed', { userId, sessionId: chosenSession.id });
      }
    }
  }

  async function loadMessages(targetSessionId: string) {
    const headers = await authHeader();
    if (!headers) {
      setError('Please log in to load message history.');
      return;
    }

    const response = await fetch(`/api/chat?sessionId=${encodeURIComponent(targetSessionId)}`, { headers });

    const json = (await response.json()) as { messages?: ChatMessage[]; error?: string };
    if (!response.ok) {
      setError(json.error ?? 'Failed to load messages.');
      await captureClientError('chat_messages_load_failed', json.error ?? 'unknown', { sessionId: targetSessionId });
      return;
    }

    setMessages(json.messages ?? []);
  }

  useEffect(() => {
    getCurrentUser().then((user) => {
      setUserId(user?.id ?? null);
      if (!user) {
        setError('You are logged out. Open Login in Settings to continue.');
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    loadSessions().catch((err) => {
      setError('Failed to load chat sessions.');
      captureClientError('chat_initial_load_failed', err);
    });
  }, [userId, restoreKey]);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    if (restoreKey) {
      window.localStorage.setItem(restoreKey, sessionId);
    }

    loadMessages(sessionId).catch((err) => {
      setError('Failed to load message history.');
      captureClientError('chat_history_load_failed', err, { sessionId });
    });
  }, [sessionId, restoreKey]);

  async function createSession() {
    setError(null);
    const headers = await authHeader();
    if (!headers) {
      setError('Please log in to create sessions.');
      return;
    }

    const response = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ title: 'New Chat Session' }),
    });

    const json = (await response.json()) as { session?: ChatSession; error?: string };
    if (!response.ok || !json.session) {
      setError(json.error ?? 'Failed to create session.');
      await captureClientError('chat_create_session_failed', json.error ?? 'unknown');
      return;
    }

    setSessions((prev) => [json.session!, ...prev]);
    setSessionId(json.session.id);
    setMessages([]);
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value || isLoading) return;

    setError(null);
    setIsLoading(true);
    const optimisticMessage: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: value,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setPrompt('');

    try {
      const headers = await authHeader();
      if (!headers) {
        setError('Please log in to send prompts.');
        setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
        return;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ prompt: value, sessionId }),
      });

      const json = (await response.json()) as {
        sessionId?: string;
        reply?: string;
        error?: string;
        tokenUsage?: { totalToday: number };
      };

      if (!response.ok || !json.reply) {
        setError(json.error ?? 'Failed to send prompt.');
        setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
        await captureClientError('chat_send_failed', json.error ?? 'unknown', { sessionId });
        return;
      }

      if (json.sessionId && json.sessionId !== sessionId) {
        setSessionId(json.sessionId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: json.reply!,
        },
      ]);

      await trackEvent('chat_sent', { userId, sessionId: json.sessionId ?? sessionId, totalToday: json.tokenUsage?.totalToday ?? null });
      await loadSessions();
    } catch (err) {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
      setError('Request failed. Check API configuration.');
      await captureClientError('chat_send_request_failed', err, { sessionId });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => loadSessions()} className="rounded-md bg-white/15 px-3 py-2 text-sm">
          Load Sessions
        </button>
        <button onClick={createSession} className="rounded-md bg-blue-600 px-3 py-2 text-sm" disabled={!userId}>
          New Session
        </button>
      </div>

      <select
        value={sessionId ?? ''}
        onChange={(event) => setSessionId(event.target.value || null)}
        className="w-full rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm"
      >
        <option value="">Select a session</option>
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {session.title} • {new Date(session.updated_at).toLocaleString()}
          </option>
        ))}
      </select>

      {error ? <p className="rounded border border-red-400/40 bg-red-500/10 p-2 text-xs text-red-200">{error}</p> : null}

      <div className="h-64 space-y-2 overflow-auto rounded-lg border border-white/10 bg-black/20 p-3">
        {messages.length === 0 ? <p className="text-sm text-slate-300">No messages yet. Start the conversation.</p> : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-lg p-2 text-sm ${message.role === 'assistant' ? 'bg-white/10' : 'bg-blue-500/30'}`}
          >
            <span className="mb-1 block text-xs uppercase text-slate-300">{message.role}</span>
            {message.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Search with ChatGPT..."
          className="w-full rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={isLoading || !userId} className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium disabled:bg-blue-900">
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
