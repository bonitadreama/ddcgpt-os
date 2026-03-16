'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAccessToken, getCurrentUser, getSupabaseAuthClient } from '@/lib/auth-client';

type UsageResponse = {
  limits: {
    maxActiveSessions: number;
    maxMessagesPerSession: number;
    maxImages: number;
    dailyTokenLimit: number;
  };
  usage: {
    activeSessions: number;
    imagesStored: number;
    tokenCountToday: number;
  };
};

function Meter({ label, current, max }: { label: string; current: number; max: number }) {
  const pct = Math.min(100, Math.round((current / Math.max(max, 1)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span>{current} / {max}</span>
      </div>
      <div className="h-2 rounded bg-white/10">
        <div className={`h-2 rounded ${pct > 90 ? 'bg-red-400' : pct > 75 ? 'bg-yellow-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then((u) => setUserEmail(u?.email ?? null));
  }, []);

  async function loadUsage() {
    setError(null);
    const token = await getAccessToken();
    if (!token) {
      setError('Please log in to view usage.');
      return;
    }

    const response = await fetch('/api/usage', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = (await response.json()) as UsageResponse & { error?: string };
    if (!response.ok) {
      setError(json.error ?? 'Failed to load usage.');
      return;
    }

    setUsage(json);
  }

  async function signOut() {
    const supabase = getSupabaseAuthClient();
    await supabase.auth.signOut();
    setUsage(null);
    setUserEmail(null);
    setError('Signed out successfully.');
  }

  return (
    <div className="space-y-3 text-sm text-slate-300">
      <p>Settings & usage meter (free tier)</p>
      <p className="text-xs">{userEmail ? `Signed in as ${userEmail}` : 'Not signed in'}</p>
      <div className="flex gap-2">
        <button onClick={loadUsage} className="rounded bg-blue-600 px-2 py-1 text-xs">Refresh</button>
        <button onClick={signOut} className="rounded bg-white/20 px-2 py-1 text-xs">Sign out</button>
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <Link href="/auth" className="inline-block rounded bg-blue-600 px-2 py-1 text-xs text-white">Open Login</Link>
      {usage ? (
        <div className="space-y-2">
          <Meter label="Active sessions" current={usage.usage.activeSessions} max={usage.limits.maxActiveSessions} />
          <Meter label="Images stored" current={usage.usage.imagesStored} max={usage.limits.maxImages} />
          <Meter label="Daily tokens" current={usage.usage.tokenCountToday} max={usage.limits.dailyTokenLimit} />
          <p className="text-xs">Message cap per session: {usage.limits.maxMessagesPerSession}</p>
        </div>
      ) : <p className="text-xs">Click Refresh to load usage.</p>}
    </div>
  );
}
