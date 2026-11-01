import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { resetTestDatabases } from './helpers.js';
import { getMongoDb, closeMongo } from '../lib/mongo.js';
import { closePool } from '../lib/db.js';
import { parseWorkoutInput } from '../lib/validate.js';
import { HttpError } from '../lib/http.js';
import {
  createSession, listSessions, deleteSession, weeklyVolume, personalRecords, topExercises,
} from '../lib/mongo/workouts.js';

before(resetTestDatabases);
after(async () => {
  await closeMongo();
  await closePool();
});

const catalog = new Map([
  [1, { name: 'Bench Press', category: 'strength' }],
  [2, { name: 'Deadlift', category: 'strength' }],
  [3, { name: 'Treadmill Run', category: 'cardio' }],
]);

// Tuesday and Wednesday of the week two weeks ago, so both fall in one week
function dayOfTwoWeeksAgo(offsetFromMonday) {
  const d = new Date();
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday - 14 + offsetFromMonday);
  d.setUTCHours(6, 0, 0, 0);
  return d;
}

test('validator rejects strength exercise without sets', async () => {
  const db = await getMongoDb();
  await assert.rejects(
    db.collection('workout_sessions').insertOne({
      memberId: 1, date: new Date(), createdAt: new Date(),
      exercises: [{ exerciseId: 1, name: 'Bench Press', category: 'strength' }],
    }),
    (err) => err.code === 121
  );
});

test('validator rejects negative weight', async () => {
  const db = await getMongoDb();
  await assert.rejects(
    db.collection('workout_sessions').insertOne({
      memberId: 1, date: new Date(), createdAt: new Date(),
      exercises: [{ exerciseId: 1, name: 'Bench Press', category: 'strength', sets: [{ reps: 5, weightKg: -10 }] }],
    }),
    (err) => err.code === 121
  );
});

test('parseWorkoutInput rejects empty exercises and NaN reps', () => {
  assert.throws(
    () => parseWorkoutInput({ date: '2026-10-01', exercises: [] }, catalog),
    (err) => err instanceof HttpError && err.status === 400
  );
  assert.throws(
    () => parseWorkoutInput(
      { date: '2026-10-01', exercises: [{ exerciseId: 1, sets: [{ reps: 'abc', weightKg: 20 }] }] },
      catalog
    ),
    (err) => err instanceof HttpError && err.status === 400
  );
  assert.throws(
    () => parseWorkoutInput({ date: '2026-10-01', exercises: [{ exerciseId: 99, durationMin: 10 }] }, catalog),
    (err) => err instanceof HttpError && err.status === 400
  );
});

test('parseWorkoutInput fills name and category from the catalog', () => {
  const parsed = parseWorkoutInput(
    { date: '2026-10-01', exercises: [{ exerciseId: 3, durationMin: '20', distanceKm: '3.5' }] },
    catalog
  );
  assert.deepEqual(parsed.exercises[0], {
    exerciseId: 3, name: 'Treadmill Run', category: 'cardio', durationMin: 20, distanceKm: 3.5,
  });
});

test('weeklyVolume sums reps x weight', async () => {
  const memberId = 101;
  await createSession(memberId, {
    date: dayOfTwoWeeksAgo(1),
    exercises: [{ exerciseId: 1, name: 'Bench Press', category: 'strength',
      sets: [{ reps: 10, weightKg: 50 }, { reps: 10, weightKg: 50 }, { reps: 10, weightKg: 50 }] }],
  });
  await createSession(memberId, {
    date: dayOfTwoWeeksAgo(2),
    exercises: [
      { exerciseId: 2, name: 'Deadlift', category: 'strength',
        sets: [{ reps: 5, weightKg: 100 }, { reps: 5, weightKg: 100 }] },
      { exerciseId: 3, name: 'Treadmill Run', category: 'cardio', durationMin: 20, distanceKm: 3 },
    ],
  });
  const weeks = await weeklyVolume(memberId);
  assert.equal(weeks.length, 1);
  assert.equal(weeks[0].volumeKg, 2500);
  assert.equal(weeks[0].cardioKm, 3);
  assert.equal(weeks[0].sessions, 2);
});

test('personalRecords returns max weight per exercise', async () => {
  const records = await personalRecords(101);
  const bench = records.find((r) => r.exercise === 'Bench Press');
  const deadlift = records.find((r) => r.exercise === 'Deadlift');
  assert.equal(bench.bestWeightKg, 50);
  assert.equal(deadlift.bestWeightKg, 100);
  assert.equal(deadlift.totalSets, 2);
});

test('topExercises counts how often each exercise is logged', async () => {
  const top = await topExercises(5);
  assert.ok(top.some((t) => t.exercise === 'Bench Press' && t.times === 1));
});

test('aggregations return [] for a member with no sessions', async () => {
  assert.deepEqual(await weeklyVolume(999), []);
  assert.deepEqual(await personalRecords(999), []);
  assert.deepEqual(await listSessions(999), []);
});

test('deleteSession only deletes the member\'s own session', async () => {
  const [session] = await listSessions(101, 1);
  assert.equal(await deleteSession(202, session._id), false);
  assert.equal(await deleteSession(101, session._id), true);
  assert.equal(await deleteSession(101, 'not-an-id'), false);
});
