-- ARRANXOS v3 - Supabase Phase 1
-- File: 23_catalog_requests_rpc.sql
-- Purpose: Real catalog request RPCs for requester and admin review flows.
-- Execution order: after 22_pg_cron_schedule.sql

-- ---------------------------------------------------------------------------
-- create_catalog_request
-- Notes:
-- - Authenticated clients and professionals can submit catalog requests.
-- - Prevents obvious duplicates against active requests and existing services.
-- - The requester is always derived from auth.uid() and current_profile_role().
-- ---------------------------------------------------------------------------

create or replace function public.create_catalog_request(
  p_requested_name text,
  p_suggested_category_id uuid default null,
  p_suggested_category_name text default null,
  p_description text default null
)
returns table (
  result_request_id uuid,
  result_requested_name text,
  result_suggested_category_id uuid,
  result_suggested_category_name text,
  result_description text,
  result_requested_by_profile_id uuid,
  result_requested_by_role public.profile_role,
  result_status public.catalog_request_status,
  result_created_at timestamptz,
  result_reviewed_at timestamptz,
  result_reviewed_by_admin_id uuid,
  result_rejection_reason text,
  result_merged_into_service_id uuid,
  result_approved_service_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_requested_name text := regexp_replace(btrim(coalesce(p_requested_name, '')), '\s+', ' ', 'g');
  v_requested_name_normalized text;
  v_suggested_category_name text := nullif(regexp_replace(btrim(coalesce(p_suggested_category_name, '')), '\s+', ' ', 'g'), '');
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_request public.catalog_requests%rowtype;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role not in ('client', 'professional') then
    raise exception 'Only clients or professionals can create catalog requests.';
  end if;

  if v_requested_name = '' then
    raise exception 'Catalog request requested_name is required.';
  end if;

  if char_length(v_requested_name) > 160 then
    raise exception 'Catalog request requested_name must contain at most 160 characters.';
  end if;

  if v_description is not null and char_length(v_description) > 2000 then
    raise exception 'Catalog request description must contain at most 2000 characters.';
  end if;

  if p_suggested_category_id is not null and not exists (
    select 1
    from public.catalog_categories
    where id = p_suggested_category_id
  ) then
    raise exception 'Suggested catalog category % does not exist.', p_suggested_category_id;
  end if;

  v_requested_name_normalized := lower(v_requested_name);

  if exists (
    select 1
    from public.catalog_services as s
    where lower(regexp_replace(btrim(s.name), '\s+', ' ', 'g')) = v_requested_name_normalized
  ) then
    raise exception 'Catalog service % already exists.', v_requested_name;
  end if;

  if exists (
    select 1
    from public.catalog_requests as r
    where lower(regexp_replace(btrim(r.requested_name), '\s+', ' ', 'g')) = v_requested_name_normalized
      and r.status in ('pending', 'reviewing')
  ) then
    raise exception 'Catalog request % already exists and remains active.', v_requested_name;
  end if;

  insert into public.catalog_requests (
    requested_name,
    suggested_category_id,
    suggested_category_name,
    description,
    requested_by_profile_id,
    requested_by_role,
    status
  )
  values (
    v_requested_name,
    p_suggested_category_id,
    v_suggested_category_name,
    v_description,
    v_current_user_id,
    v_current_role,
    'pending'
  )
  returning * into v_request;

  return query
  select
    v_request.id,
    v_request.requested_name,
    v_request.suggested_category_id,
    v_request.suggested_category_name,
    v_request.description,
    v_request.requested_by_profile_id,
    v_request.requested_by_role,
    v_request.status,
    v_request.created_at,
    v_request.reviewed_at,
    v_request.reviewed_by_admin_id,
    v_request.rejection_reason,
    v_request.merged_into_service_id,
    v_request.approved_service_id;
end;
$function$;

-- ---------------------------------------------------------------------------
-- approve_catalog_request
-- Notes:
-- - Admin-only.
-- - Can use an existing category or create a new admin-approved category.
-- - Creates the approved admin-approved service transactionally.
-- ---------------------------------------------------------------------------

create or replace function public.approve_catalog_request(
  p_request_id uuid,
  p_category_id uuid default null,
  p_category_name text default null,
  p_service_name text default null,
  p_category_group_name text default null
)
returns table (
  result_request_id uuid,
  result_requested_name text,
  result_suggested_category_id uuid,
  result_suggested_category_name text,
  result_description text,
  result_requested_by_profile_id uuid,
  result_requested_by_role public.profile_role,
  result_status public.catalog_request_status,
  result_created_at timestamptz,
  result_reviewed_at timestamptz,
  result_reviewed_by_admin_id uuid,
  result_rejection_reason text,
  result_merged_into_service_id uuid,
  result_approved_service_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_request public.catalog_requests%rowtype;
  v_category public.catalog_categories%rowtype;
  v_service public.catalog_services%rowtype;
  v_category_found boolean := false;
  v_category_name text := nullif(regexp_replace(btrim(coalesce(p_category_name, '')), '\s+', ' ', 'g'), '');
  v_service_name text := regexp_replace(
    btrim(coalesce(p_service_name, '')),
    '\s+',
    ' ',
    'g'
  );
  v_category_group_name text := nullif(regexp_replace(btrim(coalesce(p_category_group_name, '')), '\s+', ' ', 'g'), '');
  v_now timestamptz := now();
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'admin' then
    raise exception 'Only admins can approve catalog requests.';
  end if;

  select *
  into v_request
  from public.catalog_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Catalog request % does not exist.', p_request_id;
  end if;

  if v_request.status not in ('pending', 'reviewing') then
    raise exception 'Catalog request % is not reviewable.', p_request_id;
  end if;

  if v_service_name = '' then
    v_service_name := regexp_replace(btrim(v_request.requested_name), '\s+', ' ', 'g');
  end if;

  if v_service_name = '' then
    raise exception 'Catalog request % requires a final service name.', p_request_id;
  end if;

  if char_length(v_service_name) > 160 then
    raise exception 'Catalog approved service name must contain at most 160 characters.';
  end if;

  if p_category_id is not null then
    select *
    into v_category
    from public.catalog_categories
    where id = p_category_id;

    if not found then
      raise exception 'Catalog category % does not exist.', p_category_id;
    end if;

    if v_category_name is not null and lower(regexp_replace(btrim(v_category.name), '\s+', ' ', 'g')) <> lower(v_category_name) then
      raise exception 'Catalog category % does not match the provided category name.', p_category_id;
    end if;

    v_category_found := true;
  else
    if v_category_name is not null then
      select *
      into v_category
      from public.catalog_categories as c
      where lower(regexp_replace(btrim(c.name), '\s+', ' ', 'g')) = lower(v_category_name)
      limit 1;

      if found then
        v_category_found := true;
      end if;
    elsif v_request.suggested_category_id is not null then
      select *
      into v_category
      from public.catalog_categories
      where id = v_request.suggested_category_id;

      if found then
        v_category_found := true;
      end if;
    end if;

    if not v_category_found then
      if v_category_name is null then
        v_category_name := nullif(regexp_replace(btrim(coalesce(v_request.suggested_category_name, '')), '\s+', ' ', 'g'), '');
      end if;

      if v_category_name is null then
        raise exception 'Catalog request % requires a category selection or a new category name.', p_request_id;
      end if;

      select *
      into v_category
      from public.catalog_categories as c
      where lower(regexp_replace(btrim(c.name), '\s+', ' ', 'g')) = lower(v_category_name)
      limit 1;

      if found then
        v_category_found := true;
      else
        insert into public.catalog_categories (
          name,
          group_name,
          active,
          source,
          created_from_request_id
        )
        values (
          v_category_name,
          v_category_group_name,
          true,
          'admin_approved',
          v_request.id
        )
        returning * into v_category;

        v_category_found := true;
      end if;
    end if;
  end if;

  if not v_category_found or v_category.id is null then
    raise exception 'Catalog request % could not resolve a valid category.', p_request_id;
  end if;

  if exists (
    select 1
    from public.catalog_services
    where lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) = lower(v_service_name)
  ) then
    raise exception 'Catalog service % already exists.', v_service_name;
  end if;

  insert into public.catalog_services (
    category_id,
    name,
    description,
    aliases,
    active,
    source,
    created_from_request_id
  )
  values (
    v_category.id,
    v_service_name,
    v_request.description,
    '{}'::text[],
    true,
    'admin_approved',
    v_request.id
  )
  returning * into v_service;

  update public.catalog_requests
  set suggested_category_id = v_category.id,
      suggested_category_name = v_category.name,
      status = 'approved',
      reviewed_at = v_now,
      reviewed_by_admin_id = v_current_user_id,
      rejection_reason = null,
      merged_into_service_id = null,
      approved_service_id = v_service.id
  where id = v_request.id
  returning * into v_request;

  return query
  select
    v_request.id,
    v_request.requested_name,
    v_request.suggested_category_id,
    v_request.suggested_category_name,
    v_request.description,
    v_request.requested_by_profile_id,
    v_request.requested_by_role,
    v_request.status,
    v_request.created_at,
    v_request.reviewed_at,
    v_request.reviewed_by_admin_id,
    v_request.rejection_reason,
    v_request.merged_into_service_id,
    v_request.approved_service_id;
end;
$function$;

-- ---------------------------------------------------------------------------
-- reject_catalog_request
-- Notes:
-- - Admin-only.
-- - Marks the request as rejected and stores an optional reason.
-- ---------------------------------------------------------------------------

create or replace function public.reject_catalog_request(
  p_request_id uuid,
  p_rejection_reason text default null
)
returns table (
  result_request_id uuid,
  result_requested_name text,
  result_suggested_category_id uuid,
  result_suggested_category_name text,
  result_description text,
  result_requested_by_profile_id uuid,
  result_requested_by_role public.profile_role,
  result_status public.catalog_request_status,
  result_created_at timestamptz,
  result_reviewed_at timestamptz,
  result_reviewed_by_admin_id uuid,
  result_rejection_reason text,
  result_merged_into_service_id uuid,
  result_approved_service_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_request public.catalog_requests%rowtype;
  v_rejection_reason text := nullif(btrim(coalesce(p_rejection_reason, '')), '');
  v_now timestamptz := now();
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'admin' then
    raise exception 'Only admins can reject catalog requests.';
  end if;

  select *
  into v_request
  from public.catalog_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Catalog request % does not exist.', p_request_id;
  end if;

  if v_request.status not in ('pending', 'reviewing') then
    raise exception 'Catalog request % is not reviewable.', p_request_id;
  end if;

  update public.catalog_requests
  set status = 'rejected',
      reviewed_at = v_now,
      reviewed_by_admin_id = v_current_user_id,
      rejection_reason = coalesce(v_rejection_reason, 'Solicitud rechazada por admin.'),
      merged_into_service_id = null,
      approved_service_id = null
  where id = v_request.id
  returning * into v_request;

  return query
  select
    v_request.id,
    v_request.requested_name,
    v_request.suggested_category_id,
    v_request.suggested_category_name,
    v_request.description,
    v_request.requested_by_profile_id,
    v_request.requested_by_role,
    v_request.status,
    v_request.created_at,
    v_request.reviewed_at,
    v_request.reviewed_by_admin_id,
    v_request.rejection_reason,
    v_request.merged_into_service_id,
    v_request.approved_service_id;
end;
$function$;

-- ---------------------------------------------------------------------------
-- merge_catalog_request
-- Notes:
-- - Admin-only.
-- - Marks the request as merged into an existing service.
-- ---------------------------------------------------------------------------

create or replace function public.merge_catalog_request(
  p_request_id uuid,
  p_service_id uuid
)
returns table (
  result_request_id uuid,
  result_requested_name text,
  result_suggested_category_id uuid,
  result_suggested_category_name text,
  result_description text,
  result_requested_by_profile_id uuid,
  result_requested_by_role public.profile_role,
  result_status public.catalog_request_status,
  result_created_at timestamptz,
  result_reviewed_at timestamptz,
  result_reviewed_by_admin_id uuid,
  result_rejection_reason text,
  result_merged_into_service_id uuid,
  result_approved_service_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_request public.catalog_requests%rowtype;
  v_service public.catalog_services%rowtype;
  v_category public.catalog_categories%rowtype;
  v_now timestamptz := now();
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'admin' then
    raise exception 'Only admins can merge catalog requests.';
  end if;

  select *
  into v_request
  from public.catalog_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Catalog request % does not exist.', p_request_id;
  end if;

  if v_request.status not in ('pending', 'reviewing') then
    raise exception 'Catalog request % is not reviewable.', p_request_id;
  end if;

  select *
  into v_service
  from public.catalog_services
  where id = p_service_id
    and active = true;

  if not found then
    raise exception 'Catalog service % does not exist or is inactive.', p_service_id;
  end if;

  select *
  into v_category
  from public.catalog_categories
  where id = v_service.category_id;

  update public.catalog_requests
  set status = 'merged',
      reviewed_at = v_now,
      reviewed_by_admin_id = v_current_user_id,
      rejection_reason = null,
      suggested_category_id = v_category.id,
      suggested_category_name = v_category.name,
      merged_into_service_id = v_service.id,
      approved_service_id = null
  where id = v_request.id
  returning * into v_request;

  return query
  select
    v_request.id,
    v_request.requested_name,
    v_request.suggested_category_id,
    v_request.suggested_category_name,
    v_request.description,
    v_request.requested_by_profile_id,
    v_request.requested_by_role,
    v_request.status,
    v_request.created_at,
    v_request.reviewed_at,
    v_request.reviewed_by_admin_id,
    v_request.rejection_reason,
    v_request.merged_into_service_id,
    v_request.approved_service_id;
end;
$function$;

revoke all on function public.create_catalog_request(text, uuid, text, text) from public;
revoke all on function public.create_catalog_request(text, uuid, text, text) from anon;
revoke all on function public.create_catalog_request(text, uuid, text, text) from authenticated;

revoke all on function public.approve_catalog_request(uuid, uuid, text, text, text) from public;
revoke all on function public.approve_catalog_request(uuid, uuid, text, text, text) from anon;
revoke all on function public.approve_catalog_request(uuid, uuid, text, text, text) from authenticated;

revoke all on function public.reject_catalog_request(uuid, text) from public;
revoke all on function public.reject_catalog_request(uuid, text) from anon;
revoke all on function public.reject_catalog_request(uuid, text) from authenticated;

revoke all on function public.merge_catalog_request(uuid, uuid) from public;
revoke all on function public.merge_catalog_request(uuid, uuid) from anon;
revoke all on function public.merge_catalog_request(uuid, uuid) from authenticated;
