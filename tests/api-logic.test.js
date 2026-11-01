import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  resetTestDatabases, makePlan, makeMember, makeTrainer, giveMembership,
} from './helpers.js';
import { query, closePool } from '../lib/db.js';
import { HttpError } from '../lib/http.js';
import { purchaseMembership, getMemberDashboard, cancelMembership } from '../lib/sql/memberships.js';
import { checkIn, checkOut } from '../lib/sql/checkins.js';
import { isTrainerOfMember, assignTrainer, updateCapacity } from '../lib/sql/trainers.js';
import { searchMembers } from '../lib/sql/members.js';
import { deletePlan } from '../lib/sql/plans.js';

before(resetTestDatabases);
after(closePool);

const isHttp = (status) => (err) => err instanceof HttpError && err.status === status;

test('purchaseMembership returns the new id and records the payment', async () => {
  const memberId = await makeMember();
  const planId = await makePlan({ price: 2500 });
  const membershipId = await purchaseMembership(memberId, planId, 'card');
  const { rows } = await query('SELECT amount FROM payments WHERE membership_id = $1', [membershipId]);
  assert.equal(rows[0].amount, 2500);
});

test('getMemberDashboard shows upcoming-only member', async () => {
  const memberId = await makeMember();
  const planId = await makePlan();
  await giveMembership(memberId, planId, { startOffsetDays: 3 });
  const dash = await getMemberDashboard(memberId);
  assert.equal(dash.current, null);
  assert.ok(dash.upcoming.plan_name);
  assert.equal(dash.openCheckIn, null);
});

test('check in then check out; checkOut without open check-in throws 400', async () => {
  const memberId = await makeMember();
  const planId = await makePlan();
  await giveMembership(memberId, planId);
  await checkIn(memberId);
  const dash = await getMemberDashboard(memberId);
  assert.ok(dash.openCheckIn);
  await checkOut(memberId);
  await assert.rejects(checkOut(memberId), isHttp(400));
});

test('isTrainerOfMember false for another trainer\'s client', async () => {
  const t1 = await makeTrainer();
  const t2 = await makeTrainer();
  const planId = await makePlan({ includesTrainer: true });
  const memberId = await makeMember();
  await giveMembership(memberId, planId);
  await assignTrainer(memberId, t1);
  assert.equal(await isTrainerOfMember(t1, memberId), true);
  assert.equal(await isTrainerOfMember(t2, memberId), false);
});

test('cancelling a trainer plan releases the trainer', async () => {
  const trainerId = await makeTrainer();
  const planId = await makePlan({ includesTrainer: true });
  const memberId = await makeMember();
  const membershipId = await giveMembership(memberId, planId);
  await assignTrainer(memberId, trainerId);
  await cancelMembership(membershipId);
  assert.equal(await isTrainerOfMember(trainerId, memberId), false);
  await assert.rejects(cancelMembership(membershipId), isHttp(404));
});

test('capacity cannot go below current client count', async () => {
  const trainerId = await makeTrainer({ maxClients: 5 });
  const planId = await makePlan({ includesTrainer: true });
  for (let i = 0; i < 2; i++) {
    const m = await makeMember();
    await giveMembership(m, planId);
    await assignTrainer(m, trainerId);
  }
  await assert.rejects(updateCapacity(trainerId, 1), isHttp(400));
  await updateCapacity(trainerId, 2);
});

test('searchMembers filters by status', async () => {
  const planId = await makePlan();
  const activeId = await makeMember();
  await giveMembership(activeId, planId);
  const lapsedId = await makeMember();
  await giveMembership(lapsedId, planId, { startOffsetDays: -60, status: 'expired' });
  const neverId = await makeMember();

  const active = await searchMembers({ status: 'active' });
  const expired = await searchMembers({ status: 'expired' });
  const none = await searchMembers({ status: 'none' });
  assert.ok(active.some((m) => m.member_id === activeId));
  assert.ok(!active.some((m) => m.member_id === lapsedId));
  assert.ok(expired.some((m) => m.member_id === lapsedId));
  assert.ok(none.some((m) => m.member_id === neverId));
});

test('deletePlan in use is refused; unused plan is deleted', async () => {
  const usedPlan = await makePlan();
  const memberId = await makeMember();
  await giveMembership(memberId, usedPlan);
  await assert.rejects(deletePlan(usedPlan), isHttp(409));

  const unusedPlan = await makePlan();
  await deletePlan(unusedPlan);
  const { rows } = await query('SELECT COUNT(*) AS n FROM plans WHERE plan_id = $1', [unusedPlan]);
  assert.equal(rows[0].n, 0);
});
