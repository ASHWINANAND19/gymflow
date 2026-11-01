import { route } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { getMemberDashboard } from '@/lib/sql/memberships.js';
import { recentCheckIns } from '@/lib/sql/checkins.js';

export const GET = route(async () => {
  const { userId } = await requireRole('member');
  const [dashboard, checkIns] = await Promise.all([
    getMemberDashboard(userId),
    recentCheckIns(userId, 7),
  ]);
  return Response.json({ ...dashboard, recentCheckIns: checkIns });
});
