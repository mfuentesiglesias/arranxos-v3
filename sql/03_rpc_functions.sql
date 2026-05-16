-- ARRANXOS v3 - Supabase Phase 1
-- File: 03_rpc_functions.sql
-- Purpose: RPC functions for sensitive operations and controlled writes.
-- Execution order: 4 of 5
--
-- IMPORTANT:
-- - Do NOT execute SQL that has not been reviewed.
-- - SQL in this repository must be non-destructive by default.
-- - Do NOT use destructive DROP statements unless they are in a dedicated file
--   and explicitly approved in review.
--
-- NOTES:
-- - This file assumes sql/00_schema.sql and sql/02_rls_policies.sql have
--   already been executed.
-- - These functions are intentionally SECURITY DEFINER because they perform
--   sensitive writes that must not rely on direct frontend table access.
-- - Exact-location direct writes remain temporarily accepted through RLS in
--   job_private_locations, but may move later to an upsert_job_private_location
--   RPC once the first functional slice is stable.
--
-- TODO Phase 3B:
-- - mark_job_completed
-- - confirm_job_completed
-- - open_dispute
-- - resolve_dispute
-- - apply_moderation_strike
--
-- NOTE FOR open_dispute:
-- - It must validate job.status in
--   ('in_progress', 'agreement_pending', 'agreed', 'escrow_funded',
--    'completed_pending_confirmation')
-- - It must prevent duplicate active disputes for the same job.

