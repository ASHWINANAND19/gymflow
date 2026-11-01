'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api, useApi } from '@/lib/client.js';

const ROLE_LABELS = { admin: 'Admin', trainer: 'Trainer', member: 'Member' };

// Page frame for logged-in users: navigation for the role + logout
export default function Shell({ role, links, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useApi('/api/me');

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  const isActive = (href) => (href === `/${role}` ? pathname === href : pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-zinc-50 md:flex">
      <aside className="border-b border-zinc-200 bg-white md:fixed md:inset-y-0 md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <Link href={`/${role}`} className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-sm font-bold text-white">G</span>
            <span className="text-lg font-semibold text-zinc-900">GymFlow</span>
          </Link>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 md:mt-3 md:inline-block">
            {ROLE_LABELS[role]}
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(link.href) ? 'bg-emerald-50 text-emerald-800' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-zinc-200 px-5 py-4 md:absolute md:inset-x-0 md:bottom-0 md:block">
          <p className="truncate text-sm font-medium text-zinc-900">{me?.name ?? '…'}</p>
          <p className="truncate text-xs text-zinc-500">{me?.email}</p>
          <button onClick={logout} className="mt-3 text-sm font-medium text-red-600 hover:underline">
            Log out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:ml-60 md:px-8 md:py-8">
        <div className="mb-4 flex justify-end md:hidden">
          <button onClick={logout} className="text-sm font-medium text-red-600">Log out</button>
        </div>
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
