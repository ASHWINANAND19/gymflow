// Shared setup for the test suite. Tests run against separate gymflow_test
// databases so the seeded development data is never touched.
import { setupDatabase } from '../scripts/setup-db.js';
import { query } from '../lib/db.js';

export const TEST_DB_URL = 'postgresql://localhost:5432/gymflow_test';
export const TEST_MONGO_DB = 'gymflow_test';

// lib/db.js and lib/mongo.js read these lazily, on their first query
process.env.DATABASE_URL = TEST_DB_URL;
process.env.MONGODB_DB = TEST_MONGO_DB;
process.env.JWT_SECRET ||= 'test-secret-that-is-long-enough-for-hs256';

export async function resetTestDatabases() {
  await setupDatabase({
    databaseUrl: TEST_DB_URL,
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
    mongoDb: TEST_MONGO_DB,
  });
}

let counter = 0;
function uniqueEmail(prefix) {
  counter += 1;
  return `${prefix}${counter}.${Date.now()}@test.com`;
}

export async function makePlan({ includesTrainer = false, durationDays = 30, price = 1000 } = {}) {
  counter += 1;
  const { rows } = await query(
    `INSERT INTO plans (name, duration_days, price, includes_trainer)
     VALUES ($1, $2, $3, $4) RETURNING plan_id`,
    [`Plan ${counter}-${Date.now()}`, durationDays, price, includesTrainer]
  );
  return rows[0].plan_id;
}

export async function makeMember() {
  const { rows } = await query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ('Test Member', $1, 'x', 'member') RETURNING user_id`,
    [uniqueEmail('member')]
  );
  const memberId = rows[0].user_id;
  await query(
    `INSERT INTO members (member_id, date_of_birth, gender, height_cm)
     VALUES ($1, '2000-01-01', 'male', 175)`,
    [memberId]
  );
  return memberId;
}

export async function makeTrainer({ maxClients = 10 } = {}) {
  const { rows } = await query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ('Test Trainer', $1, 'x', 'trainer') RETURNING user_id`,
    [uniqueEmail('trainer')]
  );
  const trainerId = rows[0].user_id;
  await query(
    `INSERT INTO trainers (trainer_id, specialization, max_clients) VALUES ($1, 'Strength', $2)`,
    [trainerId, maxClients]
  );
  return trainerId;
}

// Gives a member a membership that starts startOffsetDays from today
export async function giveMembership(memberId, planId, { startOffsetDays = 0, status = 'active' } = {}) {
  const { rows } = await query(
    `INSERT INTO memberships (member_id, plan_id, start_date, end_date, status)
     SELECT $1, plan_id, current_date + $3::int, current_date + $3::int + duration_days - 1, $4
     FROM plans WHERE plan_id = $2
     RETURNING membership_id`,
    [memberId, planId, startOffsetDays, status]
  );
  return rows[0].membership_id;
}
