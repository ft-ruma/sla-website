-- Privacy-safe views for the public website (plan section 4.3).
--
-- Apply to the registry database as the database owner:
--   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f website/db/public_views.sql
-- Then give the website role a password and use it in WEB_DATABASE_URL:
--   ALTER ROLE web_reader LOGIN PASSWORD '...';
--
-- The views run with the owner's rights, so web_reader can read them but not
-- the tables underneath. NIC, exact date of birth, phone, email, address and
-- guardian details are never selected here. Safe to run again.

CREATE SCHEMA IF NOT EXISTS web;

-- Clubs, schools, universities and institutions that SLA has verified.
CREATE OR REPLACE VIEW web.club_v AS
SELECT c.club_id, c.name, c.category, c.district,
       (SELECT count(*) FROM slaa.athlete a JOIN slaa.member m USING (slaa_id)
         WHERE a.club_id = c.club_id AND m.status = 'verified')::int AS athlete_count
FROM slaa.club c
WHERE c.status = 'verified';

-- Verified people. Under-18s get a shortened name and no club. Members'
-- privacy switches (slaa.member.privacy, migration 015) can leave them out,
-- or hide their club or birth year.
CREATE OR REPLACE VIEW web.member_v AS
WITH p AS (
  SELECT m.slaa_id,
         coalesce(nullif(trim(m.name_with_initials), ''), m.full_name) AS name,
         age(current_date, m.date_of_birth) >= interval '18 years' AS adult,
         extract(year FROM m.date_of_birth)::int AS birth_year,
         m.gender, m.district, m.privacy,
         a.slaa_id IS NOT NULL AS is_athlete,
         c.slaa_id IS NOT NULL AS is_coach,
         CASE a.club_category
           WHEN 'ARMY' THEN 'Sri Lanka Army Sports Club'
           WHEN 'NAVY' THEN 'Sri Lanka Navy Sports Club'
           WHEN 'AIR_FORCE' THEN 'Sri Lanka Air Force Sports Club'
           WHEN 'POLICE' THEN 'Sri Lanka Police Sports Club'
           WHEN 'CIVIL_CLUB' THEN cl.name
         END AS club_name
  FROM slaa.member m
  LEFT JOIN slaa.athlete a ON a.slaa_id = m.slaa_id
  LEFT JOIN slaa.coach c ON c.slaa_id = m.slaa_id
  LEFT JOIN slaa.club cl ON cl.club_id = a.club_id AND cl.status = 'verified'
  WHERE m.status = 'verified' AND (a.slaa_id IS NOT NULL OR c.slaa_id IS NOT NULL)
    AND NOT coalesce((m.privacy ->> 'hide_profile')::boolean, false)
)
SELECT slaa_id,
       CASE WHEN adult THEN name
            ELSE regexp_replace(name, '(\S)\S*$', '\1*****') END AS display_name,
       NOT adult AS is_minor,
       CASE WHEN coalesce((privacy ->> 'hide_birth_year')::boolean, false) THEN NULL ELSE birth_year END AS birth_year,
       gender, district, is_athlete, is_coach,
       CASE WHEN adult AND NOT coalesce((privacy ->> 'hide_club')::boolean, false) THEN club_name END AS club_name
FROM p;

DO $$ BEGIN
  CREATE ROLE web_reader NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT USAGE ON SCHEMA web TO web_reader;
GRANT SELECT ON web.club_v, web.member_v TO web_reader;
REVOKE ALL ON SCHEMA slaa FROM web_reader;
