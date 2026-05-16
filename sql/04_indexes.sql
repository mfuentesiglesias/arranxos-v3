-- ARRANXOS v3 - Supabase Phase 1
-- File: 04_indexes.sql
-- Purpose: Performance indexes added after schema and access patterns settle.
-- Execution order: 5 of 5
--
-- IMPORTANT:
-- - Do NOT execute SQL that has not been reviewed.
-- - SQL in this repository must be non-destructive by default.
-- - Do NOT use destructive DROP statements unless they are in a dedicated file
--   and explicitly approved in review.
--
-- NOTES:
-- - This file assumes sql/00_schema.sql, sql/02_rls_policies.sql, and
--   sql/03_rpc_functions.sql have already been executed.
-- - Indexes are conservative and non-destructive by default.
-- - CREATE INDEX IF NOT EXISTS is used for idempotence.
-- - Partial unique indexes are included only where they protect clear
--   product invariants already assumed by schema, RLS, or RPC logic.

-- ---------------------------------------------------------------------------
-- Core user and professional indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_profiles_role
  on public.profiles (role);

create index if not exists idx_professionals_status
  on public.professionals (status);

create index if not exists idx_professionals_slug
  on public.professionals (slug);

create index if not exists idx_professionals_public_profile_enabled
  on public.professionals (public_profile_enabled);

create index if not exists idx_professionals_zone
  on public.professionals (zone);

create index if not exists idx_professionals_status_public_profile_enabled
  on public.professionals (status, public_profile_enabled);

create index if not exists idx_professional_services_service_id
  on public.professional_services (service_id);

create index if not exists idx_professional_services_professional_id_is_primary
  on public.professional_services (professional_id, is_primary);

-- ---------------------------------------------------------------------------
-- Jobs and location-discovery indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_jobs_client_id
  on public.jobs (client_id);

create index if not exists idx_jobs_assigned_professional_id
  on public.jobs (assigned_professional_id);

create index if not exists idx_jobs_status
  on public.jobs (status);

create index if not exists idx_jobs_service_id
  on public.jobs (service_id);

create index if not exists idx_jobs_category_id
  on public.jobs (category_id);

create index if not exists idx_jobs_status_service_id
  on public.jobs (status, service_id);

create index if not exists idx_jobs_status_category_id
  on public.jobs (status, category_id);

create index if not exists idx_jobs_client_id_status
  on public.jobs (client_id, status);

create index if not exists idx_jobs_assigned_professional_id_status
  on public.jobs (assigned_professional_id, status);

create index if not exists idx_jobs_created_at
  on public.jobs (created_at);

create index if not exists idx_jobs_approx_lat
  on public.jobs (approx_lat);

create index if not exists idx_jobs_approx_lng
  on public.jobs (approx_lng);

-- ---------------------------------------------------------------------------
-- Requests, invitations, negotiations, chats, and messages
-- ---------------------------------------------------------------------------

create index if not exists idx_job_requests_job_id
  on public.job_requests (job_id);

create index if not exists idx_job_requests_professional_id
  on public.job_requests (professional_id);

create index if not exists idx_job_requests_status
  on public.job_requests (status);

create index if not exists idx_job_requests_job_id_status
  on public.job_requests (job_id, status);

create index if not exists idx_job_requests_professional_id_status
  on public.job_requests (professional_id, status);

create index if not exists idx_job_invitations_job_id
  on public.job_invitations (job_id);

create index if not exists idx_job_invitations_professional_id
  on public.job_invitations (professional_id);

create index if not exists idx_job_invitations_status
  on public.job_invitations (status);

create index if not exists idx_job_invitations_job_id_status
  on public.job_invitations (job_id, status);

create index if not exists idx_job_invitations_professional_id_status
  on public.job_invitations (professional_id, status);

create index if not exists idx_job_negotiations_job_id
  on public.job_negotiations (job_id);

create index if not exists idx_job_negotiations_professional_id
  on public.job_negotiations (professional_id);

create index if not exists idx_job_negotiations_status
  on public.job_negotiations (status);

create index if not exists idx_job_negotiations_job_id_status
  on public.job_negotiations (job_id, status);

create index if not exists idx_job_negotiations_professional_id_status
  on public.job_negotiations (professional_id, status);

create index if not exists idx_job_negotiation_events_negotiation_id
  on public.job_negotiation_events (negotiation_id);

create index if not exists idx_job_negotiation_events_job_id
  on public.job_negotiation_events (job_id);

create index if not exists idx_job_negotiation_events_created_at
  on public.job_negotiation_events (created_at);

create index if not exists idx_job_negotiation_events_negotiation_id_created_at
  on public.job_negotiation_events (negotiation_id, created_at);

create index if not exists idx_chats_client_id
  on public.chats (client_id);

create index if not exists idx_chats_professional_id
  on public.chats (professional_id);

create index if not exists idx_chats_last_message_at
  on public.chats (last_message_at);

create index if not exists idx_chat_messages_chat_id
  on public.chat_messages (chat_id);

