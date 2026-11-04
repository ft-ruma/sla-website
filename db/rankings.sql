-- Public rankings from the national register: athletes by personal best in
-- every event on the registration form, and coaches by how their current
-- athletes perform in each event.
--
-- Apply as the database owner, after member_dashboard.sql (and migration 015
-- of the registration portal):
--   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f website/db/rankings.sql
--
-- Only verified members count. Members who chose "leave me out of the
-- directory" or "hide my events and personal bests" are left out entirely.
-- Under-18s are shown with a shortened name and no club. Safe to run again.

-- The name the public may see: initials for adults, a shortened name for minors.
CREATE OR REPLACE FUNCTION web_auth.public_name(p_slaa_id text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN age(current_date, m.date_of_birth) >= interval '18 years' THEN n
              ELSE regexp_replace(n, '(\S)\S*$', '\1*****') END
  FROM slaa.member m, LATERAL (SELECT coalesce(nullif(trim(m.name_with_initials), ''), m.full_name) AS n) x
  WHERE m.slaa_id = p_slaa_id;
$$;

-- Every visible mark in an event, with its place among the same gender.
CREATE OR REPLACE FUNCTION web_auth.ranked_marks(p_event text)
RETURNS TABLE (slaa_id text, gender char(1), value numeric, mark text, pb_year smallint, verified boolean, place int, field int)
LANGUAGE sql STABLE AS $$
  WITH v AS (
    SELECT m.slaa_id, m.gender, slaa.mark_value(e.personal_best) AS value, e.personal_best AS mark, e.pb_year,
           e.pb_verified_at IS NOT NULL AS verified
    FROM slaa.athlete_event e JOIN slaa.member m ON m.slaa_id = e.athlete_id
    WHERE e.event_code = p_event AND e.personal_best IS NOT NULL AND m.status = 'verified'
      AND NOT coalesce((m.privacy ->> 'hide_profile')::boolean, false)
      AND NOT coalesce((m.privacy ->> 'hide_results')::boolean, false))
  SELECT v.slaa_id, v.gender, v.value, v.mark, v.pb_year, v.verified,
         (rank() OVER (PARTITION BY v.gender ORDER BY CASE WHEN slaa.higher_is_better(p_event) THEN -v.value ELSE v.value END))::int,
         (count(*) OVER (PARTITION BY v.gender))::int
  FROM v WHERE v.value IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION web_auth.public_name(text), web_auth.ranked_marks(text) FROM PUBLIC;

-- Every event on the registration form, with how many athletes are ranked in it.
CREATE OR REPLACE FUNCTION web.ranking_events()
RETURNS TABLE (code text, name text, category text, ranked int)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
  SELECT e.code, e.name, e.category, (SELECT count(*)::int FROM ranked_marks(e.code))
  FROM event e ORDER BY e.sort_order;
$$;

-- Athletes in one event and gender, best first.
CREATE OR REPLACE FUNCTION web.athlete_ranking(p_event text, p_gender text, p_limit int DEFAULT 100)
RETURNS TABLE (place int, field int, slaa_id text, name text, is_minor boolean, district text, club text,
               mark text, pb_year smallint, verified boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
  SELECT r.place, r.field, r.slaa_id, public_name(r.slaa_id),
         age(current_date, m.date_of_birth) < interval '18 years', m.district,
         CASE WHEN age(current_date, m.date_of_birth) >= interval '18 years'
                   AND NOT coalesce((m.privacy ->> 'hide_club')::boolean, false) THEN
           CASE a.club_category
             WHEN 'ARMY' THEN 'Sri Lanka Army Sports Club' WHEN 'NAVY' THEN 'Sri Lanka Navy Sports Club'
             WHEN 'AIR_FORCE' THEN 'Sri Lanka Air Force Sports Club' WHEN 'POLICE' THEN 'Sri Lanka Police Sports Club'
             WHEN 'CIVIL_CLUB' THEN cl.name ELSE a.academic_institution END
         END,
         r.mark, r.pb_year, r.verified
  FROM ranked_marks(p_event) r
  JOIN member m ON m.slaa_id = r.slaa_id
  JOIN athlete a ON a.slaa_id = r.slaa_id
  LEFT JOIN club cl ON cl.club_id = a.club_id AND cl.status = 'verified'
  WHERE r.gender = upper(p_gender)
  ORDER BY r.place, public_name(r.slaa_id)
  LIMIT least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

-- Coaches in one event, by their current, accepted athletes in it. Each
-- athlete's standing within their gender is (field - place + 1) / (field + 1):
-- winning a big field is worth nearly 1, while being the only entrant is
-- worth 1/2, so a tiny field cannot top the table. Score = 60% the best
-- athlete's standing + 40% the average standing of all of them, out of 100.
CREATE OR REPLACE FUNCTION web.coach_ranking(p_event text, p_limit int DEFAULT 100)
RETURNS TABLE (place int, slaa_id text, name text, district text, athletes int, score int, avg_standing int,
               best_name text, best_mark text, best_gender char(1), best_place int, best_field int)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
  WITH links AS (
    SELECT ac.coach_id, r.*, (r.field - r.place + 1)::numeric / (r.field + 1) AS standing
    FROM ranked_marks(p_event) r
    JOIN athlete_coach ac ON ac.athlete_id = r.slaa_id AND ac.relationship_type = 'CURRENT'
      AND ac.is_approved_by_coach AND ac.review_status <> 'rejected'),
  agg AS (
    SELECT l.coach_id, count(*)::int AS athletes, max(l.standing) AS best, avg(l.standing) AS mean,
           (array_agg(l.slaa_id ORDER BY l.standing DESC, l.place))[1] AS best_id
    FROM links l GROUP BY l.coach_id),
  scored AS (
    SELECT agg.*, round(100 * (0.6 * agg.best + 0.4 * agg.mean))::int AS score
    FROM agg JOIN member cm ON cm.slaa_id = agg.coach_id
    WHERE cm.status = 'verified' AND NOT coalesce((cm.privacy ->> 'hide_profile')::boolean, false))
  SELECT (rank() OVER (ORDER BY s.score DESC, s.athletes DESC))::int, s.coach_id, public_name(s.coach_id), cm.district,
         s.athletes, s.score, round(100 * s.mean)::int,
         public_name(s.best_id), b.mark, b.gender, b.place, b.field
  FROM scored s
  JOIN member cm ON cm.slaa_id = s.coach_id
  JOIN links b ON b.coach_id = s.coach_id AND b.slaa_id = s.best_id
  ORDER BY 1, 3
  LIMIT least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

REVOKE ALL ON FUNCTION web.ranking_events(), web.athlete_ranking(text, text, int), web.coach_ranking(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION web.ranking_events(), web.athlete_ranking(text, text, int), web.coach_ranking(text, int) TO web_reader;
