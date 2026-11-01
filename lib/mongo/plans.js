// Trainer-written workout plans (MongoDB collection: workout_plans)
import { getMongoDb } from '../mongo.js';

async function plans() {
  return (await getMongoDb()).collection('workout_plans');
}

export async function getActivePlan(memberId) {
  const plan = await (await plans()).findOne({ memberId, active: true });
  return plan ? { ...plan, _id: plan._id.toString() } : null;
}

// Keeps old plans as history: the current one is switched off and the
// new one becomes the active plan.
export async function saveActivePlan(memberId, trainerId, { title, days }) {
  const collection = await plans();
  await collection.updateMany({ memberId, active: true }, { $set: { active: false } });
  const { insertedId } = await collection.insertOne({
    memberId,
    trainerId,
    title,
    days,
    active: true,
    updatedAt: new Date(),
  });
  return insertedId.toString();
}
