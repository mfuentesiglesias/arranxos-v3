-- ARRANXOS v3 - Supabase Phase 1
-- File: 11_disputes_rpc.sql
-- Purpose: Fake disputes flow without Stripe or payouts.
-- Execution order: after 10_completion_release_rpc.sql

-- ---------------------------------------------------------------------------
-- open_dispute
-- Notes:
-- - A dispute can only be opened by the client owner or the assigned active
--   professional while the job is pending client confirmation and the payment
--   remains protected.
-- - Opening the dispute moves the job into dispute status, but does not touch
--   the agreement payment state yet.
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
      updated_at = now()
  where id = v_job.id
  returning * into v_job;

  return query
  select
    v_dispute.id,
    v_job.id,
    v_dispute.status,
    v_job.status;
end;
$function$;

-- ---------------------------------------------------------------------------
-- resolve_dispute
-- Notes:
-- - Admin-only RPC to resolve a dispute either in favor of the professional or
--   the client.
-- - No Stripe transfer or payout is triggered here; only fake local state
--   transitions are applied.
-- ---------------------------------------------------------------------------

create or replace function public.resolve_dispute(
  p_dispute_id uuid,
  p_resolution_action text,
  p_resolution_note text default null
)
returns table (
  result_dispute_id uuid,
  result_job_id uuid,
  result_dispute_status public.dispute_status,
  result_job_status public.job_status,
  result_payment_status public.agreement_payment_status,
  result_released_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_dispute public.disputes%rowtype;
  v_job public.jobs%rowtype;
  v_agreement public.agreements%rowtype;
  v_resolution_action text := lower(btrim(coalesce(p_resolution_action, '')));
  v_resolution_note text := nullif(btrim(coalesce(p_resolution_note, '')), '');
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'admin' then
    raise exception 'Only admins can resolve disputes.';
  end if;

  if v_resolution_action not in ('release_to_professional', 'refund_to_client') then
    raise exception 'Resolution action must be release_to_professional or refund_to_client.';
  end if;

  if v_resolution_note is not null and char_length(v_resolution_note) > 4000 then
    raise exception 'Resolution note must contain at most 4000 characters.';
  end if;

  select *
  into v_dispute
  from public.disputes
  where id = p_dispute_id
  for update;

  if not found then
    raise exception 'Dispute % does not exist.', p_dispute_id;
  end if;

  if v_dispute.status not in ('open', 'under_review') then
    raise exception 'Dispute % is not active.', p_dispute_id;
  end if;

  select *
  into v_job
  from public.jobs
  where id = v_dispute.job_id
  for update;

  if not found then
    raise exception 'Job % for dispute % does not exist.', v_dispute.job_id, p_dispute_id;
  end if;

  if not public.is_job_in_status(v_job.id, 'dispute'::public.job_status) then
    raise exception 'Job % is not in dispute status.', v_job.id;
  end if;

  select *
  into v_agreement
  from public.agreements
  where job_id = v_job.id
  for update;

  if not found then
    raise exception 'Agreement for job % does not exist.', v_job.id;
  end if;

  if v_agreement.payment_status <> 'protected' then
    raise exception 'Agreement for job % is not protected.', v_job.id;
  end if;

  if v_agreement.paid_at is null then
    raise exception 'Agreement for job % does not have a funded paid_at timestamp.', v_job.id;
  end if;

  if v_agreement.released_at is not null then
    raise exception 'Agreement for job % has already been released.', v_job.id;
  end if;

  if v_resolution_action = 'release_to_professional' then
    update public.disputes
    set status = 'resolved_professional',
        resolved_by_admin_id = v_current_user_id,
        resolved_at = now(),
        resolution_note = v_resolution_note
    where id = v_dispute.id
    returning * into v_dispute;

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
  else
    update public.disputes
    set status = 'resolved_client',
        resolved_by_admin_id = v_current_user_id,
        resolved_at = now(),
        resolution_note = v_resolution_note
    where id = v_dispute.id
    returning * into v_dispute;

    update public.agreements
    set payment_status = 'refunded'
    where id = v_agreement.id
    returning * into v_agreement;

    update public.jobs
    set status = 'cancelled',
        updated_at = now()
    where id = v_job.id
    returning * into v_job;
  end if;

  return query
  select
    v_dispute.id,
    v_job.id,
    v_dispute.status,
    v_job.status,
    v_agreement.payment_status,
    v_agreement.released_at;
end;
$function$;
