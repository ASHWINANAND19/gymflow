import { route, readJson, HttpError } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { requireFields, toNumber } from '@/lib/validate.js';
import { createTrainer } from '@/lib/sql/users.js';
import { listWorkload, listAssignments, listMembersNeedingTrainer } from '@/lib/sql/trainers.js';

export const GET = route(async () => {
  await requireRole('admin');
  const [workload, assignments, needingTrainer] = await Promise.all([
    listWorkload(),
    listAssignments(),
    listMembersNeedingTrainer(),
  ]);
  return Response.json({ workload, assignments, needingTrainer });
});

export const POST = route(async (request) => {
  await requireRole('admin');
  const body = await readJson(request);
  requireFields(body, ['fullName', 'email', 'password', 'specialization']);
  if (String(body.password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  const trainerId = await createTrainer({
    fullName: String(body.fullName),
    email: String(body.email),
    phone: body.phone ? String(body.phone).trim() : null,
    password: String(body.password),
    specialization: String(body.specialization),
    maxClients: toNumber(body.maxClients ?? 10, 'Max clients', { min: 1, max: 30, integer: true }),
  });
  return Response.json({ trainerId }, { status: 201 });
});
