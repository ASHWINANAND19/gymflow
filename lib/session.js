// Reading and writing the login cookie inside Next.js route handlers.
import { cookies } from 'next/headers';
import { query } from './db.js';
import { HttpError } from './http.js';
import { readSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from './auth.js';

export async function getSession() {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

// Every API route calls this first. It checks the cookie, that the account
// is still active, and that the user has one of the allowed roles.
export async function requireRole(...roles) {
  const session = await getSession();
  if (!session) throw new HttpError(401, 'Please log in');

  const { rows } = await query('SELECT is_active FROM users WHERE user_id = $1', [session.userId]);
  if (!rows[0]?.is_active) throw new HttpError(401, 'Your account is no longer active');

  if (roles.length > 0 && !roles.includes(session.role)) {
    throw new HttpError(403, 'You do not have access to this');
  }
  return session;
}

export async function setSessionCookie(token) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
