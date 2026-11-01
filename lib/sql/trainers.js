// Trainers, their capacity and their client assignments.
// Capacity and plan eligibility are enforced by trg_trainer_assignment_rules.
import { query } from '../db.js';
import { HttpError } from '../http.js';

export async function listWorkload() {
  const { rows } = await query(
    `SELECT w.*, u.email, u.phone
     FROM v_trainer_workload w JOIN users u ON u.user_id = w.trainer_id
     ORDER BY w.full_name`
  );
  return rows;
}

export async function getWorkload(trainerId) {
  const { rows } = await query('SELECT * FROM v_trainer_workload WHERE trainer_id = $1', [trainerId]);
  return rows[0] ?? null;
}

export async function listClients(trainerId) {
  const { rows } = await query(
    `SELECT ta.assignment_id, u.user_id AS member_id, u.full_name, u.email, u.phone, ta.assigned_on,
            am.plan_name, am.end_date, COALESCE(att.visits_30d, 0) AS visits_30d, att.last_visit
     FROM trainer_assignments ta
     JOIN users u ON u.user_id = ta.member_id
     LEFT JOIN v_active_members am ON am.member_id = ta.member_id
     LEFT JOIN v_member_attendance_30d att ON att.member_id = ta.member_id
     WHERE ta.trainer_id = $1 AND ta.ended_on IS NULL
     ORDER BY u.full_name`,
    [trainerId]
  );
  return rows;
}

export async function isTrainerOfMember(trainerId, memberId) {
  const { rows } = await query(
    `SELECT EXISTS (
       SELECT 1 FROM trainer_assignments
       WHERE trainer_id = $1 AND member_id = $2 AND ended_on IS NULL
     ) AS ok`,
    [trainerId, memberId]
  );
  return rows[0].ok;
}

// Every running assignment, for the admin trainers page
export async function listAssignments() {
  const { rows } = await query(
    `SELECT ta.assignment_id, ta.assigned_on, ta.trainer_id, t.full_name AS trainer_name,
            ta.member_id, m.full_name AS member_name
     FROM trainer_assignments ta
     JOIN users t ON t.user_id = ta.trainer_id
     JOIN users m ON m.user_id = ta.member_id
     WHERE ta.ended_on IS NULL
     ORDER BY t.full_name, m.full_name`
  );
  return rows;
}

// Members on a plan that includes a trainer but who have none yet
export async function listMembersNeedingTrainer() {
  const { rows } = await query(
    `SELECT am.member_id, am.full_name, am.plan_name
     FROM v_active_members am
     JOIN plans p ON p.name = am.plan_name
     WHERE p.includes_trainer AND am.trainer_name IS NULL
     ORDER BY am.full_name`
  );
  return rows;
}

export async function assignTrainer(memberId, trainerId) {
  const { rows } = await query(
    'INSERT INTO trainer_assignments (member_id, trainer_id) VALUES ($1, $2) RETURNING assignment_id',
    [memberId, trainerId]
  );
  return rows[0].assignment_id;
}

export async function endAssignment(assignmentId) {
  const { rows } = await query(
    `UPDATE trainer_assignments SET ended_on = current_date
     WHERE assignment_id = $1 AND ended_on IS NULL
     RETURNING assignment_id`,
    [assignmentId]
  );
  if (!rows[0]) throw new HttpError(404, 'No running assignment with that id');
}

// The new capacity cannot be lower than the number of current clients
export async function updateCapacity(trainerId, maxClients) {
  const { rows } = await query(
    `UPDATE trainers SET max_clients = $2
     WHERE trainer_id = $1
       AND $2 >= (SELECT COUNT(*) FROM trainer_assignments
                  WHERE trainer_id = $1 AND ended_on IS NULL)
     RETURNING trainer_id`,
    [trainerId, maxClients]
  );
  if (!rows[0]) {
    const exists = await query('SELECT 1 FROM trainers WHERE trainer_id = $1', [trainerId]);
    if (exists.rowCount === 0) throw new HttpError(404, 'Trainer not found');
    throw new HttpError(400, 'Capacity cannot be lower than the current number of clients');
  }
}
