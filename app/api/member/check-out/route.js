import { route } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { checkOut } from '@/lib/sql/checkins.js';

export const POST = route(async () => {
  const { userId } = await requireRole('member');
  return Response.json(await checkOut(userId));
});
