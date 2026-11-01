-- =============================================================
-- 05_views.sql
-- Saved queries used by the dashboards.
-- =============================================================

-- Members whose membership covers today, with plan and trainer
CREATE OR REPLACE VIEW v_active_members AS
SELECT
    u.user_id                     AS member_id,
    u.full_name,
    u.email,
    u.phone,
    p.name                        AS plan_name,
    ms.start_date,
    ms.end_date,
    ms.end_date - current_date    AS days_left,
    tu.full_name                  AS trainer_name
FROM memberships ms
JOIN users u  ON u.user_id = ms.member_id
JOIN plans p  ON p.plan_id = ms.plan_id
LEFT JOIN trainer_assignments ta ON ta.member_id = ms.member_id AND ta.ended_on IS NULL
LEFT JOIN users tu ON tu.user_id = ta.trainer_id
WHERE ms.status = 'active'
  AND current_date BETWEEN ms.start_date AND ms.end_date
  AND u.is_active;


-- Revenue per month per plan
CREATE OR REPLACE VIEW v_monthly_revenue AS
SELECT
    date_trunc('month', pay.paid_at)::date AS month,
    p.name                                 AS plan_name,
    COUNT(*)                               AS payments,
    SUM(pay.amount)                        AS revenue
FROM payments pay
JOIN memberships ms ON ms.membership_id = pay.membership_id
JOIN plans p        ON p.plan_id = ms.plan_id
GROUP BY date_trunc('month', pay.paid_at), p.name;


-- How full each trainer's client list is
CREATE OR REPLACE VIEW v_trainer_workload AS
SELECT
    t.trainer_id,
    u.full_name,
    t.specialization,
    t.max_clients,
    COUNT(ta.assignment_id)                                    AS active_clients,
    ROUND(100.0 * COUNT(ta.assignment_id) / t.max_clients, 1)  AS utilisation_pct
FROM trainers t
JOIN users u ON u.user_id = t.trainer_id
LEFT JOIN trainer_assignments ta ON ta.trainer_id = t.trainer_id AND ta.ended_on IS NULL
GROUP BY t.trainer_id, u.full_name, t.specialization, t.max_clients;


-- Gym visits per member over the last 30 days
CREATE OR REPLACE VIEW v_member_attendance_30d AS
SELECT
    m.member_id,
    u.full_name,
    COUNT(c.check_in_id)  AS visits_30d,
    MAX(c.check_in_time)  AS last_visit
FROM members m
JOIN users u ON u.user_id = m.member_id
LEFT JOIN check_ins c
       ON c.member_id = m.member_id
      AND c.check_in_time >= now() - INTERVAL '30 days'
GROUP BY m.member_id, u.full_name;
