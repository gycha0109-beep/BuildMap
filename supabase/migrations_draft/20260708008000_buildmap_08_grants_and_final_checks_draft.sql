-- ============================================================================
-- DRAFT ONLY - DO NOT APPLY DIRECTLY
-- BuildMap Supabase Migration SQL File Draft
-- This file is written under supabase/migrations_draft, not supabase/migrations.
-- Do not run with Supabase CLI. Do not apply to local/staging/production DB.
-- Purpose: review-only SQL draft before formal migration creation.
-- Required before apply: syntax verification, Supabase local dry-run, db lint,
-- Security/Performance Advisor review, and manual verification against 7.5 test cases.
-- ============================================================================

-- File: 08 grants and final checks
-- Depends on:
--   - 01-07 draft files
-- Purpose:
--   - grant candidates
--   - final manual verification notes
-- SECURITY WARNING:
--   - Do not grant broad anon select on source tables.
--   - Public-safe views and secure RPC are the preferred public boundary.
-- VERIFY BEFORE APPLY:
--   - Supabase Data API grant model.
--   - public-safe view owner-executed boundary and security_barrier behavior.
--   - RPC execute privileges.


-- ----------------------------------------------------------------------------
-- PATCH 13: Function EXECUTE permission hardening candidates
-- ----------------------------------------------------------------------------
-- PostgreSQL functions may be executable by PUBLIC unless explicitly revoked.
-- This draft separates internal helpers, trigger functions, and public/authenticated RPCs.
-- VERIFY BEFORE APPLY:
--   - exact function signatures.
--   - Supabase managed role behavior.
--   - whether ALTER DEFAULT PRIVILEGES should be used in the final migration.
--   - do not use broad GRANT EXECUTE ON ALL FUNCTIONS without review.

-- Function-specific PUBLIC revoke candidates.
-- VERIFY FUNCTION SIGNATURE BEFORE APPLY.
revoke execute on function public.current_user_profile_id() from public;
revoke execute on function public.is_project_owner(uuid) from public;
revoke execute on function public.is_project_owner_by_builder(uuid) from public;
revoke execute on function public.can_read_public_project(uuid) from public;
revoke execute on function public.can_read_public_change_card(uuid) from public;
revoke execute on function public.is_feedback_author(uuid) from public;
revoke execute on function public.can_insert_feedback(uuid, uuid) from public;
revoke execute on function public.can_read_feedback(uuid) from public;
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.prevent_approved_change_card_content_mutation() from public;
revoke execute on function public.prevent_feedback_author_spoofing() from public;
revoke execute on function public.validate_feedback_request_target_project() from public;
revoke execute on function public.hash_share_token_draft(text) from public;
revoke execute on function public.rotate_project_share_token(uuid) from public;
revoke execute on function public.revoke_project_share_token(uuid) from public;
revoke execute on function public.get_link_shared_project_page(uuid, text) from public;
revoke execute on function public.get_link_shared_decision_timeline(uuid, text) from public;
revoke execute on function public.get_link_shared_feedback_requests(uuid, text) from public;
revoke execute on function public.create_link_shared_feedback(uuid, text, text, text, boolean) from public;

-- Internal helper grants. Keep minimal and verify whether policies require EXECUTE grants for roles.
grant execute on function public.current_user_profile_id() to authenticated;
grant execute on function public.is_project_owner(uuid) to authenticated;
grant execute on function public.is_project_owner_by_builder(uuid) to authenticated;
grant execute on function public.can_insert_feedback(uuid, uuid) to authenticated;
grant execute on function public.is_feedback_author(uuid) to authenticated;

-- Public-read helper candidates used by RLS/view paths. Verify that direct boolean helper calls do not leak sensitive context.
grant execute on function public.can_read_public_project(uuid) to anon, authenticated;
grant execute on function public.can_read_public_change_card(uuid) to anon, authenticated;
grant execute on function public.can_read_feedback(uuid) to anon, authenticated;

-- Trigger functions should not be externally callable. Keep revoked from PUBLIC.
-- Do not grant trigger functions to anon/authenticated unless dry-run proves it is required.

