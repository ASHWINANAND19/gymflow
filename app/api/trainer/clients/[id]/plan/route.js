import { route, readJson, toId, HttpError } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { parsePlanInput } from '@/lib/validate.js';
import { isTrainerOfMember } from '@/lib/sql/trainers.js';
import { getExerciseCatalog } from '@/lib/sql/exercises.js';
import { saveActivePlan } from '@/lib/mongo/plans.js';

// Replace the client's workout plan (old one is kept as inactive history)
export const PUT = route(async (request, { params }) => {
  const { userId } = await requireRole('trainer');
  const memberId = toId((await params).id, 'member id');
  if (!(await isTrainerOfMember(userId, memberId))) {
    throw new HttpError(403, 'This member is not one of your clients');
  }
  const plan = parsePlanInput(await readJson(request), await getExerciseCatalog());
  const id = await saveActivePlan(memberId, userId, plan);
  return Response.json({ id });
});
