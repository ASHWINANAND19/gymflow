import { route, toId, HttpError } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { isTrainerOfMember } from '@/lib/sql/trainers.js';
import { getMemberDashboard } from '@/lib/sql/memberships.js';
import { recentCheckIns } from '@/lib/sql/checkins.js';
import { listSessions, weeklyVolume, personalRecords } from '@/lib/mongo/workouts.js';
import { getActivePlan } from '@/lib/mongo/plans.js';

export const GET = route(async (request, { params }) => {
  const { userId } = await requireRole('trainer');
  const memberId = toId((await params).id, 'member id');
  if (!(await isTrainerOfMember(userId, memberId))) {
    throw new HttpError(403, 'This member is not one of your clients');
  }

  const [dashboard, checkIns, sessions, weekly, records, plan] = await Promise.all([
    getMemberDashboard(memberId),
    recentCheckIns(memberId, 10),
    listSessions(memberId, 10),
    weeklyVolume(memberId, 8),
    personalRecords(memberId),
    getActivePlan(memberId),
  ]);
  return Response.json({ ...dashboard, checkIns, sessions, weekly, records, plan });
});
