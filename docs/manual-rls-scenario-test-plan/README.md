# Manual RLS Scenario Test Plan

> 단계: BuildMap 16단계  
> 성격: Local dry-run 성공 이후 수동 RLS 시나리오 테스트 계획  
> 상태: 실행 계획 문서. 이번 단계에서 SQL/RPC/test를 실행하지 않는다.

## 왜 manual RLS test가 필요한가

`supabase db reset`과 `supabase db lint --local`은 schema 적용과 lint를 확인한다. 그러나 BuildMap의 핵심 위험은 schema syntax보다 actor별 접근 경계에 있다. Owner, non-owner, anon, link_shared actor가 실제 row와 token 상태에서 무엇을 읽고 쓸 수 있는지 확인해야 한다.

## db reset/lint 성공과 manual test의 차이

| 항목 | db reset/lint | Manual RLS Scenario Test |
|---|---|---|
| SQL 적용 가능성 | 확인 | 전제 |
| schema lint | 확인 | 전제 |
| actor별 read/write | 미검증 | 검증 |
| public-safe view column exposure | 미검증 | 검증 |
| secure RPC token scenario | 미검증 | 검증 |
| trigger behavior | 미검증 | 검증 |
| function execute permission | 미검증 | 검증 |

## 테스트 범위

- Project 접근
- link sharing
- Change Card 접근과 승인/공개 mutation
- Rough Note / AI Draft 외부 차단
- Feedback Request / Feedback author spoofing
- public-safe view 접근/컬럼 노출
- secure RPC token 시나리오
- function execute permission
- trigger behavior

## 테스트하지 않는 범위

- remote Supabase 적용
- API route 구현
- 프론트엔드 구현
- 자동화 테스트 코드 작성
- 관리자/팀/조직 권한
- 비로그인 feedback write
- Save / Follow, Activity Signal, Decision Diff Snapshot
- 결제, 채용/헤드헌팅, 외부 연동

## 문서 목록

- `test-plan-overview.md`
- `test-data-setup-plan.md`
- `actor-and-role-matrix.md`
- `project-access-scenarios.md`
- `link-sharing-scenarios.md`
- `change-card-access-scenarios.md`
- `rough-note-ai-draft-scenarios.md`
- `feedback-request-feedback-scenarios.md`
- `public-safe-view-scenarios.md`
- `secure-rpc-scenarios.md`
- `function-permission-scenarios.md`
- `trigger-behavior-scenarios.md`
- `test-execution-log-template.md`
- `result-classification-guide.md`
- `next-action-after-manual-test.md`

## 읽는 순서

1. `test-plan-overview.md`
2. `actor-and-role-matrix.md`
3. `test-data-setup-plan.md`
4. 영역별 scenario 문서
5. `test-execution-log-template.md`
6. `result-classification-guide.md`
7. `next-action-after-manual-test.md`

## 최종 목표

remote 적용 전에 BuildMap의 권한 경계가 최소한의 수동 시나리오에서 예상대로 동작하는지 확인한다. 핵심은 권한을 넓히는 것이 아니라 내부 판단 기록과 private data가 외부에 새지 않는지 검증하는 것이다.

## 17단계 실행 절차서

16단계 계획을 실제 local-only 수동 실행 절차로 옮긴 문서는 `docs/manual-rls-scenario-runbook/README.md`에서 확인한다. 17단계에서도 SQL/RPC/view/trigger/function 테스트는 실행하지 않는다.