-- Token hash helper is internal to secure RPC candidates. Keep direct execute revoked from anon/authenticated unless dry-run proves otherwise.

-- ----------------------------------------------------------------------------
-- PATCH 22: Public-safe view execution boundary
-- ----------------------------------------------------------------------------
-- Phase20 third run produced:
--   PRE-050 VIEW_ACCESS_ERROR public_project_cards blocked by privilege/security_invoker: 42501
-- Cause:
--   security_invoker=true made anon require underlying source table privileges.
-- Decision:
--   - do not grant anon source table SELECT.
--   - keep anon SELECT grants on public-safe views.
--   - make public-safe views owner-executed by omitting security_invoker=true in file 06.
--   - require explicit public row predicates and explicit column allowlists in every public-safe view.
--   - keep security_barrier=true as defense in depth, not as a substitute for predicates.
-- VERIFY BEFORE APPLY:
--   - local db reset and P0 scripts must show anon source table direct access denied.
--   - public-safe view SELECT must pass for anon.
--   - private/sensitive/internal/draft rows must be absent from views.
--   - forbidden identifier/token/body columns must be absent from views.
--   - if view owner/table owner behavior is unsafe in target environment, move the affected response to secure RPC/API.

-- ----------------------------------------------------------------------------
-- Source table grants
-- ----------------------------------------------------------------------------
-- DRAFT: PostgreSQL table/view/function privileges are checked separately from RLS.
-- A role must have the relevant object privilege before RLS row policies can be evaluated.
-- PATCH 21: Phase20 P0 second run showed that public tests must not read source tables directly.
--   - anon public reads use public-safe views.
--   - authenticated owner/non-owner source-table tests need minimum privileges so RLS can be evaluated.
--   - do not add broad anon source-table SELECT grants.
--   - do not use GRANT SELECT ON ALL TABLES or GRANT ALL ON ALL TABLES.
-- VERIFY BEFORE APPLY:
--   - security_invoker view behavior in the target PostgreSQL/Supabase version.
--   - whether public-safe views can remain view-based without broad anon source grants.

-- Explicitly keep anon away from source tables that contain internal or sensitive columns.
-- These revokes are deliberately broader than the previous rough_notes/ai_drafts/feedbacks-only revokes.
-- Public reads must go through public-safe views or secure RPC, not these source tables.
revoke all on table public.user_profiles from anon;
revoke all on table public.builder_profiles from anon;
revoke all on table public.projects from anon;
revoke all on table public.problem_definitions from anon;
revoke all on table public.hypotheses from anon;
revoke all on table public.rough_notes from anon;
revoke all on table public.ai_structured_drafts from anon;
revoke all on table public.change_cards from anon;
revoke all on table public.feedback_requests from anon;
revoke all on table public.feedbacks from anon;
revoke all on table public.project_links from anon;

-- Authenticated role can use source tables through RLS.
-- These are operation-specific table grants, not row grants. RLS and triggers still decide which rows/changes are allowed.
-- P0 minimums:
--   - projects: SELECT/UPDATE for owner/non-owner boundary checks.
--   - rough_notes, ai_structured_drafts: SELECT for owner/non-owner privacy checks.
--   - change_cards: SELECT/UPDATE for public/private boundary and approved mutation trigger checks.
--   - feedback_requests: SELECT for feedback insert helper/RLS checks.
--   - feedbacks: SELECT/INSERT/UPDATE for author/read/review boundary checks.
-- Broader product-write grants remain VERIFY BEFORE APPLY and must be reviewed before a formal migration.
grant select, insert, update on table public.user_profiles to authenticated;
grant select, insert, update on table public.builder_profiles to authenticated;
grant select, insert, update on table public.projects to authenticated;
grant select, insert, update on table public.problem_definitions to authenticated;
grant select, insert, update on table public.hypotheses to authenticated;
grant select, insert, update on table public.rough_notes to authenticated;
grant select, insert, update on table public.ai_structured_drafts to authenticated;
grant select, insert, update on table public.change_cards to authenticated;
grant select, insert, update on table public.feedback_requests to authenticated;
grant select, insert, update on table public.feedbacks to authenticated;
grant select, insert, update on table public.project_links to authenticated;

