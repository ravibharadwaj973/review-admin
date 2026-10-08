'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button, Field, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth';

function LoginForm() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (params.get('expired')) setError('Your session expired. Sign in again.');
  }, [params]);
  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></Field>
      <Field label="Password"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
      {error && <p className="rounded-lg bg-rose-soft px-3 py-2 text-sm text-rose">{error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={busy}>Sign in</Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-[400px] rounded-xl3 bg-paper p-8 shadow-pop">
        <div className="mb-6 flex items-center gap-2"><Logo /><span className="rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">Admin</span></div>
        <h1 className="font-display text-2xl font-semibold">Sign in to admin</h1>
        <p className="mb-6 mt-1 flex items-center gap-1.5 text-sm text-ink-muted"><ShieldCheck className="h-4 w-4 text-leaf" />Only for the people who run Starling.</p>
        <Suspense><LoginForm /></Suspense>
      </div>
    </div>
  );
}
