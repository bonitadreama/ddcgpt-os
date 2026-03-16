import { NextRequest, NextResponse } from 'next/server';
import { optionalAuthenticatedUser } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const auth = await optionalAuthenticatedUser(request);
  console.error('[client error]', {
    userId: auth?.userId ?? null,
    ...payload,
  });
  return NextResponse.json({ ok: true });
}
