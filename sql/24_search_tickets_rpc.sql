-- ARRANXOS v3 - Supabase Phase 1
-- File: 24_search_tickets_rpc.sql
-- Purpose: Real search ticket RPCs for client creation and admin management.
-- Execution order: after 23_catalog_requests_rpc.sql

-- ---------------------------------------------------------------------------
-- create_search_ticket_from_job
-- Notes:
-- - Authenticated clients can create a search ticket only for their own job.
-- - Derives service_label, zone and radius_km server-side from the job.
-- - Never reads or writes exact_location / exact_lat / exact_lng.
-- - Prevents duplicate active tickets for the same job and reason.
-- ---------------------------------------------------------------------------

create or replace function public.create_search_ticket_from_job(
  p_job_id uuid,
  p_reason public.search_ticket_reason
)
returns table (
  result_ticket_id uuid,
  result_job_id uuid,
  result_client_id uuid,
  result_service_label text,
  result_zone text,
  result_radius_km integer,
  result_reason public.search_ticket_reason,
  result_status public.search_ticket_status,
  result_created_at timestamptz,
  result_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_job public.jobs%rowtype;
  v_ticket public.search_tickets%rowtype;
  v_service_label text;
  v_zone text;
  v_radius_km integer;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'client' then
    raise exception 'Only clients can create search tickets from jobs.';
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
    raise exception 'Only the client owner can create a search ticket for job %.', p_job_id;
  end if;

  if p_reason not in ('no_pros_in_zone', 'no_useful_response', 'other') then
    raise exception 'Search ticket reason is invalid.';
  end if;

  if exists (
    select 1
    from public.search_tickets as t
    where t.job_id = v_job.id
      and t.reason = p_reason
      and t.status in ('open', 'in_progress')
  ) then
    select *
    into v_ticket
    from public.search_tickets as t
    where t.job_id = v_job.id
      and t.reason = p_reason
      and t.status in ('open', 'in_progress')
    order by t.created_at desc
    limit 1;

    return query
    select
      v_ticket.id,
      v_ticket.job_id,
      v_ticket.client_id,
      v_ticket.service_label,
      v_ticket.zone,
      v_ticket.radius_km,
      v_ticket.reason,
      v_ticket.status,
      v_ticket.created_at,
      v_ticket.updated_at;
    return;
  end if;

  select
    coalesce(cs.name, cc.name, nullif(btrim(v_job.title), '')),
    nullif(btrim(v_job.approx_location), ''),
    case
      when v_job.approx_radius_m is null then null
      else greatest(0, ceil(v_job.approx_radius_m::numeric / 1000.0)::integer)
    end
  into v_service_label, v_zone, v_radius_km
  from public.jobs as j
  left join public.catalog_services as cs
    on cs.id = j.service_id
  left join public.catalog_categories as cc
    on cc.id = j.category_id
  where j.id = v_job.id;

  insert into public.search_tickets (
    job_id,
    client_id,
    service_label,
    zone,
    radius_km,
    reason,
    status,
    updated_at
  )
  values (
    v_job.id,
    v_current_user_id,
    v_service_label,
    v_zone,
    v_radius_km,
    p_reason,
    'open',
    now()
  )
  returning * into v_ticket;

  return query
  select
    v_ticket.id,
    v_ticket.job_id,
    v_ticket.client_id,
    v_ticket.service_label,
    v_ticket.zone,
    v_ticket.radius_km,
    v_ticket.reason,
    v_ticket.status,
    v_ticket.created_at,
    v_ticket.updated_at;
end;
$function$;

-- ---------------------------------------------------------------------------
-- update_search_ticket_status
-- Notes:
-- - Admin-only.
-- - Updates ticket status using the existing enum values.
-- - Keeps updated_at in sync.
-- ---------------------------------------------------------------------------

create or replace function public.update_search_ticket_status(
  p_ticket_id uuid,
  p_status public.search_ticket_status
)
returns table (
  result_ticket_id uuid,
  result_job_id uuid,
  result_client_id uuid,
  result_service_label text,
  result_zone text,
  result_radius_km integer,
  result_reason public.search_ticket_reason,
  result_status public.search_ticket_status,
  result_created_at timestamptz,
  result_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_ticket public.search_tickets%rowtype;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'admin' then
    raise exception 'Only admins can update search ticket status.';
  end if;

  select *
  into v_ticket
  from public.search_tickets
  where id = p_ticket_id
  for update;

  if not found then
    raise exception 'Search ticket % does not exist.', p_ticket_id;
  end if;

  update public.search_tickets
  set status = p_status,
      updated_at = now()
  where id = v_ticket.id
  returning * into v_ticket;

  return query
  select
    v_ticket.id,
    v_ticket.job_id,
    v_ticket.client_id,
    v_ticket.service_label,
    v_ticket.zone,
    v_ticket.radius_km,
    v_ticket.reason,
    v_ticket.status,
    v_ticket.created_at,
    v_ticket.updated_at;
end;
$function$;

revoke all on function public.create_search_ticket_from_job(uuid, public.search_ticket_reason) from public;
revoke all on function public.create_search_ticket_from_job(uuid, public.search_ticket_reason) from anon;
revoke all on function public.create_search_ticket_from_job(uuid, public.search_ticket_reason) from authenticated;

revoke all on function public.update_search_ticket_status(uuid, public.search_ticket_status) from public;
revoke all on function public.update_search_ticket_status(uuid, public.search_ticket_status) from anon;
revoke all on function public.update_search_ticket_status(uuid, public.search_ticket_status) from authenticated;
