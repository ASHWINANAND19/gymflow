import { route, toId } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { deleteExercise } from '@/lib/sql/exercises.js';

export const DELETE = route(async (request, { params }) => {
  await requireRole('admin');
  await deleteExercise(toId((await params).id, 'exercise id'));
  return Response.json({ ok: true });
});
