-- =============================================================
-- 06_indexes.sql
-- Indexes for the queries the app runs most often.
-- (Primary keys and UNIQUE columns already get an index automatically.)
-- =============================================================

-- "What is this member's current membership?" (dashboard, check-in trigger)
CREATE INDEX idx_memberships_member_end ON memberships (member_id, end_date);

-- Attendance history and the 30-day attendance view
CREATE INDEX idx_checkins_member_time ON check_ins (member_id, check_in_time);

-- Revenue reports filter and group payments by date
CREATE INDEX idx_payments_paid_at ON payments (paid_at);

-- Login and admin screens filter users by role
CREATE INDEX idx_users_role ON users (role);

-- Partial unique index: a member can have only ONE running trainer
-- assignment, but any number of finished ones.
CREATE UNIQUE INDEX uq_one_active_trainer_per_member
    ON trainer_assignments (member_id)
    WHERE ended_on IS NULL;
