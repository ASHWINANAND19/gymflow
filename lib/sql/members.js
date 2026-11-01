// Member search and management for the admin
import { query } from '../db.js';
import { HttpError } from '../http.js';

// status: 'active' (membership covers today), 'expired' (had one, none
// running now), 'none' (never bought a plan) or 'all'
export async function searchMembers({ q = null, status = 'all', planId = null } = {}) {
  const { rows } = await query(
    `SELECT * FROM (
       SELECT u.user_id AS member_id, u.full_name, u.email, u.phone, u.is_active, m.joined_on,
              cur.plan_id, cur.plan_name, cur.end_date,
              CASE
                WHEN cur.membership_id IS NOT NULL THEN 'active'
                WHEN EXISTS (SELECT 1 FROM memberships x WHERE x.member_id = u.user_id) THEN 'expired'
                ELSE 'none'
              END AS membership_status,
              COALESCE(att.visits_30d, 0) AS visits_30d
       FROM members m
       JOIN users u ON u.user_id = m.member_id
       LEFT JOIN LATERAL (
         SELECT ms.membership_id, p.plan_id, p.name AS plan_name, ms.end_date
         FROM memberships ms JOIN plans p ON p.plan_id = ms.plan_id
         WHERE ms.member_id = m.member_id AND ms.status = 'active'
           AND current_date BETWEEN ms.start_date AND ms.end_date
         LIMIT 1
       ) cur ON TRUE
       LEFT JOIN v_member_attendance_30d att ON att.member_id = m.member_id
       WHERE ($1::text IS NULL OR u.full_name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
     ) s
     WHERE ($2::text = 'all' OR s.membership_status = $2)
       AND ($3::int IS NULL OR s.plan_id = $3)
     ORDER BY s.full_name`,
    [q || null, status || 'all', planId || null]
  );
  return rows;
}

export async function setMemberActive(memberId, isActive) {
  const { rowCount } = await query(
    `UPDATE users SET is_active = $2 WHERE user_id = $1 AND role = 'member'`,
    [memberId, isActive]
  );
  if (rowCount === 0) throw new HttpError(404, 'Member not found');
}

export async function memberExists(memberId) {
  const { rowCount } = await query('SELECT 1 FROM members WHERE member_id = $1', [memberId]);
  return rowCount === 1;
}
