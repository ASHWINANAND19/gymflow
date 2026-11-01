import { route } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { listClients, getWorkload } from '@/lib/sql/trainers.js';
import { lastSessionDates } from '@/lib/mongo/workouts.js';

// Client list from PostgreSQL, enriched with each client's latest workout
// date from MongoDB
export const GET = route(async () => {
  const { userId } = await requireRole('trainer');
  const [clients, workload] = await Promise.all([listClients(userId), getWorkload(userId)]);
  const lastWorkout = await lastSessionDates(clients.map((c) => c.member_id));
  return Response.json({
    workload,
    clients: clients.map((c) => ({ ...c, last_workout: lastWorkout[c.member_id] ?? null })),
  });
});
