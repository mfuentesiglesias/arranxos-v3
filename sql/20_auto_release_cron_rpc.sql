-- ARRANXOS v3 - Supabase Phase 1
-- File: 20_auto_release_cron_rpc.sql
-- Purpose: Prepare a backend-only auto-release RPC for future cron execution.
-- Execution order: after 12_auto_release_rpc.sql and 17_reliability_autorefresh.sql

-- ---------------------------------------------------------------------------
-- auto_release_due_jobs_cron
-- Notes:
-- - Backend-only variant of auto_release_due_jobs().
-- - Keeps the existing manual admin RPC intact for /admin/economia.
-- - Intentionally duplicates the effective release loop from
--   sql/12_auto_release_rpc.sql in Build 1A to avoid changing the manual path.
-- - No Stripe transfers or payouts are triggered here.
-- - Uses row locking with SKIP LOCKED so concurrent executions remain safe and
--   idempotent.
-- ---------------------------------------------------------------------------

create or replace function public.auto_release_due_jobs_cron()
returns table (
  result_job_id uuid,
  result_agreement_id uuid,
  result_payment_status public.agreement_payment_status,
  result_job_status public.job_status,
  result_released_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_job public.jobs%rowtype;
  v_agreement public.agreements%rowtype;
  v_professional_id uuid;
  v_released_at timestamptz;
  v_due_job record;
begin
  for v_due_job in
    select
      j.id as job_id,
      a.id as agreement_id
    from public.jobs as j
    inner join public.agreements as a
      on a.job_id = j.id
    where j.status = 'completed_pending_confirmation'
      and j.completion_deadline is not null
      and j.completion_deadline <= now()
      and a.payment_status = 'protected'
      and a.released_at is null
      and a.paid_at is not null
      and not exists (
        select 1
        from public.disputes as d
        where d.job_id = j.id
          and d.status in ('open', 'under_review')
      )
    for update of j, a skip locked
  loop
    v_released_at := now();

    update public.agreements
    set payment_status = 'released',
        released_at = v_released_at
    where id = v_due_job.agreement_id
    returning * into v_agreement;

    update public.jobs
    set status = 'completed',
        completion_deadline = null,
        updated_at = v_released_at
    where id = v_due_job.job_id
    returning * into v_job;

    v_professional_id := coalesce(v_job.assigned_professional_id, v_agreement.professional_id);

    if v_professional_id is not null then
      perform public.refresh_professional_reliability_snapshot(v_professional_id);
    end if;

    return query
    select
      v_job.id,
      v_agreement.id,
      v_agreement.payment_status,
      v_job.status,
      v_agreement.released_at;
  end loop;
end;
$function$;

revoke all on function public.auto_release_due_jobs_cron() from public;
revoke all on function public.auto_release_due_jobs_cron() from anon;
revoke all on function public.auto_release_due_jobs_cron() from authenticated;
grant execute on function public.auto_release_due_jobs_cron() to service_role;
