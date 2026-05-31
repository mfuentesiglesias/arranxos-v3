-- ARRANXOS v3 - Supabase Phase 1
-- File: 05_grants.sql
-- Purpose: Base schema and RPC grants required so PostgreSQL can evaluate RLS.
-- Execution order: 6 of 6
--
-- IMPORTANT:
-- - Do NOT execute SQL that has not been reviewed.
-- - SQL in this repository must be non-destructive by default.
-- - Do NOT use destructive DROP statements unless they are in a dedicated file
--   and explicitly approved in review.
--
-- NOTES:
-- - PostgreSQL requires base GRANT permissions in addition to RLS policies.
-- - These grants do NOT open data by themselves; RLS policies still decide
--   which rows are visible or writable for authenticated callers.
-- - Grants are intentionally limited to the minimum needed for Phase 1 reads
--   and Phase 3A RPC execution from the authenticated role.
-- - moderation_flags SELECT granted to authenticated so the admin /chats page
--   can list real flags (RLS still restricts which rows are visible).
-- - admin_config remains without SELECT for authenticated because it is
--   protected as admin-only and RPCs read only the specific config they need.

-- ---------------------------------------------------------------------------
-- Schema usage
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Table SELECT grants required so RLS can evaluate for authenticated callers
-- ---------------------------------------------------------------------------

grant select on table public.profiles to authenticated;
grant select on table public.professionals to authenticated;
grant select on table public.professional_services to authenticated;
grant select on table public.catalog_categories to authenticated;
grant select on table public.catalog_services to authenticated;
grant select on table public.jobs to authenticated;
grant insert on table public.jobs to authenticated;
grant select on table public.job_private_locations to authenticated;
grant select on table public.job_requests to authenticated;
grant select on table public.job_invitations to authenticated;
grant select on table public.job_negotiations to authenticated;
grant select on table public.job_negotiation_events to authenticated;
grant select on table public.chats to authenticated;
grant select on table public.chat_messages to authenticated;
grant select on table public.agreements to authenticated;
grant select on table public.disputes to authenticated;
grant select on table public.reviews to authenticated;
grant select on table public.catalog_requests to authenticated;
grant select on table public.search_tickets to authenticated;
grant select on table public.moderation_flags to authenticated;

-- ---------------------------------------------------------------------------
-- RPC execute grants for Phase 3A
-- ---------------------------------------------------------------------------

grant execute on function public.is_job_in_status(uuid, variadic public.job_status[]) to authenticated;
grant execute on function public.create_job_request(uuid, text) to authenticated;
grant execute on function public.create_job_invitation(uuid, uuid) to authenticated;
grant execute on function public.accept_job_request(uuid) to authenticated;
grant execute on function public.reject_job_request(uuid) to authenticated;
grant execute on function public.send_chat_message(uuid, text) to authenticated;
grant execute on function public.create_agreement(uuid, integer, boolean) to authenticated;
grant execute on function public.accept_agreement(uuid) to authenticated;
grant execute on function public.fund_protected_payment(uuid) to authenticated;
grant execute on function public.mark_job_completed(uuid) to authenticated;
grant execute on function public.confirm_job_completion(uuid) to authenticated;
grant execute on function public.open_dispute(uuid, text, text, jsonb) to authenticated;
grant execute on function public.resolve_dispute(uuid, text, text) to authenticated;
grant execute on function public.auto_release_due_jobs() to authenticated;
grant execute on function public.create_review(uuid, integer, text) to authenticated;
grant execute on function public.create_catalog_request(text, uuid, text, text) to authenticated;
grant execute on function public.approve_catalog_request(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.reject_catalog_request(uuid, text) to authenticated;
grant execute on function public.merge_catalog_request(uuid, uuid) to authenticated;
grant execute on function public.create_search_ticket_from_job(uuid, public.search_ticket_reason) to authenticated;
grant execute on function public.update_search_ticket_status(uuid, public.search_ticket_status) to authenticated;
grant execute on function public.get_admin_config() to authenticated;
grant execute on function public.update_admin_config(integer, integer, integer, integer, integer, boolean, jsonb) to authenticated;
grant execute on function public.get_professional_reliability_score(uuid) to authenticated;
grant execute on function public.recalculate_professional_reliability_score(uuid) to authenticated;
grant execute on function public.list_admin_professional_scores() to authenticated;
grant execute on function public.apply_moderation_strike(uuid) to authenticated;
grant execute on function public.resolve_moderation_flag(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Backend-only cron RPC grants
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from pg_proc as p
    inner join pg_namespace as n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'auto_release_due_jobs_cron'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke all on function public.auto_release_due_jobs_cron() from public';
    execute 'revoke all on function public.auto_release_due_jobs_cron() from anon';
    execute 'revoke all on function public.auto_release_due_jobs_cron() from authenticated';
    execute 'grant execute on function public.auto_release_due_jobs_cron() to service_role';
  end if;
end
$$;
