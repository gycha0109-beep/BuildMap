\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset pager off

begin transaction read only;

select 'TRANSACTION_READ_ONLY=' || current_setting('transaction_read_only');
select 'SERVER_VERSION_NUM=' || current_setting('server_version_num');
select 'SERVER_VERSION=' || current_setting('server_version');
select 'DATABASE_NAME=' || current_database();
select 'CURRENT_USER=' || current_user;
select 'PUBLIC_SCHEMA_EXISTS=' || (to_regnamespace('public') is not null)::text;
select 'AUTH_SCHEMA_EXISTS=' || (to_regnamespace('auth') is not null)::text;
select 'EXTENSIONS_SCHEMA_EXISTS=' || (to_regnamespace('extensions') is not null)::text;
select 'PGCRYPTO_AVAILABLE=' || exists(
  select 1
  from pg_catalog.pg_available_extensions
  where name = 'pgcrypto'
)::text;
select 'PGCRYPTO_INSTALLED=' || exists(
  select 1
  from pg_catalog.pg_extension
  where extname = 'pgcrypto'
)::text;
select 'DATABASE_CREATE_PRIVILEGE=' || has_database_privilege(current_user, current_database(), 'CREATE')::text;
select 'PUBLIC_CREATE_PRIVILEGE=' || has_schema_privilege(current_user, 'public', 'CREATE')::text;
select 'AUTH_USAGE_PRIVILEGE=' || has_schema_privilege(current_user, 'auth', 'USAGE')::text;

select (to_regclass('supabase_migrations.schema_migrations') is not null)::text as migration_table_exists
\gset
\echo MIGRATION_TABLE_EXISTS=:migration_table_exists

\if :migration_table_exists
  select 'MIGRATION_HISTORY_COUNT=' || count(*)::text
  from supabase_migrations.schema_migrations;

  select 'MIGRATION_VERSIONS=' || coalesce(
    string_agg(version::text, ',' order by version::text),
    ''
  )
  from supabase_migrations.schema_migrations;
\else
  \echo MIGRATION_HISTORY_COUNT=0
  \echo MIGRATION_VERSIONS=
\endif

select 'PUBLIC_RELATION_COUNT=' || count(*)::text
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r','p','v','m','S','f')
  and not exists (
    select 1
    from pg_catalog.pg_depend d
    where d.classid = 'pg_class'::regclass
      and d.objid = c.oid
      and d.deptype = 'e'
  );

select 'PUBLIC_FUNCTION_COUNT=' || count(*)::text
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and not exists (
    select 1
    from pg_catalog.pg_depend d
    where d.classid = 'pg_proc'::regclass
      and d.objid = p.oid
      and d.deptype = 'e'
  );

select 'PUBLIC_POLICY_COUNT=' || count(*)::text
from pg_catalog.pg_policies
where schemaname = 'public';

select 'PUBLIC_TRIGGER_COUNT=' || count(*)::text
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and not t.tgisinternal;

select 'PUBLIC_TYPE_COUNT=' || count(*)::text
from pg_catalog.pg_type t
join pg_catalog.pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typtype in ('d','e','r','m')
  and not exists (
    select 1
    from pg_catalog.pg_depend d
    where d.classid = 'pg_type'::regclass
      and d.objid = t.oid
      and d.deptype = 'e'
  );

select 'PUBLIC_USER_OBJECT_COUNT=' || (
  (
    select count(*)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r','p','v','m','S','f')
      and not exists (
        select 1
        from pg_catalog.pg_depend d
        where d.classid = 'pg_class'::regclass
          and d.objid = c.oid
          and d.deptype = 'e'
      )
  )
  +
  (
    select count(*)
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1
        from pg_catalog.pg_depend d
        where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid
          and d.deptype = 'e'
      )
  )
  +
  (
    select count(*)
    from pg_catalog.pg_policies
    where schemaname = 'public'
  )
  +
  (
    select count(*)
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and not t.tgisinternal
  )
  +
  (
    select count(*)
    from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typtype in ('d','e','r','m')
      and not exists (
        select 1
        from pg_catalog.pg_depend d
        where d.classid = 'pg_type'::regclass
          and d.objid = t.oid
          and d.deptype = 'e'
      )
  )
)::text;

rollback;
