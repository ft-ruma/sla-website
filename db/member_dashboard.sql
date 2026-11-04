-- The member dashboard: what a signed-in athlete or coach sees and changes.
--
-- Apply after member_auth.sql and migration 015 of the registration portal,
-- as the database owner:
--   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f website/db/member_dashboard.sql
--
-- Same rules as member_auth.sql: web_reader can only call these functions,
-- and every function checks the session itself. A member acts on a record
-- only when its email is the signed-in email and it is pending or verified.
-- A coach sees personal details only of athletes whose link with them is
-- current and accepted; past athletes are counted, never shown.
-- Safe to run again.

-- ---------------------------------------------------------------------
-- Helpers (not callable by web_reader)
-- ---------------------------------------------------------------------

-- The signed-in member owns this pending or verified record.
CREATE OR REPLACE FUNCTION web_auth.owns(p_token_hash text, p_slaa_id text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM web_auth.session s
    JOIN web_auth.users u ON u.id = s.user_id
    JOIN slaa.member m ON lower(trim(m.email)) = u.email
    WHERE s.token_hash = p_token_hash AND s.expires_at > now() AND u.status = 'active'
      AND m.slaa_id = p_slaa_id AND m.status IN ('pending', 'verified'));
$$;

CREATE OR REPLACE FUNCTION web_auth.display_name(p_slaa_id text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(trim(name_with_initials), ''), full_name) FROM slaa.member WHERE slaa_id = p_slaa_id;
$$;

-- Live place in an event: among verified athletes of the same gender with a
-- mark (and the athlete themselves), how many are better, plus one.
CREATE OR REPLACE FUNCTION web_auth.event_rank(p_athlete text, p_event text)
RETURNS TABLE (place int, field int) LANGUAGE sql STABLE AS $$
  WITH me AS (
    SELECT m.gender, slaa.mark_value(e.personal_best) AS v
    FROM slaa.athlete_event e JOIN slaa.member m ON m.slaa_id = e.athlete_id
    WHERE e.athlete_id = p_athlete AND e.event_code = p_event),
  others AS (
    SELECT slaa.mark_value(e.personal_best) AS v
    FROM slaa.athlete_event e JOIN slaa.member m ON m.slaa_id = e.athlete_id, me
    WHERE e.event_code = p_event AND m.gender = me.gender AND e.personal_best IS NOT NULL
      AND (m.status = 'verified' OR m.slaa_id = p_athlete))
  SELECT (1 + count(*) FILTER (WHERE CASE WHEN slaa.higher_is_better(p_event) THEN o.v > me.v ELSE o.v < me.v END))::int,
         count(*)::int
  FROM others o, me WHERE me.v IS NOT NULL;
$$;

-- The marks of everyone the athlete is ranked against (verified athletes of
-- the same gender, and the athlete), as bare numbers for the dashboard's
-- field chart. No names or IDs; at most 500 marks.
CREATE OR REPLACE FUNCTION web_auth.event_field(p_athlete text, p_event text)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(jsonb_agg(v ORDER BY v), '[]'::jsonb) FROM (
    SELECT slaa.mark_value(e.personal_best) AS v
    FROM slaa.athlete_event e JOIN slaa.member m ON m.slaa_id = e.athlete_id
    WHERE e.event_code = p_event AND e.personal_best IS NOT NULL
      AND m.gender = (SELECT gender FROM slaa.member WHERE slaa_id = p_athlete)
      AND (m.status = 'verified' OR m.slaa_id = p_athlete)
    ORDER BY 1 LIMIT 500) f WHERE v IS NOT NULL;
$$;

-- An athlete's events, personal bests and live place.
CREATE OR REPLACE FUNCTION web_auth.events_of(p_athlete text)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'code', e.event_code, 'priority', e.rank, 'pb', e.personal_best, 'pb_year', e.pb_year,
      'competition', e.pb_competition, 'verified', e.pb_verified_at IS NOT NULL,
      'place', CASE WHEN e.personal_best IS NOT NULL THEN r.place END,
      'field', CASE WHEN e.personal_best IS NOT NULL THEN r.field END,
      'dist', CASE WHEN e.personal_best IS NOT NULL THEN web_auth.event_field(p_athlete, e.event_code) END)
    ORDER BY e.rank), '[]'::jsonb)
  FROM slaa.athlete_event e
  LEFT JOIN LATERAL web_auth.event_rank(p_athlete, e.event_code) r ON true
  WHERE e.athlete_id = p_athlete;
