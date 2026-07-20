# 8.5단계 RLS Security Correction / Share Token & Public Read Boundary

## 1. 8.5단계 문서의 목적

8.5단계는 BuildMap의 8단계 RLS SQL 초안 문서를 실제 Supabase migration draft로 옮기기 전에 보안상 모호한 지점을 보정하는 단계다.

이번 단계의 목적은 다음을 문서로 고정하는 것이다.

- `share_token` 검증 구조의 위험과 후보
- `public_slug`와 `share_token`의 역할 분리
- 공개 읽기에서 원천 테이블 row 전체 노출 방지
- public-safe view / secure RPC / API 조합 경계
- Feedback 작성자 위조 방지
- 공개 Feedback 작성자 표시 정책
- 승인된 Change Card 수정 제한
- RLS helper function 실제 구현 가능성
- 7.5단계 RLS Scenario Readiness 체크리스트 상태 보정

## 2. 8단계 RLS SQL 초안과의 관계

8단계 RLS 초안은 폐기하지 않는다. 다만 8단계에서 “추가 검토 필요”로 남긴 보안 경계를 8.5단계에서 더 명확히 한다.

8.5단계는 다음을 전제로 한다.

- 8단계 RLS SQL 초안은 검토용 초안이다.
- 아직 실제 migration은 작성하지 않는다.
- 아직 실제 helper function, RPC, API route를 만들지 않는다.
- 8.5단계 보정 결정은 9단계 migration draft의 입력이 된다.

## 3. 7.5단계 테스트 케이스와의 관계

7.5단계 Access Policy Test Cases는 RLS SQL 작성 전에 허용/차단 시나리오를 검증하기 위한 문서다.

8.5단계에서는 7.5단계 체크리스트를 다음 상태로 재분류한다.

- 확인됨
- 부분 확인
- 확인 필요
- 후순위 제외

단, 7.5단계 원문은 대규모로 수정하지 않고, 8.5단계 문서에서 현재 상태만 보정한다.

## 4. 이번 단계에서 다루는 범위

- 링크 공개 보안 모델
- 공개 읽기 컬럼/응답 경계
- public-safe view / RPC / API 경계 비교
- Feedback 작성/공개 보안 보정
- 승인된 Change Card mutation 제한
- RLS helper function 후보의 실제 구현 가능성 검토
- migration draft 전 보안 게이트

## 5. 이번 단계에서 다루지 않는 범위

- 실제 Supabase migration
- 실제 SQL 파일
- 실제 `CREATE POLICY` 최종본
- 실제 helper function 생성
- 실제 RPC 생성
- 실제 API route 설계 또는 구현
- 프론트엔드 구현
- 자동화 테스트 코드
- 관리자 권한
- 팀/공동 편집/조직 권한
- 비로그인 피드백
- 채용/헤드헌팅, 결제, 외부 연동

## 6. 생성된 RLS 보안 보정 문서 목록

| 문서 | 역할 |
|---|---|
| `rls-security-correction-overview.md` | 8단계 RLS 초안 보정 개요 |
| `share-token-security-model.md` | `share_token` 보안 모델과 검증 위치 후보 |
| `public-read-boundary.md` | 공개 읽기 응답 경계와 노출 금지 정보 |
| `public-safe-view-or-rpc-boundary.md` | public-safe view / RPC / API 경계 비교 |
| `feedback-security-corrections.md` | Feedback 작성자 위조 방지와 공개 표시 정책 |
| `change-card-mutation-boundary.md` | 승인된 Change Card 수정 제한 정책 |
| `rls-helper-function-feasibility.md` | RLS helper function 후보 구현 가능성 검토 |
| `rls-scenario-checklist-status.md` | 7.5 RLS Scenario Readiness 상태 보정 |
| `migration-readiness-security-gate.md` | 9단계 migration draft 전 보안 게이트 |

## 7. 읽는 순서

1. `README.md`
2. `rls-security-correction-overview.md`
3. `share-token-security-model.md`
4. `public-read-boundary.md`
5. `public-safe-view-or-rpc-boundary.md`
6. `feedback-security-corrections.md`
7. `change-card-mutation-boundary.md`
8. `rls-helper-function-feasibility.md`
9. `rls-scenario-checklist-status.md`
10. `migration-readiness-security-gate.md`
11. `docs/decisions/phase8-5-rls-security-corrections.md`

## 8. 8.5단계의 핵심 결론

8.5단계의 핵심 결론은 다음이다.

- `share_token` 원문 저장은 금지하는 방향을 우선 검토한다.
- `share_token`은 hash 저장 후보를 우선한다.
- `public_slug`는 보안 토큰이 아니다.
- 링크 공개 데이터는 원천 테이블 직접 select보다 secure RPC 또는 API 조합을 우선 검토한다.
- 전체 공개 데이터도 public-safe view 또는 API 조합을 우선 검토한다.
- RLS는 row-level 접근 제어이며 컬럼 마스킹을 자동으로 해결하지 않는다.
- 공개 페이지와 공개 Timeline은 원천 테이블 row 전체를 직접 노출하지 않는 방향으로 설계한다.
- 공개 Feedback은 원천 `feedbacks` row 전체를 직접 노출하지 않는다.
- 승인된 Change Card의 본문/근거/판단 직접 수정은 제한하는 방향을 우선 검토한다.

## 9단계 문서 안내

실제 migration 작성 전 migration draft는 `docs/migration-draft/README.md`를 확인한다. 9단계 문서의 SQL은 실행용 migration이 아니라 검토용 초안이다.



## Migration Draft 검수 결과

9단계 migration draft의 문법/보안 검수 결과는 `docs/migration-review/` 문서를 확인한다. 실제 migration 파일 작성 전에는 이 검수 문서를 우선 확인한다.
