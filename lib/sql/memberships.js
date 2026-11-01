// Memberships and payments
import { query, withTransaction } from '../db.js';
import { HttpError } from '../http.js';

// Transaction + stored procedure: membership and payment are saved together
export async function purchaseMembership(memberId, planId, method) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'CALL purchase_membership($1, $2, $3, NULL)',
      [memberId, planId, method]
    );
    return rows[0].p_membership_id;
  });
}

const MEMBERSHIP_COLUMNS = `
  ms.membership_id, ms.start_date, ms.end_date, ms.status,
  p.plan_id, p.name AS plan_name, p.includes_trainer`;

export async function getMemberDashboard(memberId) {
  const [profile, current, upcoming, days, visits, openCheckIn, trainer] = await Promise.all([
    query(
      `SELECT u.full_name, u.email, u.phone, u.is_active, m.joined_on, m.date_of_birth, m.gender, m.height_cm
       FROM users u JOIN members m ON m.member_id = u.user_id
       WHERE u.user_id = $1`,
      [memberId]
    ),
    // The membership that covers today
    query(
      `SELECT ${MEMBERSHIP_COLUMNS}
       FROM memberships ms JOIN plans p ON p.plan_id = ms.plan_id
       WHERE ms.member_id = $1 AND ms.status = 'active'
         AND current_date BETWEEN ms.start_date AND ms.end_date
       ORDER BY ms.start_date LIMIT 1`,
      [memberId]
    ),
    // The next one that has been paid for but not started yet
    query(
      `SELECT ${MEMBERSHIP_COLUMNS}
       FROM memberships ms JOIN plans p ON p.plan_id = ms.plan_id
       WHERE ms.member_id = $1 AND ms.status = 'active' AND ms.start_date > current_date
       ORDER BY ms.start_date LIMIT 1`,
      [memberId]
    ),
    query('SELECT days_remaining($1) AS days', [memberId]),
    query(
      `SELECT COUNT(*) AS n FROM check_ins
       WHERE member_id = $1 AND check_in_time >= date_trunc('month', now())`,
      [memberId]
    ),
    query(
      `SELECT check_in_id, check_in_time FROM check_ins
       WHERE member_id = $1 AND check_out_time IS NULL AND check_in_time::date = current_date`,
      [memberId]
    ),
    query(
      `SELECT u.user_id AS trainer_id, u.full_name, u.email, t.specialization, ta.assigned_on
       FROM trainer_assignments ta
       JOIN trainers t ON t.trainer_id = ta.trainer_id
       JOIN users u ON u.user_id = ta.trainer_id
       WHERE ta.member_id = $1 AND ta.ended_on IS NULL`,
      [memberId]
    ),
  ]);

  return {
    profile: profile.rows[0] ?? null,
    current: current.rows[0] ?? null,
    upcoming: upcoming.rows[0] ?? null,
    daysRemaining: days.rows[0].days,
    visitsThisMonth: visits.rows[0].n,
    openCheckIn: openCheckIn.rows[0] ?? null,
    trainer: trainer.rows[0] ?? null,
  };
}

export async function listMembershipHistory(memberId) {
  const { rows } = await query(
    `SELECT ${MEMBERSHIP_COLUMNS}, pay.amount, pay.method, pay.paid_at
     FROM memberships ms
     JOIN plans p ON p.plan_id = ms.plan_id
     LEFT JOIN payments pay ON pay.membership_id = ms.membership_id
     WHERE ms.member_id = $1
     ORDER BY ms.start_date DESC`,
    [memberId]
  );
  return rows;
}

// Transaction: cancel the membership and, if the member no longer has a
// running plan that includes a trainer, end their trainer assignment too.
export async function cancelMembership(membershipId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE memberships SET status = 'cancelled'
       WHERE membership_id = $1 AND status = 'active'
       RETURNING member_id`,
      [membershipId]
    );
    if (!rows[0]) throw new HttpError(404, 'No active membership with that id');

    await client.query(
      `UPDATE trainer_assignments SET ended_on = current_date
       WHERE member_id = $1 AND ended_on IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM memberships ms JOIN plans p ON p.plan_id = ms.plan_id
           WHERE ms.member_id = $1 AND ms.status = 'active' AND p.includes_trainer
             AND current_date BETWEEN ms.start_date AND ms.end_date
         )`,
      [rows[0].member_id]
    );
    return rows[0].member_id;
  });
}
