#!/usr/bin/env bash
set -euo pipefail

sql=$(cat <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000111';
select public.execution_record_evidence_batch(
  '00000000-0000-4000-8000-000000000511',
  12345, 'Example/project',
  '[{"sourceType":"merged_pull_request","sourceId":"pr:91",
     "sourceState":"SOURCE_CONFIRMED",
     "sourceSha":"cccccccccccccccccccccccccccccccccccccccc",
     "sourceUrl":"https://github.com/Example/project/pull/91",
     "title":"Parallel PR","reason":null,
     "occurredAt":"2026-10-29T23:00:00Z"}]'::jsonb
);
SQL
)

psql -X -v ON_ERROR_STOP=1 -c "$sql" >/tmp/em2-parallel-first.log 2>&1 &
first=$!
psql -X -v ON_ERROR_STOP=1 -c "$sql" >/tmp/em2-parallel-second.log 2>&1 &
second=$!
wait "$first" || { cat /tmp/em2-parallel-first.log; exit 1; }
wait "$second" || { cat /tmp/em2-parallel-second.log; exit 1; }
cat /tmp/em2-parallel-first.log
cat /tmp/em2-parallel-second.log

objects=$(psql -X -At -v ON_ERROR_STOP=1 -c \
 "select count(*) from public.execution_evidence where source_id='pr:91' and project_id='00000000-0000-4000-8000-000000000511';")
versions=$(psql -X -At -v ON_ERROR_STOP=1 -c \
 "select count(*) from public.execution_evidence_observations o
  join public.execution_evidence e on e.id=o.evidence_id
  where e.source_id='pr:91' and e.project_id='00000000-0000-4000-8000-000000000511';")
if [[ "$objects" != "1" || "$versions" != "1" ]]; then
  echo "EM2_PARALLEL_DEDUP_FAIL objects=$objects versions=$versions" >&2
  exit 1
fi
echo 'EM2_PARALLEL_REFRESH_IDEMPOTENCY_PASS'
