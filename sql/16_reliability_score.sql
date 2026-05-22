-- ARRANXOS v3 - Supabase Phase 1
-- File: 16_reliability_score.sql
-- Purpose: Professional reliability score calculation and admin visibility.
-- Execution order: after 15_admin_config_rpc.sql

-- ---------------------------------------------------------------------------
-- get_professional_reliability_score
-- Notes:
-- - Admins can inspect any professional.
-- - A professional can inspect only their own score.
-- - This function calculates the current snapshot but does not persist it.
-- ---------------------------------------------------------------------------

create or replace function public.get_professional_reliability_score(
  p_professional_id uuid
)
returns table (
  result_professional_id uuid,
  result_score integer,
  result_label text,
  result_risk_state text,
  result_review_count integer,
  result_average_rating numeric,
  result_completed_jobs integer,
  result_cancelled_jobs integer,
  result_open_disputes integer,
  result_resolved_against_professional integer,
  result_split_disputes integer,
  result_strike_count integer,
  result_components jsonb,
  result_snapshot jsonb,
  result_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_professional public.professionals%rowtype;
  v_score integer;
  v_label text;
  v_risk_state text;
  v_review_count integer := 0;
  v_average_rating numeric := null;
  v_completed_jobs integer := 0;
  v_cancelled_jobs integer := 0;
  v_open_disputes integer := 0;
  v_resolved_against_professional integer := 0;
  v_split_disputes integer := 0;
  v_strike_count integer := 0;
  v_strike_threshold integer := 5;
  v_review_confidence numeric := 0;
  v_review_quality_penalty numeric := 0;
  v_dispute_penalty numeric := 0;
  v_cancellation_penalty numeric := 0;
  v_strike_penalty numeric := 0;
  v_completion_bonus numeric := 0;
  v_components jsonb;
  v_snapshot jsonb;
  v_updated_at timestamptz := now();
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if not (
    v_current_role = 'admin'
    or (v_current_role = 'professional' and p_professional_id = v_current_user_id)
  ) then
    raise exception 'Only admins or the target professional can read this reliability score.';
  end if;

  select *
  into v_professional
  from public.professionals
  where profile_id = p_professional_id;

  if not found then
    raise exception 'Professional % does not exist.', p_professional_id;
  end if;

  select count(*), round(avg(r.rating)::numeric, 2)
  into v_review_count, v_average_rating
  from public.reviews as r
  where r.target_profile_id = p_professional_id
    and r.target_type = 'professional';

  select count(*)
  into v_completed_jobs
  from public.jobs as j
  where j.assigned_professional_id = p_professional_id
    and j.status = 'completed';

  select count(*)
  into v_cancelled_jobs
  from public.jobs as j
  where j.assigned_professional_id = p_professional_id
    and j.status = 'cancelled';

  select count(*)
  into v_open_disputes
  from public.disputes as d
  inner join public.jobs as j
    on j.id = d.job_id
  where j.assigned_professional_id = p_professional_id
    and d.status in ('open', 'under_review');

  select count(*)
  into v_resolved_against_professional
  from public.disputes as d
  inner join public.jobs as j
    on j.id = d.job_id
  where j.assigned_professional_id = p_professional_id
    and d.status = 'resolved_client';

  select count(*)
  into v_split_disputes
  from public.disputes as d
  inner join public.jobs as j
    on j.id = d.job_id
  where j.assigned_professional_id = p_professional_id
    and d.status = 'split';

  v_strike_count := coalesce(v_professional.strike_count, 0);

  select coalesce(c.strike_auto_block_threshold, 5)
  into v_strike_threshold
  from public.admin_config as c
  where c.id = 'global';

  if not found or v_strike_threshold is null or v_strike_threshold <= 0 then
    v_strike_threshold := 5;
  end if;

  v_review_confidence := least(v_review_count::numeric / 8, 1);

  if v_review_count > 0 and v_average_rating is not null then
    v_review_quality_penalty := ((5 - v_average_rating) / 4) * 20 * v_review_confidence;
  end if;

  v_completion_bonus := least(v_completed_jobs, 20) * 0.5;
  v_cancellation_penalty := v_cancelled_jobs * 6;
  v_dispute_penalty := (v_open_disputes * 4) + (v_resolved_against_professional * 10) + (v_split_disputes * 3);
  v_strike_penalty := v_strike_count * 12;

  v_score := greatest(
    0,
    least(
      100,
      round(
        100
        - v_review_quality_penalty
        - v_dispute_penalty
        - v_cancellation_penalty
        - v_strike_penalty
        + v_completion_bonus
      )::integer
    )
  );

  v_label := case
    when v_score >= 85 then 'alta'
    when v_score >= 70 then 'buena'
    when v_score >= 50 then 'media'
    else 'baja'
  end;

  v_risk_state := case
    when v_strike_count >= v_strike_threshold then 'critical'
    when v_score >= 80 then 'low'
    when v_score >= 60 then 'medium'
    else 'high'
  end;

  v_components := jsonb_build_object(
    'reviewConfidence', round(v_review_confidence, 4),
    'reviewQualityPenalty', round(v_review_quality_penalty, 4),
    'disputePenalty', round(v_dispute_penalty, 4),
    'cancellationPenalty', round(v_cancellation_penalty, 4),
    'strikePenalty', round(v_strike_penalty, 4),
    'completionBonus', round(v_completion_bonus, 4)
  );

  v_snapshot := jsonb_build_object(
    'version', 1,
    'score', v_score,
    'label', v_label,
    'riskState', v_risk_state,
    'reviewCount', v_review_count,
    'averageRating', v_average_rating,
    'completedJobs', v_completed_jobs,
    'cancelledJobs', v_cancelled_jobs,
    'openDisputes', v_open_disputes,
    'resolvedAgainstProfessional', v_resolved_against_professional,
    'splitDisputes', v_split_disputes,
    'strikeCount', v_strike_count,
    'components', v_components,
    'updatedAt', v_updated_at
  );

  return query
  select
    p_professional_id,
    v_score,
    v_label,
    v_risk_state,
    v_review_count,
    v_average_rating,
    v_completed_jobs,
    v_cancelled_jobs,
    v_open_disputes,
    v_resolved_against_professional,
    v_split_disputes,
    v_strike_count,
    v_components,
    v_snapshot,
    v_updated_at;
end;
$function$;

-- ---------------------------------------------------------------------------
-- recalculate_professional_reliability_score
-- Notes:
-- - Admin-only in Build 1.
-- - Persists the computed snapshot on professionals.reliability_snapshot.
-- ---------------------------------------------------------------------------

create or replace function public.recalculate_professional_reliability_score(
  p_professional_id uuid
)
returns table (
  result_professional_id uuid,
  result_score integer,
  result_label text,
  result_risk_state text,
  result_review_count integer,
  result_average_rating numeric,
  result_completed_jobs integer,
  result_cancelled_jobs integer,
  result_open_disputes integer,
  result_resolved_against_professional integer,
  result_split_disputes integer,
  result_strike_count integer,
  result_components jsonb,
  result_snapshot jsonb,
  result_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role public.profile_role;
  v_refresh record;
  v_score record;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_current_role := public.current_profile_role();

  if v_current_role is null then
    raise exception 'Current user does not have a profile.';
  end if;

  if v_current_role <> 'admin' then
    raise exception 'Only admins can recalculate professional reliability scores.';
  end if;

  select *
  into v_refresh
  from public.refresh_professional_reliability_snapshot(p_professional_id);

  select *
  into v_score
  from public.get_professional_reliability_score(p_professional_id);

  return query
  select
    v_score.result_professional_id,
    v_score.result_score,
    v_score.result_label,
    v_score.result_risk_state,
    v_score.result_review_count,
    v_score.result_average_rating,
    v_score.result_completed_jobs,
    v_score.result_cancelled_jobs,
    v_score.result_open_disputes,
    v_score.result_resolved_against_professional,
    v_score.result_split_disputes,
    v_score.result_strike_count,
    v_score.result_components,
    v_score.result_snapshot,
    v_score.result_updated_at;
end;
$function$;

-- ---------------------------------------------------------------------------
-- list_admin_professional_scores
-- Notes:
-- - Admin-only list view calculated on the fly.
-- - Does not persist snapshots by itself.
-- ---------------------------------------------------------------------------

create or replace function public.list_admin_professional_scores()
returns table (
  result_professional_id uuid,
  result_full_name text,
  result_avatar_initials text,
  result_status public.professional_status,
  result_verification_status public.verification_status,
  result_score integer,
  result_label text,
  result_risk_state text,
  result_review_count integer,
  result_average_rating numeric,
  result_completed_jobs integer,
  result_cancelled_jobs integer,
  result_open_disputes integer,
  result_resolved_against_professional integer,
  result_split_disputes integer,
  result_strike_count integer,
  result_components jsonb,
  result_snapshot jsonb,
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
    raise exception 'Only admins can list professional reliability scores.';
  end if;

  return query
  select
    p.profile_id,
    pr.full_name,
    pr.avatar_initials,
    p.status,
    p.verification_status,
    score.result_score,
    score.result_label,
    score.result_risk_state,
    score.result_review_count,
    score.result_average_rating,
    score.result_completed_jobs,
    score.result_cancelled_jobs,
    score.result_open_disputes,
    score.result_resolved_against_professional,
    score.result_split_disputes,
    score.result_strike_count,
    score.result_components,
    score.result_snapshot,
    score.result_updated_at
  from public.professionals as p
  inner join public.profiles as pr
    on pr.id = p.profile_id
  cross join lateral public.get_professional_reliability_score(p.profile_id) as score
  order by score.result_score desc, pr.full_name asc;
end;
$function$;
