'use client';

import Link from 'next/link';
import { useApi, formatDate } from '@/lib/client.js';
import { PageHeader, Card, Stat, Notice, Table, Loading } from '@/components/ui.js';

export default function TrainerHome() {
  const { data, error, loading } = useApi('/api/trainer/clients');

  if (loading) return <Loading />;
  if (error) return <Notice>{error}</Notice>;

  const { workload, clients } = data;
  const avgVisits = clients.length ? Math.round(clients.reduce((s, c) => s + c.visits_30d, 0) / clients.length) : 0;

  return (
    <>
      <PageHeader title="My clients" subtitle={workload.specialization} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Clients" value={`${workload.active_clients} / ${workload.max_clients}`}
          hint={`${workload.utilisation_pct}% of capacity`} tone={workload.utilisation_pct >= 100 ? 'warn' : 'default'} />
        <Stat label="Average visits (30 days)" value={avgVisits} />
        <Stat label="Need attention" value={clients.filter((c) => c.visits_30d < 8).length} hint="Fewer than 8 visits in 30 days" />
      </div>

      <Card title="Clients" className="mt-4">
        <Table
          rowKey="member_id"
          rows={clients}
          empty="No clients assigned yet."
          columns={[
            {
              key: 'full_name', label: 'Name',
              render: (c) => <Link href={`/trainer/clients/${c.member_id}`} className="font-medium text-emerald-700 hover:underline">{c.full_name}</Link>,
            },
            { key: 'plan_name', label: 'Plan', render: (c) => c.plan_name ?? 'Expired' },
            { key: 'end_date', label: 'Plan ends', render: (c) => formatDate(c.end_date) },
            { key: 'visits_30d', label: 'Visits (30d)' },
            { key: 'last_visit', label: 'Last visit', render: (c) => formatDate(c.last_visit) },
            { key: 'last_workout', label: 'Last workout logged', render: (c) => formatDate(c.last_workout) },
          ]}
        />
      </Card>
    </>
  );
}
