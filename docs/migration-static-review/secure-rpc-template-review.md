# Secure RPC Template Review

## 검수 대상

| RPC | 목적 | SECURITY DEFINER 후보 | search_path | 핵심 조건 | 반환 | grant |
|---|---|---|---|---|---|---|
| `rotate_project_share_token` | Project Owner 전용 token 재발급 | 필요 | 있음 | Owner check 필수 | jsonb token 1회 반환 | authenticated only |
| `revoke_project_share_token` | Project Owner 전용 token 폐기 | 필요 | 있음 | Owner check 필수 | jsonb revoked true | authenticated only |
| `get_link_shared_project_page` | 링크 공개 페이지 조회 | 후보 | 있음 | token hash 비교 | public-safe jsonb | anon/authenticated 후보 |
| `get_link_shared_decision_timeline` | 링크 공개 Timeline 조회 | 후보 | 있음 | token hash 비교 | public-safe jsonb array | anon/authenticated 후보 |
| `get_link_shared_feedback_requests` | 링크 공개 피드백 요청 조회 | 후보 | 있음 | token hash 비교 | public-safe jsonb array | anon/authenticated 후보 |
| `create_link_shared_feedback` | 링크 공개 Feedback 작성 | 후보 | 있음 | token + auth + request public | jsonb id/status | authenticated only |

## 공통 보안 조건

- `SECURITY DEFINER` 사용 시 `SET search_path = public, auth` 또는 필요한 schema로 고정한다.
- 함수 내부에서는 가능한 한 `public.table_name` 형태로 schema를 명시한다.
- 반환값은 public-safe `jsonb` 후보이며 원천 row 전체를 반환하지 않는다.
- `share_token` 실패 이유는 상세히 노출하지 않는다.
- `share_token` 원문은 저장하지 않고, 로그 노출 위험을 주석으로 남긴다.
- `public_slug`만으로 `link_shared` Project 접근을 허용하지 않는다.
- `private` Project는 token이 맞아도 차단한다.
- revoked token은 차단한다.

## RPC별 dry-run 검증 항목

### `rotate_project_share_token`

- 로그인 사용자만 호출 가능.
- Project Owner만 성공.
- 원문 token은 반환하되 저장하지 않음.
- `share_token_hash`, `share_token_rotated_at`, `share_token_revoked_at` 갱신 확인.

### `revoke_project_share_token`

- 로그인 사용자만 호출 가능.
- Project Owner만 성공.
- `share_token_hash` null 또는 폐기 상태 처리 확인.
- 기존 token 접근 차단 확인.

### `get_link_shared_project_page`

- 유효 token이면 public-safe 필드만 반환.
- 잘못된 token / revoked token / private Project는 동일 실패 응답.
- 내부 ID, `share_token_hash`, `owner_user_profile_id` 미포함.

### `create_link_shared_feedback`

- 로그인 사용자만 허용.
- `author_user_profile_id`를 current user profile로 강제.
- 공개 Feedback Request에만 작성 가능.
- token 유효성 + Project 접근 조건을 모두 만족해야 함.

## 보정 제안

- RPC SQL draft에 `VERIFY BEFORE APPLY` 주석을 유지한다.
- 함수별 `GRANT EXECUTE`를 08 파일에서 최소화한다.
- 실패 응답 형식을 통일한다.
- 실제 dry-run에서 `SECURITY DEFINER`와 RLS 우회 범위를 확인한다.
