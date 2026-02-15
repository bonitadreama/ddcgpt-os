import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth-server';
import { getSupabaseServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'You must be signed in to access chat sessions.' }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('id,title,updated_at')
    .eq('user_id', auth.userId)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'You must be signed in to create sessions.' }, { status: 401 });
  }

  const body = (await request.json()) as { title?: string };
  const title = body.title?.trim() || 'New Chat Session';

  const supabase = getSupabaseServiceClient();
  const [{ count: activeSessions }, { data: limits }] = await Promise.all([
    supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', auth.userId).eq('is_active', true),
    supabase.from('user_usage_limits').select('max_active_sessions').eq('user_id', auth.userId).maybeSingle(),
  ]);

  const maxActiveSessions = limits?.max_active_sessions ?? 10;
  if ((activeSessions ?? 0) >= maxActiveSessions) {
    return NextResponse.json(
      { error: `You reached your free-tier session limit (${maxActiveSessions}). Close an old session or upgrade your plan.` },
      { status: 429 },
    );
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: auth.userId, title, is_active: true })
    .select('id,title,updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data }, { status: 201 });
}
