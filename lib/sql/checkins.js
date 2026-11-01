// Gym attendance. The rules (active membership, no double check-in) live
// in the trg_checkin_requires_membership trigger, not here.
import { query } from '../db.js';
import { HttpError } from '../http.js';

export async function checkIn(memberId) {
  const { rows } = await query(
    'INSERT INTO check_ins (member_id) VALUES ($1) RETURNING check_in_id, check_in_time',
    [memberId]
  );
  return rows[0];
}

export async function checkOut(memberId) {
  const { rows } = await query(
    `UPDATE check_ins SET check_out_time = now()
     WHERE member_id = $1 AND check_out_time IS NULL AND check_in_time::date = current_date
     RETURNING check_in_id, check_in_time, check_out_time`,
    [memberId]
  );
  if (!rows[0]) throw new HttpError(400, 'You are not checked in');
  return rows[0];
}

export async function recentCheckIns(memberId, limit = 10) {
  const { rows } = await query(
    `SELECT check_in_id, check_in_time, check_out_time,
            ROUND(EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 60) AS minutes
     FROM check_ins
     WHERE member_id = $1
     ORDER BY check_in_time DESC
     LIMIT $2`,
    [memberId, limit]
  );
  return rows;
}
