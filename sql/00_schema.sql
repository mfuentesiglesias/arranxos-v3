-- ARRANXOS v3 - Supabase Phase 1
-- File: 00_schema.sql
-- Purpose: Base schema definitions (tables, enums, constraints) for Phase 1.
-- Execution order: 1 of 5
--
-- IMPORTANT:
-- - Do NOT execute SQL that has not been reviewed.
-- - SQL in this repository must be non-destructive by default.
-- - Do NOT use destructive DROP statements unless they are in a dedicated file
--   and explicitly approved in review.
--
-- NOTES:
-- - This file contains the first real schema draft for Phase 1.
-- - RLS policies are intentionally NOT defined here.
-- - Product tables must receive RLS in sql/02_rls_policies.sql.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'profile_role') then
    create type profile_role as enum ('client', 'professional', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'professional_status') then
    create type professional_status as enum ('pending', 'approved', 'blocked');
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type verification_status as enum ('not_verified', 'pending', 'verified', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'catalog_source') then
    create type catalog_source as enum ('seed', 'admin_approved');
  end if;

  if not exists (select 1 from pg_type where typname = 'job_status') then
    create type job_status as enum (
      'published',
      'in_progress',
      'agreement_pending',
      'agreed',
      'escrow_funded',
      'completed_pending_confirmation',
      'completed',
      'dispute',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'job_contact_preference') then
    create type job_contact_preference as enum ('chat', 'phone_after_acceptance');
  end if;

  if not exists (select 1 from pg_type where typname = 'job_request_status') then
    create type job_request_status as enum ('pending', 'accepted', 'rejected', 'closed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'job_invitation_status') then
    create type job_invitation_status as enum ('pending', 'accepted', 'rejected', 'expired', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'job_negotiation_status') then
    create type job_negotiation_status as enum ('active', 'accepted', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'job_negotiation_event_type') then
    create type job_negotiation_event_type as enum ('proposal', 'counteroffer', 'accepted', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'chat_sender_role') then
    create type chat_sender_role as enum ('client', 'professional', 'admin', 'system');
  end if;

  if not exists (select 1 from pg_type where typname = 'agreement_payment_status') then
    create type agreement_payment_status as enum ('pending', 'protected', 'released', 'cancelled', 'refunded');
  end if;

  if not exists (select 1 from pg_type where typname = 'dispute_status') then
    create type dispute_status as enum ('open', 'under_review', 'resolved_client', 'resolved_professional', 'split', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'review_target_type') then
    create type review_target_type as enum ('client', 'professional');
  end if;

  if not exists (select 1 from pg_type where typname = 'catalog_request_status') then
    create type catalog_request_status as enum ('pending', 'reviewing', 'approved', 'rejected', 'merged');
  end if;

  if not exists (select 1 from pg_type where typname = 'search_ticket_reason') then
    create type search_ticket_reason as enum ('no_pros_in_zone', 'no_useful_response', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'search_ticket_status') then
    create type search_ticket_status as enum ('open', 'in_progress', 'resolved', 'cancelled');
  end if;
end
$$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role profile_role not null,
  full_name text not null,
  avatar_initials text,
  location_label text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists professionals (
  profile_id uuid primary key references profiles(id) on delete cascade,
  status professional_status not null default 'pending',
  verification_status verification_status not null default 'not_verified',
  slug text unique,
  public_profile_enabled boolean not null default false,
  specialty_label text,
  zone text,
  radius_km integer,
  bio text,
  strike_count integer not null default 0,
  reliability_snapshot jsonb,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professionals_strike_count_nonnegative check (strike_count >= 0),
  constraint professionals_radius_km_nonnegative check (radius_km is null or radius_km >= 0)
);

create table if not exists catalog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  group_name text,
  color text,
  active boolean not null default true,
  source catalog_source not null,
  created_from_request_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists catalog_services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references catalog_categories(id) on delete restrict,
  name text not null,
  description text,
  aliases text[] not null default '{}',
  active boolean not null default true,
  source catalog_source not null,
  created_from_request_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists professional_services (
  professional_id uuid not null references professionals(profile_id) on delete cascade,
  service_id uuid not null references catalog_services(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (professional_id, service_id)
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete restrict,
  assigned_professional_id uuid references professionals(profile_id) on delete set null,
  category_id uuid references catalog_categories(id) on delete set null,
  service_id uuid references catalog_services(id) on delete set null,
  title text not null,
  description text not null,
  status job_status not null default 'published',
  price_min integer,
  price_max integer,
  final_price integer,
  commission_pct_snapshot numeric,
  contact_preference job_contact_preference not null default 'chat',
  approx_location text,
  approx_lat double precision,
  approx_lng double precision,
  approx_radius_m integer not null default 1500,
  invited_count integer not null default 0,
  invitations_sent_at timestamptz,
  completion_deadline timestamptz,
  questionnaire jsonb not null default '{}'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_price_min_nonnegative check (price_min is null or price_min >= 0),
  constraint jobs_price_max_nonnegative check (price_max is null or price_max >= 0),
  constraint jobs_final_price_nonnegative check (final_price is null or final_price >= 0),
  constraint jobs_price_range_valid check (
    price_min is null or price_max is null or price_min <= price_max
  ),
  constraint jobs_commission_pct_snapshot_range check (
    commission_pct_snapshot is null or commission_pct_snapshot between 0 and 100
  ),
  constraint jobs_approx_radius_m_nonnegative check (approx_radius_m >= 0),
  constraint jobs_invited_count_nonnegative check (invited_count >= 0)
);

create table if not exists job_private_locations (
  job_id uuid primary key references jobs(id) on delete cascade,
  exact_location jsonb not null,
  exact_lat double precision,
  exact_lng double precision,
  updated_at timestamptz not null default now()
);

create table if not exists job_requests (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  professional_id uuid not null references professionals(profile_id) on delete cascade,
  message text,
  status job_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, professional_id)
);

create table if not exists job_invitations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  professional_id uuid not null references professionals(profile_id) on delete cascade,
  invited_by_client_id uuid not null references profiles(id) on delete restrict,
  status job_invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, professional_id)
);

