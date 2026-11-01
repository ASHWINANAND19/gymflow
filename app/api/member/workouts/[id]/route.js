import { route, HttpError } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { deleteSession } from '@/lib/mongo/workouts.js';

export const DELETE = route(async (request, { params }) => {
  const { userId } = await requireRole('member');
  const { id } = await params;
  if (!(await deleteSession(userId, id))) throw new HttpError(404, 'Workout not found');
  return Response.json({ ok: true });
});
