#!/usr/bin/env bash
set -euo pipefail

sql=$(cat <<'SQL'
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000111';
insert into public.execution_manual_acceptance_events
  (project_id,track_id,roadmap_revision_id,criterion_id,event_type,reason)
values
  ('00000000-0000-4000-8000-000000000511',
   '00000000-0000-4000-8000-000000000661',
   '00000000-0000-4000-8000-000000000671',
   '00000000-0000-4000-8000-000000000691',
   'revoked','Parallel withdrawal should accept only one request');
SQL
)
psql -X -v ON_ERROR_STOP=1 -c "$sql" > /tmp/em3c-concurrent-1.log 2>&1 &
first=$!
psql -X -v ON_ERROR_STOP=1 -c "$sql" > /tmp/em3c-concurrent-2.log 2>&1 &
second=$!
first_status=0
second_status=0
wait "$first" || first_status=$?
wait "$second" || second_status=$?

successes=0
if [[ "$first_status" -eq 0 ]]; then successes=$((successes+1)); fi
if [[ "$second_status" -eq 0 ]]; then successes=$((successes+1)); fi
if [[ "$successes" -ne 1 ]]; then
  echo "EM3C_CONCURRENT_GUARD_FAIL: expected one success, got $successes" >&2
  cat /tmp/em3c-concurrent-1.log /tmp/em3c-concurrent-2.log
  exit 1
fi

if [[ "$first_status" -ne 0 ]]; then
  grep -q 'no_active_acceptance_to_revoke' /tmp/em3c-concurrent-1.log || {
    cat /tmp/em3c-concurrent-1.log
    exit 1
  }
fi
if [[ "$second_status" -ne 0 ]]; then
  grep -q 'no_active_acceptance_to_revoke' /tmp/em3c-concurrent-2.log || {
    cat /tmp/em3c-concurrent-2.log
    exit 1
  }
fi

count=$(psql -X -At -v ON_ERROR_STOP=1 -c "
  select count(*) from public.execution_manual_acceptance_events
  where criterion_id='00000000-0000-4000-8000-000000000691';")
latest=$(psql -X -At -v ON_ERROR_STOP=1 -c "
  select event_type from public.execution_manual_acceptance_events
  where criterion_id='00000000-0000-4000-8000-000000000691'
  order by recorded_at desc,id desc limit 1;")
if [[ "$count" != "4" || "$latest" != "revoked" ]]; then
  echo "EM3C_CONCURRENT_HISTORY_FAIL: count=$count, latest=$latest" >&2
  exit 1
fi
echo 'EM3C_CONCURRENT_MANUAL_TRANSITION_PASS'