create index if not exists idx_chat_messages_job_id
  on public.chat_messages (job_id);

create index if not exists idx_chat_messages_sender_profile_id
  on public.chat_messages (sender_profile_id);

create index if not exists idx_chat_messages_created_at
  on public.chat_messages (created_at);

create index if not exists idx_chat_messages_chat_id_created_at
  on public.chat_messages (chat_id, created_at);

create index if not exists idx_chat_messages_leak_detected
  on public.chat_messages (leak_detected);

create index if not exists idx_chat_messages_leak_checked
  on public.chat_messages (leak_checked);

-- ---------------------------------------------------------------------------
-- Agreements, disputes, reviews, moderation, catalog, and search tickets
-- ---------------------------------------------------------------------------

create index if not exists idx_moderation_flags_job_id
  on public.moderation_flags (job_id);

create index if not exists idx_moderation_flags_chat_id
  on public.moderation_flags (chat_id);

create index if not exists idx_moderation_flags_chat_message_id
  on public.moderation_flags (chat_message_id);

create index if not exists idx_moderation_flags_sender_profile_id
  on public.moderation_flags (sender_profile_id);

create index if not exists idx_moderation_flags_strike_applied
  on public.moderation_flags (strike_applied);

create index if not exists idx_moderation_flags_resolved_at
  on public.moderation_flags (resolved_at);

create index if not exists idx_moderation_flags_created_at
  on public.moderation_flags (created_at);

create index if not exists idx_agreements_professional_id
  on public.agreements (professional_id);

create index if not exists idx_agreements_payment_status
  on public.agreements (payment_status);

create index if not exists idx_agreements_created_at
  on public.agreements (created_at);

create index if not exists idx_disputes_job_id
  on public.disputes (job_id);

create index if not exists idx_disputes_status
  on public.disputes (status);

create index if not exists idx_disputes_opened_by_profile_id
  on public.disputes (opened_by_profile_id);

create index if not exists idx_disputes_resolved_by_admin_id
  on public.disputes (resolved_by_admin_id);

create index if not exists idx_disputes_opened_at
  on public.disputes (opened_at);

create index if not exists idx_reviews_job_id
  on public.reviews (job_id);

create index if not exists idx_reviews_reviewer_profile_id
  on public.reviews (reviewer_profile_id);

create index if not exists idx_reviews_target_profile_id
  on public.reviews (target_profile_id);

create index if not exists idx_reviews_rating
  on public.reviews (rating);

create index if not exists idx_reviews_created_at
  on public.reviews (created_at);

create index if not exists idx_catalog_categories_active
  on public.catalog_categories (active);

create index if not exists idx_catalog_categories_source
  on public.catalog_categories (source);

create index if not exists idx_catalog_categories_group_name
  on public.catalog_categories (group_name);

create index if not exists idx_catalog_categories_name
  on public.catalog_categories (name);

create index if not exists idx_catalog_services_category_id
  on public.catalog_services (category_id);

create index if not exists idx_catalog_services_active
  on public.catalog_services (active);

create index if not exists idx_catalog_services_source
  on public.catalog_services (source);

create index if not exists idx_catalog_services_name
  on public.catalog_services (name);

create index if not exists idx_catalog_requests_requested_by_profile_id
  on public.catalog_requests (requested_by_profile_id);

create index if not exists idx_catalog_requests_status
  on public.catalog_requests (status);

create index if not exists idx_catalog_requests_reviewed_by_admin_id
  on public.catalog_requests (reviewed_by_admin_id);

create index if not exists idx_catalog_requests_created_at
  on public.catalog_requests (created_at);

create index if not exists idx_catalog_requests_merged_into_service_id
  on public.catalog_requests (merged_into_service_id);

create index if not exists idx_catalog_requests_approved_service_id
  on public.catalog_requests (approved_service_id);

create index if not exists idx_search_tickets_client_id
  on public.search_tickets (client_id);

create index if not exists idx_search_tickets_job_id
  on public.search_tickets (job_id);

create index if not exists idx_search_tickets_status
  on public.search_tickets (status);

create index if not exists idx_search_tickets_reason
  on public.search_tickets (reason);

create index if not exists idx_search_tickets_created_at
  on public.search_tickets (created_at);

create index if not exists idx_search_tickets_zone
  on public.search_tickets (zone);

-- ---------------------------------------------------------------------------
-- Partial unique indexes for key invariants
-- ---------------------------------------------------------------------------

-- Only one accepted request should exist per job.
create unique index if not exists idx_job_requests_one_accepted_per_job
  on public.job_requests (job_id)
  where status = 'accepted';

-- Only one active dispute should exist per job.
create unique index if not exists idx_disputes_one_active_per_job
  on public.disputes (job_id)
  where status in ('open', 'under_review');

-- A professional can have at most one primary service.
create unique index if not exists idx_professional_services_one_primary_per_professional
  on public.professional_services (professional_id)
  where is_primary = true;
