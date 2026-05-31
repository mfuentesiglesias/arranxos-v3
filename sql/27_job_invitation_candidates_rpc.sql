-- ---------------------------------------------------------------------------
-- get_client_job_invitable_professionals_with_public_info
-- Lists a safe, minimal public projection of approved professionals that a
-- client can invite to one of their published jobs.
-- Execution order: apply after the existing schema/RLS/RPC files, then re-apply
-- sql/05_grants.sql so authenticated can execute this function.
-- ---------------------------------------------------------------------------

create or replace function public.get_client_job_invitable_professionals_with_public_info(
  p_job_id uuid
)
returns table (
  professional_id uuid,
  professional_display_name text,
  professional_avatar_initials text,
  professional_specialty_label text,
  professional_zone text,
  matched_service_id uuid,
  matched_service_name text,
  is_primary_service boolean,
  match_kind text,
  review_count integer,
  average_rating numeric,
  invitation_id uuid,
  invitation_status public.job_invitation_status,
  invitation_created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_job public.jobs%rowtype;
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
    raise exception 'Only clients can list invitable professionals.';
  end if;

  if p_job_id is null then
    raise exception 'get_client_job_invitable_professionals_with_public_info() requires a non-null job_id.';
  end if;

  select *
  into v_job
  from public.jobs as j
  where j.id = p_job_id;

  if not found then
    raise exception 'Job % does not exist.', p_job_id;
  end if;

  if v_job.client_id <> v_current_user_id then
    raise exception 'Only the client owner of job % can list invitable professionals.', v_job.id;
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

  return query
  with review_stats as (
    select
      r.target_profile_id as professional_id,
      count(*)::integer as review_count,
      round(avg(r.rating)::numeric, 2) as average_rating
    from public.reviews as r
    where r.target_type = 'professional'
    group by r.target_profile_id
  )
  select
    p.id as professional_id,
    p.full_name as professional_display_name,
    p.avatar_initials as professional_avatar_initials,
    pro.specialty_label as professional_specialty_label,
    pro.zone as professional_zone,
    best_match.matched_service_id,
    best_match.matched_service_name,
    coalesce(best_match.is_primary_service, false) as is_primary_service,
    coalesce(best_match.match_kind, 'fallback') as match_kind,
    coalesce(rs.review_count, 0) as review_count,
    rs.average_rating,
    ji.id as invitation_id,
    ji.status as invitation_status,
    ji.created_at as invitation_created_at
  from public.profiles as p
  inner join public.professionals as pro
    on pro.profile_id = p.id
  left join lateral (
    select
      ps.service_id as matched_service_id,
      cs.name as matched_service_name,
      ps.is_primary as is_primary_service,
      case
        when v_job.service_id is not null and ps.service_id = v_job.service_id then 'service'
        when v_job.category_id is not null and cs.category_id = v_job.category_id then 'category'
        else 'fallback'
      end as match_kind,
      case
        when v_job.service_id is not null and ps.service_id = v_job.service_id then 0
        when v_job.category_id is not null and cs.category_id = v_job.category_id then 1
        else 2
      end as match_priority
    from public.professional_services as ps
    inner join public.catalog_services as cs
      on cs.id = ps.service_id
    where ps.professional_id = pro.profile_id
      and cs.active = true
    order by
      match_priority asc,
      case when ps.is_primary then 0 else 1 end asc,
      cs.name asc,
      cs.id asc
    limit 1
  ) as best_match
    on true
  left join review_stats as rs
    on rs.professional_id = p.id
  left join public.job_invitations as ji
    on ji.job_id = v_job.id
   and ji.professional_id = p.id
  where p.role = 'professional'
    and pro.status = 'approved'
  order by
    case coalesce(best_match.match_kind, 'fallback')
      when 'service' then 0
      when 'category' then 1
      else 2
    end asc,
    case when coalesce(best_match.is_primary_service, false) then 0 else 1 end asc,
    case when ji.id is null then 0 else 1 end asc,
    coalesce(rs.average_rating, 0) desc,
    coalesce(rs.review_count, 0) desc,
    p.full_name asc;
end;
$function$;

revoke all on function public.get_client_job_invitable_professionals_with_public_info(uuid) from public;
revoke all on function public.get_client_job_invitable_professionals_with_public_info(uuid) from anon;
revoke all on function public.get_client_job_invitable_professionals_with_public_info(uuid) from authenticated;
