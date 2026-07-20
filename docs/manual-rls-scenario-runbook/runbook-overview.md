# Runbook Overview


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


## 전체 흐름

| 순서 | 단계 | 목적 | 중단 조건 |
|---:|---|---|---|
| 1 | local Supabase stack 상태 확인 | 16단계 성공 상태가 유지되는지 확인 | local stack 미동작 |
| 2 | remote 금지 규칙 확인 | remote DB 접근 차단 | remote link/credential 의심 |
| 3 | 테스트 DB가 local dry-run DB인지 확인 | production/staging 오염 방지 | DB URL이 remote로 보임 |
| 4 | actor simulation 방식 확인 | `auth.uid()` 기반 RLS 테스트 전제 확보 | actor별 `auth.uid()` 불일치 |
| 5 | `auth.uid()` simulation smoke test | owner/non-owner/anon 전환 검증 | 실패 시 전체 중단 |
| 6 | 테스트 데이터 seed 순서 확인 | FK/RLS 전제 데이터 준비 | seed FK 오류 |
| 7 | owner/non-owner/anon actor 준비 | actor별 정책 검증 | actor 전환 실패 |
| 8 | Project access test 후보 | Project visibility/owner boundary 검증 | private data 노출 |
| 9 | Link sharing test 후보 | `share_token`/RPC boundary 검증 | token 없이 접근 허용 |
| 10 | Change Card access test 후보 | approved/published/sensitive 조건 검증 | 내부/민감 card 노출 |
| 11 | Rough Note / AI Draft block test 후보 | 내부 기록 privacy 검증 | rough note/AI draft 외부 노출 |
| 12 | Feedback Request / Feedback test 후보 | request 기반 feedback과 author integrity 검증 | author spoofing 허용 |
| 13 | Public-safe view test 후보 | 공개 컬럼/row 제한 검증 | 내부 식별자 노출 |
| 14 | Secure RPC test 후보 | token 검증과 public-safe JSON 반환 검증 | token 실패 사유 과다 노출 |
| 15 | Function permission test 후보 | helper/RPC execute grant 검증 | helper 과다 노출 |
| 16 | Trigger behavior test 후보 | mutation/integrity trigger 검증 | approved record 수정 허용 |
| 17 | 결과 로그 수집 | 19단계 patch 입력 확보 | secret 미마스킹 |
| 18 | 실패 분류 | patch 범위 결정 | `UNEXPECTED_ALLOW` 발견 |
| 19 | 다음 단계 결정 | SQL patch / boundary patch / 승격 검토 분기 | P0 미해결 |

## local-only 전제

이 runbook은 local Supabase DB에서만 사용한다. 사용자는 테스트 중 어떤 remote 명령도 실행하지 않는다.

## db reset/lint 성공의 의미

`supabase db reset`과 `supabase db lint --local` 성공은 schema application과 lint 통과를 의미한다. 이것은 actor별 read/write, public-safe view column exposure, secure RPC token scenario, trigger behavior, function execute permission이 통과했다는 뜻이 아니다.

## 최우선 검증 대상

1. `auth.uid()` actor simulation
2. private Project 외부 차단
3. Rough Note / AI Draft 외부 차단
4. Change Card 공개 조건
5. Feedback author spoofing 차단
6. public-safe view 컬럼 제한
7. secure RPC token 시나리오
8. approved Change Card mutation trigger
