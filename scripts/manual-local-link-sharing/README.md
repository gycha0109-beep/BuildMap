# Manual Local Link Sharing RPC Scripts

Phase24에서 작성한 Phase25 실행 후보다. local Docker Supabase DB container 전용이며 remote DB에서 실행하면 안 된다.

실행 순서:

1. `phase25_00_preflight.sql`
2. `phase25_01_seed_link_fixture.sql`
3. `phase25_02_read_rpc_matrix.sql`
4. `phase25_03_token_lifecycle_matrix.sql`
5. `phase25_04_feedback_rpc_matrix.sql`
6. `phase25_05_rpc_permission_security.sql`
7. `phase25_06_response_exposure.sql`
8. `phase25_99_result_summary.sql`

권장 실행은 `run-phase25-link-sharing-local.ps1`이다. wrapper는 DB URL, password, token, anon key, service role key를 입력받지 않고 local `supabase_db_*` container에만 `docker exec`한다.

실행 전 `phase25-user-local-run-guide.md`의 PowerShell parse check를 먼저 수행한다. 다운로드 차단 오류가 있으면 wrapper 파일에만 `Unblock-File`을 적용한다.

## Phase26 regression gate

Phase25 PASS 보호 기준선을 정적으로 확인하려면 다음을 실행한다.

```powershell
.\scripts\manual-local-link-sharing\run-phase26-link-sharing-regression-gate.ps1
```

기존 Phase25 로그까지 검증하려면:

```powershell
.\scripts\manual-local-link-sharing\run-phase26-link-sharing-regression-gate.ps1 -PassLogPath "<phase25 log path>"
```

Phase26 gate는 Docker, Supabase CLI, psql 또는 SQL을 실행하지 않는다. baseline mismatch가 발생해도 hash를 자동 갱신하지 않는다.
