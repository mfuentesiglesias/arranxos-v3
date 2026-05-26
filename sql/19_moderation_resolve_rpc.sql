-- ARRANXOS v3 - Supabase Phase 1
-- File: 19_moderation_resolve_rpc.sql
-- Purpose: Admin-only resolution of moderation flags without applying a strike.
-- Execution order: after 18_moderation_strike_rpc.sql

-- ---------------------------------------------------------------------------
-- resolve_moderation_flag
-- Notes:
-- - Admin-only.
-- - Idempotent: a flag can only be resolved once without a strike.
-- - Does NOT touch professionals.strike_count.
-- - Does NOT refresh reliability_snapshot.
-- - Compatible with a later apply_moderation_strike call (which uses
--   coalesce(resolved_at, now()) and only checks strike_applied).
-- - Distinguishes three states:
--     pending:          strike_applied = false AND resolved_at IS NULL
--     resolved no strike: strike_applied = false AND resolved_at IS NOT NULL
--     strike applied:   strike_applied = true  AND resolved_at IS NOT NULL
-- ---------------------------------------------------------------------------

create or replace function public.resolve_moderation_flag(
  p_flag_id uuid
)
returns table (
  result_flag_id uuid,
  result_resolved_at timestamptz,
  result_already_resolved boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_flag public.moderation_flags%rowtype;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'admin' then
    raise exception 'Only admins can resolve moderation flags.';
  end if;

  select *
  into v_flag
  from public.moderation_flags
  where id = p_flag_id
  for update;

  if not found then
    raise exception 'Moderation flag % does not exist.', p_flag_id;
  end if;

  if v_flag.resolved_at is not null then
    return query
    select
      v_flag.id,
      v_flag.resolved_at,
      true;
    return;
  end if;

  update public.moderation_flags
  set resolved_at = now()
  where id = v_flag.id
  returning * into v_flag;

  return query
  select
    v_flag.id,
    v_flag.resolved_at,
    false;
end;
$function$;
