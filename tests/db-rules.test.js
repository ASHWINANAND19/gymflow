import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  resetTestDatabases, makePlan, makeMember, makeTrainer, giveMembership,
} from './helpers.js';
import { query, withTransaction, closePool } from '../lib/db.js';

before(resetTestDatabases);
after(closePool);

test('check-in refused without active membership', async () => {
  const memberId = await makeMember();
  await assert.rejects(
    query('INSERT INTO check_ins (member_id) VALUES ($1)', [memberId]),
    /no active membership/
  );
});

test('check-in refused when membership has expired', async () => {
  const memberId = await makeMember();
  const planId = await makePlan({ durationDays: 30 });
  await giveMembership(memberId, planId, { startOffsetDays: -40 });
  await assert.rejects(
    query('INSERT INTO check_ins (member_id) VALUES ($1)', [memberId]),
    /no active membership/
  );
});

test('check-in refused when the only membership starts in the future', async () => {
  const memberId = await makeMember();
  const planId = await makePlan();
  await giveMembership(memberId, planId, { startOffsetDays: 5 });
  await assert.rejects(
    query('INSERT INTO check_ins (member_id) VALUES ($1)', [memberId]),
    /no active membership/
  );
});

test('second open check-in same day refused', async () => {
  const memberId = await makeMember();
  const planId = await makePlan();
  await giveMembership(memberId, planId);
  await query('INSERT INTO check_ins (member_id) VALUES ($1)', [memberId]);
  await assert.rejects(
    query('INSERT INTO check_ins (member_id) VALUES ($1)', [memberId]),
    /already checked in/
  );
});

test('purchase creates membership and payment at plan price', async () => {
  const memberId = await makeMember();
  const planId = await makePlan({ durationDays: 30, price: 1500 });
  const { rows } = await query('CALL purchase_membership($1, $2, $3, NULL)', [memberId, planId, 'upi']);
  const membershipId = rows[0].p_membership_id;

  const ms = await query(
    `SELECT start_date, end_date, end_date - start_date AS span, start_date = current_date AS starts_today
     FROM memberships WHERE membership_id = $1`,
    [membershipId]
  );
  assert.equal(ms.rows[0].span, 29);
  assert.equal(ms.rows[0].starts_today, true);

  const pay = await query('SELECT amount, method FROM payments WHERE membership_id = $1', [membershipId]);
  assert.equal(pay.rows[0].amount, 1500);
  assert.equal(pay.rows[0].method, 'upi');
});

test('renewal starts the day after current membership ends', async () => {
  const memberId = await makeMember();
  const planId = await makePlan({ durationDays: 30 });
  const first = await query('CALL purchase_membership($1, $2, $3, NULL)', [memberId, planId, 'cash']);
  const second = await query('CALL purchase_membership($1, $2, $3, NULL)', [memberId, planId, 'cash']);
  const { rows } = await query(
    `SELECT b.start_date - a.end_date AS gap
     FROM memberships a, memberships b
     WHERE a.membership_id = $1 AND b.membership_id = $2`,
    [first.rows[0].p_membership_id, second.rows[0].p_membership_id]
  );
  assert.equal(rows[0].gap, 1);
});

test('failed payment rolls back the membership', async () => {
  const memberId = await makeMember();
  const planId = await makePlan();
  await assert.rejects(
    withTransaction((client) =>
      client.query('CALL purchase_membership($1, $2, $3, NULL)', [memberId, planId, 'bitcoin'])
    ),
    (err) => err.code === '23514'
  );
  const { rows } = await query('SELECT COUNT(*) AS n FROM memberships WHERE member_id = $1', [memberId]);
  assert.equal(rows[0].n, 0);
});

test('purchase of an inactive plan is refused', async () => {
  const memberId = await makeMember();
  const planId = await makePlan();
  await query('UPDATE plans SET is_active = FALSE WHERE plan_id = $1', [planId]);
  await assert.rejects(
    query('CALL purchase_membership($1, $2, $3, NULL)', [memberId, planId, 'card']),
    /Plan is not available/
  );
});

