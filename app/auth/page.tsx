'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { getSupabaseAuthClient } from '@/lib/auth-client';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseAuthClient();

    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(mode === 'login' ? 'Magic link sent. Check your inbox.' : 'Signup link sent. Check your inbox.');
  }

  async function signInWithGoogle() {
    const supabase = getSupabaseAuthClient();
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) setMessage(error.message);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-6">
      <section className="rounded-2xl border border-white/20 bg-black/25 p-8 shadow-xl backdrop-blur-xl">
        <h1 className="mb-2 text-2xl font-semibold">{mode === 'login' ? 'Log in' : 'Create account'} for DDCGPT OS</h1>
        <p className="mb-6 text-sm text-slate-300">Secure account access with Supabase email magic link or Google OAuth.</p>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-white/5 p-1">
          <button type="button" className={`rounded-md px-3 py-2 text-sm ${mode === 'login' ? 'bg-white/20' : 'bg-transparent'}`} onClick={() => setMode('login')}>Login</button>
          <button type="button" className={`rounded-md px-3 py-2 text-sm ${mode === 'signup' ? 'bg-white/20' : 'bg-transparent'}`} onClick={() => setMode('signup')}>Sign up</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-white/20 bg-black/20 p-3 text-sm" />
          <button type="submit" className="w-full rounded-lg bg-blue-600 p-3 text-sm font-medium hover:bg-blue-500">
            {mode === 'login' ? 'Send magic link' : 'Create account'}
          </button>
        </form>

        <button onClick={signInWithGoogle} className="mt-3 w-full rounded-lg border border-white/20 bg-white/10 p-3 text-sm font-medium hover:bg-white/20">
          Continue with Google
        </button>

        {message ? <p className="mt-3 text-xs text-emerald-300">{message}</p> : null}

        <Link href="/" className="mt-6 inline-block text-sm text-blue-300 underline">Back to desktop demo</Link>
      </section>
    </main>
  );
}
