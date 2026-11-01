import { route } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { searchMembers } from '@/lib/sql/members.js';

// GET /api/admin/members?q=rohan&status=active&planId=2
export const GET = route(async (request) => {
  await requireRole('admin');
  const params = request.nextUrl.searchParams;
  const planId = Number(params.get('planId'));
  return Response.json(await searchMembers({
    q: params.get('q')?.trim() || null,
    status: ['active', 'expired', 'none'].includes(params.get('status')) ? params.get('status') : 'all',
    planId: Number.isInteger(planId) && planId > 0 ? planId : null,
  }));
});
