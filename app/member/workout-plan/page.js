'use client';

import { useApi, formatDate } from '@/lib/client.js';
import { PageHeader, Notice, Loading, Card, Empty } from '@/components/ui.js';
import PlanView from '@/components/PlanView.js';

export default function MyWorkoutPlanPage() {
  const { data: plan, error, loading } = useApi('/api/member/workout-plan');

  if (loading) return <Loading />;
  return (
    <>
      <PageHeader
        title="My workout plan"
        subtitle={plan ? `${plan.title} · by ${plan.trainerName} · updated ${formatDate(plan.updatedAt)}` : undefined}
      />
      {error && <Notice>{error}</Notice>}
      {plan ? <PlanView plan={plan} /> : (
        <Card>
          <Empty>No plan yet. Plans with a personal trainer include a custom weekly workout plan.</Empty>
        </Card>
      )}
    </>
  );
}
