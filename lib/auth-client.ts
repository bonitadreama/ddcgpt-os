import { createClient } from '@supabase/supabase-js';
import { assertSupabaseEnv } from '@/lib/env';

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseAuthClient() {
  if (!client) {
    const env = assertSupabaseEnv();
    client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  return client;
}

export async function getAccessToken() {
  const supabase = getSupabaseAuthClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getCurrentUser() {
  const supabase = getSupabaseAuthClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
