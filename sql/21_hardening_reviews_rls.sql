-- ARRANXOS v3 - Supabase Phase 1
-- File: 21_hardening_reviews_rls.sql
-- Purpose: Harden review reads so comments are not globally visible.
-- Execution order: after 02_rls_policies.sql and 05_grants.sql

-- ---------------------------------------------------------------------------
-- reviews_select_participants
-- Notes:
-- - Replaces the previous open read policy (`using (true)`).
-- - Reviews remain readable only by admins or the job participants linked to
--   the reviewed job.
-- - Keeps the existing table grant so PostgreSQL can still evaluate RLS for
--   allowed authenticated callers.
-- ---------------------------------------------------------------------------

drop policy if exists reviews_select_authenticated on public.reviews;
drop policy if exists reviews_select_participants on public.reviews;
drop policy if exists reviews_select_participants_or_admin on public.reviews;

create policy reviews_select_participants
on public.reviews
for select
to authenticated
using (
  public.is_admin()
  or public.owns_job(job_id)
  or public.is_assigned_professional_for_job(job_id)
);
