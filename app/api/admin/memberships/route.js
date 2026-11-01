import { route, readJson, toId } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { requireFields } from '@/lib/validate.js';
import { purchaseMembership } from '@/lib/sql/memberships.js';

// Front-desk sale: the admin records a plan purchase for a member
export const POST = route(async (request) => {
  await requireRole('admin');
  const body = await readJson(request);
  requireFields(body, ['memberId', 'planId', 'method']);
  const membershipId = await purchaseMembership(
    toId(body.memberId, 'member'),
    toId(body.planId, 'plan'),
    String(body.method)
  );
  return Response.json({ membershipId }, { status: 201 });
});
