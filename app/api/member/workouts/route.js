import { route, readJson } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { parseWorkoutInput } from '@/lib/validate.js';
import { getExerciseCatalog } from '@/lib/sql/exercises.js';
import { createSession, listSessions } from '@/lib/mongo/workouts.js';

export const GET = route(async () => {
  const { userId } = await requireRole('member');
  return Response.json(await listSessions(userId, 30));
});

// Exercise names and categories come from PostgreSQL; the session itself
// is stored as one document in MongoDB.
export const POST = route(async (request) => {
  const { userId } = await requireRole('member');
  const body = await readJson(request);
  const workout = parseWorkoutInput(body, await getExerciseCatalog());
  const id = await createSession(userId, workout);
  return Response.json({ id }, { status: 201 });
});
