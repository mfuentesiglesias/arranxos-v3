-- ARRANXOS v3 - Supabase Phase 1
-- File: 22_pg_cron_schedule.sql
-- Purpose: Schedule auto-release of due jobs via pg_cron.
-- Execution order: after 20_auto_release_cron_rpc.sql
--
-- Notes:
-- - Requires pg_cron extension (Supabase Pro / Team plan).
-- - Schedules auto_release_due_jobs_cron() to run every hour.
-- - No Stripe transfers or payouts are triggered.
-- - Only logical internal state is released.
-- - auto_release_days still comes from admin_config via completion_deadline.
-- - The manual admin button auto_release_due_jobs() in /admin/economia remains
--   untouched and fully independent.
--
-- Rollback / deactivation:
--   select cron.unschedule('auto-release-due-jobs');
--
-- Verify the job was created:
--   select jobid, schedule, command, active, jobname from cron.job where jobname = 'auto-release-due-jobs';
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'auto-release-due-jobs'
  ) then
    perform cron.unschedule('auto-release-due-jobs');
  end if;
end
$$;

select cron.schedule(
  'auto-release-due-jobs',
  '0 * * * *',
  'select public.auto_release_due_jobs_cron();'
);
