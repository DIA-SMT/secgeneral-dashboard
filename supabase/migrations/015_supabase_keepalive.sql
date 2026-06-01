-- 015_supabase_keepalive.sql
-- Adds a minimal, schema-safe keepalive mechanism for Supabase Free projects.
-- Idempotent: safe to run multiple times.
--
-- Note: The function must be in public schema to be exposed via Supabase REST API RPC.
-- The table is in api schema to separate infrastructure from business logic.

BEGIN;

-- 1) ensure infrastructure schema
CREATE SCHEMA IF NOT EXISTS api;

-- 2) dedicated table for heartbeat state (in api schema, not exposed to REST)
CREATE TABLE IF NOT EXISTS api.supabase_keepalive (
  key text PRIMARY KEY,
  last_seen timestamptz NOT NULL DEFAULT now(),
  hits bigint NOT NULL DEFAULT 0
);

-- Disable RLS on this table (infrastructure, not user data)
ALTER TABLE api.supabase_keepalive DISABLE ROW LEVEL SECURITY;

-- 3) RPC function in public schema (required for Supabase REST API exposure)
-- Idempotent: safe to run multiple times.
CREATE OR REPLACE FUNCTION public.keepalive()
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

-- 4) minimal privileges
-- Grant usage on the api schema (required to access objects in it)
GRANT USAGE ON SCHEMA api TO anon, authenticated;

-- Grant all privileges on the dedicated table to ensure RPC can write
GRANT INSERT, UPDATE, SELECT ON api.supabase_keepalive TO anon, authenticated;

-- Allow executing the public RPC function
GRANT EXECUTE ON FUNCTION public.keepalive() TO anon, authenticated;

-- Set default privileges for future migrations in the api schema
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT INSERT, UPDATE, SELECT ON TABLES TO anon, authenticated;

COMMIT;
