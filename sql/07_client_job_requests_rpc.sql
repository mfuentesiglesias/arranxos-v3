-- ARRANXOS v3 - Supabase Phase 1
-- File: 07_client_job_requests_rpc.sql
-- Purpose: Safe client-facing read RPC for job requests with minimal public
--          professional info.
-- Execution order: 8 of 8
--
-- IMPORTANT:
-- - Do NOT execute SQL that has not been reviewed.
-- - SQL in this repository must be non-destructive by default.
-- - Do NOT use destructive DROP statements unless they are in a dedicated file
--   and explicitly approved in review.
--
-- NOTES:
-- - This file assumes sql/00_schema.sql through sql/06_profile_bootstrap_rpc.sql
--   have already been executed.
-- - The RPC is SECURITY DEFINER so a client job owner can read a narrow,
--   explicitly approved projection of third-party professional data without
--   broad SELECT access on profiles or professionals.

create or replace function public.get_client_job_requests_with_professional_public_info(
  p_job_id uuid
)
returns table (
  request_id uuid,
  job_id uuid,
  professional_id uuid,
  request_status public.job_request_status,
  request_message text,
  request_created_at timestamptz,
  professional_display_name text,
  professional_avatar_initials text,
  professional_specialty_label text,
  professional_zone text,
  professional_status public.professional_status,
  professional_verification_status public.verification_status,
  professional_public_profile_enabled boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_job public.jobs%rowtype;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_job_id is null then
    raise exception 'get_client_job_requests_with_professional_public_info() requires a non-null job_id.';
  end if;

  select *
  into v_job
  from public.jobs as j
  where j.id = p_job_id;

  if not found then
    raise exception 'Job % does not exist.', p_job_id;
  end if;

  if not (public.owns_job(p_job_id) or public.is_admin()) then
    raise exception 'Only the job owner or an admin can access requests for job %.', p_job_id;
  end if;

  return query
  select
    jr.id as request_id,
    jr.job_id,
    jr.professional_id,
    jr.status as request_status,
    jr.message as request_message,
    jr.created_at as request_created_at,
    p.full_name as professional_display_name,
    p.avatar_initials as professional_avatar_initials,
    pro.specialty_label as professional_specialty_label,
    pro.zone as professional_zone,
    pro.status as professional_status,
    pro.verification_status as professional_verification_status,
    pro.public_profile_enabled as professional_public_profile_enabled
  from public.job_requests as jr
  join public.professionals as pro
    on pro.profile_id = jr.professional_id
  join public.profiles as p
    on p.id = jr.professional_id
  where jr.job_id = p_job_id
  order by jr.created_at desc;
end;
$function$;

revoke all on function public.get_client_job_requests_with_professional_public_info(uuid) from public;

grant execute on function public.get_client_job_requests_with_professional_public_info(uuid) to authenticated;