create table if not exists job_negotiations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  professional_id uuid not null references professionals(profile_id) on delete cascade,
  status job_negotiation_status not null default 'active',
  last_amount integer,
  proposed_by_role profile_role,
  client_accepted boolean not null default false,
  professional_accepted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, professional_id),
  unique (id, job_id),
  constraint job_negotiations_last_amount_nonnegative check (last_amount is null or last_amount >= 0),
  constraint job_negotiations_proposed_by_role check (
    proposed_by_role is null or proposed_by_role in ('client', 'professional')
  )
);

create table if not exists job_negotiation_events (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null,
  job_id uuid not null references jobs(id) on delete cascade,
  by_profile_id uuid not null references profiles(id) on delete restrict,
  by_role profile_role not null,
  event_type job_negotiation_event_type not null,
  amount integer,
  note text,
  created_at timestamptz not null default now(),
  constraint job_negotiation_events_negotiation_job_fk foreign key (negotiation_id, job_id)
    references job_negotiations (id, job_id) on delete cascade,
  constraint job_negotiation_events_amount_nonnegative check (amount is null or amount >= 0)
);

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  client_id uuid not null references profiles(id) on delete restrict,
  professional_id uuid not null references professionals(profile_id) on delete restrict,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  unique (job_id),
  unique (id, job_id)
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null,
  job_id uuid not null references jobs(id) on delete cascade,
  sender_profile_id uuid references profiles(id) on delete restrict,
  sender_role chat_sender_role not null,
  content text not null,
  message_type text not null default 'text',
  proposal_amount integer,
  leak_checked boolean not null default false,
  leak_detected boolean not null default false,
  leak_types text[] not null default '{}',
  redacted_content text,
  blocked_reason text,
  created_at timestamptz not null default now(),
  constraint chat_messages_chat_job_fk foreign key (chat_id, job_id)
    references chats (id, job_id) on delete cascade,
  constraint chat_messages_system_sender_consistency check (
    (sender_role = 'system' and sender_profile_id is null)
    or (sender_role <> 'system' and sender_profile_id is not null)
  ),
  constraint chat_messages_proposal_amount_nonnegative check (
    proposal_amount is null or proposal_amount >= 0
  )
);

