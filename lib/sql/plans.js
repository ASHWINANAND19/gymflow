// Membership plans
import { query } from '../db.js';
import { HttpError } from '../http.js';

export async function listPlans({ includeInactive = false } = {}) {
  const { rows } = await query(
    `SELECT p.plan_id, p.name, p.duration_days, p.price, p.includes_trainer, p.is_active, p.description,
            (SELECT COUNT(*) FROM memberships ms WHERE ms.plan_id = p.plan_id) AS times_bought
     FROM plans p
     WHERE $1 OR p.is_active
     ORDER BY p.price`,
    [includeInactive]
  );
  return rows;
}

export async function createPlan({ name, durationDays, price, includesTrainer, description }) {
  const { rows } = await query(
    `INSERT INTO plans (name, duration_days, price, includes_trainer, description)
     VALUES ($1, $2, $3, $4, $5) RETURNING plan_id`,
    [name.trim(), durationDays, price, Boolean(includesTrainer), description || null]
  );
  return rows[0].plan_id;
}

// Only the fields that are passed are changed (COALESCE keeps the rest)
export async function updatePlan(planId, { name, durationDays, price, includesTrainer, isActive, description }) {
  const { rows } = await query(
    `UPDATE plans SET
       name             = COALESCE($2, name),
       duration_days    = COALESCE($3, duration_days),
       price            = COALESCE($4, price),
       includes_trainer = COALESCE($5, includes_trainer),
       is_active        = COALESCE($6, is_active),
       description      = COALESCE($7, description)
     WHERE plan_id = $1
     RETURNING plan_id`,
    [planId, name ?? null, durationDays ?? null, price ?? null, includesTrainer ?? null, isActive ?? null, description ?? null]
  );
  if (!rows[0]) throw new HttpError(404, 'Plan not found');
}

// memberships.plan_id is ON DELETE RESTRICT, so a plan that was ever
// bought cannot be deleted; the admin deactivates it instead.
export async function deletePlan(planId) {
  try {
    const { rowCount } = await query('DELETE FROM plans WHERE plan_id = $1', [planId]);
    if (rowCount === 0) throw new HttpError(404, 'Plan not found');
  } catch (err) {
    if (err.code === '23503') {
      throw new HttpError(409, 'This plan has been bought before, so it cannot be deleted. Deactivate it instead.');
    }
    throw err;
  }
}
