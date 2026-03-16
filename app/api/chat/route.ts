import { NextRequest, NextResponse } from 'next/server';
import { buildFallbackSummary, estimateTokens, SHORT_TERM_CONTEXT_MESSAGES, SUMMARY_REFRESH_INTERVAL } from '@/lib/chat';
import { requireAuthenticatedUser } from '@/lib/auth-server';
import { getEnv } from '@/lib/env';
import { getSupabaseServiceClient } from '@/lib/supabase';

type ChatPostBody = {
  sessionId?: string;
  prompt?: string;
};

function normalizeRole(role: string): 'system' | 'user' | 'assistant' {
  if (role === 'system' || role === 'assistant') return role;
  return 'user';
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'You must be signed in to load chat history.' }, { status: 401 });
  const userId = auth.userId;
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });

  const supabase = getSupabaseServiceClient();
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id,title,updated_at')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (sessionError || !session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id,role,content,created_at,token_count')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (messagesError) return NextResponse.json({ error: messagesError.message }, { status: 500 });

  return NextResponse.json({ session, messages: messages ?? [] });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ChatPostBody;
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'You must be signed in to use chat.' }, { status: 401 });

  const userId = auth.userId;
  if (!body.prompt?.trim()) return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });

  const prompt = body.prompt.trim();
  const env = getEnv();
  const supabase = getSupabaseServiceClient();

  const { data: usageLimits } = await supabase
    .from('user_usage_limits')
    .select('daily_token_limit,max_active_sessions,max_messages_per_session')
    .eq('user_id', userId)
    .maybeSingle();
  const { data: usageCounters } = await supabase
    .from('user_usage_counters')
    .select('token_count_today')
    .eq('user_id', userId)
    .maybeSingle();

  const dailyTokenLimit = usageLimits?.daily_token_limit ?? env.DAILY_TOKEN_LIMIT;
  const maxActiveSessions = usageLimits?.max_active_sessions ?? 10;
  const maxMessagesPerSession = usageLimits?.max_messages_per_session ?? 200;
  const currentTokenCount = usageCounters?.token_count_today ?? 0;

  let sessionId = body.sessionId;
  if (!sessionId) {
    const { count: activeSessions } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if ((activeSessions ?? 0) >= maxActiveSessions) {
      return NextResponse.json(
        { error: `You reached your free-tier session limit (${maxActiveSessions}). Close an old session or upgrade your plan.` },
        { status: 429 },
      );
    }

    const { data: createdSession, error: sessionCreateError } = await supabase
      .from('sessions')
      .insert({ user_id: userId, title: prompt.slice(0, 80), is_active: true })
      .select('id')
      .single();

    if (sessionCreateError || !createdSession) {
      return NextResponse.json({ error: sessionCreateError?.message ?? 'Failed to create session.' }, { status: 500 });
    }
    sessionId = createdSession.id;
  }

  const { data: ownedSession, error: ownedSessionError } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();
  if (ownedSessionError || !ownedSession) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });

  const { count: existingMessages } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  if ((existingMessages ?? 0) + 2 > maxMessagesPerSession) {
    return NextResponse.json(
      { error: `This session hit the free-tier message cap (${maxMessagesPerSession}). Start a new session or upgrade.` },
      { status: 429 },
    );
  }

  const { data: recentMessages, error: recentMessagesError } = await supabase
    .from('messages')
    .select('role,content,created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(SHORT_TERM_CONTEXT_MESSAGES);
  if (recentMessagesError) return NextResponse.json({ error: recentMessagesError.message }, { status: 500 });

  const orderedRecentMessages = [...(recentMessages ?? [])].reverse();
  const { data: memorySummary } = await supabase
    .from('memory_summaries')
    .select('summary')
    .eq('session_id', sessionId)
    .maybeSingle();

  const inputMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  if (memorySummary?.summary) inputMessages.push({ role: 'system', content: `Conversation summary: ${memorySummary.summary}` });
  orderedRecentMessages.forEach((m) => inputMessages.push({ role: normalizeRole(m.role), content: m.content }));
  inputMessages.push({ role: 'user', content: prompt });

  let reply = '';
  if (!env.OPENAI_API_KEY) {
    reply = `Stub response: ${prompt}`;
  } else {
    const modelResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: env.OPENAI_CHAT_MODEL, messages: inputMessages, temperature: 0.4 }),
    });
    if (!modelResponse.ok) return NextResponse.json({ error: 'Failed to fetch model response.' }, { status: 502 });
    const completion = (await modelResponse.json()) as { choices?: Array<{ message?: { content?: string } }> };
    reply = completion.choices?.[0]?.message?.content?.trim() ?? 'No response returned.';
  }

  const promptTokens = estimateTokens(prompt);
  const replyTokens = estimateTokens(reply);
  const nextTokenCount = currentTokenCount + promptTokens + replyTokens;
  if (nextTokenCount > dailyTokenLimit) {
    return NextResponse.json(
      { error: `You reached your daily token budget (${dailyTokenLimit}). Try again tomorrow or upgrade your plan.` },
      { status: 429 },
    );
  }

  const { error: insertMessageError } = await supabase.from('messages').insert([
    { session_id: sessionId, role: 'user', content: prompt, token_count: promptTokens },
    { session_id: sessionId, role: 'assistant', content: reply, token_count: replyTokens },
  ]);
  if (insertMessageError) return NextResponse.json({ error: insertMessageError.message }, { status: 500 });

  await supabase.from('user_usage_counters').upsert(
    { user_id: userId, token_count_today: nextTokenCount, reset_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );

  await supabase.from('sessions').update({ updated_at: new Date().toISOString(), title: prompt.slice(0, 80) }).eq('id', sessionId).eq('user_id', userId);

  const { count: messageCount } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('session_id', sessionId);
  if (messageCount && messageCount % SUMMARY_REFRESH_INTERVAL === 0) {
    const nextSummary = buildFallbackSummary([
      ...orderedRecentMessages.map((m) => ({ role: normalizeRole(m.role), content: m.content })),
      { role: 'user', content: prompt },
      { role: 'assistant', content: reply },
    ]);
    await supabase.from('memory_summaries').upsert({ session_id: sessionId, summary: nextSummary }, { onConflict: 'session_id' });
  }

  return NextResponse.json({ reply, sessionId, tokenUsage: { promptTokens, replyTokens, totalToday: nextTokenCount } });
}
