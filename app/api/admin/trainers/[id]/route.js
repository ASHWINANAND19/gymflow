import { route, readJson, toId } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { toNumber } from '@/lib/validate.js';
import { updateCapacity } from '@/lib/sql/trainers.js';

export const PATCH = route(async (request, { params }) => {
  await requireRole('admin');
  const trainerId = toId((await params).id, 'trainer id');
  const body = await readJson(request);
  await updateCapacity(trainerId, toNumber(body.maxClients, 'Max clients', { min: 1, max: 30, integer: true }));
  return Response.json({ ok: true });
});
