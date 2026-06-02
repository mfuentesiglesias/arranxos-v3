-- ---------------------------------------------------------------------------
-- get_professional_job_invitations_with_public_job_info
-- Lists a professional's received invitations with only public job data.
-- Execution order: apply after the existing schema/RLS/RPC files, then re-apply
-- sql/05_grants.sql so authenticated can execute this function.
-- ---------------------------------------------------------------------------

create or replace function public.get_professional_job_invitations_with_public_job_info()
returns table (
  invitation_id uuid,
  invitation_status public.job_invitation_status,
  invitation_created_at timestamptz,
  job_id uuid,
  job_title text,
  job_description text,
  category_id uuid,
  category_name text,
  service_id uuid,
  service_name text,
  approx_location text,
  price_min integer,
  price_max integer,
  job_status public.job_status,
  request_id uuid,
  request_status public.job_request_status,
  request_created_at timestamptz
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

  if v_current_role <> 'professional' then
    raise exception 'Only professionals can list received invitations.';
  end if;

  if not public.is_approved_professional_profile(v_current_user_id) then
    raise exception 'Only approved professionals can list received invitations.';
  end if;

  return query
  select
    ji.id as invitation_id,
    ji.status as invitation_status,
    ji.created_at as invitation_created_at,
    j.id as job_id,
    j.title as job_title,
    j.description as job_description,
    j.category_id,
    cc.name as category_name,
    j.service_id,
    cs.name as service_name,
    j.approx_location,
    j.price_min,
    j.price_max,
    j.status as job_status,
    jr.id as request_id,
    jr.status as request_status,
    jr.created_at as request_created_at
  from public.job_invitations as ji
  inner join public.jobs as j
    on j.id = ji.job_id
  left join public.catalog_categories as cc
    on cc.id = j.category_id
  left join public.catalog_services as cs
    on cs.id = j.service_id
  left join public.job_requests as jr
    on jr.job_id = ji.job_id
   and jr.professional_id = ji.professional_id
  where ji.professional_id = v_current_user_id
  order by
    case ji.status
      when 'pending' then 0
      when 'accepted' then 1
      when 'rejected' then 2
      when 'expired' then 3
      when 'cancelled' then 4
      else 5
    end asc,
    ji.created_at desc;
end;
$function$;

revoke all on function public.get_professional_job_invitations_with_public_job_info() from public;
revoke all on function public.get_professional_job_invitations_with_public_job_info() from anon;
revoke all on function public.get_professional_job_invitations_with_public_job_info() from authenticated;
