-- Member sign-in for the public website, by email, NIC or Postal ID.
--
-- web_auth.users holds one login per email address. A row is added with no
-- password as soon as the registration form saves a member with that email
-- (trigger below), so is_registered_via_form is true for those rows.
--   * First sign-in: email -> 6-digit code to that email -> set a password.
--   * Later sign-ins: email + password.
--   * Forgot password: email -> code -> set a new password.
-- One email can be on several registrations (a parent registering two
-- children). It is still one login, and the dashboard lists every record.
--
-- Members may also type their NIC or Postal ID: web.member_identify finds
-- the email on that registration, and the website shows it masked
-- (ru******23@gmail.com) before sending the code. Lookups are counted per
-- number and per connection, so nobody can try thousands of NICs. Members
-- who cannot open that email file a request with
-- web.member_email_reset_request; staff handle it in the admin panel
-- (slaa.email_reset_request, migration 014, which must be applied first).
--
-- Apply after public_views.sql, as the database owner:
--   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f website/db/member_auth.sql
--
-- web_reader still cannot read or write any table. It can only call the
-- functions in schema "web" below, which run with the owner's rights and
-- check every rule themselves. Codes, passwords and session tokens arrive
-- already hashed; plain values never reach the database. Safe to run again.
--
-- Who can sign in: an active user with at least one 'pending' or 'verified'
-- record. Suspended and merged records are never shown and never count.

CREATE SCHEMA IF NOT EXISTS web;
CREATE SCHEMA IF NOT EXISTS web_auth;
REVOKE ALL ON SCHEMA web_auth FROM PUBLIC;

-- Earlier drafts signed in with SLA ID + NIC; their tables are replaced.
DROP TABLE IF EXISTS web_auth.account, web_auth.login_code CASCADE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'web_auth' AND table_name = 'session' AND column_name = 'slaa_id') THEN
    DROP TABLE web_auth.session;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'web_auth' AND table_name = 'failure' AND column_name = 'slaa_id') THEN
    DROP TABLE web_auth.failure;
  END IF;
END $$;
DROP FUNCTION IF EXISTS web.member_code_request(text, text, text);
DROP FUNCTION IF EXISTS web.member_code_request(text, text, text, text);
DROP FUNCTION IF EXISTS web.member_code_verify(text, text, text);
DROP FUNCTION IF EXISTS web.member_code_verify(text, text, text, text);
DROP FUNCTION IF EXISTS web.member_password_salt(text);
DROP FUNCTION IF EXISTS web.member_password_sign_in(text, text, text);
DROP FUNCTION IF EXISTS web.member_session(text);
DROP FUNCTION IF EXISTS web.member_profile(text);
DROP FUNCTION IF EXISTS web.member_set_password(text, text);
DROP FUNCTION IF EXISTS web.member_sign_out(text);
DROP FUNCTION IF EXISTS web_auth.try_nic(text);
DROP FUNCTION IF EXISTS web_auth.locked(text);
DROP FUNCTION IF EXISTS web_auth.can_sign_in(text);
DROP FUNCTION IF EXISTS web_auth.open_session(text, text);

CREATE TABLE IF NOT EXISTS web_auth.users (
  id                     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email                  text NOT NULL UNIQUE CHECK (email = lower(trim(email)) AND email LIKE '%_@_%'),
  password_hash          text CHECK (password_hash ~ '^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$'),
  is_registered_via_form boolean NOT NULL DEFAULT true,
  status                 text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  password_set_at        timestamptz,
  last_sign_in_at        timestamptz
);

-- otp holds an HMAC of the code, never the code itself. A code is for first
-- setup or a password reset; once it is entered correctly, ticket_hash lets
-- the same browser set the password within 15 minutes.
CREATE TABLE IF NOT EXISTS web_auth.otp_codes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       text NOT NULL REFERENCES web_auth.users(email) ON DELETE CASCADE,
  otp         text NOT NULL,
  purpose     text NOT NULL CHECK (purpose IN ('setup', 'reset')),
  attempts    int NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  verified_at timestamptz,
  ticket_hash text UNIQUE,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_codes_email_idx ON web_auth.otp_codes (email, created_at DESC);