-- ----------------------------------------------------------------------------
-- Public-safe view grants
-- ----------------------------------------------------------------------------
grant select on table public.public_builder_profiles to anon, authenticated;
grant select on table public.public_project_cards to anon, authenticated;
grant select on table public.public_project_pages to anon, authenticated;
grant select on table public.public_decision_timeline to anon, authenticated;
grant select on table public.public_change_cards to anon, authenticated;
grant select on table public.public_feedback_requests to anon, authenticated;
grant select on table public.public_feedbacks to anon, authenticated;
grant select on table public.public_project_links to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Secure RPC grants
-- ----------------------------------------------------------------------------
-- PATCH 24 secure RPC surface:
--   - file 07 revokes PUBLIC/anon/authenticated immediately after function creation.
--   - this section grants only the intended callable surface.
--   - internal hash helper remains non-callable by anon/authenticated.
--   - read RPCs use unified not_found responses and explicit public-safe JSON.
--   - feedback creation is authenticated-only.
--   - rotation/revocation are authenticated-only and also enforce Project Owner in-function.
-- Do not grant source table broad anon SELECT as a substitute.
revoke execute on function public.hash_share_token_draft(text) from anon, authenticated;

grant execute on function public.get_link_shared_project_page(uuid, text) to anon, authenticated;
grant execute on function public.get_link_shared_decision_timeline(uuid, text) to anon, authenticated;
grant execute on function public.get_link_shared_feedback_requests(uuid, text) to anon, authenticated;

revoke execute on function public.create_link_shared_feedback(uuid, text, text, text, boolean) from anon;
grant execute on function public.create_link_shared_feedback(uuid, text, text, text, boolean) to authenticated;

revoke execute on function public.rotate_project_share_token(uuid) from anon;
revoke execute on function public.revoke_project_share_token(uuid) from anon;
grant execute on function public.rotate_project_share_token(uuid) to authenticated;
grant execute on function public.revoke_project_share_token(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Final manual verification notes
-- ----------------------------------------------------------------------------
-- Before moving any draft file to supabase/migrations:
--   - Run syntax validation in local disposable DB.
--   - Run supabase db lint candidate.
--   - Run Supabase Security Advisor and Performance Advisor.
--   - Validate 7.5 Test Case IDs manually.
--   - Verify no raw share_token is stored.
--   - Verify public-safe views exclude author_user_profile_id and auth identifiers.
--   - Verify Rough Note and AI Draft cannot be read externally.
--   - Verify Project private blocks published Change Cards externally.
--   - Verify link_shared access is impossible with public_slug only.
--   - Verify revoked token is rejected.
--   - Verify approved Change Card core fields cannot be mutated.
--   - Verify all SECURITY DEFINER link RPCs pin search_path to pg_catalog, pg_temp.
--   - Verify PUBLIC has no EXECUTE privilege on any link-sharing function.
--   - Verify anon cannot execute token rotation/revocation/feedback creation/hash helper.
--   - Verify linked Feedback Requests require approved + published + normal Change Card.
--   - Verify missing/wrong/revoked/private/public/archived token failures are identical.
--   - Verify rotation invalidates the old token and revocation invalidates the current token.

--   - Verify helper/RPC function EXECUTE revoke/grant pattern.
--   - Verify feedback_request target project consistency trigger.
--   - Verify approved Change Card approved_at / approved_by_builder_profile_id / work_status mutation restriction.
--   - Verify public-safe view failure fallback criteria: full public list can stay view candidate; link/token/complex responses use secure RPC/API.

--   - Verify public-safe views use owner-executed public boundary without granting anon source tables.
--   - Verify SQLSTATE 42501 no longer appears on anon public-safe view SELECT.
--   - Verify VIEW_BOUNDARY_FAIL does not appear in P0 logs.
