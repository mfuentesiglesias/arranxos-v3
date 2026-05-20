-- ARRANXOS v3 - Supabase Phase 1
-- File: 09_fund_protected_payment_rpc.sql
-- Purpose: Fake protected payment funding without Stripe integration.
-- Execution order: after 08_fix_agreement_renegotiation_guard.sql

-- ---------------------------------------------------------------------------
-- fund_protected_payment
-- Notes:
-- - This RPC simulates the client funding the agreed amount into protected
--   payment without real payment provider integration yet.
-- - It moves the agreement from pending -> protected and the job from
--   agreed -> escrow_funded.
-- - Stripe, webhooks, releases, payouts, disputes, and completion remain out of
--   scope for this Phase 1 fake payment step.
-- ---------------------------------------------------------------------------

create or replace function public.fund_protected_payment(
  p_job_id uuid
)
returns table (
  result_job_id uuid,
  result_agreement_id uuid,
  result_payment_status public.agreement_payment_status,
  result_job_status public.job_status,
  result_paid_at timestamptz
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
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'client' then
    raise exception 'Only the client owner can fund protected payment for this job.';
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
    raise exception 'Only the client owner can fund protected payment for job %.', p_job_id;
  end if;

  if not public.is_job_in_status(v_job.id, 'agreed'::public.job_status) then
    raise exception 'Job % is not in agreed status.', p_job_id;
  end if;

  select *
  into v_agreement
  from public.agreements
  where job_id = v_job.id
  for update;

  if not found then
    raise exception 'Agreement for job % does not exist.', p_job_id;
  end if;

  if not v_agreement.accepted_by_client or not v_agreement.accepted_by_professional then
    raise exception 'Agreement for job % is not fully accepted.', p_job_id;
  end if;

  if v_agreement.payment_status = 'protected' then
    raise exception 'Agreement for job % is already protected.', p_job_id;
  end if;

  if v_agreement.payment_status <> 'pending' then
    raise exception 'Agreement for job % is not pending payment.', p_job_id;
  end if;

  update public.agreements
  set payment_status = 'protected',
      paid_at = now()
  where id = v_agreement.id
  returning * into v_agreement;

  update public.jobs
  set status = 'escrow_funded',
      updated_at = now()
  where id = v_job.id
  returning * into v_job;

  return query
  select
    v_job.id,
    v_agreement.id,
    v_agreement.payment_status,
    v_job.status,
    v_agreement.paid_at;
end;
$function$;