$$;

-- What a coach sees: requests, current athletes with details, marks to check.
CREATE OR REPLACE FUNCTION web_auth.coach_view(p_coach text)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'requests', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
          'link', ac.id, 'athlete_id', ac.athlete_id, 'name', web_auth.display_name(ac.athlete_id),
          'district', m.district, 'birth_year', extract(year FROM m.date_of_birth)::int,
          'replaces', ac.replaces_current, 'since', ac.created_at::date,
          'events', (SELECT string_agg(ev.name, ', ' ORDER BY e.rank) FROM slaa.athlete_event e
                     JOIN slaa.event ev ON ev.code = e.event_code WHERE e.athlete_id = ac.athlete_id))
        ORDER BY ac.created_at)
      FROM slaa.athlete_coach ac JOIN slaa.member m ON m.slaa_id = ac.athlete_id
      WHERE ac.coach_id = p_coach AND ac.relationship_type = 'CURRENT' AND NOT ac.is_approved_by_coach
        AND ac.review_status <> 'rejected' AND m.status IN ('pending', 'verified')), '[]'::jsonb),
    'athletes', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
          'link', ac.id, 'athlete_id', m.slaa_id, 'full_name', m.full_name, 'name', web_auth.display_name(m.slaa_id),
          'date_of_birth', m.date_of_birth, 'gender', m.gender, 'district', m.district,
          'phone', m.phone, 'email', m.email, 'status', m.status, 'primary', ac.is_primary,
          'school', a.academic_institution, 'start_year', ac.start_year,
          'events', web_auth.events_of(m.slaa_id))
        ORDER BY m.full_name)
      FROM slaa.athlete_coach ac JOIN slaa.member m ON m.slaa_id = ac.athlete_id
      JOIN slaa.athlete a ON a.slaa_id = m.slaa_id
      WHERE ac.coach_id = p_coach AND ac.relationship_type = 'CURRENT' AND ac.is_approved_by_coach
        AND ac.review_status <> 'rejected' AND m.status IN ('pending', 'verified')), '[]'::jsonb),
    'marks', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
          'id', s.id, 'athlete_id', s.athlete_id, 'name', web_auth.display_name(s.athlete_id),
          'event', s.event_code, 'mark', s.mark, 'year', s.mark_year, 'competition', s.competition,
          'previous', (SELECT personal_best FROM slaa.athlete_event e WHERE e.athlete_id = s.athlete_id AND e.event_code = s.event_code))
        ORDER BY s.created_at)
      FROM slaa.pb_submission s
      WHERE s.status = 'pending' AND EXISTS (
        SELECT 1 FROM slaa.athlete_coach ac WHERE ac.athlete_id = s.athlete_id AND ac.coach_id = p_coach
          AND ac.relationship_type = 'CURRENT' AND ac.is_approved_by_coach AND ac.review_status <> 'rejected')), '[]'::jsonb),
    -- Former athletes: name, years and marks only. Their contact details and
    -- date of birth stay hidden once they have moved on.
    'past', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
          'link', ac.id, 'athlete_id', m.slaa_id, 'name', web_auth.display_name(m.slaa_id),
          'district', m.district, 'start_year', ac.start_year, 'end_year', ac.end_year,
          'confirmed', ac.is_approved_by_coach, 'listed_by', ac.listed_by,
          'events', (SELECT coalesce(jsonb_agg(jsonb_build_object('code', e.event_code, 'pb', e.personal_best,
                       'verified', e.pb_verified_at IS NOT NULL) ORDER BY e.rank), '[]'::jsonb)
                     FROM slaa.athlete_event e WHERE e.athlete_id = m.slaa_id))
        ORDER BY ac.is_approved_by_coach, ac.end_year DESC NULLS LAST, m.full_name)
      FROM slaa.athlete_coach ac JOIN slaa.member m ON m.slaa_id = ac.athlete_id
      WHERE ac.coach_id = p_coach AND ac.relationship_type = 'PAST' AND ac.review_status <> 'rejected'
        AND m.status IN ('pending', 'verified')), '[]'::jsonb),
    'past_count', (SELECT count(*)::int FROM slaa.athlete_coach ac
                   WHERE ac.coach_id = p_coach AND ac.relationship_type = 'PAST' AND ac.review_status <> 'rejected'));
