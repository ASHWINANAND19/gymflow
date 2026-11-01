import { route, readJson } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { requireFields, toNumber } from '@/lib/validate.js';
import { listPlans, createPlan } from '@/lib/sql/plans.js';

export const GET = route(async () => {
  await requireRole('admin');
  return Response.json(await listPlans({ includeInactive: true }));
});

export const POST = route(async (request) => {
  await requireRole('admin');
  const body = await readJson(request);
  requireFields(body, ['name', 'durationDays', 'price']);
  const planId = await createPlan({
    name: String(body.name),
    durationDays: toNumber(body.durationDays, 'Duration', { min: 1, max: 730, integer: true }),
    price: toNumber(body.price, 'Price', { min: 1, max: 1000000 }),
    includesTrainer: Boolean(body.includesTrainer),
    description: body.description ? String(body.description).slice(0, 200) : null,
  });
  return Response.json({ planId }, { status: 201 });
});
