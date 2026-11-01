// Input checks done in the API before anything reaches a database.
// The databases validate again (constraints, triggers, $jsonSchema);
// these checks exist to give clear messages.
import { HttpError } from './http.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

export function toNumber(value, label, { min, max, integer = false }) {
  const n = Number(value);
  if (isBlank(value) || !Number.isFinite(n)) {
    throw new HttpError(400, `${label} must be a number`);
  }
  if (integer && !Number.isInteger(n)) {
    throw new HttpError(400, `${label} must be a whole number`);
  }
  if (n < min || n > max) {
    throw new HttpError(400, `${label} must be between ${min} and ${max}`);
  }
  return n;
}

export function requireFields(body, names) {
  for (const name of names) {
    if (isBlank(body?.[name])) throw new HttpError(400, `${name} is required`);
  }
}

// 'YYYY-MM-DD' -> Date at midnight India time. Future dates are refused.
function parseWorkoutDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, 'Date must be in YYYY-MM-DD format');
  }
  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, 'Date is not valid');
  if (date.getTime() > Date.now()) throw new HttpError(400, 'Workout date cannot be in the future');
  return date;
}

function exerciseFromCatalog(rawId, catalog, label) {
  const exerciseId = toNumber(rawId, `${label}: exercise`, { min: 1, max: 1e9, integer: true });
  const info = catalog.get(exerciseId);
  if (!info) throw new HttpError(400, `${label}: unknown exercise`);
  return { exerciseId, name: info.name, category: info.category };
}

// `catalog` is a Map of exerciseId -> { name, category } loaded from
// PostgreSQL, so names and categories come from the server, not the browser.
export function parseWorkoutInput(body, catalog) {
  if (!body || typeof body !== 'object') throw new HttpError(400, 'Workout details are required');

  const rawExercises = Array.isArray(body.exercises) ? body.exercises : [];
  if (rawExercises.length === 0) throw new HttpError(400, 'Add at least one exercise');
  if (rawExercises.length > 20) throw new HttpError(400, 'A workout can have at most 20 exercises');

  const exercises = rawExercises.map((raw, i) => {
    const label = `Exercise ${i + 1}`;
    const entry = exerciseFromCatalog(raw?.exerciseId, catalog, label);

    if (entry.category === 'strength') {
      const sets = Array.isArray(raw.sets) ? raw.sets : [];
      if (sets.length === 0) throw new HttpError(400, `${label}: add at least one set`);
      entry.sets = sets.map((set, j) => ({
        reps: toNumber(set?.reps, `${label} set ${j + 1} reps`, { min: 1, max: 100, integer: true }),
        weightKg: toNumber(set?.weightKg, `${label} set ${j + 1} weight`, { min: 0, max: 500 }),
      }));
    } else {
      entry.durationMin = toNumber(raw.durationMin, `${label}: minutes`, { min: 1, max: 300 });
      if (entry.category === 'cardio' && !isBlank(raw.distanceKm)) {
        entry.distanceKm = toNumber(raw.distanceKm, `${label}: distance`, { min: 0, max: 100 });
      }
    }
    return entry;
  });

  const workout = { date: parseWorkoutDate(body.date), exercises };
  if (!isBlank(body.durationMin)) {
    workout.durationMin = toNumber(body.durationMin, 'Session length', { min: 1, max: 300 });
  }
  if (!isBlank(body.notes)) workout.notes = String(body.notes).trim().slice(0, 500);
  return workout;
}

// Trainer-written weekly plan: { title, days: [{ day, items: [{ exerciseId, targetSets, targetReps }] }] }
export function parsePlanInput(body, catalog) {
  if (!body || typeof body !== 'object') throw new HttpError(400, 'Plan details are required');
  const title = String(body.title ?? '').trim();
  if (title.length < 1 || title.length > 100) throw new HttpError(400, 'Title must be 1-100 characters');

  const rawDays = Array.isArray(body.days) ? body.days.filter((d) => d?.items?.length) : [];
  if (rawDays.length === 0) throw new HttpError(400, 'Add at least one day with an exercise');

  const seen = new Set();
  const days = rawDays.map((raw) => {
    if (!DAYS.includes(raw.day)) throw new HttpError(400, `Unknown day: ${raw.day}`);
    if (seen.has(raw.day)) throw new HttpError(400, `${raw.day} appears twice`);
    seen.add(raw.day);
    return {
      day: raw.day,
      items: raw.items.map((item, i) => {
        const label = `${raw.day} item ${i + 1}`;
        const { exerciseId, name } = exerciseFromCatalog(item?.exerciseId, catalog, label);
        return {
          exerciseId,
          name,
          targetSets: toNumber(item.targetSets, `${label} sets`, { min: 1, max: 10, integer: true }),
          targetReps: toNumber(item.targetReps, `${label} reps`, { min: 1, max: 100, integer: true }),
        };
      }),
    };
  });
  days.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));
  return { title, days };
}
