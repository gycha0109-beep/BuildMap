# Expected Failure Catalog

## 목적

13단계 local dry-run에서 예상되는 실패를 사전에 정리한다.

| 실패 설명 | 발생 가능 파일 | 예상 에러 유형 | 보정 방향 | 심각도 |
|---|---|---|---|---|
| pgcrypto extension 권한 문제 | `00` | extension permission error | extension 검증 또는 Supabase extension enable 방식 확인 | blocker |
| auth.users FK 참조 문제 | `01` | relation/schema not found | Supabase Auth schema와 FK 문법 확인 | blocker |
| security_invoker view 지원/동작 문제 | `06` | CREATE VIEW option or RLS behavior mismatch | view 옵션/버전 검증, RPC/API 대안 | high |
| view source table grant 부족 | `06/08` | permission denied for table | source grant/RLS 조정 또는 RPC 전환 | high |
| SECURITY DEFINER search_path 오류 | `07` | function execution or relation not found | SET search_path와 schema qualification 보정 | blocker |
| function execute grant 부족/과다 | `04/07/08` | permission denied or unwanted callable | REVOKE/GRANT 보정 | high |
| RLS USING/WITH CHECK 문법 오류 | `05` | CREATE POLICY syntax error | policy 문법 보정 | blocker |
| helper function RLS 순환 의존성 | `04/05` | infinite recursion/policy recursion | helper 쿼리 축소 또는 SECURITY DEFINER 검토 | high |
| check constraint 상태값 오타 | `01-03` | check violation | 상태값 목록 정리 | medium |
| trigger OLD/NEW 비교 오류 | `04` | trigger function error | 컬럼 비교 문법 보정 | high |
| approved mutation trigger 오탐/누락 | `04` | unexpected reject/allow | 변경 금지 컬럼 범위 보정 | high |
| feedback_requests project consistency 누락 | `03/04` | invalid cross-project request allowed | trigger/app validation 보정 | high |
| Feedback author spoofing 실패 | `04/05/07` | wrong author accepted | WITH CHECK/trigger/RPC 보정 | blocker |
| public-safe view 컬럼 과다 | `06` | sensitive column exposed | view column list 축소 | blocker |
| RPC 반환 jsonb 구조 오류 | `07` | unexpected json shape | jsonb_build_object/agg 보정 | medium |
| token hash 비교 오류 | `07` | valid token rejected or invalid accepted | hash 함수/encoding 보정 | blocker |
| nullable unique index 동작 문제 | `01` | unexpected duplicate/null behavior | partial unique index 검토 | medium |
| FK cascade/restrict 충돌 | `01-03` | delete/update blocked unexpectedly | soft archive 우선 검토 | medium |
| index 생성 순서 문제 | `01-03` | index on missing column/table | migration order 보정 | low |

## 운영 원칙

- blocker 실패는 SQL draft를 보정한 뒤 재시도한다.
- high 실패는 dry-run 로그와 Test Case ID를 연결한다.
- 실패가 정책 의도와 관련되면 문서 보정을 먼저 하고 SQL 보정을 한다.
- remote DB에는 적용하지 않는다.
