import { getAccessToken } from '@/lib/auth-client';

function analyticsEnabled() {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false';
}

async function authHeaders() {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function trackEvent(event: string, properties: Record<string, unknown> = {}) {
  if (!analyticsEnabled()) return;
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ event, properties, at: new Date().toISOString() }),
    });
  } catch {
    // no-op
  }
}

export async function captureClientError(context: string, error: unknown, metadata: Record<string, unknown> = {}) {
  try {
    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({
        context,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
        metadata,
        at: new Date().toISOString(),
      }),
    });
  } catch {
    // no-op
  }
}
