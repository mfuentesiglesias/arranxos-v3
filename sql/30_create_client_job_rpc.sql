-- ARRANXOS v3 - Supabase Phase 1
-- File: 30_create_client_job_rpc.sql
-- Purpose: RPC for client-side job publication without touching Stripe or
--          job_private_locations.
-- Execution order: after 29_create_job_request_from_invitation_rpc.sql
--
-- Notes:
-- - This RPC creates a new job in published status on behalf of the
--   authenticated client owner.
-- - It does NOT insert into job_private_locations. Exact address capture
--   remains a separate future step.
-- - price_min and price_max are orientative only. final_price stays null
--   until both sides accept an agreement via accept_agreement().
-- - Contact details (phones, emails, URLs, WhatsApp/Telegram mentions) are
--   blocked server-side in title and description, reusing the same detection
--   patterns already present in send_chat_message().
-- - The catalogue is validated server-side: category must exist and be active,
--   service must exist, be active and belong to the chosen category.
-- - questionnaire is stored as a free-form JSONB object with no server-side
--   schema enforcement beyond ensuring it is a JSON object (not an array or
--   scalar).

-- ---------------------------------------------------------------------------
-- create_client_job
-- ---------------------------------------------------------------------------

create or replace function public.create_client_job(
  p_title text,
  p_description text,
  p_category_id uuid,
  p_service_id uuid,
  p_questionnaire jsonb default '{}'::jsonb,
  p_approx_location text default null,
  p_price_min integer default null,
  p_price_max integer default null
)
returns table (
  result_job_id uuid,
  result_status public.job_status,
  result_created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_title text;
  v_description text;
  v_approx_location text;
  v_questionnaire jsonb;
  v_combined text;
  v_category_active boolean;
  v_service_active boolean;
  v_service_category_id uuid;
  v_job public.jobs%rowtype;
  v_phone_pattern text := '(\+?[[:digit:]][[:digit:] .()/-]{7,}[[:digit:]])';
  v_email_pattern text := '([A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,})';
  v_url_pattern text := '((https?://|www[.])[^[:space:]]+)';
  v_contact_app_pattern text := '(whatsapp|telegram|t[.]me)';
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'client' then
    raise exception 'Only clients can publish jobs.';
  end if;

  v_title := btrim(coalesce(p_title, ''));

  if v_title = '' then
    raise exception 'Job title cannot be empty.';
  end if;

  if char_length(v_title) > 200 then
    raise exception 'Job title must contain at most 200 characters.';
  end if;

  v_description := btrim(coalesce(p_description, ''));

  if v_description = '' then
    raise exception 'Job description cannot be empty.';
  end if;

  if char_length(v_description) > 5000 then
    raise exception 'Job description must contain at most 5000 characters.';
  end if;

  v_approx_location := btrim(coalesce(p_approx_location, ''));

  if v_approx_location = '' then
    raise exception 'Approximate location cannot be empty.';
  end if;

  if p_price_min is not null and p_price_min < 0 then
    raise exception 'Minimum price cannot be negative.';
  end if;

  if p_price_max is not null and p_price_max < 0 then
    raise exception 'Maximum price cannot be negative.';
  end if;

  if p_price_min is not null and p_price_max is not null and p_price_min > p_price_max then
    raise exception 'Minimum price cannot exceed maximum price.';
  end if;

  v_questionnaire := coalesce(p_questionnaire, '{}'::jsonb);

  if jsonb_typeof(v_questionnaire) <> 'object' then
    raise exception 'Questionnaire must be a JSON object.';
  end if;

  select active
  into v_category_active
  from public.catalog_categories
  where id = p_category_id;

  if v_category_active is null then
    raise exception 'Category % does not exist.', p_category_id;
  end if;

  if not v_category_active then
    raise exception 'Category % is not active.', p_category_id;
  end if;

  select active, category_id
  into v_service_active, v_service_category_id
  from public.catalog_services
  where id = p_service_id;

  if v_service_active is null then
    raise exception 'Service % does not exist.', p_service_id;
  end if;

  if not v_service_active then
    raise exception 'Service % is not active.', p_service_id;
  end if;

  if v_service_category_id <> p_category_id then
    raise exception 'Service % does not belong to category %.', p_service_id, p_category_id;
  end if;

  v_combined := v_title || ' ' || v_description;

  if v_combined ~* v_phone_pattern then
    raise exception 'Job title or description contains a phone number.';
  end if;

  if v_combined ~* v_email_pattern then
    raise exception 'Job title or description contains an email address.';
  end if;

  if v_combined ~* v_url_pattern then
    raise exception 'Job title or description contains a URL.';
  end if;

  if v_combined ~* v_contact_app_pattern then
    raise exception 'Job title or description references a contact app.';
  end if;

  insert into public.jobs (
    client_id,
    category_id,
    service_id,
    title,
    description,
    status,
    price_min,
    price_max,
    approx_location,
    questionnaire,
    assigned_professional_id,
    final_price,
    commission_pct_snapshot,
    invited_count,
    invitations_sent_at,
    completion_deadline
  )
  values (
    v_current_user_id,
    p_category_id,
    p_service_id,
    v_title,
    v_description,
    'published',
    p_price_min,
    p_price_max,
    v_approx_location,
    v_questionnaire,
    null,
    null,
    null,
    0,
    null,
    null
  )
  returning * into v_job;

  return query
  select
    v_job.id,
    v_job.status,
    v_job.created_at;
end;
$function$;

revoke all on function public.create_client_job(text, text, uuid, uuid, jsonb, text, integer, integer) from public;
grant execute on function public.create_client_job(text, text, uuid, uuid, jsonb, text, integer, integer) to authenticated;
