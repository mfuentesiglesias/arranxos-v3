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
-- - moderation_flags remains without SELECT for authenticated because Phase 1
--   keeps moderation visibility admin-only.
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

-- ---------------------------------------------------------------------------
-- RPC execute grants for Phase 3A
-- ---------------------------------------------------------------------------

grant execute on function public.is_job_in_status(uuid, variadic public.job_status[]) to authenticated;
grant execute on function public.create_job_request(uuid, text) to authenticated;
grant execute on function public.accept_job_request(uuid) to authenticated;
grant execute on function public.send_chat_message(uuid, text) to authenticated;
grant execute on function public.create_agreement(uuid, integer, boolean) to authenticated;
grant execute on function public.accept_agreement(uuid) to authenticated;
grant execute on function public.fund_protected_payment(uuid) to authenticated;
grant execute on function public.mark_job_completed(uuid) to authenticated;
grant execute on function public.confirm_job_completion(uuid) to authenticated;
