-- =============================================================
-- 03_functions.sql
-- Stored functions and procedures.
-- =============================================================

-- Days of paid membership a member has left (0 if none).
-- Renewals are stacked, so this counts to the end of the last one.
CREATE OR REPLACE FUNCTION days_remaining(p_member_id INT)
RETURNS INT
LANGUAGE sql STABLE
AS $$
    SELECT COALESCE(MAX(end_date) - current_date, 0)
    FROM memberships
    WHERE member_id = p_member_id
      AND status = 'active'
      AND end_date >= current_date;
$$;


-- Marks every active membership whose end date has passed as expired.
-- Returns how many rows were changed. Called when the admin dashboard loads.
CREATE OR REPLACE FUNCTION expire_memberships()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE memberships
    SET status = 'expired'
    WHERE status = 'active'
      AND end_date < current_date;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


-- Buys (or renews) a plan for a member: inserts the membership and its
-- payment. The caller runs this inside a transaction, so if the payment
-- insert fails the membership insert is rolled back too.
CREATE OR REPLACE PROCEDURE purchase_membership(
    p_member_id INT,
    p_plan_id INT,
    p_method VARCHAR,
    INOUT p_membership_id INT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_duration INT;
    v_price    NUMERIC(10,2);
    v_start    DATE;
BEGIN
    -- Lock the member row so two purchases for the same member cannot
    -- run at the same time and compute the same start date
    PERFORM 1
    FROM members m
    JOIN users u ON u.user_id = m.member_id
    WHERE m.member_id = p_member_id AND u.is_active
    FOR UPDATE OF m;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Member not found or inactive';
    END IF;

    SELECT duration_days, price INTO v_duration, v_price
    FROM plans
    WHERE plan_id = p_plan_id AND is_active;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Plan is not available';
    END IF;

    -- A renewal starts the day after the last active membership ends
    SELECT GREATEST(current_date, COALESCE(MAX(end_date) + 1, current_date))
    INTO v_start
    FROM memberships
    WHERE member_id = p_member_id AND status = 'active';

    INSERT INTO memberships (member_id, plan_id, start_date, end_date)
    VALUES (p_member_id, p_plan_id, v_start, v_start + v_duration - 1)
    RETURNING membership_id INTO p_membership_id;

    INSERT INTO payments (membership_id, amount, method)
    VALUES (p_membership_id, v_price, p_method);
END;
$$;