create table if not exists moderation_flags (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  chat_id uuid references chats(id) on delete set null,
  chat_message_id uuid references chat_messages(id) on delete set null,
  sender_profile_id uuid references profiles(id) on delete set null,
  sender_role chat_sender_role,
  original_text text,
  redacted_text text,
  leak_types text[] not null default '{}',
  strike_applied boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists agreements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  professional_id uuid not null references professionals(profile_id) on delete restrict,
  final_price integer not null,
  commission_pct numeric not null,
  payment_status agreement_payment_status not null default 'pending',
  price_guaranteed boolean not null default false,
  accepted_by_client boolean not null default false,
  accepted_by_professional boolean not null default false,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  released_at timestamptz,
  unique (job_id),
  constraint agreements_final_price_nonnegative check (final_price >= 0),
  constraint agreements_commission_pct_range check (commission_pct between 0 and 100)
);

create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  opened_by_profile_id uuid not null references profiles(id) on delete restrict,
  opened_by_role profile_role not null,
  reason text not null,
  description text,
  status dispute_status not null default 'open',
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_admin_id uuid references profiles(id) on delete set null,
  resolution_note text,
  evidence jsonb not null default '[]'::jsonb,
  constraint disputes_opened_by_role check (opened_by_role in ('client', 'professional', 'admin'))
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  reviewer_profile_id uuid not null references profiles(id) on delete restrict,
  reviewer_role profile_role not null,
  target_profile_id uuid not null references profiles(id) on delete restrict,
  target_type review_target_type not null,
  rating integer not null,
  comment text,
  created_at timestamptz not null default now(),
  unique (job_id, reviewer_profile_id, target_profile_id),
  constraint reviews_rating_between_1_and_5 check (rating between 1 and 5),
  constraint reviews_reviewer_role check (reviewer_role in ('client', 'professional', 'admin'))
);

create table if not exists admin_config (
  id text primary key default 'global',
  commission_pct numeric not null default 9,
  auto_release_days integer not null default 5,
  invitation_limit_per_job integer not null default 10,
  search_ticket_no_response_days integer not null default 3,
  strike_auto_block_threshold integer not null default 3,
  anti_leak_enabled boolean not null default true,
  anti_leak_phones boolean not null default true,
  anti_leak_emails boolean not null default true,
  anti_leak_urls boolean not null default true,
  anti_leak_whatsapp boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint admin_config_singleton_id check (id = 'global'),
  constraint admin_config_commission_pct_range check (commission_pct between 0 and 100),
  constraint admin_config_auto_release_days_positive check (auto_release_days > 0),
  constraint admin_config_invitation_limit_positive check (invitation_limit_per_job > 0),
  constraint admin_config_search_ticket_days_positive check (search_ticket_no_response_days > 0),
  constraint admin_config_strike_threshold_positive check (strike_auto_block_threshold > 0)
);

create table if not exists catalog_requests (
  id uuid primary key default gen_random_uuid(),
  requested_name text not null,
  suggested_category_id uuid references catalog_categories(id) on delete set null,
  suggested_category_name text,
  description text,
  requested_by_profile_id uuid not null references profiles(id) on delete restrict,
  requested_by_role profile_role not null,
  status catalog_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_admin_id uuid references profiles(id) on delete set null,
  rejection_reason text,
  merged_into_service_id uuid references catalog_services(id) on delete set null,
  approved_service_id uuid references catalog_services(id) on delete set null,
  constraint catalog_requests_requested_by_role check (
    requested_by_role in ('client', 'professional', 'admin')
  )
);

create table if not exists search_tickets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete set null,
  client_id uuid not null references profiles(id) on delete restrict,
  service_label text,
  zone text,
  radius_km integer,
  reason search_ticket_reason not null,
  status search_ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint search_tickets_radius_km_nonnegative check (radius_km is null or radius_km >= 0)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_categories_created_from_request_fk'
  ) then
    alter table catalog_categories
      add constraint catalog_categories_created_from_request_fk
      foreign key (created_from_request_id)
      references catalog_requests (id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_services_created_from_request_fk'
  ) then
    alter table catalog_services
      add constraint catalog_services_created_from_request_fk
      foreign key (created_from_request_id)
      references catalog_requests (id)
      on delete set null;
  end if;
end
$$;

comment on table profiles is 'Core user profile linked to auth.users.';
comment on table professionals is 'Professional-only data keyed by profile_id.';
comment on table jobs is 'Client jobs with approximate location only.';
comment on table job_private_locations is 'Exact location; future RLS must restrict to client, admin, and accepted professional.';
comment on table chat_messages is 'In Phase 1+, inserts must move through RPC send_chat_message; do not write directly from frontend.';
