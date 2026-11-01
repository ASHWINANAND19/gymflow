// MongoDB data model: two collections, each protected by a $jsonSchema
// validator so bad documents are rejected by the database itself.

const NUMBER = ['int', 'long', 'double', 'decimal'];
const INTEGER = ['int', 'long'];

// One exercise inside a workout session. The required fields depend on
// the category: strength needs sets, cardio and flexibility need minutes.
const exerciseEntry = {
  bsonType: 'object',
  required: ['exerciseId', 'name', 'category'],
  properties: {
    exerciseId: { bsonType: INTEGER },
    name: { bsonType: 'string', minLength: 1 },
    category: { enum: ['strength', 'cardio', 'flexibility'] },
    sets: {
      bsonType: 'array',
      minItems: 1,
      items: {
        bsonType: 'object',
        required: ['reps', 'weightKg'],
        properties: {
          reps: { bsonType: INTEGER, minimum: 1, maximum: 100 },
          weightKg: { bsonType: NUMBER, minimum: 0, maximum: 500 },
        },
      },
    },
    distanceKm: { bsonType: NUMBER, minimum: 0, maximum: 100 },
    durationMin: { bsonType: NUMBER, minimum: 1, maximum: 300 },
  },
  anyOf: [
    { properties: { category: { enum: ['strength'] } }, required: ['sets'] },
    { properties: { category: { enum: ['cardio', 'flexibility'] } }, required: ['durationMin'] },
  ],
};

const workoutSessionSchema = {
  bsonType: 'object',
  required: ['memberId', 'date', 'exercises', 'createdAt'],
  properties: {
    memberId: { bsonType: INTEGER },
    date: { bsonType: 'date' },
    durationMin: { bsonType: NUMBER, minimum: 1, maximum: 300 },
    notes: { bsonType: 'string', maxLength: 500 },
    exercises: { bsonType: 'array', minItems: 1, items: exerciseEntry },
    createdAt: { bsonType: 'date' },
  },
};

const workoutPlanSchema = {
  bsonType: 'object',
  required: ['memberId', 'trainerId', 'title', 'days', 'active', 'updatedAt'],
  properties: {
    memberId: { bsonType: INTEGER },
    trainerId: { bsonType: INTEGER },
    title: { bsonType: 'string', minLength: 1, maxLength: 100 },
    active: { bsonType: 'bool' },
    days: {
      bsonType: 'array',
      minItems: 1,
      items: {
        bsonType: 'object',
        required: ['day', 'items'],
        properties: {
          day: { enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
          items: {
            bsonType: 'array',
            minItems: 1,
            items: {
              bsonType: 'object',
              required: ['exerciseId', 'name', 'targetSets', 'targetReps'],
              properties: {
                exerciseId: { bsonType: INTEGER },
                name: { bsonType: 'string' },
                targetSets: { bsonType: INTEGER, minimum: 1, maximum: 10 },
                targetReps: { bsonType: INTEGER, minimum: 1, maximum: 100 },
              },
            },
          },
        },
      },
    },
    updatedAt: { bsonType: 'date' },
  },
};

export async function setupMongo(db) {
  const existing = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
  for (const name of ['workout_sessions', 'workout_plans']) {
    if (existing.includes(name)) await db.collection(name).drop();
  }

  await db.createCollection('workout_sessions', {
    validator: { $jsonSchema: workoutSessionSchema },
    validationLevel: 'strict',
    validationAction: 'error',
  });
  await db.createCollection('workout_plans', {
    validator: { $jsonSchema: workoutPlanSchema },
    validationLevel: 'strict',
    validationAction: 'error',
  });

  // Most reads are "this member's sessions, newest first"
  await db.collection('workout_sessions').createIndex({ memberId: 1, date: -1 });
  await db.collection('workout_plans').createIndex({ memberId: 1, active: 1 });
}
