-- ARRANXOS v3 - Supabase Phase 1
-- File: 14_reviews_rls.sql
-- Purpose: Narrow reviews read access to admins and direct participants.
-- Execution order: after 13_reviews_rpc.sql

drop policy if exists reviews_select_authenticated on public.reviews;
drop policy if exists reviews_select_participants_or_admin on public.reviews;

create policy reviews_select_participants_or_admin
on public.reviews
for select
to authenticated
using (
  public.is_admin()
  or reviewer_profile_id = auth.uid()
  or target_profile_id = auth.uid()
);
