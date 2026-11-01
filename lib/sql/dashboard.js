// Numbers for the admin dashboard, read mostly from the views
import { query } from '../db.js';

export async function getAdminDashboard() {
  // Housekeeping first: flip memberships that ended to 'expired'
  const expired = await query('SELECT expire_memberships() AS n');

  const [active, revenue, inGym, newMembers, revenueByMonth, expiringSoon, lowAttendance, workload] =
    await Promise.all([
      query('SELECT COUNT(*) AS n FROM v_active_members'),
      query(
        `SELECT COALESCE(SUM(revenue), 0) AS total FROM v_monthly_revenue
         WHERE month = date_trunc('month', current_date)::date`
      ),
      query(
        `SELECT COUNT(*) AS n FROM check_ins
         WHERE check_out_time IS NULL AND check_in_time::date = current_date`
      ),
      query(`SELECT COUNT(*) AS n FROM members WHERE joined_on >= date_trunc('month', current_date)`),
      query(
        `SELECT to_char(month, 'Mon YYYY') AS label, SUM(revenue) AS revenue, SUM(payments) AS payments
         FROM v_monthly_revenue
         WHERE month >= (date_trunc('month', current_date) - INTERVAL '5 months')::date
         GROUP BY month
         ORDER BY month`
      ),
      // Ending within 7 days and no renewal queued
      query(
        `SELECT am.member_id, am.full_name, am.plan_name, am.end_date, am.days_left
         FROM v_active_members am
         WHERE am.end_date <= current_date + 7
           AND NOT EXISTS (
             SELECT 1 FROM memberships nxt
             WHERE nxt.member_id = am.member_id AND nxt.status = 'active'
               AND nxt.start_date > am.end_date
           )
         ORDER BY am.end_date`
      ),
      // Active members who came fewer than 8 times in 30 days
      query(
        `SELECT am.member_id, am.full_name, COUNT(c.check_in_id) AS visits_30d
         FROM v_active_members am
         LEFT JOIN check_ins c ON c.member_id = am.member_id
                              AND c.check_in_time >= now() - INTERVAL '30 days'
         GROUP BY am.member_id, am.full_name
         HAVING COUNT(c.check_in_id) < 8
         ORDER BY visits_30d
         LIMIT 8`
      ),
      query('SELECT * FROM v_trainer_workload ORDER BY utilisation_pct DESC'),
    ]);

  return {
    expiredNow: expired.rows[0].n,
    activeCount: active.rows[0].n,
    revenueThisMonth: revenue.rows[0].total,
    inGymNow: inGym.rows[0].n,
    newMembersThisMonth: newMembers.rows[0].n,
    revenueByMonth: revenueByMonth.rows,
    expiringSoon: expiringSoon.rows,
    lowAttendance: lowAttendance.rows,
    workload: workload.rows,
  };
}
