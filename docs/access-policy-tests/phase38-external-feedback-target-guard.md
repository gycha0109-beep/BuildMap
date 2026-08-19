# Phase 38 External Feedback Target Guard

## 목적

External Feedback이 공개된 Project / 공개된 Feedback Request / 공개 가능한 Decision 경계를 동시에 만족할 때만 생성되는지 검증한다.

기존 Feedback 정책의 핵심 원칙은 유지한다.

- 일반 댓글창이 아니다.
- Feedback은 반드시 Feedback Request를 통해 생성한다.
- 비로그인 Feedback은 허용하지 않는다.
- 새 Feedback은 기본 `internal_review`다.
- Builder가 선택한 Feedback만 외부에 노출한다.

## Phase 38 회귀 케이스

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

## Existing DB guard 재확인

Phase 38 검토 중 초기 04/05 draft만 보면 linked Decision 재검사가 빠진 것처럼 보였으나, 이후 historical migration `20260720000000_buildmap_09_p1_access_integrity_hardening_draft.sql`에서 이미 다음 경계가 보강되어 있음을 재확인했다.

- `feedback_requests_select_public_draft`는 `change_card_id`가 있으면 `public.can_read_public_change_card(change_card_id)`를 요구한다.
- `public.can_insert_feedback()` 역시 linked Decision에 대해 `public.can_read_public_change_card(fr.change_card_id)`를 요구한다.
- 해당 SECURITY DEFINER helper의 `search_path`는 `pg_catalog, pg_temp`로 고정되어 있다.

따라서 Phase 38에서는 DB migration을 추가하지 않는다. Application layer에서도 같은 조건을 다시 검사하여 stale UI/request ID에 대한 defense in depth를 유지한다.
