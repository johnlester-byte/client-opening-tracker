-- ============================================================================
-- REMOVE the reminders feature from the database.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- This drops the reminders table and the Slack helper function that were added
-- for the reminder feature. It deletes any reminder rows you had (e.g. your
-- "Test Reminder") — your clients, activity log, and everything else are NOT
-- touched.
--
-- NOTE: reminder_feed() is intentionally left in place. It existed before the
-- reminder feature (from upgrade-auth-activity.sql) and may be used by your
-- existing daily openings reminder, so we do NOT drop it.
-- ============================================================================

drop function if exists public.due_reminders_feed();
drop table if exists public.reminders cascade;

-- (Dropping the table automatically removes it from the realtime publication.)
