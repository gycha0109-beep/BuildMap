# RLS Policy Syntax Review

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 검수 기준

RLS policy draft는 7.5 Test Case를 만족해야 한다. 특히 1차에서는 Project Owner 중심 권한, 비로그인 쓰기 차단, Rough Note/AI Draft 외부 차단, Feedback Request 기반 Feedback 생성 원칙을 유지한다.

## 2. 정책 그룹별 검수

| 정책 그룹 | 관련 테이블 | 9단계 정책명 후보 | 관련 Test Case | USING 필요 | WITH CHECK 필요 | 검수 상태 | 보정 제안 |
|---|---|---|---|---|---|---|---|
| Project owner read | `projects` | `project_select_owner` | `PRJ-001` | 필요 | 없음 | 양호 후보 | `archived_at is null` 포함 검토 |
| Project insert | `projects` | `project_insert_builder` | `PRJ-*` | 없음 | 필요 | 확인 필요 | current user의 builder profile 검증 강화 |
| Project update | `projects` | `project_update_owner` | `PRJ-006`, `OWN-004` | 필요 | 필요 | 양호 후보 | visibility/progress change 포함 여부 확인 |
| Public read | public-safe view | view policy/grant 후보 | `PRJ-004`, `PP-*` | view/RLS 검토 | view/RLS 검토 | 보안 확인 필요 | 원천 table anon select 최소화 |
| Link read | secure RPC | RPC 후보 | `LINK-*` | RPC 내부 조건 | RPC 내부 조건 | 보안 확인 필요 | RLS 직접 처리보다 RPC 우선 |
| Change Card owner read | `change_cards` | `change_card_select_owner` | `CC-001` | 필요 | 없음 | 양호 후보 | author read 필요 여부 검토 |
| Change Card public read | public-safe view / candidate policy | `change_card_select_public_candidate` | `CC-004~018` | 필요 | 없음 | 보안 확인 필요 | 원천 row 직접 노출 대신 view 우선 |
| Change Card insert | `change_cards` | `change_card_insert_owner` | `OWN-001` | 없음 | 필요 | 양호 후보 | Project Owner만 허용 유지 |
| Change Card update | `change_cards` | `change_card_update_owner` | `OWN-003`, `CC-011` | 필요 | 필요 | 구조 보정 필요 | 승인 후 내용 수정 제한 추가 필요 |
| Rough Note read/insert | `rough_notes` | `rough_note_*_owner` | `RNAI-*` | read 필요 | insert 필요 | 양호 후보 | 전환 후 수정 제한 별도 필요 |
| AI Draft read/insert | `ai_structured_drafts` | `ai_draft_*_owner` | `RNAI-*` | read 필요 | insert 필요 | 양호 후보 | 공개 정책 없음 유지 |
| Feedback Request read | `feedback_requests` | owner/public candidates | `FB-005`, `FB-006` | 필요 | 없음 | 부분 확인 | 공개 request는 view/RPC와 연결 필요 |
| Feedback insert | `feedbacks` | `feedback_insert_logged_in_with_request` | `FB-007~020` | 없음 | 필요 | high 보정 필요 | author spoofing + Project 접근 조건 필요 |
| Feedback read | `feedbacks` | `feedback_select_author`, `feedback_select_project_owner` | `FB-010~016` | 필요 | 없음 | 양호 후보 | 공개 selected는 public-safe view 우선 |

## 3. `USING` / `WITH CHECK` 검수

### INSERT

INSERT 정책은 새 row가 허용 조건을 만족하는지 검사해야 하므로 `WITH CHECK`가 핵심이다.

Feedback insert는 특히 다음 조건이 필요하다.

- `auth.uid()`가 존재한다.
- `author_user_profile_id = current_user_profile_id()`이다.
- `feedback_request_id`가 존재한다.
- Feedback Request가 공개 작성 가능한 상태다.
- 전체 공개 Project 또는 링크 공개 Project 접근 조건을 만족한다.

### UPDATE

UPDATE 정책은 기존 row 접근과 변경 후 row 검증을 모두 고려해야 한다.

- `USING`: 사용자가 기존 row를 update 대상으로 볼 수 있는가.
- `WITH CHECK`: 변경 후 row도 허용 조건을 만족하는가.

Change Card update는 Owner 조건만으로는 부족하다. 승인된 Change Card의 본문/근거/판단 변경 제한이 별도 trigger 또는 app validation으로 필요하다.

## 4. 공개 read 정책 검수

원천 table에 `anon` select policy를 넓게 두는 것은 8.5 원칙과 충돌할 수 있다.

1차 권장:

- 전체 공개 응답은 public-safe view/API 조합 후보.
- 링크 공개 응답은 secure RPC 후보.
- 원천 `change_cards`, `feedbacks`, `projects`에 넓은 anon select를 두지 않는다.

## 5. 주요 보정 제안

1. Feedback insert policy의 `WITH CHECK` 조건을 최종 migration에서 가장 엄격하게 작성한다.
2. Change Card update policy는 Owner 조건만으로 끝내지 말고 승인 상태별 제한을 trigger/app validation에 연결한다.
3. Public read는 원천 테이블 policy보다 public-safe view/RPC 쪽으로 좁힌다.
4. Link sharing 조건은 RLS 직접 비교보다 secure RPC로 분리한다.
5. `archived_at is null` 조건을 공개/owner 정책에 어디까지 넣을지 결정한다.
