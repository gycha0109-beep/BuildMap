# Helper Function Review

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 검수 기준

helper function은 RLS 정책 가독성을 높일 수 있지만, 보호 테이블을 다시 조회하거나 `SECURITY DEFINER`를 사용할 때 보안 위험이 생긴다.

## 2. helper별 검수

| helper 후보 | 목적 | RLS 사용 가능성 | SECURITY DEFINER 필요성 | 위험 | 보정 제안 |
|---|---|---|---|---|---|
| `current_user_profile_id()` | auth user에서 user profile 조회 | 높음 | 필요 가능성 있음 | null 처리, search_path | null이면 안전하게 차단 |
| `is_project_owner(project_id)` | Project Owner 확인 | 높음 | 필요 가능성 있음 | 순환 조회/성능 | projects/builder_profiles join 최소화 |
| `is_project_owner_by_builder(builder_profile_id)` | builder profile 기준 owner 확인 | 중간 | 낮음~중간 | 이름 혼동 | 실제 필요성 재검토 |
| `can_read_public_project(project_id)` | 공개 Project 조건 | 높음 | 낮음 | archived/private 조건 누락 | Project 상태 조건 일관화 |
| `can_read_public_change_card(change_card_id)` | 공개 card 조건 | 중간 | 낮음~중간 | Project 조건 누락 | Project public 조건 포함 |
| `can_insert_feedback(feedback_request_id, author_user_profile_id)` | Feedback 생성 조건 | 높음 | 필요 가능성 있음 | author spoofing, link token 제외 | token 없는 전체 공개용과 link RPC용 분리 |
| `can_read_feedback(feedback_id)` | owner/author read | 중간 | 필요 가능성 있음 | 내부 검토 Feedback 노출 | owner/author만 허용 |

## 3. 주요 검수 사항

### 3.1 RLS 보호 테이블 조회 문제

helper가 RLS가 걸린 테이블을 조회하면 호출자의 권한/RLS 적용 여부에 따라 결과가 달라질 수 있다. `SECURITY DEFINER`를 쓰면 우회 가능성이 생긴다.

보정 제안:

- 단순 owner 확인 helper는 가능하다.
- `SECURITY DEFINER`가 필요하면 `search_path` 고정과 최소 grant가 필요하다.
- helper 내부에서 반환하는 데이터는 boolean처럼 최소화한다.

### 3.2 null 안전성

`current_user_profile_id()`가 null을 반환하면 모든 쓰기 정책이 안전하게 차단되어야 한다.

### 3.3 share_token 관련 helper

`share_token`을 직접 입력받는 helper는 1차에서 지양한다. 링크 공개는 secure RPC/API 경계에서 검증하는 방향을 유지한다.

## 4. 보정 제안

1. `current_user_profile_id()`와 `is_project_owner()`는 11단계에서 우선 구현 후보.
2. `can_insert_feedback()`은 전체 공개 Feedback 전용과 링크 공개 RPC 전용을 분리 검토.
3. share_token 관련 helper는 migration 1차에서 제외하거나 secure RPC 내부로 제한.
4. 모든 `SECURITY DEFINER` helper는 `search_path` 고정이 필요하다.
