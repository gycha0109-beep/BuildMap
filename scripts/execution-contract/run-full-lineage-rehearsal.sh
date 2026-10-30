#!/usr/bin/env bash
set -euo pipefail

psql -X -v ON_ERROR_STOP=1 -c 'create database buildmap_full_replay;'
export PGDATABASE=buildmap_full_replay
psql -X -v ON_ERROR_STOP=1 -f scripts/execution-contract/em1-full-schema-bootstrap.sql

count=0
while IFS= read -r migration; do
  echo "Replaying $(basename "$migration")"
  psql -X -v ON_ERROR_STOP=1 -f "$migration" > /tmp/buildmap-full-migration.log 2>&1 || {
    cat /tmp/buildmap-full-migration.log
    echo "FULL_LINEAGE_REPLAY_FAIL: $(basename "$migration")" >&2
    exit 1
  }
  count=$((count + 1))
done < <(find supabase/migrations -maxdepth 1 -type f -name '*.sql' | LC_ALL=C sort)
if [[ "$count" -lt 25 ]]; then
  echo "Expected historical migrations 00-21 and new 22-24; observed $count" >&2
  exit 1
fi

psql -X -v ON_ERROR_STOP=1 -f scripts/execution-contract/em1-full-schema-seed.sql
for scenario in em1-scenarios.sql em1-tenant-matrix.sql em1-import-scenarios.sql em2-evidence-scenarios.sql em3c-manual-scenarios.sql; do
  echo "FULL_SCHEMA_SCENARIO: $scenario"
  psql -X -v ON_ERROR_STOP=1 -f "scripts/execution-contract/$scenario"
done
echo "FULL_LINEAGE_REPLAY_PASS: $count migrations in disposable PostgreSQL"
echo 'Hosted Supabase mutation: NONE'
