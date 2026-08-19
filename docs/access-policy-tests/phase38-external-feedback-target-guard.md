# Phase 38 External Feedback Target Guard

## 목적

External Feedback이 공개된 Project / 공개된 Feedback Request / 공개 가능한 Decision 경계를 동시에 만족할 때만 생성되는지 검증한다.

기존 Feedback 정책의 핵심 원칙은 유지한다.

- 일반 댓글창이 아니다.
- Feedback은 반드시 Feedback Request를 통해 생성한다.
- 비로그인 Feedback은 허용하지 않는다.
- 새 Feedback은 기본 `internal_review`다.
- Builder가 선택한 Feedback만 외부에 노출한다.

## Phase 38 추가 회귀 케이스

| ID | 사전 조건 | 행위 | 기대 |
| --- | --- | --- | --- |
| P38-FB-001 | Public Project + Project-level public/open Request + authenticated user | Feedback 생성 | 허용 |
| P38-FB-002 | Public Project + public/open Request + unauthenticated visitor | Feedback 생성 | 차단 |
| P38-FB-003 | Public Project + public/open Request targeting approved/published/normal Decision | Feedback 생성 | 허용 |
| P38-FB-004 | Request 생성 후 target Decision을 internal로 변경 | Request source read / Feedback 생성 | 차단 |
| P38-FB-005 | Request 생성 후 target Decision을 sensitive로 변경 | Request source read / Feedback 생성 | 차단 |
| P38-FB-006 | Request 생성 후 target Decision을 archive | Request source read / Feedback 생성 | 차단 |
| P38-FB-007 | Request closed | Feedback 생성 | 차단 |
| P38-FB-008 | Project private 전환 | Request read / Feedback 생성 | 차단 |
| P38-FB-009 | Feedback 제출 직후 | Public Feedback read | 차단 (`internal_review`) |
| P38-FB-010 | Owner가 Feedback `public_selected` 전환 | public-safe feedback view read | 허용 |
| P38-FB-011 | Owner가 공개 선택을 취소 | public-safe feedback view read | 차단 |
| P38-FB-012 | 다른 authenticated user | internal Feedback source read | 차단 |

## Application guard

Scout 제출 Server Action도 다음 순서로 현재 상태를 다시 확인한다.

1. authenticated user
2. public Project
3. public + open Feedback Request
4. Decision target이 있으면 `approved + published + normal + not archived`
5. Feedback insert

UI에서 Request가 보였다는 과거 사실만 믿고 insert하지 않는다.

## DB guard additive migration

`20260819000000_buildmap_16_external_feedback_target_guard.sql`은 다음 두 경계를 보강한다.

- `feedback_requests_select_public_draft`: linked Decision이 public-safe가 아니면 source-table public read 차단
- `can_insert_feedback()`: linked Decision의 현재 public-safe 상태를 insert 시점에 재검사

파일은 post-Phase31 additive migration naming contract를 따르며, 이 Phase에서는 연결된 live BuildMap DB가 없어 실제 DB에는 적용하지 않는다. Production promotion 전에는 local dry-run / db lint / Data API regression / Security Advisor 확인이 필요하다.
