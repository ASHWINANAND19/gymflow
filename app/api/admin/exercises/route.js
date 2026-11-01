import { route, readJson } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { requireFields } from '@/lib/validate.js';
import { createExercise } from '@/lib/sql/exercises.js';

export const POST = route(async (request) => {
  await requireRole('admin');
  const body = await readJson(request);
  requireFields(body, ['name', 'category']);
  const exerciseId = await createExercise({
    name: String(body.name),
    category: String(body.category),
    muscleGroup: body.muscleGroup ? String(body.muscleGroup).trim() : null,
  });
  return Response.json({ exerciseId }, { status: 201 });
});
