-- =============================================================
-- 01_schema.sql
-- Tables, primary keys, foreign keys and constraints.
--
-- users is the supertype; members and trainers are subtypes that
-- share the same id (ISA / specialization).
-- =============================================================

CREATE TABLE users (
    user_id        SERIAL PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL CHECK (length(trim(full_name)) >= 2),
    email          VARCHAR(255) NOT NULL UNIQUE
                   CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    phone          VARCHAR(10) CHECK (phone ~ '^[0-9]{10}$'),
    password_hash  TEXT NOT NULL,
    role           VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'trainer', 'member')),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE members (
    member_id      INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    date_of_birth  DATE NOT NULL,
    gender         VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    height_cm      NUMERIC(5,1) CHECK (height_cm BETWEEN 100 AND 250),
    joined_on      DATE NOT NULL DEFAULT current_date
);

CREATE TABLE trainers (
    trainer_id     INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    specialization VARCHAR(50) NOT NULL,
    max_clients    INT NOT NULL DEFAULT 10 CHECK (max_clients BETWEEN 1 AND 30)
);

CREATE TABLE plans (
    plan_id          SERIAL PRIMARY KEY,
    name             VARCHAR(50) NOT NULL UNIQUE,
    duration_days    INT NOT NULL CHECK (duration_days > 0),
    price            NUMERIC(10,2) NOT NULL CHECK (price > 0),
    includes_trainer BOOLEAN NOT NULL DEFAULT FALSE,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE
);

-- A membership is valid from start_date to end_date (both inclusive)
CREATE TABLE memberships (
    membership_id  SERIAL PRIMARY KEY,
    member_id      INT NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    plan_id        INT NOT NULL REFERENCES plans(plan_id) ON DELETE RESTRICT,
    start_date     DATE NOT NULL,
    end_date       DATE NOT NULL,
    status         VARCHAR(10) NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_membership_dates CHECK (end_date > start_date)
);

-- Exactly one payment per membership (UNIQUE makes this 1:1)
CREATE TABLE payments (
    payment_id     SERIAL PRIMARY KEY,
    membership_id  INT NOT NULL UNIQUE REFERENCES memberships(membership_id) ON DELETE CASCADE,
    amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    method         VARCHAR(10) NOT NULL CHECK (method IN ('cash', 'card', 'upi')),
    paid_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ended_on IS NULL means the assignment is still running
CREATE TABLE trainer_assignments (
    assignment_id  SERIAL PRIMARY KEY,
    member_id      INT NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    trainer_id     INT NOT NULL REFERENCES trainers(trainer_id) ON DELETE CASCADE,
    assigned_on    DATE NOT NULL DEFAULT current_date,
    ended_on       DATE,
    CONSTRAINT chk_assignment_dates CHECK (ended_on IS NULL OR ended_on >= assigned_on)
);

CREATE TABLE check_ins (
    check_in_id    SERIAL PRIMARY KEY,
    member_id      INT NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    check_in_time  TIMESTAMPTZ NOT NULL DEFAULT now(),
    check_out_time TIMESTAMPTZ,
    CONSTRAINT chk_checkout_after_checkin
        CHECK (check_out_time IS NULL OR check_out_time > check_in_time)
);

-- Exercise catalog. Workout logs in MongoDB refer to these ids.
CREATE TABLE exercises (
    exercise_id    SERIAL PRIMARY KEY,
    name           VARCHAR(60) NOT NULL UNIQUE,
    category       VARCHAR(12) NOT NULL CHECK (category IN ('strength', 'cardio', 'flexibility')),
    muscle_group   VARCHAR(30)
);

-- Written only by triggers
CREATE TABLE audit_log (
    log_id         SERIAL PRIMARY KEY,
    table_name     VARCHAR(30) NOT NULL,
    action         VARCHAR(10) NOT NULL,
    record_id      INT NOT NULL,
    details        JSONB,
    changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
