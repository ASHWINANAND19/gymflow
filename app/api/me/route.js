import { route } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { findUserById } from '@/lib/sql/users.js';

export const GET = route(async () => {
  const session = await requireRole();
  const user = await findUserById(session.userId);
  return Response.json({ userId: user.user_id, name: user.full_name, email: user.email, role: user.role });
});
