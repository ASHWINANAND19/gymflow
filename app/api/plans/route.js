import { route } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { listPlans } from '@/lib/sql/plans.js';

// Plans that can currently be bought (any logged-in user)
export const GET = route(async () => {
  await requireRole();
  return Response.json(await listPlans());
});
