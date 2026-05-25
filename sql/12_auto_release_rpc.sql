-- ARRANXOS v3 - Supabase Phase 1
-- File: 12_auto_release_rpc.sql
-- Purpose: Auto-release base RPCs without Stripe or cron.
-- Execution order: after 11_disputes_rpc.sql

-- ---------------------------------------------------------------------------
-- mark_job_completed
-- Notes:
-- - Keeps the existing validations and return shape.
-- - Sets completion_deadline using admin_config.auto_release_days when the
--   global row exists and contains a valid value; otherwise falls back to 5.
-- ---------------------------------------------------------------------------

create or replace function public.mark_job_completed(
  p_job_id uuid
)
returns table (
  result_job_id uuid,
  result_agreement_id uuid,
  result_payment_status public.agreement_payment_status,
  result_job_status public.job_status
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_job public.jobs%rowtype;
  v_agreement public.agreements%rowtype;
  v_auto_release_days integer := 5;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'professional' then
    raise exception 'Only the assigned professional can mark this job as completed.';
  end if;

  if not public.is_active_professional() then
    raise exception 'Professional must remain approved and active to mark a job as completed.';
  end if;

  select *
  into v_job
  from public.jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'Job % does not exist.', p_job_id;
  end if;

  if v_job.assigned_professional_id <> v_current_user_id then
    raise exception 'Only the assigned professional can mark job % as completed.', p_job_id;
  end if;

  if not public.is_job_in_status(v_job.id, 'escrow_funded'::public.job_status) then
    raise exception 'Job % is not in escrow_funded status.', p_job_id;
  end if;

  select *
  into v_agreement
  from public.agreements
  where job_id = v_job.id
  for update;

  if not found then
    raise exception 'Agreement for job % does not exist.', p_job_id;
  end if;

  if v_agreement.professional_id <> v_job.assigned_professional_id then
    raise exception 'Agreement for job % does not belong to the assigned professional.', p_job_id;
  end if;

  if v_agreement.payment_status = 'released' or v_agreement.released_at is not null then
    raise exception 'Agreement for job % has already been released.', p_job_id;
  end if;

  if v_agreement.payment_status <> 'protected' then
    raise exception 'Agreement for job % is not protected.', p_job_id;
  end if;

  if v_agreement.paid_at is null then
    raise exception 'Agreement for job % does not have a funded paid_at timestamp.', p_job_id;
  end if;

  select case
    when auto_release_days is not null and auto_release_days > 0 then auto_release_days
    else 5
  end
  into v_auto_release_days
  from public.admin_config
  where id = 'global';

  if not found or v_auto_release_days is null or v_auto_release_days <= 0 then
    v_auto_release_days := 5;
  end if;

  update public.jobs
  set status = 'completed_pending_confirmation',
      completion_deadline = now() + make_interval(days => v_auto_release_days),
      updated_at = now()
  where id = v_job.id
  returning * into v_job;

  return query
  select
    v_job.id,
    v_agreement.id,
    v_agreement.payment_status,
    v_job.status;
end;
$function$;

-- ---------------------------------------------------------------------------
-- confirm_job_completion
-- Notes:
-- - Keeps the existing validations and return shape.
-- - Clears completion_deadline once the client confirms and the release is
--   applied.
-- ---------------------------------------------------------------------------

create or replace function public.confirm_job_completion(
  p_job_id uuid
)
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
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_job public.jobs%rowtype;
  v_agreement public.agreements%rowtype;
  v_professional_id uuid;
  v_released_at timestamptz := now();
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'client' then
    raise exception 'Only the client owner can confirm completion for this job.';
  end if;

  select *
  into v_job
  from public.jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'Job % does not exist.', p_job_id;
  end if;

  if v_job.client_id <> v_current_user_id then
    raise exception 'Only the client owner can confirm completion for job %.', p_job_id;
  end if;

  if not public.is_job_in_status(v_job.id, 'completed_pending_confirmation'::public.job_status) then
    raise exception 'Job % is not in completed_pending_confirmation status.', p_job_id;
  end if;

  select *
  into v_agreement
  from public.agreements
  where job_id = v_job.id
  for update;

  if not found then
    raise exception 'Agreement for job % does not exist.', p_job_id;
  end if;

  if v_agreement.payment_status = 'released' or v_agreement.released_at is not null then
    raise exception 'Agreement for job % has already been released.', p_job_id;
  end if;

  if v_agreement.payment_status <> 'protected' then
    raise exception 'Agreement for job % is not protected.', p_job_id;
  end if;

  if v_agreement.paid_at is null then
    raise exception 'Agreement for job % does not have a funded paid_at timestamp.', p_job_id;
  end if;

  v_professional_id := coalesce(v_job.assigned_professional_id, v_agreement.professional_id);

  update public.agreements
  set payment_status = 'released',
      released_at = v_released_at
  where id = v_agreement.id
  returning * into v_agreement;

  update public.jobs
  set status = 'completed',
      completion_deadline = null,
      updated_at = v_released_at
  where id = v_job.id
  returning * into v_job;

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
end;
$function$;

-- ---------------------------------------------------------------------------
-- open_dispute
-- Notes:
-- - Keeps the existing validations and return shape.
-- - Clears completion_deadline when the job moves into dispute so it cannot be
--   auto-released while under review.
-- ---------------------------------------------------------------------------

create or replace function public.open_dispute(
  p_job_id uuid,
  p_reason text,
  p_description text default null,
  p_evidence jsonb default '[]'::jsonb
)
returns table (
  result_dispute_id uuid,
  result_job_id uuid,
  result_dispute_status public.dispute_status,
  result_job_status public.job_status
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_job public.jobs%rowtype;
  v_agreement public.agreements%rowtype;
  v_dispute public.disputes%rowtype;
  v_professional_id uuid;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role not in ('client', 'professional') then
    raise exception 'Only the client owner or assigned professional can open a dispute.';
  end if;

  if char_length(v_reason) < 5 or char_length(v_reason) > 200 then
    raise exception 'Dispute reason must contain between 5 and 200 characters.';
  end if;

  if v_description is not null and char_length(v_description) > 4000 then
    raise exception 'Dispute description must contain at most 4000 characters.';
  end if;

  if jsonb_typeof(coalesce(p_evidence, '[]'::jsonb)) <> 'array' then
    raise exception 'Dispute evidence must be a JSON array.';
  end if;

  select *
  into v_job
  from public.jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'Job % does not exist.', p_job_id;
  end if;

  if not public.is_job_in_status(v_job.id, 'completed_pending_confirmation'::public.job_status) then
    raise exception 'Job % is not in completed_pending_confirmation status.', p_job_id;
  end if;

  if v_current_role = 'client' then
    if v_job.client_id <> v_current_user_id then
      raise exception 'Only the client owner can open a dispute for job %.', p_job_id;
    end if;
  else
    if not public.is_active_professional() then
      raise exception 'Professional must remain approved and active to open a dispute.';
    end if;

    if v_job.assigned_professional_id <> v_current_user_id then
      raise exception 'Only the assigned professional can open a dispute for job %.', p_job_id;
    end if;
  end if;

  select *
  into v_agreement
  from public.agreements
  where job_id = v_job.id
  for update;

  if not found then
    raise exception 'Agreement for job % does not exist.', p_job_id;
  end if;

  if v_agreement.payment_status <> 'protected' then
    raise exception 'Agreement for job % is not protected.', p_job_id;
  end if;

  if v_agreement.paid_at is null then
    raise exception 'Agreement for job % does not have a funded paid_at timestamp.', p_job_id;
  end if;

  if v_agreement.released_at is not null then
    raise exception 'Agreement for job % has already been released.', p_job_id;
  end if;

  if exists (
    select 1
    from public.disputes as d
    where d.job_id = v_job.id
      and d.status in ('open', 'under_review')
    ) then
    raise exception 'Job % already has an active dispute.', p_job_id;
  end if;

  v_professional_id := coalesce(v_job.assigned_professional_id, v_agreement.professional_id);

  insert into public.disputes (
    job_id,
    opened_by_profile_id,
    opened_by_role,
    reason,
    description,
    evidence,
    status
  )
  values (
    v_job.id,
    v_current_user_id,
    v_current_role,
    v_reason,
    v_description,
    coalesce(p_evidence, '[]'::jsonb),
    'open'
  )
  returning * into v_dispute;

  update public.jobs
  set status = 'dispute',
      completion_deadline = null,
      updated_at = now()
  where id = v_job.id
  returning * into v_job;

  if v_professional_id is not null then
    perform public.refresh_professional_reliability_snapshot(v_professional_id);
  end if;

  return query
  select
    v_dispute.id,
    v_job.id,
    v_dispute.status,
    v_job.status;
end;
$function$;

-- ---------------------------------------------------------------------------
-- auto_release_due_jobs
-- Notes:
-- - Admin-only manual trigger for due jobs.
-- - No Stripe transfers or payouts are triggered here.
-- - Uses row locking with SKIP LOCKED so concurrent executions remain safe and
--   idempotent.
-- ---------------------------------------------------------------------------

create or replace function public.auto_release_due_jobs()
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
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_job public.jobs%rowtype;
  v_agreement public.agreements%rowtype;
  v_professional_id uuid;
  v_released_at timestamptz;
  v_due_job record;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'admin' then
    raise exception 'Only admins can auto-release due jobs.';
  end if;

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
