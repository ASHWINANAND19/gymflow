'use client';

import { useApi, formatDateTime, formatDate } from '@/lib/client.js';
import { PageHeader, Card, Notice, Table, Loading, Badge } from '@/components/ui.js';

function describe(entry) {
  const d = entry.details ?? {};
  if (entry.action === 'INSERT') return `New membership ${formatDate(d.start_date)} – ${formatDate(d.end_date)} (plan #${d.plan_id})`;
  return `Status changed: ${d.old_status} → ${d.new_status}`;
}

export default function AuditPage() {
  const { data, error, loading } = useApi('/api/admin/audit');
  return (
    <>
      <PageHeader title="Audit log" subtitle="Written automatically by the trg_audit_memberships trigger. The app never writes here itself." />
      {error && <Notice>{error}</Notice>}
      <Card>
        {loading ? <Loading /> : (
          <Table
            rowKey="log_id"
            rows={data}
            columns={[
              { key: 'changed_at', label: 'When', render: (a) => formatDateTime(a.changed_at) },
              { key: 'action', label: 'Action', render: (a) => <Badge tone={a.action === 'INSERT' ? 'good' : 'warn'}>{a.action}</Badge> },
              { key: 'record_id', label: 'Membership #' },
              { key: 'member_name', label: 'Member' },
              { key: 'details', label: 'Details', render: describe },
            ]}
          />
        )}
      </Card>
    </>
  );
}
