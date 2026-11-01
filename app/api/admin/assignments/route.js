import { route, readJson, toId } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { requireFields } from '@/lib/validate.js';
import { assignTrainer } from '@/lib/sql/trainers.js';

// The trg_trainer_assignment_rules trigger refuses full trainers and
// members whose plan does not include a trainer
export const POST = route(async (request) => {
  await requireRole('admin');
  const body = await readJson(request);
  requireFields(body, ['memberId', 'trainerId']);
  const assignmentId = await assignTrainer(toId(body.memberId, 'member'), toId(body.trainerId, 'trainer'));
  return Response.json({ assignmentId }, { status: 201 });
});
