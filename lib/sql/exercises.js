// Exercise catalog (PostgreSQL). Workout logs in MongoDB copy the name and
// category, so deleting an exercise here never breaks old workout history.
import { query } from '../db.js';
import { HttpError } from '../http.js';

export async function listExercises() {
  const { rows } = await query(
    'SELECT exercise_id, name, category, muscle_group FROM exercises ORDER BY category, name'
  );
  return rows;
}

// Map of exercise_id -> { name, category }, used to validate workouts
export async function getExerciseCatalog() {
  const rows = await listExercises();
  return new Map(rows.map((e) => [e.exercise_id, { name: e.name, category: e.category }]));
}

export async function createExercise({ name, category, muscleGroup }) {
  const { rows } = await query(
    'INSERT INTO exercises (name, category, muscle_group) VALUES ($1, $2, $3) RETURNING exercise_id',
    [name.trim(), category, muscleGroup || null]
  );
  return rows[0].exercise_id;
}

export async function deleteExercise(exerciseId) {
  const { rowCount } = await query('DELETE FROM exercises WHERE exercise_id = $1', [exerciseId]);
  if (rowCount === 0) throw new HttpError(404, 'Exercise not found');
}
