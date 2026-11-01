-- =============================================================
-- queries.sql
-- Important queries used by the app and shown in the report.
-- Run with:  psql -d gymflow -f db/sql/queries.sql
-- =============================================================

-- Q1. JOIN (4 tables): every member's current plan, trainer and days left
SELECT u.full_name AS member, p.name AS plan, ms.end_date,
       ms.end_date - current_date AS days_left,
       COALESCE(tu.full_name, '-') AS trainer
FROM memberships ms
JOIN users u  ON u.user_id = ms.member_id
JOIN plans p  ON p.plan_id = ms.plan_id
LEFT JOIN trainer_assignments ta ON ta.member_id = ms.member_id AND ta.ended_on IS NULL
LEFT JOIN users tu ON tu.user_id = ta.trainer_id
WHERE ms.status = 'active' AND current_date BETWEEN ms.start_date AND ms.end_date
ORDER BY days_left
LIMIT 10;

-- Q2. GROUP BY + HAVING: active members who visited fewer than 8 times
--     in the last 30 days (people the gym should follow up with)
SELECT am.full_name, COUNT(c.check_in_id) AS visits_30d
FROM v_active_members am
LEFT JOIN check_ins c
       ON c.member_id = am.member_id
      AND c.check_in_time >= now() - INTERVAL '30 days'
GROUP BY am.member_id, am.full_name
HAVING COUNT(c.check_in_id) < 8
ORDER BY visits_30d;

-- Q3. Aggregates: revenue, number of payments and average ticket per method
SELECT method, COUNT(*) AS payments, SUM(amount) AS revenue, ROUND(AVG(amount), 2) AS avg_amount
FROM payments
GROUP BY method
ORDER BY revenue DESC;

-- Q4. Correlated subquery: members whose total spend is above the
--     average total spend of all members
SELECT u.full_name, member_spend.total
FROM (
    SELECT ms.member_id, SUM(pay.amount) AS total
    FROM payments pay
    JOIN memberships ms ON ms.membership_id = pay.membership_id
    GROUP BY ms.member_id
) AS member_spend
JOIN users u ON u.user_id = member_spend.member_id
WHERE member_spend.total > (
    SELECT AVG(t.total) FROM (
        SELECT SUM(pay2.amount) AS total
        FROM payments pay2
        JOIN memberships ms2 ON ms2.membership_id = pay2.membership_id
        GROUP BY ms2.member_id
    ) AS t
)
ORDER BY member_spend.total DESC;

-- Q5. Subquery with NOT EXISTS: members who have never had a trainer
SELECT u.full_name, u.email
FROM members m
JOIN users u ON u.user_id = m.member_id
WHERE NOT EXISTS (SELECT 1 FROM trainer_assignments ta WHERE ta.member_id = m.member_id)
ORDER BY u.full_name
LIMIT 10;

-- Q6. Memberships expiring in the next 7 days with no renewal queued
SELECT am.full_name, am.plan_name, am.end_date
FROM v_active_members am
WHERE am.end_date <= current_date + 7
  AND NOT EXISTS (
      SELECT 1 FROM memberships nxt
      WHERE nxt.member_id = am.member_id
        AND nxt.status = 'active'
        AND nxt.start_date > am.end_date
  )
ORDER BY am.end_date;

-- Q7. Busiest hours of the day (for staffing)
SELECT EXTRACT(HOUR FROM check_in_time) AS hour, COUNT(*) AS check_ins
FROM check_ins
GROUP BY hour
ORDER BY check_ins DESC
LIMIT 5;

-- Q8. Plan popularity: how many times each plan was bought and its share
SELECT p.name, COUNT(ms.membership_id) AS times_bought,
       ROUND(100.0 * COUNT(ms.membership_id) / SUM(COUNT(ms.membership_id)) OVER (), 1) AS share_pct
FROM plans p
LEFT JOIN memberships ms ON ms.plan_id = p.plan_id
GROUP BY p.plan_id, p.name
ORDER BY times_bought DESC;

-- Q9. UPDATE: deactivate members whose last membership ended more than
--     90 days ago (run inside a transaction so it can be undone)
BEGIN;
UPDATE users u
SET is_active = FALSE
WHERE u.role = 'member'
  AND u.is_active
  AND NOT EXISTS (
      SELECT 1 FROM memberships ms
      WHERE ms.member_id = u.user_id AND ms.end_date >= current_date - 90
  );
ROLLBACK;

-- Q10. DELETE: remove an exercise from the catalog. Old workout logs in
--      MongoDB keep the exercise name, so history stays readable.
--      (Rolled back so the demo data is unchanged.)
BEGIN;
DELETE FROM exercises WHERE name = 'Jump Rope' RETURNING exercise_id, name;
ROLLBACK;

-- Q11. Index effect: the plan for a member's attendance lookup.
--      Compare with the index dropped:
--        DROP INDEX idx_checkins_member_time;  -> Seq Scan
--        CREATE INDEX idx_checkins_member_time ON check_ins (member_id, check_in_time);  -> Index/Bitmap Scan
EXPLAIN ANALYZE
SELECT * FROM check_ins
WHERE member_id = 10 AND check_in_time >= now() - INTERVAL '30 days';
