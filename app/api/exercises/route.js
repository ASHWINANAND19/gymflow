import { route } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { listExercises } from '@/lib/sql/exercises.js';

export const GET = route(async () => {
  await requireRole();
  return Response.json(await listExercises());
});
