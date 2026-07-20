# SQL Draft Patch Map

| SQL draft 파일 | 기존 역할 | 12단계 위험 | 13단계 patch 내용 | 남은 TODO | dry-run 검증 항목 | 현재 판정 |
|---|---|---|---|---|---|---|
| `04_helpers_and_triggers` | helper / trigger 후보 | Feedback Request 정합성, approved Change Card 승인 필드 조작 | `validate_feedback_request_target_project()` 추가, approved mutation 제한 확장 | trigger 문법 검증 | target mismatch 차단, 승인 필드 수정 차단 | conditional dry-run ready |
| `05_rls_policies` | RLS policy 후보 | `USING` / `WITH CHECK` 누락 위험, Feedback insert 조건 불명확 | INSERT/UPDATE 주석 보강, Feedback insert/RPC 분리 주석 추가 | 실제 policy 문법 검증 | owner update, Feedback insert, 외부 read 차단 | conditional dry-run ready |
| `06_public_safe_views` | public-safe view 후보 | `security_invoker` / source table grant/RLS 충돌 | view 유지 범위와 RPC/API 전환 기준 주석 보강 | 실제 view 동작 검증 | 내부 컬럼 미노출, public timeline 조건 | conditional dry-run ready |
| `07_link_sharing_rpc` | link_shared secure RPC 후보 | `SECURITY DEFINER`, `search_path`, token failure, 반환 컬럼 위험 | secure RPC template 주석, `search_path = public, pg_temp` 후보, public-safe jsonb 주석 | function 문법/권한 검증 | token 검증, private/revoked 차단, feedback insert | conditional dry-run ready |
| `08_grants_and_final_checks` | grants 후보 | PUBLIC EXECUTE 노출 위험 | function-specific revoke/grant 후보 추가 | 정확한 signature 검증 | grant 부족/과다 여부 | conditional dry-run ready |

## 현재 판정

모든 patch 대상 파일은 여전히 DRAFT ONLY다. 14단계 dry-run 후보로 넘어갈 수 있으나, 예상 실패 catalog를 기준으로 로그를 수집해야 한다.
