import { route, toId } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { endAssignment } from '@/lib/sql/trainers.js';

// Ends a running assignment (sets ended_on = today)
export const PATCH = route(async (request, { params }) => {
  await requireRole('admin');
  await endAssignment(toId((await params).id, 'assignment id'));
  return Response.json({ ok: true });
});
