import { route } from '@/lib/http.js';
import { requireRole } from '@/lib/session.js';
import { weeklyVolume, personalRecords } from '@/lib/mongo/workouts.js';

// Both numbers are computed by MongoDB aggregation pipelines
export const GET = route(async () => {
  const { userId } = await requireRole('member');
  const [weekly, records] = await Promise.all([weeklyVolume(userId, 8), personalRecords(userId)]);
  return Response.json({ weekly, records });
});
