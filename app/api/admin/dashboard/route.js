import { route } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { getAdminDashboard } from '@/lib/sql/dashboard.js';
import { topExercises } from '@/lib/mongo/workouts.js';

export const GET = route(async () => {
  await requireRole('admin');
  const [stats, popularExercises] = await Promise.all([getAdminDashboard(), topExercises(6)]);
  return Response.json({ ...stats, popularExercises });
});
