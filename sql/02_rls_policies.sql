-- ARRANXOS v3 - Supabase Phase 1
-- File: 02_rls_policies.sql
-- Purpose: Row Level Security enablement and policies.
-- Execution order: 3 of 5
--
-- IMPORTANT:
-- - Do NOT execute SQL that has not been reviewed.
-- - SQL in this repository must be non-destructive by default.
-- - Do NOT use destructive DROP statements unless they are in a dedicated file
--   and explicitly approved in review.
--
-- NOTES:
-- - This file assumes sql/00_schema.sql has already been executed.
-- - Policies are created via DO blocks because PostgreSQL does not support
--   CREATE POLICY IF NOT EXISTS.
-- - Helper functions live here because they are part of the RLS contract and
--   avoid policy recursion on protected tables such as profiles and professionals.
-- - Sensitive business mutations remain intentionally conservative here and are
--   expected to move to sql/03_rpc_functions.sql later.

-- ---------------------------------------------------------------------------
-- Minimal RLS helper functions
-- ---------------------------------------------------------------------------

create or replace function public.current_profile_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.role
  from public.profiles as p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.current_professional_status()
returns public.professional_status
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.status
  from public.professionals as p
  where p.profile_id = auth.uid()
  limit 1
$$;

create or replace function public.current_professional_verification_status()
returns public.verification_status
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.verification_status
  from public.professionals as p
  where p.profile_id = auth.uid()
  limit 1
$$;

create or replace function public.current_professional_strike_count()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.strike_count
  from public.professionals as p
  where p.profile_id = auth.uid()
  limit 1
$$;

create or replace function public.current_professional_reliability_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.reliability_snapshot
  from public.professionals as p
  where p.profile_id = auth.uid()
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_profile_role() = 'admin', false)
$$;

create or replace function public.is_approved_professional()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    public.current_profile_role() = 'professional'
    and public.current_professional_status() = 'approved',
    false
  )
$$;

create or replace function public.is_active_professional()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    public.current_profile_role() = 'professional'
    and public.current_professional_status() = 'approved',
    false
  )
$$;

create or replace function public.is_approved_professional_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.professionals as p
    where p.profile_id = target_profile_id
      and p.status = 'approved'
  )
$$;

create or replace function public.is_public_professional(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.professionals as p
    where p.profile_id = target_profile_id
      and p.status = 'approved'
      and p.public_profile_enabled = true
  )
$$;

create or replace function public.owns_job(target_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.jobs as j
    where j.id = target_job_id
      and j.client_id = auth.uid()
  )
$$;

create or replace function public.is_assigned_professional_for_job(target_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.jobs as j
    where j.id = target_job_id
      and public.is_active_professional()
      and j.assigned_professional_id = auth.uid()
  )
$$;

create or replace function public.job_is_published(target_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.jobs as j
    where j.id = target_job_id
      and j.status = 'published'
  )
$$;

create or replace function public.can_update_job_private_location(target_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.jobs as j
    where j.id = target_job_id
      and j.client_id = auth.uid()
      and j.status not in ('completed_pending_confirmation', 'completed', 'dispute', 'cancelled')
  )
$$;

create or replace function public.is_negotiation_participant(target_negotiation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.job_negotiations as n
    join public.jobs as j
      on j.id = n.job_id
    where n.id = target_negotiation_id
      and (
        j.client_id = auth.uid()
        or (
          n.professional_id = auth.uid()
          and public.is_active_professional()
        )
      )
  )
$$;

