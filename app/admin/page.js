'use client';

import Link from 'next/link';
import { useApi, formatDate, formatMoney } from '@/lib/client.js';
import { PageHeader, Card, Stat, Notice, Table, Loading, Badge } from '@/components/ui.js';
import { SimpleBarChart } from '@/components/Charts.js';

const memberLink = (r) => (
  <Link href={`/admin/members/${r.member_id}`} className="font-medium text-emerald-700 hover:underline">{r.full_name}</Link>
);

export default function AdminDashboard() {
  const { data, error, loading } = useApi('/api/admin/dashboard');

  if (loading) return <Loading />;
  if (error) return <Notice>{error}</Notice>;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live numbers from the PostgreSQL views and MongoDB aggregations." />
      {data.expiredNow > 0 && (
        <Notice tone="info">expire_memberships() just marked {data.expiredNow} membership(s) as expired.</Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active members" value={data.activeCount} hint="From v_active_members" tone="good" />
        <Stat label="Revenue this month" value={formatMoney(data.revenueThisMonth)} hint="From v_monthly_revenue" />
        <Stat label="In the gym now" value={data.inGymNow} hint="Open check-ins today" />
        <Stat label="Expiring in 7 days" value={data.expiringSoon.length} hint="No renewal queued"
          tone={data.expiringSoon.length ? 'warn' : 'default'} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Revenue by month">
          <SimpleBarChart data={data.revenueByMonth} xKey="label" yKey="revenue" label="Revenue"
            format={(v) => `₹${Math.round(v / 1000)}k`} />
        </Card>
        <Card title="Most logged exercises (MongoDB)">
          <SimpleBarChart data={data.popularExercises} xKey="exercise" yKey="times" label="Times logged"
            layout="vertical" color="#0284c7" />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Memberships ending soon">
          <Table
            rowKey="member_id"
            rows={data.expiringSoon}
            empty="No memberships ending in the next 7 days."
            columns={[
              { key: 'full_name', label: 'Member', render: memberLink },
              { key: 'plan_name', label: 'Plan' },
              { key: 'end_date', label: 'Ends', render: (r) => formatDate(r.end_date) },
              { key: 'days_left', label: 'Days left', render: (r) => <Badge tone="warn">{r.days_left}</Badge> },
            ]}
          />
        </Card>
        <Card title="Low attendance (fewer than 8 visits in 30 days)">
          <Table
            rowKey="member_id"
            rows={data.lowAttendance}
            empty="Everyone is showing up regularly."
            columns={[
              { key: 'full_name', label: 'Member', render: memberLink },
              { key: 'visits_30d', label: 'Visits' },
            ]}
          />
        </Card>
      </div>

      <Card title="Trainer workload" className="mt-4">
        <div className="space-y-3">
          {data.workload.map((t) => (
            <div key={t.trainer_id}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-zinc-800">{t.full_name} <span className="font-normal text-zinc-500">· {t.specialization}</span></span>
                <span className="text-zinc-600">{t.active_clients} / {t.max_clients}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-zinc-100">
                <div className={`h-2 rounded-full ${t.utilisation_pct >= 100 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                  style={{ width: `${Math.min(t.utilisation_pct, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
