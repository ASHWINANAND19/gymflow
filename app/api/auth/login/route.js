import { route, readJson, HttpError } from '@/lib/http.js';
import { requireFields } from '@/lib/validate.js';
import { verifyPassword, createSessionToken, homeFor } from '@/lib/auth.js';
import { setSessionCookie } from '@/lib/session.js';
import { findUserByEmail, touchLastLogin } from '@/lib/sql/users.js';

export const POST = route(async (request) => {
  const body = await readJson(request);
  requireFields(body, ['email', 'password']);

  const user = await findUserByEmail(String(body.email).trim().toLowerCase());
  // Same message for unknown email and wrong password, so attackers
  // cannot find out which emails have accounts
  if (!user || !(await verifyPassword(String(body.password), user.password_hash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  if (!user.is_active) throw new HttpError(403, 'Account is deactivated');

  await touchLastLogin(user.user_id);
  const token = await createSessionToken({ userId: user.user_id, role: user.role, name: user.full_name });
  await setSessionCookie(token);
  return Response.json({ role: user.role, home: homeFor(user.role) });
});
