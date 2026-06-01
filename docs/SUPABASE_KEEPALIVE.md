Supabase keepalive

What was added
- A schema-safe database migration: supabase/migrations/015_supabase_keepalive.sql
  - Creates schema `api` and table `api.supabase_keepalive`.
  - Adds function `api.keepalive()` which upserts a single fixed row and returns JSON {ok:true,timestamp:...}.
  - Grants minimal privileges (USAGE on schema, INSERT/UPDATE on the table, EXECUTE on the function) to `anon` and `authenticated` roles.
- A scheduled GitHub Actions workflow: .github/workflows/supabase-keepalive.yml
  - Runs twice daily and calls the RPC endpoint via Supabase REST RPC: POST /rest/v1/rpc/keepalive

Required secrets / environment variables
- SUPABASE_PROJECT_URL (e.g. https://<project>.supabase.co)
- SUPABASE_ANON_KEY

Why this is safe
- The keepalive writes only to a dedicated table in the `api` schema. No business tables are touched.
- The function is idempotent and minimal.
- Only minimal rights are granted to `anon`/`authenticated` (schema usage, insert/update on the single table, execute the function).

Manual test
1) Run the SQL migration against your production DB (via your normal migration tool) or execute the SQL file manually.
2) From a machine with SUPABASE_PROJECT_URL and SUPABASE_ANON_KEY set, run:
   curl -s -X POST "${SUPABASE_PROJECT_URL}/rest/v1/rpc/keepalive" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
     -H "Content-Type: application/json" -d '{}' | jq
   Expected result: {"ok":true,"timestamp":"..."}

Disabling or adjusting schedule
- To disable: remove or rename .github/workflows/supabase-keepalive.yml or remove the schedule block.
- To change frequency: edit cron expressions in the workflow.

Notes
- If this project prefers using a server-only secret (for example to avoid granting anon DB rights), do not grant INSERT/UPDATE to `anon` — instead grant EXECUTE to a custom role and call the RPC from a server job using a service role key stored in secrets. This repository uses the anon approach for minimal operational friction; change as needed.
- Purpose: prevent Supabase Free projects being paused for inactivity by keeping the DB active at least once every 48 hours.
