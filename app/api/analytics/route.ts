import { NextRequest, NextResponse } from 'next/server';
import { optionalAuthenticatedUser } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const auth = await optionalAuthenticatedUser(request);
  console.info('[analytics event]', {
    userId: auth?.userId ?? null,
    ...payload,
  });
  return NextResponse.json({ ok: true });
}