test('trainer at capacity is refused', async () => {
  const trainerId = await makeTrainer({ maxClients: 1 });
  const planId = await makePlan({ includesTrainer: true });
  const a = await makeMember();
  const b = await makeMember();
  await giveMembership(a, planId);
  await giveMembership(b, planId);
  await query('INSERT INTO trainer_assignments (member_id, trainer_id) VALUES ($1, $2)', [a, trainerId]);
  await assert.rejects(
    query('INSERT INTO trainer_assignments (member_id, trainer_id) VALUES ($1, $2)', [b, trainerId]),
    /full capacity/
  );
});

test('trainer requires a plan that includes one', async () => {
  const trainerId = await makeTrainer();
  const planId = await makePlan({ includesTrainer: false });
  const memberId = await makeMember();
  await giveMembership(memberId, planId);
  await assert.rejects(
    query('INSERT INTO trainer_assignments (member_id, trainer_id) VALUES ($1, $2)', [memberId, trainerId]),
    /does not include/
  );
});

test('member cannot have two active trainers', async () => {
  const t1 = await makeTrainer();
  const t2 = await makeTrainer();
  const planId = await makePlan({ includesTrainer: true });
  const memberId = await makeMember();
  await giveMembership(memberId, planId);
  await query('INSERT INTO trainer_assignments (member_id, trainer_id) VALUES ($1, $2)', [memberId, t1]);
  await assert.rejects(
    query('INSERT INTO trainer_assignments (member_id, trainer_id) VALUES ($1, $2)', [memberId, t2]),
    (err) => err.code === '23505'
  );
});

test('expire_memberships flips stale rows and audit_log records it', async () => {
  const memberId = await makeMember();
  const planId = await makePlan({ durationDays: 30 });
  const membershipId = await giveMembership(memberId, planId, { startOffsetDays: -60 });

  const { rows } = await query('SELECT expire_memberships() AS n');
  assert.ok(rows[0].n >= 1);

  const status = await query('SELECT status FROM memberships WHERE membership_id = $1', [membershipId]);
  assert.equal(status.rows[0].status, 'expired');

  const audit = await query(
    `SELECT COUNT(*) AS n FROM audit_log
     WHERE table_name = 'memberships' AND record_id = $1 AND details->>'new_status' = 'expired'`,
    [membershipId]
  );
  assert.equal(audit.rows[0].n, 1);
});

test('days_remaining counts stacked memberships', async () => {
  const memberId = await makeMember();
  const planId = await makePlan({ durationDays: 30 });
  await query('CALL purchase_membership($1, $2, $3, NULL)', [memberId, planId, 'cash']);
  await query('CALL purchase_membership($1, $2, $3, NULL)', [memberId, planId, 'cash']);
  const { rows } = await query('SELECT days_remaining($1) AS d', [memberId]);
  assert.equal(rows[0].d, 59);
});

test('v_trainer_workload counts active clients', async () => {
  const trainerId = await makeTrainer({ maxClients: 4 });
  const planId = await makePlan({ includesTrainer: true });
  for (let i = 0; i < 2; i++) {
    const m = await makeMember();
    await giveMembership(m, planId);
    await query('INSERT INTO trainer_assignments (member_id, trainer_id) VALUES ($1, $2)', [m, trainerId]);
  }
  const { rows } = await query(
    'SELECT active_clients, utilisation_pct FROM v_trainer_workload WHERE trainer_id = $1',
    [trainerId]
  );
  assert.equal(rows[0].active_clients, 2);
  assert.equal(rows[0].utilisation_pct, 50);
});

test('check constraints reject bad email and zero price', async () => {
  await assert.rejects(
    query(`INSERT INTO users (full_name, email, password_hash, role) VALUES ('Bad', 'not-an-email', 'x', 'member')`),
    (err) => err.code === '23514'
  );
  await assert.rejects(
    query(`INSERT INTO plans (name, duration_days, price) VALUES ('Free', 30, 0)`),
    (err) => err.code === '23514'
  );
});
