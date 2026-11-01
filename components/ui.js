// Small building blocks shared by all pages
export const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-zinc-100';

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = 'default' }) {
  const toneClass = {
    default: 'text-zinc-900',
    good: 'text-emerald-700',
    warn: 'text-amber-600',
    bad: 'text-red-600',
  }[tone];
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function Notice({ tone = 'error', children }) {
  if (!children) return null;
  const toneClass = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  }[tone];
  return <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${toneClass}`}>{children}</div>;
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const variantClass = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-zinc-600 hover:bg-zinc-100',
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClass} ${className}`}
      {...props}
    />
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-400">{hint}</span>}
    </label>
  );
}

export function Badge({ tone = 'default', children }) {
  const toneClass = {
    default: 'bg-zinc-100 text-zinc-700',
    good: 'bg-emerald-100 text-emerald-800',
    warn: 'bg-amber-100 text-amber-800',
    bad: 'bg-red-100 text-red-700',
    info: 'bg-sky-100 text-sky-800',
  }[tone];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>{children}</span>;
}

const STATUS_TONES = { active: 'good', expired: 'bad', cancelled: 'warn', none: 'default' };
export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONES[status] ?? 'default'}>{status}</Badge>;
}

export function Empty({ children }) {
  return <p className="py-6 text-center text-sm text-zinc-500">{children}</p>;
}

export function Loading() {
  return <p className="py-10 text-center text-sm text-zinc-500">Loading…</p>;
}

// columns: [{ key, label, render?(row), className? }]
export function Table({ columns, rows, rowKey, empty = 'Nothing to show yet.' }) {
  if (!rows?.length) return <Empty>{empty}</Empty>;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
            {columns.map((c) => (
              <th key={c.key} className={`whitespace-nowrap px-5 py-2 font-medium ${c.className ?? ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey ? row[rowKey] : i} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
              {columns.map((c) => (
                <td key={c.key} className={`whitespace-nowrap px-5 py-2.5 text-zinc-700 ${c.className ?? ''}`}>
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
