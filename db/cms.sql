-- Website content management: news, competitions and results, rankings,
-- records, pages, downloads, settings and uploaded files, edited in the
-- website's /admin panel by website editors.
--
-- Apply as the database owner, after member_auth.sql:
--   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f website/db/cms.sql
-- then create the first owner and copy the built-in content:
--   cd website && npm run cms:bootstrap
--
-- Editors are separate from the registration portal's staff: they cannot see
-- members or the register. As everywhere on the website, web_reader cannot
-- touch these tables; it can only call the functions below, which check the
-- editor's session themselves. Passwords arrive already hashed (scrypt), and
-- session tokens as HMACs. Safe to run again.

CREATE SCHEMA IF NOT EXISTS web;
CREATE SCHEMA IF NOT EXISTS web_cms;
REVOKE ALL ON SCHEMA web_cms FROM PUBLIC;

-- ---------------------------------------------------------------------
-- Editors and their sessions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS web_cms.editor (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE CHECK (email = lower(trim(email)) AND email LIKE '%_@_%'),
  display_name  text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
  role          text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor')),
  password_hash text NOT NULL CHECK (password_hash ~ '^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$'),
  must_change_password boolean NOT NULL DEFAULT true,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE IF NOT EXISTS web_cms.session (
  token_hash text PRIMARY KEY,
  editor_id  uuid NOT NULL REFERENCES web_cms.editor(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS web_cms.failure (
  email text NOT NULL,
  at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cms_failure_idx ON web_cms.failure (email, at);

-- ---------------------------------------------------------------------
-- Content. Each item is stored as the JSON document the website renders
-- (see src/content/types.ts), with a few columns for sorting and publishing.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS web_cms.item (
  kind       text NOT NULL CHECK (kind IN ('news', 'competition', 'ranking', 'record', 'page', 'download', 'setting')),
  key        text NOT NULL CHECK (key ~ '^[a-z0-9][a-z0-9_-]{0,119}$'),
  doc        jsonb NOT NULL CHECK (jsonb_typeof(doc) IN ('object', 'array', 'boolean', 'string', 'number')),
  published  boolean NOT NULL DEFAULT true,
  sort_date  date,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  PRIMARY KEY (kind, key)
);
CREATE INDEX IF NOT EXISTS cms_item_list_idx ON web_cms.item (kind, published, sort_date DESC);

-- Photos and PDFs. Public once uploaded: editors only upload material meant
-- for the website. Images up to 5 MB, PDFs up to 15 MB.
CREATE TABLE IF NOT EXISTS web_cms.file (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes   int NOT NULL,
  data         bytea NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   text NOT NULL,
  CHECK (size_bytes = octet_length(data)),
  CHECK (size_bytes BETWEEN 1 AND CASE WHEN content_type = 'application/pdf' THEN 15728640 ELSE 5242880 END)
);

CREATE TABLE IF NOT EXISTS web_cms.audit (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at      timestamptz NOT NULL DEFAULT now(),
  actor   text NOT NULL,
  action  text NOT NULL,
  target  text,
  details jsonb NOT NULL DEFAULT '{}'
);

-- ---------------------------------------------------------------------
-- Helpers (not callable by web_reader)
-- ---------------------------------------------------------------------

-- The signed-in, active editor for this session, or nothing.
CREATE OR REPLACE FUNCTION web_cms.editor_of(p_token_hash text)
RETURNS web_cms.editor LANGUAGE sql STABLE AS $$
  SELECT e.* FROM web_cms.session s JOIN web_cms.editor e ON e.id = s.editor_id
  WHERE s.token_hash = p_token_hash AND s.expires_at > now() AND e.active;
$$;

CREATE OR REPLACE FUNCTION web_cms.locked(p_email text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT count(*) >= 10 FROM web_cms.failure WHERE email = p_email AND at > now() - interval '1 hour';
$$;

CREATE OR REPLACE FUNCTION web_cms.log(p_actor text, p_action text, p_target text, p_details jsonb DEFAULT '{}')
RETURNS void LANGUAGE sql AS $$
  INSERT INTO web_cms.audit (actor, action, target, details) VALUES (p_actor, p_action, p_target, coalesce(p_details, '{}'));
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA web_cms FROM PUBLIC;

-- ---------------------------------------------------------------------
-- 1. Reading content. Visitors get published items; a signed-in editor
--    (p_token_hash) also gets drafts. Returns
--    [{key, doc, published, updated_at, updated_by}], newest first.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.cms_items(p_kind text, p_token_hash text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'key', i.key, 'doc', i.doc, 'published', i.published,
      'updated_at', i.updated_at, 'updated_by', i.updated_by)
    ORDER BY i.sort_order, i.sort_date DESC NULLS LAST, i.key), '[]'::jsonb)
  FROM item i
  WHERE i.kind = p_kind
    AND (i.published OR (p_token_hash IS NOT NULL AND (SELECT id FROM editor_of(p_token_hash)) IS NOT NULL));
$$;

-- A file for /api/cms/file/<id>.
CREATE OR REPLACE FUNCTION web.cms_file(p_id uuid)
RETURNS TABLE (name text, content_type text, data bytea, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
  SELECT name, content_type, data, created_at FROM file WHERE id = p_id;
$$;

-- ---------------------------------------------------------------------
-- 2. Signing in. Same scheme as member sign-in: the website hashes the
--    password with the stored salt and the database compares.
--    Ten wrong passwords in an hour lock the email for the rest of it.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.cms_password_salt(p_email text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
  SELECT split_part(password_hash, '$', 2) FROM editor
  WHERE email = lower(trim(p_email)) AND active AND NOT locked(lower(trim(p_email)));
$$;

CREATE OR REPLACE FUNCTION web.cms_sign_in(p_email text, p_derived text, p_token_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_id uuid;
BEGIN
  DELETE FROM failure WHERE at < now() - interval '1 day';
  DELETE FROM session WHERE expires_at < now();
  IF locked(v_email) THEN
    RETURN false;
  END IF;
  SELECT id INTO v_id FROM editor WHERE email = v_email AND active AND split_part(password_hash, '$', 3) = p_derived;
  IF v_id IS NULL THEN
    INSERT INTO failure (email) VALUES (v_email);
    RETURN false;
  END IF;
  INSERT INTO session (token_hash, editor_id, expires_at) VALUES (p_token_hash, v_id, now() + interval '12 hours');
  UPDATE editor SET last_login_at = now() WHERE id = v_id;
  PERFORM log(v_email, 'sign_in', NULL);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION web.cms_session(p_token_hash text)
RETURNS TABLE (id uuid, email text, display_name text, role text, must_change_password boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
  SELECT e.id, e.email, e.display_name, e.role, e.must_change_password FROM editor_of(p_token_hash) e;
$$;

CREATE OR REPLACE FUNCTION web.cms_sign_out(p_token_hash text)
RETURNS void LANGUAGE sql SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
  DELETE FROM session WHERE token_hash = p_token_hash;
$$;

-- Change your own password; signs out your other sessions.
CREATE OR REPLACE FUNCTION web.cms_change_password(p_token_hash text, p_password_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
DECLARE
  me editor;
BEGIN
  SELECT * INTO me FROM editor_of(p_token_hash);
  IF me.id IS NULL THEN
    RETURN false;
  END IF;
  UPDATE editor SET password_hash = p_password_hash, must_change_password = false WHERE id = me.id;
  DELETE FROM session WHERE editor_id = me.id AND token_hash <> p_token_hash;
  PERFORM log(me.email, 'change_password', me.email);
  RETURN true;
END $$;

-- ---------------------------------------------------------------------
-- 3. Saving and deleting content (any active editor who has set their own
--    password). Every change is in the audit log.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.cms_save(
  p_token_hash text, p_kind text, p_key text, p_doc jsonb, p_published boolean, p_sort_date date, p_sort_order int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
DECLARE
  me editor;
BEGIN
  SELECT * INTO me FROM editor_of(p_token_hash);
  IF me.id IS NULL OR me.must_change_password THEN
    RETURN false;
  END IF;
  INSERT INTO item (kind, key, doc, published, sort_date, sort_order, updated_at, updated_by)
  VALUES (p_kind, p_key, p_doc, coalesce(p_published, true), p_sort_date, coalesce(p_sort_order, 0), now(), me.email)
  ON CONFLICT (kind, key) DO UPDATE SET doc = excluded.doc, published = excluded.published,
    sort_date = excluded.sort_date, sort_order = excluded.sort_order, updated_at = now(), updated_by = me.email;
  PERFORM log(me.email, 'save_' || p_kind, p_key, jsonb_build_object('published', coalesce(p_published, true)));
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION web.cms_delete(p_token_hash text, p_kind text, p_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
DECLARE
  me editor;
BEGIN
  SELECT * INTO me FROM editor_of(p_token_hash);
  IF me.id IS NULL OR me.must_change_password THEN
    RETURN false;
  END IF;
  DELETE FROM item WHERE kind = p_kind AND key = p_key;
  IF FOUND THEN
    PERFORM log(me.email, 'delete_' || p_kind, p_key);
  END IF;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION web.cms_upload(p_token_hash text, p_name text, p_content_type text, p_data bytea)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
DECLARE
  me editor;
  v_id uuid;
BEGIN
  SELECT * INTO me FROM editor_of(p_token_hash);
  IF me.id IS NULL OR me.must_change_password THEN
    RETURN NULL;
  END IF;
  INSERT INTO file (name, content_type, size_bytes, data, created_by)
  VALUES (left(p_name, 200), p_content_type, octet_length(p_data), p_data, me.email)
  RETURNING id INTO v_id;
  PERFORM log(me.email, 'upload', v_id::text, jsonb_build_object('name', left(p_name, 200), 'type', p_content_type));
  RETURN v_id;
END $$;

-- Recent changes, for the admin dashboard.
CREATE OR REPLACE FUNCTION web.cms_audit(p_token_hash text, p_limit int DEFAULT 30)
RETURNS TABLE (at timestamptz, actor text, action text, target text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
  SELECT a.at, a.actor, a.action, a.target FROM audit a
  WHERE (SELECT id FROM editor_of(p_token_hash)) IS NOT NULL
  ORDER BY a.at DESC, a.id DESC LIMIT least(greatest(coalesce(p_limit, 30), 1), 200);
$$;

-- ---------------------------------------------------------------------
-- 4. Editor accounts (owners only). New and reset accounts must choose
--    their own password at first sign-in. Owners cannot lock themselves out.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION web.cms_editors(p_token_hash text)
RETURNS TABLE (id uuid, email text, display_name text, role text, active boolean, must_change_password boolean, last_login_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
  SELECT e.id, e.email, e.display_name, e.role, e.active, e.must_change_password, e.last_login_at
  FROM editor e WHERE (SELECT role FROM editor_of(p_token_hash)) = 'owner'
  ORDER BY e.role, e.display_name;
$$;

CREATE OR REPLACE FUNCTION web.cms_editor_create(p_token_hash text, p_email text, p_name text, p_role text, p_password_hash text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
DECLARE
  me editor;
BEGIN
  SELECT * INTO me FROM editor_of(p_token_hash);
  IF me.id IS NULL OR me.role <> 'owner' OR me.must_change_password THEN
    RETURN 'forbidden';
  END IF;
  IF EXISTS (SELECT 1 FROM editor WHERE email = lower(trim(p_email))) THEN
    RETURN 'exists';
  END IF;
  INSERT INTO editor (email, display_name, role, password_hash, must_change_password)
  VALUES (lower(trim(p_email)), trim(p_name), p_role, p_password_hash, true);
  PERFORM log(me.email, 'create_editor', lower(trim(p_email)), jsonb_build_object('role', p_role));
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION web.cms_editor_update(p_token_hash text, p_id uuid, p_role text, p_active boolean, p_password_hash text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = web_cms, pg_temp AS $$
DECLARE
  me editor;
  them editor;
BEGIN
  SELECT * INTO me FROM editor_of(p_token_hash);
  IF me.id IS NULL OR me.role <> 'owner' OR me.must_change_password THEN
    RETURN 'forbidden';
  END IF;
  SELECT * INTO them FROM editor WHERE id = p_id FOR UPDATE;
  IF them.id IS NULL THEN
    RETURN 'missing';
  END IF;
  IF them.id = me.id AND ((p_role IS NOT NULL AND p_role <> 'owner') OR p_active IS FALSE) THEN
    RETURN 'self';
  END IF;
  UPDATE editor SET role = coalesce(p_role, role), active = coalesce(p_active, active),
         password_hash = coalesce(p_password_hash, password_hash),
         must_change_password = must_change_password OR p_password_hash IS NOT NULL
  WHERE id = p_id;
  IF p_active IS FALSE OR p_password_hash IS NOT NULL THEN
    DELETE FROM session WHERE editor_id = p_id;
  END IF;
  PERFORM log(me.email, 'update_editor', them.email,
    jsonb_build_object('role', p_role, 'active', p_active, 'password_reset', p_password_hash IS NOT NULL));
  RETURN 'ok';
END $$;

-- ---------------------------------------------------------------------
-- Access for the website's login
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE ROLE web_reader NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

REVOKE ALL ON FUNCTION
  web.cms_items(text, text), web.cms_file(uuid),
  web.cms_password_salt(text), web.cms_sign_in(text, text, text), web.cms_session(text), web.cms_sign_out(text),
  web.cms_change_password(text, text),
  web.cms_save(text, text, text, jsonb, boolean, date, int), web.cms_delete(text, text, text),
  web.cms_upload(text, text, text, bytea), web.cms_audit(text, int),
  web.cms_editors(text), web.cms_editor_create(text, text, text, text, text),
  web.cms_editor_update(text, uuid, text, boolean, text)
FROM PUBLIC;

GRANT USAGE ON SCHEMA web TO web_reader;
GRANT EXECUTE ON FUNCTION
  web.cms_items(text, text), web.cms_file(uuid),
  web.cms_password_salt(text), web.cms_sign_in(text, text, text), web.cms_session(text), web.cms_sign_out(text),
  web.cms_change_password(text, text),
  web.cms_save(text, text, text, jsonb, boolean, date, int), web.cms_delete(text, text, text),
  web.cms_upload(text, text, text, bytea), web.cms_audit(text, int),
  web.cms_editors(text), web.cms_editor_create(text, text, text, text, text),
  web.cms_editor_update(text, uuid, text, boolean, text)
TO web_reader;
REVOKE ALL ON SCHEMA web_cms FROM web_reader;
