'use client';

import { useApi } from '@/lib/client.js';
import { PageHeader, Notice, Loading } from '@/components/ui.js';
import ProgressCharts from '@/components/ProgressCharts.js';

export default function ProgressPage() {
  const { data, error, loading } = useApi('/api/member/progress');
  return (
    <>
      <PageHeader title="Progress" subtitle="Calculated by MongoDB aggregation pipelines over your workout logs." />
      {error && <Notice>{error}</Notice>}
      {loading ? <Loading /> : data && <ProgressCharts weekly={data.weekly} records={data.records} />}
    </>
  );
}
