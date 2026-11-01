'use client';

import { useState } from 'react';
import { api, useApi, formatDate, formatDateTime, formatMoney } from '@/lib/client.js';
import { PageHeader, Card, Notice, Button, Table, Loading, Badge, StatusBadge, Field, inputClass } from '@/components/ui.js';

export default function PlansPage() {
  const plans = useApi('/api/plans');
  const history = useApi('/api/member/memberships');
  const [method, setMethod] = useState('upi');
  const [message, setMessage] = useState(null);
  const [busyPlan, setBusyPlan] = useState(null);

  async function buy(plan) {
    setBusyPlan(plan.plan_id);
    setMessage(null);
    try {
      await api('/api/member/memberships', { method: 'POST', body: { planId: plan.plan_id, method } });
      await history.reload();
      setMessage({ tone: 'success', text: `${plan.name} purchased. Payment of ${formatMoney(plan.price)} recorded.` });
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Plans & payments"
        subtitle="Buying while a plan is running queues the new one to start the day after it ends."
        action={
          <div className="w-44">
            <Field label="Pay with">
              <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="cash">Cash at desk</option>
              </select>
            </Field>
          </div>
        }
      />
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {plans.error && <Notice>{plans.error}</Notice>}

      {plans.loading ? <Loading /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.data?.map((plan) => (
            <div key={plan.plan_id} className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-zinc-900">{plan.name}</h3>
                {plan.includes_trainer && <Badge tone="info">Trainer</Badge>}
              </div>
              <p className="mt-3 text-3xl font-semibold text-zinc-900">{formatMoney(plan.price)}</p>
              <p className="text-sm text-zinc-500">{plan.duration_days} days</p>
              <p className="mt-3 flex-1 text-sm text-zinc-600">{plan.description}</p>
              <Button className="mt-4" onClick={() => buy(plan)} disabled={busyPlan !== null}>
                {busyPlan === plan.plan_id ? 'Processing…' : 'Buy plan'}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Card title="Membership history" className="mt-6">
        {history.loading ? <Loading /> : (
          <Table
            rowKey="membership_id"
            rows={history.data}
            empty="You have not bought a plan yet."
            columns={[
              { key: 'plan_name', label: 'Plan' },
              { key: 'start_date', label: 'From', render: (r) => formatDate(r.start_date) },
              { key: 'end_date', label: 'To', render: (r) => formatDate(r.end_date) },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'amount', label: 'Paid', render: (r) => formatMoney(r.amount) },
              { key: 'method', label: 'Method', render: (r) => r.method?.toUpperCase() },
              { key: 'paid_at', label: 'Paid on', render: (r) => formatDateTime(r.paid_at) },
            ]}
          />
        )}
      </Card>
    </>
  );
}
