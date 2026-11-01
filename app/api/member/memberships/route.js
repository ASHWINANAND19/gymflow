import { route, readJson, toId } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { requireFields } from '@/lib/validate.js';
import { listMembershipHistory, purchaseMembership } from '@/lib/sql/memberships.js';

export const GET = route(async () => {
  const { userId } = await requireRole('member');
  return Response.json(await listMembershipHistory(userId));
});

// Buy or renew a plan (transaction + purchase_membership procedure)
export const POST = route(async (request) => {
  const { userId } = await requireRole('member');
  const body = await readJson(request);
  requireFields(body, ['planId', 'method']);
  const membershipId = await purchaseMembership(userId, toId(body.planId, 'plan'), String(body.method));
  return Response.json({ membershipId }, { status: 201 });
});
