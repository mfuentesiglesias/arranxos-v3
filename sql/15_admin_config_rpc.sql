-- ARRANXOS v3 - Supabase Phase 1
-- File: 15_admin_config_rpc.sql
-- Purpose: Real admin_config RPCs for global admin settings.
-- Execution order: after 14_reviews_rls.sql

-- ---------------------------------------------------------------------------
-- get_admin_config
-- Notes:
-- - Admin-only read access through SECURITY DEFINER.
-- - Bootstraps the singleton global row if it does not exist yet.
-- ---------------------------------------------------------------------------

create or replace function public.get_admin_config()
returns table (
  result_id text,
  result_commission_pct integer,
  result_auto_release_days integer,
  result_invitation_limit_per_job integer,
  result_search_ticket_no_response_days integer,
  result_strike_auto_block_threshold integer,
  result_anti_leak_enabled boolean,
  result_anti_leak_rules jsonb,
  result_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'admin' then
    raise exception 'Only admins can read admin config.';
  end if;

  insert into public.admin_config (id)
  values ('global')
  on conflict (id) do nothing;

  return query
  select
    c.id,
    c.commission_pct::integer,
    c.auto_release_days,
    c.invitation_limit_per_job,
    c.search_ticket_no_response_days,
    c.strike_auto_block_threshold,
    c.anti_leak_enabled,
    jsonb_build_object(
      'phones', c.anti_leak_phones,
      'emails', c.anti_leak_emails,
      'urls', c.anti_leak_urls,
      'whatsapp', c.anti_leak_whatsapp
    ),
    c.updated_at
  from public.admin_config as c
  where c.id = 'global';
end;
$function$;

-- ---------------------------------------------------------------------------
-- update_admin_config
-- Notes:
-- - Admin-only write access through SECURITY DEFINER.
-- - Bootstraps the singleton global row if it does not exist yet.
-- - Only updates fields explicitly passed as non-null.
-- ---------------------------------------------------------------------------

create or replace function public.update_admin_config(
  p_commission_pct integer default null,
  p_auto_release_days integer default null,
  p_invitation_limit_per_job integer default null,
  p_search_ticket_no_response_days integer default null,
  p_strike_auto_block_threshold integer default null,
  p_anti_leak_enabled boolean default null,
  p_anti_leak_rules jsonb default null
)
returns table (
  result_id text,
  result_commission_pct integer,
  result_auto_release_days integer,
  result_invitation_limit_per_job integer,
  result_search_ticket_no_response_days integer,
  result_strike_auto_block_threshold integer,
  result_anti_leak_enabled boolean,
  result_anti_leak_rules jsonb,
  result_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'admin' then
    raise exception 'Only admins can update admin config.';
  end if;

  if p_commission_pct is not null and (p_commission_pct < 0 or p_commission_pct > 100) then
    raise exception 'Admin config commission_pct must be between 0 and 100.';
  end if;

  if p_auto_release_days is not null and p_auto_release_days <= 0 then
    raise exception 'Admin config auto_release_days must be greater than zero.';
  end if;

  if p_invitation_limit_per_job is not null and p_invitation_limit_per_job <= 0 then
    raise exception 'Admin config invitation_limit_per_job must be greater than zero.';
  end if;

  if p_search_ticket_no_response_days is not null and p_search_ticket_no_response_days <= 0 then
    raise exception 'Admin config search_ticket_no_response_days must be greater than zero.';
  end if;

  if p_strike_auto_block_threshold is not null and p_strike_auto_block_threshold <= 0 then
    raise exception 'Admin config strike_auto_block_threshold must be greater than zero.';
  end if;

  if p_anti_leak_rules is not null and jsonb_typeof(p_anti_leak_rules) <> 'object' then
    raise exception 'Admin config anti_leak_rules must be a JSON object.';
  end if;

  if p_anti_leak_rules ? 'phones' and jsonb_typeof(p_anti_leak_rules -> 'phones') <> 'boolean' then
    raise exception 'Admin config anti_leak_rules.phones must be boolean.';
  end if;

  if p_anti_leak_rules ? 'emails' and jsonb_typeof(p_anti_leak_rules -> 'emails') <> 'boolean' then
    raise exception 'Admin config anti_leak_rules.emails must be boolean.';
  end if;

  if p_anti_leak_rules ? 'urls' and jsonb_typeof(p_anti_leak_rules -> 'urls') <> 'boolean' then
    raise exception 'Admin config anti_leak_rules.urls must be boolean.';
  end if;

  if p_anti_leak_rules ? 'whatsapp' and jsonb_typeof(p_anti_leak_rules -> 'whatsapp') <> 'boolean' then
    raise exception 'Admin config anti_leak_rules.whatsapp must be boolean.';
  end if;

  insert into public.admin_config (id)
  values ('global')
  on conflict (id) do nothing;

  update public.admin_config
  set commission_pct = coalesce(p_commission_pct, commission_pct),
      auto_release_days = coalesce(p_auto_release_days, auto_release_days),
      invitation_limit_per_job = coalesce(p_invitation_limit_per_job, invitation_limit_per_job),
      search_ticket_no_response_days = coalesce(p_search_ticket_no_response_days, search_ticket_no_response_days),
      strike_auto_block_threshold = coalesce(p_strike_auto_block_threshold, strike_auto_block_threshold),
      anti_leak_enabled = coalesce(p_anti_leak_enabled, anti_leak_enabled),
      anti_leak_phones = case
        when p_anti_leak_rules ? 'phones' then (p_anti_leak_rules ->> 'phones')::boolean
        else anti_leak_phones
      end,
      anti_leak_emails = case
        when p_anti_leak_rules ? 'emails' then (p_anti_leak_rules ->> 'emails')::boolean
        else anti_leak_emails
      end,
      anti_leak_urls = case
        when p_anti_leak_rules ? 'urls' then (p_anti_leak_rules ->> 'urls')::boolean
        else anti_leak_urls
      end,
      anti_leak_whatsapp = case
        when p_anti_leak_rules ? 'whatsapp' then (p_anti_leak_rules ->> 'whatsapp')::boolean
        else anti_leak_whatsapp
      end,
      updated_at = now()
  where id = 'global';

  return query
  select
    c.id,
    c.commission_pct::integer,
    c.auto_release_days,
    c.invitation_limit_per_job,
    c.search_ticket_no_response_days,
    c.strike_auto_block_threshold,
    c.anti_leak_enabled,
    jsonb_build_object(
      'phones', c.anti_leak_phones,
      'emails', c.anti_leak_emails,
      'urls', c.anti_leak_urls,
      'whatsapp', c.anti_leak_whatsapp
    ),
    c.updated_at
  from public.admin_config as c
  where c.id = 'global';
end;
$function$;
