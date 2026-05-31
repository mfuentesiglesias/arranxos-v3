-- ---------------------------------------------------------------------------
-- create_job_invitation
-- Creates a real client-owned job invitation through a secure RPC.
-- Execution order: apply after the existing schema/RLS/RPC files, then re-apply
-- sql/05_grants.sql so authenticated can execute this function.
-- ---------------------------------------------------------------------------

create or replace function public.create_job_invitation(
  p_job_id uuid,
  p_professional_id uuid
)
returns table (
  invitation_id uuid,
  job_id uuid,
  professional_id uuid,
  status public.job_invitation_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_job public.jobs%rowtype;
  v_professional_role public.profile_role;
  v_invitation_limit integer;
  v_existing_invitation public.job_invitations%rowtype;
  v_new_invitation public.job_invitations%rowtype;
  v_existing_invitation_count integer;
  v_job_is_published boolean;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'client' then
    raise exception 'Only clients can create job invitations.';
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
    raise exception 'Only the client owner of job % can create invitations.', v_job.id;
  end if;

  if exists (
    select 1
    from pg_proc as p
    inner join pg_namespace as n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_job_in_status'
  ) then
    v_job_is_published := public.is_job_in_status(v_job.id, 'published'::public.job_status);
  else
    v_job_is_published := v_job.status = 'published';
  end if;

  if not coalesce(v_job_is_published, false) then
    raise exception 'Job % is not in published status.', v_job.id;
  end if;

  if v_job.assigned_professional_id is not null then
    raise exception 'Job % already has an assigned professional.', v_job.id;
  end if;

  if p_professional_id = v_current_user_id then
    raise exception 'A client cannot invite their own client profile.';
  end if;

  select p.role
  into v_professional_role
  from public.profiles as p
  where p.id = p_professional_id;

  if not found then
    raise exception 'Professional profile % does not exist.', p_professional_id;
  end if;

  if v_professional_role <> 'professional' then
    raise exception 'Profile % is not a professional.', p_professional_id;
  end if;

  if not public.is_approved_professional_profile(p_professional_id) then
    raise exception 'Professional % is not approved.', p_professional_id;
  end if;

  select *
  into v_existing_invitation
  from public.job_invitations as ji
  where ji.job_id = p_job_id
    and ji.professional_id = p_professional_id
  for update;

  if found then
    raise exception 'An invitation for job % and professional % already exists.', p_job_id, p_professional_id;
  end if;

  insert into public.admin_config (id)
  values ('global')
  on conflict (id) do nothing;

  select c.invitation_limit_per_job
  into v_invitation_limit
  from public.admin_config as c
  where c.id = 'global';

  -- Defensive fallback for unexpected legacy/null config states.
  v_invitation_limit := coalesce(v_invitation_limit, 10);

  select count(*)::integer
  into v_existing_invitation_count
  from public.job_invitations as ji
  where ji.job_id = p_job_id;

  if v_existing_invitation_count >= v_invitation_limit then
    raise exception 'Job % already reached the invitation limit of %.', p_job_id, v_invitation_limit;
  end if;

  begin
    insert into public.job_invitations (
      job_id,
      professional_id,
      invited_by_client_id,
      status
    )
    values (
      p_job_id,
      p_professional_id,
      v_current_user_id,
      'pending'
    )
    returning * into v_new_invitation;
  exception
    when unique_violation then
      raise exception 'An invitation for job % and professional % already exists.', p_job_id, p_professional_id;
  end;

  update public.jobs
  set invited_count = invited_count + 1,
      invitations_sent_at = now(),
      updated_at = now()
  where id = v_job.id;

  return query
  select
    v_new_invitation.id,
    v_new_invitation.job_id,
    v_new_invitation.professional_id,
    v_new_invitation.status,
    v_new_invitation.created_at;
end;
$function$;

revoke all on function public.create_job_invitation(uuid, uuid) from public;
revoke all on function public.create_job_invitation(uuid, uuid) from anon;
revoke all on function public.create_job_invitation(uuid, uuid) from authenticated;
