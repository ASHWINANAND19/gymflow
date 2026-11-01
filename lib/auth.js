// Password hashing and login sessions.
// A session is a signed JWT stored in an httpOnly cookie, so the browser
// cannot read it with JavaScript and nobody can forge it without JWT_SECRET.
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'gymflow_session';
export const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours, in seconds

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set in .env.local (at least 32 characters)');
  }
  return new TextEncoder().encode(secret);
}

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createSessionToken({ userId, role, name }) {
  return new SignJWT({ role, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

// Returns { userId, role, name } for a valid token, or null for a missing,
// expired or tampered one.
export async function readSessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    return { userId: Number(payload.sub), role: payload.role, name: payload.name };
  } catch {
    return null;
  }
}

export function homeFor(role) {
  return { admin: '/admin', trainer: '/trainer', member: '/member' }[role] ?? '/login';
}
