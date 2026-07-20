-- ============================================================================
-- DRAFT ONLY - DO NOT APPLY DIRECTLY
-- BuildMap Supabase Migration SQL File Draft
-- This file is written under supabase/migrations_draft, not supabase/migrations.
-- Do not run with Supabase CLI. Do not apply to local/staging/production DB.
-- Purpose: review-only SQL draft before formal migration creation.
-- Required before apply: syntax verification, Supabase local dry-run, db lint,
-- Security/Performance Advisor review, and manual verification against 7.5 test cases.
-- ============================================================================

-- File: 00 extensions and primitives
-- Depends on: none.
-- Purpose:
--   - pgcrypto extension candidate.
--   - common timestamp helper candidate.
--   - shared status value references.
-- VERIFY BEFORE APPLY:
--   - pgcrypto availability in the target Supabase project.
--   - gen_random_uuid(), gen_random_bytes(), digest() behavior.
--   - trigger/function syntax under the exact PostgreSQL version.

-- ----------------------------------------------------------------------------
-- Extension candidates
-- ----------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Common updated_at helper candidate
-- SECURITY NOTE:
--   This helper is generic and does not bypass RLS. It only mutates NEW.updated_at.
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Status value reference notes
-- ----------------------------------------------------------------------------
-- Status values are intentionally modeled as text + check constraints in later
-- files. Do not promote to enum until the product status vocabulary stabilizes.
--
-- Project visibility:
--   private, link_shared, public
-- Project lifecycle:
--   idea, building, testing, beta, operating, paused, ended
-- Change Card work status:
--   draft, editing, approved, held
-- Change Card visibility:
--   internal, publishable, published
-- Change Card sensitivity:
--   normal, sensitive
-- AI Draft status:
--   generating, generated, editing, converted_to_change_card, held, failed
-- Feedback review status:
--   new, reviewing, reflected, not_reflected
-- Feedback visibility:
--   internal_review, public_selected
-- Feedback Request visibility:
--   internal, public
-- Hypothesis status:
--   assumed, validating, partially_validated, validated, refuted, held
