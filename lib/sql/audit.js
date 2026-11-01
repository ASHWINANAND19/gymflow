// Audit trail written by the trg_audit_memberships trigger
import { query } from '../db.js';

export async function listAudit(limit = 100) {
  const { rows } = await query(
    `SELECT a.log_id, a.table_name, a.action, a.record_id, a.details, a.changed_at,
            u.full_name AS member_name
     FROM audit_log a
     LEFT JOIN users u ON u.user_id = (a.details->>'member_id')::int
     ORDER BY a.changed_at DESC, a.log_id DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}
