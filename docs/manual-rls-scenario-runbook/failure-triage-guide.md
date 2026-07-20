# Failure Triage Guide


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


| 분류 | 의미 | 심각도 | 즉시 중단 여부 | 18단계 이후 조치 | 19단계 patch 필요 여부 |
|---|---|---|---|---|---|
| PASS | 기대 허용/차단과 실제 결과 일치 | none | 아니오 | 다음 테스트 | 아니오 |
| EXPECTED_DENY | 차단되어야 하는 요청이 차단됨 | none | 아니오 | 정상 deny 기록 | 아니오 |
| UNEXPECTED_ALLOW | 차단되어야 하는 요청이 허용됨 | blocker | 예 | Security Patch | 예 |
| UNEXPECTED_DENY | 허용되어야 하는 요청이 차단됨 | high/medium | 상황별 | RLS/helper/view 조건 검토 | 가능 |
| AUTH_SIMULATION_FAIL | `auth.uid()` actor 전환 실패 | blocker | 예 | Actor Simulation Patch | 예 |
| SEED_FAIL | 테스트 데이터 준비 실패 | high/medium | 예 | Test Data Seed Patch | 가능 |
| POLICY_SYNTAX_ERROR | RLS policy expression 오류 | high | 예 | SQL Policy Patch | 예 |
| HELPER_ERROR | helper function 결과/권한 오류 | high | 예 | Helper Patch | 예 |
| VIEW_ACCESS_ERROR | public-safe view 접근/컬럼 오류 | high | 상황별 | View/RPC Boundary Patch | 예 |
| RPC_ERROR | secure RPC 실행/응답/권한 오류 | high | 상황별 | Secure RPC Patch | 예 |
| TRIGGER_ERROR | trigger 오탐/누락/문법 오류 | high | 상황별 | Trigger Patch | 예 |
| GRANT_ERROR | function/table/view grant 과다 또는 부족 | blocker/high | 예 | Function Permission Patch | 예 |
| TEST_DATA_ERROR | seed/전제 데이터 문제 | medium | 예 | seed 보정 | 아니오/보류 |
| ENV_ERROR | local Supabase/Docker/CLI 환경 오류 | medium | 예 | 환경 보정 | 아니오 |
| NEEDS_REVIEW | 기대 결과 해석 불명확 | medium | 아니오 | 정책 문서 재검토 | 보류 |

## 보안 우선 규칙

`UNEXPECTED_ALLOW`는 security blocker로 취급한다. 특히 아래는 즉시 중단한다.

- 비공개 데이터 읽기 허용
- Rough Note / AI Draft 노출
- private Project의 published Change Card 노출
- Feedback author spoofing 허용
- 비로그인 write 허용
- public-safe view의 내부 식별자 노출
- raw `share_token` 또는 `share_token_hash` 노출
