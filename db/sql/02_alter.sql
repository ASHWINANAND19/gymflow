-- =============================================================
-- 02_alter.sql
-- Changes made after the first version of the schema.
-- =============================================================

-- Members must be at least 14 years old
ALTER TABLE members
    ADD CONSTRAINT chk_member_min_age
    CHECK (date_of_birth <= current_date - INTERVAL '14 years');

-- Track when each user last logged in
ALTER TABLE users ADD COLUMN last_login TIMESTAMPTZ;

-- Short marketing description shown on the plans page
ALTER TABLE plans ADD COLUMN description VARCHAR(200);
