# Feedback Integrity Review

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 유지 원칙

- Feedback은 반드시 Feedback Request를 통해 생성한다.
- 비로그인 Feedback은 차단한다.
- Feedback 내용은 기본 내부 검토용이다.
- Builder가 공개 선택한 Feedback만 공개 가능하다.
- 공개 Feedback에서도 `author_user_profile_id`, 이메일, auth ID, 내부 user ID는 외부 응답에 노출하지 않는다.

## 2. 무결성 검수 항목

| 항목 | 현재 draft | 검수 결과 | 보정 제안 |
|---|---|---|---|
| `feedback_request_id` 필수 | 후보 반영 | 적합 | 반드시 not null 후보 |
| `author_user_profile_id` | 후보 반영 | spoofing 위험 | `current_user_profile_id()`와 일치 필요 |
| `feedbacks.project_id` | 후보 | 중복 위험 | 저장 여부 결정 필요 |
| Project 접근 조건 | 반영 필요 | high | 전체 공개/link_shared/private별 조건 필요 |
| link_shared Feedback | secure RPC 후보 | 적합 | token 검증 후 insert |
| public_selected 노출 | public-safe view 후보 | 적합 | 내부 id 제외 필수 |
| 작성자 표시 | 익명/역할 후보 | 적합 | 표시명은 후순위/동의 UX 이후 |

## 3. `feedbacks.project_id` 중복 저장 검토

### 저장하는 경우

장점:

- Project Owner read policy가 단순해진다.
- 조회 성능이 좋아질 수 있다.

단점:

- `feedback_request.project_id`와 불일치 위험이 생긴다.
- insert 시 검증이 필요하다.

### 저장하지 않는 경우

장점:

- 단일 원천이 명확하다.
- 불일치 위험이 줄어든다.

단점:

- RLS/helper 쿼리가 복잡해질 수 있다.

1차 권장: 저장하지 않는 방향을 우선 검토한다. 저장한다면 trigger/helper로 feedback_request의 Project와 일치시켜야 한다.

## 4. Feedback insert 조건

1차 권장 조건:

- `auth.uid()`가 존재한다.
- `current_user_profile_id()`가 null이 아니다.
- `author_user_profile_id = current_user_profile_id()`이다.
- `feedback_request_id`가 존재한다.
- Feedback Request가 공개 작성 가능한 상태다.
- Feedback Request의 Project 접근 조건을 만족한다.
- 링크 공개 Project에서는 secure RPC 또는 API 경계에서 token 검증을 통과해야 한다.

## 5. 공개 Feedback 응답

공개 응답에는 다음만 후보로 둔다.

- Feedback 본문
- feedback_type 후보
- tester_interest 후보
- public_author_display_mode에 따른 익명/역할/맥락 표시
- created_at 후보

공개 응답에서 제외한다.

- `author_user_profile_id`
- email
- auth ID
- 내부 user ID
- review 상태 중 내부 운영 정보

## 6. 결론

Feedback integrity는 11단계 migration 파일 작성 전 blocker에 가깝다. 특히 `author_user_profile_id` 위조 방지는 RLS/helper/RPC 중 하나에서 반드시 강제되어야 한다.
