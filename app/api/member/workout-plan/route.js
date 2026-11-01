import { route } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { getActivePlan } from '@/lib/mongo/plans.js';
import { findUserById } from '@/lib/sql/users.js';

export const GET = route(async () => {
  const { userId } = await requireRole('member');
  const plan = await getActivePlan(userId);
  if (!plan) return Response.json(null);
  const trainer = await findUserById(plan.trainerId);
  return Response.json({ ...plan, trainerName: trainer?.full_name ?? 'Your trainer' });
});