-- ---------------------------------------------------------------------------
-- Shared RPC helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_job_in_status(
  target_job_id uuid,
  variadic allowed_statuses public.job_status[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.jobs as j
    where j.id = target_job_id
      and j.status = any(allowed_statuses)
  )
$function$;

-- ---------------------------------------------------------------------------
-- create_job_request
-- ---------------------------------------------------------------------------

create or replace function public.create_job_request(
  p_job_id uuid,
  p_message text default null
)
returns public.job_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_job public.jobs%rowtype;
  v_request public.job_requests%rowtype;
  v_message text := nullif(btrim(p_message), '');
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'professional' then
    raise exception 'Only approved professionals can create job requests.';
  end if;

  if not public.is_active_professional() then
    raise exception 'Professional must be approved and active to request a job.';
  end if;

  select *
  into v_job
  from public.jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'Job % does not exist.', p_job_id;
  end if;

  if not public.is_job_in_status(v_job.id, 'published'::public.job_status) then
    raise exception 'Job % is not published.', p_job_id;
  end if;

  if v_job.assigned_professional_id is not null then
    raise exception 'Job % already has an assigned professional.', p_job_id;
  end if;

  if v_job.client_id = v_current_user_id then
    raise exception 'A professional cannot request their own client job.';
  end if;

  if exists (
    select 1
    from public.job_requests as jr
    where jr.job_id = p_job_id
      and jr.professional_id = v_current_user_id
  ) then
    raise exception 'A request for this job already exists for the current professional.';
  end if;

  begin
    insert into public.job_requests (
      job_id,
      professional_id,
      message,
      status
    )
    values (
      p_job_id,
      v_current_user_id,
      v_message,
      'pending'
    )
    returning * into v_request;
  exception
    when unique_violation then
      raise exception 'A request for this job already exists for the current professional.';
  end;

  return v_request;
end;
$function$;

-- ---------------------------------------------------------------------------
-- accept_job_request
-- ---------------------------------------------------------------------------

create or replace function public.accept_job_request(
  p_request_id uuid
)
returns table (
  result_job_id uuid,
  result_professional_id uuid,
  result_chat_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_request_job_id uuid;
  v_request public.job_requests%rowtype;
  v_job public.jobs%rowtype;
  v_chat public.chats%rowtype;
  v_professional_status public.professional_status;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'client' then
    raise exception 'Only the client owner can accept a job request.';
  end if;

  select jr.job_id
  into v_request_job_id
  from public.job_requests
  where id = p_request_id;

  if not found then
    raise exception 'Job request % does not exist.', p_request_id;
  end if;

  select *
  into v_job
  from public.jobs
  where id = v_request_job_id
  for update;

  if not found then
    raise exception 'Job % does not exist for request %.', v_request_job_id, p_request_id;
  end if;

  select *
  into v_request
  from public.job_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Job request % does not exist after locking its job.', p_request_id;
  end if;

  if v_request.job_id <> v_job.id then
    raise exception 'Job request % no longer points to the expected job.', p_request_id;
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Job request % is not pending.', p_request_id;
  end if;

  if v_job.client_id <> v_current_user_id then
    raise exception 'Only the client owner of job % can accept this request.', v_job.id;
  end if;

  if not public.is_job_in_status(v_job.id, 'published'::public.job_status) then
    raise exception 'Job % is not in published status.', v_job.id;
  end if;

  if v_job.assigned_professional_id is not null then
    raise exception 'Job % already has an assigned professional.', v_job.id;
  end if;

  select p.status
  into v_professional_status
  from public.professionals as p
  where p.profile_id = v_request.professional_id;

  if v_professional_status is null then
    raise exception 'Professional profile for request % does not exist.', p_request_id;
  end if;

  if v_professional_status <> 'approved' then
    raise exception 'The professional on request % is no longer approved.', p_request_id;
  end if;

  update public.job_requests
  set status = 'accepted',
      updated_at = now()
  where id = v_request.id
  returning * into v_request;

  update public.job_requests
  set status = 'closed',
      updated_at = now()
  where job_id = v_job.id
    and id <> v_request.id
    and status = 'pending';

  update public.job_invitations
  set status = 'cancelled',
      updated_at = now()
  where job_id = v_job.id
    and professional_id <> v_request.professional_id
    and status in ('pending', 'accepted');

  update public.jobs
  set status = 'in_progress',
      assigned_professional_id = v_request.professional_id,
      updated_at = now()
  where id = v_job.id
  returning * into v_job;

  insert into public.chats (
    job_id,
    client_id,
    professional_id
  )
  values (
    v_job.id,
    v_job.client_id,
    v_request.professional_id
  )
  on conflict (job_id) do nothing
  returning * into v_chat;

  if v_chat.id is null then
    select *
    into v_chat
    from public.chats
    where job_id = v_job.id;

    if not found then
      raise exception 'Chat for job % could not be created or loaded.', v_job.id;
    end if;

    if v_chat.client_id <> v_job.client_id
      or v_chat.professional_id <> v_request.professional_id then
      raise exception 'Existing chat for job % has inconsistent participants.', v_job.id;
    end if;
  end if;

  return query
  select v_job.id, v_request.professional_id, v_chat.id;
end;
$function$;

-- ---------------------------------------------------------------------------
-- send_chat_message
-- Phase 3A decision: chat is blocked for cancelled/completed jobs, but remains
-- allowed for active, agreement, dispute, and pending-confirmation flows.
-- ---------------------------------------------------------------------------

create or replace function public.send_chat_message(
  p_chat_id uuid,
  p_content text
)
returns public.chat_messages
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_chat public.chats%rowtype;
  v_job public.jobs%rowtype;
  v_message public.chat_messages%rowtype;
  v_original_content text := btrim(coalesce(p_content, ''));
  v_redacted_content text;
  v_anti_leak_enabled boolean;
  v_anti_leak_phones boolean;
  v_anti_leak_emails boolean;
  v_anti_leak_urls boolean;
  v_anti_leak_whatsapp boolean;
  v_phone_pattern text := '(\+?[[:digit:]][[:digit:] .()/-]{7,}[[:digit:]])';
  v_email_pattern text := '([A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,})';
  v_url_pattern text := '((https?://|www[.])[^[:space:]]+)';
  v_contact_app_pattern text := '(whatsapp|telegram|t[.]me)';
  v_leak_types text[] := array[]::text[];
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if v_original_content = '' then
    raise exception 'Chat message content cannot be empty.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role not in ('client', 'professional') then
    raise exception 'Only chat participants can send chat messages.';
  end if;

  select *
  into v_chat
  from public.chats
  where id = p_chat_id;

  if not found then
    raise exception 'Chat % does not exist.', p_chat_id;
  end if;

  select *
  into v_job
  from public.jobs
  where id = v_chat.job_id;

  if not found then
    raise exception 'Job % for chat % does not exist.', v_chat.job_id, p_chat_id;
  end if;

  if v_current_role = 'client' then
    if v_chat.client_id <> v_current_user_id then
      raise exception 'Current user is not the client participant of chat %.', p_chat_id;
    end if;
  else
    if v_chat.professional_id <> v_current_user_id then
      raise exception 'Current user is not the professional participant of chat %.', p_chat_id;
    end if;

    if not public.is_active_professional() then
      raise exception 'Professional must remain approved and active to send chat messages.';
    end if;
  end if;

  if v_job.status in ('cancelled', 'completed') then
    raise exception 'Chat is closed for jobs in status %.', v_job.status;
  end if;

  select
    anti_leak_enabled,
    anti_leak_phones,
    anti_leak_emails,
    anti_leak_urls,
    anti_leak_whatsapp
  into
    v_anti_leak_enabled,
    v_anti_leak_phones,
    v_anti_leak_emails,
    v_anti_leak_urls,
    v_anti_leak_whatsapp
  from public.admin_config
  where id = 'global';

  if not found then
    raise exception 'Admin config row with id=global is required before sending chat messages.';
  end if;

  v_redacted_content := v_original_content;

  if v_anti_leak_enabled and v_anti_leak_phones
    and v_original_content ~* v_phone_pattern then
    v_leak_types := array_append(v_leak_types, 'phone');
    v_redacted_content := regexp_replace(v_redacted_content, v_phone_pattern, '[redacted-phone]', 'gi');
  end if;

  if v_anti_leak_enabled and v_anti_leak_emails
    and v_original_content ~* v_email_pattern then
    v_leak_types := array_append(v_leak_types, 'email');
    v_redacted_content := regexp_replace(v_redacted_content, v_email_pattern, '[redacted-email]', 'gi');
  end if;

  if v_anti_leak_enabled and v_anti_leak_urls
    and v_original_content ~* v_url_pattern then
    v_leak_types := array_append(v_leak_types, 'url');
    v_redacted_content := regexp_replace(v_redacted_content, v_url_pattern, '[redacted-url]', 'gi');
  end if;

  if v_anti_leak_enabled and v_anti_leak_whatsapp
    and v_original_content ~* v_contact_app_pattern then
    v_leak_types := array_append(v_leak_types, 'contact_app');
    v_redacted_content := regexp_replace(v_redacted_content, v_contact_app_pattern, '[redacted-contact-app]', 'gi');
  end if;

  insert into public.chat_messages (
    chat_id,
    job_id,
    sender_profile_id,
    sender_role,
    content,
    message_type,
    leak_checked,
    leak_detected,
    leak_types,
    redacted_content,
    blocked_reason
  )
  values (
    v_chat.id,
    v_chat.job_id,
    v_current_user_id,
    (v_current_role::text)::public.chat_sender_role,
    case when cardinality(v_leak_types) > 0 then v_redacted_content else v_original_content end,
    'text',
    true,
    cardinality(v_leak_types) > 0,
    coalesce(v_leak_types, array[]::text[]),
    case when cardinality(v_leak_types) > 0 then v_redacted_content else null end,
    case when cardinality(v_leak_types) > 0 then 'contact_details_blocked' else null end
  )
  returning * into v_message;

  if cardinality(v_leak_types) > 0 then
    -- TODO Phase 3B: apply_moderation_strike will process these flags and any
    -- auto-block logic. Phase 3A only records the flag and redacted content.
    insert into public.moderation_flags (
      job_id,
      chat_id,
      chat_message_id,
      sender_profile_id,
      sender_role,
      original_text,
      redacted_text,
      leak_types,
      strike_applied
    )
    values (
      v_chat.job_id,
      v_chat.id,
      v_message.id,
      v_current_user_id,
      (v_current_role::text)::public.chat_sender_role,
      v_original_content,
      v_redacted_content,
      v_leak_types,
      false
    );
  end if;

  update public.chats
  set last_message_at = now()
  where id = v_chat.id;

  return v_message;
end;
$function$;

-- ---------------------------------------------------------------------------
-- create_agreement
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
