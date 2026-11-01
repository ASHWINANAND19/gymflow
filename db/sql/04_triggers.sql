-- =============================================================
-- 04_triggers.sql
-- Business rules enforced inside the database.
-- =============================================================

-- Rule 1: a member can only check in on a day covered by an active
-- membership, and cannot check in twice without checking out.
CREATE OR REPLACE FUNCTION fn_checkin_requires_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM memberships
        WHERE member_id = NEW.member_id
          AND status = 'active'
          AND NEW.check_in_time::date BETWEEN start_date AND end_date
    ) THEN
        RAISE EXCEPTION 'Check-in refused: no active membership for this date';
    END IF;

    IF EXISTS (
        SELECT 1 FROM check_ins
        WHERE member_id = NEW.member_id
          AND check_out_time IS NULL
          AND check_in_time::date = NEW.check_in_time::date
    ) THEN
        RAISE EXCEPTION 'Check-in refused: already checked in';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_checkin_requires_membership
BEFORE INSERT ON check_ins
FOR EACH ROW EXECUTE FUNCTION fn_checkin_requires_membership();


-- Rule 2: a trainer cannot take more clients than max_clients, and only
-- members whose current plan includes a trainer can be assigned one.
CREATE OR REPLACE FUNCTION fn_trainer_assignment_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_active INT;
    v_max    INT;
BEGIN
    SELECT max_clients INTO v_max FROM trainers WHERE trainer_id = NEW.trainer_id;

    SELECT COUNT(*) INTO v_active
    FROM trainer_assignments
    WHERE trainer_id = NEW.trainer_id AND ended_on IS NULL;

    IF v_active >= v_max THEN
        RAISE EXCEPTION 'Trainer is at full capacity (% of % clients)', v_active, v_max;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM memberships ms
        JOIN plans p ON p.plan_id = ms.plan_id
        WHERE ms.member_id = NEW.member_id
          AND ms.status = 'active'
          AND current_date BETWEEN ms.start_date AND ms.end_date
          AND p.includes_trainer
    ) THEN
        RAISE EXCEPTION 'Member''s current plan does not include a personal trainer';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trainer_assignment_rules
BEFORE INSERT ON trainer_assignments
FOR EACH ROW EXECUTE FUNCTION fn_trainer_assignment_rules();


-- Rule 3: every new membership and every status change is written to
-- audit_log automatically.
CREATE OR REPLACE FUNCTION fn_audit_memberships()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, action, record_id, details)
        VALUES ('memberships', 'INSERT', NEW.membership_id,
                jsonb_build_object('member_id', NEW.member_id,
                                   'plan_id', NEW.plan_id,
                                   'start_date', NEW.start_date,
                                   'end_date', NEW.end_date));
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO audit_log (table_name, action, record_id, details)
        VALUES ('memberships', 'UPDATE', NEW.membership_id,
                jsonb_build_object('member_id', NEW.member_id,
                                   'old_status', OLD.status,
                                   'new_status', NEW.status));
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_memberships
AFTER INSERT OR UPDATE ON memberships
FOR EACH ROW EXECUTE FUNCTION fn_audit_memberships();
