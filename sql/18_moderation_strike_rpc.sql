-- ARRANXOS v3 - Supabase Phase 1
-- File: 18_moderation_strike_rpc.sql
-- Purpose: Real admin-only strike application for moderation flags.
-- Execution order: after 17_reliability_autorefresh.sql

-- ---------------------------------------------------------------------------
-- apply_moderation_strike
-- Notes:
-- - Admin-only.
-- - Idempotent: a flag can only apply one strike once.
-- - Only increments professionals.strike_count when the flagged actor is a
--   professional profile.
-- - Refreshes the professional reliability snapshot after the strike is applied.
-- ---------------------------------------------------------------------------

create or replace function public.apply_moderation_strike(
  p_flag_id uuid
)
returns table (
  result_flag_id uuid,
  result_message_id uuid,
  result_actor_profile_id uuid,
  result_actor_role text,
  result_professional_id uuid,
  result_strike_applied boolean,
  result_already_applied boolean,
  result_strike_count integer,
  result_reliability_snapshot jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_flag public.moderation_flags%rowtype;
  v_professional public.professionals%rowtype;
  v_professional_id uuid := null;
  v_reliability_snapshot jsonb := null;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'admin' then
    raise exception 'Only admins can apply moderation strikes.';
  end if;

  select *
  into v_flag
  from public.moderation_flags
  where id = p_flag_id
  for update;

  if not found then
    raise exception 'Moderation flag % does not exist.', p_flag_id;
  end if;

  if v_flag.sender_role = 'professional' then
    if v_flag.sender_profile_id is null then
      raise exception 'Moderation flag % does not have a sender_profile_id for the professional strike.', p_flag_id;
    end if;

    v_professional_id := v_flag.sender_profile_id;

    select *
    into v_professional
    from public.professionals
    where profile_id = v_professional_id
    for update;

    if not found then
      raise exception 'Professional % for moderation flag % does not exist.', v_professional_id, p_flag_id;
    end if;
  end if;

  if v_flag.strike_applied then
    return query
    select
      v_flag.id,
      v_flag.chat_message_id,
      v_flag.sender_profile_id,
      v_flag.sender_role::text,
      v_professional_id,
      true,
      true,
      case when v_professional_id is not null then v_professional.strike_count else null end,
      case when v_professional_id is not null then v_professional.reliability_snapshot else null end;
    return;
  end if;

  update public.moderation_flags
  set strike_applied = true,
      resolved_at = coalesce(resolved_at, now())
  where id = v_flag.id
  returning * into v_flag;

  if v_professional_id is not null then
    update public.professionals
    set strike_count = strike_count + 1
    where profile_id = v_professional_id
    returning * into v_professional;

    select result_snapshot
    into v_reliability_snapshot
    from public.refresh_professional_reliability_snapshot(v_professional_id);
  end if;

  return query
  select
    v_flag.id,
    v_flag.chat_message_id,
    v_flag.sender_profile_id,
    v_flag.sender_role::text,
    v_professional_id,
    v_flag.strike_applied,
    false,
    case when v_professional_id is not null then v_professional.strike_count else null end,
    v_reliability_snapshot;
end;
$function$;
