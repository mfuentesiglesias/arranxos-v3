-- ---------------------------------------------------------------------------
-- create_job_request_from_invitation
-- Creates a pending job request from a professional-owned invitation and marks
-- the invitation as accepted inside the same transaction.
-- Execution order: apply after the existing schema/RLS/RPC files, then re-apply
-- sql/05_grants.sql so authenticated can execute this function.
-- ---------------------------------------------------------------------------

create or replace function public.create_job_request_from_invitation(
  p_invitation_id uuid,
  p_message text default null
)
returns table (
  invitation_id uuid,
  invitation_status public.job_invitation_status,
  request_id uuid,
  request_status public.job_request_status,
  job_id uuid,
  professional_id uuid,
  request_created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_invitation public.job_invitations%rowtype;
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
    raise exception 'Only professionals can respond to job invitations.';
  end if;

  if not public.is_approved_professional_profile(v_current_user_id) then
    raise exception 'Only approved professionals can respond to job invitations.';
  end if;

  if p_invitation_id is null then
    raise exception 'Invitation id is required.';
  end if;

  select *
  into v_invitation
  from public.job_invitations as ji
  where ji.id = p_invitation_id
  for update;

  if not found then
    raise exception 'Job invitation % does not exist.', p_invitation_id;
  end if;

  if v_invitation.professional_id <> v_current_user_id then
    raise exception 'Job invitation % does not belong to the current professional.', p_invitation_id;
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'Job invitation % is not pending.', p_invitation_id;
  end if;

  select *
  into v_job
  from public.jobs as j
  where j.id = v_invitation.job_id
  for update;

  if not found then
    raise exception 'Job % does not exist.', v_invitation.job_id;
  end if;

  if v_job.status <> 'published' then
    raise exception 'Job % is not published.', v_job.id;
  end if;

  if v_job.assigned_professional_id is not null then
    raise exception 'Job % already has an assigned professional.', v_job.id;
  end if;

  if v_job.client_id = v_current_user_id then
    raise exception 'A professional cannot respond to their own client job invitation.';
  end if;

  if exists (
    select 1
    from public.job_requests as jr
    where jr.job_id = v_job.id
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
      v_job.id,
      v_current_user_id,
      v_message,
      'pending'
    )
    returning * into v_request;
  exception
    when unique_violation then
      raise exception 'A request for this job already exists for the current professional.';
  end;

  update public.job_invitations
  set status = 'accepted',
      updated_at = now()
  where id = v_invitation.id
  returning * into v_invitation;

  return query
  select
    v_invitation.id,
    v_invitation.status,
    v_request.id,
    v_request.status,
    v_request.job_id,
    v_request.professional_id,
    v_request.created_at;
end;
$function$;

revoke all on function public.create_job_request_from_invitation(uuid, text) from public;
revoke all on function public.create_job_request_from_invitation(uuid, text) from anon;
revoke all on function public.create_job_request_from_invitation(uuid, text) from authenticated;
