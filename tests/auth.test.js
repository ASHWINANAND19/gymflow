import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { resetTestDatabases } from './helpers.js';
import { query, closePool } from '../lib/db.js';
import { hashPassword, verifyPassword, createSessionToken, readSessionToken, homeFor } from '../lib/auth.js';
import { registerMember, findUserByEmail } from '../lib/sql/users.js';

before(resetTestDatabases);
after(closePool);

const newMember = (overrides = {}) => ({
  fullName: 'Asha Verma',
  email: 'asha@example.com',
  phone: '9876543210',
  password: 'Secret@123',
  dateOfBirth: '1999-05-10',
  gender: 'female',
  heightCm: 162,
  ...overrides,
});

test('hash and verify password', async () => {
  const hash = await hashPassword('Secret@123');
  assert.notEqual(hash, 'Secret@123');
  assert.equal(await verifyPassword('Secret@123', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});

test('session token round-trips userId and role', async () => {
  const token = await createSessionToken({ userId: 7, role: 'trainer', name: 'Arjun' });
  assert.deepEqual(await readSessionToken(token), { userId: 7, role: 'trainer', name: 'Arjun' });
  assert.equal(homeFor('trainer'), '/trainer');
});

test('tampered token returns null', async () => {
  const token = await createSessionToken({ userId: 7, role: 'member', name: 'X' });
  const [header, , signature] = token.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ sub: '1', role: 'admin' })).toString('base64url');
  assert.equal(await readSessionToken(`${header}.${forgedPayload}.${signature}`), null);
  assert.equal(await readSessionToken('garbage'), null);
  assert.equal(await readSessionToken(undefined), null);
});

test('registerMember stores a hashed password and a member profile', async () => {
  const userId = await registerMember(newMember());
  const user = await findUserByEmail('asha@example.com');
  assert.equal(user.user_id, userId);
  assert.equal(user.role, 'member');
  assert.notEqual(user.password_hash, 'Secret@123');
  const { rows } = await query('SELECT COUNT(*) AS n FROM members WHERE member_id = $1', [userId]);
  assert.equal(rows[0].n, 1);
});

test('registerMember rejects a duplicate email', async () => {
  await assert.rejects(registerMember(newMember({ fullName: 'Someone Else' })), (err) => err.code === '23505');
});

test('registerMember is atomic: a bad profile leaves no user row behind', async () => {
  await assert.rejects(
    registerMember(newMember({ email: 'too.young@example.com', dateOfBirth: '2020-01-01' })),
    (err) => err.code === '23514'
  );
  assert.equal(await findUserByEmail('too.young@example.com'), null);
});
