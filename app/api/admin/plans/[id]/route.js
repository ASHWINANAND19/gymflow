import { route, readJson, toId } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { toNumber } from '@/lib/validate.js';
import { updatePlan, deletePlan } from '@/lib/sql/plans.js';

const has = (body, key) => body[key] !== undefined && body[key] !== null && body[key] !== '';

export const PATCH = route(async (request, { params }) => {
  await requireRole('admin');
  const planId = toId((await params).id, 'plan id');
  const body = await readJson(request);
  await updatePlan(planId, {
    name: has(body, 'name') ? String(body.name).trim() : undefined,
    durationDays: has(body, 'durationDays')
      ? toNumber(body.durationDays, 'Duration', { min: 1, max: 730, integer: true }) : undefined,
    price: has(body, 'price') ? toNumber(body.price, 'Price', { min: 1, max: 1000000 }) : undefined,
    includesTrainer: typeof body.includesTrainer === 'boolean' ? body.includesTrainer : undefined,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    description: has(body, 'description') ? String(body.description).slice(0, 200) : undefined,
  });
  return Response.json({ ok: true });
});

export const DELETE = route(async (request, { params }) => {
  await requireRole('admin');
  await deletePlan(toId((await params).id, 'plan id'));
  return Response.json({ ok: true });
});
