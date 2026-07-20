# Public-safe View Access Decision

## 유지하는 범위

public-safe view는 다음 범위에서 후보를 유지한다.

- 전체 공개 프로젝트 카드
- 전체 공개 프로젝트 목록
- 전체 공개 프로젝트 페이지 요약
- 전체 공개 Decision Timeline
- 전체 공개 Change Card 목록
- 전체 공개 Feedback Request
- 공개 선택 Feedback
- Builder 공개 Profile
- 공개 Project Link

## secure RPC로 분리하는 범위

다음은 secure RPC 우선 후보다.

- 링크 공개 Project 페이지
- 링크 공개 Decision Timeline
- 링크 공개 Feedback Request
- 링크 공개 Feedback 작성
- share_token 검증이 필요한 응답
- 복합 응답 중 token 실패 응답 통일이 필요한 영역

## security_invoker 후보 유지

`security_invoker = true` 후보는 유지한다. 다만 실제 Supabase/PostgreSQL 환경에서 source table grant/RLS와 충돌할 수 있으므로 dry-run 핵심 검증 항목으로 둔다.

## source table broad anon select 금지

public-safe view가 동작하지 않는다는 이유로 원천 테이블에 넓은 `anon select`를 열지 않는다. 실패 시 view를 포기하고 secure RPC/API 조합으로 전환한다.

## 전환 기준

| 상황 | 우선 방향 |
|---|---|
| 전체 공개 단순 목록 | public-safe view 유지 후보 |
| 전체 공개 Timeline | public-safe view 유지 후보 |
| 링크 공개 / token 검증 | secure RPC 우선 |
| 공개 응답 조합이 복잡함 | RPC/API 우선 검토 |
| view가 source table broad anon select를 요구함 | RPC/API 전환 |

## dry-run 검증 항목

- `public_feedbacks`에 `author_user_profile_id`, email, auth id, internal user id, `share_token_hash`가 없는가
- `public_decision_timeline`이 approved + published + normal 조건만 포함하는가
- Rough Note / AI Draft가 어떤 view에도 포함되지 않는가
- source table broad anon select 없이 view가 동작하는가
