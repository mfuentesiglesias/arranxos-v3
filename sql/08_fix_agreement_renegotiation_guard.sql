-- ARRANXOS v3 - Supabase Phase 1
-- File: 08_fix_agreement_renegotiation_guard.sql
-- Purpose: Prevent renegotiations from reopening or overwriting live agreements.
-- Execution order: after 07_client_job_requests_rpc.sql

-- ---------------------------------------------------------------------------
-- create_agreement
-- Bug fixed:
-- - The previous implementation could reopen or create an active negotiation for
--   a job that already had a live agreement accepted by both sides.
-- - pending/protected/released/refunded are blocked because they still
--   represent a live agreement lifecycle that must not be overwritten by a new
--   proposal.
-- - cancelled stays out of this guard so a future controlled reopening flow can
--   decide explicitly whether renegotiation is allowed.
-- Phase 3A note: p_price_guaranteed is reserved for future schema support and
-- is not persisted yet because negotiations do not currently store this flag.
-- ---------------------------------------------------------------------------

create or replace function public.create_agreement(
  p_job_id uuid,
  p_amount integer,
  p_price_guaranteed boolean default false
)
returns public.job_negotiations
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_job public.jobs%rowtype;
  v_negotiation public.job_negotiations%rowtype;
  v_event_type public.job_negotiation_event_type;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Agreement amount must be greater than zero.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role not in ('client', 'professional') then
    raise exception 'Only the client owner or assigned professional can propose an agreement.';
  end if;

  select *
  into v_job
  from public.jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'Job % does not exist.', p_job_id;
  end if;

  if not public.is_job_in_status(
    v_job.id,
    'in_progress'::public.job_status,
    'agreement_pending'::public.job_status
  ) then
    raise exception 'Job % is not in a state that allows agreement proposals.', p_job_id;
  end if;

  if v_job.assigned_professional_id is null then
    raise exception 'Job % does not have an assigned professional yet.', p_job_id;
  end if;

  if v_current_role = 'client' then
    if v_job.client_id <> v_current_user_id then
      raise exception 'Only the client owner of job % can propose an agreement.', p_job_id;
    end if;
  else
    if v_job.assigned_professional_id <> v_current_user_id then
      raise exception 'Only the assigned professional can propose an agreement for job %.', p_job_id;
    end if;

    if not public.is_active_professional() then
      raise exception 'Professional must remain approved and active to propose an agreement.';
    end if;
  end if;

  if exists (
    select 1
    from public.disputes as d
    where d.job_id = v_job.id
      and d.status in ('open', 'under_review')
  ) then
    raise exception 'Job % has an active dispute and cannot receive a new agreement proposal.', p_job_id;
  end if;

  if exists (
    select 1
    from public.agreements as a
    where a.job_id = v_job.id
      and a.accepted_by_client = true
      and a.accepted_by_professional = true
      and a.payment_status in ('pending', 'protected', 'released', 'refunded')
  ) then
    raise exception 'Job already has an active agreement and cannot receive new proposals';
  end if;

  select *
  into v_negotiation
  from public.job_negotiations
  where job_id = v_job.id
    and professional_id = v_job.assigned_professional_id
  for update;

  v_event_type := case
    when found and v_negotiation.last_amount is not null then 'counteroffer'::public.job_negotiation_event_type
    else 'proposal'::public.job_negotiation_event_type
  end;

  if found then
    update public.job_negotiations
    set status = 'active',
        last_amount = p_amount,
        proposed_by_role = v_current_role,
        client_accepted = (v_current_role = 'client'),
        professional_accepted = (v_current_role = 'professional'),
        updated_at = now()
    where id = v_negotiation.id
    returning * into v_negotiation;
  else
    insert into public.job_negotiations (
      job_id,
      professional_id,
      status,
      last_amount,
      proposed_by_role,
      client_accepted,
      professional_accepted
    )
    values (
      v_job.id,
      v_job.assigned_professional_id,
      'active',
      p_amount,
      v_current_role,
      v_current_role = 'client',
      v_current_role = 'professional'
    )
    returning * into v_negotiation;
  end if;

  insert into public.job_negotiation_events (
    negotiation_id,
    job_id,
    by_profile_id,
    by_role,
    event_type,
    amount
  )
  values (
    v_negotiation.id,
    v_negotiation.job_id,
    v_current_user_id,
    v_current_role,
    v_event_type,
    p_amount
  );

  update public.jobs
  set status = 'agreement_pending',
      updated_at = now()
  where id = v_job.id;

  return v_negotiation;
