-- ARRANXOS v3 - Supabase Phase 1
-- File: 10_completion_release_rpc.sql
-- Purpose: Fake completion and release flow without Stripe or payouts.
-- Execution order: after 09_fund_protected_payment_rpc.sql

-- ---------------------------------------------------------------------------
-- mark_job_completed
-- Notes:
-- - This RPC lets the assigned professional move a funded job into
--   completed_pending_confirmation.
-- - Payment remains protected here; release happens only when the client owner
--   confirms completion in a separate RPC.
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
  v_professional_id uuid;
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

  update public.jobs
  set status = 'completed_pending_confirmation',
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
-- - This RPC lets the client owner confirm completion and release the protected
--   payment in the fake flow.
-- - No Stripe transfer or payout is triggered here; only local state changes.
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
      released_at = now()
  where id = v_agreement.id
  returning * into v_agreement;

  update public.jobs
  set status = 'completed',
      updated_at = now()
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
