import { route, toId } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { cancelMembership } from '@/lib/sql/memberships.js';

export const POST = route(async (request, { params }) => {
  await requireRole('admin');
  await cancelMembership(toId((await params).id, 'membership id'));
  return Response.json({ ok: true });
});