$$;

-- A current, accepted link between this coach and this athlete.
CREATE OR REPLACE FUNCTION web_auth.coaches(p_coach text, p_athlete text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM slaa.athlete_coach ac
    WHERE ac.coach_id = p_coach AND ac.athlete_id = p_athlete AND ac.relationship_type = 'CURRENT'
      AND ac.is_approved_by_coach AND ac.review_status <> 'rejected');
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA web_auth FROM PUBLIC;

-- ---------------------------------------------------------------------
-- 1. The dashboard for one of the member's records (NULL if not theirs).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.member_dashboard(p_token_hash text, p_slaa_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
DECLARE
  is_coach boolean := EXISTS (SELECT 1 FROM coach WHERE slaa_id = p_slaa_id);
  is_athlete boolean := EXISTS (SELECT 1 FROM athlete WHERE slaa_id = p_slaa_id);
BEGIN
  IF NOT owns(p_token_hash, p_slaa_id) THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'slaa_id', p_slaa_id,
    'is_athlete', is_athlete,
    'is_coach', is_coach,
    'privacy', (SELECT privacy FROM member WHERE slaa_id = p_slaa_id),
    'events', CASE WHEN is_athlete THEN events_of(p_slaa_id) ELSE '[]'::jsonb END,
    'marks', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'event', s.event_code, 'mark', s.mark, 'year', s.mark_year, 'competition', s.competition,
        'status', s.status, 'note', s.note, 'at', s.created_at::date) ORDER BY s.created_at DESC)
      -- approved marks are kept for the PB-over-time chart
      FROM (SELECT * FROM pb_submission WHERE athlete_id = p_slaa_id
              AND (status IN ('pending', 'approved') OR decided_at > now() - interval '30 days')
            ORDER BY created_at DESC LIMIT 60) s), '[]'::jsonb),
    'coaches', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'link', ac.id, 'coach_id', ac.coach_id, 'name', display_name(ac.coach_id), 'district', cm.district,
        'state', CASE WHEN ac.relationship_type = 'PAST' THEN 'past' WHEN ac.is_approved_by_coach THEN 'active' ELSE 'awaiting' END,
        'primary', ac.is_primary, 'replaces', ac.replaces_current, 'start_year', ac.start_year, 'end_year', ac.end_year)
        ORDER BY (ac.relationship_type = 'CURRENT') DESC, ac.is_approved_by_coach DESC, ac.created_at DESC)
      FROM athlete_coach ac JOIN member cm ON cm.slaa_id = ac.coach_id
      WHERE ac.athlete_id = p_slaa_id AND ac.review_status <> 'rejected' AND cm.status <> 'merged'), '[]'::jsonb),
    'coach', CASE WHEN is_coach THEN coach_view(p_slaa_id) END);
END $$;

