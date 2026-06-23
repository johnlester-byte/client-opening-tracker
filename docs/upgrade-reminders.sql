-- ============================================================================
-- UPGRADE: self-serve reminders ("remind me on X day" + Add to Calendar)
-- Run this whole script once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: everything uses "if not exists" / "drop ... if exists".
-- ============================================================================

-- 1. Reminders table.
--    A reminder is a dated note ("what to do") for a teammate. It can be linked
--    to a client (location_id) or stand on its own (location_id left null).
create table if not exists reminders (
  id           text primary key,
  location_id  text references locations(id) on delete set null, -- optional client link
  title        text not null,        -- what needs doing
  remind_on    date not null,        -- the day it should happen
  assignee     text,                 -- who it's for (e.g. "Faith")
  notes        text,                 -- extra detail
  done         boolean default false,
  created_by   text,                 -- email of whoever created it
  created_at   timestamptz not null default now()
);

-- 2. Lock to logged-in users only (same pattern as locations / activity_log).
alter table reminders enable row level security;
drop policy if exists "authenticated full access" on reminders;
create policy "authenticated full access" on reminders
  for all to authenticated using (true) with check (true);

-- 3. Realtime so a reminder added by one teammate appears for everyone instantly.
--    (If it errors as "already a member", ignore.)
alter publication supabase_realtime add table reminders;