create or replace function public.is_chat_participant(target_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.chats as c
    where c.id = target_chat_id
      and (
        c.client_id = auth.uid()
        or (
          c.professional_id = auth.uid()
          and public.is_active_professional()
        )
      )
  )
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every product table
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.professionals enable row level security;
alter table public.professional_services enable row level security;
alter table public.catalog_categories enable row level security;
alter table public.catalog_services enable row level security;
alter table public.jobs enable row level security;
alter table public.job_private_locations enable row level security;
alter table public.job_requests enable row level security;
alter table public.job_invitations enable row level security;
alter table public.job_negotiations enable row level security;
alter table public.job_negotiation_events enable row level security;
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;
alter table public.moderation_flags enable row level security;
alter table public.agreements enable row level security;
alter table public.disputes enable row level security;
alter table public.reviews enable row level security;
alter table public.admin_config enable row level security;
alter table public.catalog_requests enable row level security;
alter table public.search_tickets enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- Intentionally self/admin only. Public professional profile reads should move
-- through a safe view later because RLS cannot hide sensitive columns like phone.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_self_or_admin'
  ) then
    execute $policy$
      create policy profiles_select_self_or_admin
      on public.profiles
      for select
      to authenticated
      using (
        id = auth.uid()
        or public.is_admin()
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_self'
  ) then
    execute $policy$
      create policy profiles_insert_self
      on public.profiles
      for insert
      to authenticated
      with check (
        id = auth.uid()
        and role in ('client', 'professional')
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_self_or_admin'
  ) then
    execute $policy$
      create policy profiles_update_self_or_admin
      on public.profiles
      for update
      to authenticated
      using (
        id = auth.uid()
        or public.is_admin()
      )
      with check (
        public.is_admin()
        or (
          id = auth.uid()
          and role = public.current_profile_role()
        )
      )
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- professionals
-- Full professionals rows are self/admin only.
-- Public professional data should later be exposed via a safe view/projection,
-- not by opening this table because it contains internal fields.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'professionals'
      and policyname = 'professionals_select_visible'
  ) then
    execute $policy$
      create policy professionals_select_visible
      on public.professionals
      for select
      to authenticated
      using (
        public.is_admin()
        or profile_id = auth.uid()
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'professionals'
      and policyname = 'professionals_insert_self_pending'
  ) then
    execute $policy$
      create policy professionals_insert_self_pending
      on public.professionals
      for insert
      to authenticated
      with check (
        public.current_profile_role() = 'professional'
        and profile_id = auth.uid()
        and status = 'pending'
        and verification_status = 'not_verified'
        and strike_count = 0
        and reliability_snapshot is null
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'professionals'
      and policyname = 'professionals_update_self_or_admin'
  ) then
    execute $policy$
      create policy professionals_update_self_or_admin
      on public.professionals
      for update
      to authenticated
      using (
        public.is_admin()
        or (
          profile_id = auth.uid()
          and public.current_professional_status() <> 'blocked'
        )
      )
      with check (
        public.is_admin()
        or (
          profile_id = auth.uid()
          and public.current_professional_status() <> 'blocked'
          and status = public.current_professional_status()
          and verification_status = public.current_professional_verification_status()
          and strike_count = public.current_professional_strike_count()
          and reliability_snapshot is not distinct from public.current_professional_reliability_snapshot()
        )
      )
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- professional_services
-- Pending professionals may curate their profile, but blocked professionals may
-- not mutate service mappings.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'professional_services'
      and policyname = 'professional_services_select_visible'
  ) then
    execute $policy$
      create policy professional_services_select_visible
      on public.professional_services
      for select
      to authenticated
      using (
        public.is_admin()
        or professional_id = auth.uid()
        or public.is_public_professional(professional_id)
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'professional_services'
      and policyname = 'professional_services_insert_owner_or_admin'
  ) then
    execute $policy$
      create policy professional_services_insert_owner_or_admin
      on public.professional_services
      for insert
      to authenticated
      with check (
        public.is_admin()
        or (
          professional_id = auth.uid()
          and public.current_profile_role() = 'professional'
          and coalesce(public.current_professional_status() <> 'blocked', false)
        )
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'professional_services'
      and policyname = 'professional_services_update_owner_or_admin'
  ) then
    execute $policy$
      create policy professional_services_update_owner_or_admin
      on public.professional_services
      for update
      to authenticated
      using (
        public.is_admin()
        or (
          professional_id = auth.uid()
          and public.current_profile_role() = 'professional'
          and coalesce(public.current_professional_status() <> 'blocked', false)
        )
      )
      with check (
        public.is_admin()
        or (
          professional_id = auth.uid()
          and public.current_profile_role() = 'professional'
          and coalesce(public.current_professional_status() <> 'blocked', false)
        )
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'professional_services'
      and policyname = 'professional_services_delete_owner_or_admin'
  ) then
    execute $policy$
      create policy professional_services_delete_owner_or_admin
      on public.professional_services
      for delete
      to authenticated
      using (
        public.is_admin()
        or (
          professional_id = auth.uid()
          and public.current_profile_role() = 'professional'
          and coalesce(public.current_professional_status() <> 'blocked', false)
        )
      )
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- catalog_categories
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_categories'
      and policyname = 'catalog_categories_select_active_or_admin'
  ) then
    execute $policy$
      create policy catalog_categories_select_active_or_admin
      on public.catalog_categories
      for select
      to authenticated
      using (
        active = true
        or public.is_admin()
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_categories'
      and policyname = 'catalog_categories_insert_admin'
  ) then
    execute $policy$
      create policy catalog_categories_insert_admin
      on public.catalog_categories
      for insert
      to authenticated
      with check (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_categories'
      and policyname = 'catalog_categories_update_admin'
  ) then
    execute $policy$
      create policy catalog_categories_update_admin
      on public.catalog_categories
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_categories'
      and policyname = 'catalog_categories_delete_admin'
  ) then
    execute $policy$
      create policy catalog_categories_delete_admin
      on public.catalog_categories
      for delete
      to authenticated
      using (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- catalog_services
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_services'
      and policyname = 'catalog_services_select_active_or_admin'
  ) then
    execute $policy$
      create policy catalog_services_select_active_or_admin
      on public.catalog_services
      for select
      to authenticated
      using (
        active = true
        or public.is_admin()
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_services'
      and policyname = 'catalog_services_insert_admin'
  ) then
    execute $policy$
      create policy catalog_services_insert_admin
      on public.catalog_services
      for insert
      to authenticated
      with check (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_services'
      and policyname = 'catalog_services_update_admin'
  ) then
    execute $policy$
      create policy catalog_services_update_admin
      on public.catalog_services
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_services'
      and policyname = 'catalog_services_delete_admin'
  ) then
    execute $policy$
      create policy catalog_services_delete_admin
      on public.catalog_services
      for delete
      to authenticated
      using (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- jobs
-- Clients can create their own published jobs. Direct updates are intentionally
-- omitted for now because stateful mutations should move through audited RPCs.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'jobs_select_visible'
  ) then
    execute $policy$
      create policy jobs_select_visible
      on public.jobs
      for select
      to authenticated
      using (
        public.is_admin()
        or client_id = auth.uid()
        or public.is_assigned_professional_for_job(id)
        or (
          status = 'published'
          and public.is_approved_professional()
        )
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'jobs_insert_client_own_published'
  ) then
    execute $policy$
      create policy jobs_insert_client_own_published
      on public.jobs
      for insert
      to authenticated
      with check (
        public.current_profile_role() = 'client'
        and client_id = auth.uid()
        and assigned_professional_id is null
        and status = 'published'
        and final_price is null
        and commission_pct_snapshot is null
        and invited_count = 0
        and invitations_sent_at is null
        and completion_deadline is null
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'jobs_update_admin'
  ) then
    execute $policy$
      create policy jobs_update_admin
      on public.jobs
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- job_private_locations
-- Exact address exposure must remain tightly constrained.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_private_locations'
      and policyname = 'job_private_locations_select_participants'
  ) then
    execute $policy$
      create policy job_private_locations_select_participants
      on public.job_private_locations
      for select
      to authenticated
      using (
        public.is_admin()
        or public.owns_job(job_id)
        or public.is_assigned_professional_for_job(job_id)
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_private_locations'
      and policyname = 'job_private_locations_insert_owner_or_admin'
  ) then
    execute $policy$
      create policy job_private_locations_insert_owner_or_admin
      on public.job_private_locations
      for insert
      to authenticated
      with check (
        public.is_admin()
        or public.owns_job(job_id)
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_private_locations'
      and policyname = 'job_private_locations_update_owner_or_admin'
  ) then
    execute $policy$
      create policy job_private_locations_update_owner_or_admin
      on public.job_private_locations
      for update
      to authenticated
      using (
        public.is_admin()
        or public.can_update_job_private_location(job_id)
      )
      with check (
        public.is_admin()
        or public.can_update_job_private_location(job_id)
      )
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- job_requests
-- Direct acceptance/rejection is deferred to RPCs. This draft only allows the
-- initial request creation by approved professionals.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_requests'
      and policyname = 'job_requests_select_participants'
  ) then
    execute $policy$
      create policy job_requests_select_participants
      on public.job_requests
      for select
      to authenticated
      using (
        public.is_admin()
        or public.owns_job(job_id)
        or (
          professional_id = auth.uid()
          and public.is_active_professional()
        )
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_requests'
      and policyname = 'job_requests_insert_approved_professional'
  ) then
    execute $policy$
      create policy job_requests_insert_approved_professional
      on public.job_requests
      for insert
      to authenticated
      with check (
        professional_id = auth.uid()
        and public.is_approved_professional()
        and public.job_is_published(job_id)
        and not public.owns_job(job_id)
        and status = 'pending'
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_requests'
      and policyname = 'job_requests_update_admin'
  ) then
    execute $policy$
      create policy job_requests_update_admin
      on public.job_requests
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- job_invitations
-- Direct participant state changes are deferred to RPCs.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_invitations'
      and policyname = 'job_invitations_select_participants'
  ) then
    execute $policy$
      create policy job_invitations_select_participants
      on public.job_invitations
      for select
      to authenticated
      using (
        public.is_admin()
        or public.owns_job(job_id)
        or (
          professional_id = auth.uid()
          and public.is_active_professional()
        )
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_invitations'
      and policyname = 'job_invitations_insert_owner_or_admin'
  ) then
    execute $policy$
      create policy job_invitations_insert_owner_or_admin
      on public.job_invitations
      for insert
      to authenticated
      with check (
        public.is_approved_professional_profile(professional_id)
        and (
          public.is_admin()
          or (
            invited_by_client_id = auth.uid()
            and public.owns_job(job_id)
            and status = 'pending'
          )
        )
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_invitations'
      and policyname = 'job_invitations_update_admin'
  ) then
    execute $policy$
      create policy job_invitations_update_admin
      on public.job_invitations
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- job_negotiations
-- Negotiation creation and mutation should move to RPCs. Admin keeps a manual
-- path for support operations while participants retain read access.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_negotiations'
      and policyname = 'job_negotiations_select_participants'
  ) then
    execute $policy$
      create policy job_negotiations_select_participants
      on public.job_negotiations
      for select
      to authenticated
      using (
        public.is_admin()
        or public.owns_job(job_id)
        or (
          professional_id = auth.uid()
          and public.is_active_professional()
        )
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_negotiations'
      and policyname = 'job_negotiations_insert_admin'
  ) then
    execute $policy$
      create policy job_negotiations_insert_admin
      on public.job_negotiations
      for insert
      to authenticated
      with check (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_negotiations'
      and policyname = 'job_negotiations_update_admin'
  ) then
    execute $policy$
      create policy job_negotiations_update_admin
      on public.job_negotiations
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- job_negotiation_events
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_negotiation_events'
      and policyname = 'job_negotiation_events_select_participants'
  ) then
    execute $policy$
      create policy job_negotiation_events_select_participants
      on public.job_negotiation_events
      for select
      to authenticated
      using (
        public.is_admin()
        or public.is_negotiation_participant(negotiation_id)
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_negotiation_events'
      and policyname = 'job_negotiation_events_insert_admin'
  ) then
    execute $policy$
      create policy job_negotiation_events_insert_admin
      on public.job_negotiation_events
      for insert
      to authenticated
      with check (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- chats
-- Chat creation is intentionally reserved for admin/RPC paths.
-- Chat should only be created by the future accept_job_request RPC.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chats'
      and policyname = 'chats_select_participants'
  ) then
    execute $policy$
      create policy chats_select_participants
      on public.chats
      for select
      to authenticated
      using (
        public.is_admin()
        or public.is_chat_participant(id)
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chats'
      and policyname = 'chats_insert_admin'
  ) then
    execute $policy$
      create policy chats_insert_admin
      on public.chats
      for insert
      to authenticated
      with check (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chats'
      and policyname = 'chats_update_admin'
  ) then
    execute $policy$
      create policy chats_update_admin
      on public.chats
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- chat_messages
-- Direct end-user inserts are intentionally blocked until the future
-- send_chat_message RPC exists with server-side anti-leak checks.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_messages'
      and policyname = 'chat_messages_select_participants'
  ) then
    execute $policy$
      create policy chat_messages_select_participants
      on public.chat_messages
      for select
      to authenticated
      using (
        public.is_admin()
        or public.is_chat_participant(chat_id)
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_messages'
      and policyname = 'chat_messages_insert_admin'
  ) then
    execute $policy$
      create policy chat_messages_insert_admin
      on public.chat_messages
      for insert
      to authenticated
      with check (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_messages'
      and policyname = 'chat_messages_update_admin'
  ) then
    execute $policy$
      create policy chat_messages_update_admin
      on public.chat_messages
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- moderation_flags
-- Admin-only in Phase 1.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'moderation_flags'
      and policyname = 'moderation_flags_select_admin'
  ) then
    execute $policy$
      create policy moderation_flags_select_admin
      on public.moderation_flags
      for select
      to authenticated
      using (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'moderation_flags'
      and policyname = 'moderation_flags_insert_admin'
  ) then
    execute $policy$
      create policy moderation_flags_insert_admin
      on public.moderation_flags
      for insert
      to authenticated
      with check (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'moderation_flags'
      and policyname = 'moderation_flags_update_admin'
  ) then
    execute $policy$
      create policy moderation_flags_update_admin
      on public.moderation_flags
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- agreements
-- Agreement creation and payment-state changes should move to RPCs.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'agreements'
      and policyname = 'agreements_select_participants'
  ) then
    execute $policy$
      create policy agreements_select_participants
      on public.agreements
      for select
      to authenticated
      using (
        public.is_admin()
        or public.owns_job(job_id)
        or (
          professional_id = auth.uid()
          and public.is_active_professional()
        )
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'agreements'
      and policyname = 'agreements_insert_admin'
  ) then
    execute $policy$
      create policy agreements_insert_admin
      on public.agreements
      for insert
      to authenticated
      with check (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'agreements'
      and policyname = 'agreements_update_admin'
  ) then
    execute $policy$
      create policy agreements_update_admin
      on public.agreements
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- disputes
-- Opening a dispute is allowed to the client owner or the assigned professional.
-- Resolution remains admin-only.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'disputes'
      and policyname = 'disputes_select_participants'
  ) then
    execute $policy$
      create policy disputes_select_participants
      on public.disputes
      for select
      to authenticated
      using (
        public.is_admin()
        or public.owns_job(job_id)
        or public.is_assigned_professional_for_job(job_id)
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'disputes'
      and policyname = 'disputes_insert_participants_or_admin'
  ) then
    execute $policy$
      create policy disputes_insert_participants_or_admin
      on public.disputes
      for insert
      to authenticated
      with check (
        (
          public.is_admin()
          and opened_by_role = 'admin'
        )
        or (
          opened_by_profile_id = auth.uid()
          and opened_by_role = public.current_profile_role()
          and status = 'open'
          and resolved_at is null
          and resolved_by_admin_id is null
          and (
            public.owns_job(job_id)
            or public.is_assigned_professional_for_job(job_id)
          )
        )
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'disputes'
      and policyname = 'disputes_update_admin'
  ) then
    execute $policy$
      create policy disputes_update_admin
      on public.disputes
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- reviews
-- Reads are limited to admins or the participants of the reviewed job.
-- Creation remains admin/RPC controlled until completed-job review rules are
-- implemented in a dedicated RPC.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reviews'
      and policyname = 'reviews_select_authenticated'
  ) then
    execute 'drop policy reviews_select_authenticated on public.reviews';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reviews'
      and policyname = 'reviews_select_participants'
  ) then
    execute 'drop policy reviews_select_participants on public.reviews';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reviews'
      and policyname = 'reviews_select_participants_or_admin'
  ) then
    execute 'drop policy reviews_select_participants_or_admin on public.reviews';
  end if;

  execute $policy$
    create policy reviews_select_participants
    on public.reviews
    for select
    to authenticated
    using (
      public.is_admin()
      or public.owns_job(job_id)
      or public.is_assigned_professional_for_job(job_id)
    )
  $policy$;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reviews'
      and policyname = 'reviews_insert_admin'
  ) then
    execute $policy$
      create policy reviews_insert_admin
      on public.reviews
      for insert
      to authenticated
      with check (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reviews'
      and policyname = 'reviews_update_admin'
  ) then
    execute $policy$
      create policy reviews_update_admin
      on public.reviews
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- admin_config
-- Admin-only. If the UI needs public configuration later, expose it through a
-- dedicated safe view instead of opening the full table.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_config'
      and policyname = 'admin_config_select_authenticated'
  ) then
    execute $policy$
      create policy admin_config_select_authenticated
      on public.admin_config
      for select
      to authenticated
      using (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_config'
      and policyname = 'admin_config_insert_admin'
  ) then
    execute $policy$
      create policy admin_config_insert_admin
      on public.admin_config
      for insert
      to authenticated
      with check (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_config'
      and policyname = 'admin_config_update_admin'
  ) then
    execute $policy$
      create policy admin_config_update_admin
      on public.admin_config
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_config'
      and policyname = 'admin_config_delete_admin'
  ) then
    execute $policy$
      create policy admin_config_delete_admin
      on public.admin_config
      for delete
      to authenticated
      using (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- catalog_requests
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_requests'
      and policyname = 'catalog_requests_select_requester_or_admin'
  ) then
    execute $policy$
      create policy catalog_requests_select_requester_or_admin
      on public.catalog_requests
      for select
      to authenticated
      using (
        public.is_admin()
        or requested_by_profile_id = auth.uid()
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_requests'
      and policyname = 'catalog_requests_insert_requester'
  ) then
    execute $policy$
      create policy catalog_requests_insert_requester
      on public.catalog_requests
      for insert
      to authenticated
      with check (
        requested_by_profile_id = auth.uid()
        and requested_by_role = public.current_profile_role()
        and status = 'pending'
        and reviewed_at is null
        and reviewed_by_admin_id is null
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_requests'
      and policyname = 'catalog_requests_update_admin'
  ) then
    execute $policy$
      create policy catalog_requests_update_admin
      on public.catalog_requests
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- search_tickets
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'search_tickets'
      and policyname = 'search_tickets_select_owner_or_admin'
  ) then
    execute $policy$
      create policy search_tickets_select_owner_or_admin
      on public.search_tickets
      for select
      to authenticated
      using (
        public.is_admin()
        or client_id = auth.uid()
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'search_tickets'
      and policyname = 'search_tickets_insert_client_own'
  ) then
    execute $policy$
      create policy search_tickets_insert_client_own
      on public.search_tickets
      for insert
      to authenticated
      with check (
        public.current_profile_role() = 'client'
        and client_id = auth.uid()
        and (
          job_id is null
          or public.owns_job(job_id)
        )
        and status = 'open'
      )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'search_tickets'
      and policyname = 'search_tickets_update_admin'
  ) then
    execute $policy$
      create policy search_tickets_update_admin
      on public.search_tickets
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin())
    $policy$;
  end if;
end
$$;
