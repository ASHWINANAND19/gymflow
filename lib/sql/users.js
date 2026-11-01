// Accounts: users table plus the members / trainers subtype tables
import { query, withTransaction } from '../db.js';
import { hashPassword } from '../auth.js';

export async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT user_id, full_name, email, password_hash, role, is_active
     FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserById(userId) {
  const { rows } = await query(
    'SELECT user_id, full_name, email, phone, role, is_active FROM users WHERE user_id = $1',
    [userId]
  );
  return rows[0] ?? null;
}

export async function touchLastLogin(userId) {
  await query('UPDATE users SET last_login = now() WHERE user_id = $1', [userId]);
}

// Transaction: the users row and the members row are saved together.
// If the members insert fails (e.g. too young), the user is rolled back.
export async function registerMember({ fullName, email, phone, password, dateOfBirth, gender, heightCm }) {
  const passwordHash = await hashPassword(password);
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'member') RETURNING user_id`,
      [fullName.trim(), email.trim().toLowerCase(), phone || null, passwordHash]
    );
    const userId = rows[0].user_id;
    await client.query(
      `INSERT INTO members (member_id, date_of_birth, gender, height_cm)
       VALUES ($1, $2, $3, $4)`,
      [userId, dateOfBirth, gender || null, heightCm || null]
    );
    return userId;
  });
}

// Same pattern for trainers (created by an admin)
export async function createTrainer({ fullName, email, phone, password, specialization, maxClients }) {
  const passwordHash = await hashPassword(password);
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'trainer') RETURNING user_id`,
      [fullName.trim(), email.trim().toLowerCase(), phone || null, passwordHash]
    );
    const userId = rows[0].user_id;
    await client.query(
      'INSERT INTO trainers (trainer_id, specialization, max_clients) VALUES ($1, $2, $3)',
      [userId, specialization.trim(), maxClients]
    );
    return userId;
  });
}
