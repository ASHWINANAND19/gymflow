import { route, readJson, HttpError } from '@/lib/http.js';
import { requireFields } from '@/lib/validate.js';
import { createSessionToken, homeFor } from '@/lib/auth.js';
import { setSessionCookie } from '@/lib/session.js';
import { registerMember } from '@/lib/sql/users.js';

// Public sign-up. Only members can sign up; trainers are added by an admin.
export const POST = route(async (request) => {
  const body = await readJson(request);
  requireFields(body, ['fullName', 'email', 'password', 'dateOfBirth']);
  if (String(body.password).length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters');
  }

  const userId = await registerMember({
    fullName: String(body.fullName),
    email: String(body.email),
    phone: body.phone ? String(body.phone).trim() : null,
    password: String(body.password),
    dateOfBirth: body.dateOfBirth,
    gender: body.gender || null,
    heightCm: body.heightCm ? Number(body.heightCm) : null,
  });

  const token = await createSessionToken({ userId, role: 'member', name: String(body.fullName).trim() });
  await setSessionCookie(token);
  return Response.json({ role: 'member', home: homeFor('member') }, { status: 201 });
});
