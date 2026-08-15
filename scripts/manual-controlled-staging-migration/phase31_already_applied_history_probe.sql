\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset pager off

begin transaction read only;

select 'MIG31R_HISTORY_COUNT=' || count(*)::text
from supabase_migrations.schema_migrations;

select 'MIG31R_HISTORY_EXACT=' || (
  array_agg(version::text || ':' || name order by version::text) = array[
    '20260708000000:buildmap_00_extensions_and_primitives_draft',
    '20260708001000:buildmap_01_core_schema_draft',
    '20260708002000:buildmap_02_decision_records_schema_draft',
    '20260708003000:buildmap_03_feedback_and_links_schema_draft',
    '20260708004000:buildmap_04_helpers_and_triggers_draft',
    '20260708005000:buildmap_05_rls_policies_draft',
    '20260708006000:buildmap_06_public_safe_views_draft',
    '20260708007000:buildmap_07_link_sharing_rpc_draft',
    '20260708008000:buildmap_08_grants_and_final_checks_draft',
    '20260720000000:buildmap_09_p1_access_integrity_hardening_draft',
    '20260721000000:buildmap_10_security_definer_boundary_hardening_draft'
  ]::text[]
)::text
from supabase_migrations.schema_migrations;

rollback;
