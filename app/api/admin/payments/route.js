import { route, HttpError } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { listPayments } from '@/lib/sql/payments.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/admin/payments?from=2026-10-01&to=2026-10-31&method=upi
export const GET = route(async (request) => {
  await requireRole('admin');
  const params = request.nextUrl.searchParams;
  const from = params.get('from') || null;
  const to = params.get('to') || null;
  const method = params.get('method') || null;
  if ((from && !DATE.test(from)) || (to && !DATE.test(to))) throw new HttpError(400, 'Dates must be YYYY-MM-DD');
  if (method && !['cash', 'card', 'upi'].includes(method)) throw new HttpError(400, 'Unknown payment method');
  return Response.json(await listPayments({ from, to, method }));
});
