'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, useApi, formatDate, formatDateTime, formatTime } from '@/lib/client.js';
import { PageHeader, Card, Stat, Notice, Button, Table, Loading, Badge } from '@/components/ui.js';

export default function MemberDashboard() {
  const { data, error, loading, reload } = useApi('/api/member/dashboard');
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  async function toggleCheckIn() {
    setBusy(true);
    setMessage(null);
    const checkingOut = Boolean(data.openCheckIn);
    try {
      await api(checkingOut ? '/api/member/check-out' : '/api/member/check-in', { method: 'POST' });
      setMessage({ tone: 'success', text: checkingOut ? 'Checked out. Great session!' : 'Checked in. Have a good workout!' });
      await reload();
    } catch (err) {
      // This text comes straight from the database trigger
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <Notice>{error}</Notice>;

  const { profile, current, upcoming, daysRemaining, visitsThisMonth, openCheckIn, trainer } = data;

  return (
    <>
      <PageHeader title={`Hi, ${profile.full_name.split(' ')[0]}`} subtitle={`Member since ${formatDate(profile.joined_on)}`} />
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Membership" className="md:col-span-2"
          action={current ? <Badge tone="good">Active</Badge> : <Badge tone="bad">No active plan</Badge>}>
          {current ? (
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xl font-semibold text-zinc-900">{current.plan_name}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {formatDate(current.start_date)} – {formatDate(current.end_date)}
                </p>
                {upcoming && (
                  <p className="mt-2 text-sm text-emerald-700">
                    Renewal queued: {upcoming.plan_name} from {formatDate(upcoming.start_date)}
                  </p>
                )}
              </div>
              <Link href="/member/plans"><Button variant="secondary">Renew</Button></Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-zinc-600">
                {upcoming
                  ? `Your ${upcoming.plan_name} plan starts on ${formatDate(upcoming.start_date)}.`
                  : 'You need an active plan to check in at the gym.'}
              </p>
              <Link href="/member/plans"><Button>Choose a plan</Button></Link>
            </div>
          )}
        </Card>

        <Card title="Gym check-in">
          <p className="mb-4 text-sm text-zinc-600">
            {openCheckIn ? `You checked in at ${formatTime(openCheckIn.check_in_time)}.` : 'Not checked in right now.'}
          </p>
          <Button onClick={toggleCheckIn} disabled={busy} variant={openCheckIn ? 'secondary' : 'primary'} className="w-full">
            {openCheckIn ? 'Check out' : 'Check in'}
          </Button>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Days remaining" value={daysRemaining} hint="Includes queued renewals"
          tone={daysRemaining === 0 ? 'bad' : daysRemaining <= 7 ? 'warn' : 'good'} />
        <Stat label="Visits this month" value={visitsThisMonth} />
        <Stat label="Personal trainer" value={trainer ? trainer.full_name : '—'}
          hint={trainer ? trainer.specialization : current?.includes_trainer ? 'Being assigned' : 'Not included in your plan'} />
      </div>

      <Card title="Recent visits" className="mt-4">
        <Table
          rowKey="check_in_id"
          rows={data.recentCheckIns}
          empty="No visits yet. Check in on your next gym day!"
          columns={[
            { key: 'check_in_time', label: 'Checked in', render: (r) => formatDateTime(r.check_in_time) },
            { key: 'check_out_time', label: 'Checked out', render: (r) => (r.check_out_time ? formatTime(r.check_out_time) : 'In gym') },
            { key: 'minutes', label: 'Duration', render: (r) => (r.minutes ? `${r.minutes} min` : '—') },
          ]}
        />
      </Card>
    </>
  );
}
