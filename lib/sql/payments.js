// Payment reports for the admin
import { query } from '../db.js';

// Every filter is optional: a NULL parameter switches that filter off
const FILTERS = `
  WHERE ($1::date IS NULL OR pay.paid_at >= $1::date)
    AND ($2::date IS NULL OR pay.paid_at < $2::date + 1)
    AND ($3::text IS NULL OR pay.method = $3)`;

export async function listPayments({ from = null, to = null, method = null } = {}) {
  const params = [from || null, to || null, method || null];
  const [list, totals] = await Promise.all([
    query(
      `SELECT pay.payment_id, pay.amount, pay.method, pay.paid_at,
              u.full_name AS member_name, p.name AS plan_name
       FROM payments pay
       JOIN memberships ms ON ms.membership_id = pay.membership_id
       JOIN users u ON u.user_id = ms.member_id
       JOIN plans p ON p.plan_id = ms.plan_id
       ${FILTERS}
       ORDER BY pay.paid_at DESC
       LIMIT 200`,
      params
    ),
    query(
      `SELECT pay.method, COUNT(*) AS payments, SUM(pay.amount) AS revenue
       FROM payments pay
       ${FILTERS}
       GROUP BY pay.method
       ORDER BY revenue DESC`,
      params
    ),
  ]);
  return { payments: list.rows, totals: totals.rows };
}
