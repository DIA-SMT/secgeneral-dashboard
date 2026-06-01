-- 015_supabase_keepalive.sql
-- Adds a minimal, schema-safe keepalive mechanism for Supabase Free projects.
-- Idempotent: safe to run multiple times.

BEGIN;

-- 1) ensure schema
CREATE SCHEMA IF NOT EXISTS api;

-- 2) dedicated table for heartbeat state
CREATE TABLE IF NOT EXISTS api.supabase_keepalive (
  key text PRIMARY KEY,
  last_seen timestamptz NOT NULL DEFAULT now(),
  hits bigint NOT NULL DEFAULT 0
);

-- 3) idempotent function that upserts a single row and returns a small JSON payload
CREATE OR REPLACE FUNCTION api.keepalive()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY INVOKER
AS $body$
BEGIN
  INSERT INTO api.supabase_keepalive (key, last_seen, hits)
  VALUES ('singleton', now(), 1)
  ON CONFLICT (key) DO UPDATE
    SET last_seen = now(),
        hits = (SELECT hits + 1 FROM api.supabase_keepalive WHERE key = 'singleton');

  RETURN jsonb_build_object('ok', true, 'timestamp', now());
END;
$body$;

-- 4) minimal privileges: allow callers to run only this function and write the dedicated table
-- Grant usage on the schema (required to access objects in it)
GRANT USAGE ON SCHEMA api TO anon, authenticated;

-- Allow the roles to INSERT/UPDATE only on the dedicated table (no SELECT needed)
GRANT INSERT, UPDATE ON api.supabase_keepalive TO anon, authenticated;

-- Allow executing the RPC function
GRANT EXECUTE ON FUNCTION api.keepalive() TO anon, authenticated;

COMMIT;
