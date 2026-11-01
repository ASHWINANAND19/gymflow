import { route, readJson, toId, HttpError } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { memberExists, setMemberActive } from '@/lib/sql/members.js';
import { getMemberDashboard, listMembershipHistory } from '@/lib/sql/memberships.js';
import { recentCheckIns } from '@/lib/sql/checkins.js';
import { listSessions } from '@/lib/mongo/workouts.js';

export const GET = route(async (request, { params }) => {
  await requireRole('admin');
  const memberId = toId((await params).id, 'member id');
  if (!(await memberExists(memberId))) throw new HttpError(404, 'Member not found');

  const [dashboard, history, checkIns, sessions] = await Promise.all([
    getMemberDashboard(memberId),
    listMembershipHistory(memberId),
    recentCheckIns(memberId, 10),
    listSessions(memberId, 5),
  ]);
  return Response.json({ memberId, ...dashboard, history, checkIns, sessions });
});

// Activate / deactivate a member account (members are never hard-deleted)
export const PATCH = route(async (request, { params }) => {
  await requireRole('admin');
  const memberId = toId((await params).id, 'member id');
  const body = await readJson(request);
  if (typeof body.isActive !== 'boolean') throw new HttpError(400, 'isActive must be true or false');
  await setMemberActive(memberId, body.isActive);
  return Response.json({ ok: true });
});
