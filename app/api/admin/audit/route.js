import { route } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { listAudit } from '@/lib/sql/audit.js';

export const GET = route(async () => {
  await requireRole('admin');
  return Response.json(await listAudit(150));
});
