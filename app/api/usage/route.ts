import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth-server';
import { getEnv } from '@/lib/env';
import { getSupabaseServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'You must be signed in to use this feature.' }, { status: 401 });
  const userId = auth.userId;

  const env = getEnv();
  const supabase = getSupabaseServiceClient();

  const [{ data: limits }, { data: counters }, { count: activeSessions }, { count: imagesStored }] = await Promise.all([
    supabase.from('user_usage_limits').select('max_active_sessions,max_messages_per_session,max_images,daily_token_limit').eq('user_id', userId).maybeSingle(),
    supabase.from('user_usage_counters').select('token_count_today').eq('user_id', userId).maybeSingle(),
    supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', true),
    supabase.from('media_assets').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  const appliedLimits = {
    maxActiveSessions: limits?.max_active_sessions ?? 10,
    maxMessagesPerSession: limits?.max_messages_per_session ?? 200,
    maxImages: limits?.max_images ?? 100,
    dailyTokenLimit: limits?.daily_token_limit ?? env.DAILY_TOKEN_LIMIT,
  };

  const usage = {
    activeSessions: activeSessions ?? 0,
    imagesStored: imagesStored ?? 0,
    tokenCountToday: counters?.token_count_today ?? 0,
  };

  return NextResponse.json({ limits: appliedLimits, usage });
}
