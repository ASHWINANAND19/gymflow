'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useApi, formatDate, formatDateTime } from '@/lib/client.js';
import { PageHeader, Card, Stat, Notice, Table, Loading, Empty } from '@/components/ui.js';
import ProgressCharts from '@/components/ProgressCharts.js';
import WorkoutSummary from '@/components/WorkoutSummary.js';
import PlanEditor from '@/components/PlanEditor.js';

export default function ClientDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/api/trainer/clients/${id}`);

  if (loading) return <Loading />;
  if (error) {
    return (
      <>
        <Notice>{error}</Notice>
        <Link href="/trainer" className="text-sm font-medium text-emerald-700 hover:underline">← Back to my clients</Link>
      </>
    );
  }

  const { profile, current, daysRemaining, visitsThisMonth } = data;

  return (
    <>
      <Link href="/trainer" className="text-sm font-medium text-emerald-700 hover:underline">← My clients</Link>
      <PageHeader title={profile.full_name}
        subtitle={`${profile.email}${profile.phone ? ` · ${profile.phone}` : ''} · member since ${formatDate(profile.joined_on)}`} />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Current plan" value={current?.plan_name ?? 'None'} hint={current ? `Ends ${formatDate(current.end_date)}` : undefined} />
        <Stat label="Days remaining" value={daysRemaining} tone={daysRemaining <= 7 ? 'warn' : 'default'} />
        <Stat label="Visits this month" value={visitsThisMonth} />
      </div>

      <ProgressCharts weekly={data.weekly} records={data.records} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={data.plan ? 'Edit workout plan' : 'Create workout plan'}>
          <PlanEditor memberId={id} plan={data.plan} onSaved={reload} />
        </Card>
        <div className="space-y-4">
          <Card title="Recent workouts">
            {data.sessions.length ? (
              <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                {data.sessions.map((s) => <WorkoutSummary key={s._id} session={s} />)}
              </div>
            ) : <Empty>No workouts logged yet.</Empty>}
          </Card>
          <Card title="Attendance">
            <Table
              rowKey="check_in_id"
              rows={data.checkIns}
              empty="No visits yet."
              columns={[
                { key: 'check_in_time', label: 'Checked in', render: (r) => formatDateTime(r.check_in_time) },
                { key: 'minutes', label: 'Duration', render: (r) => (r.minutes ? `${r.minutes} min` : 'In gym') },
              ]}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
