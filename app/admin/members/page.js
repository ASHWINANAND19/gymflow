'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi, formatDate } from '@/lib/client.js';
import { PageHeader, Card, Notice, Table, Loading, StatusBadge, Badge, Field, inputClass } from '@/components/ui.js';

export default function MembersPage() {
  const [filters, setFilters] = useState({ q: '', status: 'all', planId: '' });
  const plans = useApi('/api/plans');
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const { data, error, loading } = useApi(`/api/admin/members?${query}`);

  return (
    <>
      <PageHeader title="Members" subtitle={data ? `${data.length} members match` : undefined} />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Search name or email">
            <input className={inputClass} placeholder="e.g. Rohan" value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          </Field>
          <Field label="Membership">
            <select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="expired">Expired / lapsed</option>
              <option value="none">Never bought a plan</option>
            </select>
          </Field>
          <Field label="Current plan">
            <select className={inputClass} value={filters.planId} onChange={(e) => setFilters({ ...filters, planId: e.target.value })}>
              <option value="">Any plan</option>
              {plans.data?.map((p) => <option key={p.plan_id} value={p.plan_id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      {error && <Notice>{error}</Notice>}
      <Card>
        {loading ? <Loading /> : (
          <Table
            rowKey="member_id"
            rows={data}
            empty="No members match these filters."
            columns={[
              {
                key: 'full_name', label: 'Name',
                render: (m) => (
                  <Link href={`/admin/members/${m.member_id}`} className="font-medium text-emerald-700 hover:underline">
                    {m.full_name}
                  </Link>
                ),
              },
              { key: 'email', label: 'Email' },
              { key: 'membership_status', label: 'Membership', render: (m) => <StatusBadge status={m.membership_status} /> },
              { key: 'plan_name', label: 'Plan' },
              { key: 'end_date', label: 'Ends', render: (m) => formatDate(m.end_date) },
              { key: 'visits_30d', label: 'Visits (30d)' },
              { key: 'is_active', label: 'Account', render: (m) => (m.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>) },
            ]}
          />
        )}
      </Card>
    </>
  );
}
