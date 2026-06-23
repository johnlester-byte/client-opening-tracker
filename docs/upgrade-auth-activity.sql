-- ============================================================================
-- UPGRADE: real logins + activity log + opened workflow
-- Run this whole script once in Supabase: SQL Editor -> New query -> paste -> Run.
-- ============================================================================

-- 1. New columns on `locations` for the "Opened" workflow
alter table locations add column if not exists opened_date  date;   -- the ACTUAL date it opened
alter table locations add column if not exists open_outcome text;   -- short "how did it go" note

-- 2. Activity log table — records who changed what and when
create table if not exists activity_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_email  text,           -- who did it (from their login)
  action      text,           -- created | updated | deleted | opened
  entity      text,           -- which client/location it was about
  details     text            -- optional extra detail
);

-- 3. Lock everything down to logged-in users only (FULL LOCK).
--    Remove the old "anyone with the key" policies and require authentication.
drop policy if exists "team read"  on locations;
drop policy if exists "team write" on locations;
create policy "authenticated full access" on locations
  for all to authenticated using (true) with check (true);

alter table activity_log enable row level security;
create policy "authenticated read log"  on activity_log
  for select to authenticated using (true);
create policy "authenticated write log" on activity_log
  for insert to authenticated with check (true);

-- 4. Realtime for both tables (so changes appear instantly for everyone logged in)
alter publication supabase_realtime add table activity_log;
-- (locations was already added earlier; if it errors as "already a member", ignore.)

-- 5. Read-only feed for the daily Slack reminder.
--    The `locations` table is locked to logged-in users, but the automated
--    reminder runs without a login. This function exposes ONLY the fields the
--    reminder needs, callable with the public key — so no secret key is ever
--    placed in the automation. (If you'd rather expose nothing, skip this and
--    turn the Slack reminder off instead.)
create or replace function public.reminder_feed()
returns table (
  client_name text, name text, tier text, opening_date date,
  tracker text, status text, notes text,
  pre_open_done boolean, post_open_done boolean, opened_date date
)
language sql stable security definer set search_path = public as $$
  select client_name, name, tier, opening_date, tracker, status, notes,
         pre_open_done, post_open_done, opened_date
  from locations;
$$;
grant execute on function public.reminder_feed() to anon;

-- ============================================================================
-- ALSO DO THIS IN THE DASHBOARD (not SQL):
--   a) Authentication -> Sign In / Providers -> turn OFF "Allow new users to sign up"
--      (so only accounts you create can log in).
--   b) Authentication -> Users -> "Add user" for each teammate (email + password).
--      Tick "Auto Confirm User" so they can log in right away.
-- ============================================================================
