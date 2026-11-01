'use client';

import { useState } from 'react';
import { api, useApi, formatMoney } from '@/lib/client.js';
import { PageHeader, Card, Notice, Table, Loading, Button, Badge, Field, inputClass } from '@/components/ui.js';

const blankPlan = { name: '', durationDays: 30, price: '', includesTrainer: false, description: '' };

export default function AdminPlansPage() {
  const { data, error, loading, reload } = useApi('/api/admin/plans');
  const [form, setForm] = useState(blankPlan);
  const [message, setMessage] = useState(null);

  async function run(action, successText) {
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: successText });
      await reload();
      return true;
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
      return false;
    }
  }

  return (
    <>
      <PageHeader title="Plans" subtitle="Plans that were ever bought cannot be deleted (foreign key RESTRICT). Deactivate them instead." />
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {error && <Notice>{error}</Notice>}

      <Card title="All plans">
        {loading ? <Loading /> : (
          <Table
            rowKey="plan_id"
            rows={data}
            columns={[
              { key: 'name', label: 'Plan', render: (p) => <span className="font-medium text-zinc-900">{p.name}</span> },
              { key: 'duration_days', label: 'Days' },
              { key: 'price', label: 'Price', render: (p) => formatMoney(p.price) },
              { key: 'includes_trainer', label: 'Trainer', render: (p) => (p.includes_trainer ? <Badge tone="info">Yes</Badge> : 'No') },
              { key: 'times_bought', label: 'Times bought' },
              { key: 'is_active', label: 'Status', render: (p) => (p.is_active ? <Badge tone="good">On sale</Badge> : <Badge>Hidden</Badge>) },
              {
                key: 'actions', label: '',
                render: (p) => (
                  <div className="flex gap-3 text-xs font-medium">
                    <button className="text-zinc-600 hover:underline"
                      onClick={() => run(() => api(`/api/admin/plans/${p.plan_id}`, { method: 'PATCH', body: { isActive: !p.is_active } }),
                        p.is_active ? `${p.name} hidden from members.` : `${p.name} is on sale again.`)}>
                      {p.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="text-red-600 hover:underline"
                      onClick={() => confirm(`Delete ${p.name}?`) && run(() => api(`/api/admin/plans/${p.plan_id}`, { method: 'DELETE' }), `${p.name} deleted.`)}>
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Card title="New plan" className="mt-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run(() => api('/api/admin/plans', { method: 'POST', body: form }), 'Plan created.')) setForm(blankPlan);
          }}>
          <Field label="Name"><input className={inputClass} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Duration (days)"><input type="number" min={1} className={inputClass} required value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} /></Field>
          <Field label="Price (₹)"><input type="number" min={1} className={inputClass} required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm text-zinc-700">
            <input type="checkbox" checked={form.includesTrainer} onChange={(e) => setForm({ ...form, includesTrainer: e.target.checked })} />
            Includes personal trainer
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Description"><input className={inputClass} maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          </div>
          <div className="flex items-end"><Button type="submit" className="w-full">Create plan</Button></div>
        </form>
      </Card>
    </>
  );
}
