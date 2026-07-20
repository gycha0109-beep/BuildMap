# Link Sharing Secure RPC Local Test Pack

## 목적

Phase24는 기존 P0 RLS PASS 이후 남아 있던 `share_token` 기반 외부 공유 경계를 보강하고, 사용자가 Phase25에서 로컬 Docker Supabase DB에 실행할 Full Matrix를 작성한 단계다.

이번 단계에서 실제 Supabase CLI, Docker, psql, SQL 또는 wrapper는 실행하지 않았다. 실행은 사용자 로컬 PC에서만 수행한다.

## 핵심 결과

- `SECURITY DEFINER` RPC의 `search_path`를 `pg_catalog, pg_temp`로 고정
- `extensions.gen_random_bytes`와 application object를 schema-qualified 처리
- 함수 생성 직후 PUBLIC/anon/authenticated EXECUTE revoke
- read RPC 실패 응답을 `{"ok":false,"error":"not_found"}`로 통일
- Feedback Request가 Change Card를 가리킬 때 approved + published + normal 조건 강제
- 32-byte lowercase hex token contract 확정
- Phase25 local-only Full Matrix wrapper 및 SQL pack 작성

## 읽는 순서

1. `pack-overview.md`
2. `rpc-security-hardening.md`
3. `actor-and-fixture-map.md`
4. `token-lifecycle-matrix.md`
5. `response-contract-and-exposure-boundary.md`
6. `scenario-coverage-manifest.md`
7. `expected-results.md`
8. `failure-classification.md`
9. `stop-rules.md`
10. `local-only-safety-rules.md`
11. `phase25-user-local-run-guide.md`
12. `result-log-template.md`
13. `phase24-static-validation-report.md`

## 금지

- `supabase link`
- `supabase db push`
- `supabase db pull`
- hosted SQL Editor
- remote DB URL
- production/staging DB
- password/token/key 공유
- 정식 migration 승격

## Phase25 최종 실행 결과

사용자 로컬 clean rerun 결과:

```text
Phase25 link sharing RPC local run completed. OverallResult: PASS
```

상세 기록은 `phase25-user-local-pass-result.md`를 확인한다. Phase26 회귀 기준선과 변경 gate는 `../link-sharing-regression-gate/README.md`를 기준으로 한다.
