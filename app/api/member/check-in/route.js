import { route } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { checkIn } from '@/lib/sql/checkins.js';

// The database trigger decides whether the check-in is allowed
export const POST = route(async () => {
  const { userId } = await requireRole('member');
  return Response.json(await checkIn(userId), { status: 201 });
});
