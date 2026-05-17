-- ARRANXOS v3 - Supabase Phase 1
-- File: 06_profile_bootstrap_rpc.sql
-- Purpose: Safe self-bootstrap RPC for client/professional profile creation.
-- Execution order: 7 of 7
--
-- IMPORTANT:
-- - Do NOT execute SQL that has not been reviewed.
-- - SQL in this repository must be non-destructive by default.
-- - Do NOT use destructive DROP statements unless they are in a dedicated file
--   and explicitly approved in review.
--
-- NOTES:
-- - This file assumes sql/00_schema.sql through sql/05_grants.sql have already
--   been executed.
-- - The RPC is SECURITY DEFINER so frontend callers do not need direct INSERT
--   grants on profiles/professionals/professional_services.
-- - The RPC is intentionally bootstrap-only. It does not serve as a profile
--   edit endpoint and must not reset professional status or rewrite service
--   mappings on retries.

create or replace function public.bootstrap_own_profile(
  p_role public.profile_role,
  p_full_name text,
  p_avatar_initials text default null,
  p_location_label text default null,
  p_phone text default null,
  p_professional_slug text default null,
  p_specialty_label text default null,
  p_zone text default null,
  p_radius_km integer default null,
  p_bio text default null,
  p_service_ids uuid[] default '{}'::uuid[]
)
returns table (
  result_profile_id uuid,
  result_role public.profile_role,
  result_professional_status public.professional_status,
  result_full_name text,
  result_avatar_initials text,
  result_location_label text,
  result_phone text,
  result_created_profile boolean,
  result_created_professional boolean,
  result_linked_service_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_full_name text := nullif(btrim(p_full_name), '');
  v_avatar_initials text := nullif(btrim(p_avatar_initials), '');
  v_location_label text := nullif(btrim(p_location_label), '');
  v_phone text := nullif(btrim(p_phone), '');
  v_requested_slug text := nullif(lower(btrim(p_professional_slug)), '');
  v_specialty_label text := nullif(btrim(p_specialty_label), '');
  v_zone text := nullif(btrim(p_zone), '');
  v_bio text := nullif(btrim(p_bio), '');
  v_professional_slug text;
  v_service_ids uuid[] := '{}'::uuid[];
  v_invalid_service_ids uuid[] := '{}'::uuid[];
  v_profile public.profiles%rowtype;
  v_professional public.professionals%rowtype;
  v_created_profile boolean := false;
  v_created_professional boolean := false;
  v_linked_service_count integer := 0;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('bootstrap_own_profile'),
    hashtext(v_current_user_id::text)
  );

  if p_role is null then
    raise exception 'bootstrap_own_profile() requires a role.';
  end if;

  if p_role = 'admin' then
    raise exception 'bootstrap_own_profile() does not allow admin registration.';
  end if;

  if p_role not in ('client'::public.profile_role, 'professional'::public.profile_role) then
    raise exception 'bootstrap_own_profile() only accepts client or professional roles.';
  end if;

  if v_full_name is null then
    raise exception 'bootstrap_own_profile() requires a non-empty full_name.';
  end if;

  if char_length(v_full_name) > 120 then
    raise exception 'full_name exceeds the maximum length of 120 characters.';
  end if;

  if v_avatar_initials is not null and char_length(v_avatar_initials) > 16 then
    raise exception 'avatar_initials exceeds the maximum length of 16 characters.';
  end if;

  if v_location_label is not null and char_length(v_location_label) > 120 then
    raise exception 'location_label exceeds the maximum length of 120 characters.';
  end if;

  if v_phone is not null and char_length(v_phone) > 40 then
    raise exception 'phone exceeds the maximum length of 40 characters.';
  end if;

  if p_radius_km is not null and p_radius_km < 0 then
    raise exception 'radius_km must be null or greater than or equal to 0.';
  end if;

  select coalesce(array_agg(service_id order by first_ord), '{}'::uuid[])
  into v_service_ids
  from (
    select service_id, min(ord)::bigint as first_ord
    from unnest(coalesce(p_service_ids, '{}'::uuid[])) with ordinality as requested(service_id, ord)
    where service_id is not null
    group by service_id
  ) as deduped_services;

  if p_role = 'client' then
    if v_requested_slug is not null
      or v_specialty_label is not null
      or v_zone is not null
      or p_radius_km is not null
      or v_bio is not null
      or cardinality(v_service_ids) > 0
    then
      raise exception 'Client bootstrap does not accept professional-only fields.';
    end if;
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_current_user_id;

  if found then
    if v_profile.role <> p_role then
      raise exception 'Existing profile role % does not match requested role %.', v_profile.role, p_role;
    end if;
  else
    insert into public.profiles (
      id,
      role,
      full_name,
      avatar_initials,
      location_label,
      phone
    )
    values (
      v_current_user_id,
      p_role,
      v_full_name,
      v_avatar_initials,
      v_location_label,
      v_phone
    )
    returning * into v_profile;

    v_created_profile := true;
  end if;

  if p_role = 'professional' then
    select *
    into v_professional
    from public.professionals
    where profile_id = v_current_user_id;

    if found then
      select count(*)
      into v_linked_service_count
      from public.professional_services
      where professional_id = v_current_user_id;

      return query
      select
        v_profile.id,
        v_profile.role,
        v_professional.status,
        v_profile.full_name,
        v_profile.avatar_initials,
        v_profile.location_label,
        v_profile.phone,
        v_created_profile,
        false,
        v_linked_service_count;

      return;
    end if;

    if v_requested_slug is not null then
      v_professional_slug := regexp_replace(v_requested_slug, '[^a-z0-9]+', '-', 'g');
      v_professional_slug := regexp_replace(v_professional_slug, '^-+', '');
      v_professional_slug := regexp_replace(v_professional_slug, '-+$', '');
      v_professional_slug := regexp_replace(v_professional_slug, '-{2,}', '-', 'g');

      if v_professional_slug = '' then
        raise exception 'professional_slug is invalid after sanitization.';
      end if;
    else
      v_professional_slug := 'pro-' || replace(v_current_user_id::text, '-', '');
    end if;

    if char_length(v_professional_slug) < 3 or char_length(v_professional_slug) > 80 then
      raise exception 'professional_slug must be between 3 and 80 characters.';
    end if;

    if v_specialty_label is not null and char_length(v_specialty_label) > 120 then
      raise exception 'specialty_label exceeds the maximum length of 120 characters.';
    end if;

    if v_zone is not null and char_length(v_zone) > 120 then
      raise exception 'zone exceeds the maximum length of 120 characters.';
    end if;

    if v_bio is not null and char_length(v_bio) > 2000 then
      raise exception 'bio exceeds the maximum length of 2000 characters.';
    end if;

    if cardinality(v_service_ids) > 0 then
      select coalesce(array_agg(requested.service_id order by requested.first_ord), '{}'::uuid[])
      into v_invalid_service_ids
      from (
        select service_id, min(ord)::bigint as first_ord
        from unnest(v_service_ids) with ordinality as input_ids(service_id, ord)
        group by service_id
      ) as requested
      left join public.catalog_services as cs
        on cs.id = requested.service_id
       and cs.active = true
      where cs.id is null;

      if cardinality(v_invalid_service_ids) > 0 then
        raise exception 'All professional service_ids must exist and be active. Invalid ids: %', v_invalid_service_ids;
      end if;
    end if;

    if exists (
      select 1
      from public.professionals as existing_professional
      where existing_professional.slug = v_professional_slug
        and existing_professional.profile_id <> v_current_user_id
    ) then
      raise exception 'Professional slug % is already in use.', v_professional_slug;
    end if;

    insert into public.professionals (
      profile_id,
      status,
      verification_status,
      slug,
      public_profile_enabled,
      specialty_label,
      zone,
      radius_km,
      bio,
      strike_count,
      reliability_snapshot
    )
    values (
      v_current_user_id,
      'pending',
      'not_verified',
      v_professional_slug,
      false,
      v_specialty_label,
      v_zone,
      p_radius_km,
      v_bio,
      0,
      null
    )
    returning * into v_professional;

    v_created_professional := true;

    if cardinality(v_service_ids) > 0 then
      insert into public.professional_services (
        professional_id,
        service_id,
        is_primary
      )
      select
        v_current_user_id,
        selected_service.service_id,
        selected_service.ord = 1
      from unnest(v_service_ids) with ordinality as selected_service(service_id, ord);
    end if;

    select count(*)
    into v_linked_service_count
    from public.professional_services
    where professional_id = v_current_user_id;
  end if;

  return query
  select
    v_profile.id,
    v_profile.role,
    case
      when v_profile.role = 'professional' then v_professional.status
      else null::public.professional_status
    end,
    v_profile.full_name,
    v_profile.avatar_initials,
    v_profile.location_label,
    v_profile.phone,
    v_created_profile,
    v_created_professional,
    v_linked_service_count;
end;
$function$;

revoke all on function public.bootstrap_own_profile(
  public.profile_role,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  uuid[]
) from public;

grant execute on function public.bootstrap_own_profile(
  public.profile_role,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  uuid[]
) to authenticated;
