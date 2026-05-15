# Supabase Phase 1 - Arranxos v3

## Objective

Prepare a safe, migrable Supabase foundation for Arranxos without coupling the app to Supabase internals.

Phase 1 focuses on repository structure, database planning, and integration rules - not production deployment.

## Included Scope

- SQL-first workflow for schema and data access.
- Versioned SQL files under `/sql`.
- RLS and RPC strategy definitions.
- Migrable architecture rule: `UI -> src/lib/api -> Supabase`.
- Entity map and domain boundaries for first functional migration slices.

## Out of Scope (Phase 1)

- Real Supabase connection in app code.
- Supabase SDK integration in components.
- Stripe real payments.
- Maps/geospatial production stack.
- Real email delivery.
- Deploy migration changes.
- Backend-own migration work.
- Realtime implementation before base RLS/RPC + basic fetch stability.

## Migrable Strategy

Supabase is the initial accelerator, not the final mandatory backend.

Design decisions must keep a future migration path open to a custom backend or alternative stack.

Rules:

- Keep domain contracts in app-owned types.
- Keep data-access logic in `src/lib/api` (adapter boundary).
- Avoid Supabase-specific assumptions in UI/page components.
- Avoid direct `supabase.from(...)` usage in `src/app`.

## Data Access Architecture

Mandatory flow:

- `UI -> src/lib/api -> Supabase`

Forbidden in Phase 1:

- Direct Supabase calls from `src/app` components/pages.
- Bypassing API boundary for sensitive writes.

## SQL-First and Versioned SQL

All SQL lives in repository and is reviewed before manual execution:

1. `sql/00_schema.sql`
2. `sql/01_seed.sql`
3. `sql/02_rls_policies.sql`
4. `sql/03_rpc_functions.sql`
5. `sql/04_indexes.sql`

Guidelines:

- Non-destructive by default.
- No destructive `DROP` usage unless explicit review and dedicated context.
- No "SQL only in Supabase SQL Editor" changes; repo is source of truth.

## RLS / RPC Security Rules

- Apply RLS after base schema is stable.
- Sensitive operations go through RPC (not direct table writes from frontend).
- RPC must use `SECURITY DEFINER` only when justified.
- RPC with `SECURITY DEFINER` must define explicit `search_path`.
- Keep least-privilege model; do not use `service_role` in app runtime.

## OpenCode Read-Only Audits

For future DB auditing tasks:

- OpenCode access should be read-only.
- Use a dedicated PostgreSQL read-only user for introspection/audit.
- Do not use `service_role` for OpenCode workflows.

## Entity Map (Accepted for Phase 1)

Base entities:

- `profiles`
- `professionals`
- `professional_services`
- `jobs`
- `job_private_locations`
- `job_requests`
- `job_invitations`
- `job_negotiations`
- `job_negotiation_events` (optional)
- `chats`
- `chat_messages`
- `agreements`
- `disputes`
- `reviews`
- `moderation_flags`
- `admin_config`
- `catalog_categories`
- `catalog_services`
- `catalog_requests`
- `search_tickets`

Important modeling decisions:

- Approximate location lives in `jobs`.
- Exact location lives in `job_private_locations`.
- Professional specialties live in `professional_services`.
- Pre-agreement negotiation lives in `job_negotiations`.
- Final deal lives in `agreements`.
- Invitations are modeled with `job_invitations` from Phase 1.
- Chat is not created before acceptance.
- Messages are not inserted directly from frontend; they must go through RPC `send_chat_message` when implemented.
- Realtime comes after RLS/RPC and basic fetch behavior are stable.

## Current Status

- Supabase real connection: not enabled.
- SQL execution in Supabase: not performed.
- This document defines structure and guardrails only.