end;
$function$;

-- ---------------------------------------------------------------------------
-- accept_agreement
-- Bug fixed:
-- - The previous implementation could let an unrelated active negotiation reach
--   the agreement upsert and overwrite a live agreement already stored for the
--   same job.
-- - pending/protected/released/refunded are blocked because they still
--   represent a live agreement lifecycle that must not be replaced by a later
--   spurious acceptance.
-- - cancelled stays out of this guard so a future controlled reopening flow can
--   decide explicitly whether a replacement agreement is valid.
-- ---------------------------------------------------------------------------

create or replace function public.accept_agreement(
  p_negotiation_id uuid
)
returns table (
  result_negotiation_id uuid,
  result_agreement_id uuid,
  result_job_id uuid,
  result_negotiation_status public.job_negotiation_status,
  result_job_status public.job_status
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_negotiation_job_id uuid;
  v_job public.jobs%rowtype;
  v_negotiation public.job_negotiations%rowtype;
  v_agreement public.agreements%rowtype;
  v_commission_pct numeric;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role not in ('client', 'professional') then
    raise exception 'Only the client owner or assigned professional can accept an agreement.';
  end if;

  select n.job_id
  into v_negotiation_job_id
  from public.job_negotiations as n
  where n.id = p_negotiation_id;

  if not found then
    raise exception 'Negotiation % does not exist.', p_negotiation_id;
  end if;

  select *
  into v_job
  from public.jobs
  where id = v_negotiation_job_id
  for update;

  if not found then
    raise exception 'Job % for negotiation % does not exist.', v_negotiation_job_id, p_negotiation_id;
  end if;

  select *
  into v_negotiation
  from public.job_negotiations
  where id = p_negotiation_id
  for update;

  if not found then
    raise exception 'Negotiation % does not exist after locking its job.', p_negotiation_id;
  end if;

  if v_negotiation.status <> 'active' then
    raise exception 'Negotiation % is not active.', p_negotiation_id;
  end if;

  if v_negotiation.last_amount is null or v_negotiation.last_amount <= 0 then
    raise exception 'Negotiation % does not have a valid amount to accept.', p_negotiation_id;
  end if;

  if v_negotiation.job_id <> v_job.id then
    raise exception 'Negotiation % no longer points to the expected job.', p_negotiation_id;
  end if;

  if not public.is_job_in_status(
    v_job.id,
    'in_progress'::public.job_status,
    'agreement_pending'::public.job_status
  ) then
    raise exception 'Job % is not in a state that allows agreement acceptance.', v_job.id;
  end if;

  if v_job.assigned_professional_id is null
    or v_job.assigned_professional_id <> v_negotiation.professional_id then
    raise exception 'Negotiation % does not match the currently assigned professional for job %.', p_negotiation_id, v_job.id;
  end if;

  if v_current_role = 'client' then
    if v_job.client_id <> v_current_user_id then
      raise exception 'Only the client owner of job % can accept this negotiation.', v_job.id;
    end if;

    if v_negotiation.client_accepted then
      raise exception 'The client has already accepted negotiation %.', p_negotiation_id;
    end if;
  else
    if v_negotiation.professional_id <> v_current_user_id then
      raise exception 'Only the negotiation professional can accept negotiation %.', p_negotiation_id;
    end if;

    if not public.is_active_professional() then
      raise exception 'Professional must remain approved and active to accept an agreement.';
    end if;

    if v_negotiation.professional_accepted then
      raise exception 'The professional has already accepted negotiation %.', p_negotiation_id;
    end if;
  end if;

  update public.job_negotiations
  set client_accepted = case when v_current_role = 'client' then true else client_accepted end,
      professional_accepted = case when v_current_role = 'professional' then true else professional_accepted end,
      updated_at = now()
  where id = v_negotiation.id
  returning * into v_negotiation;

  insert into public.job_negotiation_events (
    negotiation_id,
    job_id,
    by_profile_id,
    by_role,
    event_type,
    amount
  )
  values (
    v_negotiation.id,
    v_negotiation.job_id,
    v_current_user_id,
    v_current_role,
    'accepted',
    v_negotiation.last_amount
  );

  if v_negotiation.client_accepted and v_negotiation.professional_accepted then
    if exists (
      select 1
      from public.agreements as a
      where a.job_id = v_negotiation.job_id
        and a.accepted_by_client = true
        and a.accepted_by_professional = true
        and a.payment_status in ('pending', 'protected', 'released', 'refunded')
    ) then
      raise exception 'Job already has an active agreement and cannot receive new proposals';
    end if;

    select commission_pct
    into v_commission_pct
    from public.admin_config
    where id = 'global';

    if not found then
      raise exception 'Admin config row with id=global is required before finalizing an agreement.';
    end if;

    update public.job_negotiations
    set status = 'accepted',
        updated_at = now()
    where id = v_negotiation.id
    returning * into v_negotiation;

    insert into public.agreements (
      job_id,
      professional_id,
      final_price,
      commission_pct,
      payment_status,
      price_guaranteed,
      accepted_by_client,
      accepted_by_professional
    )
    values (
      v_negotiation.job_id,
      v_negotiation.professional_id,
      v_negotiation.last_amount,
      v_commission_pct,
      'pending',
      false,
      true,
      true
    )
    on conflict (job_id) do update
      set professional_id = excluded.professional_id,
          final_price = excluded.final_price,
          commission_pct = excluded.commission_pct,
          payment_status = excluded.payment_status,
          price_guaranteed = excluded.price_guaranteed,
          accepted_by_client = excluded.accepted_by_client,
          accepted_by_professional = excluded.accepted_by_professional
    returning * into v_agreement;

    update public.jobs
    set status = 'agreed',
        final_price = v_negotiation.last_amount,
        commission_pct_snapshot = v_commission_pct,
        updated_at = now()
    where id = v_negotiation.job_id
    returning * into v_job;
  end if;

  return query
  select
    v_negotiation.id,
    v_agreement.id,
    v_negotiation.job_id,
    v_negotiation.status,
    v_job.status;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Non-destructive verification
-- ---------------------------------------------------------------------------

-- Detect jobs that currently have both a live agreement and an active
-- negotiation. These rows are candidates for manual review before or after the
-- patch, but this query does not modify anything.
--
-- select
--   j.id as job_id,
--   j.status as job_status,
--   a.id as agreement_id,
--   a.payment_status,
--   n.id as negotiation_id,
--   n.status as negotiation_status,
--   n.last_amount,
--   n.updated_at as negotiation_updated_at
-- from public.jobs as j
-- join public.agreements as a
--   on a.job_id = j.id
-- join public.job_negotiations as n
--   on n.job_id = j.id
-- where a.accepted_by_client = true
--   and a.accepted_by_professional = true
--   and a.payment_status in ('pending', 'protected', 'released', 'refunded')
--   and n.status = 'active'
-- order by n.updated_at desc;
--
-- Inspect the deployed function bodies after applying this patch.
--
-- select pg_get_functiondef('public.create_agreement(uuid, integer, boolean)'::regprocedure);
-- select pg_get_functiondef('public.accept_agreement(uuid)'::regprocedure);
