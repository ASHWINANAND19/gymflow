'use client';

import { useState } from 'react';
import { useApi, formatDateTime, formatMoney } from '@/lib/client.js';
import { PageHeader, Card, Notice, Table, Loading, Stat, Field, inputClass } from '@/components/ui.js';

export default function PaymentsPage() {
  const [filters, setFilters] = useState({ from: '', to: '', method: '' });
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const { data, error, loading } = useApi(`/api/admin/payments?${query}`);

  const total = data?.totals.reduce((sum, t) => sum + t.revenue, 0) ?? 0;
  const count = data?.totals.reduce((sum, t) => sum + t.payments, 0) ?? 0;

  return (
    <>
      <PageHeader title="Payments" subtitle="Totals are calculated with GROUP BY on the same filters." />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="From"><input type="date" className={inputClass} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></Field>
          <Field label="To"><input type="date" className={inputClass} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></Field>
          <Field label="Method">
            <select className={inputClass} value={filters.method} onChange={(e) => setFilters({ ...filters, method: e.target.value })}>
              <option value="">All methods</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
            </select>
          </Field>
        </div>
      </Card>

      {error && <Notice>{error}</Notice>}
      {loading ? <Loading /> : data && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total collected" value={formatMoney(total)} hint={`${count} payments`} tone="good" />
            {data.totals.map((t) => (
              <Stat key={t.method} label={t.method.toUpperCase()} value={formatMoney(t.revenue)} hint={`${t.payments} payments`} />
            ))}
          </div>
          <Card title="Payments (latest 200)">
            <Table
              rowKey="payment_id"
              rows={data.payments}
              empty="No payments match these filters."
              columns={[
                { key: 'paid_at', label: 'Date', render: (p) => formatDateTime(p.paid_at) },
                { key: 'member_name', label: 'Member' },
                { key: 'plan_name', label: 'Plan' },
                { key: 'method', label: 'Method', render: (p) => p.method.toUpperCase() },
                { key: 'amount', label: 'Amount', className: 'text-right', render: (p) => formatMoney(p.amount) },
              ]}
            />
          </Card>
        </>
      )}
    </>
  );
}
