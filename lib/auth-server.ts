import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env';

type AuthResult = {
  userId: string;
  email: string | null;
};

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

async function getUserFromToken(token: string) {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase env vars are missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const authClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
  } as AuthResult;
}

export async function requireAuthenticatedUser(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) return null;
  return getUserFromToken(token);
}

export async function optionalAuthenticatedUser(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) return null;
  return getUserFromToken(token);
}
