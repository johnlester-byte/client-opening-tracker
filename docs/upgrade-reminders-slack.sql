-- ============================================================================
-- UPGRADE: Slack delivery for reminders
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- (Run AFTER upgrade-reminders.sql, which creates the reminders table.)
--
-- The daily Slack post runs without a login, so it can't read the reminders
-- table directly (that table is locked to logged-in users). This exposes ONLY
-- the reminders that are due today, through a read-only function that the
-- public key may call — exactly the same trick used for the locations feed.
-- ============================================================================

create or replace function public.due_reminders_feed()
returns table (
  id            text,
  title         text,
  remind_on     date,
  assignee      text,
  notes         text,
  client_name   text,
  location_name text
)
language sql stable security definer set search_path = public as $$
  select r.id, r.title, r.remind_on, r.assignee, r.notes,
         l.client_name, l.name as location_name
  from reminders r
  left join locations l on l.id = r.location_id
  where r.done = false
    and r.remind_on = current_date          -- only what's due TODAY
  order by r.assignee nulls last, r.title;
$$;

grant execute on function public.due_reminders_feed() to anon;

-- Tip: to also include OVERDUE reminders (anything not done up to today),
-- change the line   r.remind_on = current_date
-- to               r.remind_on <= current_date


-- ----------------------------------------------------------------------------
-- The daily Slack post ALSO lists pre-open / post-open follow-ups, which it
-- reads from the locations table via reminder_feed(). That function was first
-- created in upgrade-auth-activity.sql; we (re)create it here so this upgrade
-- works on its own. It's identical and safe to run again.
-- ----------------------------------------------------------------------------
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
