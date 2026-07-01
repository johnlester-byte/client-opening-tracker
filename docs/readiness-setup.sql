-- ============================================================================
-- CLIENT READINESS CHECKLIST — adds a client-facing "Open Readiness" form
-- that clients fill out themselves via a private link, with no login.
-- Run this whole script once in Supabase: SQL Editor -> New query -> paste -> Run.
-- ============================================================================

-- 0. Needed for gen_random_uuid() below (usually already enabled on Supabase).
create extension if not exists pgcrypto;

-- 1. One row per client/location. `token` is the secret that goes in the
--    client's link — it is NOT the same as locations.id, so the link can't
--    be guessed from a location id shown anywhere else.
create table if not exists readiness (
  location_id  text primary key references locations(id) on delete cascade,
  token        uuid not null default gen_random_uuid() unique,
  data         jsonb not null default '{}'::jsonb,   -- the whole checklist state
  pct          integer not null default 0,           -- % complete, for the tracker list
  updated_at   timestamptz not null default now()
);

-- Set once, the first time the Club acknowledgment is checked (see the
-- save_readiness function below) — the date the form was actually submitted,
-- separate from `updated_at` which keeps changing on every keystroke.
alter table readiness add column if not exists submitted_at timestamptz;

-- 2. Lock the table itself to logged-in teammates only (same pattern as `locations`).
--    Clients never query this table directly — they go through the two
--    functions below, which check the secret token instead of a login.
alter table readiness enable row level security;
-- Postgres has no "create policy if not exists", so drop it first — this is
-- what actually makes re-running this whole script safe.
drop policy if exists "authenticated full access" on readiness;
create policy "authenticated full access" on readiness
  for all to authenticated using (true) with check (true);

-- 3. Anonymous, token-scoped access for clients. Each function only ever
--    touches the single row whose token matches what's in the client's URL —
--    there is no way to list or browse other clients' rows with these.
create or replace function public.get_readiness(p_token uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select data from readiness where token = p_token;
$$;
grant execute on function public.get_readiness(uuid) to anon, authenticated;

-- Postgres treats a new parameter list as a different function rather than
-- replacing the old one, so drop the earlier 3-argument version first —
-- otherwise both would sit in the database at once.
drop function if exists public.save_readiness(uuid, jsonb, integer);

-- p_submitted is sent as true every time the client saves while the Club
-- acknowledgment checkbox is checked. submitted_at only gets set the FIRST
-- time that happens (it's coalesced against itself), so it stays a fixed
-- "date received" even though this function is called on every keystroke.
create or replace function public.save_readiness(p_token uuid, p_data jsonb, p_pct integer default 0, p_submitted boolean default false)
returns void
language sql security definer set search_path = public as $$
  update readiness
  set data = p_data,
      pct = greatest(0, least(100, p_pct)),
      submitted_at = case when p_submitted then coalesce(submitted_at, now()) else submitted_at end,
      updated_at = now()
  where token = p_token;
$$;
grant execute on function public.save_readiness(uuid, jsonb, integer, boolean) to anon, authenticated;

-- 4. Backfill a readiness row (and therefore a link) for every client that
--    already exists. Safe to re-run — it skips clients that already have one.
insert into readiness (location_id)
select id from locations
where id not in (select location_id from readiness)
on conflict (location_id) do nothing;

-- 5. Realtime, so the "Readiness" progress bar updates live in the tracker
--    the moment a client checks something off (same idea as `locations`).
--    Checks first instead of just trying and erroring, so this script can
--    be re-run any number of times without a "already a member" error.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'readiness'
  ) then
    alter publication supabase_realtime add table readiness;
  end if;
end $$;

-- ============================================================================
-- After running this:
--   - New clients added through the tracker automatically get a readiness
--     row + link (see app.js).
--   - Existing clients get a "Create link" button in the Readiness column
--     until this backfill runs — after step 4 above, they'll all have one.
--   - Share a client's link as:  <your site url>/readiness.html?token=<their token>
--     Copy it straight from the Readiness column in the tracker.
--   - This script is safe to re-run any time (e.g. after this submitted_at
--     update) — every step skips or replaces cleanly instead of erroring.
-- ============================================================================
