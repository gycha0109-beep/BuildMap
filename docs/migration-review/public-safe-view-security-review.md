# Public-safe View Security Review

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 검수 기준

public-safe view는 원천 테이블 row 전체 노출을 막기 위한 후보이다. 그러나 view 자체도 보안 경계가 될 수 있으므로 RLS, grant, `security_invoker` 동작 검증이 필요하다.

## 2. view 후보별 검수

| view 후보 | 목적 | 포함 후보 | 제외 필수 | RLS 관계 | 위험 | 보정 제안 | 관련 Test Case |
|---|---|---|---|---|---|---|---|
| `public_project_cards` | 탐색 카드 | title, one_line, current_need, lifecycle, public_slug | owner id, token hash | Project public 조건 | 원천 project 과다 노출 | `security_invoker`/API 검토 | `PRJ-004`, `PP-005` |
| `public_project_pages` | 공개 페이지 상단 | 공개 Project 정보, 현재 problem/hypothesis 요약 | 내부 ID, token hash | 복합 query | view 복잡도 | API 조합도 후보 | `PP-*` |
| `public_decision_timeline` | 공개 Timeline | approved/published/normal cards | internal/publishable/sensitive cards | Change Card + Project 조건 | 조건 누락 위험 | 조건을 view 내부에 반복 | `CC-*`, `PP-012` |
| `public_change_cards` | 공개 카드 목록 | title, summary, evidence/decision 후보 | rough_note_id, ai_draft_id, author internal id | Change Card 공개 조건 | 원천 row 노출 위험 | 노출 컬럼 최소화 | `CC-004~018` |
| `public_feedback_requests` | 공개 요청 | question, context, type | 내부 요청 | Feedback Request visibility | 링크 공개 token 조건 | 전체 공개 view / 링크 RPC 분리 | `FB-005`, `LINK-015` |
| `public_feedbacks` | 선택 공개 Feedback | body, type, anonymous/role display | author_user_profile_id, email, auth id | public_selected 조건 | 개인정보 노출 | 작성자 표시 필드 제한 | `FB-015~017` |
| `public_builder_profiles` | Builder 공개 정보 | display_name, bio, role tags | email, auth id, internal id | profile 공개 조건 | 내부 계정 노출 | 공개 프로필 전용 컬럼만 | `PP-006`, `PP-007` |
| `public_project_links` | 공개 링크 | label, url, link_type | 내부 링크 | link public 조건 | 내부 링크 노출 | 공개 여부 필드 후보 | `PP-017` |

## 3. 반드시 제외할 컬럼

- `email`
- `auth_id`
- 내부 `user_id`
- `owner_user_profile_id`
- `author_user_profile_id`
- `share_token_hash`
- `rough_note_id`
- `ai_draft_id`
- 내부 검토 상태
- 내부 메모

## 4. `security_invoker` 검토

PostgreSQL의 `security_invoker` view는 호출자 권한과 RLS 정책을 따르게 하는 후보이다. 다만 Supabase 환경에서 사용 가능 여부, grant, RLS 동작을 실제로 확인해야 한다.

검토 필요:

- `create view ... with (security_invoker = true)` 문법 지원 여부
- view owner 권한으로 base table 접근이 우회되지 않는지
- `anon` / `authenticated`에 view grant를 줄 때 base table grant와 RLS가 어떻게 상호작용하는지
- public-safe view가 원천 table보다 더 많은 정보를 노출하지 않는지

## 5. 1차 권장 방향

- 전체 공개 목록/카드는 public-safe view 후보 유지.
- 공개 페이지 상세 조합은 API 조합도 강력 후보.
- 링크 공개 데이터는 view 단독이 아니라 secure RPC 후보 유지.
- 원천 table `anon` select는 최소화하거나 금지.

## 6. 실제 적용 전 검증 사항

1. view 생성 문법 dry-run
2. `security_invoker` 동작 확인
3. `anon` role grant 범위 확인
4. view에서 제외해야 할 컬럼 누락 검사
5. 7.5 Public Project Page 테스트 케이스 수동 검증
