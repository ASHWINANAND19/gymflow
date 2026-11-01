'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, useApi, formatDate, formatDateTime, formatMoney } from '@/lib/client.js';
import { PageHeader, Card, Stat, Notice, Table, Loading, Button, StatusBadge, Badge, Field, Empty, inputClass } from '@/components/ui.js';
import WorkoutSummary from '@/components/WorkoutSummary.js';

export default function AdminMemberDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/api/admin/members/${id}`);
  const plans = useApi('/api/plans');
  const [sale, setSale] = useState({ planId: '', method: 'cash' });
  const [message, setMessage] = useState(null);

  async function run(action, successText) {
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: successText });
      await reload();
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    }
  }

  if (loading) return <Loading />;
  if (error) return <Notice>{error}</Notice>;

  const { profile, current, upcoming, daysRemaining, visitsThisMonth, trainer } = data;

  return (
    <>
      <Link href="/admin/members" className="text-sm font-medium text-emerald-700 hover:underline">← Members</Link>
      <PageHeader title={profile.full_name}
        subtitle={`${profile.email}${profile.phone ? ` · ${profile.phone}` : ''} · joined ${formatDate(profile.joined_on)}`} />
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Current plan" value={current?.plan_name ?? 'None'} hint={current ? `Ends ${formatDate(current.end_date)}` : upcoming ? `Starts ${formatDate(upcoming.start_date)}` : undefined} />
        <Stat label="Days remaining" value={daysRemaining} />
        <Stat label="Visits this month" value={visitsThisMonth} />
        <Stat label="Trainer" value={trainer?.full_name ?? '—'} hint={trainer?.specialization} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Front-desk sale">
          <div className="space-y-3">
            <Field label="Plan">
              <select className={inputClass} value={sale.planId} onChange={(e) => setSale({ ...sale, planId: e.target.value })}>
                <option value="">Choose plan…</option>
                {plans.data?.map((p) => <option key={p.plan_id} value={p.plan_id}>{p.name} · {formatMoney(p.price)}</option>)}
              </select>
            </Field>
            <Field label="Payment method">
              <select className={inputClass} value={sale.method} onChange={(e) => setSale({ ...sale, method: e.target.value })}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
              </select>
            </Field>
            <Button className="w-full" disabled={!sale.planId}
              onClick={() => run(
                () => api('/api/admin/memberships', { method: 'POST', body: { memberId: Number(id), planId: Number(sale.planId), method: sale.method } }),
                'Plan sold and payment recorded.'
              )}>
              Record sale
            </Button>
          </div>
        </Card>

        <Card title="Account" action={profile.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}>
          <div className="space-y-3 text-sm text-zinc-600">
            <p>Deactivated members cannot log in. Their history is kept.</p>
            {profile.is_active ? (
              <Button variant="danger"
                onClick={() => run(() => api(`/api/admin/members/${id}`, { method: 'PATCH', body: { isActive: false } }), 'Account deactivated.')}>
                Deactivate account
              </Button>
            ) : (
              <Button variant="secondary"
                onClick={() => run(() => api(`/api/admin/members/${id}`, { method: 'PATCH', body: { isActive: true } }), 'Account activated.')}>
                Activate account
              </Button>
            )}
          </div>
        </Card>

        <Card title="Recent workouts">
          {data.sessions.length ? (
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {data.sessions.map((s) => <WorkoutSummary key={s._id} session={s} />)}
            </div>
          ) : <Empty>No workouts logged.</Empty>}
        </Card>
      </div>

      <Card title="Membership history" className="mt-4">
        <Table
          rowKey="membership_id"
          rows={data.history}
          empty="No memberships yet."
          columns={[
            { key: 'plan_name', label: 'Plan' },
            { key: 'start_date', label: 'From', render: (r) => formatDate(r.start_date) },
            { key: 'end_date', label: 'To', render: (r) => formatDate(r.end_date) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'amount', label: 'Paid', render: (r) => `${formatMoney(r.amount)} · ${r.method?.toUpperCase()}` },
            {
              key: 'actions', label: '',
              render: (r) => r.status === 'active' && (
                <button className="text-xs font-medium text-red-600 hover:underline"
                  onClick={() => confirm('Cancel this membership?') && run(
                    () => api(`/api/admin/memberships/${r.membership_id}/cancel`, { method: 'POST' }),
                    'Membership cancelled.'
                  )}>
                  Cancel
                </button>
              ),
            },
          ]}
        />
      </Card>

      <Card title="Recent check-ins" className="mt-4">
        <Table
          rowKey="check_in_id"
          rows={data.checkIns}
          empty="No visits yet."
          columns={[
            { key: 'check_in_time', label: 'Checked in', render: (r) => formatDateTime(r.check_in_time) },
            { key: 'minutes', label: 'Duration', render: (r) => (r.minutes ? `${r.minutes} min` : <Badge tone="info">In gym</Badge>) },
          ]}
        />
      </Card>
    </>
  );
}