-- ---------------------------------------------------------------------
-- 2. Privacy switches. Unknown keys are dropped.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.member_set_privacy(p_token_hash text, p_slaa_id text, p_privacy jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
BEGIN
  IF NOT owns(p_token_hash, p_slaa_id) OR jsonb_typeof(p_privacy) <> 'object' THEN
    RETURN false;
  END IF;
  UPDATE member SET privacy = (
    SELECT coalesce(jsonb_object_agg(k, true), '{}'::jsonb)
    FROM unnest(array['hide_profile', 'hide_club', 'hide_birth_year', 'hide_results']) k
    WHERE coalesce((p_privacy ->> k)::boolean, false))
  WHERE slaa_id = p_slaa_id;
  RETURN true;
END $$;

-- ---------------------------------------------------------------------
-- 3. Personal bests sent for the coach to check.
--    result: 'ok' | 'invalid' | 'limited'. A new mark for the same event
--    replaces one still waiting. At most 20 a day.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.member_submit_mark(
  p_token_hash text, p_slaa_id text, p_event text, p_mark text, p_year int, p_competition text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
BEGIN
  IF NOT owns(p_token_hash, p_slaa_id) OR NOT EXISTS (SELECT 1 FROM athlete WHERE slaa_id = p_slaa_id)
     OR NOT EXISTS (SELECT 1 FROM event WHERE code = p_event)
     OR coalesce(p_mark, '') !~ '^[0-9]{1,5}([:.][0-9]{1,2}){0,2}$'
     OR p_year IS NULL OR p_year < 1950 OR p_year > extract(year FROM now())::int
     OR length(coalesce(p_competition, '')) > 120 THEN
    RETURN 'invalid';
  END IF;
  IF (SELECT count(*) FROM pb_submission WHERE athlete_id = p_slaa_id AND created_at > now() - interval '1 day') >= 20 THEN
    RETURN 'limited';
  END IF;
  UPDATE pb_submission SET status = 'withdrawn', decided_at = now(), decided_by = 'athlete'
  WHERE athlete_id = p_slaa_id AND event_code = p_event AND status = 'pending';
  INSERT INTO pb_submission (athlete_id, event_code, mark, mark_year, competition)
  VALUES (p_slaa_id, p_event, p_mark, p_year, nullif(trim(p_competition), ''));
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION web.member_withdraw_mark(p_token_hash text, p_slaa_id text, p_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
BEGIN
  IF NOT owns(p_token_hash, p_slaa_id) THEN
    RETURN false;
  END IF;
  UPDATE pb_submission SET status = 'withdrawn', decided_at = now(), decided_by = 'athlete'
  WHERE id = p_id AND athlete_id = p_slaa_id AND status = 'pending';
  RETURN FOUND;
END $$;

-- ---------------------------------------------------------------------
-- 4. Choosing a coach. Search lists registered coaches (pending or
--    verified) by name or SLA ID; a request waits for the coach to accept.
--    p_replace: "Change coach" (others become past coaches on acceptance)
--    or "Add a coach". result: 'ok' | 'unknown' | 'self' | 'already' |
--    'limited'.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.member_coach_search(p_token_hash text, p_query text)
RETURNS TABLE (slaa_id text, name text, district text, disciplines text[], verified boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
DECLARE
  q text := trim(coalesce(p_query, ''));
BEGIN
  IF length(q) < 2 OR length(q) > 80 OR NOT EXISTS (
       SELECT 1 FROM session s WHERE s.token_hash = p_token_hash AND s.expires_at > now()) THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT m.slaa_id, display_name(m.slaa_id), m.district, c.disciplines, m.status = 'verified'
    FROM coach c JOIN member m ON m.slaa_id = c.slaa_id
    WHERE m.status IN ('pending', 'verified')
      AND (m.full_name ILIKE '%' || replace(replace(q, '%', ''), '_', '') || '%'
           OR m.name_with_initials ILIKE '%' || replace(replace(q, '%', ''), '_', '') || '%'
           OR m.slaa_id = upper(q))
    ORDER BY (m.status = 'verified') DESC, m.full_name
    LIMIT 20;
END $$;

CREATE OR REPLACE FUNCTION web.member_request_coach(p_token_hash text, p_slaa_id text, p_coach text, p_replace boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
DECLARE
  v_coach text := upper(trim(coalesce(p_coach, '')));
  v_id bigint;
BEGIN
  IF NOT owns(p_token_hash, p_slaa_id) OR NOT EXISTS (SELECT 1 FROM athlete WHERE slaa_id = p_slaa_id) THEN
    RETURN 'unknown';
  END IF;
  IF v_coach = p_slaa_id THEN
    RETURN 'self';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM coach c JOIN member m USING (slaa_id) WHERE c.slaa_id = v_coach AND m.status IN ('pending', 'verified')) THEN
    RETURN 'unknown';
  END IF;
  IF EXISTS (SELECT 1 FROM athlete_coach WHERE athlete_id = p_slaa_id AND coach_id = v_coach
             AND relationship_type = 'CURRENT' AND review_status <> 'rejected') THEN
    RETURN 'already';
  END IF;
  IF (SELECT count(*) FROM athlete_coach WHERE athlete_id = p_slaa_id AND relationship_type = 'CURRENT'
        AND NOT is_approved_by_coach AND review_status <> 'rejected') >= 3 THEN
    RETURN 'limited';
  END IF;
  -- an earlier declined or withdrawn request to the same coach is reused
  DELETE FROM athlete_coach WHERE athlete_id = p_slaa_id AND coach_id = v_coach
    AND relationship_type = 'CURRENT' AND review_status = 'rejected';
  INSERT INTO athlete_coach (athlete_id, coach_id, relationship_type, is_primary, start_year,
                             is_approved_by_coach, listed_by, is_confirmed_by_athlete, replaces_current)
  VALUES (p_slaa_id, v_coach, 'CURRENT', false, extract(year FROM now())::int, false, 'athlete', true, coalesce(p_replace, false))
  RETURNING id INTO v_id;
  INSERT INTO audit_log (actor, action, slaa_id, details)
  VALUES ('member', 'coach_requested', p_slaa_id, jsonb_build_object('coach', v_coach, 'link', v_id, 'replaces', coalesce(p_replace, false)));
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION web.member_cancel_coach_request(p_token_hash text, p_slaa_id text, p_link bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
BEGIN
  IF NOT owns(p_token_hash, p_slaa_id) THEN
    RETURN false;
  END IF;
  UPDATE athlete_coach SET review_status = 'rejected', review_reason = 'Withdrawn by the athlete on the website',
         reviewed_by = 'athlete:' || p_slaa_id, reviewed_at = now()
  WHERE id = p_link AND athlete_id = p_slaa_id AND relationship_type = 'CURRENT'
    AND NOT is_approved_by_coach AND review_status <> 'rejected';
  RETURN FOUND;
END $$;

-- ---------------------------------------------------------------------
-- 5. The coach accepts or declines an athlete. Accepting a "Change coach"
--    request ends the athlete's other current links in the same step, so
--    the athlete is never without a coach and the old coach loses access.
--    A past link (an athlete who listed this coach as a former coach) can
--    be confirmed or declined too; it changes nothing else.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.coach_decide_link(p_token_hash text, p_coach text, p_link bigint, p_accept boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
DECLARE
  l record;
BEGIN
  IF NOT owns(p_token_hash, p_coach) OR NOT EXISTS (SELECT 1 FROM coach WHERE slaa_id = p_coach) THEN
    RETURN false;
  END IF;
  SELECT * INTO l FROM athlete_coach
  WHERE id = p_link AND coach_id = p_coach
    AND NOT is_approved_by_coach AND review_status <> 'rejected'
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF NOT p_accept THEN
    UPDATE athlete_coach SET review_status = 'rejected', review_reason = 'Declined by the coach on the website',
           reviewed_by = 'coach:' || p_coach, reviewed_at = now(), coach_decided_at = now()
    WHERE id = p_link;
  ELSIF l.relationship_type = 'PAST' THEN
    UPDATE athlete_coach SET is_approved_by_coach = true, review_status = 'approved',
           reviewed_by = 'coach:' || p_coach, reviewed_at = now(), coach_decided_at = now()
    WHERE id = p_link;
  ELSE
    PERFORM 1 FROM athlete_coach WHERE athlete_id = l.athlete_id FOR UPDATE;
    IF l.replaces_current THEN
      UPDATE athlete_coach SET relationship_type = 'PAST', is_primary = false,
             end_year = greatest(coalesce(start_year, 0), extract(year FROM now())::int)
      WHERE athlete_id = l.athlete_id AND id <> p_link AND relationship_type = 'CURRENT' AND is_approved_by_coach;
    END IF;
    UPDATE athlete_coach SET is_primary = false
    WHERE athlete_id = l.athlete_id AND relationship_type = 'CURRENT' AND is_primary
      AND (l.replaces_current OR NOT is_approved_by_coach);
    UPDATE athlete_coach SET is_approved_by_coach = true, review_status = 'approved',
           reviewed_by = 'coach:' || p_coach, reviewed_at = now(), coach_decided_at = now(),
           is_primary = NOT EXISTS (SELECT 1 FROM athlete_coach x WHERE x.athlete_id = l.athlete_id
                                    AND x.id <> p_link AND x.relationship_type = 'CURRENT' AND x.is_primary)
    WHERE id = p_link;
  END IF;
  INSERT INTO audit_log (actor, action, slaa_id, details)
  VALUES ('coach:' || p_coach, CASE WHEN p_accept THEN 'coach_link_accepted' ELSE 'coach_link_declined' END,
          l.athlete_id, jsonb_build_object('link', p_link, 'replaces', l.replaces_current));
  RETURN true;
END $$;

-- ---------------------------------------------------------------------
-- 6. The coach checks marks: a mark the athlete sent, or a personal best
--    already on the registration. Only for current, accepted athletes.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.coach_decide_mark(p_token_hash text, p_coach text, p_id bigint, p_accept boolean, p_note text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
DECLARE
  s record;
BEGIN
  IF NOT owns(p_token_hash, p_coach) THEN
    RETURN false;
  END IF;
  SELECT * INTO s FROM pb_submission WHERE id = p_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND OR NOT coaches(p_coach, s.athlete_id) THEN
    RETURN false;
  END IF;
  UPDATE pb_submission SET status = CASE WHEN p_accept THEN 'approved' ELSE 'rejected' END,
         decided_by = 'coach:' || p_coach, decided_at = now(), note = left(nullif(trim(p_note), ''), 500)
  WHERE id = p_id;
  IF p_accept THEN
    UPDATE athlete_event SET personal_best = s.mark, pb_year = s.mark_year, pb_competition = s.competition,
           pb_verified_by = 'coach:' || p_coach, pb_verified_at = now()
    WHERE athlete_id = s.athlete_id AND event_code = s.event_code;
    IF NOT FOUND THEN
      IF (SELECT count(*) FROM athlete_event WHERE athlete_id = s.athlete_id) >= 20 THEN
        RETURN false;
      END IF;
      INSERT INTO athlete_event (athlete_id, event_code, rank, personal_best, pb_year, pb_competition, pb_verified_by, pb_verified_at)
      VALUES (s.athlete_id, s.event_code,
              coalesce((SELECT max(rank) FROM athlete_event WHERE athlete_id = s.athlete_id), 0) + 1,
              s.mark, s.mark_year, s.competition, 'coach:' || p_coach, now());
    END IF;
  END IF;
  INSERT INTO audit_log (actor, action, slaa_id, details)
  VALUES ('coach:' || p_coach, CASE WHEN p_accept THEN 'mark_approved' ELSE 'mark_rejected' END, s.athlete_id,
          jsonb_build_object('submission', p_id, 'event', s.event_code, 'mark', s.mark));
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION web.coach_confirm_pb(p_token_hash text, p_coach text, p_athlete text, p_event text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
BEGIN
  IF NOT owns(p_token_hash, p_coach) OR NOT coaches(p_coach, p_athlete) THEN
    RETURN false;
  END IF;
  UPDATE athlete_event SET pb_verified_by = 'coach:' || p_coach, pb_verified_at = now()
  WHERE athlete_id = p_athlete AND event_code = p_event AND personal_best IS NOT NULL AND pb_verified_at IS NULL;
  IF FOUND THEN
    INSERT INTO audit_log (actor, action, slaa_id, details)
    VALUES ('coach:' || p_coach, 'pb_confirmed', p_athlete, jsonb_build_object('event', p_event));
  END IF;
  RETURN FOUND;
END $$;

-- ---------------------------------------------------------------------
-- 7. Public directory: verified athletes and coaches, honouring each
--    member's privacy switches. Under-18s get a shortened name, no club
--    and no marks.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.directory_search(
  p_query text, p_role text, p_district text, p_limit int, p_offset int)
RETURNS TABLE (slaa_id text, display_name text, is_minor boolean, birth_year int, gender char(1),
               district text, is_athlete boolean, is_coach boolean, club_name text, events jsonb, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
  WITH p AS (
    SELECT m.slaa_id, m.privacy, m.gender, m.district,
           coalesce(nullif(trim(m.name_with_initials), ''), m.full_name) AS name, m.full_name,
           age(current_date, m.date_of_birth) >= interval '18 years' AS adult,
           extract(year FROM m.date_of_birth)::int AS birth_year,
           a.slaa_id IS NOT NULL AS is_athlete, c.slaa_id IS NOT NULL AS is_coach,
           CASE a.club_category
             WHEN 'ARMY' THEN 'Sri Lanka Army Sports Club' WHEN 'NAVY' THEN 'Sri Lanka Navy Sports Club'
             WHEN 'AIR_FORCE' THEN 'Sri Lanka Air Force Sports Club' WHEN 'POLICE' THEN 'Sri Lanka Police Sports Club'
             WHEN 'CIVIL_CLUB' THEN cl.name END AS club_name
    FROM member m
    LEFT JOIN athlete a ON a.slaa_id = m.slaa_id
    LEFT JOIN coach c ON c.slaa_id = m.slaa_id
    LEFT JOIN club cl ON cl.club_id = a.club_id AND cl.status = 'verified'
    WHERE m.status = 'verified' AND (a.slaa_id IS NOT NULL OR c.slaa_id IS NOT NULL)
      AND NOT coalesce((m.privacy ->> 'hide_profile')::boolean, false)
      AND (coalesce(p_role, '') = '' OR (p_role = 'athlete' AND a.slaa_id IS NOT NULL) OR (p_role = 'coach' AND c.slaa_id IS NOT NULL))
      AND (coalesce(p_district, '') = '' OR m.district = p_district)
      AND (length(trim(coalesce(p_query, ''))) < 2
           OR m.slaa_id = upper(trim(p_query))
           -- adults by name; minors only by SLA ID, since their names are not public
           OR (age(current_date, m.date_of_birth) >= interval '18 years'
               AND (m.full_name ILIKE '%' || replace(replace(trim(p_query), '%', ''), '_', '') || '%'
                    OR m.name_with_initials ILIKE '%' || replace(replace(trim(p_query), '%', ''), '_', '') || '%'))))
  SELECT p.slaa_id,
         CASE WHEN adult THEN name ELSE regexp_replace(name, '(\S)\S*$', '\1*****') END,
         NOT adult,
         CASE WHEN coalesce((privacy ->> 'hide_birth_year')::boolean, false) THEN NULL ELSE birth_year END,
         gender, district, is_athlete, is_coach,
         CASE WHEN adult AND NOT coalesce((privacy ->> 'hide_club')::boolean, false) THEN club_name END,
         CASE WHEN coalesce((privacy ->> 'hide_results')::boolean, false) THEN '[]'::jsonb
              ELSE coalesce((SELECT jsonb_agg(jsonb_build_object('code', e.event_code,
                     'pb', CASE WHEN adult THEN e.personal_best END,
                     'verified', e.pb_verified_at IS NOT NULL) ORDER BY e.rank)
                   FROM athlete_event e WHERE e.athlete_id = p.slaa_id), '[]'::jsonb) END,
         count(*) OVER ()
  FROM p
  ORDER BY name, slaa_id
  LIMIT least(greatest(coalesce(p_limit, 24), 1), 60) OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION
  web.member_dashboard(text, text),
  web.member_set_privacy(text, text, jsonb),
  web.member_submit_mark(text, text, text, text, int, text),
  web.member_withdraw_mark(text, text, bigint),
  web.member_coach_search(text, text),
  web.member_request_coach(text, text, text, boolean),
  web.member_cancel_coach_request(text, text, bigint),
  web.coach_decide_link(text, text, bigint, boolean),
  web.coach_decide_mark(text, text, bigint, boolean, text),
  web.coach_confirm_pb(text, text, text, text),
  web.directory_search(text, text, text, int, int)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  web.member_dashboard(text, text),
  web.member_set_privacy(text, text, jsonb),
  web.member_submit_mark(text, text, text, text, int, text),
  web.member_withdraw_mark(text, text, bigint),
  web.member_coach_search(text, text),
  web.member_request_coach(text, text, text, boolean),
  web.member_cancel_coach_request(text, text, bigint),
  web.coach_decide_link(text, text, bigint, boolean),
  web.coach_decide_mark(text, text, bigint, boolean, text),
  web.coach_confirm_pb(text, text, text, text),
  web.directory_search(text, text, text, int, int)
TO web_reader;
