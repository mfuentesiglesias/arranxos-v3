-- ARRANXOS v3 - Supabase Phase 1
-- File: 13_reviews_rpc.sql
-- Purpose: Real post-completion reviews without Stripe, scoring, or admin UI.
-- Execution order: after 12_auto_release_rpc.sql

-- ---------------------------------------------------------------------------
-- create_review
-- Notes:
-- - A completed and released job can receive one review per participant.
-- - Target is inferred from the current role to avoid spoofing the reviewee.
-- - This RPC does not calculate aggregates or modify ranking/reliability.
-- ---------------------------------------------------------------------------

create or replace function public.create_review(
  p_job_id uuid,
  p_rating integer,
  p_comment text default null
)
returns table (
  result_review_id uuid,
  result_job_id uuid,
  result_reviewer_profile_id uuid,
  result_reviewer_role public.profile_role,
  result_target_profile_id uuid,
  result_target_type public.review_target_type,
  result_rating integer,
  result_comment text,
  result_created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_job public.jobs%rowtype;
  v_agreement public.agreements%rowtype;
  v_review public.reviews%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_target_profile_id uuid;
  v_target_type public.review_target_type;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role not in ('client', 'professional') then
    raise exception 'Only clients or professionals can create reviews.';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Review rating must be an integer between 1 and 5.';
  end if;

  if v_comment is not null and char_length(v_comment) > 1000 then
    raise exception 'Review comment must contain at most 1000 characters.';
  end if;

  select *
  into v_job
  from public.jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'Job % does not exist.', p_job_id;
  end if;

  if v_job.status <> 'completed' then
    raise exception 'Job % is not in completed status.', p_job_id;
  end if;

  if v_job.assigned_professional_id is null then
    raise exception 'Job % does not have an assigned professional.', p_job_id;
  end if;

  select *
  into v_agreement
  from public.agreements
  where job_id = v_job.id
  for update;

  if not found then
    raise exception 'Agreement for job % does not exist.', p_job_id;
  end if;

  if v_agreement.payment_status <> 'released' then
    raise exception 'Agreement for job % is not released.', p_job_id;
  end if;

  if v_agreement.released_at is null then
    raise exception 'Agreement for job % does not have a released_at timestamp.', p_job_id;
  end if;

  if v_current_role = 'client' then
    if v_job.client_id <> v_current_user_id then
      raise exception 'Only the client owner can review job %.', p_job_id;
    end if;

    v_target_profile_id := v_job.assigned_professional_id;
    v_target_type := 'professional';
  else
    if v_job.assigned_professional_id <> v_current_user_id then
      raise exception 'Only the assigned professional can review job %.', p_job_id;
    end if;

    v_target_profile_id := v_job.client_id;
    v_target_type := 'client';
  end if;

  if exists (
    select 1
    from public.reviews as r
    where r.job_id = v_job.id
      and r.reviewer_profile_id = v_current_user_id
      and r.target_profile_id = v_target_profile_id
  ) then
    raise exception 'Review for job % already exists for this reviewer and target.', p_job_id;
  end if;

  insert into public.reviews (
    job_id,
    reviewer_profile_id,
    reviewer_role,
    target_profile_id,
    target_type,
    rating,
    comment
  )
  values (
    v_job.id,
    v_current_user_id,
    v_current_role,
    v_target_profile_id,
    v_target_type,
    p_rating,
    v_comment
  )
  returning * into v_review;

  if v_target_type = 'professional' then
    perform public.refresh_professional_reliability_snapshot(v_target_profile_id);
  end if;

  return query
  select
    v_review.id,
    v_review.job_id,
    v_review.reviewer_profile_id,
    v_review.reviewer_role,
    v_review.target_profile_id,
    v_review.target_type,
    v_review.rating,
    v_review.comment,
    v_review.created_at;

exception
  when unique_violation then
    raise exception 'Review for job % already exists for this reviewer and target.', p_job_id;
end;
$function$;