CREATE TABLE IF NOT EXISTS web_auth.session (
  token_hash text PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES web_auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS session_user_idx ON web_auth.session (user_id);

-- Wrong passwords and wrong codes, per email. Ten in an hour locks that
-- email out of sign-in for the rest of the hour.
CREATE TABLE IF NOT EXISTS web_auth.failure (
  email text NOT NULL,
  at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS failure_email_idx ON web_auth.failure (email, at);
CREATE INDEX IF NOT EXISTS failure_at_idx ON web_auth.failure (at);

-- NIC / Postal ID lookups and email reset requests, counted per key:
-- 'nic:…' / 'postal:…' for the number, 'client:…' / 'reset:…' for an HMAC
-- of the connection's address (the raw address is never stored).
CREATE TABLE IF NOT EXISTS web_auth.lookup (
  key text NOT NULL,
  at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lookup_key_idx ON web_auth.lookup (key, at);

-- ---------------------------------------------------------------------
-- Every email the registration form saves gets a user row with no password.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web_auth.add_user_for_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_auth, pg_temp AS $$
DECLARE
  v_email text := lower(trim(NEW.email));
BEGIN
  IF v_email LIKE '%_@_%' THEN
    INSERT INTO users (email, is_registered_via_form) VALUES (v_email, true)
    ON CONFLICT (email) DO NOTHING;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS member_adds_web_user ON slaa.member;
CREATE TRIGGER member_adds_web_user AFTER INSERT OR UPDATE OF email ON slaa.member
  FOR EACH ROW WHEN (NEW.email IS NOT NULL) EXECUTE FUNCTION web_auth.add_user_for_member();

-- members registered before this file was applied
INSERT INTO web_auth.users (email, is_registered_via_form)
SELECT DISTINCT lower(trim(email)), true FROM slaa.member WHERE lower(trim(email)) LIKE '%_@_%'
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------
-- Internal helpers (not callable by web_reader)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION web_auth.clean_email(raw text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(trim(coalesce(raw, '')));
$$;

CREATE OR REPLACE FUNCTION web_auth.locked(p_email text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT count(*) >= 10 FROM web_auth.failure WHERE email = p_email AND at > now() - interval '1 hour';
$$;

-- active user with at least one pending or verified registration
CREATE OR REPLACE FUNCTION web_auth.can_sign_in(p_email text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM web_auth.users WHERE email = p_email AND status = 'active')
     AND EXISTS (SELECT 1 FROM slaa.member
                 WHERE lower(trim(email)) = p_email AND status IN ('pending', 'verified'));
$$;

CREATE OR REPLACE FUNCTION web_auth.open_session(p_email text, p_token_hash text)
RETURNS void LANGUAGE sql AS $$
  UPDATE web_auth.users SET last_sign_in_at = now() WHERE email = p_email;
  INSERT INTO web_auth.session (token_hash, user_id, expires_at)
  SELECT p_token_hash, id, now() + interval '7 days' FROM web_auth.users WHERE email = p_email;
$$;

-- Stores a new code if the email may sign in and has not asked too often.
CREATE OR REPLACE FUNCTION web_auth.issue_code(p_email text, p_code_hash text, p_purpose text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  IF locked(p_email) OR NOT can_sign_in(p_email) THEN
    RETURN false;
  END IF;
  IF (SELECT count(*) FROM otp_codes WHERE email = p_email AND created_at > now() - interval '1 hour') >= 5 THEN
    RETURN false;
  END IF;
  -- one new code a minute; the previous one keeps working meanwhile
  IF EXISTS (SELECT 1 FROM otp_codes WHERE email = p_email AND created_at > now() - interval '60 seconds') THEN
    RETURN false;
  END IF;
  UPDATE otp_codes SET used_at = now() WHERE email = p_email AND used_at IS NULL;
  INSERT INTO otp_codes (email, otp, purpose, expires_at)
  VALUES (p_email, p_code_hash, p_purpose, now() + interval '5 minutes');
  RETURN true;
END $$;
ALTER FUNCTION web_auth.issue_code(text, text, text) SET search_path = web_auth, pg_temp;

CREATE OR REPLACE FUNCTION web_auth.prune()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM web_auth.failure WHERE at < now() - interval '1 day';
  DELETE FROM web_auth.otp_codes WHERE created_at < now() - interval '1 day';
  DELETE FROM web_auth.session WHERE expires_at < now();
  DELETE FROM web_auth.lookup WHERE at < now() - interval '1 day';
$$;

-- 'nic:200012345678' or 'postal:CMT13021' for what the member typed;
-- NULL when it is empty or contains an @ (that is an email).
-- NIC may be typed with spaces; Postal ID must be continuous (no spaces),
-- English or Sinhala letters and digits only, length not fixed (max 40).
CREATE OR REPLACE FUNCTION web_auth.id_key(raw text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v text := upper(regexp_replace(coalesce(raw, ''), '\s', '', 'g'));
BEGIN
  IF v = '' OR v LIKE '%@%' OR length(v) > 40 THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN 'nic:' || slaa.normalize_nic(v);
  EXCEPTION WHEN others THEN
    -- Postal ID must be typed continuously (no spaces), e.g. CMT13021.
    IF coalesce(raw, '') ~ '\s' THEN
      RETURN NULL;
    END IF;
    -- English letters/digits or Sinhala script only (same rule as registration).
    -- U&\0D80-\0DFF is the Sinhala block; \u escapes are not valid in plain PG strings.
    IF v !~ ('^[A-Z0-9' || U&'\0D80' || '-' || U&'\0DFF' || ']+$') THEN
      RETURN NULL;
    END IF;
    RETURN 'postal:' || v;
  END;
END $$;

-- The pending or verified registration with that NIC or Postal ID.
CREATE OR REPLACE FUNCTION web_auth.member_for_key(p_key text)
RETURNS TABLE (slaa_id text, email text) LANGUAGE sql STABLE AS $$
  SELECT m.slaa_id, lower(trim(m.email)) FROM slaa.member m
  WHERE m.status IN ('pending', 'verified')
    AND CASE WHEN p_key LIKE 'nic:%' THEN m.nic = substr(p_key, 5)
             ELSE upper(m.postal_id) = substr(p_key, 8) END
  ORDER BY (m.email IS NOT NULL) DESC, m.created_at, m.slaa_id
  LIMIT 1;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA web_auth FROM PUBLIC;

-- ---------------------------------------------------------------------
-- 1. The member types their email and presses Continue.
--    'password' -> this email has a password: ask for it.
--    'code'     -> no password yet: a setup code was stored if the email
--                  may sign in; send_to says where to email it (NULL means
--                  send nothing, and the screen still says "check your email").
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.member_login_start(p_email text, p_code_hash text)
RETURNS TABLE (next_step text, send_to text) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_auth, pg_temp AS $$
DECLARE
  v_email text := clean_email(p_email);
BEGIN
  PERFORM prune();
  IF can_sign_in(v_email) AND EXISTS (SELECT 1 FROM users WHERE email = v_email AND password_hash IS NOT NULL) THEN
    RETURN QUERY SELECT 'password'::text, NULL::text;
  ELSIF issue_code(v_email, p_code_hash, 'setup') THEN
    RETURN QUERY SELECT 'code'::text, v_email;
  ELSE
    RETURN QUERY SELECT 'code'::text, NULL::text;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. Forgot password: a reset code, if the email may sign in.
--    Returns where to send it, or NULL to send nothing.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.member_password_reset_request(p_email text, p_code_hash text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_auth, pg_temp AS $$
DECLARE
  v_email text := clean_email(p_email);
BEGIN
  PERFORM prune();
  RETURN CASE WHEN issue_code(v_email, p_code_hash, 'reset') THEN v_email END;
END $$;

-- ---------------------------------------------------------------------
-- 3. Enter the code. The newest code counts, for 5 minutes and 5 tries.
--    A correct code does not sign in yet: it unlocks setting a password.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.member_code_verify(p_email text, p_code_hash text, p_ticket_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_auth, pg_temp AS $$
DECLARE
  v_email text := clean_email(p_email);
  c record;
BEGIN
  IF locked(v_email) THEN
    RETURN false;
  END IF;
  SELECT id, otp, attempts INTO c FROM otp_codes
  WHERE email = v_email AND used_at IS NULL AND verified_at IS NULL AND expires_at > now()
  ORDER BY created_at DESC LIMIT 1
  FOR UPDATE;
  IF NOT FOUND OR c.attempts >= 5 THEN
    RETURN false;
  END IF;
  IF c.otp <> p_code_hash THEN
    UPDATE otp_codes SET attempts = attempts + 1 WHERE id = c.id;
    INSERT INTO failure (email) VALUES (v_email);
    RETURN false;
  END IF;
  IF NOT can_sign_in(v_email) THEN
    RETURN false;
  END IF;
  UPDATE otp_codes SET verified_at = now(), ticket_hash = p_ticket_hash WHERE id = c.id;
  RETURN true;
END $$;

-- ---------------------------------------------------------------------
-- 4. Set the password after a correct code. Signs out every other session
--    (a reset should lock out whoever knew the old password) and signs in.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.member_password_set(p_ticket_hash text, p_password_hash text, p_token_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_auth, pg_temp AS $$
DECLARE
  v_email text;
BEGIN
  UPDATE otp_codes SET used_at = now()
  WHERE ticket_hash = p_ticket_hash AND used_at IS NULL AND verified_at > now() - interval '15 minutes'
  RETURNING email INTO v_email;
  IF v_email IS NULL OR NOT can_sign_in(v_email) THEN
    RETURN false;
  END IF;
  UPDATE users SET password_hash = p_password_hash, password_set_at = now() WHERE email = v_email;
  DELETE FROM session WHERE user_id = (SELECT id FROM users WHERE email = v_email);
  PERFORM open_session(v_email, p_token_hash);
  RETURN true;
END $$;

-- ---------------------------------------------------------------------
-- 5. Email + password. The website hashes the password with the stored
--    salt; the database compares, so the stored hash never leaves it.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.member_password_salt(p_email text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = web_auth, pg_temp AS $$
  SELECT split_part(u.password_hash, '$', 2) FROM users u
  WHERE u.email = clean_email(p_email) AND u.password_hash IS NOT NULL
    AND can_sign_in(u.email) AND NOT locked(u.email);
$$;

CREATE OR REPLACE FUNCTION web.member_password_sign_in(p_email text, p_derived text, p_token_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_auth, pg_temp AS $$
DECLARE
  v_email text := clean_email(p_email);
BEGIN
  IF locked(v_email) OR NOT can_sign_in(v_email) THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = v_email AND split_part(password_hash, '$', 3) = p_derived) THEN
    INSERT INTO failure (email) VALUES (v_email);
    RETURN false;
  END IF;
  PERFORM open_session(v_email, p_token_hash);
  RETURN true;
END $$;

-- ---------------------------------------------------------------------
-- 5b. NIC or Postal ID instead of an email. Returns the email on that
--     registration for the website to mask and use in the steps above.
--     result: 'found' | 'no_email' | 'unknown' | 'limited'.
--     Up to 20 lookups an hour per number and 60 per connection.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.member_identify(p_identifier text, p_client_key text)
RETURNS TABLE (result text, email text) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_auth, pg_temp AS $$
DECLARE
  v_key text := id_key(p_identifier);
  v_client text := 'client:' || coalesce(nullif(p_client_key, ''), 'unknown');
  v_email text;
  v_found boolean;
BEGIN
  PERFORM prune();
  IF v_key IS NULL THEN
    RETURN QUERY SELECT 'unknown'::text, NULL::text;
    RETURN;
  END IF;
  IF (SELECT count(*) FROM lookup WHERE key = v_key AND at > now() - interval '1 hour') >= 20
     OR (SELECT count(*) FROM lookup WHERE key = v_client AND at > now() - interval '1 hour') >= 60 THEN
    RETURN QUERY SELECT 'limited'::text, NULL::text;
    RETURN;
  END IF;
  INSERT INTO lookup (key) VALUES (v_key), (v_client);
  SELECT f.email, true INTO v_email, v_found FROM member_for_key(v_key) f;
  IF v_found IS NULL THEN
    RETURN QUERY SELECT 'unknown'::text, NULL::text;
  ELSIF v_email IS NULL OR v_email NOT LIKE '%_@_%' THEN
    RETURN QUERY SELECT 'no_email'::text, NULL::text;
  ELSE
    RETURN QUERY SELECT 'found'::text, v_email;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5c. "I cannot open this email": a request for staff, who phone the
--     member before changing the email. Says nothing about whether the
--     number is registered. result: 'received' | 'invalid' | 'limited'.
--     Up to 5 requests a day per connection, 3 waiting per number.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.member_email_reset_request(
  p_identifier text, p_full_name text, p_phone text, p_new_email text, p_client_key text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_auth, pg_temp AS $$
DECLARE
  v_key text := id_key(p_identifier);
  v_email text := clean_email(p_new_email);
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[\s()-]', '', 'g');
  v_client text := 'reset:' || coalesce(nullif(p_client_key, ''), 'unknown');
  v_member text;
  v_old text;
  v_request bigint;
BEGIN
  PERFORM prune();
  IF v_key IS NULL OR length(trim(coalesce(p_full_name, ''))) NOT BETWEEN 2 AND 150
     OR v_phone !~ '^\+?[0-9]{9,15}$'
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(v_email) > 254 THEN
    RETURN 'invalid';
  END IF;
  IF (SELECT count(*) FROM lookup WHERE key = v_client AND at > now() - interval '1 day') >= 5
     OR (SELECT count(*) FROM slaa.email_reset_request r WHERE r.id_key = v_key AND r.status = 'pending') >= 3 THEN
    RETURN 'limited';
  END IF;
  INSERT INTO lookup (key) VALUES (v_client);
  SELECT f.slaa_id, f.email INTO v_member, v_old FROM member_for_key(v_key) f;
  INSERT INTO slaa.email_reset_request (identifier, id_key, slaa_id, full_name, phone, new_email, old_email)
  VALUES (upper(regexp_replace(p_identifier, '\s', '', 'g')), v_key, v_member, trim(p_full_name), v_phone, v_email, v_old)
  RETURNING id INTO v_request;
  INSERT INTO slaa.audit_log (actor, action, slaa_id, details)
  VALUES ('public', 'email_reset_requested', v_member, jsonb_build_object('request', v_request));
  RETURN 'received';
END $$;

-- ---------------------------------------------------------------------
-- 6. Signed-in user and their registrations
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.member_session(p_token_hash text)
RETURNS TABLE (email text, has_password boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = web_auth, pg_temp AS $$
  SELECT u.email, u.password_hash IS NOT NULL
  FROM session s JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = p_token_hash AND s.expires_at > now() AND can_sign_in(u.email);
$$;

-- Every pending or verified record with the user's email. Private details
-- are filled in only once SLA has verified that record.
CREATE OR REPLACE FUNCTION web.member_records(p_token_hash text)
RETURNS TABLE (
  slaa_id text, status text, display_name text,
  full_name text, name_with_initials text, date_of_birth date, gender char(1),
  district text, phone text, email text, nic char(12), postal_id text,
  is_athlete boolean, is_coach boolean, club_name text, academic_institution text,
  license_no text, license_level text, registered_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = slaa, web_auth, pg_temp AS $$
  SELECT m.slaa_id, m.status, coalesce(nullif(trim(m.name_with_initials), ''), m.full_name),
         v.full_name, v.name_with_initials, v.date_of_birth, v.gender,
         v.district, v.phone, v.email, v.nic, v.postal_id,
         ath.slaa_id IS NOT NULL, co.slaa_id IS NOT NULL,
         CASE WHEN m.status = 'verified' THEN
           CASE ath.club_category
             WHEN 'ARMY' THEN 'Sri Lanka Army Sports Club'
             WHEN 'NAVY' THEN 'Sri Lanka Navy Sports Club'
             WHEN 'AIR_FORCE' THEN 'Sri Lanka Air Force Sports Club'
             WHEN 'POLICE' THEN 'Sri Lanka Police Sports Club'
             WHEN 'CIVIL_CLUB' THEN cl.name
             WHEN 'OTHER' THEN ath.unlisted_club_name
           END
         END,
         CASE WHEN m.status = 'verified' THEN ath.academic_institution END,
         CASE WHEN m.status = 'verified' THEN co.slaa_license_no END,
         CASE WHEN m.status = 'verified' THEN co.license_level END,
         m.created_at
  FROM session s
  JOIN users u ON u.id = s.user_id
  JOIN member m ON lower(trim(m.email)) = u.email AND m.status IN ('pending', 'verified')
  LEFT JOIN LATERAL (SELECT m.* WHERE m.status = 'verified') v ON true
  LEFT JOIN athlete ath ON ath.slaa_id = m.slaa_id
  LEFT JOIN coach co ON co.slaa_id = m.slaa_id
  LEFT JOIN club cl ON cl.club_id = ath.club_id
  WHERE s.token_hash = p_token_hash AND s.expires_at > now() AND u.status = 'active'
  ORDER BY m.created_at, m.slaa_id;
$$;

-- Change the password while signed in.
CREATE OR REPLACE FUNCTION web.member_change_password(p_token_hash text, p_password_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_auth, pg_temp AS $$
BEGIN
  UPDATE users u SET password_hash = p_password_hash, password_set_at = now()
  FROM session s
  WHERE s.token_hash = p_token_hash AND s.expires_at > now() AND u.id = s.user_id AND can_sign_in(u.email);
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  DELETE FROM session s USING session me
  WHERE me.token_hash = p_token_hash AND s.user_id = me.user_id AND s.token_hash <> p_token_hash;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION web.member_sign_out(p_token_hash text)
RETURNS void LANGUAGE sql SECURITY DEFINER
SET search_path = web_auth, pg_temp AS $$
  DELETE FROM session WHERE token_hash = p_token_hash;
$$;

DO $$ BEGIN
  CREATE ROLE web_reader NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

REVOKE ALL ON FUNCTION
  web.member_identify(text, text),
  web.member_email_reset_request(text, text, text, text, text),
  web.member_login_start(text, text),
  web.member_password_reset_request(text, text),
  web.member_code_verify(text, text, text),
  web.member_password_set(text, text, text),
  web.member_password_salt(text),
  web.member_password_sign_in(text, text, text),
  web.member_session(text),
  web.member_records(text),
  web.member_change_password(text, text),
  web.member_sign_out(text)
FROM PUBLIC;

GRANT USAGE ON SCHEMA web TO web_reader;
GRANT EXECUTE ON FUNCTION
  web.member_identify(text, text),
  web.member_email_reset_request(text, text, text, text, text),
  web.member_login_start(text, text),
  web.member_password_reset_request(text, text),
  web.member_code_verify(text, text, text),
  web.member_password_set(text, text, text),
  web.member_password_salt(text),
  web.member_password_sign_in(text, text, text),
  web.member_session(text),
  web.member_records(text),
  web.member_change_password(text, text),
  web.member_sign_out(text)
TO web_reader;
REVOKE ALL ON SCHEMA web_auth FROM web_reader;
