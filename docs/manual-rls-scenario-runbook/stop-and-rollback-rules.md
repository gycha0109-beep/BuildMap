# Stop and Rollback Rules


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


## 즉시 중단 조건

- remote DB 연결 의심
- secret/token/password 출력
- `auth.uid()` simulation 실패
- test data seed가 FK 오류로 연쇄 실패
- `UNEXPECTED_ALLOW` 발생
- function grant가 과하게 열림
- public-safe view가 민감 컬럼을 노출
- trigger가 승인된 Change Card 핵심 필드 수정을 허용
- Feedback author spoofing이 허용됨
- Rough Note / AI Draft가 public view 또는 anon query에 노출됨

## 복구 후보

| 상황 | 복구 후보 |
|---|---|
| seed 오류 | local DB reset 후 seed 순서 보정 |
| actor simulation 오류 | claim 설정 방식 보정 후 smoke test 재실행 |
| SQL/RLS 오류 | 로그 저장 후 19단계 SQL patch |
| public view 내부 노출 | 즉시 중단, public-safe view/RPC boundary patch |
| RPC token 오류 | secure RPC patch |
| trigger 오탐/누락 | trigger patch |
| remote 의심 | 즉시 중단, remote 미적용 확인 |

## rollback 원칙

- remote에는 아무 조치도 하지 않는다.
- local DB는 필요하면 `supabase db reset` 후보로 초기화한다.
- 실패 로그를 먼저 저장하고 정리한다.
- `UNEXPECTED_ALLOW`는 재현 조건을 최소 로그로 남긴다.
- secret이 포함된 로그는 공유 전 마스킹한다.

## 정식 migration 승격 금지

수동 테스트가 일부 성공해도 정식 `supabase/migrations` 승격은 별도 단계에서 결정한다.
