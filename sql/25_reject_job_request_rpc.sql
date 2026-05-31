-- ---------------------------------------------------------------------------
-- reject_job_request
-- Allows the client owner of a job to reject a pending job request.
-- Raises if the user is not the client owner, the request is not pending,
-- or the job is not in a valid state for managing requests.
-- SECURITY DEFINER because it mutates state across tables.
-- ---------------------------------------------------------------------------

create or replace function public.reject_job_request(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_request public.job_requests%rowtype;
  v_job public.jobs%rowtype;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'client' then
    raise exception 'Only the client owner can reject a job request.';
  end if;

  select jr.job_id
  into v_request.job_id
  from public.job_requests as jr
  where id = p_request_id;

  if not found then
    raise exception 'Job request % does not exist.', p_request_id;
  end if;

  select *
  into v_job
  from public.jobs
  where id = v_request.job_id
  for update;

  if not found then
    raise exception 'Job % does not exist for request %.', v_request.job_id, p_request_id;
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
    raise exception 'Only the client owner of job % can reject this request.', v_job.id;
  end if;

  if not public.is_job_in_status(v_job.id, 'published'::public.job_status) then
    raise exception 'Job % is not in published status.', v_job.id;
  end if;

  update public.job_requests
  set status = 'rejected',
      updated_at = now()
  where id = v_request.id;
end;
$function$;

revoke all on function public.reject_job_request(uuid) from public;
revoke all on function public.reject_job_request(uuid) from anon;
revoke all on function public.reject_job_request(uuid) from authenticated;
