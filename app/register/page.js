'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client.js';
import { Button, Field, Notice, inputClass } from '@/components/ui.js';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', dateOfBirth: '', gender: '', heightCm: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { home } = await api('/api/auth/register', { method: 'POST', body: form });
      router.replace(home);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-sm font-bold text-white">G</span>
          <span className="text-lg font-semibold text-zinc-900">GymFlow</span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">Become a member</h1>
        <p className="mt-1 text-sm text-zinc-500">Create your account, then pick a plan to start checking in.</p>

        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Notice>{error}</Notice></div>
          <div className="sm:col-span-2">
            <Field label="Full name"><input className={inputClass} required value={form.fullName} onChange={set('fullName')} /></Field>
          </div>
          <Field label="Email"><input className={inputClass} type="email" required value={form.email} onChange={set('email')} /></Field>
          <Field label="Phone" hint="10 digits">
            <input className={inputClass} inputMode="numeric" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Password" hint="At least 8 characters">
            <input className={inputClass} type="password" required minLength={8} value={form.password} onChange={set('password')} />
          </Field>
          <Field label="Date of birth" hint="You must be 14 or older">
            <input className={inputClass} type="date" required value={form.dateOfBirth} onChange={set('dateOfBirth')} />
          </Field>
          <Field label="Gender">
            <select className={inputClass} value={form.gender} onChange={set('gender')}>
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Height (cm)">
            <input className={inputClass} type="number" min={100} max={250} value={form.heightCm} onChange={set('heightCm')} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating account…' : 'Create account'}</Button>
          </div>
        </form>
        <p className="mt-4 text-sm text-zinc-600">
          Already a member? <Link href="/login" className="font-medium text-emerald-700 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
