'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client.js';
import { Button, Field, Notice, inputClass } from '@/components/ui.js';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@gymflow.com', password: 'Admin@123' },
  { label: 'Trainer', email: 'trainer1@gymflow.com', password: 'Trainer@123' },
  { label: 'Member', email: 'member1@gymflow.com', password: 'Member@123' },
  { label: 'Expired member', email: 'member2@gymflow.com', password: 'Member@123' },
];

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { home } = await api('/api/auth/login', { method: 'POST', body: form });
      router.replace(home);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-emerald-700 p-10 text-white md:flex">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-lg font-bold text-emerald-700">G</span>
          <span className="text-xl font-semibold">GymFlow</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold leading-tight">Memberships, check-ins and workout progress in one place.</h1>
          <p className="mt-4 max-w-md text-emerald-100">
            PostgreSQL keeps memberships, payments and attendance consistent. MongoDB stores flexible
            workout logs and trainer plans.
          </p>
        </div>
        <p className="text-sm text-emerald-200">DBMS Level 3 Project</p>
      </div>

      <div className="flex items-center justify-center bg-zinc-50 px-4 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-zinc-900">Log in</h2>
          <p className="mt-1 text-sm text-zinc-500">Welcome back. Enter your details to continue.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Notice>{error}</Notice>
            <Field label="Email">
              <input className={inputClass} type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Password">
              <input className={inputClass} type="password" required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Logging in…' : 'Log in'}</Button>
          </form>

          <p className="mt-4 text-sm text-zinc-600">
            New here? <Link href="/register" className="font-medium text-emerald-700 hover:underline">Create a member account</Link>
          </p>

          <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Demo accounts (seed data)</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button key={a.email} type="button"
                  onClick={() => setForm({ email: a.email, password: a.password })}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-left text-xs hover:border-emerald-600 hover:bg-emerald-50">
                  <span className="block font-medium text-zinc-900">{a.label}</span>
                  <span className="block truncate text-zinc-500">{a.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
