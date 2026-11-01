// Workout sessions (MongoDB collection: workout_sessions)
import { ObjectId } from 'mongodb';
import { getMongoDb } from '../mongo.js';

async function sessions() {
  return (await getMongoDb()).collection('workout_sessions');
}

function withStringId(doc) {
  return { ...doc, _id: doc._id.toString() };
}

export async function createSession(memberId, workout) {
  const doc = { memberId, ...workout, createdAt: new Date() };
  const { insertedId } = await (await sessions()).insertOne(doc);
  return insertedId.toString();
}

export async function listSessions(memberId, limit = 20) {
  const docs = await (await sessions())
    .find({ memberId })
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(withStringId);
}

// Only deletes the session if it belongs to this member
export async function deleteSession(memberId, sessionId) {
  if (!ObjectId.isValid(sessionId)) return false;
  const { deletedCount } = await (await sessions()).deleteOne({
    _id: new ObjectId(sessionId),
    memberId,
  });
  return deletedCount === 1;
}

// Aggregation: total weight lifted (reps x kg), cardio distance and number
// of sessions per week, for the last `weeks` weeks.
export async function weeklyVolume(memberId, weeks = 8) {
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);
  const rows = await (await sessions()).aggregate([
    { $match: { memberId, date: { $gte: since } } },
    { $unwind: '$exercises' },
    { $unwind: { path: '$exercises.sets', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: {
          $dateTrunc: { date: '$date', unit: 'week', startOfWeek: 'monday', timezone: 'Asia/Kolkata' },
        },
        volumeKg: {
          $sum: {
            $multiply: [
              { $ifNull: ['$exercises.sets.reps', 0] },
              { $ifNull: ['$exercises.sets.weightKg', 0] },
            ],
          },
        },
        cardioKm: { $sum: { $ifNull: ['$exercises.distanceKm', 0] } },
        sessionIds: { $addToSet: '$_id' },
      },
    },
    {
      $project: {
        _id: 0,
        week: '$_id',
        volumeKg: 1,
        cardioKm: { $round: ['$cardioKm', 1] },
        sessions: { $size: '$sessionIds' },
      },
    },
    { $sort: { week: 1 } },
  ]).toArray();
  return rows;
}

// Aggregation: heaviest weight and most reps ever done per strength exercise
export async function personalRecords(memberId) {
  return (await sessions()).aggregate([
    { $match: { memberId } },
    { $unwind: '$exercises' },
    { $match: { 'exercises.category': 'strength' } },
    { $unwind: '$exercises.sets' },
    {
      $group: {
        _id: '$exercises.name',
        bestWeightKg: { $max: '$exercises.sets.weightKg' },
        bestReps: { $max: '$exercises.sets.reps' },
        totalSets: { $sum: 1 },
      },
    },
    { $project: { _id: 0, exercise: '$_id', bestWeightKg: 1, bestReps: 1, totalSets: 1 } },
    { $sort: { bestWeightKg: -1 } },
  ]).toArray();
}

// Aggregation: most frequently logged exercises across the whole gym
export async function topExercises(limit = 5) {
  return (await sessions()).aggregate([
    { $unwind: '$exercises' },
    { $group: { _id: '$exercises.name', times: { $sum: 1 } } },
    { $sort: { times: -1, _id: 1 } },
    { $limit: limit },
    { $project: { _id: 0, exercise: '$_id', times: 1 } },
  ]).toArray();
}

// Latest session date for each of the given members -> { [memberId]: Date }
export async function lastSessionDates(memberIds) {
  if (memberIds.length === 0) return {};
  const rows = await (await sessions()).aggregate([
    { $match: { memberId: { $in: memberIds } } },
    { $group: { _id: '$memberId', last: { $max: '$date' } } },
  ]).toArray();
  return Object.fromEntries(rows.map((r) => [r._id, r.last]));
}
