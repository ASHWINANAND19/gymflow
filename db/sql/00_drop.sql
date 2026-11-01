-- =============================================================
-- 00_drop.sql
-- Removes every GymFlow object so the schema can be rebuilt.
-- Views go first because they depend on the tables.
-- =============================================================

DROP VIEW IF EXISTS v_member_attendance_30d;
DROP VIEW IF EXISTS v_trainer_workload;
DROP VIEW IF EXISTS v_monthly_revenue;
DROP VIEW IF EXISTS v_active_members;

-- CASCADE also removes the triggers attached to these tables
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS trainer_assignments CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS trainers CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP PROCEDURE IF EXISTS purchase_membership(INT, INT, VARCHAR, INT);
DROP FUNCTION IF EXISTS days_remaining(INT);
DROP FUNCTION IF EXISTS expire_memberships();
DROP FUNCTION IF EXISTS fn_checkin_requires_membership();
DROP FUNCTION IF EXISTS fn_trainer_assignment_rules();
DROP FUNCTION IF EXISTS fn_audit_memberships();
